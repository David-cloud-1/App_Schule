/**
 * Achievements & Badges (PROJ-7, datengetrieben seit PROJ-22)
 *
 * Die Tabelle `badges` ist die einzige Quelle: Name, Icon, Regel, Schwelle
 * und — bei Fach-Experten-Badges — das Fach. Welche Badges ein Azubi sehen
 * und verdienen kann, hängt von seinem Fachbereich ab: allgemeine Badges
 * gelten für alle, Fach-Badges nur für Fächer des eigenen Bereichs.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { fetchAllRows } from '@/lib/fetch-all-rows'

// ── Badge Definitions ─────────────────────────────────────────────────────────

export type BadgeRule = 'sessions' | 'streak' | 'all_rounder' | 'subject_expert' | 'perfect_session' | 'level'

export interface BadgeDefinition {
  id: string
  name: string
  description: string
  icon: string
  sort_order: number
  rule: BadgeRule
  threshold: number | null
  subject_id: string | null
}

/** Was Bildschirme brauchen (Galerie, Freischalt-Popup) */
export type BadgeDisplay = Pick<BadgeDefinition, 'id' | 'name' | 'description' | 'icon' | 'sort_order'>

export function toBadgeDisplay({ id, name, description, icon, sort_order }: BadgeDefinition): BadgeDisplay {
  return { id, name, description, icon, sort_order }
}

const BADGE_COLUMNS = 'id, name, description, icon, sort_order, rule, threshold, subject_id, subjects(department_id)'

type BadgeRow = BadgeDefinition & { subjects: { department_id: string } | null }

/**
 * Badges, die im Bereich gelten: alle ohne Fach plus die Fach-Badges der
 * Fächer dieses Bereichs. Sortiert nach sort_order.
 */
export async function fetchBadgeDefinitions(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
  departmentId: string | null,
): Promise<BadgeDefinition[]> {
  const { data, error } = await supabase.from('badges').select(BADGE_COLUMNS).order('sort_order').limit(200)
  if (error) throw new Error(`Badges konnten nicht geladen werden: ${error.message}`)
  return ((data ?? []) as unknown as BadgeRow[])
    .filter((b) => b.subject_id === null || b.subjects?.department_id === departmentId)
    .map(({ subjects: _subjects, ...badge }) => badge)
}

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

// ── Regel-Auswertung (rein, ohne Datenbank) ───────────────────────────────────

export interface BadgeStats {
  totalSessions: number
  streak: number
  level: number
  hasPerfectSession: boolean
  /** Richtige Antworten je Fach-ID (gezählt über das Fach der Quiz-Sitzung) */
  correctPerSubject: Record<string, number>
  /** Aktive Fächer des Bereichs — zählen alle für den Allrounder */
  activeSubjectIds: string[]
}

export function isBadgeEarned(badge: BadgeDefinition, stats: BadgeStats): boolean {
  const threshold = badge.threshold ?? 0
  switch (badge.rule) {
    case 'sessions':
      return stats.totalSessions >= threshold
    case 'streak':
      return stats.streak >= threshold
    case 'level':
      return stats.level >= threshold
    case 'perfect_session':
      return stats.hasPerfectSession
    case 'subject_expert':
      return badge.subject_id !== null && (stats.correctPerSubject[badge.subject_id] ?? 0) >= threshold
    case 'all_rounder':
      return (
        stats.activeSubjectIds.length > 0 &&
        stats.activeSubjectIds.every((id) => (stats.correctPerSubject[id] ?? 0) >= threshold)
      )
    default:
      return false
  }
}

// ── Badge Check + Award Function ─────────────────────────────────────────────

/**
 * Check all badge conditions for a user and award any newly earned badges.
 * Returns the newly awarded badges (empty for retroactive awards).
 *
 * Gracefully returns [] if anything fails — a badge must never break the
 * quiz flow.
 */
export async function checkAndAwardBadges(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
  userId: string,
  ctx: BadgeCheckContext,
): Promise<BadgeDefinition[]> {
  try {
    // 1. Get badges this user already has
    const { data: existingRows, error: existingErr } = await supabase
      .from('user_badges')
      .select('badge_id')
      .eq('user_id', userId)

    if (existingErr) {
      console.warn('[badges] user_badges query failed:', existingErr.message)
      return []
    }

    // 2. Badges of the user's department
    const { data: profile } = await supabase
      .from('profiles')
      .select('department_id')
      .eq('id', userId)
      .maybeSingle()
    const departmentId = (profile as { department_id: string | null } | null)?.department_id ?? null

    const earned = new Set((existingRows ?? []).map((r: { badge_id: string }) => r.badge_id))
    const definitions = await fetchBadgeDefinitions(supabase, departmentId)
    const unearned = definitions.filter((b) => !earned.has(b.id))
    if (unearned.length === 0) return []

    // 3. Session count
    const { count: sessionsCount } = await supabase
      .from('quiz_sessions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)

    // 4. Correct answers per subject (via the session's subject)
    const { rows: correctRows } = await fetchAllRows<unknown>('badges correct answers', (from, to) =>
      supabase
        .from('quiz_answers')
        .select('quiz_sessions!inner(subject_id)')
        .eq('user_id', userId)
        .eq('is_correct', true)
        .order('id')
        .range(from, to),
    )
    const correctPerSubject: Record<string, number> = {}
    for (const row of correctRows) {
      const subjectId = (row as { quiz_sessions?: { subject_id: string | null } }).quiz_sessions?.subject_id
      if (subjectId) correctPerSubject[subjectId] = (correctPerSubject[subjectId] ?? 0) + 1
    }

    // 5. Active subjects of the department (all count for the all-rounder)
    let activeSubjectIds: string[] = []
    if (departmentId) {
      const { data: subjects } = await supabase
        .from('subjects')
        .select('id')
        .eq('department_id', departmentId)
        .eq('is_active', true)
        .limit(100)
      activeSubjectIds = (subjects ?? []).map((s: { id: string }) => s.id)
    }

    // 6. Perfect session: this one, or — retroactively — any earlier one
    let hasPerfectSession = ctx.sessionTotal > 0 && ctx.sessionScore === ctx.sessionTotal
    if (ctx.isRetroactive && !hasPerfectSession) {
      // PostgREST can't compare two columns directly; do it in JS
      const { data: allSessions } = await supabase
        .from('quiz_sessions')
        .select('score, total')
        .eq('user_id', userId)
      hasPerfectSession = (allSessions ?? []).some(
        (s: { score: number; total: number }) => s.total > 0 && s.score === s.total,
      )
    }

    const stats: BadgeStats = {
      totalSessions: sessionsCount ?? 0,
      streak: ctx.streak,
      level: ctx.level,
      hasPerfectSession,
      correctPerSubject,
      activeSubjectIds,
    }
    const newlyEarned = unearned.filter((b) => isBadgeEarned(b, stats))
    if (newlyEarned.length === 0) return []

    // 7. Insert newly earned badges
    const rows = newlyEarned.map((badge) => ({
      user_id: userId,
      badge_id: badge.id,
      unlocked_at: new Date().toISOString(),
      is_retroactive: ctx.isRetroactive ?? false,
    }))

    const { error: insertErr } = await supabase.from('user_badges').insert(rows)
    if (insertErr) {
      console.error('[badges] insert failed:', insertErr.message)
      return []
    }

    // 8. Return only non-retroactive badges (retroactive ones don't show modals)
    return ctx.isRetroactive ? [] : newlyEarned
  } catch (err) {
    console.error('[badges] unexpected error:', err)
    return []
  }
}
