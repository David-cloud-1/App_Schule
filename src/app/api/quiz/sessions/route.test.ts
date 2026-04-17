import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from './route'
import { NextRequest } from 'next/server'

vi.mock('@/lib/supabase-server', () => ({
  createClient: vi.fn(),
}))

import { createClient } from '@/lib/supabase-server'

// Proper v4 UUIDs
const Q1 = '550e8400-e29b-41d4-a716-446655440001'
const Q2 = '550e8400-e29b-41d4-a716-446655440002'
const A1 = '660e8400-e29b-41d4-a716-446655440001'
const A2 = '660e8400-e29b-41d4-a716-446655440002'
const SUBJECT_ID = '770e8400-e29b-41d4-a716-446655440001'

/** Same logic as the route — offset days by UTC ms, format in Berlin tz. */
function getBerlinDate(offsetDays = 0): string {
  const date = new Date(Date.now() + offsetDays * 86_400_000)
  return new Intl.DateTimeFormat('sv', { timeZone: 'Europe/Berlin' }).format(date)
}

const VALID_ANSWERS = [
  { question_id: Q1, selected_option_id: A1, is_correct: true },
  { question_id: Q2, selected_option_id: A2, is_correct: false },
]

const ALL_CORRECT = [
  { question_id: Q1, selected_option_id: A1, is_correct: true },
  { question_id: Q2, selected_option_id: A2, is_correct: true },
]

function makeRequest(body: unknown): NextRequest {
  return { json: () => Promise.resolve(body) } as unknown as NextRequest
}

function makeInvalidJsonRequest(): NextRequest {
  return { json: () => Promise.reject(new SyntaxError('Unexpected token')) } as unknown as NextRequest
}

interface MockOptions {
  profile?: {
    total_xp?: number
    current_streak?: number
    longest_streak?: number
    last_session_date?: string | null
  } | null
  sessionData?: unknown
  sessionError?: unknown
  answersError?: unknown
  profileUpdateError?: unknown
}

function makeSupabaseMock(user: unknown, opts: MockOptions = {}) {
  const {
    profile = { total_xp: 0, current_streak: 0, longest_streak: 0, last_session_date: null },
    sessionData = { id: 'sess-uuid-1' },
    sessionError = null,
    answersError = null,
    profileUpdateError = null,
  } = opts

  // profiles SELECT builder
  const profileSelectBuilder = {
    select: vi.fn().mockReturnThis(),
    eq:     vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: profile, error: null }),
  }

  // profiles UPDATE builder
  const profileUpdateBuilder = {
    update: vi.fn().mockReturnThis(),
    eq:     vi.fn().mockResolvedValue({ error: profileUpdateError }),
  }

  // quiz_sessions INSERT builder
  const sessionBuilder = {
    insert: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: sessionData, error: sessionError }),
  }

  // quiz_answers INSERT builder
  const answersBuilder = {
    insert: vi.fn().mockResolvedValue({ error: answersError }),
  }

  let profileCallCount = 0

  return {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user } }) },
    from: vi.fn().mockImplementation((table: string) => {
      if (table === 'profiles') {
        profileCallCount++
        // First call is SELECT, second call is UPDATE
        return profileCallCount === 1 ? profileSelectBuilder : profileUpdateBuilder
      }
      if (table === 'quiz_sessions') return sessionBuilder
      return answersBuilder // quiz_answers
    }),
  }
}

