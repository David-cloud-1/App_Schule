import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { chainMock } from '@/test/supabase-chain-mock'

vi.mock('@/lib/supabase-server', () => ({ createServiceClient: vi.fn() }))
vi.mock('../../../../_lib/auth', () => ({
  requireTeacherOrAdmin: vi.fn(),
  assertCanViewAssessment: vi.fn(() => null),
}))

import { createServiceClient } from '@/lib/supabase-server'
import { requireTeacherOrAdmin } from '../../../../_lib/auth'
import { PATCH } from './route'

const ORDERS = {
  A: { questionOrder: ['q1', 'q2'], optionOrder: { q1: ['a', 'b'], q2: ['c', 'd'] } },
  B: { questionOrder: ['q2', 'q1'], optionOrder: { q1: ['b', 'a'], q2: ['d', 'c'] } },
}
const ASSESSMENT = { department_id: 'd', created_by: 'u', shared_with_department: false, part: 1, groups_enabled: true, group_orders: ORDERS }
const SESSION = (over: Record<string, unknown> = {}) => ({
  id: 's1',
  status: 'in_progress',
  group_label: 'A',
  results_json: {
    parts: {
      '1': [
        { id: 'q1', answer_options: [{ id: 'a', display_order: 1 }, { id: 'b', display_order: 2 }] },
        { id: 'q2', answer_options: [{ id: 'c', display_order: 1 }, { id: 'd', display_order: 2 }] },
      ],
    },
    draft_answers: {},
  },
  ...over,
})

function setup(session: unknown, assessment: unknown = ASSESSMENT) {
  const teacher = chainMock(() => ({ data: assessment }))
  vi.mocked(requireTeacherOrAdmin).mockResolvedValue({ error: null, supabase: teacher.client, user: { id: 'u' } } as never)
  const service = chainMock((table, calls) =>
    table === 'exam_sessions' && !calls.some((c) => c.method === 'update') ? { data: session } : { data: null },
  )
  vi.mocked(createServiceClient).mockReturnValue(service.client as never)
  return service
}
const call = (body: unknown) =>
  PATCH(
    new NextRequest('http://localhost/x', { method: 'PATCH', body: JSON.stringify(body), headers: { 'content-type': 'application/json' } }),
    { params: Promise.resolve({ id: 'a1', sessionId: 's1' }) },
  )

beforeEach(() => vi.clearAllMocks())

describe('PATCH participants — Gruppe wechseln (PROJ-76)', () => {
  it('stellt Fragen und Antworten auf die andere Gruppe um', async () => {
    const service = setup(SESSION())
    const res = await call({ group: 'B' })
    expect(res.status).toBe(200)
    const payload = service.writes.find((w) => w.method === 'update')!.payload as {
      group_label: string
      results_json: { parts: Record<string, { id: string; answer_options: { id: string }[] }[]> }
    }
    expect(payload.group_label).toBe('B')
    expect(payload.results_json.parts['1'].map((q) => q.id)).toEqual(['q2', 'q1'])
    expect(payload.results_json.parts['1'][1].answer_options.map((o) => o.id)).toEqual(['b', 'a'])
  })

  it('verweigert den Wechsel, sobald Antworten gespeichert sind', async () => {
    const service = setup(SESSION({ results_json: { parts: {}, draft_answers: { q1: 'a' } } }))
    const res = await call({ group: 'B' })
    expect(res.status).toBe(409)
    expect(service.writes).toHaveLength(0)
  })

  it('verweigert den Wechsel nach der Abgabe', async () => {
    const service = setup(SESSION({ status: 'completed' }))
    const res = await call({ group: 'B' })
    expect(res.status).toBe(409)
    expect(service.writes).toHaveLength(0)
  })

  it('lehnt Gruppen bei Nachweisen ohne Gruppen ab', async () => {
    setup(SESSION(), { ...ASSESSMENT, groups_enabled: false, group_orders: null })
    expect((await call({ group: 'B' })).status).toBe(400)
  })

  it('lässt „zählt in der Wertung“ weiter funktionieren', async () => {
    const service = setup(SESSION())
    const res = await call({ excluded: true })
    expect(res.status).toBe(200)
    expect(service.writes[0].payload).toEqual({ excluded_from_grading: true })
  })
})
