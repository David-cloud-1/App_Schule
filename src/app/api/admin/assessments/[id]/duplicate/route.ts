import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireTeacherOrAdmin, writeAuditLog } from '../../../_lib/auth'
import { derivePartNumber, fetchSelectableQuestions } from '@/lib/assessment-questions'
import { resolveCategory } from '@/lib/assessment-category'
import { fetchExamParts } from '@/lib/exam-parts'
import {
  MAX_TITLE_LENGTH,
  copyWindow,
  escapeLike,
  baseTitle,
  generateUniqueAccessCode,
  nextCopyTitle,
} from '@/lib/assessment-copy'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const BodySchema = z.object({
  /** Eigener Titel; ohne Angabe „<Titel> (Kopie)“ */
  title: z.string().trim().min(1).max(MAX_TITLE_LENGTH).optional(),
  /** Zielbereich; ohne Angabe der Bereich der duplizierenden Person */
  departmentId: z.string().uuid().optional(),
})

/**
 * Nachweis duplizieren (PROJ-79). Aus dem Original entsteht ein neuer Entwurf mit
 * denselben Fragen und Einstellungen, aber ohne Teilnehmer, Ergebnisse, Fokus-Protokolle,
 * Freigabe und Zeitfenster-Bezug. Wer das Original nicht sehen darf, bekommt 404
 * (der Zeilenschutz der Datenbank entscheidet). Fragen, die im Zielbereich nicht (mehr)
 * zulässig sind, bleiben als Platzhalter in der Liste, damit die Positionen erhalten bleiben.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!UUID_RE.test(id)) return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 })

  const auth = await requireTeacherOrAdmin()
  if (auth.error) return auth.error
  const { supabase, user } = auth

  const json = await request.json().catch(() => ({}))
  const parsed = BodySchema.safeParse(json ?? {})
  if (!parsed.success) return NextResponse.json({ error: 'Ungültige Eingabe.' }, { status: 400 })

  const { data: original } = await supabase
    .from('graded_assessments')
    .select('*, exam_question_sets(question_ids)')
    .eq('id', id)
    .single()
  if (!original) return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 })

  const departmentId: string =
    parsed.data.departmentId ?? auth.suggestedDepartmentId ?? (original.department_id as string)

  const { data: targetDepartment } = await supabase
    .from('departments')
    .select('id')
    .eq('id', departmentId)
    .eq('is_active', true)
    .maybeSingle()
  if (!targetDepartment) {
    return NextResponse.json({ error: 'Dieser Fachbereich ist nicht verfügbar.' }, { status: 400 })
  }

  const set = original.exam_question_sets as unknown as { question_ids: string[] } | null
  const questionIds: string[] = [
    ...new Set<string>(original.question_ids_snapshot ?? original.draft_question_ids ?? set?.question_ids ?? []),
  ]

  try {
    // Titel: vorhandene Kopien zählen hoch
    let title = parsed.data.title
    if (!title) {
      const base = baseTitle(original.title as string)
      const { data: same } = await supabase
        .from('graded_assessments')
        .select('title')
        .ilike('title', `${escapeLike(base.slice(0, 80))}%`)
        .limit(200)
      title = nextCopyTitle(original.title as string, (same ?? []).map((r) => r.title as string))
    }

    // Prüfungsteil: im selben Bereich übernehmen, sonst aus den noch zulässigen Fragen ableiten
    let part: number = original.part
    let subjectId: string | null = original.subject_id ?? null
    if (departmentId !== original.department_id) {
      const [selectable, examParts] = await Promise.all([
        fetchSelectableQuestions(supabase, departmentId, user.id),
        fetchExamParts(supabase, departmentId),
      ])
      const byId = new Map(selectable.map((q) => [q.id, q]))
      const derived = derivePartNumber(examParts, questionIds.map((qid) => byId.get(qid)).filter((q) => !!q))
      if (derived === null) {
        return NextResponse.json({ error: 'Für diesen Fachbereich sind keine Prüfungsteile eingerichtet.' }, { status: 400 })
      }
      part = derived
      subjectId = null // Fächer gehören zum Bereich
    }

    const category = await resolveCategory(supabase, departmentId, {
      className: (original.class_name as string | null) ?? null,
      subjectId,
    })
    if (!category.ok) return NextResponse.json({ error: category.error }, { status: category.status })

    const accessCode = await generateUniqueAccessCode(supabase)
    if (!accessCode) {
      return NextResponse.json({ error: 'Konnte keinen eindeutigen Code erzeugen. Bitte erneut versuchen.' }, { status: 500 })
    }

    const window = copyWindow(new Date())
    const { data: created, error } = await supabase
      .from('graded_assessments')
      .insert({
        part,
        department_id: departmentId,
        draft_question_ids: questionIds,
        title,
        access_code: accessCode,
        duration_minutes: original.duration_minutes,
        opens_at: window.opensAt,
        closes_at: window.closesAt,
        grading_scale: original.grading_scale,
        shuffle: original.shuffle,
        focus_tracking: original.focus_tracking ?? false,
        focus_auto_submit_after: original.focus_auto_submit_after ?? null,
        ...category.columns,
        copied_from_id: original.id,
        copied_from_title: original.title,
        created_by: user.id,
      })
      .select('id')
      .single()
    if (error || !created) {
      console.error('[POST /api/admin/assessments/[id]/duplicate]', error)
      return NextResponse.json({ error: 'Duplizieren fehlgeschlagen.' }, { status: 500 })
    }

    await writeAuditLog(supabase, {
      admin_id: user.id,
      action_type: 'graded_assessment.duplicate',
      object_type: 'graded_assessment',
      object_id: created.id,
      object_label: title,
      department_id: departmentId,
      details: { sourceId: original.id, sourceTitle: original.title, sourceDepartmentId: original.department_id },
    })

    return NextResponse.json({ id: created.id }, { status: 201 })
  } catch (err) {
    console.error('[POST /api/admin/assessments/[id]/duplicate]', err)
    return NextResponse.json({ error: 'Duplizieren fehlgeschlagen.' }, { status: 500 })
  }
}
