import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'
import { chainMock, hasCall } from '@/test/supabase-chain-mock'

const writeAuditLog = vi.fn(async () => {})
vi.mock('../../../_lib/auth', () => ({
  requireTeacherOrAdmin: vi.fn(),
  writeAuditLog: (...args: unknown[]) => writeAuditLog(...(args as [])),
}))
vi.mock('@/lib/assessment-candidates', () => ({ loadCandidates: vi.fn() }))
import { requireTeacherOrAdmin } from '../../../_lib/auth'
import { loadCandidates } from '@/lib/assessment-candidates'
import { POST } from './route'

const ID = '660e8400-e29b-41d4-a716-446655440000'
const uid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
const ctx = (id = ID) => ({ params: Promise.resolve({ id }) })
const req = (body: unknown) => ({ json: async () => body }) as unknown as NextRequest

function cand(n: number, over: Record<string, unknown> = {}) {
  return {
    id: uid(n),
    question_text: `Eigener Fragetext Nummer ${n} mit genug Länge für die Prüfung`,
    topic: 'A',
    class_level: 11,
    subject_codes: ['BGP'],
    isPrivate: false,
    attempts: 30,
    correct: 15,
    openReports: 0,
    blocked: false,
    level: 'mittel',
    rate: 50,
    rated: true,
    ...over,
  }
}

const draft = { id: ID, title: 'Kopie', department_id: 'dep', status: 'draft', created_by: 'teacher-1', draft_question_ids: [uid(1), uid(2), uid(3)] }

function setup(row: unknown = draft, questionRow: unknown = null) {
  const m = chainMock((table, calls) => {
    if (table === 'graded_assessments') return hasCall(calls, 'update') ? { data: null } : { data: row }
    if (table === 'questions') return { data: questionRow }
    return { data: null }
  })
  vi.mocked(requireTeacherOrAdmin).mockResolvedValue({
    error: null,
    user: { id: 'teacher-1' },
    supabase: m.client,
  } as never)
  return m
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(loadCandidates).mockResolvedValue({
    all: [cand(1), cand(2, { level: 'schwer' }), cand(3), cand(10), cand(11, { blocked: true }), cand(12, { openReports: 1 }), cand(13, { topic: 'B' })],
    statsAvailable: true,
  } as never)
})

describe('POST /api/admin/assessments/[id]/replace', () => {
  it('gibt die Antwort der Anmeldeprüfung weiter', async () => {
    vi.mocked(requireTeacherOrAdmin).mockResolvedValue({
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
      user: null,
      supabase: null,
    } as never)
    expect((await POST(req({ action: 'bulk', questionIds: [uid(1)] }), ctx())).status).toBe(401)
  })

  it('lehnt ungültige Eingaben, fremde Kennung und Nicht-Entwürfe ab', async () => {
    setup()
    expect((await POST(req({ action: 'nope' }), ctx())).status).toBe(400)
    expect((await POST(req({ action: 'alternatives', questionId: 'x' }), ctx())).status).toBe(400)
    expect((await POST(req({ action: 'bulk', questionIds: [uid(1)] }), ctx('x'))).status).toBe(404)
    setup(null)
    expect((await POST(req({ action: 'bulk', questionIds: [uid(1)] }), ctx())).status).toBe(404)
    setup({ ...draft, status: 'open' })
    expect((await POST(req({ action: 'bulk', questionIds: [uid(1)] }), ctx())).status).toBe(400)
  })

  it('bietet Ersatz nur aus gleichem Thema, ohne gesperrte, gemeldete und schon gewählte Fragen', async () => {
    setup()
    const res = await POST(req({ action: 'alternatives', questionId: uid(1) }), ctx())
    const body = await res.json()
    expect(body.topicKnown).toBe(true)
    expect(body.alternatives.map((a: { id: string }) => a.id)).toEqual([uid(10)])
  })

  it('weiß bei verschwundener Frage ohne Thema keinen Ersatz', async () => {
    setup(
      { ...draft, draft_question_ids: [uid(1), uid(2), uid(99)] },
      null,
    )
    const body = await (await POST(req({ action: 'alternatives', questionId: uid(99) }), ctx())).json()
    expect(body).toEqual({ alternatives: [], topicKnown: false })
  })

  it('nimmt für eine inaktive Frage das Thema aus der Datenbank', async () => {
    setup(
      { ...draft, draft_question_ids: [uid(1), uid(2), uid(99)] },
      { id: uid(99), question_text: 'Alte Frage', topics: { name: 'A' } },
    )
    const body = await (await POST(req({ action: 'alternatives', questionId: uid(99) }), ctx())).json()
    expect(body.alternatives.length).toBeGreaterThan(0)
  })

  it('meldet 409, wenn die Frage nicht mehr im Entwurf steht', async () => {
    setup()
    expect((await POST(req({ action: 'alternatives', questionId: uid(50) }), ctx())).status).toBe(409)
  })

  it('plant „alle auffälligen ersetzen“ ohne doppelten Ersatz und ohne etwas zu schreiben', async () => {
    const m = setup()
    vi.mocked(loadCandidates).mockResolvedValue({
      all: [cand(1), cand(2), cand(3), cand(10), cand(14)],
      statsAvailable: true,
    } as never)
    const body = await (await POST(req({ action: 'bulk', questionIds: [uid(1), uid(2), uid(3)] }), ctx())).json()
    const ids = body.items.map((i: { replacement: { id: string } | null }) => i.replacement?.id).filter(Boolean)
    expect(new Set(ids).size).toBe(ids.length)
    expect(body.items.filter((i: { replacement: unknown }) => i.replacement === null)).toHaveLength(1)
    expect(m.writes).toHaveLength(0)
  })

  describe('apply', () => {
    it('tauscht auf derselben Position und protokolliert', async () => {
      const m = setup()
      const res = await POST(req({ action: 'apply', swaps: [{ from: uid(2), to: uid(10) }], removes: [] }), ctx())
      expect(res.status).toBe(200)
      const update = m.writes.find((w) => w.method === 'update')!.payload as { draft_question_ids: string[] }
      expect(update.draft_question_ids).toEqual([uid(1), uid(10), uid(3)])
      expect(writeAuditLog).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ action_type: 'graded_assessment.replace_questions' }),
      )
    })

    it('entfernt Platzhalter, ohne den Rest zu verschieben', async () => {
      const m = setup()
      await POST(req({ action: 'apply', swaps: [], removes: [uid(1)] }), ctx())
      const update = m.writes.find((w) => w.method === 'update')!.payload as { draft_question_ids: string[] }
      expect(update.draft_question_ids).toEqual([uid(2), uid(3)])
    })

    it('lehnt unzulässigen oder schon vorhandenen Ersatz ab', async () => {
      const m = setup()
      expect((await POST(req({ action: 'apply', swaps: [{ from: uid(2), to: uid(3) }] }), ctx())).status).toBe(400)
      expect((await POST(req({ action: 'apply', swaps: [{ from: uid(2), to: uid(77) }] }), ctx())).status).toBe(400)
      expect(
        (await POST(req({ action: 'apply', swaps: [{ from: uid(1), to: uid(10) }, { from: uid(2), to: uid(10) }] }), ctx())).status,
      ).toBe(400)
      expect(m.writes).toHaveLength(0)
    })

    it('meldet 409, wenn sich die Liste inzwischen geändert hat', async () => {
      setup()
      expect((await POST(req({ action: 'apply', swaps: [{ from: uid(50), to: uid(10) }] }), ctx())).status).toBe(409)
    })
  })
})
