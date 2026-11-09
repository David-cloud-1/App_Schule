import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'
import { chainMock, hasCall } from '@/test/supabase-chain-mock'

const writeAuditLog = vi.fn(async () => {})
vi.mock('../../../_lib/auth', () => ({
  requireTeacherOrAdmin: vi.fn(),
  writeAuditLog: (...args: unknown[]) => writeAuditLog(...(args as [])),
}))
vi.mock('@/lib/assessment-questions', () => ({
  fetchSelectableQuestions: vi.fn(async () => []),
  derivePartNumber: vi.fn(() => 2),
}))
vi.mock('@/lib/exam-parts', () => ({ fetchExamParts: vi.fn(async () => [{ partNumber: 2 }]) }))
vi.mock('@/lib/assessment-category', () => ({
  resolveCategory: vi.fn(async (_s: unknown, _d: unknown, input: { className?: string | null; subjectId?: string | null }) => ({
    ok: true,
    columns: { class_name: input.className ?? null, subject_id: input.subjectId ?? null },
  })),
}))
import { requireTeacherOrAdmin } from '../../../_lib/auth'
import { POST } from './route'

const ID = '660e8400-e29b-41d4-a716-446655440000'
const NEW_ID = '770e8400-e29b-41d4-a716-446655440000'
const DEP = '880e8400-e29b-41d4-a716-446655440000'
const OTHER_DEP = '990e8400-e29b-41d4-a716-446655440000'
const Q = ['a', 'b', 'c', 'd', 'e'].map((c) => `550e8400-e29b-41d4-a716-44665544000${c === 'a' ? '1' : c === 'b' ? '2' : c === 'c' ? '3' : c === 'd' ? '4' : '5'}`)

const ctx = (id = ID) => ({ params: Promise.resolve({ id }) })
const req = (body: unknown = {}) => ({ json: async () => body }) as unknown as NextRequest

const original = {
  id: ID,
  title: 'Klausur BGP',
  part: 1,
  status: 'closed',
  department_id: DEP,
  duration_minutes: 45,
  grading_scale: [{ grade: 1, minPercent: 92 }],
  shuffle: true,
  focus_tracking: true,
  focus_auto_submit_after: 3,
  class_name: 'FIL 11a',
  subject_id: 's1',
  question_ids_snapshot: Q,
  draft_question_ids: null,
  access_code: 'ALTCODE1',
  results_released_at: '2026-11-01T10:00:00Z',
  exam_question_sets: null,
}

function setup(assessment: unknown, existingTitles: string[] = [], suggested: string | null = DEP) {
  const m = chainMock((table, calls) => {
    if (table === 'departments') return { data: { id: DEP } }
    if (table === 'graded_assessments') {
      if (hasCall(calls, 'insert')) return { data: { id: NEW_ID } }
      if (hasCall(calls, 'ilike')) return { data: existingTitles.map((title) => ({ title })) }
      if (calls.some((c) => c.method === 'eq' && c.args[0] === 'access_code')) return { data: null }
      return { data: assessment }
    }
    return { data: null }
  })
  vi.mocked(requireTeacherOrAdmin).mockResolvedValue({
    error: null,
    user: { id: 'teacher-1', email: 't@x.de' },
    supabase: m.client,
    isSuperAdmin: false,
    suggestedDepartmentId: suggested,
  } as never)
  return m
}

beforeEach(() => vi.clearAllMocks())

