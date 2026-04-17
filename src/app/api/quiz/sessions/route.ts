import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase-server'

const AnswerSchema = z.object({
  question_id:        z.string().uuid(),
  selected_option_id: z.string().uuid(),
  is_correct:         z.boolean(),
})

const BodySchema = z.object({
  subject_id: z.string().uuid().nullable().optional(),
  answers:    z.array(AnswerSchema).min(1).max(20),
})

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = BodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request body', details: parsed.error.flatten() },
      { status: 400 },
    )
  }

  const { subject_id, answers } = parsed.data
  const score = answers.filter((a) => a.is_correct).length
  const total = answers.length

  // Insert session row
  const { data: session, error: sessionError } = await supabase
    .from('quiz_sessions')
    .insert({
      user_id:    user.id,
      subject_id: subject_id ?? null,
      score,
      total,
      xp_earned:  0, // PROJ-4 will update this
    })
    .select('id')
    .single()

  if (sessionError || !session) {
    console.error('[POST /api/quiz/sessions] session insert:', sessionError)
    return NextResponse.json({ error: 'Failed to save session' }, { status: 500 })
  }

  // Insert individual answer rows
  const answerRows = answers.map((a) => ({
    session_id:         session.id,
    user_id:            user.id,
    question_id:        a.question_id,
    selected_option_id: a.selected_option_id,
    is_correct:         a.is_correct,
  }))

  const { error: answersError } = await supabase.from('quiz_answers').insert(answerRows)

  if (answersError) {
    console.error('[POST /api/quiz/sessions] answers insert:', answersError)
    // Session was saved; answer rows failing is non-fatal for the user experience
    // but we still return success so the UI doesn't break
  }

  return NextResponse.json({ session_id: session.id, score, total, xp_earned: 0 })
}
