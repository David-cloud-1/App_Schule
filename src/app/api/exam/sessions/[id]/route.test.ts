import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/supabase-server', () => ({
  createClient: vi.fn(),
  createServiceClient: vi.fn(),
}))
vi.mock('@/lib/answer-key', () => ({
  fetchAnswerKey: vi.fn(async () => new Map([
    ['q1', { explanation: 'weil A', sampleAnswer: null, options: new Map([['a', true], ['b', false]]) }],
  ])),
}))

import { PATCH } from './route'
import { createClient, createServiceClient } from '@/lib/supabase-server'
import { IHK_DEFAULT_SCALE } from '@/lib/graded-assessments'

const snapshot = [{
  id: 'q1', question_text: 'Q1', type: 'multiple_choice', difficulty: 'leicht', part: 1,
  explanation: null, sample_answer: null,
  answer_options: [{ id: 'a', option_text: 'A', display_order: 1 }, { id: 'b', option_text: 'B', display_order: 2 }],
}]

function makeSession(startedMinutesAgo: number, draft: Record<string, string> = {}) {
  return {
    id: 'sess-1',
    user_id: 'user-1',
    status: 'in_progress',
    assessment_id: 'as-1',
    started_at: new Date(Date.now() - startedMinutesAgo * 60_000).toISOString(),
    results_json: {
      durationMinutes: 30,
      assessment: { title: 'LN', accessCode: 'ABCDEF', released: false },
      parts: { '1': snapshot },
      draft_answers: draft,
    },
  }
}

function setup(session: ReturnType<typeof makeSession>, releasedAt: string | null = null) {
  const update = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) })
  const userClient = {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }) },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: session }),
      update,
    })),
  }
  const serviceClient = {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { title: 'LN', access_code: 'ABCDEF', part: 1, grading_scale: IHK_DEFAULT_SCALE, results_released_at: releasedAt },
      }),
    })),
  }
  vi.mocked(createClient).mockResolvedValue(userClient as never)
  vi.mocked(createServiceClient).mockReturnValue(serviceClient as never)
  return { update }
}

function patch(body: unknown) {
  return PATCH(
    new NextRequest(new URL('http://localhost/api/exam/sessions/sess-1'), {
      method: 'PATCH',
      body: JSON.stringify(body),
      headers: { 'content-type': 'application/json' },
    }),
    { params: Promise.resolve({ id: 'sess-1' }) },
  )
}

describe('PATCH /api/exam/sessions/[id] — Leistungsnachweis', () => {
  beforeEach(() => vi.clearAllMocks())

  it('rejects autosave after the time limit (server-side, not just the browser timer)', async () => {
    setup(makeSession(40)) // 30 min + 1 min grace already over
    const res = await patch({ action: 'save', answers: { q1: 'a' } })
    expect(res.status).toBe(409)
  })

  it('accepts autosave inside the time limit', async () => {
    const { update } = setup(makeSession(5))
    const res = await patch({ action: 'save', answers: { q1: 'a' } })
    expect(res.status).toBe(200)
    expect(update.mock.calls[0][0].results_json.draft_answers).toEqual({ q1: 'a' })
  })

  it('ignores answers sent with a late submit and keeps only what was saved in time', async () => {
    const { update } = setup(makeSession(40, { q1: 'b' }))
    await patch({ action: 'submit', answers: { q1: 'a' } })
    expect(update.mock.calls[0][0].results_json.submitted_answers).toEqual({ q1: 'b' })
  })

  it('stores no answer key and no grade before release', async () => {
    const { update } = setup(makeSession(5))
    await patch({ action: 'submit', answers: { q1: 'a' } })
    const written = update.mock.calls[0][0]
    expect(written.status).toBe('completed')
    expect(JSON.stringify(written.results_json)).not.toContain('is_correct')
    expect(JSON.stringify(written.results_json)).not.toContain('weil A')
    expect(written.results_json.assessment).toEqual({ title: 'LN', accessCode: 'ABCDEF', released: false })
  })

  it('grades a straggler submission immediately when results were already released', async () => {
    const { update } = setup(makeSession(5), '2026-01-01T10:00:00Z')
    await patch({ action: 'abort', answers: { q1: 'a' } })
    const written = update.mock.calls[0][0]
    expect(written.status).toBe('aborted')
    expect(written.results_json.assessment).toMatchObject({ released: true, points: 1, totalPoints: 1, grade: 1 })
    expect(written.results_json.parts['1'].questions[0]).toMatchObject({ is_correct: true, explanation: 'weil A' })
  })
})
