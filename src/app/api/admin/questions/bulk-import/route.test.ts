import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { chainMock, eqValue, hasCall } from '@/test/supabase-chain-mock'
import { POST } from './route'

vi.mock('@/lib/supabase-server', () => ({ createClient: vi.fn() }))
import { createClient } from '@/lib/supabase-server'

const SPED = 'dept-sped'
const TOUR = 'dept-tour'

// Beide Bereiche haben ein „KSK" (E4) — der Import des Spedition-Admins darf
// nur im Spedition-Fach landen.
const SUBJECTS = [
  { id: 'sped-ksk', code: 'KSK', name: 'KSK', color: '#f90', icon_name: 'Calculator', description: null, is_active: true, sort_order: 1, department_id: SPED },
  { id: 'sped-bgp', code: 'BGP', name: 'BGP', color: '#1cb', icon_name: 'BarChart3', description: null, is_active: true, sort_order: 2, department_id: SPED },
  { id: 'tour-ksk', code: 'KSK', name: 'KSK', color: '#f90', icon_name: 'Calculator', description: null, is_active: true, sort_order: 1, department_id: TOUR },
  { id: 'tour-rvt', code: 'RVT', name: 'RVT', color: '#1cb', icon_name: 'Plane', description: null, is_active: true, sort_order: 2, department_id: TOUR },
]

const DEPARTMENT_ROW = {
  id: SPED, code: 'SPED', slug: 'spedition', domain: null, name: 'Speditionskaufleute', app_name: 'SpediLern',
  tagline: '', meta_title: '', meta_description: '', icon_name: 'Truck', currency_name: 'Frachtmünzen',
  hof_name: 'Speditionshof', prompt_role: '', target_group: '', prompt_notes: null, class_levels: [10, 11, 12], pseudonym_nouns: [],
}

let writes: ReturnType<typeof chainMock>['writes'] = []

function makeAdminClient() {
  let questionCounter = 0
  const mock = chainMock(
    (table, calls) => {
      if (table === 'profiles') return { data: { role: 'admin', department_id: SPED } }
      if (table === 'departments') return { data: DEPARTMENT_ROW }
      if (table === 'subjects') {
        const department = eqValue(calls, 'department_id')
        return { data: SUBJECTS.filter((s) => s.department_id === department) }
      }
      if (table === 'topics') return { data: [] }
      if (table === 'questions' && hasCall(calls, 'insert')) return { data: { id: `q-${++questionCounter}` } }
      return {}
    },
    { auth: { getUser: () => Promise.resolve({ data: { user: { id: 'admin-1', email: 'a@b.de' } } }) } },
  )
  writes = mock.writes
  return mock.client
}

// Eine Frage, die den Torwächter besteht (gleich lange, gleich gebaute Optionen)
function row(fach_code: string, extra: Record<string, unknown> = {}) {
  return {
    question_text: `Welche Aussage zur Kostenrechnung trifft zu (${fach_code})?`,
    antwort_a: 'Sie ordnet Kosten verursachungsgerecht den Kostenträgern zu.',
    antwort_b: 'Sie ordnet Erlöse ausschließlich den Kostenstellen zu.',
    antwort_c: 'Sie ersetzt die Finanzbuchhaltung vollständig im Betrieb.',
    antwort_d: 'Sie ermittelt nur die Steuerlast des Unternehmens jährlich.',
    antwort_e: 'Sie erfasst lediglich die Lagerbestände zum Jahresende.',
    korrekte_antwort: 'A',
    erklaerung: 'Die KLR ordnet Kosten verursachungsgerecht zu.',
    fach_code,
    schwierigkeit: 'mittel',
    ...extra,
  }
}

function request(rows: unknown[]) {
  return { json: () => Promise.resolve({ rows, allow_flagged: true }) } as unknown as NextRequest
}

beforeEach(() => vi.clearAllMocks())

describe('POST /api/admin/questions/bulk-import — Fächer je Bereich (PROJ-22)', () => {
  it('ordnet ein Kürzel dem Fach des eigenen Bereichs zu, auch wenn ein anderer Bereich es auch hat', async () => {
    vi.mocked(createClient).mockResolvedValue(makeAdminClient() as never)
    const res = await POST(request([row('ksk')]))
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.imported).toBe(1)
    const link = writes.find((w) => w.table === 'question_subjects')?.payload
    expect(link).toMatchObject({ subject_id: 'sped-ksk' })
  })

  it('lehnt Kürzel ab, die es nur in einem anderen Bereich gibt — mit erlaubten Kürzeln in der Begründung', async () => {
    vi.mocked(createClient).mockResolvedValue(makeAdminClient() as never)
    const res = await POST(request([row('KSK'), row('RVT')]))
    const body = await res.json()
    expect(body.imported).toBe(1)
    expect(body.skipped).toBe(1)
    expect(body.rejected).toEqual([
      expect.objectContaining({ index: 1, reason: expect.stringContaining('erlaubt: KSK, BGP') }),
    ])
    expect(writes.filter((w) => w.table === 'question_subjects').map((w) => (w.payload as { subject_id: string }).subject_id)).toEqual(['sped-ksk'])
  })

  it('lehnt Klassenstufen ab, die der Bereich nicht kennt', async () => {
    vi.mocked(createClient).mockResolvedValue(makeAdminClient() as never)
    const res = await POST(request([row('BGP', { klassenstufe: 13 }), row('BGP', { klassenstufe: 11 })]))
    const body = await res.json()
    expect(body.imported).toBe(1)
    expect(body.rejected).toEqual([expect.objectContaining({ index: 0, reason: expect.stringContaining('klassenstufe 13') })])
  })

  it('schreibt den Bereich ins Audit-Log', async () => {
    vi.mocked(createClient).mockResolvedValue(makeAdminClient() as never)
    await POST(request([row('BGP')]))
    expect(writes.find((w) => w.table === 'admin_audit_log')?.payload).toMatchObject({ department_id: SPED })
  })
})
