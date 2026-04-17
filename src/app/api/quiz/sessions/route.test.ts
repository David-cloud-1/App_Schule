import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from './route'
import { NextRequest } from 'next/server'

vi.mock('@/lib/supabase-server', () => ({
  createClient: vi.fn(),
}))

import { createClient } from '@/lib/supabase-server'

// Proper v4 UUIDs (Zod v4 requires version bits [1-8] and variant bits [89ab])
const Q1 = '550e8400-e29b-41d4-a716-446655440001'
const Q2 = '550e8400-e29b-41d4-a716-446655440002'
const A1 = '660e8400-e29b-41d4-a716-446655440001'
const A2 = '660e8400-e29b-41d4-a716-446655440002'
const SUBJECT_ID = '770e8400-e29b-41d4-a716-446655440001'

const VALID_ANSWERS = [
  { question_id: Q1, selected_option_id: A1, is_correct: true },
  { question_id: Q2, selected_option_id: A2, is_correct: false },
]

// NextRequest body parsing is unreliable in jsdom/Vitest.
// The route only reads `request.json()`, so we mock just that method.
function makeRequest(body: unknown): NextRequest {
  return { json: () => Promise.resolve(body) } as unknown as NextRequest
}

function makeInvalidJsonRequest(): NextRequest {
  return { json: () => Promise.reject(new SyntaxError('Unexpected token')) } as unknown as NextRequest
}

function makeSupabaseMock(
  user: unknown,
  sessionData: unknown = { id: 'sess-uuid-1' },
  sessionError: unknown = null,
  answersError: unknown = null,
) {
  const answersBuilder = {
    insert: vi.fn().mockResolvedValue({ error: answersError }),
  }
  const sessionBuilder = {
    insert: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: sessionData, error: sessionError }),
  }
  return {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user } }) },
    from: vi.fn().mockImplementation((table: string) => {
      if (table === 'quiz_sessions') return sessionBuilder
      return answersBuilder
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

  it('saves session and returns summary for authenticated user', async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabaseMock({ id: 'user-1' }) as never)
    const res = await POST(makeRequest({ answers: VALID_ANSWERS }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.session_id).toBe('sess-uuid-1')
    expect(body.score).toBe(1)   // 1 correct out of 2
    expect(body.total).toBe(2)
    expect(body.xp_earned).toBe(0)
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
      makeSupabaseMock({ id: 'user-1' }, null, { message: 'DB error' }) as never,
    )
    const res = await POST(makeRequest({ answers: VALID_ANSWERS }))
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toBe('Failed to save session')
  })

  it('still returns 200 when answers insert fails (non-fatal)', async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeSupabaseMock({ id: 'user-1' }, { id: 'sess-uuid-1' }, null, { message: 'answers error' }) as never,
    )
    const res = await POST(makeRequest({ answers: VALID_ANSWERS }))
    expect(res.status).toBe(200)
  })

  it('accepts optional subject_id', async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabaseMock({ id: 'user-1' }) as never)
    const res = await POST(makeRequest({
      subject_id: SUBJECT_ID,
      answers: VALID_ANSWERS,
    }))
    expect(res.status).toBe(200)
  })
})
