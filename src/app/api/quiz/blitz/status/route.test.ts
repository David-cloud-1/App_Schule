import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET } from './route'

vi.mock('@/lib/supabase-server', () => ({
  createClient: vi.fn(),
}))

import { createClient } from '@/lib/supabase-server'

function makeSupabaseMock(user: unknown, existingRound: unknown = null, error: unknown = null) {
  const builder = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: existingRound, error }),
  }

  return {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user } }) },
    from: vi.fn().mockReturnValue(builder),
  }
}

describe('GET /api/quiz/blitz/status', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabaseMock(null) as never)
    const res = await GET()
    expect(res.status).toBe(401)
  })

  it('is available when no round exists for today', async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabaseMock({ id: 'user-1' }, null) as never)
    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.available).toBe(true)
    expect(body.next_available_at).toBeNull()
  })

  it('is unavailable with a next_available_at when already played today', async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeSupabaseMock({ id: 'user-1' }, { id: 'round-1' }) as never,
    )
    const res = await GET()
    const body = await res.json()
    expect(body.available).toBe(false)
    expect(typeof body.next_available_at).toBe('string')
    expect(new Date(body.next_available_at).getTime()).toBeGreaterThan(Date.now())
  })

  it('returns 500 on DB error', async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeSupabaseMock({ id: 'user-1' }, null, { message: 'DB error' }) as never,
    )
    const res = await GET()
    expect(res.status).toBe(500)
  })
})
