import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase-server', () => ({ createServiceClient: vi.fn() }))
vi.mock('@/lib/answer-key', () => ({ fetchAnswerKey: vi.fn().mockResolvedValue(new Map()) }))

import { createServiceClient } from '@/lib/supabase-server'
import { finalizeOverdueAttempts } from './assessment-submit'

const MIN = 60 * 1000

function session(id: string, startedMinutesAgo: number, durationMinutes: number) {
  return {
    id,
    started_at: new Date(Date.now() - startedMinutesAgo * MIN).toISOString(),
    assessment_id: 'as-1',
    results_json: { durationMinutes, parts: { '1': [] }, draft_answers: { q1: 'a' } },
  }
}

function setup(sessions: unknown[]) {
  const updates: { id: string; values: Record<string, unknown> }[] = []
  const sessionsBuilder = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    update: vi.fn((values: Record<string, unknown>) => ({
      eq: vi.fn(async (_col: string, id: string) => {
        updates.push({ id, values })
        return { error: null }
      }),
    })),
  }
  // select().eq().eq() liefert die Sitzungen
  let eqCalls = 0
  sessionsBuilder.eq = vi.fn(() => {
    eqCalls += 1
    return eqCalls >= 2 ? Promise.resolve({ data: sessions }) : sessionsBuilder
  }) as never
  const assessmentBuilder = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({
      data: { title: 'T', access_code: 'ABC', part: 1, grading_scale: [], results_released_at: null, focus_tracking: false },
    }),
  }
  vi.mocked(createServiceClient).mockReturnValue({
    from: (table: string) => (table === 'exam_sessions' ? sessionsBuilder : assessmentBuilder),
  } as never)
  return updates
}

beforeEach(() => vi.clearAllMocks())

describe('finalizeOverdueAttempts', () => {
  it('schließt eine abgelaufene Sitzung ab und wertet nur den Autosave', async () => {
    const updates = setup([session('s1', 30, 5)])
    expect(await finalizeOverdueAttempts('as-1')).toBe(1)
    expect(updates).toHaveLength(1)
    expect(updates[0].values.status).toBe('completed')
    expect(updates[0].values.ended_at).toBeTruthy()
    expect((updates[0].values.results_json as { submitted_answers: unknown }).submitted_answers).toEqual({ q1: 'a' })
  })

  it('lässt eine Sitzung innerhalb der Frist unberührt', async () => {
    const updates = setup([session('s1', 2, 5)])
    expect(await finalizeOverdueAttempts('as-1')).toBe(0)
    expect(updates).toHaveLength(0)
  })

  it('gewährt die Kulanzminute nach Ablauf der Dauer', async () => {
    const updates = setup([session('s1', 5.5, 5)])
    expect(await finalizeOverdueAttempts('as-1')).toBe(0)
    expect(updates).toHaveLength(0)
  })

  it('macht ohne offene Sitzungen nichts', async () => {
    setup([])
    expect(await finalizeOverdueAttempts('as-1')).toBe(0)
  })
})
