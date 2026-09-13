import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from './route'
import { NextRequest } from 'next/server'

vi.mock('@/lib/supabase-server', () => ({
  createClient: vi.fn(),
}))

import { createClient } from '@/lib/supabase-server'

const TOKEN = '550e8400-e29b-41d4-a716-446655440099'
const Q1 = '550e8400-e29b-41d4-a716-446655440001'
const Q2 = '550e8400-e29b-41d4-a716-446655440002'
const A1 = '660e8400-e29b-41d4-a716-446655440001'
const A2 = '660e8400-e29b-41d4-a716-446655440002'

function makeRequest(body: unknown): NextRequest {
  return { json: () => Promise.resolve(body) } as unknown as NextRequest
}

const VALID_ANSWERS = [
  { question_id: Q1, selected_option_id: A1, is_correct: true },
  { question_id: Q2, selected_option_id: A2, is_correct: false },
]

interface MockOpts {
  startRow?: { id: string; created_at: string; consumed: boolean } | null
  startFetchError?: unknown
  roundInsertError?: unknown
  profile?: {
    total_xp?: number
    current_streak?: number
    longest_streak?: number
    last_session_date?: string | null
    coin_balance?: number
  } | null
}

function makeSupabaseMock(user: unknown, opts: MockOpts = {}) {
  const {
    startRow = { id: 'start-1', created_at: new Date().toISOString(), consumed: false },
    startFetchError = null,
    roundInsertError = null,
    profile = { total_xp: 0, current_streak: 0, longest_streak: 0, last_session_date: null, coin_balance: 0 },
  } = opts

  let blitzStartsCallCount = 0
  const blitzStartsSelectBuilder = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: startRow, error: startFetchError }),
  }
  const blitzStartsUpdateBuilder = {
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockResolvedValue({ error: null }),
  }

  const blitzRoundsBuilder = {
    insert: vi.fn().mockResolvedValue({ error: roundInsertError }),
  }

  let profileCallCount = 0
  const profileSelectBuilder = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: profile, error: null }),
  }
  const profileUpdateBuilder = {
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockResolvedValue({ error: null }),
  }

  return {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user } }) },
    from: vi.fn().mockImplementation((table: string) => {
      if (table === 'blitz_starts') {
        blitzStartsCallCount++
        return blitzStartsCallCount === 1 ? blitzStartsSelectBuilder : blitzStartsUpdateBuilder
      }
      if (table === 'blitz_rounds') return blitzRoundsBuilder
      profileCallCount++
      return profileCallCount === 1 ? profileSelectBuilder : profileUpdateBuilder
    }),
  }
}

describe('POST /api/quiz/blitz/finish', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabaseMock(null) as never)
    const res = await POST(makeRequest({ token: TOKEN, answers: VALID_ANSWERS }))
    expect(res.status).toBe(401)
  })

  it('returns 400 for an invalid token format', async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabaseMock({ id: 'user-1' }) as never)
    const res = await POST(makeRequest({ token: 'not-a-uuid', answers: VALID_ANSWERS }))
    expect(res.status).toBe(400)
  })

  it('returns 400 for more than 60 answers (plausibility cap)', async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabaseMock({ id: 'user-1' }) as never)
    const tooMany = Array.from({ length: 61 }, () => VALID_ANSWERS[0])
    const res = await POST(makeRequest({ token: TOKEN, answers: tooMany }))
    expect(res.status).toBe(400)
  })

  it('returns 400 when the start token is unknown', async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeSupabaseMock({ id: 'user-1' }, { startRow: null }) as never,
    )
    const res = await POST(makeRequest({ token: TOKEN, answers: VALID_ANSWERS }))
    expect(res.status).toBe(400)
  })

  it('returns 400 when the start token was already consumed', async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeSupabaseMock(
        { id: 'user-1' },
        { startRow: { id: 'start-1', created_at: new Date().toISOString(), consumed: true } },
      ) as never,
    )
    const res = await POST(makeRequest({ token: TOKEN, answers: VALID_ANSWERS }))
    expect(res.status).toBe(400)
  })

  it('returns 400 when the round is older than the plausible max duration', async () => {
    const oldStart = new Date(Date.now() - 100_000).toISOString() // 100s ago > 90s cap
    vi.mocked(createClient).mockResolvedValue(
      makeSupabaseMock(
        { id: 'user-1' },
        { startRow: { id: 'start-1', created_at: oldStart, consumed: false } },
      ) as never,
    )
    const res = await POST(makeRequest({ token: TOKEN, answers: VALID_ANSWERS }))
    expect(res.status).toBe(400)
  })

  it('returns 409 without crediting when the daily round is already claimed (race)', async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeSupabaseMock(
        { id: 'user-1' },
        { roundInsertError: { code: '23505', message: 'duplicate key' } },
      ) as never,
    )
    const res = await POST(makeRequest({ token: TOKEN, answers: VALID_ANSWERS }))
    expect(res.status).toBe(409)
  })

  it('computes coins (3/correct + 10 bonus) and half XP (5/correct) on success', async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabaseMock({ id: 'user-1' }) as never)
    const res = await POST(makeRequest({ token: TOKEN, answers: VALID_ANSWERS }))
    expect(res.status).toBe(200)
    const body = await res.json()
    // 1 correct of 2 answers
    expect(body.correct_count).toBe(1)
    expect(body.coins_earned).toBe(1 * 3 + 10)
    expect(body.xp_earned).toBe(1 * 5)
    expect(body.new_coin_balance).toBe(13)
    expect(body.new_total_xp).toBe(5)
    expect(body.new_streak).toBe(1)
  })

  it('increments the streak the same way as a normal session', async () => {
    const yesterday = new Intl.DateTimeFormat('sv', { timeZone: 'Europe/Berlin' }).format(
      new Date(Date.now() - 86_400_000),
    )
    vi.mocked(createClient).mockResolvedValue(
      makeSupabaseMock(
        { id: 'user-1' },
        { profile: { total_xp: 0, current_streak: 4, longest_streak: 4, last_session_date: yesterday, coin_balance: 0 } },
      ) as never,
    )
    const res = await POST(makeRequest({ token: TOKEN, answers: VALID_ANSWERS }))
    const body = await res.json()
    expect(body.new_streak).toBe(5)
  })
})
