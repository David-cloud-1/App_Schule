import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET } from './route'
import { NextRequest } from 'next/server'

vi.mock('@/lib/supabase-server', () => ({
  createClient: vi.fn(),
  createServiceClient: vi.fn(),
}))

import { createClient, createServiceClient } from '@/lib/supabase-server'

function makeRequest(query = ''): NextRequest {
  return new NextRequest(`http://localhost/api/admin/users${query}`)
}

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
    { id: 'user-1', email: 'alice@test.com', last_sign_in_at: '2026-10-20T08:00:00Z' },
    { id: 'admin-uuid', email: 'admin@test.com' },
  ],
}

function makeAdminClient(role: 'admin' | 'department_admin' = 'admin') {
  const profileBuilder = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: { role, department_id: 'dept-sped' }, error: null }),
  }
  return {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'admin-uuid' } } }) },
    from: vi.fn().mockReturnValue(profileBuilder),
  }
}

function makeServiceClient(profilesData = mockProfiles, profilesError: unknown = null) {
  const profilesBuilder = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
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
    const res = await GET(makeRequest())
    expect(res.status).toBe(401)
  })

  it('returns 403 when not admin', async () => {
    vi.mocked(createClient).mockResolvedValue(makeNonAdminClient() as never)
    const res = await GET(makeRequest())
    expect(res.status).toBe(403)
  })

  it('returns merged user list with banned status', async () => {
    vi.mocked(createClient).mockResolvedValue(makeAdminClient() as never)
    vi.mocked(createServiceClient).mockReturnValue(makeServiceClient() as never)

    const res = await GET(makeRequest())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.users).toHaveLength(2)
    expect(body.users[0].email).toBe('alice@test.com')
    expect(body.users[0].banned).toBe(false)
  })

  it('filters by the chosen department even for a super-admin (PROJ-24 Bereichs-Umschalter)', async () => {
    vi.mocked(createClient).mockResolvedValue(makeAdminClient() as never)
    const service = makeServiceClient()
    vi.mocked(createServiceClient).mockReturnValue(service as never)

    await GET(makeRequest())

    const profilesBuilder = service.from.mock.results[0].value
    expect(profilesBuilder.eq).toHaveBeenCalledWith('department_id', 'dept-sped')
  })

  it('returns 500 when profiles query fails', async () => {
    vi.mocked(createClient).mockResolvedValue(makeAdminClient() as never)
    vi.mocked(createServiceClient).mockReturnValue(
      makeServiceClient([], { message: 'DB error' }) as never
    )
    const res = await GET(makeRequest())
    expect(res.status).toBe(500)
  })

  it('liefert den letzten Login aus dem Login-Konto (PROJ-44)', async () => {
    vi.mocked(createClient).mockResolvedValue(makeAdminClient() as never)
    vi.mocked(createServiceClient).mockReturnValue(makeServiceClient() as never)

    const body = await (await GET(makeRequest())).json()
    expect(body.users[0].last_sign_in_at).toBe('2026-10-20T08:00:00Z')
    expect(body.users[1].last_sign_in_at).toBeNull()
  })

  describe('scope=all (bereichsübergreifende Suche, PROJ-44)', () => {
    it('lässt den Super-Admin alle Bereiche sehen: kein Bereichsfilter', async () => {
      vi.mocked(createClient).mockResolvedValue(makeAdminClient('admin') as never)
      const service = makeServiceClient()
      vi.mocked(createServiceClient).mockReturnValue(service as never)

      const res = await GET(makeRequest('?scope=all'))
      expect(res.status).toBe(200)
      const profilesBuilder = service.from.mock.results[0].value
      expect(profilesBuilder.eq).not.toHaveBeenCalledWith('department_id', expect.anything())
    })

    it('lehnt einen Bereichs-Admin mit 403 ab', async () => {
      vi.mocked(createClient).mockResolvedValue(makeAdminClient('department_admin') as never)
      const service = makeServiceClient()
      vi.mocked(createServiceClient).mockReturnValue(service as never)

      const res = await GET(makeRequest('?scope=all'))
      expect(res.status).toBe(403)
      expect(service.from).not.toHaveBeenCalled()
    })

    it('hält den Bereichs-Admin ohne scope im eigenen Bereich', async () => {
      vi.mocked(createClient).mockResolvedValue(makeAdminClient('department_admin') as never)
      const service = makeServiceClient()
      vi.mocked(createServiceClient).mockReturnValue(service as never)

      const res = await GET(makeRequest())
      expect(res.status).toBe(200)
      expect(service.from.mock.results[0].value.eq).toHaveBeenCalledWith('department_id', 'dept-sped')
    })
  })
})
