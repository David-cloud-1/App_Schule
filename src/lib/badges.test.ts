import { describe, it, expect, vi, beforeEach } from 'vitest'
import { BADGE_DEFINITIONS, checkAndAwardBadges, type BadgeCheckContext } from './badges'
import type { SupabaseClient } from '@supabase/supabase-js'

// ── Badge Definitions ────────────────────────────────────────────────────────

describe('BADGE_DEFINITIONS', () => {
  it('contains exactly 15 badges', () => {
    expect(BADGE_DEFINITIONS).toHaveLength(15)
  })

  it('all badges have required fields: id, name, description, icon, sort_order', () => {
    for (const badge of BADGE_DEFINITIONS) {
      expect(badge.id).toBeTruthy()
      expect(badge.name).toBeTruthy()
      expect(badge.description).toBeTruthy()
      expect(badge.icon).toBeTruthy()
      expect(typeof badge.sort_order).toBe('number')
    }
  })

  it('sort_order values are unique', () => {
    const orders = BADGE_DEFINITIONS.map((b) => b.sort_order)
    expect(new Set(orders).size).toBe(orders.length)
  })

  it('badge IDs are unique', () => {
    const ids = BADGE_DEFINITIONS.map((b) => b.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('contains all 15 required badge IDs from spec', () => {
    const requiredIds = [
      'first_step', 'on_the_way', 'learning_pro',
      'fire_starter', 'week_warrior', 'month_master',
      'all_rounder',
      'bgp_expert', 'ksk_expert', 'stg_expert', 'lop_expert',
      'perfectionist',
      'level_10', 'level_25', 'exam_ready',
    ]
    const ids = BADGE_DEFINITIONS.map((b) => b.id)
    for (const requiredId of requiredIds) {
      expect(ids).toContain(requiredId)
    }
  })
})

// ── checkAndAwardBadges ──────────────────────────────────────────────────────

const USER_ID = 'test-user-id'

/**
 * Creates a minimal Supabase mock for badge checking.
 * - existingBadges: badges the user already has (prevents re-awarding)
 * - sessionsCount: total quiz sessions for the user
 * - correctRows: correct answer rows (with joined subject codes)
 * - allSessions: all sessions with score/total (for perfectionist check)
 * - insertError: if true, the INSERT fails
 */
function makeSupabaseMock(opts: {
  existingBadges?: string[]
  sessionsCount?: number
  correctRows?: { quiz_sessions: { subjects: { code: string } } }[]
  allSessions?: { score: number; total: number }[]
  insertError?: boolean
} = {}) {
  const {
    existingBadges = [],
    sessionsCount = 0,
    correctRows = [],
    allSessions = [],
    insertError = false,
  } = opts

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mockFrom = vi.fn().mockImplementation((table: string): any => {
    if (table === 'user_badges') {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: existingBadges.map((id) => ({ badge_id: id })),
            error: null,
          }),
        }),
        insert: vi.fn().mockResolvedValue({ error: insertError ? { message: 'insert error' } : null }),
      }
    }

    if (table === 'quiz_sessions') {
      return {
        select: vi.fn().mockReturnValue({
          count: 'exact',
          head: true,
          eq: vi.fn().mockReturnValue({
            // for count query
            then: (resolve: (v: unknown) => void) => resolve({ count: sessionsCount, error: null }),
            // chainable for allSessions query
            select: vi.fn().mockResolvedValue({ data: allSessions, error: null }),
            filter: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
        }),
      }
    }

    if (table === 'quiz_answers') {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: correctRows, error: null }),
          }),
        }),
      }
    }

    return { select: vi.fn().mockResolvedValue({ data: [], error: null }) }
  })

  return { from: mockFrom } as unknown as SupabaseClient
}

/**
 * A simpler mock builder that handles the chained query pattern in checkAndAwardBadges.
 * Uses a spy-free approach: every `.from()` call returns a builder that resolves
 * to the appropriate data for that table.
 */
