import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin, writeAuditLog } from '../_lib/auth'

const ListQuerySchema = z.object({
  q: z.string().optional(),
  subject: z.string().optional(),
  status: z.enum(['active', 'inactive', 'all']).default('all'),
  difficulty: z.enum(['leicht', 'mittel', 'schwer']).optional(),
  page: z.coerce.number().int().min(1).default(1),
})

const AnswerSchema = z.object({
  text: z.string().min(1).max(500),
  is_correct: z.boolean(),
})

const CreateQuestionSchema = z.object({
  question_text: z.string().min(1).max(1000),
  difficulty: z.enum(['leicht', 'mittel', 'schwer']),
  explanation: z.string().max(2000).optional().nullable(),
  answers: z.array(AnswerSchema).length(4),
  subject_ids: z.array(z.string().uuid()).min(1),
})

const PAGE_SIZE = 20

export async function GET(request: NextRequest) {
  const auth = await requireAdmin()
  if (auth.error) return auth.error
  const { supabase } = auth

  const parsed = ListQuerySchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams.entries())
  )
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid query parameters', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const { q, subject, status, difficulty, page } = parsed.data
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  // Resolve subject filter to question ids
  let subjectFilteredIds: string[] | null = null
  if (subject) {
    const code = subject.toUpperCase()
    const { data: subjectRow } = await supabase
      .from('subjects')
      .select('id')
      .eq('code', code)
      .single()

    if (!subjectRow) {
      return NextResponse.json({ questions: [], total: 0, page, totalPages: 0 })
    }

    const { data: links } = await supabase
      .from('question_subjects')
      .select('question_id')
      .eq('subject_id', subjectRow.id)

    subjectFilteredIds = (links ?? []).map((l) => l.question_id as string)
    if (subjectFilteredIds.length === 0) {
      return NextResponse.json({ questions: [], total: 0, page, totalPages: 0 })
    }
  }

  let query = supabase
    .from('questions')
    .select(
      `
        id,
        question_text,
        explanation,
        difficulty,
        is_active,
        created_at,
        answer_options ( id, option_text, is_correct, display_order ),
        question_subjects ( subjects ( id, code, name ) )
      `,
      { count: 'exact' }
    )
    .order('created_at', { ascending: false })

  if (subjectFilteredIds) {
    query = query.in('id', subjectFilteredIds)
  }
  if (difficulty) {
    query = query.eq('difficulty', difficulty)
  }
  if (status === 'active') {
    query = query.eq('is_active', true)
  } else if (status === 'inactive') {
    query = query.eq('is_active', false)
  }
  if (q && q.trim().length > 0) {
    query = query.ilike('question_text', `%${q.trim()}%`)
  }

  const { data, error, count } = await query.range(from, to)
  if (error) {
    console.error('[GET /api/admin/questions]', error)
    return NextResponse.json({ error: 'Failed to fetch questions' }, { status: 500 })
  }

  const questions = (data ?? []).map((q) => ({
    ...q,
    answer_options: [...(q.answer_options ?? [])].sort(
      (a: { display_order: number }, b: { display_order: number }) =>
        a.display_order - b.display_order
    ),
  }))

  const total = count ?? 0
  const totalPages = total === 0 ? 0 : Math.ceil(total / PAGE_SIZE)

  return NextResponse.json({ questions, total, page, totalPages })
}

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

  const parsed = CreateQuestionSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid payload', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const { question_text, difficulty, explanation, answers, subject_ids } = parsed.data

  // Exactly one correct answer required
  const correctCount = answers.filter((a) => a.is_correct).length
  if (correctCount !== 1) {
    return NextResponse.json(
      { error: 'Es muss genau eine richtige Antwort geben.' },
      { status: 400 }
    )
  }

  // 1. Insert question
  const { data: question, error: qErr } = await supabase
    .from('questions')
    .insert({
      question_text,
      difficulty,
      explanation: explanation ?? null,
      is_active: true,
    })
    .select('id')
    .single()

  if (qErr || !question) {
    console.error('[POST /api/admin/questions] question insert', qErr)
    return NextResponse.json({ error: 'Failed to create question' }, { status: 500 })
  }

  // 2. Insert answer options
  const answerRows = answers.map((a, idx) => ({
    question_id: question.id,
    option_text: a.text,
    is_correct: a.is_correct,
    display_order: idx + 1,
  }))
  const { error: aErr } = await supabase.from('answer_options').insert(answerRows)
  if (aErr) {
    console.error('[POST /api/admin/questions] answer insert', aErr)
    // Roll back: delete the question
    await supabase.from('questions').delete().eq('id', question.id)
    return NextResponse.json({ error: 'Failed to create answer options' }, { status: 500 })
  }

  // 3. Link subjects
  const linkRows = subject_ids.map((sid) => ({
    question_id: question.id,
    subject_id: sid,
  }))
  const { error: lErr } = await supabase.from('question_subjects').insert(linkRows)
  if (lErr) {
    console.error('[POST /api/admin/questions] subject link', lErr)
    return NextResponse.json({ error: 'Failed to link subjects' }, { status: 500 })
  }

  await writeAuditLog(supabase, {
    admin_id: user.id,
    action_type: 'question.create',
    object_type: 'question',
    object_id: question.id,
    object_label: question_text.slice(0, 80),
  })

  return NextResponse.json({ id: question.id }, { status: 201 })
}
