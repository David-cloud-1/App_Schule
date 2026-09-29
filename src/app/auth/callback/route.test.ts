import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET } from './route'

// Mock the supabase-server module
vi.mock('@/lib/supabase-server', () => ({
  createClient: vi.fn(),
}))

vi.mock('@/lib/departments-server', () => ({
  assignDepartmentIfMissing: vi.fn(async () => 'dept-tour'),
}))

import { createClient } from '@/lib/supabase-server'
import { assignDepartmentIfMissing } from '@/lib/departments-server'

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

  it('ordnet ein neues Profil dem Bereich der Adresse zu (PROJ-23)', async () => {
    mockCreateClient.mockResolvedValue({
      auth: {
        exchangeCodeForSession: vi.fn().mockResolvedValue({ data: { user: { id: 'new-user' } }, error: null }),
      },
    } as never)

    const res = await GET(buildRequest('https://touristiklern.vercel.app/auth/callback?code=valid-code'))

    expect(res.status).toBe(307)
    expect(vi.mocked(assignDepartmentIfMissing)).toHaveBeenCalledWith('new-user', 'touristiklern.vercel.app')
  })

  it('lässt den Login nicht scheitern, wenn die Zuordnung fehlschlägt', async () => {
    vi.mocked(assignDepartmentIfMissing).mockRejectedValueOnce(new Error('db down'))
    mockCreateClient.mockResolvedValue({
      auth: {
        exchangeCodeForSession: vi.fn().mockResolvedValue({ data: { user: { id: 'u' } }, error: null }),
      },
    } as never)

    const res = await GET(buildRequest('https://spedilern.vercel.app/auth/callback?code=valid-code'))

    expect(res.headers.get('location')).toBe('https://spedilern.vercel.app/')
  })
})
