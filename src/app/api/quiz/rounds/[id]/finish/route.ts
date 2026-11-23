import { NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createServiceClient } from '@/lib/supabase-server'
import { getLevelFromXp } from '@/lib/xp-utils'
import { checkAndAwardBadges, toBadgeDisplay } from '@/lib/badges'
import type { BlitzRoundResult, QuizRoundResult } from '@/lib/quiz-round'
import {
  STREAK_BONUS_THRESHOLD,
  calcNewStreak,
  getBerlinDateStr,
  presentationOf,
  settleBlitz,
  settleQuiz,
} from '@/lib/quiz-round-rules'
import {
  claimRoundForFinish,
  isLoadError,
  releaseRound,
  storeRoundResult,
  type RoundRow,
} from '@/lib/quiz-round-server'
import { RoundIdSchema, badRequest, errorResponse, requireUser } from '../../route-helpers'

type Profile = {
  total_xp: number | null
  current_streak: number | null
  longest_streak: number | null
  last_session_date: string | null
  coin_balance: number | null
}

/**
 * PROJ-129: Runde abrechnen – allein aus dem Rundenzettel, der Browser
 * schickt nichts mit. Ein zweiter Aufruf liefert das gespeicherte Ergebnis.
 */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { supabase, user, denied } = await requireUser()
  if (denied) return denied

  const { id } = await params
  if (!RoundIdSchema.safeParse(id).success) return badRequest('round id')

  const service = createServiceClient()
  const claim = await claimRoundForFinish(service, id, user.id)
  if (isLoadError(claim)) return errorResponse(claim)
  if ('result' in claim) return NextResponse.json(claim.result)

  const row = claim.row
  try {
    const out =
      row.kind === 'blitz' ? await finishBlitz(service, row, user.id) : await finishQuiz(service, supabase, row, user.id)
    if (out instanceof NextResponse) {
      await releaseRound(service, row.id)
      return out
    }
    await storeRoundResult(service, row.id, out)
    return NextResponse.json(out)
  } catch (err) {
    console.error('[POST /api/quiz/rounds/finish]', err)
    await releaseRound(service, row.id)
    return NextResponse.json({ error: 'Runde konnte nicht abgerechnet werden' }, { status: 500 })
  }
}

async function loadProfile(service: SupabaseClient, userId: string) {
  const { data } = await service
    .from('profiles')
    .select('total_xp, current_streak, longest_streak, last_session_date, coin_balance')
    .eq('id', userId)
    .single()
  const p = (data ?? {}) as Partial<Profile>
  return {
    totalXp: p.total_xp ?? 0,
    streak: p.current_streak ?? 0,
    longest: p.longest_streak ?? 0,
    lastSessionDate: p.last_session_date ?? null,
    coinBalance: p.coin_balance ?? 0,
  }
}

