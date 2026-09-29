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
