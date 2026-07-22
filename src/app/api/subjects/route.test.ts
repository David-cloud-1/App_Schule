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
  },
]

// Active question→subject links (inactive questions are already filtered out by
// the query's questions!inner(is_active) join, so only active ones appear here).
const mockLinks = [
  { subject_id: 'uuid-bgp', question_id: 'q1' },
  { subject_id: 'uuid-bgp', question_id: 'q3' },
]

function makeSupabaseMock(
  user: unknown,
  subjectsData: unknown,
  links: unknown[] = mockLinks,
  subjectsError: unknown = null,
) {
  const subjectsBuilder = {
    select: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue({ data: subjectsData, error: subjectsError }),
  }

  // question_subjects is paginated: select→eq→order→order→range.
  const linksBuilder = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    range: vi.fn().mockResolvedValue({ data: links, error: null }),
  }

  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user } }),
    },
    from: vi.fn().mockImplementation((table: string) => {
      if (table === 'subjects') return subjectsBuilder
      if (table === 'question_subjects') return linksBuilder
      return {}
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
    // 2 active links for BGP
    expect(body.subjects[0].active_question_count).toBe(2)
  })

  it('returns 500 on database error', async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeSupabaseMock({ id: 'user-1' }, null, mockLinks, { message: 'DB error' }) as never
    )

    const response = await GET()
    expect(response.status).toBe(500)
    const body = await response.json()
    expect(body.error).toBe('Failed to fetch subjects')
  })
})
