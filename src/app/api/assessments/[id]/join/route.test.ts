import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { chainMock, hasCall } from '@/test/supabase-chain-mock'
import { POST } from './route'

vi.mock('@/lib/supabase-server', () => ({
  createClient: vi.fn(),
  createServiceClient: vi.fn(),
}))
vi.mock('@/lib/departments-server', () => ({
  getDepartmentOfUser: vi.fn(async () => ({ id: 'dept-sped' })),
}))
vi.mock('@/lib/answer-key', () => ({
  fetchAnswerKey: vi.fn(async () => new Map()),
  attachAnswerKey: vi.fn(async (qs: unknown[]) => qs),
  getLockedQuestionIds: vi.fn(async () => new Set()),
}))

import { createClient, createServiceClient } from '@/lib/supabase-server'

const ASSESSMENT = {
  id: 'a-1',
  title: 'LN Tourismus',
  access_code: '7K2MQX',
  part: 1,
  duration_minutes: 45,
  status: 'open',
  opens_at: new Date(Date.now() - 60_000).toISOString(),
  closes_at: new Date(Date.now() + 3_600_000).toISOString(),
  question_ids_snapshot: ['q1', 'q2', 'q3', 'q4', 'q5'],
  department_id: 'dept-tour',
}

function request(body: unknown) {
  return new NextRequest(new URL('http://localhost/api/assessments/a-1/join'), {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  })
}

let service: ReturnType<typeof chainMock>

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(createClient).mockResolvedValue(
    chainMock(() => ({ data: null }), {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }) },
    }).client as never,
  )
})

describe('POST /api/assessments/[id]/join — Bereichstrennung (PROJ-23)', () => {
  it('lehnt den Beitritt zu einem Nachweis eines anderen Bereichs ab und legt keine Sitzung an', async () => {
    service = chainMock((table) => (table === 'graded_assessments' ? { data: ASSESSMENT } : { data: [] }))
    vi.mocked(createServiceClient).mockReturnValue(service.client as never)

    const res = await POST(request({ code: '7K2MQX', participantName: 'Max Muster' }), { params: Promise.resolve({ id: 'a-1' }) })

    expect(res.status).toBe(403)
    expect((await res.json()).error).toBe('Dieser Code gehört zu einem anderen Fachbereich.')
    expect(service.queries.some((q) => q.table === 'exam_sessions' && hasCall(q.calls, 'insert'))).toBe(false)
  })

  it('prüft den Bereich erst nach dem Code — ein falscher Code bleibt „Ungültiger Code."', async () => {
    service = chainMock((table) => (table === 'graded_assessments' ? { data: ASSESSMENT } : {}))
    vi.mocked(createServiceClient).mockReturnValue(service.client as never)

    const res = await POST(request({ code: 'FALSCH', participantName: 'Max Muster' }), { params: Promise.resolve({ id: 'a-1' }) })

    expect(res.status).toBe(404)
    expect((await res.json()).error).toBe('Ungültiger Code.')
  })
})