describe('POST /api/quiz/sessions', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabaseMock(null) as never)
    const res = await POST(makeRequest({ answers: VALID_ANSWERS }))
    expect(res.status).toBe(401)
  })

  it('saves session and returns enriched summary for authenticated user', async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabaseMock({ id: 'user-1' }) as never)
    const res = await POST(makeRequest({ answers: VALID_ANSWERS }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.session_id).toBe('sess-uuid-1')
    expect(body.score).toBe(1)
    expect(body.total).toBe(2)
    // 1 correct × 10 XP = 10 XP
    expect(body.xp_earned).toBe(10)
    expect(body.new_total_xp).toBe(10)
    expect(body.new_streak).toBe(1)
    expect(body).toHaveProperty('leveled_up')
    expect(body).toHaveProperty('old_level')
    expect(body).toHaveProperty('new_level')
  })

  it('awards 10 XP per correct answer', async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabaseMock({ id: 'user-1' }) as never)
    const res = await POST(makeRequest({ answers: ALL_CORRECT }))
    const body = await res.json()
    // 2 correct × 10 XP
    expect(body.xp_earned).toBe(20)
  })

  it('awards streak bonus (+5 per correct) when streak reaches 7', async () => {
    // Streak is 6, last session was yesterday → new streak = 7 → bonus applies
    const yStr = getBerlinDate(-1)

    vi.mocked(createClient).mockResolvedValue(
      makeSupabaseMock({ id: 'user-1' }, {
        profile: { total_xp: 0, current_streak: 6, longest_streak: 6, last_session_date: yStr },
      }) as never,
    )
    const res = await POST(makeRequest({ answers: ALL_CORRECT }))
    const body = await res.json()
    expect(body.new_streak).toBe(7)
    // 2 correct × (10 + 5) = 30 XP
    expect(body.xp_earned).toBe(30)
  })

  it('does not increment streak when playing twice on same day', async () => {
    const today = getBerlinDate(0)
    vi.mocked(createClient).mockResolvedValue(
      makeSupabaseMock({ id: 'user-1' }, {
        profile: { total_xp: 50, current_streak: 3, longest_streak: 5, last_session_date: today },
      }) as never,
    )
    const res = await POST(makeRequest({ answers: VALID_ANSWERS }))
    const body = await res.json()
    expect(body.new_streak).toBe(3) // unchanged
  })

  it('resets streak to 1 when a day was skipped', async () => {
    // last_session_date is 2 days ago (not yesterday)
    const oldDate = getBerlinDate(-2)

    vi.mocked(createClient).mockResolvedValue(
      makeSupabaseMock({ id: 'user-1' }, {
        profile: { total_xp: 100, current_streak: 5, longest_streak: 10, last_session_date: oldDate },
      }) as never,
    )
    const res = await POST(makeRequest({ answers: VALID_ANSWERS }))
    const body = await res.json()
    expect(body.new_streak).toBe(1) // reset
  })

  it('sets streak to 1 on very first session (null last_session_date)', async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeSupabaseMock({ id: 'user-1' }, {
        profile: { total_xp: 0, current_streak: 0, longest_streak: 0, last_session_date: null },
      }) as never,
    )
    const res = await POST(makeRequest({ answers: VALID_ANSWERS }))
    const body = await res.json()
    expect(body.new_streak).toBe(1)
  })

  it('detects level-up correctly', async () => {
    // 90 XP → Level 1; adding 10 XP → 100 XP = Level 2
    vi.mocked(createClient).mockResolvedValue(
      makeSupabaseMock({ id: 'user-1' }, {
        profile: { total_xp: 90, current_streak: 0, longest_streak: 0, last_session_date: null },
      }) as never,
    )
    // 1 correct answer × 10 XP = 10 XP → total 100 XP = Level 2
    const res = await POST(makeRequest({ answers: [
      { question_id: Q1, selected_option_id: A1, is_correct: true },
    ]}))
    const body = await res.json()
    expect(body.leveled_up).toBe(true)
    expect(body.old_level).toBe(1)
    expect(body.new_level).toBe(2)
  })

  it('returns 400 for missing answers field', async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabaseMock({ id: 'user-1' }) as never)
    const res = await POST(makeRequest({}))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('Invalid request body')
  })

  it('returns 400 for empty answers array', async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabaseMock({ id: 'user-1' }) as never)
    const res = await POST(makeRequest({ answers: [] }))
    expect(res.status).toBe(400)
  })

  it('returns 400 for invalid UUID in question_id', async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabaseMock({ id: 'user-1' }) as never)
    const res = await POST(makeRequest({
      answers: [{ question_id: 'not-a-uuid', selected_option_id: A1, is_correct: true }],
    }))
    expect(res.status).toBe(400)
  })

  it('returns 400 for invalid JSON body', async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabaseMock({ id: 'user-1' }) as never)
    const res = await POST(makeInvalidJsonRequest())
    expect(res.status).toBe(400)
  })

  it('returns 500 when session DB insert fails', async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeSupabaseMock({ id: 'user-1' }, { sessionData: null, sessionError: { message: 'DB error' } }) as never,
    )
    const res = await POST(makeRequest({ answers: VALID_ANSWERS }))
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toBe('Failed to save session')
  })

  it('still returns 200 when answers insert fails (non-fatal)', async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeSupabaseMock({ id: 'user-1' }, { answersError: { message: 'answers error' } }) as never,
    )
    const res = await POST(makeRequest({ answers: VALID_ANSWERS }))
    expect(res.status).toBe(200)
  })

  it('accepts optional subject_id', async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabaseMock({ id: 'user-1' }) as never)
    const res = await POST(makeRequest({ subject_id: SUBJECT_ID, answers: VALID_ANSWERS }))
    expect(res.status).toBe(200)
  })
})
