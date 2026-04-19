import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET } from './route'
import { NextRequest } from 'next/server'

vi.mock('@/lib/supabase-server', () => ({
  createClient: vi.fn(),
  createServiceClient: vi.fn(),
}))

import { createClient, createServiceClient } from '@/lib/supabase-server'

const mockProfiles = [
  {
    id: 'user-1',
    display_name: 'Alice',
    role: 'student',
    total_xp: 500,
    current_streak: 5,
    last_session_date: '2026-04-19',
  },
  {
    id: 'admin-uuid',
    display_name: 'Admin',
    role: 'admin',
    total_xp: 100,
    current_streak: 1,
    last_session_date: '2026-04-19',
  },
]

const mockAuthUsers = {
  users: [
    { id: 'user-1', email: 'alice@test.com' },
    { id: 'admin-uuid', email: 'admin@test.com' },
  ],
}

function makeAdminClient() {
  const profileBuilder = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: { role: 'admin' }, error: null }),
  }
  return {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'admin-uuid' } } }) },
    from: vi.fn().mockReturnValue(profileBuilder),
  }
}

function makeServiceClient(profilesData = mockProfiles, profilesError: unknown = null) {
  const profilesBuilder = {
    select: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue({ data: profilesData, error: profilesError }),
  }
  return {
    from: vi.fn().mockReturnValue(profilesBuilder),
    auth: {
      admin: {
        listUsers: vi.fn().mockResolvedValue({ data: mockAuthUsers, error: null }),
      },
    },
  }
}

function makeUnauthClient() {
  return { auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) }, from: vi.fn() }
}

function makeNonAdminClient() {
  const pb = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: { role: 'student' }, error: null }),
  }
  return {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u' } } }) },
    from: vi.fn().mockReturnValue(pb),
  }
}

describe('GET /api/admin/users', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when not authenticated', async () => {
    vi.mocked(createClient).mockResolvedValue(makeUnauthClient() as never)
    const url = new URL('http://localhost/api/admin/users')
    const res = await GET()
    expect(res.status).toBe(401)
  })

  it('returns 403 when not admin', async () => {
    vi.mocked(createClient).mockResolvedValue(makeNonAdminClient() as never)
    const res = await GET()
    expect(res.status).toBe(403)
  })

  it('returns merged user list with banned status', async () => {
    vi.mocked(createClient).mockResolvedValue(makeAdminClient() as never)
    vi.mocked(createServiceClient).mockReturnValue(makeServiceClient() as never)

    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.users).toHaveLength(2)
    expect(body.users[0].email).toBe('alice@test.com')
    expect(body.users[0].banned).toBe(false)
  })

  it('returns 500 when profiles query fails', async () => {
    vi.mocked(createClient).mockResolvedValue(makeAdminClient() as never)
    vi.mocked(createServiceClient).mockReturnValue(
      makeServiceClient([], { message: 'DB error' }) as never
    )
    const res = await GET()
    expect(res.status).toBe(500)
  })
})