describe('POST /api/assessments/[id]/join — Gruppen A/B (PROJ-76)', () => {
  const ids = ['q1', 'q2', 'q3', 'q4', 'q5']
  const questionRows = ids.map((id) => ({
    id,
    question_text: `Frage ${id}`,
    type: 'multiple_choice',
    difficulty: 'easy',
    answer_options: [1, 2, 3].map((n) => ({ id: `${id}-o${n}`, option_text: `Option ${n}`, display_order: n })),
  }))
  const orders = {
    A: { questionOrder: ids, optionOrder: Object.fromEntries(ids.map((id) => [id, [`${id}-o1`, `${id}-o2`, `${id}-o3`]])) },
    B: {
      questionOrder: ['q5', 'q4', 'q3', 'q2', 'q1'],
      optionOrder: Object.fromEntries(ids.map((id) => [id, [`${id}-o3`, `${id}-o1`, `${id}-o2`]])),
    },
  }

  function setup(slot: number | null) {
    const rpc = vi.fn(async () => (slot === null ? { data: null, error: { message: 'boom' } } : { data: slot, error: null }))
    service = chainMock(
      (table) => {
        if (table === 'graded_assessments') {
          return { data: { ...ASSESSMENT, department_id: 'dept-sped', groups_enabled: true, group_orders: orders } }
        }
        if (table === 'questions') return { data: questionRows }
        return { data: null }
      },
      { rpc },
    )
    vi.mocked(createServiceClient).mockReturnValue(service.client as never)
    const user = chainMock(
      (table, calls) => {
        if (table === 'exam_sessions' && calls.some((c) => c.method === 'insert')) return { data: { id: 'sess-1' } }
        return { data: null }
      },
      { auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }) } },
    )
    vi.mocked(createClient).mockResolvedValue(user.client as never)
    return { rpc, user }
  }

  type Inserted = {
    group_label: string | null
    results_json: { parts: Record<string, { id: string; answer_options: { id: string; display_order: number }[] }[]> }
  }

  it('erste Position → Gruppe A in Originalreihenfolge', async () => {
    const { user } = setup(0)
    const res = await POST(request({ code: '7K2MQX', participantName: 'Max Muster' }), { params: Promise.resolve({ id: 'a-1' }) })
    expect(res.status).toBe(200)
    const insert = user.writes.find((w) => w.table === 'exam_sessions')!.payload as Inserted
    expect(insert.group_label).toBe('A')
    expect(insert.results_json.parts['1'].map((q) => q.id)).toEqual(ids)
  })

  it('zweite Position → Gruppe B mit gespeicherter Frage- und Antwortreihenfolge', async () => {
    const { user } = setup(1)
    const res = await POST(request({ code: '7K2MQX', participantName: 'Max Muster' }), { params: Promise.resolve({ id: 'a-1' }) })
    expect(res.status).toBe(200)
    const insert = user.writes.find((w) => w.table === 'exam_sessions')!.payload as Inserted
    expect(insert.group_label).toBe('B')
    const qs = insert.results_json.parts['1']
    expect(qs.map((q) => q.id)).toEqual(['q5', 'q4', 'q3', 'q2', 'q1'])
    expect(qs[0].answer_options.map((o) => [o.id, o.display_order])).toEqual([['q5-o3', 1], ['q5-o1', 2], ['q5-o2', 3]])
  })

  it('schlägt die Zuteilung fehl, wird keine Sitzung angelegt', async () => {
    const { user } = setup(null)
    const res = await POST(request({ code: '7K2MQX', participantName: 'Max Muster' }), { params: Promise.resolve({ id: 'a-1' }) })
    expect(res.status).toBe(500)
    expect(user.writes.some((w) => w.table === 'exam_sessions')).toBe(false)
  })

  it('ohne Gruppen bleibt die Gruppe leer', async () => {
    const rpc = vi.fn()
    service = chainMock(
      (table) => {
        if (table === 'graded_assessments') return { data: { ...ASSESSMENT, department_id: 'dept-sped', groups_enabled: false, group_orders: null } }
        if (table === 'questions') return { data: questionRows }
        return { data: null }
      },
      { rpc },
    )
    vi.mocked(createServiceClient).mockReturnValue(service.client as never)
    const user = chainMock(
      (table, calls) => (table === 'exam_sessions' && calls.some((c) => c.method === 'insert') ? { data: { id: 's' } } : { data: null }),
      { auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }) } },
    )
    vi.mocked(createClient).mockResolvedValue(user.client as never)
    await POST(request({ code: '7K2MQX', participantName: 'Max Muster' }), { params: Promise.resolve({ id: 'a-1' }) })
    expect(rpc).not.toHaveBeenCalled()
    expect((user.writes.find((w) => w.table === 'exam_sessions')!.payload as Inserted).group_label).toBeNull()
  })
})
