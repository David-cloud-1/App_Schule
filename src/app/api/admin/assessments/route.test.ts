import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET, POST } from './route'
import { NextRequest } from 'next/server'
import { IHK_DEFAULT_SCALE } from '@/lib/graded-assessments'

vi.mock('@/lib/supabase-server', () => ({
  createClient: vi.fn(),
}))

import { createClient } from '@/lib/supabase-server'

function makeRequest(method: string, body?: unknown) {
  const url = new URL('http://localhost/api/admin/assessments')
  return new NextRequest(url, {
    method,
    body: body ? JSON.stringify(body) : undefined,
    headers: body ? { 'content-type': 'application/json' } : {},
  })
}

const validBody = {
  // Zod v4's .uuid() is RFC-strict (version + variant nibble) — must be a real v4 UUID.
  examSetId: '6f1a2b3c-4d5e-4f60-8a7b-9c0d1e2f3a4b',
  title: 'LN 2 – Verkehrsträger Straße',
  opensAt: '2026-10-01T08:00:00.000Z',
  closesAt: '2026-10-01T10:00:00.000Z',
  durationMinutes: 45,
  gradingScale: IHK_DEFAULT_SCALE,
}

interface Overrides {
  role?: string
  setData?: unknown
  openCount?: number
  codeCollisionOnce?: boolean
  insertData?: unknown
  insertError?: unknown
  listData?: unknown
  listError?: unknown
  sessionsData?: unknown
}

function makeAdminSupabase(overrides: Overrides = {}) {
  const profileBuilder = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: { role: overrides.role ?? 'admin' }, error: null }),
  }
  const setBuilder = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({
      data: overrides.setData ?? { id: validBody.examSetId, part: 1, question_ids: ['q1', 'q2', 'q3', 'q4', 'q5'] },
      error: null,
    }),
  }
  const questionsBuilder = {
    select: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    eq: vi.fn().mockResolvedValue({ count: overrides.openCount ?? 0 }),
  }
  let codeCheckCalls = 0
  let codeResolved = false
  const gradedAssessmentsListBuilder = {
    select: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue({ data: overrides.listData ?? [], error: overrides.listError ?? null }),
  }
  const gradedAssessmentsCodeCheckBuilder = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockImplementation(() => {
      codeCheckCalls += 1
      const isCollision = overrides.codeCollisionOnce && codeCheckCalls === 1
      if (!isCollision) codeResolved = true
      return Promise.resolve({ data: isCollision ? { id: 'existing' } : null })
    }),
  }
  const gradedAssessmentsInsertBuilder = {
    insert: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({
      data: overrides.insertData ?? { id: 'new-assessment-uuid' },
      error: overrides.insertError ?? null,
    }),
  }
  const sessionsBuilder = {
    select: vi.fn().mockReturnThis(),
    in: vi.fn().mockResolvedValue({ data: overrides.sessionsData ?? [] }),
  }
  const auditBuilder = { insert: vi.fn().mockResolvedValue({ error: null }) }

  return {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'admin-uuid', email: 'a@a.com' } } }) },
    from: vi.fn().mockImplementation((table: string) => {
      if (table === 'profiles') return profileBuilder
      if (table === 'exam_question_sets') return setBuilder
      if (table === 'questions') return questionsBuilder
      if (table === 'admin_audit_log') return auditBuilder
      if (table === 'exam_sessions') return sessionsBuilder
      if (table === 'graded_assessments') {
        // GET (list) uses .order() as its terminal call. POST's uniqueness
        // check(s) come first, then exactly one insert call once a free
        // code was found — tracked via `codeResolved` rather than a call
        // count, since the number of collision retries varies per test.
        if (overrides.listData !== undefined) return gradedAssessmentsListBuilder
        return codeResolved ? gradedAssessmentsInsertBuilder : gradedAssessmentsCodeCheckBuilder
      }
      throw new Error(`Unexpected table: ${table}`)
    }),
  }
}

function makeUnauthSupabase() {
  return { auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) }, from: vi.fn() }
}

describe('GET /api/admin/assessments', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when not authenticated', async () => {
    vi.mocked(createClient).mockResolvedValue(makeUnauthSupabase() as never)
    const res = await GET()
    expect(res.status).toBe(401)
  })

  it('returns an empty list when none exist', async () => {
    vi.mocked(createClient).mockResolvedValue(makeAdminSupabase({ listData: [] }) as never)
    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.assessments).toEqual([])
  })
})

describe('POST /api/admin/assessments', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when not authenticated', async () => {
    vi.mocked(createClient).mockResolvedValue(makeUnauthSupabase() as never)
    const res = await POST(makeRequest('POST', validBody))
    expect(res.status).toBe(401)
  })

  it('returns 403 when not admin', async () => {
    vi.mocked(createClient).mockResolvedValue(makeAdminSupabase({ role: 'student' }) as never)
    const res = await POST(makeRequest('POST', validBody))
    expect(res.status).toBe(403)
  })

  it('returns 400 for an invalid body', async () => {
    vi.mocked(createClient).mockResolvedValue(makeAdminSupabase() as never)
    const res = await POST(makeRequest('POST', { title: 'x' }))
    expect(res.status).toBe(400)
  })

  it('returns 400 when closesAt is not after opensAt', async () => {
    vi.mocked(createClient).mockResolvedValue(makeAdminSupabase() as never)
    const res = await POST(makeRequest('POST', { ...validBody, closesAt: validBody.opensAt }))
    expect(res.status).toBe(400)
  })

  it('returns 400 for an invalid grading scale', async () => {
    vi.mocked(createClient).mockResolvedValue(makeAdminSupabase() as never)
    const brokenScale = IHK_DEFAULT_SCALE.map((b) => (b.grade === 6 ? { ...b, minPercent: 10 } : b))
    const res = await POST(makeRequest('POST', { ...validBody, gradingScale: brokenScale }))
    expect(res.status).toBe(400)
  })

  it('returns 400 when the set has fewer than 5 questions', async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeAdminSupabase({ setData: { id: validBody.examSetId, part: 1, question_ids: ['q1', 'q2'] } }) as never,
    )
    const res = await POST(makeRequest('POST', validBody))
    expect(res.status).toBe(400)
  })

  it('rejects a set containing open questions (MC-only rule)', async () => {
    vi.mocked(createClient).mockResolvedValue(makeAdminSupabase({ openCount: 2 }) as never)
    const res = await POST(makeRequest('POST', validBody))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/Multiple-Choice/)
  })

  it('retries the access code on a collision and still creates the assessment', async () => {
    vi.mocked(createClient).mockResolvedValue(makeAdminSupabase({ codeCollisionOnce: true }) as never)
    const res = await POST(makeRequest('POST', validBody))
    expect(res.status).toBe(201)
  })

  it('creates the assessment as a draft on valid input', async () => {
    vi.mocked(createClient).mockResolvedValue(makeAdminSupabase() as never)
    const res = await POST(makeRequest('POST', validBody))
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.id).toBe('new-assessment-uuid')
  })
})
