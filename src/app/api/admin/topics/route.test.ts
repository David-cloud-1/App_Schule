import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { chainMock, hasCall } from '@/test/supabase-chain-mock'
import { GET } from './route'

vi.mock('@/lib/supabase-server', () => ({ createClient: vi.fn() }))
import { createClient } from '@/lib/supabase-server'

function makeRequest(url = 'http://localhost/api/admin/topics') {
  return new NextRequest(url)
}

function makeAdminSupabase() {
  const mock = chainMock(
    (table) => {
      if (table === 'profiles') return { data: { role: 'admin', department_id: 'dept-sped' } }
      if (table === 'topics') return { data: [{ id: 't1', name: 'Thema', subject_id: 's1' }] }
      if (table === 'questions') return { data: [] }
      return {}
    },
    { auth: { getUser: () => Promise.resolve({ data: { user: { id: 'admin-1' } } }) } }
  )
  return mock
}

beforeEach(() => vi.clearAllMocks())

describe('GET /api/admin/topics', () => {
  it('returns 401 when unauthenticated', async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: () => Promise.resolve({ data: { user: null } }) },
      from: vi.fn(),
    } as never)
    const res = await GET(makeRequest())
    expect(res.status).toBe(401)
  })

  it('returns topics for the admin department', async () => {
    const mock = makeAdminSupabase()
    vi.mocked(createClient).mockResolvedValue(mock.client as never)
    const res = await GET(makeRequest())
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.topics).toHaveLength(1)
  })

  it('excludes topics in the trash (deleted_at, PROJ-47)', async () => {
    const mock = makeAdminSupabase()
    vi.mocked(createClient).mockResolvedValue(mock.client as never)
    await GET(makeRequest())
    const topicsQuery = mock.queries.find((q) => q.table === 'topics')
    expect(hasCall(topicsQuery!.calls, 'is')).toBe(true)
    expect(topicsQuery!.calls.find((c) => c.method === 'is')?.args).toEqual(['deleted_at', null])
  })
})
