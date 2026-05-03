import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '../../../_lib/auth'

export async function GET(
  _request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin()
  if (auth.error) return auth.error
  const { supabase } = auth

  const { id } = await ctx.params
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const { count: total } = await supabase
    .from('quiz_answers')
    .select('*', { count: 'exact', head: true })
    .eq('question_id', id)

  const { count: correct } = await supabase
    .from('quiz_answers')
    .select('*', { count: 'exact', head: true })
    .eq('question_id', id)
    .eq('is_correct', true)

  const totalCount = total ?? 0
  const correctCount = correct ?? 0
  const correctRate = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : null

  return NextResponse.json({ total: totalCount, correct: correctCount, correctRate })
}
