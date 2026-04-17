import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET } from './route'

vi.mock('@/lib/supabase-server', () => ({
  createClient: vi.fn(),
}))

import { createClient } from '@/lib/supabase-server'

const USER_ID = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'

function makeSupabaseMock(user: unknown, userBadges: { badge_id: string; unlocked_at: string }[] | null, queryError = false) {
  const userBadgesBuilder = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockResolvedValue({
      data: queryError ? null : userBadges,
      error: queryError ? { message: 'DB error' } : null,
    }),
  }

  return {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user } }) },
    from: vi.fn().mockImplementation(() => userBadgesBuilder),
  }
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

  it('returns all 15 badges with unlocked=false when user has no badges', async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeSupabaseMock({ id: USER_ID }, []) as never,
    )
    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.badges).toHaveLength(15)
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

    // All other badges should remain locked
    const otherBadges = body.badges.filter((b: { id: string }) => b.id !== 'first_step')
    expect(otherBadges.every((b: { unlocked: boolean }) => !b.unlocked)).toBe(true)
  })

  it('returns all 15 badges as locked when user_badges query fails (graceful fallback)', async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeSupabaseMock({ id: USER_ID }, null, true) as never,
    )
    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.badges).toHaveLength(15)
    expect(body.badges.every((b: { unlocked: boolean }) => !b.unlocked)).toBe(true)
  })

  it('returns badges sorted by sort_order', async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeSupabaseMock({ id: USER_ID }, []) as never,
    )
    const res = await GET()
    const body = await res.json()
    const orders: number[] = body.badges.map((b: { sort_order: number }) => b.sort_order)
    expect(orders).toEqual([...orders].sort((a, b) => a - b))
  })

  it('returns required badge fields on each badge', async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeSupabaseMock({ id: USER_ID }, []) as never,
    )
    const res = await GET()
    const body = await res.json()
    for (const badge of body.badges) {
      expect(badge).toHaveProperty('id')
      expect(badge).toHaveProperty('name')
      expect(badge).toHaveProperty('description')
      expect(badge).toHaveProperty('icon')
      expect(badge).toHaveProperty('sort_order')
      expect(badge).toHaveProperty('unlocked')
      expect(badge).toHaveProperty('unlocked_at')
    }
  })
})
