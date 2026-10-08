import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/supabase-server', () => ({
  createClient: vi.fn(),
  createServiceClient: vi.fn(),
}))
vi.mock('@/lib/assessment-submit', async () => {
  const actual = await vi.importActual<typeof import('@/lib/assessment-submit')>('@/lib/assessment-submit')
  return { ...actual, finishAssessmentAttempt: vi.fn(async () => ({ ok: true })) }
})

import { POST } from './route'
import { createClient, createServiceClient } from '@/lib/supabase-server'
import { finishAssessmentAttempt } from '@/lib/assessment-submit'

const EVENT_ID = '3b1f5a0e-6f0b-4e0e-9a8a-1c2d3e4f5a6b'

function makeSession(overrides: Record<string, unknown> = {}) {
  return {
    id: 'sess-1',
    status: 'in_progress',
    assessment_id: 'as-1',
    started_at: new Date(Date.now() - 5 * 60_000).toISOString(),
    results_json: { durationMinutes: 30 },
    ...overrides,
  }
}

type Setup = {
  user?: boolean
  session?: ReturnType<typeof makeSession> | null
  assessment?: { focus_tracking: boolean; focus_auto_submit_after: number | null } | null
  rpc?: { data: unknown; error: unknown }
  claimed?: unknown[]
}

function setup(opts: Setup = {}) {
  const session = opts.session === undefined ? makeSession() : opts.session
  const userClient = {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: opts.user === false ? null : { id: 'user-1' } } }) },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: session }),
    })),
  }
  const summaryUpdate = vi.fn()
  const summaryBuilder = {
    update: summaryUpdate.mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    select: vi.fn().mockResolvedValue({ data: opts.claimed ?? [{ session_id: 'sess-1' }] }),
  }
  const assessment = opts.assessment === undefined ? { focus_tracking: true, focus_auto_submit_after: null } : opts.assessment
  const rpc = vi.fn().mockResolvedValue(
    opts.rpc ?? { data: { countedSwitches: 1, countedSeconds: 12, shortCount: 0, autoSubmitted: false, warn: true }, error: null },
  )
  const serviceClient = {
    rpc,
    from: vi.fn((table: string) => {
      if (table === 'assessment_focus_summary') return summaryBuilder
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: assessment }),
      }
    }),
  }
  vi.mocked(createClient).mockResolvedValue(userClient as never)
  vi.mocked(createServiceClient).mockReturnValue(serviceClient as never)
  return { rpc, summaryUpdate }
}

function post(body: unknown) {
  return POST(
    new NextRequest(new URL('http://localhost/api/exam/sessions/sess-1/focus'), {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'content-type': 'application/json' },
    }),
    { params: Promise.resolve({ id: 'sess-1' }) },
  )
}

