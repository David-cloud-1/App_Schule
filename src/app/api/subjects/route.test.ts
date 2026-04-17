import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET } from './route'

// Mock the Supabase server client
vi.mock('@/lib/supabase-server', () => ({
  createClient: vi.fn(),
}))

import { createClient } from '@/lib/supabase-server'

const mockSubjectsData = [
  {
    id: 'uuid-bgp',
    code: 'BGP',
    name: 'Betriebliche und gesamtwirtschaftliche Prozesse',
    color: '#1CB0F6',
    icon_name: 'BarChart3',
    question_subjects: [
      { question_id: 'q1', questions: { id: 'q1', is_active: true } },
      { question_id: 'q2', questions: { id: 'q2', is_active: false } },
      { question_id: 'q3', questions: { id: 'q3', is_active: true } },
    ],
  },
]

function makeSupabaseMock(user: unknown, data: unknown, error: unknown = null) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user } }),
    },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data, error }),
    }),
  }
}

describe('GET /api/subjects', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when user is not authenticated', async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeSupabaseMock(null, null) as never
    )

    const response = await GET()
    expect(response.status).toBe(401)
    const body = await response.json()
    expect(body.error).toBe('Unauthorized')
  })

  it('returns subjects with correct active_question_count', async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeSupabaseMock({ id: 'user-1' }, mockSubjectsData) as never
    )

    const response = await GET()
    expect(response.status).toBe(200)
    const body = await response.json()

    expect(body.subjects).toHaveLength(1)
    expect(body.subjects[0].code).toBe('BGP')
    // 2 active out of 3
    expect(body.subjects[0].active_question_count).toBe(2)
  })

  it('returns 500 on database error', async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeSupabaseMock(
        { id: 'user-1' },
        null,
        { message: 'DB error' }
      ) as never
    )

    const response = await GET()
    expect(response.status).toBe(500)
    const body = await response.json()
    expect(body.error).toBe('Failed to fetch subjects')
  })
})
