import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase-server'

const PART_DURATION_MINUTES: Record<number, number> = { 1: 90, 2: 90, 3: 45 }

const SubmitSchema = z.object({
  action: z.enum(['submit', 'abort']),
  answers: z.record(z.string(), z.string()).optional(),
})

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: session, error } = await supabase
    .from('exam_sessions')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (error || !session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  }

  // Calculate remaining seconds based on server start time
  const parts: number[] = session.parts_selected ?? []
  const totalMinutes = parts.reduce((sum: number, p: number) => sum + (PART_DURATION_MINUTES[p] ?? 0), 0)
  const totalSeconds = totalMinutes * 60
  const elapsedSeconds = Math.floor((Date.now() - new Date(session.started_at).getTime()) / 1000)
  const remainingSeconds = Math.max(0, totalSeconds - elapsedSeconds)

  return NextResponse.json({ ...session, remainingSeconds })
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: session } = await supabase
    .from('exam_sessions')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  if (session.status !== 'in_progress') {
    return NextResponse.json({ error: 'Session already ended' }, { status: 400 })
  }

  const body = await request.json()
  const parsed = SubmitSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const { action, answers = {} } = parsed.data
  const resultsJson = session.results_json as Record<string, unknown>

  if (action === 'submit' || action === 'abort') {
    // Score MC questions and embed answers into results_json
    const updatedParts: Record<string, unknown> = {}

    for (const [partStr, partData] of Object.entries(resultsJson.parts as Record<string, { questions: Record<string, unknown>[] }>)) {
      type ScoredQuestion = { type: string; is_correct?: boolean; [key: string]: unknown }
      const questions: ScoredQuestion[] = (partData.questions ?? []).map((q: Record<string, unknown>): ScoredQuestion => {
        const studentAnswer = answers[q.id as string] ?? null
        if (q.type === 'multiple_choice') {
          const correctOption = (q.answer_options as { id: string; is_correct: boolean }[] ?? []).find((o) => o.is_correct)
          const isCorrect = studentAnswer ? studentAnswer === correctOption?.id : false
          return { ...q, type: q.type as string, student_answer: studentAnswer, is_correct: isCorrect, correct_option_id: correctOption?.id }
        }
        return { ...q, type: q.type as string, student_answer: studentAnswer, self_score: null }
      })

      const mcQuestions = questions.filter((q) => q.type === 'multiple_choice')
      const mcScore = mcQuestions.length
        ? Math.round((mcQuestions.filter((q) => q.is_correct).length / mcQuestions.length) * 100)
        : 100

      updatedParts[partStr] = { questions, score: mcScore, passed: mcScore >= 50 }
    }

    const { error } = await supabase
      .from('exam_sessions')
      .update({
        status: action === 'abort' ? 'aborted' : 'completed',
        ended_at: new Date().toISOString(),
        results_json: { parts: updatedParts },
      })
      .eq('id', id)

    if (error) return NextResponse.json({ error: 'Failed to update session' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
