import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET } from './route'
import { NextRequest } from 'next/server'

vi.mock('@/lib/supabase-server', () => ({
  createClient: vi.fn(),
}))

import { createClient } from '@/lib/supabase-server'

const mockQuestion = {
  id: 'q-uuid-1',
  question_text: 'Was bedeutet FIFO?',
  explanation: 'First In First Out',
  difficulty: 'leicht',
  answer_options: [
    { id: 'a1', option_text: 'Richtige Antwort', is_correct: true,  display_order: 1 },
    { id: 'a2', option_text: 'Falsch A',         is_correct: false, display_order: 2 },
    { id: 'a3', option_text: 'Falsch B',         is_correct: false, display_order: 3 },
    { id: 'a4', option_text: 'Falsch C',         is_correct: false, display_order: 4 },
  ],
  question_subjects: [
    { subjects: { id: 'subj-lop', code: 'LOP' } },
  ],
}

function makeRequest(params: Record<string, string> = {}) {
  const url = new URL('http://localhost/api/questions')
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  return new NextRequest(url)
}

function makeSupabaseMock(
  user: unknown,
  data: unknown,
  error: unknown = null,
  subjectId = 'subj-lop',
  questionLinks = [{ question_id: 'q-uuid-1' }]
) {
  // Main questions query builder (supports .in() chaining)
  const questionsBuilder = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    range: vi.fn().mockResolvedValue({ data, error }),
  }
  // Subject lookup: .select().eq().single() → resolves immediately
  const subjectBuilder = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: { id: subjectId }, error: null }),
  }
  // question_subjects lookup: .select().eq() → resolves immediately
  const linksBuilder = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockResolvedValue({ data: questionLinks, error: null }),
  }
  return {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user } }) },
    from: vi.fn().mockImplementation((table: string) => {
      if (table === 'subjects') return subjectBuilder
      if (table === 'question_subjects') return linksBuilder
      return questionsBuilder
    }),
  }
}

describe('GET /api/questions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when user is not authenticated', async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeSupabaseMock(null, null) as never
    )

    const response = await GET(makeRequest())
    expect(response.status).toBe(401)
    const body = await response.json()
    expect(body.error).toBe('Unauthorized')
  })

  it('returns questions for authenticated user', async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeSupabaseMock({ id: 'user-1' }, [mockQuestion]) as never
    )

    const response = await GET(makeRequest())
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.questions).toHaveLength(1)
    expect(body.questions[0].question_text).toBe('Was bedeutet FIFO?')
  })

  it('filters by subject code', async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeSupabaseMock({ id: 'user-1' }, [mockQuestion]) as never
    )

    const response = await GET(makeRequest({ subject: 'LOP' }))
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.questions).toHaveLength(1)
  })

  it('returns 400 for invalid difficulty value', async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeSupabaseMock({ id: 'user-1' }, []) as never
    )

    const response = await GET(makeRequest({ difficulty: 'ultra-hard' }))
    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.error).toBe('Invalid query parameters')
  })

  it('returns 400 for limit out of range', async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeSupabaseMock({ id: 'user-1' }, []) as never
    )

    const response = await GET(makeRequest({ limit: '200' }))
    expect(response.status).toBe(400)
  })

  it('returns 500 on database error', async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeSupabaseMock({ id: 'user-1' }, null, { message: 'DB error' }) as never
    )

    const response = await GET(makeRequest())
    expect(response.status).toBe(500)
    const body = await response.json()
    expect(body.error).toBe('Failed to fetch questions')
  })
})