describe('POST /api/exam/sessions/[id]/focus', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 without a login', async () => {
    setup({ user: false })
    expect((await post({ action: 'resume' })).status).toBe(401)
  })

  it('rejects an unknown action and a missing event id', async () => {
    setup()
    expect((await post({ action: 'explode' })).status).toBe(400)
    expect((await post({ action: 'leave' })).status).toBe(400)
    expect((await post({ action: 'return', eventId: 'kein-uuid' })).status).toBe(400)
  })

  it('returns 404 for a foreign or normal (non-assessment) session', async () => {
    setup({ session: null })
    expect((await post({ action: 'resume' })).status).toBe(404)
    setup({ session: makeSession({ assessment_id: null }) })
    expect((await post({ action: 'resume' })).status).toBe(404)
  })

  it('ignores reports after the attempt was submitted', async () => {
    const { rpc } = setup({ session: makeSession({ status: 'completed' }) })
    const res = await post({ action: 'return', eventId: EVENT_ID, seconds: 10 })
    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ ignored: true, ended: true })
    expect(rpc).not.toHaveBeenCalled()
  })

  it('does nothing when tracking is switched off for the assessment', async () => {
    const { rpc } = setup({ assessment: { focus_tracking: false, focus_auto_submit_after: null } })
    const res = await post({ action: 'leave', eventId: EVENT_ID })
    expect(await res.json()).toEqual({ tracking: false })
    expect(rpc).not.toHaveBeenCalled()
  })

  it('rejects reports after the deadline (time limit + grace)', async () => {
    const { rpc } = setup({ session: makeSession({ started_at: new Date(Date.now() - 40 * 60_000).toISOString() }) })
    const res = await post({ action: 'return', eventId: EVENT_ID, seconds: 5 })
    expect(res.status).toBe(409)
    expect(rpc).not.toHaveBeenCalled()
  })

  it('passes the server clock, the threshold and the report to the database function', async () => {
    const { rpc } = setup()
    const res = await post({ action: 'return', eventId: EVENT_ID, questionNumber: 4, seconds: 12 })
    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ countedSwitches: 1, warn: true, autoSubmitted: false })
    const args = rpc.mock.calls[0][1]
    expect(rpc.mock.calls[0][0]).toBe('focus_report')
    expect(args).toMatchObject({
      p_session_id: 'sess-1',
      p_action: 'return',
      p_event_id: EVENT_ID,
      p_question_number: 4,
      p_client_seconds: 12,
      p_count_from_seconds: 3,
      p_max_events: 200,
    })
    expect(Math.abs(new Date(args.p_effective_now).getTime() - Date.now())).toBeLessThan(5_000)
  })

  it('answers 429 when the database function reports the rate limit', async () => {
    setup({ rpc: { data: { rateLimited: true }, error: null } })
    expect((await post({ action: 'leave', eventId: EVENT_ID })).status).toBe(429)
  })

  it('answers 500 when the database function fails', async () => {
    setup({ rpc: { data: null, error: { message: 'boom' } } })
    expect((await post({ action: 'leave', eventId: EVENT_ID })).status).toBe(500)
  })

  it('does not submit below the auto-submit limit', async () => {
    setup({ assessment: { focus_tracking: true, focus_auto_submit_after: 3 } })
    const res = await post({ action: 'return', eventId: EVENT_ID, seconds: 12 })
    expect(await res.json()).toMatchObject({ autoSubmitted: false, autoSubmitAfter: 3 })
    expect(finishAssessmentAttempt).not.toHaveBeenCalled()
  })

  it('submits automatically on the server once the limit is reached', async () => {
    setup({
      assessment: { focus_tracking: true, focus_auto_submit_after: 2 },
      rpc: { data: { countedSwitches: 2, countedSeconds: 30, shortCount: 0, autoSubmitted: false, warn: true }, error: null },
    })
    const res = await post({ action: 'return', eventId: EVENT_ID, seconds: 12 })
    expect(await res.json()).toMatchObject({ autoSubmitted: true, autoSubmitAfter: 2, countedSwitches: 2 })
    expect(finishAssessmentAttempt).toHaveBeenCalledTimes(1)
    expect(vi.mocked(finishAssessmentAttempt).mock.calls[0][0]).toMatchObject({ action: 'submit', answers: {} })
  })

  it('does not submit twice when another request already claimed the auto-submit', async () => {
    setup({
      assessment: { focus_tracking: true, focus_auto_submit_after: 2 },
      rpc: { data: { countedSwitches: 3, countedSeconds: 30, shortCount: 0, autoSubmitted: false, warn: true }, error: null },
      claimed: [],
    })
    const res = await post({ action: 'return', eventId: EVENT_ID, seconds: 12 })
    expect(await res.json()).toMatchObject({ autoSubmitted: false })
    expect(finishAssessmentAttempt).not.toHaveBeenCalled()
  })

  it('does not submit again when the database already marked the attempt as auto-submitted', async () => {
    setup({
      assessment: { focus_tracking: true, focus_auto_submit_after: 1 },
      rpc: { data: { countedSwitches: 1, countedSeconds: 30, shortCount: 0, autoSubmitted: true, warn: false }, error: null },
    })
    await post({ action: 'resume' })
    expect(finishAssessmentAttempt).not.toHaveBeenCalled()
  })

  it('releases the claim and reports an error when the automatic submit fails', async () => {
    const { summaryUpdate } = setup({
      assessment: { focus_tracking: true, focus_auto_submit_after: 1 },
    })
    vi.mocked(finishAssessmentAttempt).mockResolvedValueOnce({ ok: false, status: 500, error: 'x' })
    const res = await post({ action: 'return', eventId: EVENT_ID, seconds: 12 })
    expect(res.status).toBe(500)
    expect(summaryUpdate).toHaveBeenLastCalledWith({ auto_submitted: false })
  })
})
