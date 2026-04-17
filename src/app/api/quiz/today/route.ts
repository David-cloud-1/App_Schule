import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

/**
 * GET /api/quiz/today
 *
 * Returns the distinct question IDs that the authenticated user has already
 * answered today (UTC calendar day). Used by the quiz page to exclude already-
 * answered questions from the next session.
 */
export async function GET() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Start of today in UTC
  const todayUtc = new Date()
  todayUtc.setUTCHours(0, 0, 0, 0)

  const { data, error } = await supabase
    .from('quiz_answers')
    .select('question_id')
    .eq('user_id', user.id)
    .gte('answered_at', todayUtc.toISOString())

  if (error) {
    console.error('[GET /api/quiz/today]', error)
    return NextResponse.json({ error: 'Failed to fetch today\'s answers' }, { status: 500 })
  }

  // De-duplicate at application level (cheaper than a DB DISTINCT for small sets)
  const answered_question_ids = [...new Set((data ?? []).map((r) => r.question_id))]

  return NextResponse.json({ answered_question_ids })
}