async function finishQuiz(
  service: SupabaseClient,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
  row: RoundRow,
  userId: string,
): Promise<QuizRoundResult | NextResponse> {
  const slip = row.slip
  const answered = slip.questions.filter((q) => q.answered)
  if (answered.length === 0) {
    return NextResponse.json({ error: 'Noch keine Frage beantwortet' }, { status: 409 })
  }

  const profile = await loadProfile(service, userId)
  const today = getBerlinDateStr()
  const newStreak = calcNewStreak(profile.lastSessionDate, profile.streak, today, getBerlinDateStr(-1))
  const newLongest = Math.max(profile.longest, newStreak)

  const s = settleQuiz(slip, newStreak >= STREAK_BONUS_THRESHOLD)
  const newTotalXp = profile.totalXp + s.xp
  const oldLevel = getLevelFromXp(profile.totalXp)
  const newLevel = getLevelFromXp(newTotalXp)
  // Joker werden hier abgebucht; der Stand wird nie negativ
  const newCoinBalance = Math.max(0, profile.coinBalance + s.net_coins)

  const { data: session, error: sessionError } = await service
    .from('quiz_sessions')
    .insert({
      user_id: userId,
      subject_id: row.subject_id,
      score: s.score,
      total: s.total,
      xp_earned: s.xp,
      coins_earned: s.net_coins,
      joker_cost: s.joker_cost,
      wager_stake: s.wager?.stake ?? null,
      wager_won: s.wager?.won ?? null,
    })
    .select('id')
    .single()
  if (sessionError || !session) {
    console.error('[quiz-rounds finish] session insert:', sessionError)
    return NextResponse.json({ error: 'Failed to save session' }, { status: 500 })
  }

  const answerRows = answered.map((q) => ({
    session_id: session.id,
    user_id: userId,
    question_id: q.question_id,
    selected_option_id: q.selected_option_id ?? q.correct_option_id,
    is_correct: q.correct === true,
    presentation: presentationOf(q),
    mistakes: q.form === 'eliminate' ? Math.min(2, q.mistakes) : 0,
    ...(q.answered_at ? { answered_at: q.answered_at } : {}),
  }))
  const { error: answersError } = await service.from('quiz_answers').insert(answerRows)
  if (answersError) console.error('[quiz-rounds finish] answers insert:', answersError)

  const { error: profileError } = await service
    .from('profiles')
    .update({
      total_xp: newTotalXp,
      current_streak: newStreak,
      longest_streak: newLongest,
      last_session_date: today,
      coin_balance: newCoinBalance,
    })
    .eq('id', userId)
  if (profileError) console.error('[quiz-rounds finish] profile update:', profileError)

  const newBadges = await checkAndAwardBadges(supabase, userId, {
    streak: newStreak,
    level: newLevel,
    sessionScore: s.score,
    sessionTotal: s.total,
    isRetroactive: false,
  })

  return {
    score: s.score,
    total: s.total,
    xp_earned: s.xp,
    new_total_xp: newTotalXp,
    new_streak: newStreak,
    leveled_up: newLevel > oldLevel,
    old_level: oldLevel,
    new_level: newLevel,
    new_badges: newBadges.map((b) => b.id),
    new_badge_details: newBadges.map(toBadgeDisplay),
    coins_earned: s.net_coins,
    coins: {
      answers: s.answer_coins,
      round_bonus: s.round_bonus,
      joker_cost: s.joker_cost,
      wager: s.wager,
    },
  }
}

async function finishBlitz(
  service: SupabaseClient,
  row: RoundRow,
  userId: string,
): Promise<BlitzRoundResult | NextResponse> {
  const form = row.blitz_form ?? 'classic'
  const s = settleBlitz(row.slip, form)
  const today = getBerlinDateStr() // Tag beim Abrechnen (Runde über Mitternacht)

  // Tagessperre: UNIQUE(user_id, calendar_day) – gewinnt nur eine Abrechnung
  const { error: roundInsertError } = await service.from('blitz_rounds').insert({
    user_id: userId,
    calendar_day: today,
    correct_count: s.correct_count,
    coins_earned: s.coins,
    xp_earned: s.xp,
  })
  if (roundInsertError) {
    if (roundInsertError.code === '23505') {
      return NextResponse.json({ error: 'Blitzrunde heute schon gewertet' }, { status: 409 })
    }
    console.error('[quiz-rounds finish] blitz insert:', roundInsertError)
    return NextResponse.json({ error: 'Failed to save round' }, { status: 500 })
  }

  const profile = await loadProfile(service, userId)
  const newStreak = calcNewStreak(profile.lastSessionDate, profile.streak, today, getBerlinDateStr(-1))
  const newTotalXp = profile.totalXp + s.xp
  const newCoinBalance = profile.coinBalance + s.coins

  const { error: profileError } = await service
    .from('profiles')
    .update({
      total_xp: newTotalXp,
      current_streak: newStreak,
      longest_streak: Math.max(profile.longest, newStreak),
      last_session_date: today,
      coin_balance: newCoinBalance,
    })
    .eq('id', userId)
  if (profileError) console.error('[quiz-rounds finish] blitz profile update:', profileError)

  return {
    form,
    correct_count: s.correct_count,
    wrong_count: s.wrong_count,
    points: s.points,
    coins_earned: s.coins,
    xp_earned: s.xp,
    new_coin_balance: newCoinBalance,
    new_total_xp: newTotalXp,
    new_streak: newStreak,
  }
}
