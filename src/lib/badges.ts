/**
 * Achievements & Badges (PROJ-7)
 *
 * Badge definitions are the single source of truth.
 * The `badges` table in Supabase is seeded from this constant.
 */

import type { SupabaseClient } from '@supabase/supabase-js'

// ── Badge Definitions ─────────────────────────────────────────────────────────

export interface BadgeDefinition {
  id: string
  name: string
  description: string
  icon: string
  sort_order: number
}

export const BADGE_DEFINITIONS: BadgeDefinition[] = [
  {
    id: 'first_step',
    name: 'Erster Schritt',
    description: 'Erste Session abgeschlossen',
    icon: '🎯',
    sort_order: 1,
  },
  {
    id: 'on_the_way',
    name: 'Auf dem Weg',
    description: '10 Sessions abgeschlossen',
    icon: '📚',
    sort_order: 2,
  },
  {
    id: 'learning_pro',
    name: 'Lernprofi',
    description: '50 Sessions abgeschlossen',
    icon: '🎓',
    sort_order: 3,
  },
  {
    id: 'fire_starter',
    name: 'Feuerstarter',
    description: '3 Tage Streak',
    icon: '🔥',
    sort_order: 4,
  },
  {
    id: 'week_warrior',
    name: 'Wochenkrieger',
    description: '7 Tage Streak',
    icon: '⚔️',
    sort_order: 5,
  },
  {
    id: 'month_master',
    name: 'Monatsmeister',
    description: '30 Tage Streak',
    icon: '🏆',
    sort_order: 6,
  },
  {
    id: 'all_rounder',
    name: 'Allrounder',
    description: 'Mindestens 10 Fragen in jedem Fach beantwortet',
    icon: '🌟',
    sort_order: 7,
  },
  {
    id: 'bgp_expert',
    name: 'BGP-Experte',
    description: '100 BGP-Fragen richtig beantwortet',
    icon: '📊',
    sort_order: 8,
  },
  {
    id: 'ksk_expert',
    name: 'KSK-Experte',
    description: '100 KSK-Fragen richtig beantwortet',
    icon: '💰',
    sort_order: 9,
  },
  {
    id: 'stg_expert',
    name: 'STG-Experte',
    description: '100 STG-Fragen richtig beantwortet',
    icon: '🚚',
    sort_order: 10,
  },
  {
    id: 'lop_expert',
    name: 'LOP-Experte',
    description: '100 LOP-Fragen richtig beantwortet',
    icon: '📦',
    sort_order: 11,
  },
  {
    id: 'perfectionist',
    name: 'Perfektionist',
    description: 'Session mit 100% Trefferquote abgeschlossen',
    icon: '✨',
    sort_order: 12,
  },
  {
    id: 'level_10',
    name: 'Level 10',
    description: 'Level 10 erreicht',
    icon: '🥉',
    sort_order: 13,
  },
  {
    id: 'level_25',
    name: 'Level 25',
    description: 'Level 25 erreicht',
    icon: '🥈',
    sort_order: 14,
  },
  {
    id: 'exam_ready',
    name: 'Prüfungsreif',
    description: 'Level 50 erreicht',
    icon: '🥇',
    sort_order: 15,
  },
]

export const BADGE_MAP = new Map<string, BadgeDefinition>(
  BADGE_DEFINITIONS.map((b) => [b.id, b]),
)

// ── Badge Check Context ───────────────────────────────────────────────────────

export interface BadgeCheckContext {
  /** Streak after this session (or longest_streak for migration). */
  streak: number
  /** Current level after this session. */
  level: number
  /** Correct answers in this session (0 for migration). */
  sessionScore: number
  /** Total answers in this session (0 for migration). */
  sessionTotal: number
  /** True during the one-time migration — no modal shown, perfectionist checked retroactively. */
  isRetroactive?: boolean
}

// ── Badge Check + Award Function ─────────────────────────────────────────────

/**
 * Check all badge conditions for a user and award any newly earned badges.
 * Returns an array of newly awarded badge IDs (empty for retroactive awards).
 *
 * Gracefully returns [] if the `user_badges` table does not exist yet
 * (i.e., before the DB migration has been applied).
 */
