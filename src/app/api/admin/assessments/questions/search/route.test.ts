import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

vi.mock('../../../_lib/auth', () => ({ requireTeacherOrAdmin: vi.fn() }))
vi.mock('@/lib/assessment-candidates', () => ({ loadCandidates: vi.fn() }))
import { requireTeacherOrAdmin } from '../../../_lib/auth'
import { loadCandidates } from '@/lib/assessment-candidates'
import { clearPoolCache } from '@/lib/assessment-pool-cache'
import { POST } from './route'

const DEPT = '11111111-1111-4111-8111-111111111111'
const uid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
const post = (body: unknown) =>
  POST(
    new NextRequest('http://localhost/api/admin/assessments/questions/search', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'content-type': 'application/json' },
    }),
  )
const cand = (n: number) => ({
  id: uid(n),
  question_text: `Frage ${n}`,
  topic: 'Thema A',
  class_level: 11,
  subject_codes: ['BGP'],
  isPrivate: false,
  attempts: 0,
  correct: 0,
  openReports: 0,
  blocked: false,
  level: 'mittel',
  rate: null,
  rated: false,
})

beforeEach(() => {
  vi.clearAllMocks()
  clearPoolCache()
  vi.mocked(requireTeacherOrAdmin).mockResolvedValue({ error: null, user: { id: 'u1' }, supabase: {} } as never)
  vi.mocked(loadCandidates).mockResolvedValue({ all: Array.from({ length: 30 }, (_, i) => cand(i + 1)), statsAvailable: true } as never)
})

describe('POST /api/admin/assessments/questions/search', () => {
  it('gibt 401/403 der Anmeldeprüfung weiter', async () => {
    vi.mocked(requireTeacherOrAdmin).mockResolvedValue({
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
      user: null,
      supabase: null,
    } as never)
    expect((await post({ action: 'search', departmentId: DEPT })).status).toBe(401)
    expect(loadCandidates).not.toHaveBeenCalled()
  })

  it('lehnt ungültige Eingaben ab', async () => {
    expect((await post({ action: 'search', departmentId: 'x' })).status).toBe(400)
    expect((await post({ action: 'search', departmentId: DEPT, offset: -1 })).status).toBe(400)
    expect((await post({ action: 'search', departmentId: DEPT, level: 'extrem' })).status).toBe(400)
    expect((await post({ action: 'lookup', departmentId: DEPT, ids: [] })).status).toBe(400)
    expect((await post({ action: 'lookup', departmentId: DEPT, ids: Array.from({ length: 61 }, (_, i) => uid(i + 1)) })).status).toBe(400)
    expect((await post({ action: 'nope' })).status).toBe(400)
  })

  it('sucht seitenweise: 25 Treffer, Gesamtzahl, nächste Seite', async () => {
    const res = await post({ action: 'search', departmentId: DEPT })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.items).toHaveLength(25)
    expect(body.total).toBe(30)
    expect(body.nextOffset).toBe(25)
    expect(loadCandidates).toHaveBeenCalledWith(expect.anything(), 'u1', DEPT)
    const page2 = await (await post({ action: 'search', departmentId: DEPT, offset: 25 })).json()
    expect(page2.items).toHaveLength(5)
    expect(page2.nextOffset).toBeNull()
  })

  it('lädt den Pool bei mehreren Anfragen nur einmal (kurzer Zwischenspeicher)', async () => {
    await post({ action: 'search', departmentId: DEPT })
    await post({ action: 'search', departmentId: DEPT, offset: 25 })
    await post({ action: 'facets', departmentId: DEPT })
    expect(loadCandidates).toHaveBeenCalledTimes(1)
  })

  it('trennt den Zwischenspeicher nach Person und Bereich', async () => {
    await post({ action: 'search', departmentId: DEPT })
    await post({ action: 'search', departmentId: '22222222-2222-4222-8222-222222222222' })
    vi.mocked(requireTeacherOrAdmin).mockResolvedValue({ error: null, user: { id: 'u2' }, supabase: {} } as never)
    await post({ action: 'search', departmentId: DEPT })
    expect(loadCandidates).toHaveBeenCalledTimes(3)
  })

  it('lädt Fragen per Nummer nach und nennt fehlende', async () => {
    const body = await (await post({ action: 'lookup', departmentId: DEPT, ids: [uid(1), uid(99)] })).json()
    expect(body.items.map((i: { id: string }) => i.id)).toEqual([uid(1)])
    expect(body.missing).toEqual([uid(99)])
  })

  it('liefert die Auswahl für Fach, Thema und Stufe', async () => {
    const body = await (await post({ action: 'facets', departmentId: DEPT })).json()
    expect(body.subjects).toEqual(['BGP'])
    expect(body.topics).toEqual([{ name: 'Thema A', subjects: ['BGP'], levels: [11] }])
    expect(body.classLevels).toEqual([11])
  })

  it('meldet einen Fehler beim Laden verständlich', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.mocked(loadCandidates).mockRejectedValue(new Error('db'))
    const res = await post({ action: 'search', departmentId: DEPT })
    expect(res.status).toBe(500)
    expect((await res.json()).error).not.toMatch(/db/)
  })
})
