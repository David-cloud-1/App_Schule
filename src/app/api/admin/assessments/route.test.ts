import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET, POST } from './route'
import { NextRequest } from 'next/server'
import { IHK_DEFAULT_SCALE } from '@/lib/graded-assessments'

vi.mock('@/lib/supabase-server', () => ({
  createClient: vi.fn(),
  createServiceClient: vi.fn(() => ({
    auth: { admin: { getUserById: vi.fn().mockResolvedValue({ data: { user: null } }) } },
  })),
}))

vi.mock('@/lib/assessment-questions', () => ({
  checkQuestionSelection: vi.fn(),
}))

import { createClient } from '@/lib/supabase-server'
import { checkQuestionSelection } from '@/lib/assessment-questions'

const QUESTION_IDS = [1, 2, 3, 4, 5].map((n) => `6f1a2b3c-4d5e-4f60-8a7b-9c0d1e2f3a0${n}`)
const TARGET_DEPARTMENT = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'

function makeGetRequest(search = '') {
  return new NextRequest(new URL(`http://localhost/api/admin/assessments${search}`))
}

function makePostRequest(body?: unknown) {
  const url = new URL('http://localhost/api/admin/assessments')
  return new NextRequest(url, {
    method: 'POST',
    body: body ? JSON.stringify(body) : undefined,
    headers: body ? { 'content-type': 'application/json' } : {},
  })
}

const validBody = {
  departmentId: TARGET_DEPARTMENT,
  questionIds: QUESTION_IDS,
  title: 'LN 2 – Verkehrsträger Straße',
  opensAt: '2026-10-01T08:00:00.000Z',
  closesAt: '2026-10-01T10:00:00.000Z',
  durationMinutes: 45,
  gradingScale: IHK_DEFAULT_SCALE,
}

interface Overrides {
  role?: string
  departmentActive?: boolean
  codeCollisionOnce?: boolean
  insertData?: unknown
  insertError?: unknown
  listData?: unknown
  listError?: unknown
  sessionsData?: unknown
  creatorProfiles?: unknown[]
}

function makeSupabase(overrides: Overrides = {}) {
  const profileBuilder = {
    select: vi.fn().mockImplementation((cols: string) => {
      if (cols.includes('display_name')) {
        // Namen der Erstellerinnen (nur Super-Admin-Pfad in GET)
        return { in: vi.fn().mockResolvedValue({ data: overrides.creatorProfiles ?? [] }) }
      }
      // Auth-Profil (role + department_id)
      return {
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { role: overrides.role ?? 'admin', department_id: 'dept-sped' }, error: null }),
      }
    }),
  }
  const departmentBuilder = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: overrides.departmentActive === false ? null : { id: TARGET_DEPARTMENT }, error: null }),
  }
  let codeCheckCalls = 0
  let codeResolved = false
  const gradedAssessmentsListBuilder = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
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
      if (table === 'departments') return departmentBuilder
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
    const res = await GET(makeGetRequest())
    expect(res.status).toBe(401)
  })

  it('returns 403 for a student (no teacher role)', async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabase({ role: 'student' }) as never)
    const res = await GET(makeGetRequest())
    expect(res.status).toBe(403)
  })

  it('allows a teacher (PROJ-46)', async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabase({ role: 'teacher', listData: [] }) as never)
    const res = await GET(makeGetRequest())
    expect(res.status).toBe(200)
  })

  it('returns an empty list when none exist', async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabase({ listData: [] }) as never)
    const res = await GET(makeGetRequest())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.assessments).toEqual([])
  })

  it('does not include createdBy fields for a department admin', async () => {
    const row = { id: 'a1', title: 'LN', part: 1, status: 'open', access_code: 'ABCD1234', created_at: '2026-10-01T00:00:00Z', exam_question_sets: null, created_by: 'other-uuid', department_id: 'dept-sped', departments: { name: 'Spedition', code: 'SPED' } }
    vi.mocked(createClient).mockResolvedValue(makeSupabase({ role: 'department_admin', listData: [row] }) as never)
    const body = await (await GET(makeGetRequest())).json()
    expect(body.assessments[0].createdBy).toBeUndefined()
    expect(body.assessments[0].departmentName).toBe('Spedition')
  })

  it('includes createdBy name + former-flag for the super-admin', async () => {
    const row = { id: 'a1', title: 'LN', part: 1, status: 'open', access_code: 'ABCD1234', created_at: '2026-10-01T00:00:00Z', exam_question_sets: null, created_by: 'teacher-uuid', department_id: 'dept-tour', departments: { name: 'Tourismus', code: 'TOUR' } }
    vi.mocked(createClient).mockResolvedValue(makeSupabase({
      role: 'admin',
      listData: [row],
      creatorProfiles: [{ id: 'teacher-uuid', display_name: 'Frau Muster', pseudonym: null, role: 'teacher' }],
    }) as never)
    const body = await (await GET(makeGetRequest())).json()
    expect(body.assessments[0]).toMatchObject({ createdBy: 'teacher-uuid', createdByName: 'Frau Muster', createdByFormer: false })
  })

  it('shows "Gelöschtes Konto" when the creator account is gone', async () => {
    const row = { id: 'a1', title: 'LN', part: 1, status: 'closed', access_code: 'ABCD1234', created_at: '2026-10-01T00:00:00Z', exam_question_sets: null, created_by: null, department_id: 'dept-sped' }
    vi.mocked(createClient).mockResolvedValue(makeSupabase({ role: 'admin', listData: [row] }) as never)
    const body = await (await GET(makeGetRequest())).json()
    expect(body.assessments[0]).toMatchObject({ createdBy: null, createdByName: 'Gelöschtes Konto' })
  })
})

