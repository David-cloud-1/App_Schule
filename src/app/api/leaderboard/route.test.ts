import { describe, it, expect, vi, beforeEach } from 'vitest'

// Bereich des Nutzers und Fächer seines Bereichs (PROJ-23)
vi.mock('@/lib/departments-server', () => ({
  getDepartmentOfUser: vi.fn(async () => ({ id: 'dept-sped', classLevels: [10, 11, 12] })),
  getDepartmentSubjectIds: vi.fn(async () => ['subj-lop', 'subj-ksk']),
}))
import { GET } from './route'
import { NextRequest } from 'next/server'
import { chainMock, eqValue } from '@/test/supabase-chain-mock'

vi.mock('@/lib/supabase-server', () => ({
  createClient: vi.fn(),
  createServiceClient: vi.fn(),
}))

import { createClient, createServiceClient } from '@/lib/supabase-server'

const USER_ID = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
const OTHER_ID = 'bbbbbbbb-cccc-dddd-eeee-ffffffffffff'
const OPT_OUT_ID = 'cccccccc-dddd-eeee-ffff-000000000000'

function makeRequest(period?: string): NextRequest {
  const url = period
    ? `http://localhost/api/leaderboard?period=${period}`
    : 'http://localhost/api/leaderboard'
  return new NextRequest(url)
}

const BASE_PROFILES = [
  { id: USER_ID, display_name: 'Alice', total_xp: 200, leaderboard_opt_out: false },
  { id: OTHER_ID, display_name: 'Bob', total_xp: 150, leaderboard_opt_out: false },
]

const PROFILES_WITH_OPT_OUT = [
  { id: USER_ID, display_name: 'Alice', total_xp: 200, leaderboard_opt_out: false },
  { id: OTHER_ID, display_name: 'Bob', total_xp: 150, leaderboard_opt_out: false },
  { id: OPT_OUT_ID, display_name: 'Charlie', total_xp: 300, leaderboard_opt_out: true },
]

function makeAuthClient(user: unknown) {
  return {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user } }) },
  }
}

let lastService: ReturnType<typeof chainMock>

function makeServiceClientAllTime(profiles: unknown[]) {
  lastService = chainMock((table) => (table === 'profiles' ? { data: profiles } : {}))
  return lastService.client
}

function makeServiceClientPeriod(
  sessions: { user_id: string; xp_earned: number }[],
  profiles: { id: string; display_name: string | null; leaderboard_opt_out: boolean }[],
  sessionError: unknown = null,
  profileError: unknown = null,
) {
  lastService = chainMock((table) => {
    if (table === 'quiz_sessions') return { data: sessions, error: sessionError }
    if (table === 'profiles') return { data: profiles, error: profileError }
    return {}
  })
  return lastService.client
}

