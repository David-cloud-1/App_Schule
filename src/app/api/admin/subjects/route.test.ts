import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET, POST } from './route'
import { NextRequest } from 'next/server'

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

function makeAdminSupabase(overrides: {
  subjectsData?: unknown
  subjectsError?: unknown
  existingSubject?: unknown
  insertData?: unknown
  insertError?: unknown
} = {}) {
  const profileBuilder = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: { role: 'admin' }, error: null }),
  }
  const subjectsListBuilder = {
    select: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue({
      data: overrides.subjectsData ?? mockSubjects,
      error: overrides.subjectsError ?? null,
    }),
  }
  // For unique-code check (maybeSingle)
  const duplicateCheckBuilder = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: overrides.existingSubject ?? null, error: null }),
  }
  const insertBuilder = {
    insert: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({
      data: overrides.insertData ?? { id: 'new-subj-uuid' },
      error: overrides.insertError ?? null,
    }),
  }
  const auditBuilder = { insert: vi.fn().mockResolvedValue({ error: null }) }

  let callCount = 0
  return {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'admin-uuid', email: 'a@a.com' } } }) },
    from: vi.fn().mockImplementation((table: string) => {
      if (table === 'profiles') return profileBuilder
      if (table === 'admin_audit_log') return auditBuilder
      if (table === 'subjects') {
        callCount++
        // First call (GET): returns list builder; POST calls: duplicate check then insert
        if (callCount === 1 && overrides.subjectsData !== undefined) return subjectsListBuilder
        if (overrides.existingSubject !== undefined || overrides.insertData !== undefined) {
          // POST path: first call = duplicate check, second = insert
          if (callCount % 2 === 1) return duplicateCheckBuilder
          return insertBuilder
        }
        return subjectsListBuilder
      }
      return subjectsListBuilder
    }),
  }
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
})