export async function checkAndAwardBadges(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
  userId: string,
  ctx: BadgeCheckContext,
): Promise<string[]> {
  try {
    // 1. Get badges this user already has
    const { data: existingRows, error: existingErr } = await supabase
      .from('user_badges')
      .select('badge_id')
      .eq('user_id', userId)

    if (existingErr) {
      // Table may not exist yet — fail silently
      console.warn('[badges] user_badges query failed:', existingErr.message)
      return []
    }

    const earned = new Set((existingRows ?? []).map((r: { badge_id: string }) => r.badge_id))
    const unearned = BADGE_DEFINITIONS.filter((b) => !earned.has(b.id))
    if (unearned.length === 0) return []

    // 2. Fetch session count for this user
    const { count: sessionsCount } = await supabase
      .from('quiz_sessions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)

    const totalSessions = sessionsCount ?? 0

    // 3. Fetch correct answers per subject (BGP, KSK, STG, LOP)
    //    quiz_answers → quiz_sessions → subjects
    const { data: correctRows } = await supabase
      .from('quiz_answers')
      .select('quiz_sessions!inner(subjects!inner(code))')
      .eq('user_id', userId)
      .eq('is_correct', true)

    // Aggregate correct count per subject code
    const correctPerSubject: Record<string, number> = {}
    for (const row of correctRows ?? []) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const code: string = (row as any).quiz_sessions?.subjects?.code
      if (code) {
        correctPerSubject[code] = (correctPerSubject[code] ?? 0) + 1
      }
    }

    // 4. Check perfectionist retroactively if in migration mode
    let hasPerfectSession = ctx.sessionTotal > 0 && ctx.sessionScore === ctx.sessionTotal
    if (ctx.isRetroactive && !hasPerfectSession) {
      const { data: perfectSessions } = await supabase
        .from('quiz_sessions')
        .select('id')
        .eq('user_id', userId)
        .filter('score', 'eq', 'total') // score column equals total column — handled via JS below
        .limit(1)
      // PostgREST can't compare two columns directly; do it in JS
      const { data: allSessions } = await supabase
        .from('quiz_sessions')
        .select('score, total')
        .eq('user_id', userId)
      hasPerfectSession = (allSessions ?? []).some(
        (s: { score: number; total: number }) => s.total > 0 && s.score === s.total,
      )
      void perfectSessions // suppress unused variable warning
    }

    // 5. Determine newly earned badges
    const SUBJECT_CODES = ['BGP', 'KSK', 'STG', 'LOP']
    const newlyEarned: string[] = []

    for (const badge of unearned) {
      let earned = false
      switch (badge.id) {
        case 'first_step':
          earned = totalSessions >= 1
          break
        case 'on_the_way':
          earned = totalSessions >= 10
          break
        case 'learning_pro':
          earned = totalSessions >= 50
          break
        case 'fire_starter':
          earned = ctx.streak >= 3
          break
        case 'week_warrior':
          earned = ctx.streak >= 7
          break
        case 'month_master':
          earned = ctx.streak >= 30
          break
        case 'all_rounder':
          earned = SUBJECT_CODES.every((code) => (correctPerSubject[code] ?? 0) >= 10)
          break
        case 'bgp_expert':
          earned = (correctPerSubject['BGP'] ?? 0) >= 100
          break
        case 'ksk_expert':
          earned = (correctPerSubject['KSK'] ?? 0) >= 100
          break
        case 'stg_expert':
          earned = (correctPerSubject['STG'] ?? 0) >= 100
          break
        case 'lop_expert':
          earned = (correctPerSubject['LOP'] ?? 0) >= 100
          break
        case 'perfectionist':
          earned = hasPerfectSession
          break
        case 'level_10':
          earned = ctx.level >= 10
          break
        case 'level_25':
          earned = ctx.level >= 25
          break
        case 'exam_ready':
          earned = ctx.level >= 50
          break
      }
      if (earned) newlyEarned.push(badge.id)
    }

    if (newlyEarned.length === 0) return []

    // 6. Insert newly earned badges
    const rows = newlyEarned.map((badgeId) => ({
      user_id: userId,
      badge_id: badgeId,
      unlocked_at: new Date().toISOString(),
      is_retroactive: ctx.isRetroactive ?? false,
    }))

    const { error: insertErr } = await supabase.from('user_badges').insert(rows)
    if (insertErr) {
      console.error('[badges] insert failed:', insertErr.message)
      return []
    }

    // 7. Return only non-retroactive badge IDs (retroactive ones don't show modals)
    return ctx.isRetroactive ? [] : newlyEarned
  } catch (err) {
    console.error('[badges] unexpected error:', err)
    return []
  }
}