describe('GET /api/leaderboard', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(createClient).mockResolvedValue(makeAuthClient(null) as never)
    vi.mocked(createServiceClient).mockReturnValue({} as never)
    const res = await GET(makeRequest())
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error).toBe('Unauthorized')
  })

  describe('period=all', () => {
    it('returns top 10 entries sorted by total_xp descending', async () => {
      vi.mocked(createClient).mockResolvedValue(makeAuthClient({ id: USER_ID }) as never)
      vi.mocked(createServiceClient).mockReturnValue(makeServiceClientAllTime(BASE_PROFILES) as never)

      const res = await GET(makeRequest('all'))
      expect(res.status).toBe(200)
      const body = await res.json()

      expect(body.entries).toHaveLength(2)
      expect(body.entries[0].display_name).toBe('Alice')
      expect(body.entries[0].total_xp).toBe(200)
      expect(body.entries[0].rank).toBe(1)
      expect(body.entries[1].display_name).toBe('Bob')
      expect(body.entries[1].rank).toBe(2)
    })

    it('marks current user entry with is_current_user=true', async () => {
      vi.mocked(createClient).mockResolvedValue(makeAuthClient({ id: USER_ID }) as never)
      vi.mocked(createServiceClient).mockReturnValue(makeServiceClientAllTime(BASE_PROFILES) as never)

      const res = await GET(makeRequest('all'))
      const body = await res.json()

      const myEntry = body.entries.find((e: { is_current_user: boolean }) => e.is_current_user)
      expect(myEntry).toBeDefined()
      expect(myEntry.display_name).toBe('Alice')
    })

    it('omits opted-out users from the public entries list', async () => {
      vi.mocked(createClient).mockResolvedValue(makeAuthClient({ id: USER_ID }) as never)
      vi.mocked(createServiceClient).mockReturnValue(
        makeServiceClientAllTime(PROFILES_WITH_OPT_OUT) as never,
      )

      const res = await GET(makeRequest('all'))
      const body = await res.json()

      const names = body.entries.map((e: { display_name: string }) => e.display_name)
      expect(names).not.toContain('Charlie')
    })

    it('returns current_user=null when current user is in top 10', async () => {
      vi.mocked(createClient).mockResolvedValue(makeAuthClient({ id: USER_ID }) as never)
      vi.mocked(createServiceClient).mockReturnValue(makeServiceClientAllTime(BASE_PROFILES) as never)

      const res = await GET(makeRequest('all'))
      const body = await res.json()
      expect(body.current_user).toBeNull()
    })

    it('returns current_user entry pinned when outside top 10', async () => {
      const manyProfiles = Array.from({ length: 10 }, (_, i) => ({
        id: `user-${i}`,
        display_name: `User${i}`,
        total_xp: 1000 - i * 10,
        leaderboard_opt_out: false,
      }))
      const currentUserProfile = {
        id: USER_ID,
        display_name: 'Alice',
        total_xp: 5,
        leaderboard_opt_out: false,
      }

      vi.mocked(createClient).mockResolvedValue(makeAuthClient({ id: USER_ID }) as never)
      vi.mocked(createServiceClient).mockReturnValue(
        makeServiceClientAllTime([...manyProfiles, currentUserProfile]) as never,
      )

      const res = await GET(makeRequest('all'))
      const body = await res.json()

      expect(body.entries).toHaveLength(10)
      expect(body.current_user).not.toBeNull()
      expect(body.current_user.is_current_user).toBe(true)
      expect(body.current_user.rank).toBe(11)
    })
  })

  describe('period=week (default)', () => {
    it('aggregates XP from quiz_sessions for the current week', async () => {
      const sessions = [
        { user_id: USER_ID, xp_earned: 50 },
        { user_id: USER_ID, xp_earned: 30 },
        { user_id: OTHER_ID, xp_earned: 100 },
      ]
      const profiles = [
        { id: USER_ID, display_name: 'Alice', leaderboard_opt_out: false },
        { id: OTHER_ID, display_name: 'Bob', leaderboard_opt_out: false },
      ]

      vi.mocked(createClient).mockResolvedValue(makeAuthClient({ id: USER_ID }) as never)
      vi.mocked(createServiceClient).mockReturnValue(
        makeServiceClientPeriod(sessions, profiles) as never,
      )

      const res = await GET(makeRequest('week'))
      expect(res.status).toBe(200)
      const body = await res.json()

      expect(body.entries[0].display_name).toBe('Bob')
      expect(body.entries[0].total_xp).toBe(100)
      expect(body.entries[1].display_name).toBe('Alice')
      expect(body.entries[1].total_xp).toBe(80)
    })

    it('defaults to week period when no period param provided', async () => {
      vi.mocked(createClient).mockResolvedValue(makeAuthClient({ id: USER_ID }) as never)
      vi.mocked(createServiceClient).mockReturnValue(
        makeServiceClientPeriod([], [{ id: USER_ID, display_name: 'Alice', leaderboard_opt_out: false }]) as never,
      )

      const res = await GET(makeRequest())
      expect(res.status).toBe(200)
    })

    it('includes current user with 0 XP when they have no sessions this week', async () => {
      const sessions = [{ user_id: OTHER_ID, xp_earned: 100 }]
      const profiles = [
        { id: USER_ID, display_name: 'Alice', leaderboard_opt_out: false },
        { id: OTHER_ID, display_name: 'Bob', leaderboard_opt_out: false },
      ]

      vi.mocked(createClient).mockResolvedValue(makeAuthClient({ id: USER_ID }) as never)
      vi.mocked(createServiceClient).mockReturnValue(
        makeServiceClientPeriod(sessions, profiles) as never,
      )

      const res = await GET(makeRequest('week'))
      const body = await res.json()

      const myEntry = body.current_user ?? body.entries.find((e: { is_current_user: boolean }) => e.is_current_user)
      expect(myEntry).toBeDefined()
      expect(myEntry.total_xp).toBe(0)
    })

    it('excludes opted-out users from public entries', async () => {
      const sessions = [
        { user_id: OPT_OUT_ID, xp_earned: 500 },
        { user_id: USER_ID, xp_earned: 50 },
      ]
      const profiles = [
        { id: USER_ID, display_name: 'Alice', leaderboard_opt_out: false },
        { id: OPT_OUT_ID, display_name: 'Charlie', leaderboard_opt_out: true },
      ]

      vi.mocked(createClient).mockResolvedValue(makeAuthClient({ id: USER_ID }) as never)
      vi.mocked(createServiceClient).mockReturnValue(
        makeServiceClientPeriod(sessions, profiles) as never,
      )

      const res = await GET(makeRequest('week'))
      const body = await res.json()

      const names = body.entries.map((e: { display_name: string }) => e.display_name)
      expect(names).not.toContain('Charlie')
    })

    it('returns 500 when quiz_sessions query fails', async () => {
      vi.mocked(createClient).mockResolvedValue(makeAuthClient({ id: USER_ID }) as never)
      vi.mocked(createServiceClient).mockReturnValue(
        makeServiceClientPeriod([], [], { message: 'DB error' }) as never,
      )

      const res = await GET(makeRequest('week'))
      expect(res.status).toBe(500)
    })
  })

  describe('period=month', () => {
    it('returns correct entries for month period', async () => {
      const sessions = [{ user_id: USER_ID, xp_earned: 200 }]
      const profiles = [{ id: USER_ID, display_name: 'Alice', leaderboard_opt_out: false }]

      vi.mocked(createClient).mockResolvedValue(makeAuthClient({ id: USER_ID }) as never)
      vi.mocked(createServiceClient).mockReturnValue(
        makeServiceClientPeriod(sessions, profiles) as never,
      )

      const res = await GET(makeRequest('month'))
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.entries[0].total_xp).toBe(200)
    })
  })

  describe('tiebreaker', () => {
    it('sorts alphabetically when two users have identical XP', async () => {
      const sessions = [
        { user_id: USER_ID, xp_earned: 100 },
        { user_id: OTHER_ID, xp_earned: 100 },
      ]
      const profiles = [
        { id: USER_ID, display_name: 'Zara', leaderboard_opt_out: false },
        { id: OTHER_ID, display_name: 'Anna', leaderboard_opt_out: false },
      ]

      vi.mocked(createClient).mockResolvedValue(makeAuthClient({ id: USER_ID }) as never)
      vi.mocked(createServiceClient).mockReturnValue(
        makeServiceClientPeriod(sessions, profiles) as never,
      )

      const res = await GET(makeRequest('week'))
      const body = await res.json()

      expect(body.entries[0].display_name).toBe('Anna')
      expect(body.entries[1].display_name).toBe('Zara')
    })
  })

  describe('Bereichstrennung (PROJ-23)', () => {
    it('lädt für die Gesamt-Rangliste nur Profile des eigenen Bereichs', async () => {
      vi.mocked(createClient).mockResolvedValue(makeAuthClient({ id: 'u1' }) as never)
      vi.mocked(createServiceClient).mockReturnValue(makeServiceClientAllTime([]) as never)
      await GET(makeRequest('all'))
      const q = lastService.queries.find((x) => x.table === 'profiles')!
      expect(eqValue(q.calls, 'department_id')).toBe('dept-sped')
    })

    it('zählt Wochen-XP von Nutzern anderer Bereiche nicht mit', async () => {
      vi.mocked(createClient).mockResolvedValue(makeAuthClient({ id: 'u1' }) as never)
      // u-fremd hat XP, gehört aber nicht zum Bereich (fehlt in der gefilterten Profilliste)
      vi.mocked(createServiceClient).mockReturnValue(
        makeServiceClientPeriod(
          [{ user_id: 'u1', xp_earned: 10 }, { user_id: 'u-fremd', xp_earned: 999 }],
          [{ id: 'u1', display_name: 'Ich', leaderboard_opt_out: false }],
        ) as never,
      )
      const res = await GET(makeRequest('week'))
      const body = await res.json()
      expect(body.entries.map((e: { id: string }) => e.id)).toEqual(['u1'])
      const q = lastService.queries.find((x) => x.table === 'profiles')!
      expect(eqValue(q.calls, 'department_id')).toBe('dept-sped')
    })
  })
})
