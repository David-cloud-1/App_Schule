import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET, POST } from './route'
import { NextRequest } from 'next/server'
import { IHK_DEFAULT_SCALE } from '@/lib/graded-assessments'

vi.mock('@/lib/supabase-server', () => ({
  createClient: vi.fn(),
}))

vi.mock('@/lib/assessment-questions', () => ({
  checkQuestionSelection: vi.fn(),
}))

import { createClient } from '@/lib/supabase-server'
import { checkQuestionSelection } from '@/lib/assessment-questions'

const QUESTION_IDS = [1, 2, 3, 4, 5].map((n) => `6f1a2b3c-4d5e-4f60-8a7b-9c0d1e2f3a0${n}`)

function makeRequest(method: string, body?: unknown) {
  const url = new URL('http://localhost/api/admin/assessments')
  return new NextRequest(url, {
    method,
    body: body ? JSON.stringify(body) : undefined,
    headers: body ? { 'content-type': 'application/json' } : {},
  })
}

const validBody = {
  questionIds: QUESTION_IDS,
  title: 'LN 2 – Verkehrsträger Straße',
  opensAt: '2026-10-01T08:00:00.000Z',
  closesAt: '2026-10-01T10:00:00.000Z',
  durationMinutes: 45,
  gradingScale: IHK_DEFAULT_SCALE,
}

interface Overrides {
  role?: string
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
    single: vi.fn().mockResolvedValue({ data: { role: overrides.role ?? 'admin', department_id: 'dept-sped' }, error: null }),
  }
  let codeCheckCalls = 0
  let codeResolved = false
  const gradedAssessmentsListBuilder = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
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
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(checkQuestionSelection).mockResolvedValue({ ok: true, ids: QUESTION_IDS, part: 2 })
  })

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

  it('rejects an invalid question selection (open, inactive or foreign questions)', async () => {
    vi.mocked(checkQuestionSelection).mockResolvedValue({ ok: false, status: 400, error: '2 gewählte Fragen sind nicht zulässig' })
    vi.mocked(createClient).mockResolvedValue(makeAdminSupabase() as never)
    const res = await POST(makeRequest('POST', validBody))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/nicht zulässig/)
  })

  it('validates the selection against the admin department and stores the derived part', async () => {
    vi.mocked(createClient).mockResolvedValue(makeAdminSupabase() as never)
    await POST(makeRequest('POST', validBody))
    expect(checkQuestionSelection).toHaveBeenCalledWith(expect.anything(), 'dept-sped', QUESTION_IDS)
  })

  it('returns 400 when no question ids are sent', async () => {
    vi.mocked(createClient).mockResolvedValue(makeAdminSupabase() as never)
    const res = await POST(makeRequest('POST', { ...validBody, questionIds: [] }))
    expect(res.status).toBe(400)
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

  function insertedPayload(supabase: ReturnType<typeof makeAdminSupabase>) {
    const calls = supabase.from.mock.results.flatMap((r) => {
      const builder = r.value as { insert?: { mock: { calls: unknown[][] } } } | undefined
      return builder?.insert?.mock.calls ?? []
    })
    return calls.map((c) => c[0] as Record<string, unknown>).find((c) => 'focus_tracking' in c)
  }

  it('stores the focus settings (PROJ-30) when tracking and auto-submit are set', async () => {
    const supabase = makeAdminSupabase()
    vi.mocked(createClient).mockResolvedValue(supabase as never)
    const res = await POST(makeRequest('POST', { ...validBody, focusTracking: true, focusAutoSubmitAfter: 3 }))
    expect(res.status).toBe(201)
    expect(insertedPayload(supabase)).toMatchObject({ focus_tracking: true, focus_auto_submit_after: 3 })
  })

  it('leaves tracking off when the request does not mention it (older clients)', async () => {
    const supabase = makeAdminSupabase()
    vi.mocked(createClient).mockResolvedValue(supabase as never)
    const res = await POST(makeRequest('POST', validBody))
    expect(res.status).toBe(201)
    expect(insertedPayload(supabase)).toMatchObject({ focus_tracking: false, focus_auto_submit_after: null })
  })

  it('rejects auto-submit without tracking and limits outside 1-20', async () => {
    vi.mocked(createClient).mockResolvedValue(makeAdminSupabase() as never)
    const noTracking = await POST(makeRequest('POST', { ...validBody, focusTracking: false, focusAutoSubmitAfter: 3 }))
    expect(noTracking.status).toBe(400)
    const tooHigh = await POST(makeRequest('POST', { ...validBody, focusTracking: true, focusAutoSubmitAfter: 25 }))
    expect(tooHigh.status).toBe(400)
    const zero = await POST(makeRequest('POST', { ...validBody, focusTracking: true, focusAutoSubmitAfter: 0 }))
    expect(zero.status).toBe(400)
  })
})
