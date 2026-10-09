import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from './route'
import { IHK_DEFAULT_SCALE } from '@/lib/graded-assessments'

vi.mock('next/headers', () => ({ cookies: vi.fn().mockResolvedValue({ get: () => undefined }) }))
vi.mock('@/lib/supabase-server', () => ({ createClient: vi.fn(), createServiceClient: vi.fn() }))
vi.mock('@/lib/answer-key', () => ({
  fetchAnswerKey: vi.fn().mockResolvedValue(
    new Map([['q1', { explanation: null, sampleAnswer: null, options: new Map([['a', true], ['b', false]]) }]]),
  ),
}))

import { createClient, createServiceClient } from '@/lib/supabase-server'

const SESSION_ID = '6f1a2b3c-4d5e-4f60-8a7b-9c0d1e2f3a4b'

function makeRequest(query = '') {
  return new NextRequest(new URL(`http://localhost/api/admin/assessments/as-1/reports${query}`))
}
const ctx = { params: Promise.resolve({ id: 'as-1' }) }

interface Overrides {
  user?: { id: string } | null
  role?: string
  assessment?: unknown
  sessions?: unknown[]
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
        ? {
            title: 'LN 1', part: 1, grading_scale: IHK_DEFAULT_SCALE, department_id: 'dept-sped',
            access_code: '7K2MQX', opens_at: '2026-10-01T08:00:00Z', closes_at: '2026-10-01T10:00:00Z', status: 'closed',
          }
        : o.assessment,
      error: null,
    }),
  }
  vi.mocked(createClient).mockResolvedValue({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: o.user === undefined ? { id: 'u1' } : o.user } }) },
    from: vi.fn((table: string) => (table === 'profiles' ? profileBuilder : assessmentBuilder)),
  } as never)

  const sessionsResult = Promise.resolve({ data: o.sessions ?? [], error: null })
  const sessionsBuilder: Record<string, unknown> = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    then: sessionsResult.then.bind(sessionsResult),
  }
  vi.mocked(createServiceClient).mockImplementation(() => {
    if (o.serviceCalled) o.serviceCalled.value = true
    return { from: vi.fn(() => sessionsBuilder) } as never
  })
}

const session = (id: string, name: string, status = 'completed') => ({
  id,
  participant_name: name,
  started_at: '2026-10-01T08:00:00Z',
  ended_at: status === 'completed' ? '2026-10-01T08:30:00Z' : null,
  status,
  excluded_from_grading: false,
  results_json: {
    parts: {
      '1': [{
        id: 'q1', question_text: 'Frage', type: 'multiple_choice', difficulty: 'easy', part: 1,
        answer_options: [{ id: 'a', option_text: 'A', display_order: 1 }, { id: 'b', option_text: 'B', display_order: 2 }],
      }],
    },
    submitted_answers: { q1: 'a' },
  },
})

describe('GET /api/admin/assessments/[id]/reports', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 without a session', async () => {
    setup({ user: null })
    expect((await GET(makeRequest(), ctx)).status).toBe(401)
  })

  it('returns 403 for a non-admin', async () => {
    setup({ role: 'user' })
    expect((await GET(makeRequest(), ctx)).status).toBe(403)
  })

  it('returns 400 for a malformed sessionId', async () => {
    setup()
    expect((await GET(makeRequest('?sessionId=abc'), ctx)).status).toBe(400)
  })

  it('returns 404 for an unknown assessment', async () => {
    setup({ assessment: null })
    expect((await GET(makeRequest(), ctx)).status).toBe(404)
  })

  it('returns 404 and never touches the service client for another department', async () => {
    const serviceCalled = { value: false }
    setup({
      serviceCalled,
      assessment: { title: 'LN', part: 1, grading_scale: IHK_DEFAULT_SCALE, department_id: 'dept-tour', access_code: 'AAAAAA', opens_at: '', closes_at: '', status: 'closed' },
    })
    expect((await GET(makeRequest(), ctx)).status).toBe(404)
    expect(serviceCalled.value).toBe(false)
  })

  it('returns 404 when the requested session does not exist', async () => {
    setup({ sessions: [] })
    expect((await GET(makeRequest(`?sessionId=${SESSION_ID}`), ctx)).status).toBe(404)
  })

  it('returns 409 for a participant who is still writing', async () => {
    setup({ sessions: [session(SESSION_ID, 'Anna', 'in_progress')] })
    expect((await GET(makeRequest(`?sessionId=${SESSION_ID}`), ctx)).status).toBe(409)
  })

  it('returns graded reports alphabetically and counts those still writing', async () => {
    setup({ sessions: [session('s2', 'Ben'), session('s1', 'Anna'), session('s3', 'Cem', 'in_progress')] })
    const res = await GET(makeRequest(), ctx)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.reports.map((r: { name: string }) => r.name)).toEqual(['Anna', 'Ben'])
    expect(body.stillWriting).toBe(1)
    expect(body.reports[0].grade).toBe(1)
    expect(body.assessment.accessCode).toBe('7K2M-QX')
  })

  it('does not leak the answer key in the assessment header', async () => {
    setup({ sessions: [session('s1', 'Anna')] })
    const body = await (await GET(makeRequest(), ctx)).json()
    expect(JSON.stringify(body.assessment)).not.toMatch(/is_correct|isCorrect/)
  })
})