function makeSimpleMock(opts: {
  existingBadges?: string[]
  sessionsCount?: number
  correctRows?: Array<{ quiz_sessions: { subjects: { code: string } } }>
  allSessions?: { score: number; total: number }[]
  insertError?: boolean
  userBadgesQueryError?: boolean
} = {}) {
  const {
    existingBadges = [],
    sessionsCount = 0,
    correctRows = [],
    allSessions = [],
    insertError = false,
    userBadgesQueryError = false,
  } = opts

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const from = vi.fn().mockImplementation((table: string): any => {
    if (table === 'user_badges') {
      const insertMock = vi.fn().mockResolvedValue({
        error: insertError ? { message: 'insert error' } : null,
      })
      const eqMock = vi.fn().mockResolvedValue({
        data: userBadgesQueryError ? null : existingBadges.map((id) => ({ badge_id: id })),
        error: userBadgesQueryError ? { message: 'DB error' } : null,
      })
      const selectMock = vi.fn().mockReturnValue({ eq: eqMock })
      return { select: selectMock, insert: insertMock }
    }

    if (table === 'quiz_sessions') {
      // count query: .select('id', { count: 'exact', head: true }).eq(...)
      // allSessions query: .select('score, total').eq(...)
      // perfectSessions query: .select('id').eq(...).filter(...).limit(...)
      let selectCallCount = 0
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const selectMock = vi.fn().mockImplementation((..._args: any[]) => {
        selectCallCount++
        if (selectCallCount === 1) {
          // First call: count query
          return {
            eq: vi.fn().mockResolvedValue({ count: sessionsCount, data: null, error: null }),
          }
        }
        if (selectCallCount === 2) {
          // Second call (retroactive perfectionist): allSessions
          return {
            eq: vi.fn().mockResolvedValue({ data: allSessions, error: null }),
          }
        }
        if (selectCallCount === 3) {
          // Third call (retroactive): perfectSessions unused query
          return {
            eq: vi.fn().mockReturnValue({
              filter: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({ data: [], error: null }),
              }),
            }),
          }
        }
        return { eq: vi.fn().mockResolvedValue({ data: [], error: null }) }
      })
      return { select: selectMock }
    }

    if (table === 'quiz_answers') {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: correctRows, error: null }),
          }),
        }),
      }
    }

    return { select: vi.fn().mockResolvedValue({ data: [], error: null }) }
  })

  return { from } as unknown as SupabaseClient
}

