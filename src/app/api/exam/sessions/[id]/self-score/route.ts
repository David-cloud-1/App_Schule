import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase-server'

const SelfScoreSchema = z.object({
  questionId: z.string(),
  score: z.number().int().min(0).max(100),
})

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
    .select('results_json')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 })

  const body = await request.json()
  const parsed = SelfScoreSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })

  const { questionId, score } = parsed.data
  const results = session.results_json as {
    parts: Record<string, { questions: { id: string; self_score?: number | null; type: string; is_correct?: boolean }[]; score: number; passed: boolean }>
  }

  // Find and update the question across all parts
  let updated = false
  for (const partData of Object.values(results.parts)) {
    const q = partData.questions.find((q) => q.id === questionId)
    if (q && q.type === 'open') {
      q.self_score = score
      updated = true

      // Recalculate part score including self-assessed open questions
      const mcQuestions = partData.questions.filter((q) => q.type === 'multiple_choice')
      const openQuestions = partData.questions.filter((q) => q.type === 'open' && q.self_score != null)
      const totalAnswered = mcQuestions.length + openQuestions.length
      if (totalAnswered > 0) {
        const mcScore = mcQuestions.filter((q) => q.is_correct).length * 100
        const openScore = openQuestions.reduce((sum, q) => sum + (q.self_score ?? 0), 0)
        partData.score = Math.round((mcScore + openScore) / (totalAnswered * 100) * 100)
        partData.passed = partData.score >= 50
      }
      break
    }
  }

  if (!updated) return NextResponse.json({ error: 'Question not found' }, { status: 404 })

  const { error } = await supabase
    .from('exam_sessions')
    .update({ results_json: results })
    .eq('id', id)

  if (error) return NextResponse.json({ error: 'Failed to save score' }, { status: 500 })

  return NextResponse.json({ success: true })
}