describe('GET /api/admin/assessments – Ablage (PROJ-39)', () => {
  beforeEach(() => vi.clearAllMocks())

  it('liefert Schuljahr, Klasse und Fach mit; Altnachweise ohne Zuordnung', async () => {
    const row = { id: 'a1', title: 'LN', part: 1, status: 'closed', access_code: 'ABCD1234', created_at: '2026-10-01T00:00:00Z', exam_question_sets: null }
    vi.mocked(createClient).mockResolvedValue(makeSupabase({
      listData: [
        { ...row, school_year: '2026/27', class_name: 'SP11a', subject_id: 's1', subjects: { name: 'KSK', code: 'KSK' } },
        { ...row, id: 'a2', school_year: '2025/26', class_name: null, subject_id: null, subjects: null },
      ],
    }) as never)
    const body = await (await GET(makeGetRequest())).json()
    expect(body.assessments[0]).toMatchObject({ schoolYear: '2026/27', className: 'SP11a', subjectId: 's1', subjectName: 'KSK' })
    expect(body.assessments[1]).toMatchObject({ schoolYear: '2025/26', className: null, subjectId: null, subjectName: null })
  })
})

describe('POST /api/admin/assessments', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(checkQuestionSelection).mockResolvedValue({ ok: true, ids: QUESTION_IDS, part: 2 })
  })

  it('returns 401 when not authenticated', async () => {
    vi.mocked(createClient).mockResolvedValue(makeUnauthSupabase() as never)
    const res = await POST(makePostRequest(validBody))
    expect(res.status).toBe(401)
  })

  it('returns 403 when not admin/department_admin/teacher', async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabase({ role: 'student' }) as never)
    const res = await POST(makePostRequest(validBody))
    expect(res.status).toBe(403)
  })

  it('allows a teacher without a department to create an assessment (PROJ-46)', async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabase({ role: 'teacher' }) as never)
    const res = await POST(makePostRequest(validBody))
    expect(res.status).toBe(201)
  })

  it('returns 400 for an invalid body (missing departmentId)', async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabase() as never)
    const res = await POST(makePostRequest({ title: 'x' }))
    expect(res.status).toBe(400)
  })

  it('returns 400 when the target department is missing or inactive', async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabase({ departmentActive: false }) as never)
    const res = await POST(makePostRequest(validBody))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/nicht verfügbar/)
  })

  it('returns 400 for a class name over 30 characters or an invalid school year', async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabase() as never)
    expect((await POST(makePostRequest({ ...validBody, className: 'x'.repeat(31) }))).status).toBe(400)
    expect((await POST(makePostRequest({ ...validBody, schoolYear: '2026/30' }))).status).toBe(400)
  })

  it('returns 400 when closesAt is not after opensAt', async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabase() as never)
    const res = await POST(makePostRequest({ ...validBody, closesAt: validBody.opensAt }))
    expect(res.status).toBe(400)
  })

  it('returns 400 for an invalid grading scale', async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabase() as never)
    const brokenScale = IHK_DEFAULT_SCALE.map((b) => (b.grade === 6 ? { ...b, minPercent: 10 } : b))
    const res = await POST(makePostRequest({ ...validBody, gradingScale: brokenScale }))
    expect(res.status).toBe(400)
  })

  it('rejects an invalid question selection (open, inactive or foreign questions)', async () => {
    vi.mocked(checkQuestionSelection).mockResolvedValue({ ok: false, status: 400, error: '2 gewählte Fragen sind nicht zulässig' })
    vi.mocked(createClient).mockResolvedValue(makeSupabase() as never)
    const res = await POST(makePostRequest(validBody))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/nicht zulässig/)
  })

  it("validates the selection against the target department (not the admin's own) and passes the ownerId for private questions", async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabase() as never)
    await POST(makePostRequest(validBody))
    expect(checkQuestionSelection).toHaveBeenCalledWith(expect.anything(), TARGET_DEPARTMENT, QUESTION_IDS, 'admin-uuid')
  })

  it('returns 400 when no question ids are sent', async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabase() as never)
    const res = await POST(makePostRequest({ ...validBody, questionIds: [] }))
    expect(res.status).toBe(400)
  })

  it('retries the access code on a collision and still creates the assessment', async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabase({ codeCollisionOnce: true }) as never)
    const res = await POST(makePostRequest(validBody))
    expect(res.status).toBe(201)
  })

  it('creates the assessment as a draft on valid input', async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabase() as never)
    const res = await POST(makePostRequest(validBody))
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.id).toBe('new-assessment-uuid')
  })

  function insertedPayload(supabase: ReturnType<typeof makeSupabase>) {
    const calls = supabase.from.mock.results.flatMap((r) => {
      const builder = r.value as { insert?: { mock: { calls: unknown[][] } } } | undefined
      return builder?.insert?.mock.calls ?? []
    })
    return calls.map((c) => c[0] as Record<string, unknown>).find((c) => 'focus_tracking' in c)
  }

  it("stores the target department on the assessment, not the admin's own working department", async () => {
    const supabase = makeSupabase()
    vi.mocked(createClient).mockResolvedValue(supabase as never)
    await POST(makePostRequest(validBody))
    expect(insertedPayload(supabase)).toMatchObject({ department_id: TARGET_DEPARTMENT, created_by: 'admin-uuid' })
  })

  it('stores the focus settings (PROJ-30) when tracking and auto-submit are set', async () => {
    const supabase = makeSupabase()
    vi.mocked(createClient).mockResolvedValue(supabase as never)
    const res = await POST(makePostRequest({ ...validBody, focusTracking: true, focusAutoSubmitAfter: 3 }))
    expect(res.status).toBe(201)
    expect(insertedPayload(supabase)).toMatchObject({ focus_tracking: true, focus_auto_submit_after: 3 })
  })

  it('leaves tracking off when the request does not mention it (older clients)', async () => {
    const supabase = makeSupabase()
    vi.mocked(createClient).mockResolvedValue(supabase as never)
    const res = await POST(makePostRequest(validBody))
    expect(res.status).toBe(201)
    expect(insertedPayload(supabase)).toMatchObject({ focus_tracking: false, focus_auto_submit_after: null })
  })

  it('rejects auto-submit without tracking and limits outside 1-20', async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabase() as never)
    const noTracking = await POST(makePostRequest({ ...validBody, focusTracking: false, focusAutoSubmitAfter: 3 }))
    expect(noTracking.status).toBe(400)
    const tooHigh = await POST(makePostRequest({ ...validBody, focusTracking: true, focusAutoSubmitAfter: 25 }))
    expect(tooHigh.status).toBe(400)
    const zero = await POST(makePostRequest({ ...validBody, focusTracking: true, focusAutoSubmitAfter: 0 }))
    expect(zero.status).toBe(400)
  })
})
