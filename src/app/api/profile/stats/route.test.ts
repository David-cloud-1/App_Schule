import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET } from './route'

vi.mock('@/lib/supabase-server', () => ({
  createClient: vi.fn(),
}))

import { createClient } from '@/lib/supabase-server'

function makeSupabaseMock(user: unknown, profileData: unknown = null, profileError: unknown = null) {
  const profileBuilder = {
    select: vi.fn().mockReturnThis(),
    eq:     vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: profileData, error: profileError }),
  }
  return {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user } }) },
    from: vi.fn().mockReturnValue(profileBuilder),
  }
}

describe('GET /api/profile/stats', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabaseMock(null) as never)
    const res = await GET()
    expect(res.status).toBe(401)
  })

  it('returns profile stats with computed level', async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeSupabaseMock({ id: 'user-1' }, {
        total_xp: 250,
        current_streak: 5,
        longest_streak: 12,
      }) as never,
    )
    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.total_xp).toBe(250)
    expect(body.current_streak).toBe(5)
    expect(body.longest_streak).toBe(12)
    // 250 XP → Level 3 (300 XP needed for Level 4, 100 for Level 2 → 250 puts us at Level 3)
    // Level 1=0, 2=100, 3=300... wait: 50*3*2=300, 50*2*1=100. 250 is between 100 and 300 → Level 2
    // Let me re-check: Level 2 = 50*2*1 = 100, Level 3 = 50*3*2 = 300. 250 < 300 → Level 2
    expect(body.level).toBe(2)
  })

  it('returns 500 when profile fetch fails', async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeSupabaseMock({ id: 'user-1' }, null, { message: 'DB error' }) as never,
    )
    const res = await GET()
    expect(res.status).toBe(500)
  })

  it('returns level 1 for zero XP', async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeSupabaseMock({ id: 'user-1' }, {
        total_xp: 0,
        current_streak: 0,
        longest_streak: 0,
      }) as never,
    )
    const res = await GET()
    const body = await res.json()
    expect(body.level).toBe(1)
    expect(body.total_xp).toBe(0)
  })

  it('returns level 50 at max level XP', async () => {
    // 50 * 50 * 49 = 122500 XP = Level 50
    vi.mocked(createClient).mockResolvedValue(
      makeSupabaseMock({ id: 'user-1' }, {
        total_xp: 122500,
        current_streak: 100,
        longest_streak: 200,
      }) as never,
    )
    const res = await GET()
    const body = await res.json()
    expect(body.level).toBe(50)
  })
})
