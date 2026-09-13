import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from './route'

vi.mock('@/lib/supabase-server', () => ({
  createClient: vi.fn(),
}))

import { createClient } from '@/lib/supabase-server'

const SAMPLE_QUESTIONS = [
  {
    id: 'q1',
    question_text: 'Frage 1?',
    explanation: null,
    difficulty: 'leicht',
    answer_options: [
      { id: 'a1', option_text: 'A', is_correct: true, display_order: 1 },
      { id: 'a2', option_text: 'B', is_correct: false, display_order: 2 },
    ],
  },
  {
    id: 'q2',
    question_text: 'Frage 2?',
    explanation: null,
    difficulty: 'mittel',
    answer_options: [
      { id: 'a3', option_text: 'C', is_correct: false, display_order: 1 },
      { id: 'a4', option_text: 'D', is_correct: true, display_order: 2 },
    ],
  },
]

interface MockOpts {
  existingRound?: unknown
  questions?: unknown
  questionsError?: unknown
  startRow?: unknown
  startError?: unknown
}

function makeSupabaseMock(user: unknown, opts: MockOpts = {}) {
  const {
    existingRound = null,
    questions = SAMPLE_QUESTIONS,
    questionsError = null,
    startRow = { token: 'tok-1' },
    startError = null,
  } = opts

  const roundsBuilder = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: existingRound, error: null }),
  }

  const questionsBuilder = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue({ data: questions, error: questionsError }),
  }

  const startsBuilder = {
    insert: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: startRow, error: startError }),
  }

  return {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user } }) },
    from: vi.fn().mockImplementation((table: string) => {
      if (table === 'blitz_rounds') return roundsBuilder
      if (table === 'questions') return questionsBuilder
      return startsBuilder
    }),
  }
}

describe('POST /api/quiz/blitz/start', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabaseMock(null) as never)
    const res = await POST()
    expect(res.status).toBe(401)
  })

  it('returns 409 when the daily round is already claimed', async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeSupabaseMock({ id: 'user-1' }, { existingRound: { id: 'round-1' } }) as never,
    )
    const res = await POST()
    expect(res.status).toBe(409)
  })

  it('returns a token and mixed questions when available', async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabaseMock({ id: 'user-1' }) as never)
    const res = await POST()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.token).toBe('tok-1')
    expect(Array.isArray(body.questions)).toBe(true)
    expect(body.questions.length).toBe(SAMPLE_QUESTIONS.length)
    // Each answer option keeps is_correct — the client needs it for instant feedback.
    expect(body.questions[0].answer_options[0]).toHaveProperty('is_correct')
  })

  it('returns 500 when the question fetch fails', async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeSupabaseMock({ id: 'user-1' }, { questionsError: { message: 'DB error' } }) as never,
    )
    const res = await POST()
    expect(res.status).toBe(500)
  })

  it('returns 500 when no active questions exist', async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeSupabaseMock({ id: 'user-1' }, { questions: [] }) as never,
    )
    const res = await POST()
    expect(res.status).toBe(500)
  })

  it('returns 500 when the start marker insert fails', async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeSupabaseMock({ id: 'user-1' }, { startRow: null, startError: { message: 'DB error' } }) as never,
    )
    const res = await POST()
    expect(res.status).toBe(500)
  })
})
