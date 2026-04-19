import { describe, it, expect, vi, beforeEach } from 'vitest'
import { PATCH } from './route'
import { NextRequest } from 'next/server'

vi.mock('@/lib/supabase-server', () => ({
  createClient: vi.fn(),
}))

import { createClient } from '@/lib/supabase-server'

const USER_ID = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'

function makeRequest(body: unknown): NextRequest {
  return { json: () => Promise.resolve(body) } as unknown as NextRequest
}

function makeSupabaseMock(user: unknown, updateError: unknown = null) {
  const profileBuilder = {
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockResolvedValue({ error: updateError }),
  }

  return {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user } }) },
    from: vi.fn().mockReturnValue(profileBuilder),
  }
}

describe('PATCH /api/profile/opt-out', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabaseMock(null) as never)
    const res = await PATCH(makeRequest({ leaderboard_opt_out: true }))
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error).toBe('Unauthorized')
  })

  it('sets leaderboard_opt_out to true', async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabaseMock({ id: USER_ID }) as never)
    const res = await PATCH(makeRequest({ leaderboard_opt_out: true }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.leaderboard_opt_out).toBe(true)
  })

  it('sets leaderboard_opt_out to false (opt back in)', async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabaseMock({ id: USER_ID }) as never)
    const res = await PATCH(makeRequest({ leaderboard_opt_out: false }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.leaderboard_opt_out).toBe(false)
  })

  it('coerces truthy values to boolean true', async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabaseMock({ id: USER_ID }) as never)
    const res = await PATCH(makeRequest({ leaderboard_opt_out: 1 }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.leaderboard_opt_out).toBe(true)
  })

  it('coerces missing field to false', async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabaseMock({ id: USER_ID }) as never)
    const res = await PATCH(makeRequest({}))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.leaderboard_opt_out).toBe(false)
  })

  it('returns 500 when DB update fails', async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeSupabaseMock({ id: USER_ID }, { message: 'DB error' }) as never,
    )
    const res = await PATCH(makeRequest({ leaderboard_opt_out: true }))
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toBe('DB error')
  })
})
