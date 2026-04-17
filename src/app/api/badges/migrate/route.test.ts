import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { POST } from './route'

vi.mock('@/lib/supabase-server', () => ({
  createClient: vi.fn(),
}))

import { createClient } from '@/lib/supabase-server'

const USER_A = 'aaaaaaaa-0000-0000-0000-000000000001'
const USER_B = 'aaaaaaaa-0000-0000-0000-000000000002'

const PROFILES = [
  { id: USER_A, total_xp: 0, longest_streak: 0 },
  { id: USER_B, total_xp: 0, longest_streak: 0 },
]

function makeRequest(headers: Record<string, string> = {}): Request {
  return {
    headers: { get: (key: string) => headers[key] ?? null },
  } as unknown as Request
}

/**
 * Creates a universal chainable query builder that is also a proper thenable.
 * Any chained method call (select, eq, filter, limit) returns the same builder.
 * `await builder` resolves immediately with `resolveData`.
 * `insert()` always resolves with `{ error: null }`.
 */
function makeChainableBuilder(resolveData: Record<string, unknown>) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const builder: Record<string, any> = {
    // Proper thenable — JavaScript will call this when `await builder` is used
    then: (resolve: (v: Record<string, unknown>) => void, _reject?: (e: unknown) => void) => {
      resolve(resolveData)
    },
    insert: vi.fn().mockResolvedValue({ error: null }),
  }
  // All chainable methods return the same builder
  builder.select = vi.fn().mockReturnValue(builder)
  builder.eq = vi.fn().mockReturnValue(builder)
  builder.filter = vi.fn().mockReturnValue(builder)
  builder.limit = vi.fn().mockReturnValue(builder)
  return builder
}

function makeSupabaseMock(opts: {
  profilesError?: boolean
  existingBadges?: { badge_id: string }[]
} = {}) {
  const { profilesError = false, existingBadges = [] } = opts

  return {
    auth: { getUser: vi.fn() },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    from: vi.fn().mockImplementation((table: string): Record<string, any> => {
      if (table === 'profiles') {
        return {
          select: vi.fn().mockResolvedValue({
            data: profilesError ? null : PROFILES,
            error: profilesError ? { message: 'DB error' } : null,
          }),
        }
      }

      // user_badges: resolve with existingBadges for SELECT, or error: null for INSERT
      if (table === 'user_badges') {
        return makeChainableBuilder({ data: existingBadges, error: null, count: 0 })
      }

      // quiz_sessions + quiz_answers: resolve with empty arrays (no sessions → no badges earned)
      return makeChainableBuilder({ data: [], error: null, count: 0 })
    }),
  }
}

describe('POST /api/badges/migrate', () => {
  beforeEach(() => vi.clearAllMocks())

  afterEach(() => {
    delete process.env.BADGE_MIGRATE_SECRET
  })

  it('returns 403 when BADGE_MIGRATE_SECRET is set and header is missing', async () => {
    process.env.BADGE_MIGRATE_SECRET = 'super-secret'
    vi.mocked(createClient).mockResolvedValue(makeSupabaseMock() as never)
    const res = await POST(makeRequest())
    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body.error).toBe('Forbidden')
  })

  it('returns 403 when BADGE_MIGRATE_SECRET is set and header is wrong', async () => {
    process.env.BADGE_MIGRATE_SECRET = 'super-secret'
    vi.mocked(createClient).mockResolvedValue(makeSupabaseMock() as never)
    const res = await POST(makeRequest({ 'x-migrate-secret': 'wrong-secret' }))
    expect(res.status).toBe(403)
  })

  it('runs migration successfully when correct secret header provided', async () => {
    process.env.BADGE_MIGRATE_SECRET = 'super-secret'
    vi.mocked(createClient).mockResolvedValue(makeSupabaseMock() as never)
    const res = await POST(makeRequest({ 'x-migrate-secret': 'super-secret' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.message).toContain('Migration complete')
    expect(body.results).toHaveLength(2)
  })

  it('runs migration when no BADGE_MIGRATE_SECRET is configured (open endpoint)', async () => {
    delete process.env.BADGE_MIGRATE_SECRET
    vi.mocked(createClient).mockResolvedValue(makeSupabaseMock() as never)
    const res = await POST(makeRequest())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.message).toContain('Migration complete')
  })

  it('returns 500 when profiles query fails', async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeSupabaseMock({ profilesError: true }) as never,
    )
    const res = await POST(makeRequest())
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toBe('Failed to fetch profiles')
  })

  it('returns results array with userId and awarded count per user', async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabaseMock() as never)
    const res = await POST(makeRequest())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(Array.isArray(body.results)).toBe(true)
    for (const r of body.results) {
      expect(r).toHaveProperty('userId')
      expect(r).toHaveProperty('awarded')
      expect(typeof r.awarded).toBe('number')
    }
  })

  it('reports total awarded badges in message', async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabaseMock() as never)
    const res = await POST(makeRequest())
    const body = await res.json()
    const totalAwarded = body.results.reduce(
      (sum: number, r: { awarded: number }) => sum + r.awarded,
      0,
    )
    expect(body.message).toContain(String(totalAwarded))
  })
})
