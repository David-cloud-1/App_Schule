import type { SupabaseClient } from '@supabase/supabase-js'
import { fetchAllRows, type FetchAllResult } from '@/lib/fetch-all-rows'

export type UserAnswer = { question_id: string; is_correct: boolean; answered_at: string }

/**
 * All quiz answers of a user, paginated past the 1000-row cap. Users past that
 * many answers would otherwise see their statistics and weak-question detection
 * frozen at the oldest 1000 rows.
 *
 * Returned oldest first — gap detection depends on the order of attempts.
 */
export async function fetchAllUserAnswers(
  supabase: SupabaseClient,
  userId: string,
): Promise<FetchAllResult<UserAnswer>> {
  return fetchAllRows<UserAnswer>('quiz_answers', (from, to) =>
    supabase
      .from('quiz_answers')
      .select('question_id, is_correct, answered_at')
      .eq('user_id', userId)
      .order('answered_at')
      .order('id')
      .range(from, to),
  )
}
