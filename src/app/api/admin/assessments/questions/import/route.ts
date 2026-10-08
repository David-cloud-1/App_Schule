import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin, writeAuditLog } from '../../../_lib/auth'
import { fetchExamParts, findExamPart } from '@/lib/exam-parts'
import { fetchDepartmentSubjects, normalizeSubjectCode } from '@/lib/subjects'
import type { PickerQuestion } from '@/lib/assessment-questions'

const QuestionSchema = z.object({
  question_text: z.string().min(1).max(1000),
  options: z.array(z.string().min(1).max(500)).min(2).max(5),
  // Für eine Note muss der Schlüssel feststehen: keine ungeprüften Fragen
  correct_index: z.number().int().min(0).max(4),
  fach_code: z.string().nullable().optional(),
}).refine((q) => q.correct_index < q.options.length, { message: 'correct_index außerhalb der Optionen', path: ['correct_index'] })

const ImportSchema = z.object({
  part: z.number().int().min(1).max(20),
  questions: z.array(QuestionSchema).min(1).max(200),
})

/**
 * Legt ausgelesene Fragen nur als Fragen an (kein Prüfungsset) und gibt sie für
 * die Auswahl im Nachweis-Dialog zurück (PROJ-27).
 */
export async function POST(request: NextRequest) {
  const auth = await requireAdmin()
  if (auth.error) return auth.error
  const { supabase, user, departmentId } = auth

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const parsed = ImportSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid payload', details: parsed.error.flatten() }, { status: 400 })
  }
  const { part, questions } = parsed.data

  let examPart
  let subjects
  try {
    examPart = findExamPart(await fetchExamParts(supabase, departmentId), part)
    subjects = await fetchDepartmentSubjects(supabase, departmentId)
  } catch (err) {
    console.error('[assessments/questions/import]', err)
    return NextResponse.json({ error: 'Fächer konnten nicht geladen werden.' }, { status: 500 })
  }
  if (!examPart) {
    return NextResponse.json({ error: `Prüfungsteil ${part} gibt es in diesem Fachbereich nicht.` }, { status: 400 })
  }
  const defaultSubjectId = examPart.defaultSubjectId ?? examPart.subjects[0]?.id
  if (!defaultSubjectId) {
    return NextResponse.json({ error: `Prüfungsteil ${part} hat kein Standardfach.` }, { status: 500 })
  }

  // Nur Fächer des gewählten Teils sind zulässig; alles andere → Standardfach
  const partSubjectIds = new Set(examPart.subjects.map((s) => s.id))
  const subjectMap: Record<string, string> = {}
  for (const s of subjects) {
    if (partSubjectIds.has(s.id)) subjectMap[normalizeSubjectCode(s.code)] = s.id
  }
  const codeById = new Map(examPart.subjects.map((s) => [s.id, s.code]))

  const { data: inserted, error: qErr } = await supabase
    .from('questions')
    .insert(questions.map((q) => ({
      question_text: q.question_text,
      is_active: true,
      type: 'multiple_choice',
      difficulty: 'mittel',
    })))
    .select('id')
  if (qErr || !inserted || inserted.length !== questions.length) {
    return NextResponse.json({ error: 'Fragen konnten nicht angelegt werden.' }, { status: 500 })
  }
  const ids = inserted.map((q) => q.id as string)

  const rollback = async () => {
    await supabase.from('question_subjects').delete().in('question_id', ids)
    await supabase.from('answer_options').delete().in('question_id', ids)
    await supabase.from('questions').delete().in('id', ids)
  }

  const { error: aErr } = await supabase.from('answer_options').insert(
    inserted.flatMap((q, i) =>
      questions[i].options.map((opt, j) => ({
        question_id: q.id as string,
        option_text: opt,
        is_correct: j === questions[i].correct_index,
        display_order: j + 1,
      })),
    ),
  )
  if (aErr) {
    await rollback()
    return NextResponse.json({ error: 'Antwortoptionen konnten nicht angelegt werden.' }, { status: 500 })
  }

  const subjectIdFor = (i: number) => {
    const fach = questions[i].fach_code ? normalizeSubjectCode(questions[i].fach_code!) : null
    return (fach && subjectMap[fach]) || defaultSubjectId
  }
  const { error: sErr } = await supabase
    .from('question_subjects')
    .insert(inserted.map((q, i) => ({ question_id: q.id as string, subject_id: subjectIdFor(i) })))
  if (sErr) {
    await rollback()
    return NextResponse.json({ error: 'Fächer konnten nicht verknüpft werden.' }, { status: 500 })
  }

  await writeAuditLog(supabase, {
    admin_id: user.id,
    action_type: 'import',
    object_type: 'question',
    object_label: `Nachweis-Import (${ids.length} Fragen)`,
    details: { questions_imported: ids.length, part },
  })

  const result: PickerQuestion[] = inserted.map((q, i) => ({
    id: q.id as string,
    question_text: questions[i].question_text,
    difficulty: 'mittel',
    class_level: null,
    topic: null,
    subject_codes: [codeById.get(subjectIdFor(i)) ?? ''].filter(Boolean),
  }))
  return NextResponse.json({ questions: result }, { status: 201 })
}
