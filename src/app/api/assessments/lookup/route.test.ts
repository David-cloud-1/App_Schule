import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from './route'
import { NextRequest } from 'next/server'

vi.mock('@/lib/supabase-server', () => ({
  createClient: vi.fn(),
  createServiceClient: vi.fn(),
}))

import { createClient, createServiceClient } from '@/lib/supabase-server'

function makeRequest(body: unknown) {
  return new NextRequest(new URL('http://localhost/api/assessments/lookup'), {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  })
}

const openAssessment = {
  id: 'a-1',
  title: 'LN 2',
  duration_minutes: 45,
  status: 'open',
  opens_at: new Date(Date.now() - 60_000).toISOString(),
  closes_at: new Date(Date.now() + 60 * 60_000).toISOString(),
  question_ids_snapshot: ['q1', 'q2', 'q3', 'q4', 'q5'],
  exam_set_id: 'set-1',
}

function makeUserClient(opts: { user?: boolean; existingSession?: unknown } = {}) {
  const sessionBuilder = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: opts.existingSession ?? null }),
  }
  return {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: opts.user === false ? null : { id: 'user-1' } } }) },
    from: vi.fn().mockImplementation(() => sessionBuilder),
  }
}

function makeServiceClient(opts: { attempts?: unknown; assessment?: unknown } = {}) {
  const upsert = vi.fn().mockResolvedValue({ error: null })
  const attemptsBuilder = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: opts.attempts ?? null }),
    upsert,
  }
  const assessmentBuilder = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: opts.assessment ?? null }),
  }
  const client = {
    from: vi.fn().mockImplementation((table: string) =>
      table === 'assessment_lookup_attempts' ? attemptsBuilder : assessmentBuilder,
    ),
  }
  return { client, upsert, assessmentBuilder }
}

describe('POST /api/assessments/lookup', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when not authenticated', async () => {
    vi.mocked(createClient).mockResolvedValue(makeUserClient({ user: false }) as never)
    const res = await POST(makeRequest({ code: '7K2MQX' }))
    expect(res.status).toBe(401)
  })

  it('returns 404 and counts the failed attempt for an unknown code', async () => {
    vi.mocked(createClient).mockResolvedValue(makeUserClient() as never)
    const service = makeServiceClient({ assessment: null })
    vi.mocked(createServiceClient).mockReturnValue(service.client as never)
    const res = await POST(makeRequest({ code: 'ZZZZZZ' }))
    expect(res.status).toBe(404)
    expect(service.upsert).toHaveBeenCalledWith(expect.objectContaining({ user_id: 'user-1', attempt_count: 1 }))
  })

  it('returns 429 once the failed-attempt limit is reached inside the window', async () => {
    vi.mocked(createClient).mockResolvedValue(makeUserClient() as never)
    const service = makeServiceClient({
      attempts: { window_start: new Date().toISOString(), attempt_count: 10 },
    })
    vi.mocked(createServiceClient).mockReturnValue(service.client as never)
    const res = await POST(makeRequest({ code: '7K2MQX' }))
    expect(res.status).toBe(429)
  })

  it('resets the counter once the window has expired', async () => {
    vi.mocked(createClient).mockResolvedValue(makeUserClient() as never)
    const service = makeServiceClient({
      attempts: { window_start: new Date(Date.now() - 60 * 60_000).toISOString(), attempt_count: 10 },
      assessment: openAssessment,
    })
    vi.mocked(createServiceClient).mockReturnValue(service.client as never)
    const res = await POST(makeRequest({ code: '7K2MQX' }))
    expect(res.status).toBe(200)
  })

  it('normalizes the code before looking it up (lowercase, dash, spaces)', async () => {
    vi.mocked(createClient).mockResolvedValue(makeUserClient() as never)
    const service = makeServiceClient({ assessment: openAssessment })
    vi.mocked(createServiceClient).mockReturnValue(service.client as never)
    await POST(makeRequest({ code: ' 7k2m-qx ' }))
    expect(service.assessmentBuilder.eq).toHaveBeenCalledWith('access_code', '7K2MQX')
  })

  it('returns an open assessment that still needs the participant name', async () => {
    vi.mocked(createClient).mockResolvedValue(makeUserClient() as never)
    vi.mocked(createServiceClient).mockReturnValue(makeServiceClient({ assessment: openAssessment }).client as never)
    const res = await POST(makeRequest({ code: '7K2MQX' }))
    const body = await res.json()
    expect(body).toMatchObject({ id: 'a-1', status: 'open', questionCount: 5, needsName: true, existingSessionId: null })
  })

  it('reports not_open for a draft, so the join screen can explain why', async () => {
    vi.mocked(createClient).mockResolvedValue(makeUserClient() as never)
    vi.mocked(createServiceClient).mockReturnValue(
      makeServiceClient({ assessment: { ...openAssessment, status: 'draft' } }).client as never,
    )
    const res = await POST(makeRequest({ code: '7K2MQX' }))
    expect((await res.json()).status).toBe('not_open')
  })

  it('points back into an existing attempt instead of starting a new one', async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeUserClient({ existingSession: { id: 'sess-1', status: 'in_progress' } }) as never,
    )
    vi.mocked(createServiceClient).mockReturnValue(makeServiceClient({ assessment: openAssessment }).client as never)
    const res = await POST(makeRequest({ code: '7K2MQX' }))
    expect(await res.json()).toMatchObject({
      existingSessionId: 'sess-1',
      existingSessionStatus: 'in_progress',
      needsName: false,
    })
  })
})
