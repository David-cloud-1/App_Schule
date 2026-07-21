import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET } from './route'
import { NextRequest } from 'next/server'

vi.mock('@/lib/supabase-server', () => ({
  createClient: vi.fn(),
}))

import { createClient } from '@/lib/supabase-server'

const USER_ID = 'user-uuid-0001'
const Q1 = '550e8400-e29b-41d4-a716-446655440001'
const Q2 = '550e8400-e29b-41d4-a716-446655440002'
const SUBJECT_ID = '770e8400-e29b-41d4-a716-446655440001'

function makeRequest(params: Record<string, string> = {}): NextRequest {
  const url = new URL('http://localhost/api/quiz/weak')
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
  return { url: url.toString() } as unknown as NextRequest
}

/** Answers that make Q1 weak: 3 wrong out of 4 = 75% error rate. */
const WEAK_ANSWERS_Q1 = [
  { question_id: Q1, is_correct: false },
  { question_id: Q1, is_correct: false },
  { question_id: Q1, is_correct: false },
  { question_id: Q1, is_correct: true },
]

/** Answers that make Q2 strong: 3 correct out of 4 = 25% error rate. */
const STRONG_ANSWERS_Q2 = [
  { question_id: Q2, is_correct: true },
  { question_id: Q2, is_correct: true },
  { question_id: Q2, is_correct: true },
  { question_id: Q2, is_correct: false },
]

const SAMPLE_QUESTIONS = [
  {
    id: Q1,
    question_text: 'Was ist ein Frachtbrief?',
    explanation: null,
    difficulty: 'medium',
    answer_options: [{ id: 'opt-1', option_text: 'A', is_correct: true, display_order: 1 }],
  },
]

function makeSupabaseMock(
  user: unknown,
  answers: unknown[],
  questions: unknown[] = SAMPLE_QUESTIONS,
  subjectMatches: unknown[] = [],
  answersError: unknown = null,
  questionsError: unknown = null,
) {
  // Answers are fetched page-by-page via .range(); a short page ends the loop.
  const answersBuilder = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    range: vi.fn().mockResolvedValue({ data: answers, error: answersError }),
  }

  const questionsBuilder = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockResolvedValue({ data: questions, error: questionsError }),
  }

  const subjectMatchBuilder = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockResolvedValue({ data: subjectMatches, error: null }),
  }

  return {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user } }) },
    from: vi.fn().mockImplementation((table: string) => {
      if (table === 'quiz_answers') return answersBuilder
      if (table === 'questions') return questionsBuilder
      if (table === 'question_subjects') return subjectMatchBuilder
      return {}
    }),
  }
}

describe('GET /api/quiz/weak', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabaseMock(null, []) as never)
    const res = await GET(makeRequest())
    expect(res.status).toBe(401)
  })

  it('returns 400 for invalid subject_id', async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabaseMock({ id: USER_ID }, []) as never)
    const res = await GET(makeRequest({ subject_id: 'not-a-uuid' }))
    expect(res.status).toBe(400)
  })

  it('returns empty result when user has no answers', async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabaseMock({ id: USER_ID }, []) as never)
    const res = await GET(makeRequest())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.count).toBe(0)
    expect(body.questions).toEqual([])
  })

  it('returns empty result when no questions meet the weak threshold', async () => {
    // Q2 has a 25% error rate (≤ 50% threshold), so nothing qualifies as weak.
    const answers = [...STRONG_ANSWERS_Q2]
    vi.mocked(createClient).mockResolvedValue(makeSupabaseMock({ id: USER_ID }, answers) as never)
    const res = await GET(makeRequest())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.count).toBe(0)
    expect(body.questions).toEqual([])
  })

  it('returns questions with >50% error rate and ≥3 attempts', async () => {
    const answers = [...WEAK_ANSWERS_Q1, ...STRONG_ANSWERS_Q2]
    vi.mocked(createClient).mockResolvedValue(
      makeSupabaseMock({ id: USER_ID }, answers, SAMPLE_QUESTIONS) as never,
    )
    const res = await GET(makeRequest())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.count).toBe(1)
    expect(body.questions).toHaveLength(1)
    expect(body.questions[0].id).toBe(Q1)
  })

  it('returns count_only without fetching full question data', async () => {
    const answers = [...WEAK_ANSWERS_Q1]
    const mock = makeSupabaseMock({ id: USER_ID }, answers)
    vi.mocked(createClient).mockResolvedValue(mock as never)
    const res = await GET(makeRequest({ count_only: 'true' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.count).toBe(1)
    expect(body.questions).toBeUndefined()
    // questions table should NOT have been queried
    expect(mock.from).not.toHaveBeenCalledWith('questions')
  })

  it('returns subject-filtered count when count_only=true with subject_id', async () => {
    const answers = [...WEAK_ANSWERS_Q1]
    const mock = makeSupabaseMock(
      { id: USER_ID },
      answers,
      [],
      [{ question_id: Q1 }], // Q1 belongs to the subject
    )
    vi.mocked(createClient).mockResolvedValue(mock as never)
    const res = await GET(makeRequest({ count_only: 'true', subject_id: SUBJECT_ID }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.count).toBe(1)
  })

  it('returns 500 when answers fetch fails', async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeSupabaseMock({ id: USER_ID }, [], [], [], new Error('db error')) as never,
    )
    const res = await GET(makeRequest())
    expect(res.status).toBe(500)
  })
})
