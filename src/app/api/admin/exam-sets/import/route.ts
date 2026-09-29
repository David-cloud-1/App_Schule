import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin, writeAuditLog } from '../../_lib/auth'
import { fetchExamParts, findExamPart } from '@/lib/exam-parts'
import { fetchDepartmentSubjects, normalizeSubjectCode } from '@/lib/subjects'

const QuestionSchema = z.object({
  question_text: z.string().min(1),
  options: z.array(z.string().min(1)).min(2).max(5),
  correct_index: z.number().int().min(0).max(4).nullable(),
  needs_review: z.boolean(),
  fach_code: z.string().nullable(),
})

const ImportSchema = z.object({
  name: z.string().min(1).max(100),
  // Teil-Nummer im Bereich (PROJ-22)
  part: z.number().int().min(1).max(20),
  questions: z.array(QuestionSchema).min(1),
  duration_minutes: z.number().int().min(1).max(600).nullable().optional(),
})

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
    return NextResponse.json(
      { error: 'Invalid payload', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const { name, part, questions } = parsed.data

  // Prüfungsteil und Fächer des Bereichs (PROJ-22)
  let examPart
  let subjects
  try {
    examPart = findExamPart(await fetchExamParts(supabase, departmentId), part)
    subjects = await fetchDepartmentSubjects(supabase, departmentId)
  } catch (err) {
    console.error('[exam-sets/import]', err)
    return NextResponse.json({ error: 'Failed to load subjects' }, { status: 500 })
  }
  if (!examPart) {
    return NextResponse.json({ error: `Prüfungsteil ${part} gibt es in diesem Fachbereich nicht.` }, { status: 400 })
  }

  const subjectMap: Record<string, string> = {}
  for (const s of subjects) {
    subjectMap[normalizeSubjectCode(s.code)] = s.id
  }

  // Fragen ohne (bekanntes) Kürzel landen im Standardfach des Teils
  const defaultSubjectId = examPart.defaultSubjectId ?? examPart.subjects[0]?.id
  if (!defaultSubjectId) {
    return NextResponse.json(
      { error: `Prüfungsteil ${part} hat kein Standardfach.` },
      { status: 500 }
    )
  }

  // Batch insert questions
  const questionRows = questions.map((q) => ({
    question_text: q.question_text,
    is_active: true,
    type: 'multiple_choice',
    difficulty: 'mittel',
  }))

  const { data: insertedQuestions, error: qErr } = await supabase
    .from('questions')
    .insert(questionRows)
    .select('id')

  if (qErr || !insertedQuestions || insertedQuestions.length !== questions.length) {
    return NextResponse.json({ error: 'Failed to insert questions' }, { status: 500 })
  }

  const insertedIds = insertedQuestions.map((q) => q.id as string)

  // Batch insert answer options
  const answerRows = insertedQuestions.flatMap((q, i) => {
    const source = questions[i]
    const correctIdx = source.correct_index
    return source.options.map((opt, j) => ({
      question_id: q.id as string,
      option_text: opt,
      is_correct: correctIdx !== null ? j === correctIdx : j === 0,
      display_order: j + 1,
    }))
  })

  const { error: aErr } = await supabase.from('answer_options').insert(answerRows)
  if (aErr) {
    await supabase.from('questions').delete().in('id', insertedIds)
    return NextResponse.json({ error: 'Failed to insert answer options' }, { status: 500 })
  }

  // Batch insert question_subjects
  const subjectRows = insertedQuestions.map((q, i) => {
    const fach = questions[i].fach_code ? normalizeSubjectCode(questions[i].fach_code!) : null
    const subjectId = (fach && subjectMap[fach]) || defaultSubjectId
    return {
      question_id: q.id as string,
      subject_id: subjectId,
    }
  })

  const { error: sErr } = await supabase.from('question_subjects').insert(subjectRows)
  if (sErr) {
    await supabase.from('answer_options').delete().in('question_id', insertedIds)
    await supabase.from('questions').delete().in('id', insertedIds)
    return NextResponse.json({ error: 'Failed to link subjects' }, { status: 500 })
  }

  // Create exam set
  const { data: set, error: setErr } = await supabase
    .from('exam_question_sets')
    .insert({
      name,
      part,
      question_ids: insertedIds,
      is_active: false,
      created_by: user.id,
      department_id: departmentId,
      ...(parsed.data.duration_minutes != null ? { duration_minutes: parsed.data.duration_minutes } : {}),
    })
    .select()
    .single()

  if (setErr || !set) {
    await supabase.from('question_subjects').delete().in('question_id', insertedIds)
    await supabase.from('answer_options').delete().in('question_id', insertedIds)
    await supabase.from('questions').delete().in('id', insertedIds)
    return NextResponse.json({ error: 'Failed to create exam set' }, { status: 500 })
  }

  await writeAuditLog(supabase, {
    admin_id: user.id,
    action_type: 'import',
    object_type: 'exam_set',
    object_id: (set.id as string) ?? null,
    object_label: name,
    details: { questions_imported: insertedIds.length, part },
  })

  return NextResponse.json({ set, imported: insertedIds.length }, { status: 201 })
}
