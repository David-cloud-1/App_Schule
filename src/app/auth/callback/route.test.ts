import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET } from './route'

// Mock the supabase-server module
vi.mock('@/lib/supabase-server', () => ({
  createClient: vi.fn(),
}))

import { createClient } from '@/lib/supabase-server'

const mockCreateClient = vi.mocked(createClient)

function buildRequest(url: string) {
  return new Request(url)
}

describe('GET /auth/callback', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('exchanges code for session and redirects to / by default', async () => {
    mockCreateClient.mockResolvedValue({
      auth: {
        exchangeCodeForSession: vi.fn().mockResolvedValue({ error: null }),
      },
    } as never)

    const req = buildRequest('http://localhost:3000/auth/callback?code=valid-code')
    const res = await GET(req)

    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toBe('http://localhost:3000/')
  })

  it('respects the ?next= param for post-auth redirect', async () => {
    mockCreateClient.mockResolvedValue({
      auth: {
        exchangeCodeForSession: vi.fn().mockResolvedValue({ error: null }),
      },
    } as never)

    const req = buildRequest(
      'http://localhost:3000/auth/callback?code=valid-code&next=/dashboard'
    )
    const res = await GET(req)

    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toBe('http://localhost:3000/dashboard')
  })

  it('redirects to /login with error when no code is provided', async () => {
    const req = buildRequest('http://localhost:3000/auth/callback')
    const res = await GET(req)

    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toBe(
      'http://localhost:3000/login?error=auth_callback_failed'
    )
  })

  it('redirects to /login with error when code exchange fails', async () => {
    mockCreateClient.mockResolvedValue({
      auth: {
        exchangeCodeForSession: vi.fn().mockResolvedValue({
          error: { message: 'invalid token' },
        }),
      },
    } as never)

    const req = buildRequest('http://localhost:3000/auth/callback?code=bad-code')
    const res = await GET(req)

    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toBe(
      'http://localhost:3000/login?error=auth_callback_failed'
    )
  })
})
