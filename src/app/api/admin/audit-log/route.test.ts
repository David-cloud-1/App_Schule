import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET } from './route'
import { NextRequest } from 'next/server'

vi.mock('@/lib/supabase-server', () => ({
  createClient: vi.fn(),
  createServiceClient: vi.fn(),
}))

import { createClient, createServiceClient } from '@/lib/supabase-server'

function makeRequest(params: Record<string, string> = {}) {
  const url = new URL('http://localhost/api/admin/audit-log')
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  return new NextRequest(url)
}

const mockEntries = [
  {
    id: 'log-1',
    created_at: '2026-04-19T10:00:00Z',
    admin_id: 'admin-uuid',
    action_type: 'question.create',
    object_type: 'question',
    object_id: 'q-1',
    object_label: 'Test question',
    details: null,
  },
]

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

function makeServiceClient(data = mockEntries, error: unknown = null, count = 1) {
  const adminNamesBuilder = {
    select: vi.fn().mockReturnThis(),
    in: vi.fn().mockResolvedValue({ data: [{ id: 'admin-uuid', display_name: 'Admin' }], error: null }),
  }
  const logBuilder = {
    select: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    range: vi.fn().mockResolvedValue({ data, error, count }),
  }

  return {
    from: vi.fn().mockImplementation((table: string) => {
      if (table === 'profiles') return adminNamesBuilder
      return logBuilder
    }),
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

describe('GET /api/admin/audit-log', () => {
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

  it('returns paginated audit entries', async () => {
    vi.mocked(createClient).mockResolvedValue(makeAdminClient() as never)
    vi.mocked(createServiceClient).mockReturnValue(makeServiceClient() as never)
    const res = await GET(makeRequest())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.entries).toHaveLength(1)
    expect(body.entries[0].admin_name).toBe('Admin')
    expect(body.total).toBe(1)
  })

  it('returns empty entries gracefully when table query errors', async () => {
    vi.mocked(createClient).mockResolvedValue(makeAdminClient() as never)
    vi.mocked(createServiceClient).mockReturnValue(
      makeServiceClient([], { message: 'relation does not exist' }, 0) as never
    )
    const res = await GET(makeRequest())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.entries).toHaveLength(0)
  })

  it('returns 400 for invalid period param', async () => {
    vi.mocked(createClient).mockResolvedValue(makeAdminClient() as never)
    vi.mocked(createServiceClient).mockReturnValue(makeServiceClient() as never)
    const res = await GET(makeRequest({ period: '1year' }))
    expect(res.status).toBe(400)
  })

  it('filters by action_type', async () => {
    vi.mocked(createClient).mockResolvedValue(makeAdminClient() as never)
    vi.mocked(createServiceClient).mockReturnValue(makeServiceClient() as never)
    const res = await GET(makeRequest({ action_type: 'question.create' }))
    expect(res.status).toBe(200)
  })
})
