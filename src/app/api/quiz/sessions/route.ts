import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient, createServiceClient } from '@/lib/supabase-server'
import { verifyAnswers } from '@/lib/answer-key'
import { getLevelFromXp } from '@/lib/xp-utils'
import { checkAndAwardBadges } from '@/lib/badges'

const AnswerSchema = z.object({
  question_id:        z.string().uuid(),
  selected_option_id: z.string().uuid(),
  // Still accepted from older clients, but ignored — the server decides.
  is_correct:         z.boolean().optional(),
})

const BodySchema = z.object({
  subject_id: z.string().uuid().nullable().optional(),
  answers:    z.array(AnswerSchema).min(1).max(20),
})

// XP rules (PROJ-4)
const XP_PER_CORRECT      = 10
const XP_STREAK_BONUS     = 5   // added per correct answer when streak ≥ threshold
const STREAK_BONUS_THRESHOLD = 7

// Coin rules (PROJ-19) — a normal round pays out far less than the daily
// Blitzrunde bonus, so the once-a-day round stays clearly more valuable.
const COIN_PER_CORRECT       = 1
const COIN_SESSION_BONUS     = 3
const COIN_SESSION_MIN_TOTAL = 5

/** Returns a date string in YYYY-MM-DD format using Europe/Berlin timezone.
 *  offsetDays = 0 → today, -1 → yesterday, etc. (each step = 24 h of UTC ms) */
function getBerlinDateStr(offsetDays = 0): string {
  const date = new Date(Date.now() + offsetDays * 86_400_000)
  return new Intl.DateTimeFormat('sv', { timeZone: 'Europe/Berlin' }).format(date)
}

/**
 * Calculates the new streak given the previous last_session_date and current streak.
 * - Same day  → no change (already played today)
 * - Yesterday → increment
 * - Older / null → reset to 1
 */
function calcNewStreak(
  lastSessionDate: string | null,
  currentStreak: number,
  today: string,
): number {
  if (!lastSessionDate) return 1
  if (lastSessionDate === today) return currentStreak
  const yesterday = getBerlinDateStr(-1)
  if (lastSessionDate === yesterday) return currentStreak + 1
  return 1 // streak broken
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

  // The client's is_correct is ignored: correctness is re-derived from the
  // answer key server-side, one answer per question (PROJ-19 BUG-2).
  const { subject_id } = parsed.data
  const answers = await verifyAnswers(parsed.data.answers)
  const score = answers.filter((a) => a.is_correct).length
  const total = answers.length

  // XP, streak and coins are written with the service client — the user's
  // own role may only change their settings columns on profiles (BUG-1).
  const service = createServiceClient()

  // ── Fetch current profile stats ────────────────────────────────────────────
  const { data: profile } = await supabase
    .from('profiles')
    .select('total_xp, current_streak, longest_streak, last_session_date, coin_balance')
    .eq('id', user.id)
    .single()

  const prevTotalXp      = (profile?.total_xp       as number | null) ?? 0
  const prevStreak       = (profile?.current_streak  as number | null) ?? 0
  const prevLongest      = (profile?.longest_streak  as number | null) ?? 0
  const lastSessionDate  = (profile?.last_session_date as string | null) ?? null
  const prevCoinBalance  = (profile?.coin_balance   as number | null) ?? 0

  // ── Streak calculation (PROJ-5) ────────────────────────────────────────────
  const today      = getBerlinDateStr()
  const newStreak  = calcNewStreak(lastSessionDate, prevStreak, today)
  const newLongest = Math.max(prevLongest, newStreak)

  // ── XP calculation (PROJ-4) ───────────────────────────────────────────────
  // Bonus applies when the NEW streak is ≥ threshold (completing today earns the milestone)
  const hasStreakBonus = newStreak >= STREAK_BONUS_THRESHOLD
  const xpPerCorrect   = XP_PER_CORRECT + (hasStreakBonus ? XP_STREAK_BONUS : 0)
  const xpEarned       = score * xpPerCorrect
  const newTotalXp     = prevTotalXp + xpEarned

  const oldLevel   = getLevelFromXp(prevTotalXp)
  const newLevel   = getLevelFromXp(newTotalXp)
  const leveledUp  = newLevel > oldLevel

  // ── Coin calculation (PROJ-19) ────────────────────────────────────────────
  const coinsEarned    = score * COIN_PER_CORRECT + (total >= COIN_SESSION_MIN_TOTAL ? COIN_SESSION_BONUS : 0)
  const newCoinBalance = prevCoinBalance + coinsEarned

  // ── Insert session row ────────────────────────────────────────────────────
  const { data: session, error: sessionError } = await supabase
    .from('quiz_sessions')
    .insert({
      user_id:    user.id,
      subject_id: subject_id ?? null,
      score,
      total,
      xp_earned:  xpEarned,
    })
    .select('id')
    .single()

  if (sessionError || !session) {
    console.error('[POST /api/quiz/sessions] session insert:', sessionError)
    return NextResponse.json({ error: 'Failed to save session' }, { status: 500 })
  }

  // ── Insert individual answer rows ─────────────────────────────────────────
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
    // Non-fatal — session was saved successfully
  }

  // ── Update profile (XP + streak) ──────────────────────────────────────────
  const { error: profileError } = await service
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
    console.error('[POST /api/quiz/sessions] profile update:', profileError)
    // Non-fatal — session is saved; XP will be out of sync but we still return response
  }

  // ── Badge check (PROJ-7) ──────────────────────────────────────────────────
  const newBadges = await checkAndAwardBadges(supabase, user.id, {
    streak: newStreak,
    level: newLevel,
    sessionScore: score,
    sessionTotal: total,
    isRetroactive: false,
  })

  return NextResponse.json({
    session_id:   session.id,
    score,
    total,
    xp_earned:    xpEarned,
    new_total_xp: newTotalXp,
    new_streak:   newStreak,
    leveled_up:   leveledUp,
    old_level:    oldLevel,
    new_level:    newLevel,
    new_badges:   newBadges,
    coins_earned: coinsEarned,
  })
}
