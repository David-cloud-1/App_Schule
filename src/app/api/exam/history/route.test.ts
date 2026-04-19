import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET } from './route'

vi.mock('@/lib/supabase-server', () => ({ createClient: vi.fn() }))
import { createClient } from '@/lib/supabase-server'

const USER_ID = '550e8400-e29b-41d4-a716-446655440000'

function makeSupabaseMock({
  user = { id: USER_ID },
  sessions = [] as unknown[],
  error = null as unknown,
} = {}) {
  return {
    auth: { getUser: () => Promise.resolve({ data: { user } }) },
    from: () => ({
      select: () => ({
        eq: () => ({
          neq: () => ({
            order: () => ({
              limit: () => Promise.resolve({ data: sessions, error }),
            }),
          }),
        }),
      }),
    }),
  }
}

beforeEach(() => vi.clearAllMocks())

describe('GET /api/exam/history', () => {
  it('returns session list for authenticated user', async () => {
    const sessions = [{ id: 'sess-1', status: 'completed', parts_selected: [2], started_at: new Date().toISOString(), ended_at: null, results_json: {} }]
    vi.mocked(createClient).mockResolvedValue(makeSupabaseMock({ sessions }) as never)
    const res = await GET()
    const data = await res.json()
    expect(res.status).toBe(200)
    expect(data.sessions).toHaveLength(1)
  })

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabaseMock({ user: null }) as never)
    const res = await GET()
    expect(res.status).toBe(401)
  })

  it('returns 500 on DB error', async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabaseMock({ error: new Error('DB error') }) as never)
    const res = await GET()
    expect(res.status).toBe(500)
  })
})
