import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

const rpc = vi.fn()
/** rpc(...).gt().order().order().range() — liefert am Ende das Ergebnis */
function rpcResult(result: unknown) {
  const chain: Record<string, unknown> = {}
  for (const m of ['gt', 'order']) chain[m] = () => chain
  chain.range = vi.fn(() => Promise.resolve(result))
  rpc.mockReturnValue(chain)
  return chain
}
const limit = vi.fn()
const from = vi.fn()
vi.mock('../../_lib/auth', () => ({ requireTeacherOrAdmin: vi.fn() }))
vi.mock('@/lib/assessment-questions', () => ({ fetchSelectableQuestions: vi.fn() }))
import { requireTeacherOrAdmin } from '../../_lib/auth'
import { fetchSelectableQuestions } from '@/lib/assessment-questions'
import { POST } from './route'

const DEPT = '11111111-1111-4111-8111-111111111111'
const uid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`

const post = (body: unknown) =>
  POST(
    new NextRequest('http://localhost/api/admin/assessments/suggest', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'content-type': 'application/json' },
    }),
  )

const baseBody = {
  action: 'suggest',
  departmentId: DEPT,
  subjects: [],
  topics: [],
  classLevel: null,
  count: 5,
  mix: { leicht: 30, mittel: 50, schwer: 20 },
  exclude: { blocked: true, reported: true, recent: 0 },
}

function q(n: number, over: Record<string, unknown> = {}) {
  return {
    id: uid(n),
    question_text: `Frage ${n}`,
    difficulty: 'mittel',
    class_level: 11,
    topic: 'Thema A',
    subject_codes: ['BGP'],
    isPrivate: false,
    blocked: false,
    ...over,
  }
}
const stat = (n: number, attempts: number, correct: number, open_reports = 0) => ({
  question_id: uid(n),
  attempts,
  correct,
  open_reports,
})

beforeEach(() => {
  vi.clearAllMocks()
  from.mockReturnValue({
    select: () => ({ eq: () => ({ order: () => ({ limit }) }) }),
  })
  limit.mockResolvedValue({ data: [], error: null })
  vi.mocked(requireTeacherOrAdmin).mockResolvedValue({
    error: null,
    user: { id: 'u1', email: 'a@b.de' },
    supabase: { rpc, from },
  } as never)
  vi.mocked(fetchSelectableQuestions).mockResolvedValue([])
  rpcResult({ data: [], error: null })
})

describe('POST /api/admin/assessments/suggest', () => {
  it('gibt die Anmeldeprüfung weiter', async () => {
    vi.mocked(requireTeacherOrAdmin).mockResolvedValue({
      error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
      user: null,
      supabase: null,
    } as never)
    expect((await post(baseBody)).status).toBe(403)
    expect(fetchSelectableQuestions).not.toHaveBeenCalled()
  })

  it('lehnt ungültige Eingaben ab', async () => {
    expect((await post({ ...baseBody, count: 4 })).status).toBe(400)
    expect((await post({ ...baseBody, count: 61 })).status).toBe(400)
    expect((await post({ ...baseBody, mix: { leicht: 30, mittel: 50, schwer: 30 } })).status).toBe(400)
    expect((await post({ ...baseBody, departmentId: 'x' })).status).toBe(400)
    expect((await post({ ...baseBody, exclude: { blocked: true, reported: true, recent: 2 } })).status).toBe(400)
    expect((await post({ action: 'nope' })).status).toBe(400)
  })

  it('lässt gesperrte und gemeldete Fragen weg und stuft nach Lösungsquote ein', async () => {
    vi.mocked(fetchSelectableQuestions).mockResolvedValue([
      q(1), // leicht
      q(2), // schwer
      q(3), // mittel
      q(4, { blocked: true }),
      q(5), // offene Meldung
      q(6), // zu wenig Antworten → mittel
    ] as never)
    rpcResult({
      data: [stat(1, 40, 36), stat(2, 40, 8), stat(3, 40, 24), stat(4, 40, 24), stat(5, 40, 24, 1), stat(6, 3, 3)],
      error: null,
    })
    const res = await post(baseBody)
    expect(res.status).toBe(200)
    const body = await res.json()
    const ids = body.items.map((i: { id: string }) => i.id)
    expect(ids).not.toContain(uid(4))
    expect(ids).not.toContain(uid(5))
    expect(ids).toHaveLength(4)
    const by = Object.fromEntries(body.items.map((i: { id: string; level: string }) => [i.id, i.level]))
    expect(by[uid(1)]).toBe('leicht')
    expect(by[uid(2)]).toBe('schwer')
    expect(by[uid(3)]).toBe('mittel')
    expect(by[uid(6)]).toBe('mittel')
    expect(body.summary.unrated).toBe(1)
    expect(rpc).toHaveBeenCalledWith('question_difficulty_stats', expect.objectContaining({ p_department_ids: [DEPT] }))
  })

  it('nimmt gesperrte Fragen mit, wenn der Ausschluss aus ist', async () => {
    vi.mocked(fetchSelectableQuestions).mockResolvedValue([q(1, { blocked: true })] as never)
    const body = await (await post({ ...baseBody, exclude: { blocked: false, reported: true, recent: 0 } })).json()
    expect(body.items).toHaveLength(1)
  })

  it('filtert nach Fach, Thema und Klassenstufe und meldet Themen ohne Fragen', async () => {
    vi.mocked(fetchSelectableQuestions).mockResolvedValue([
      q(1),
      q(2, { subject_codes: ['KSK'] }),
      q(3, { topic: 'Thema B' }),
      q(4, { class_level: 12 }),
    ] as never)
    const body = await (
      await post({ ...baseBody, subjects: ['BGP'], topics: ['Thema A', 'Thema Z'], classLevel: 11 })
    ).json()
    expect(body.items.map((i: { id: string }) => i.id)).toEqual([uid(1)])
    expect(body.emptyTopics).toEqual(['Thema Z'])
  })

  it('schließt Fragen aus den letzten Nachweisen aus (Snapshot vor Entwurf)', async () => {
    vi.mocked(fetchSelectableQuestions).mockResolvedValue([q(1), q(2), q(3)] as never)
    limit.mockResolvedValue({
      data: [
        { question_ids_snapshot: [uid(1)], draft_question_ids: [uid(3)] },
        { question_ids_snapshot: null, draft_question_ids: [uid(2)] },
      ],
      error: null,
    })
    const body = await (await post({ ...baseBody, exclude: { blocked: true, reported: true, recent: 3 } })).json()
    // Frage 1 (Snapshot) und 2 (Entwurf ohne Snapshot) fehlen; Frage 3 steht nur im ignorierten Entwurf
    expect(body.items.map((i: { id: string }) => i.id)).toEqual([uid(3)])
    expect(from).toHaveBeenCalledWith('graded_assessments')
    expect(limit).toHaveBeenCalledWith(3)
  })

  it('fragt bei „nie“ die Nachweise gar nicht ab', async () => {
    vi.mocked(fetchSelectableQuestions).mockResolvedValue([q(1)] as never)
    await post(baseBody)
    expect(from).not.toHaveBeenCalled()
  })

  it('lässt bereits Gewählte weg, behält aber Fixierte', async () => {
    vi.mocked(fetchSelectableQuestions).mockResolvedValue([q(1), q(2), q(3)] as never)
    const body = await (
      await post({ ...baseBody, count: 5, alreadyChosenIds: [uid(1)], keepIds: [uid(3)] })
    ).json()
    const ids = body.items.map((i: { id: string }) => i.id)
    expect(ids).not.toContain(uid(1))
    expect(ids[0]).toBe(uid(3))
    expect(ids).toContain(uid(2))
  })

  it('arbeitet ohne Auswertung weiter: alle mittel, Hinweis statsAvailable=false', async () => {
    vi.mocked(fetchSelectableQuestions).mockResolvedValue([q(1), q(2)] as never)
    rpcResult({ data: null, error: { message: 'boom' } })
    const res = await post({ ...baseBody, mix: { leicht: 0, mittel: 100, schwer: 0 } })
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.statsAvailable).toBe(false)
    expect(body.items).toHaveLength(2)
  })

  it('holt die Lösungsquoten seitenweise, damit nichts bei 1000 Zeilen abgeschnitten wird', async () => {
    vi.mocked(fetchSelectableQuestions).mockResolvedValue([q(1), q(1500)] as never)
    const page1 = Array.from({ length: 1000 }, (_, i) => stat(i + 2, 40, 24))
    page1[0] = stat(1, 40, 36) // Frage 1: leicht
    const chain = rpcResult({ data: [], error: null }) as { range: ReturnType<typeof vi.fn> }
    chain.range
      .mockResolvedValueOnce({ data: page1, error: null })
      .mockResolvedValueOnce({ data: [stat(1500, 40, 8)], error: null }) // Frage 1500: schwer
    const body = await (await post({ ...baseBody, exclude: { blocked: true, reported: true, recent: 0 } })).json()
    expect(chain.range).toHaveBeenNthCalledWith(1, 0, 999)
    expect(chain.range).toHaveBeenNthCalledWith(2, 1000, 1999)
    const by = Object.fromEntries(body.items.map((i: { id: string; level: string }) => [i.id, i.level]))
    expect(by[uid(1)]).toBe('leicht')
    expect(by[uid(1500)]).toBe('schwer')
  })

  it('liefert Tauschkandidaten mit gleichem Thema und gleicher Stufe', async () => {
    vi.mocked(fetchSelectableQuestions).mockResolvedValue([
      q(1),
      q(2, { question_text: 'Wer haftet bei Schäden?' }),
      q(3, { topic: 'Thema B' }),
      q(4, { question_text: 'Was regelt der CMR-Vertrag?' }),
      q(5, { question_text: 'Wie lange gilt die Frist?' }),
    ] as never)
    const body = await (
      await post({ action: 'alternatives', departmentId: DEPT, exclude: baseBody.exclude, questionId: uid(1), excludeIds: [uid(5)] })
    ).json()
    const ids = body.alternatives.map((a: { id: string }) => a.id).sort()
    expect(ids).toEqual([uid(2), uid(4)].sort())
  })

  it('meldet 404 für eine unbekannte Tauschfrage', async () => {
    const res = await post({ action: 'alternatives', departmentId: DEPT, exclude: baseBody.exclude, questionId: uid(9) })
    expect(res.status).toBe(404)
  })

  it('antwortet bei Fehlern mit 500 ohne Technik-Text', async () => {
    vi.mocked(fetchSelectableQuestions).mockRejectedValue(new Error('db kaputt'))
    const res = await post(baseBody)
    expect(res.status).toBe(500)
    expect((await res.json()).error).not.toMatch(/kaputt/)
  })
})
