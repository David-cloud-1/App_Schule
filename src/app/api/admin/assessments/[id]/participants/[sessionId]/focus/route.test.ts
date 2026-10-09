import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from './route'

vi.mock('next/headers', () => ({ cookies: vi.fn().mockResolvedValue({ get: () => undefined }) }))
vi.mock('@/lib/supabase-server', () => ({ createClient: vi.fn(), createServiceClient: vi.fn() }))

import { createClient, createServiceClient } from '@/lib/supabase-server'

const ASSESSMENT_ID = '0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d'
const SESSION_ID = '6f1a2b3c-4d5e-4f60-8a7b-9c0d1e2f3a4b'

function call(id = ASSESSMENT_ID, sessionId = SESSION_ID) {
  return GET(
    new NextRequest(new URL(`http://localhost/api/admin/assessments/${id}/participants/${sessionId}/focus`)),
    { params: Promise.resolve({ id, sessionId }) },
  )
}

interface Overrides {
  user?: { id: string } | null
  role?: string
  assessment?: unknown
  sessionExists?: boolean
  serviceCalled?: { value: boolean }
}

function setup(o: Overrides = {}) {
  const profileBuilder = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: { role: o.role ?? 'department_admin', department_id: 'dept-sped' }, error: null }),
  }
  const assessmentBuilder = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({
      data: o.assessment === undefined
        ? { department_id: 'dept-sped', focus_tracking: true, focus_auto_submit_after: 3 }
        : o.assessment,
    }),
  }
  vi.mocked(createClient).mockResolvedValue({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: o.user === undefined ? { id: 'u1' } : o.user } }) },
    from: vi.fn((table: string) => (table === 'profiles' ? profileBuilder : assessmentBuilder)),
  } as never)

  const events = [
    { id: 'e1', left_at: '2026-10-08T08:10:00Z', returned_at: '2026-10-08T08:10:42Z', duration_seconds: 42, question_id: 'q1', question_number: 5, counted: true },
    { id: 'e2', left_at: '2026-10-08T08:20:00Z', returned_at: '2026-10-08T08:20:01Z', duration_seconds: 1, question_id: 'q2', question_number: 7, counted: false },
  ]
  vi.mocked(createServiceClient).mockImplementation(() => {
    if (o.serviceCalled) o.serviceCalled.value = true
    return {
      from: vi.fn((table: string) => {
        if (table === 'exam_sessions') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: o.sessionExists === false ? null : { id: SESSION_ID } }),
          }
        }
        if (table === 'assessment_focus_summary') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({
              data: { counted_switches: 1, counted_seconds: 42, short_count: 1, auto_submitted: false },
            }),
          }
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue({ data: events }),
        }
      }),
    } as never
  })
}

describe('GET /api/admin/assessments/[id]/participants/[sessionId]/focus', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 without a login', async () => {
    setup({ user: null })
    expect((await call()).status).toBe(401)
  })

  it('returns 403 for a student', async () => {
    setup({ role: 'student' })
    expect((await call()).status).toBe(403)
  })

  it('returns 400 for malformed ids', async () => {
    setup()
    expect((await call('nicht-uuid')).status).toBe(400)
    expect((await call(ASSESSMENT_ID, 'auch-nicht')).status).toBe(400)
  })

  it('returns 404 for an unknown assessment', async () => {
    setup({ assessment: null })
    expect((await call()).status).toBe(404)
  })

  it('hides assessments of another department without touching the service client', async () => {
    const serviceCalled = { value: false }
    setup({ assessment: { department_id: 'dept-tourismus', focus_tracking: true, focus_auto_submit_after: null }, serviceCalled })
    expect((await call()).status).toBe(404)
    expect(serviceCalled.value).toBe(false)
  })

  it('returns 404 when the session does not belong to the assessment', async () => {
    setup({ sessionExists: false })
    expect((await call()).status).toBe(404)
  })

  it('returns summary and entries, marking short absences as not counted', async () => {
    setup()
    const res = await call()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.focusTracking).toBe(true)
    expect(body.autoSubmitAfter).toBe(3)
    expect(body.summary).toEqual({ countedSwitches: 1, countedSeconds: 42, shortCount: 1, autoSubmitted: false, trackingUnavailable: false })
    expect(body.events).toHaveLength(2)
    expect(body.events[0]).toMatchObject({ questionNumber: 5, durationSeconds: 42, counted: true })
    expect(body.events[1]).toMatchObject({ questionNumber: 7, counted: false })
    expect(body.truncated).toBe(false)
  })
})
