import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'
import { chainMock, hasCall } from '@/test/supabase-chain-mock'

const writeAuditLog = vi.fn(async () => {})
vi.mock('../../../_lib/auth', () => ({
  requireTeacherOrAdmin: vi.fn(),
  writeAuditLog: (...args: unknown[]) => writeAuditLog(...(args as [])),
}))
import { requireTeacherOrAdmin } from '../../../_lib/auth'
import { PUT } from './route'

const ID = '660e8400-e29b-41d4-a716-446655440000'
const Q1 = '550e8400-e29b-41d4-a716-446655440001'
const Q2 = '550e8400-e29b-41d4-a716-446655440002'
const Q3 = '550e8400-e29b-41d4-a716-446655440003'

const ctx = (id = ID) => ({ params: Promise.resolve({ id }) })
const req = (body: unknown) => ({ json: async () => body }) as unknown as NextRequest

type Assessment = Record<string, unknown> | null
function setup(assessment: Assessment, updatedRows: unknown[] | null = [{ id: ID }]) {
  const m = chainMock((table, calls) => {
    if (table !== 'graded_assessments') return { data: null }
    if (hasCall(calls, 'update')) return { data: updatedRows }
    return { data: assessment }
  })
  vi.mocked(requireTeacherOrAdmin).mockResolvedValue({
    error: null,
    user: { id: 'teacher-1', email: 't@x.de' },
    supabase: m.client,
    role: 'teacher',
    isSuperAdmin: false,
    isDepartmentAdmin: false,
    suggestedDepartmentId: null,
  } as never)
  return m
}

const base = {
  id: ID,
  title: 'Test',
  status: 'closed',
  results_released_at: null,
  excluded_question_ids: [] as string[],
  question_ids_snapshot: [Q1, Q2, Q3],
  department_id: 'dep-1',
}

beforeEach(() => vi.clearAllMocks())

describe('PUT /api/admin/assessments/[id]/exclude-question', () => {
  it('gibt die Antwort der Anmeldeprüfung weiter', async () => {
    vi.mocked(requireTeacherOrAdmin).mockResolvedValue({
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
      user: null,
      supabase: null,
    } as never)
    expect((await PUT(req({ question_id: Q1, excluded: true }), ctx())).status).toBe(401)
  })

  it('lehnt ungültige Kennungen und Eingaben ab', async () => {
    setup(base)
    expect((await PUT(req({ question_id: Q1, excluded: true }), ctx('x'))).status).toBe(404)
    expect((await PUT(req({ question_id: 'x', excluded: true }), ctx())).status).toBe(400)
    expect((await PUT(req({ question_id: Q1 }), ctx())).status).toBe(400)
  })

  it('liefert 404, wenn der Nachweis nicht sichtbar ist', async () => {
    setup(null)
    expect((await PUT(req({ question_id: Q1, excluded: true }), ctx())).status).toBe(404)
  })

  it('sperrt die Änderung nach der Freigabe der Ergebnisse', async () => {
    const m = setup({ ...base, results_released_at: '2026-11-01T10:00:00Z' })
    const res = await PUT(req({ question_id: Q1, excluded: true }), ctx())
    expect(res.status).toBe(409)
    expect(m.writes).toHaveLength(0)
  })

  it('lehnt Entwürfe und fremde Fragen ab', async () => {
    setup({ ...base, status: 'draft' })
    expect((await PUT(req({ question_id: Q1, excluded: true }), ctx())).status).toBe(409)
    setup(base)
    expect(
      (await PUT(req({ question_id: '550e8400-e29b-41d4-a716-4466554400ff', excluded: true }), ctx())).status,
    ).toBe(400)
  })

  it('verhindert, dass alle Fragen aus der Wertung genommen werden', async () => {
    const m = setup({ ...base, excluded_question_ids: [Q1, Q2] })
    const res = await PUT(req({ question_id: Q3, excluded: true }), ctx())
    expect(res.status).toBe(400)
    expect(m.writes).toHaveLength(0)
  })

  it('nimmt eine Frage heraus und protokolliert es', async () => {
    const m = setup(base)
    const res = await PUT(req({ question_id: Q2, excluded: true }), ctx())
    expect(res.status).toBe(200)
    expect((await res.json()).excludedQuestionIds).toEqual([Q2])
    expect(m.writes[0]).toMatchObject({ table: 'graded_assessments', method: 'update', payload: { excluded_question_ids: [Q2] } })
    expect(writeAuditLog).toHaveBeenCalledTimes(1)
  })

  it('nimmt eine Frage wieder auf', async () => {
    const m = setup({ ...base, excluded_question_ids: [Q1, Q2] })
    const res = await PUT(req({ question_id: Q1, excluded: false }), ctx())
    expect(res.status).toBe(200)
    expect((await res.json()).excludedQuestionIds).toEqual([Q2])
    expect(m.writes[0].payload).toEqual({ excluded_question_ids: [Q2] })
  })

  it('ist bei bereits erfolgter Änderung ein No-Op ohne Schreiben', async () => {
    const m = setup({ ...base, excluded_question_ids: [Q2] })
    const res = await PUT(req({ question_id: Q2, excluded: true }), ctx())
    expect(res.status).toBe(200)
    expect(m.writes).toHaveLength(0)
    expect(writeAuditLog).not.toHaveBeenCalled()
  })

  it('meldet 403, wenn der Zeilenschutz die Änderung nicht zulässt', async () => {
    setup(base, [])
    const res = await PUT(req({ question_id: Q2, excluded: true }), ctx())
    expect(res.status).toBe(403)
    expect(writeAuditLog).not.toHaveBeenCalled()
  })

  it('speichert nur, wenn die Ausschlussliste noch wie gelesen aussieht (QA PROJ-75 B6)', async () => {
    const m = setup({ ...base, excluded_question_ids: [Q2] })
    expect((await PUT(req({ question_id: Q1, excluded: true }), ctx())).status).toBe(200)
    const upd = m.queries.find((q) => q.table === 'graded_assessments' && hasCall(q.calls, 'update'))!
    expect(upd.calls.find((c) => c.method === 'eq' && c.args[0] === 'excluded_question_ids')?.args[1]).toBe(`{${Q2}}`)
  })

  it('meldet 409 statt 403, wenn jemand gleichzeitig eine andere Frage ausgenommen hat', async () => {
    let reads = 0
    const m = chainMock((table, calls) => {
      if (table !== 'graded_assessments') return { data: null }
      if (hasCall(calls, 'update')) return { data: [] }
      reads++
      return { data: reads === 1 ? base : { ...base, excluded_question_ids: [Q3] } }
    })
    vi.mocked(requireTeacherOrAdmin).mockResolvedValue({
      error: null,
      user: { id: 'teacher-1', email: 't@x.de' },
      supabase: m.client,
      role: 'teacher',
    } as never)
    expect((await PUT(req({ question_id: Q1, excluded: true }), ctx())).status).toBe(409)
  })
})
