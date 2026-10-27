import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { chainMock, hasCall } from '@/test/supabase-chain-mock'
import { GET, POST } from './route'

vi.mock('@/lib/supabase-server', () => ({ createClient: vi.fn() }))
import { createClient } from '@/lib/supabase-server'

function makeRequest(body?: unknown) {
  return new NextRequest('http://localhost/api/admin/my-subjects', {
    method: 'POST',
    body: body ? JSON.stringify(body) : undefined,
    headers: body ? { 'content-type': 'application/json' } : {},
  })
}

beforeEach(() => vi.clearAllMocks())

const SUBJ_KSK = '660e8400-e29b-41d4-a716-446655440000'

function makeSupabase(opts: {
  role?: string
  departments?: unknown[]
  subjects?: unknown[]
  assignments?: unknown[]
  insertError?: unknown
} = {}) {
  const {
    role = 'teacher',
    departments = [{ id: 'dept-sped', name: 'Spedition', code: 'SPED' }],
    subjects = [{ id: SUBJ_KSK, name: 'KSK', code: 'KSK', department_id: 'dept-sped' }],
    assignments = [],
    insertError = null,
  } = opts
  const { client, writes } = chainMock((table, calls) => {
    if (table === 'profiles') return { data: { role } }
    if (table === 'departments') return { data: hasCall(calls, 'maybeSingle') ? departments[0] ?? null : departments }
    if (table === 'subjects') return { data: hasCall(calls, 'maybeSingle') ? subjects[0] ?? null : subjects }
    if (table === 'teacher_subject_assignments') {
      if (hasCall(calls, 'insert')) return { data: { id: 'assign-1', department_id: 'dept-sped', subject_id: SUBJ_KSK }, error: insertError }
      return { data: assignments }
    }
    return {}
  }, {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'teacher-1', email: 't@a.de' } } }) },
  })
  return { client, writes }
}

describe('GET /api/admin/my-subjects', () => {
  it('returns 403 for an admin (no self-service for them)', async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabase({ role: 'admin' }).client as never)
    const res = await GET()
    expect(res.status).toBe(403)
  })

  it('returns the catalog and assignments for a teacher', async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabase().client as never)
    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.departments).toHaveLength(1)
    expect(body.subjects).toHaveLength(1)
    expect(body.assignments).toEqual([])
  })
})

describe('POST /api/admin/my-subjects', () => {
  it('returns 400 for invalid payload', async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabase().client as never)
    const res = await POST(makeRequest({ department_id: 'not-a-uuid' }))
    expect(res.status).toBe(400)
  })

  it('returns 404 when the department does not exist', async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabase({ departments: [] }).client as never)
    const res = await POST(makeRequest({ department_id: '550e8400-e29b-41d4-a716-446655440000', subject_id: null }))
    expect(res.status).toBe(404)
  })

  it('creates a department-only assignment', async () => {
    const { client, writes } = makeSupabase({ subjects: [] })
    vi.mocked(createClient).mockResolvedValue(client as never)
    const res = await POST(makeRequest({ department_id: '550e8400-e29b-41d4-a716-446655440000', subject_id: null }))
    expect(res.status).toBe(201)
    expect(writes.find((w) => w.table === 'teacher_subject_assignments')?.payload).toMatchObject({
      teacher_id: 'teacher-1',
      subject_id: null,
    })
  })

  it('treats a duplicate (unique violation) as success', async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabase({ insertError: { code: '23505' } }).client as never)
    const res = await POST(makeRequest({ department_id: '550e8400-e29b-41d4-a716-446655440000', subject_id: SUBJ_KSK }))
    expect(res.status).toBe(200)
    expect((await res.json()).ok).toBe(true)
  })
})
