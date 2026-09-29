import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET, POST } from './route'
import { NextRequest } from 'next/server'
import { chainMock, eqValue, hasCall } from '@/test/supabase-chain-mock'

vi.mock('@/lib/supabase-server', () => ({
  createClient: vi.fn(),
}))

import { createClient } from '@/lib/supabase-server'

function makeRequest(method: string, body?: unknown) {
  const url = new URL('http://localhost/api/admin/subjects')
  return new NextRequest(url, {
    method,
    body: body ? JSON.stringify(body) : undefined,
    headers: body ? { 'content-type': 'application/json' } : {},
  })
}

const mockSubjects = [
  {
    id: 'subj-uuid',
    name: 'BGP',
    code: 'BGP',
    color: '#58CC02',
    icon_name: 'BookOpen',
    created_at: '2026-01-01T00:00:00Z',
    is_active: true,
    question_subjects: [
      { questions: { is_active: true } },
      { questions: { is_active: false } },
    ],
  },
]

let lastMock: ReturnType<typeof chainMock>

function makeAdminSupabase(overrides: {
  subjectsData?: unknown
  subjectsError?: unknown
  existingSubject?: unknown
  insertData?: unknown
  insertError?: unknown
} = {}) {
  lastMock = chainMock(
    (table, calls) => {
      if (table === 'profiles') return { data: { role: 'admin', department_id: 'dept-sped' } }
      if (table === 'admin_audit_log') return {}
      if (table === 'subjects') {
        // POST: Anlegen
        if (hasCall(calls, 'insert')) {
          return { data: overrides.insertData ?? { id: 'new-subj-uuid' }, error: overrides.insertError ?? null }
        }
        // POST: gleiches Kürzel im Bereich?
        if (hasCall(calls, 'maybeSingle')) return { data: overrides.existingSubject ?? null }
        // POST: Fächer des Bereichs für die Sortierung
        if (hasCall(calls, 'limit')) return { data: [] }
        // GET: Liste
        return { data: overrides.subjectsData ?? mockSubjects, error: overrides.subjectsError ?? null }
      }
      return {}
    },
    { auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'admin-uuid', email: 'a@a.com' } } }) } },
  )
  return lastMock.client
}

function makeUnauthSupabase() {
  return { auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) }, from: vi.fn() }
}

function makeNonAdminSupabase() {
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

describe('GET /api/admin/subjects', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when not authenticated', async () => {
    vi.mocked(createClient).mockResolvedValue(makeUnauthSupabase() as never)
    const res = await GET()
    expect(res.status).toBe(401)
  })

  it('returns 403 when not admin', async () => {
    vi.mocked(createClient).mockResolvedValue(makeNonAdminSupabase() as never)
    const res = await GET()
    expect(res.status).toBe(403)
  })

  it('returns subjects with active question counts', async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeAdminSupabase({ subjectsData: mockSubjects }) as never
    )
    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.subjects).toHaveLength(1)
    expect(body.subjects[0].active_question_count).toBe(1)
  })

  it('exposes is_active flag for each subject (BUG-1)', async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeAdminSupabase({ subjectsData: mockSubjects }) as never
    )
    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.subjects[0].is_active).toBe(true)
  })

  it('lists only subjects of the admin\'s department (PROJ-22)', async () => {
    vi.mocked(createClient).mockResolvedValue(makeAdminSupabase({ subjectsData: mockSubjects }) as never)
    await GET()
    const list = lastMock.queries.find((q) => q.table === 'subjects')!
    expect(eqValue(list.calls, 'department_id')).toBe('dept-sped')
  })
})

describe('POST /api/admin/subjects', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when not authenticated', async () => {
    vi.mocked(createClient).mockResolvedValue(makeUnauthSupabase() as never)
    const res = await POST(makeRequest('POST', { name: 'Test', code: 'TST' }))
    expect(res.status).toBe(401)
  })

  it('returns 403 when not admin', async () => {
    vi.mocked(createClient).mockResolvedValue(makeNonAdminSupabase() as never)
    const res = await POST(makeRequest('POST', { name: 'Test', code: 'TST' }))
    expect(res.status).toBe(403)
  })

  it('returns 400 when name is missing', async () => {
    vi.mocked(createClient).mockResolvedValue(makeAdminSupabase() as never)
    const res = await POST(makeRequest('POST', { code: 'TST' }))
    expect(res.status).toBe(400)
  })

  it('returns 400 when code is missing', async () => {
    vi.mocked(createClient).mockResolvedValue(makeAdminSupabase() as never)
    const res = await POST(makeRequest('POST', { name: 'Test' }))
    expect(res.status).toBe(400)
  })

  it('returns 400 when code exceeds 5 chars (BUG-5)', async () => {
    vi.mocked(createClient).mockResolvedValue(makeAdminSupabase() as never)
    const res = await POST(makeRequest('POST', { name: 'Test', code: 'ABCDEF' }))
    expect(res.status).toBe(400)
  })

  it('creates the subject in the admin\'s department (PROJ-22)', async () => {
    vi.mocked(createClient).mockResolvedValue(makeAdminSupabase({ insertData: { id: 'new-subj-uuid' } }) as never)
    const res = await POST(makeRequest('POST', { name: 'Reiseverkehr', code: 'rvt' }))
    expect(res.status).toBe(201)
    expect(lastMock.writes.find((w) => w.table === 'subjects')?.payload).toMatchObject({ code: 'RVT', department_id: 'dept-sped' })
  })

  it('returns 409 when the code already exists in the same department', async () => {
    vi.mocked(createClient).mockResolvedValue(makeAdminSupabase({ existingSubject: { id: 'x' } }) as never)
    const res = await POST(makeRequest('POST', { name: 'KSK', code: 'KSK' }))
    expect(res.status).toBe(409)
    const check = lastMock.queries.find((q) => q.table === 'subjects' && hasCall(q.calls, 'maybeSingle'))!
    expect(eqValue(check.calls, 'department_id')).toBe('dept-sped')
  })
})
