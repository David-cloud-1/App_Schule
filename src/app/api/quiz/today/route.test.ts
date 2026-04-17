import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET } from './route'

vi.mock('@/lib/supabase-server', () => ({
  createClient: vi.fn(),
}))

import { createClient } from '@/lib/supabase-server'

function makeSupabaseMock(
  user: unknown,
  data: unknown = [],
  error: unknown = null,
) {
  const answersBuilder = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    gte: vi.fn().mockResolvedValue({ data, error }),
  }
  return {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user } }) },
    from: vi.fn().mockReturnValue(answersBuilder),
  }
}

describe('GET /api/quiz/today', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabaseMock(null) as never)
    const res = await GET()
    expect(res.status).toBe(401)
  })

  it('returns empty array when no answers today', async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabaseMock({ id: 'user-1' }, []) as never)
    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.answered_question_ids).toEqual([])
  })

  it('returns deduplicated question IDs answered today', async () => {
    const rows = [
      { question_id: 'q-uuid-1' },
      { question_id: 'q-uuid-2' },
      { question_id: 'q-uuid-1' }, // duplicate — should be deduped
    ]
    vi.mocked(createClient).mockResolvedValue(makeSupabaseMock({ id: 'user-1' }, rows) as never)
    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.answered_question_ids).toHaveLength(2)
    expect(body.answered_question_ids).toContain('q-uuid-1')
    expect(body.answered_question_ids).toContain('q-uuid-2')
  })

  it('returns 500 on database error', async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeSupabaseMock({ id: 'user-1' }, null, { message: 'DB error' }) as never,
    )
    const res = await GET()
    expect(res.status).toBe(500)
  })
})