describe('POST /api/admin/assessments/[id]/duplicate', () => {
  it('gibt die Antwort der Anmeldeprüfung weiter', async () => {
    vi.mocked(requireTeacherOrAdmin).mockResolvedValue({
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
      user: null,
      supabase: null,
    } as never)
    expect((await POST(req(), ctx())).status).toBe(401)
  })

  it('liefert 404 bei ungültiger Kennung und bei unsichtbarem Nachweis', async () => {
    setup(original)
    expect((await POST(req(), ctx('x'))).status).toBe(404)
    setup(null)
    expect((await POST(req(), ctx())).status).toBe(404)
    expect(writeAuditLog).not.toHaveBeenCalled()
  })

  it('lehnt einen zu langen Titel ab', async () => {
    setup(original)
    expect((await POST(req({ title: 'x'.repeat(101) }), ctx())).status).toBe(400)
  })

  it('legt einen Entwurf mit Fragen und Einstellungen an, aber ohne Ergebnisse und mit neuem Code', async () => {
    const m = setup(original)
    const res = await POST(req(), ctx())
    expect(res.status).toBe(201)
    expect((await res.json()).id).toBe(NEW_ID)
    const insert = m.writes.find((w) => w.method === 'insert')!.payload as Record<string, unknown>
    expect(insert.title).toBe('Klausur BGP (Kopie)')
    expect(insert.draft_question_ids).toEqual(Q)
    expect(insert.duration_minutes).toBe(45)
    expect(insert.grading_scale).toEqual(original.grading_scale)
    expect(insert.shuffle).toBe(true)
    expect(insert.focus_tracking).toBe(true)
    expect(insert.focus_auto_submit_after).toBe(3)
    expect(insert.class_name).toBe('FIL 11a')
    expect(insert.copied_from_id).toBe(ID)
    expect(insert.copied_from_title).toBe('Klausur BGP')
    expect(insert.created_by).toBe('teacher-1')
    expect(insert.access_code).not.toBe('ALTCODE1')
    expect(insert).not.toHaveProperty('status')
    expect(insert).not.toHaveProperty('results_released_at')
    expect(insert).not.toHaveProperty('question_ids_snapshot')
    expect(new Date(insert.closes_at as string).getTime()).toBeGreaterThan(new Date(insert.opens_at as string).getTime())
    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ action_type: 'graded_assessment.duplicate', object_id: NEW_ID }),
    )
  })

  it('zählt den Titel bei weiteren Kopien hoch', async () => {
    const m = setup(original, ['Klausur BGP (Kopie)', 'Klausur BGP (Kopie 2)'])
    await POST(req(), ctx())
    const insert = m.writes.find((w) => w.method === 'insert')!.payload as Record<string, unknown>
    expect(insert.title).toBe('Klausur BGP (Kopie 3)')
  })

  it('übernimmt einen eigenen Titel', async () => {
    const m = setup(original)
    await POST(req({ title: 'Parallelklasse' }), ctx())
    expect((m.writes.find((w) => w.method === 'insert')!.payload as Record<string, unknown>).title).toBe('Parallelklasse')
  })

  it('übernimmt bei einem Entwurf die Entwurfsliste, behält Platzhalter-IDs und gehört dem eigenen Bereich', async () => {
    const m = setup(
      { ...original, status: 'draft', question_ids_snapshot: null, draft_question_ids: [Q[0], Q[1]] },
      [],
      OTHER_DEP,
    )
    // Zielbereich muss existieren – der Mock kennt nur DEP, daher ausdrücklich wählen
    const res = await POST(req({ departmentId: DEP }), ctx())
    expect(res.status).toBe(201)
    const insert = m.writes.find((w) => w.method === 'insert')!.payload as Record<string, unknown>
    expect(insert.draft_question_ids).toEqual([Q[0], Q[1]])
    expect(insert.department_id).toBe(DEP)
  })

  it('leitet den Prüfungsteil bei Bereichswechsel neu ab und verwirft das Fach', async () => {
    const m = setup({ ...original, department_id: OTHER_DEP })
    const res = await POST(req({ departmentId: DEP }), ctx())
    expect(res.status).toBe(201)
    const insert = m.writes.find((w) => w.method === 'insert')!.payload as Record<string, unknown>
    expect(insert.part).toBe(2)
    expect(insert.subject_id).toBeNull()
    expect(insert.department_id).toBe(DEP)
  })

  it('meldet 500, wenn das Anlegen scheitert', async () => {
    const m = chainMock((table, calls) => {
      if (table === 'departments') return { data: { id: DEP } }
      if (hasCall(calls, 'insert')) return { data: null, error: { message: 'x' } }
      if (hasCall(calls, 'ilike')) return { data: [] }
      if (calls.some((c) => c.method === 'eq' && c.args[0] === 'access_code')) return { data: null }
      return { data: original }
    })
    vi.mocked(requireTeacherOrAdmin).mockResolvedValue({
      error: null,
      user: { id: 'teacher-1' },
      supabase: m.client,
      suggestedDepartmentId: DEP,
    } as never)
    vi.spyOn(console, 'error').mockImplementation(() => {})
    expect((await POST(req(), ctx())).status).toBe(500)
    expect(writeAuditLog).not.toHaveBeenCalled()
  })
})
