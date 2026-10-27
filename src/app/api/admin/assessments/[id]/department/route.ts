import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireTeacherOrAdmin, writeAuditLog } from '../../../_lib/auth'
import { fetchExamParts } from '@/lib/exam-parts'
import { fetchDepartmentSubjects } from '@/lib/subjects'
import { defaultSubjectIdFor, derivePartNumber, fetchSelectableQuestions } from '@/lib/assessment-questions'

const Schema = z.object({ departmentId: z.string().uuid() })

/**
 * PROJ-46: Zielbereich eines Nachweises wechseln — nur im Entwurf (die
 * Datenbank lehnt es danach ohnehin ab, graded_assessments_guard). Fragen aus
 * dem alten Bereichs-Pool fliegen raus, eigene private Nachweis-Fragen
 * bleiben (E6). Eine ggf. gesetzte Fach-Ablage (PROJ-39) wird geleert, wenn
 * ihr Fach nicht zum neuen Bereich gehört.
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const auth = await requireTeacherOrAdmin()
  if (auth.error) return auth.error
  const { supabase } = auth

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const parsed = Schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request', details: parsed.error.flatten() }, { status: 400 })
  }
  const { departmentId } = parsed.data

  // RLS entscheidet, ob die Person diesen Nachweis überhaupt sieht — kein
  // zusätzlicher Bereichs-Check nötig (PROJ-46 Tech Design C).
  const { data: assessment } = await supabase
    .from('graded_assessments')
    .select('id, status, department_id, created_by, draft_question_ids, subject_id')
    .eq('id', id)
    .maybeSingle()
  if (!assessment) return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 })

  if (assessment.status !== 'draft') {
    return NextResponse.json({ error: 'Der Zielbereich ist nach dem Öffnen fest.' }, { status: 400 })
  }

  if (assessment.department_id === departmentId) {
    return NextResponse.json({ success: true, removedCount: 0 })
  }

  const { data: targetDepartment } = await supabase
    .from('departments')
    .select('id')
    .eq('id', departmentId)
    .eq('is_active', true)
    .maybeSingle()
  if (!targetDepartment) {
    return NextResponse.json({ error: 'Dieser Fachbereich ist nicht verfügbar.' }, { status: 400 })
  }

  // Pool-Fragen des alten Bereichs raus, eigene private Fragen bleiben —
  // unabhängig davon, zu welchem Bereich sie selbst gehören (E6/Edge Case).
  const currentIds = assessment.draft_question_ids ?? []
  let keptIds: string[] = []
  if (currentIds.length > 0) {
    const { data: qrows } = await supabase
      .from('questions')
      .select('id, is_private, owner_id')
      .in('id', currentIds)
    const privateOwned = new Set(
      (qrows ?? [])
        .filter((q) => q.is_private && q.owner_id === assessment.created_by)
        .map((q) => q.id as string),
    )
    keptIds = currentIds.filter((qid: string) => privateOwned.has(qid))
  }
  const removedCount = currentIds.length - keptIds.length

  const [examParts, newDepartmentSubjects] = await Promise.all([
    fetchExamParts(supabase, departmentId),
    fetchDepartmentSubjects(supabase, departmentId),
  ])

  // BUG-3: eine mitgenommene private Frage trägt noch die Fach-Zuordnung des
  // alten Bereichs — ohne Umzug bliebe sie in der Fragenauswahl des neuen
  // Bereichs unsichtbar, obwohl sie laut Entwurf weiter ausgewählt ist.
  if (keptIds.length > 0) {
    const newDefaultSubjectId = defaultSubjectIdFor(examParts, newDepartmentSubjects)
    if (newDefaultSubjectId) {
      const { error: moveError } = await supabase
        .from('question_subjects')
        .update({ subject_id: newDefaultSubjectId })
        .in('question_id', keptIds)
      if (moveError) {
        return NextResponse.json({ error: 'Eigene Fragen konnten nicht umgezogen werden.' }, { status: 500 })
      }
    }
  }

  let newPart: number | null
  if (keptIds.length > 0) {
    const selectable = await fetchSelectableQuestions(supabase, departmentId, assessment.created_by)
    const byId = new Map(selectable.map((q) => [q.id, q]))
    const picked = keptIds.map((qid) => byId.get(qid)).filter((q): q is NonNullable<typeof q> => !!q)
    newPart = derivePartNumber(examParts, picked)
  } else {
    newPart = [...examParts].sort((a, b) => a.partNumber - b.partNumber)[0]?.partNumber ?? null
  }
  if (newPart === null) {
    return NextResponse.json({ error: 'Für diesen Fachbereich sind keine Prüfungsteile eingerichtet.' }, { status: 400 })
  }

  // Fach-Ablage (PROJ-39) leeren, wenn ihr Fach nicht zum neuen Bereich gehört
  let subjectId = assessment.subject_id
  if (subjectId) {
    const { data: subject } = await supabase
      .from('subjects')
      .select('id')
      .eq('id', subjectId)
      .eq('department_id', departmentId)
      .maybeSingle()
    if (!subject) subjectId = null
  }

  const { error } = await supabase
    .from('graded_assessments')
    .update({ department_id: departmentId, part: newPart, draft_question_ids: keptIds, subject_id: subjectId })
    .eq('id', id)
  if (error) return NextResponse.json({ error: 'Speichern fehlgeschlagen.' }, { status: 500 })

  await writeAuditLog(supabase, {
    admin_id: auth.user.id,
    action_type: 'graded_assessment.department_change',
    object_type: 'graded_assessment',
    object_id: id,
    details: { fromDepartmentId: assessment.department_id, toDepartmentId: departmentId, removedCount },
    department_id: departmentId,
  })

  return NextResponse.json({ success: true, removedCount })
}
