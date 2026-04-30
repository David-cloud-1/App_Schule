import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin, writeAuditLog } from '../../_lib/auth'

const QuestionSchema = z.object({
  question_text: z.string().min(1),
  options: z.array(z.string().min(1)).min(2).max(5),
  correct_index: z.number().int().min(0).max(4).nullable(),
  needs_review: z.boolean(),
  fach_code: z.string().nullable(),
})

const ImportSchema = z.object({
  name: z.string().min(1).max(100),
  part: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  questions: z.array(QuestionSchema).min(1),
})

const PART_DEFAULT_SUBJECT: Record<number, string> = { 1: 'STG', 2: 'KSK', 3: 'BGP' }

export async function POST(request: NextRequest) {
  const auth = await requireAdmin()
  if (auth.error) return auth.error
  const { supabase, user } = auth

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

  // Load subjects lookup
  const { data: subjects, error: subjErr } = await supabase
    .from('subjects')
    .select('id, code')
    .limit(20)

  if (subjErr) {
    return NextResponse.json({ error: 'Failed to load subjects' }, { status: 500 })
  }

  const subjectMap: Record<string, string> = {}
  for (const s of subjects ?? []) {
    subjectMap[(s.code as string).toUpperCase()] = s.id as string
  }

  const defaultSubjectCode = PART_DEFAULT_SUBJECT[part]
  const defaultSubjectId = subjectMap[defaultSubjectCode]
  if (!defaultSubjectId) {
    return NextResponse.json(
      { error: `Default subject ${defaultSubjectCode} not found` },
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
    const fach = questions[i].fach_code?.toUpperCase()
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
