import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireTeacherOrAdmin, writeAuditLog } from '../../../_lib/auth'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const BodySchema = z.object({
  question_id: z.string().uuid('Ungültige Frage.'),
  excluded: z.boolean(),
})

/**
 * Frage für diesen Nachweis aus der Wertung nehmen oder wieder aufnehmen
 * (PROJ-75). Nur bis zur Freigabe der Ergebnisse: danach haben die Azubis ihre
 * Note schon gesehen. Prozent und Note rechnet die Bewertung bei jedem Aufruf
 * neu; Rohantworten bleiben unverändert.
 */
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!UUID_RE.test(id)) return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 })

  const auth = await requireTeacherOrAdmin()
  if (auth.error) return auth.error
  const { supabase, user } = auth

  let raw: unknown
  try {
    raw = await request.json()
  } catch {
    return NextResponse.json({ error: 'Ungültige Anfrage.' }, { status: 400 })
  }
  const parsed = BodySchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Ungültige Eingabe.' }, { status: 400 })
  }
  const { question_id: questionId, excluded } = parsed.data

  const { data: assessment } = await supabase
    .from('graded_assessments')
    .select('id, title, status, results_released_at, excluded_question_ids, question_ids_snapshot, department_id')
    .eq('id', id)
    .single()
  if (!assessment) return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 })

  if (assessment.results_released_at) {
    return NextResponse.json(
      { error: 'Die Ergebnisse sind schon freigegeben. Die Wertung lässt sich nicht mehr ändern.' },
      { status: 409 },
    )
  }
  if (assessment.status === 'draft') {
    return NextResponse.json({ error: 'Der Nachweis hat noch keine Ergebnisse.' }, { status: 409 })
  }

  const snapshot = (assessment.question_ids_snapshot as string[] | null) ?? []
  if (!snapshot.includes(questionId)) {
    return NextResponse.json({ error: 'Diese Frage gehört nicht zum Nachweis.' }, { status: 400 })
  }

  const current = (assessment.excluded_question_ids as string[] | null) ?? []
  const next = excluded
    ? [...new Set([...current, questionId])]
    : current.filter((qid) => qid !== questionId)

  if (excluded && snapshot.every((qid) => next.includes(qid))) {
    return NextResponse.json({ error: 'Mindestens eine Frage muss gewertet werden.' }, { status: 400 })
  }

  if (next.length === current.length && next.every((qid) => current.includes(qid))) {
    return NextResponse.json({ excludedQuestionIds: next }) // gleichzeitige Aktion: nichts zu tun
  }

  // `.is(...)` verhindert, dass eine Freigabe zwischen Prüfung und Speichern unterlaufen wird;
  // `.select` zeigt, ob der Zeilenschutz die Änderung zugelassen hat.
  const { data: updated, error } = await supabase
    .from('graded_assessments')
    .update({ excluded_question_ids: next })
    .eq('id', id)
    .is('results_released_at', null)
    .select('id')
  if (error) {
    console.error('[PUT /api/admin/assessments/:id/exclude-question]', error)
    return NextResponse.json({ error: 'Das hat nicht geklappt. Bitte versuche es erneut.' }, { status: 500 })
  }
  if (!updated || updated.length === 0) {
    return NextResponse.json({ error: 'Dafür fehlt dir die Berechtigung.' }, { status: 403 })
  }

  await writeAuditLog(supabase, {
    admin_id: user.id,
    action_type: excluded ? 'graded_assessment.exclude_question' : 'graded_assessment.include_question',
    object_type: 'graded_assessment',
    object_id: id,
    object_label: assessment.title as string,
    details: { question_id: questionId },
    department_id: assessment.department_id as string | null,
  })
  return NextResponse.json({ excludedQuestionIds: next })
}
