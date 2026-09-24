import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient, createServiceClient } from '@/lib/supabase-server'
import { verifyAnswers } from '@/lib/answer-key'

const MAX_ANSWERS = 60
const MAX_ROUND_AGE_SECONDS = 90 // 60s round + buffer for network/render latency

const AnswerSchema = z.object({
  question_id:        z.string().uuid(),
  selected_option_id: z.string().uuid(),
  // Still accepted from older clients, but ignored — the server decides.
  is_correct:         z.boolean().optional(),
})

const BodySchema = z.object({
  token:   z.string().uuid(),
  answers: z.array(AnswerSchema).max(MAX_ANSWERS),
})

// Coin/XP rules (PROJ-19)
const COIN_PER_CORRECT   = 3
const COIN_ROUND_BONUS   = 10
const XP_PER_CORRECT     = 5 // half of the normal-round rate — speed isn't the fastest path to level/rank

/** Returns a date string in YYYY-MM-DD format using Europe/Berlin timezone. */
function getBerlinDateStr(offsetDays = 0): string {
  const date = new Date(Date.now() + offsetDays * 86_400_000)
  return new Intl.DateTimeFormat('sv', { timeZone: 'Europe/Berlin' }).format(date)
}

/**
 * Same rule as the normal quiz session endpoint (PROJ-5): same day → no
 * change, yesterday → increment, otherwise reset to 1.
 */
function calcNewStreak(lastSessionDate: string | null, currentStreak: number, today: string): number {
  if (!lastSessionDate) return 1
  if (lastSessionDate === today) return currentStreak
  const yesterday = getBerlinDateStr(-1)
  if (lastSessionDate === yesterday) return currentStreak + 1
  return 1
}

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

  const { token, answers } = parsed.data

  // ── Validate the server-issued start marker ───────────────────────────────
  // This is what makes the round's duration and "was it even started"
  // serverside-checkable, per the PROJ-19 architecture decision to not trust
  // a client-reported elapsed time.
  const { data: startRow, error: startFetchError } = await supabase
    .from('blitz_starts')
    .select('id, created_at, consumed')
    .eq('token', token)
    .eq('user_id', user.id)
    .maybeSingle()

  if (startFetchError) {
    console.error('[POST /api/quiz/blitz/finish] start fetch:', startFetchError)
    return NextResponse.json({ error: 'Failed to verify round' }, { status: 500 })
  }

  if (!startRow || startRow.consumed) {
    return NextResponse.json({ error: 'Ungültige oder bereits verwendete Runde' }, { status: 400 })
  }

  const ageSeconds = (Date.now() - new Date(startRow.created_at).getTime()) / 1000
  if (ageSeconds > MAX_ROUND_AGE_SECONDS) {
    return NextResponse.json({ error: 'Runde ist abgelaufen' }, { status: 400 })
  }

  // Consume the token immediately so it can't be replayed, regardless of
  // whether the day-uniqueness insert below succeeds.
  await supabase.from('blitz_starts').update({ consumed: true }).eq('id', startRow.id)

  // Correctness is re-derived server-side and each question counts once —
  // the client's own is_correct is ignored (PROJ-19 BUG-2).
  const verified     = await verifyAnswers(answers)
  const correctCount = verified.filter((a) => a.is_correct).length
  const coinsEarned  = correctCount * COIN_PER_CORRECT + COIN_ROUND_BONUS
  const xpEarned     = correctCount * XP_PER_CORRECT
  const today        = getBerlinDateStr() // Judged at finish time, not start time (edge case: round spans midnight)

  // ── Daily lock via UNIQUE(user_id, calendar_day) ──────────────────────────
  // This is the actual anti-abuse guarantee: it holds even if two finish
  // requests for the same day race each other, because only one INSERT wins.
  const { error: roundInsertError } = await supabase.from('blitz_rounds').insert({
    user_id:       user.id,
    calendar_day:  today,
    correct_count: correctCount,
    coins_earned:  coinsEarned,
    xp_earned:     xpEarned,
  })

  if (roundInsertError) {
    if (roundInsertError.code === '23505') {
      return NextResponse.json({ error: 'Blitzrunde heute schon gewertet' }, { status: 409 })
    }
    console.error('[POST /api/quiz/blitz/finish] round insert:', roundInsertError)
    return NextResponse.json({ error: 'Failed to save round' }, { status: 500 })
  }

  // ── Credit profile (coins, XP, streak) ────────────────────────────────────
  const { data: profile } = await supabase
    .from('profiles')
    .select('total_xp, current_streak, longest_streak, last_session_date, coin_balance')
    .eq('id', user.id)
    .single()

  const prevTotalXp     = (profile?.total_xp        as number | null) ?? 0
  const prevStreak      = (profile?.current_streak   as number | null) ?? 0
  const prevLongest     = (profile?.longest_streak   as number | null) ?? 0
  const lastSessionDate = (profile?.last_session_date as string | null) ?? null
  const prevCoinBalance = (profile?.coin_balance     as number | null) ?? 0

  const newStreak      = calcNewStreak(lastSessionDate, prevStreak, today)
  const newLongest     = Math.max(prevLongest, newStreak)
  const newTotalXp     = prevTotalXp + xpEarned
  const newCoinBalance = prevCoinBalance + coinsEarned

  // Service client: users may no longer write XP/streak/coins on their own
  // profile row directly (PROJ-19 BUG-1).
  const { error: profileError } = await createServiceClient()
    .from('profiles')
    .update({
      total_xp:          newTotalXp,
      current_streak:    newStreak,
      longest_streak:    newLongest,
      last_session_date: today,
      coin_balance:      newCoinBalance,
    })
    .eq('id', user.id)

  if (profileError) {
    console.error('[POST /api/quiz/blitz/finish] profile update:', profileError)
    // Non-fatal — the round is already recorded; profile totals would be
    // out of sync, same trade-off the normal quiz-sessions endpoint makes.
  }

  return NextResponse.json({
    correct_count:     correctCount,
    coins_earned:      coinsEarned,
    xp_earned:         xpEarned,
    new_coin_balance:  newCoinBalance,
    new_total_xp:      newTotalXp,
    new_streak:        newStreak,
  })
}
