import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET } from './route'
import { chainMock } from '@/test/supabase-chain-mock'

vi.mock('@/lib/supabase-server', () => ({
  createClient: vi.fn(),
}))

import { createClient } from '@/lib/supabase-server'

const USER_ID = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
const SPED = 'dept-sped'

// 15 Badges wie in der Datenbank: 11 allgemeine + 4 Fach-Badges der Spedition,
// dazu ein Fach-Badge eines anderen Bereichs, das nicht erscheinen darf.
const GENERAL = ['first_step', 'on_the_way', 'learning_pro', 'fire_starter', 'week_warrior', 'month_master', 'all_rounder', 'perfectionist', 'level_10', 'level_25', 'exam_ready']
const EXPERTS = ['bgp_expert', 'ksk_expert', 'stg_expert', 'lop_expert']
const BADGE_ROWS = [
  ...GENERAL.map((id, i) => ({ id, name: id, description: `${id} desc`, icon: '🏅', sort_order: i < 7 ? i + 1 : i + 5, rule: 'sessions', threshold: 1, subject_id: null, subjects: null })),
  ...EXPERTS.map((id, i) => ({ id, name: id, description: `${id} desc`, icon: '📊', sort_order: 8 + i, rule: 'subject_expert', threshold: 100, subject_id: `sub-${i}`, subjects: { department_id: SPED } })),
  { id: 'rvt_expert', name: 'RVT', description: 'x', icon: '✈️', sort_order: 99, rule: 'subject_expert', threshold: 100, subject_id: 'sub-rvt', subjects: { department_id: 'dept-tour' } },
].sort((a, b) => a.sort_order - b.sort_order)

function makeSupabaseMock(user: unknown, userBadges: { badge_id: string; unlocked_at: string }[] | null, queryError = false) {
  return chainMock(
    (table) => {
      if (table === 'profiles') return { data: { department_id: SPED } }
      if (table === 'badges') return { data: BADGE_ROWS }
      if (table === 'user_badges') {
        return { data: queryError ? null : userBadges, error: queryError ? { message: 'DB error' } : null }
      }
      return {}
    },
    { auth: { getUser: vi.fn().mockResolvedValue({ data: { user } }) } },
  ).client
}

describe('GET /api/badges', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabaseMock(null, []) as never)
    const res = await GET()
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error).toBe('Unauthorized')
  })

  it('returns the 15 badges of the own department with unlocked=false when user has no badges', async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabaseMock({ id: USER_ID }, []) as never)
    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.badges).toHaveLength(15)
    expect(body.badges.map((b: { id: string }) => b.id)).not.toContain('rvt_expert')
    expect(body.badges.every((b: { unlocked: boolean }) => !b.unlocked)).toBe(true)
    expect(body.badges.every((b: { unlocked_at: unknown }) => b.unlocked_at === null)).toBe(true)
  })

  it('marks unlocked badges correctly with unlock date', async () => {
    const unlockedAt = '2026-04-17T10:00:00.000Z'
    vi.mocked(createClient).mockResolvedValue(
      makeSupabaseMock({ id: USER_ID }, [{ badge_id: 'first_step', unlocked_at: unlockedAt }]) as never,
    )
    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()

    const firstStep = body.badges.find((b: { id: string }) => b.id === 'first_step')
    expect(firstStep).toBeDefined()
    expect(firstStep.unlocked).toBe(true)
    expect(firstStep.unlocked_at).toBe(unlockedAt)

    const otherBadges = body.badges.filter((b: { id: string }) => b.id !== 'first_step')
    expect(otherBadges.every((b: { unlocked: boolean }) => !b.unlocked)).toBe(true)
  })

  it('returns all badges as locked when user_badges query fails (graceful fallback)', async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabaseMock({ id: USER_ID }, null, true) as never)
    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.badges).toHaveLength(15)
    expect(body.badges.every((b: { unlocked: boolean }) => !b.unlocked)).toBe(true)
  })

  it('returns badges sorted by sort_order', async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabaseMock({ id: USER_ID }, []) as never)
    const res = await GET()
    const body = await res.json()
    const orders: number[] = body.badges.map((b: { sort_order: number }) => b.sort_order)
    expect(orders).toEqual([...orders].sort((a, b) => a - b))
  })

  it('returns only display fields on each badge', async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabaseMock({ id: USER_ID }, []) as never)
    const res = await GET()
    const body = await res.json()
    for (const badge of body.badges) {
      expect(Object.keys(badge).sort()).toEqual(['description', 'icon', 'id', 'name', 'sort_order', 'unlocked', 'unlocked_at'])
    }
  })
})