describe('checkAndAwardBadges', () => {
  beforeEach(() => vi.clearAllMocks())

  // ── Session-count badges ─────────────────────────────────────────────────

  it('awards first_step after 1 session', async () => {
    const supabase = makeSimpleMock({ sessionsCount: 1 })
    const ctx: BadgeCheckContext = { streak: 0, level: 1, sessionScore: 5, sessionTotal: 10 }
    const awarded = await checkAndAwardBadges(supabase, USER_ID, ctx)
    expect(awarded).toContain('first_step')
  })

  it('does NOT award first_step with 0 sessions', async () => {
    const supabase = makeSimpleMock({ sessionsCount: 0 })
    const ctx: BadgeCheckContext = { streak: 0, level: 1, sessionScore: 0, sessionTotal: 10 }
    const awarded = await checkAndAwardBadges(supabase, USER_ID, ctx)
    expect(awarded).not.toContain('first_step')
  })

  it('awards on_the_way after 10 sessions', async () => {
    const supabase = makeSimpleMock({ sessionsCount: 10 })
    const ctx: BadgeCheckContext = { streak: 0, level: 1, sessionScore: 5, sessionTotal: 10 }
    const awarded = await checkAndAwardBadges(supabase, USER_ID, ctx)
    expect(awarded).toContain('first_step')
    expect(awarded).toContain('on_the_way')
  })

  it('awards learning_pro after 50 sessions', async () => {
    const supabase = makeSimpleMock({ sessionsCount: 50 })
    const ctx: BadgeCheckContext = { streak: 0, level: 1, sessionScore: 5, sessionTotal: 10 }
    const awarded = await checkAndAwardBadges(supabase, USER_ID, ctx)
    expect(awarded).toContain('learning_pro')
  })

  // ── Streak badges ────────────────────────────────────────────────────────

  it('awards fire_starter at streak >= 3', async () => {
    const supabase = makeSimpleMock({ sessionsCount: 1 })
    const ctx: BadgeCheckContext = { streak: 3, level: 1, sessionScore: 5, sessionTotal: 10 }
    const awarded = await checkAndAwardBadges(supabase, USER_ID, ctx)
    expect(awarded).toContain('fire_starter')
    expect(awarded).not.toContain('week_warrior')
  })

  it('awards week_warrior at streak >= 7', async () => {
    const supabase = makeSimpleMock({ sessionsCount: 1 })
    const ctx: BadgeCheckContext = { streak: 7, level: 1, sessionScore: 5, sessionTotal: 10 }
    const awarded = await checkAndAwardBadges(supabase, USER_ID, ctx)
    expect(awarded).toContain('fire_starter')
    expect(awarded).toContain('week_warrior')
    expect(awarded).not.toContain('month_master')
  })

  it('awards month_master at streak >= 30', async () => {
    const supabase = makeSimpleMock({ sessionsCount: 1 })
    const ctx: BadgeCheckContext = { streak: 30, level: 1, sessionScore: 5, sessionTotal: 10 }
    const awarded = await checkAndAwardBadges(supabase, USER_ID, ctx)
    expect(awarded).toContain('month_master')
  })

  // ── Level badges ─────────────────────────────────────────────────────────

  it('awards level_10 at level >= 10', async () => {
    const supabase = makeSimpleMock({ sessionsCount: 1 })
    const ctx: BadgeCheckContext = { streak: 0, level: 10, sessionScore: 5, sessionTotal: 10 }
    const awarded = await checkAndAwardBadges(supabase, USER_ID, ctx)
    expect(awarded).toContain('level_10')
    expect(awarded).not.toContain('level_25')
  })

  it('awards level_25 at level >= 25 (also awards level_10)', async () => {
    const supabase = makeSimpleMock({ sessionsCount: 1 })
    const ctx: BadgeCheckContext = { streak: 0, level: 25, sessionScore: 5, sessionTotal: 10 }
    const awarded = await checkAndAwardBadges(supabase, USER_ID, ctx)
    expect(awarded).toContain('level_10')
    expect(awarded).toContain('level_25')
  })

  it('awards exam_ready at level >= 50', async () => {
    const supabase = makeSimpleMock({ sessionsCount: 1 })
    const ctx: BadgeCheckContext = { streak: 0, level: 50, sessionScore: 5, sessionTotal: 10 }
    const awarded = await checkAndAwardBadges(supabase, USER_ID, ctx)
    expect(awarded).toContain('exam_ready')
  })

  // ── Perfectionist badge ───────────────────────────────────────────────────

  it('awards perfectionist when session score equals total', async () => {
    const supabase = makeSimpleMock({ sessionsCount: 1 })
    const ctx: BadgeCheckContext = { streak: 0, level: 1, sessionScore: 10, sessionTotal: 10 }
    const awarded = await checkAndAwardBadges(supabase, USER_ID, ctx)
    expect(awarded).toContain('perfectionist')
  })

  it('does NOT award perfectionist when score < total', async () => {
    const supabase = makeSimpleMock({ sessionsCount: 1 })
    const ctx: BadgeCheckContext = { streak: 0, level: 1, sessionScore: 9, sessionTotal: 10 }
    const awarded = await checkAndAwardBadges(supabase, USER_ID, ctx)
    expect(awarded).not.toContain('perfectionist')
  })

  it('does NOT award perfectionist when totalQuestions is 0', async () => {
    const supabase = makeSimpleMock({ sessionsCount: 1 })
    const ctx: BadgeCheckContext = { streak: 0, level: 1, sessionScore: 0, sessionTotal: 0 }
    const awarded = await checkAndAwardBadges(supabase, USER_ID, ctx)
    expect(awarded).not.toContain('perfectionist')
  })

  // ── Already-earned badges are NOT re-awarded ──────────────────────────────

  it('does not re-award badges the user already has', async () => {
    // User already has first_step
    const supabase = makeSimpleMock({
      existingBadges: ['first_step'],
      sessionsCount: 1,
    })
    const ctx: BadgeCheckContext = { streak: 0, level: 1, sessionScore: 5, sessionTotal: 10 }
    const awarded = await checkAndAwardBadges(supabase, USER_ID, ctx)
    expect(awarded).not.toContain('first_step')
  })

  it('returns [] when user already has all earnable badges', async () => {
    const allBadgeIds = BADGE_DEFINITIONS.map((b) => b.id)
    const supabase = makeSimpleMock({ existingBadges: allBadgeIds })
    const ctx: BadgeCheckContext = { streak: 30, level: 50, sessionScore: 10, sessionTotal: 10 }
    const awarded = await checkAndAwardBadges(supabase, USER_ID, ctx)
    expect(awarded).toHaveLength(0)
  })

  // ── Retroactive mode ──────────────────────────────────────────────────────

  it('returns [] for retroactive awards (no modals shown)', async () => {
    const supabase = makeSimpleMock({ sessionsCount: 1 })
    const ctx: BadgeCheckContext = {
      streak: 3,
      level: 10,
      sessionScore: 0,
      sessionTotal: 0,
      isRetroactive: true,
    }
    const awarded = await checkAndAwardBadges(supabase, USER_ID, ctx)
    // Badges are awarded in DB but not returned (no modal)
    expect(awarded).toHaveLength(0)
  })

  // ── Error handling ────────────────────────────────────────────────────────

  it('returns [] gracefully when user_badges query fails', async () => {
    const supabase = makeSimpleMock({ userBadgesQueryError: true })
    const ctx: BadgeCheckContext = { streak: 0, level: 1, sessionScore: 5, sessionTotal: 10 }
    const awarded = await checkAndAwardBadges(supabase, USER_ID, ctx)
    expect(awarded).toEqual([])
  })

  it('returns [] gracefully when insert fails', async () => {
    const supabase = makeSimpleMock({ sessionsCount: 1, insertError: true })
    const ctx: BadgeCheckContext = { streak: 0, level: 1, sessionScore: 5, sessionTotal: 10 }
    const awarded = await checkAndAwardBadges(supabase, USER_ID, ctx)
    expect(awarded).toEqual([])
  })
})
