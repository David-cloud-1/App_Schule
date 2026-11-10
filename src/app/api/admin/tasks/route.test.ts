import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextResponse } from 'next/server'
import { chainMock, hasCall, type ChainCall } from '@/test/supabase-chain-mock'

vi.mock('../_lib/auth', () => ({ requireContentAdmin: vi.fn() }))
const serviceSessions: { data: unknown; error: unknown } = { data: [], error: null }
vi.mock('@/lib/supabase-server', () => ({
  createServiceClient: () => ({
    from: () => {
      const b: Record<string, unknown> = {}
      for (const m of ['select', 'in', 'neq', 'limit']) b[m] = () => b
      b.then = (ok: (v: unknown) => unknown) => Promise.resolve(serviceSessions).then(ok)
      return b
    },
  }),
}))
import { requireContentAdmin } from '../_lib/auth'
import { GET } from './route'

const FUTURE = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString()
const PAST = (days: number) => new Date(Date.now() - days * 86_400_000).toISOString()

type Tables = {
  groups?: { count?: number | null; error?: unknown }
  assessments?: { data?: unknown[]; error?: unknown }
  drafts?: { count?: number | null; error?: unknown }
}

function setup(role: 'teacher' | 'department_admin' | 'admin', tables: Tables, departmentId: string | null = 'dep-1') {
  const seen: Record<string, ChainCall[]> = {}
  const m = chainMock((table, calls) => {
    seen[table] = calls
    if (table === 'question_report_groups') return { count: tables.groups?.count ?? 0, error: tables.groups?.error ?? null }
    if (table === 'questions_draft') return { count: tables.drafts?.count ?? 0, error: tables.drafts?.error ?? null }
    if (table === 'graded_assessments') return { data: tables.assessments?.data ?? [], error: tables.assessments?.error ?? null }
    return { data: null }
  })
  vi.mocked(requireContentAdmin).mockResolvedValue({
    error: null,
    user: { id: 'u-1', email: 'u@x.de' },
    supabase: m.client,
    role,
    isSuperAdmin: role === 'admin',
    isDepartmentAdmin: role === 'department_admin',
    isTeacher: role === 'teacher',
    // Bereichsleiste (PROJ-70): ein gewählter Bereich, `null` = „Alle Bereiche“
    scopeDepartmentIds: departmentId ? [departmentId] : null,
    departmentId,
  } as never)
  return { m, seen }
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.spyOn(console, 'error').mockImplementation(() => {})
  serviceSessions.data = []
  serviceSessions.error = null
})

describe('GET /api/admin/tasks', () => {
  it('gibt die Antwort der Anmeldeprüfung weiter', async () => {
    vi.mocked(requireContentAdmin).mockResolvedValue({
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
      user: null,
      supabase: null,
    } as never)
    expect((await GET()).status).toBe(401)
  })

  it('zählt Meldungen und beendete Nachweise mit Abgaben, nicht ohne', async () => {
    serviceSessions.data = [{ assessment_id: 'a1' }, { assessment_id: 'a1' }]
    setup('teacher', {
      groups: { count: 4 },
      assessments: {
        data: [
          { id: 'a1', status: 'closed', opens_at: PAST(5), closes_at: PAST(4), created_by: 'u-1', department_id: 'dep-1' },
          { id: 'a2', status: 'closed', opens_at: PAST(5), closes_at: PAST(4), created_by: 'u-1', department_id: 'dep-1' },
          { id: 'a3', status: 'open', opens_at: PAST(1), closes_at: FUTURE(1), created_by: 'u-1', department_id: 'dep-1' },
        ],
      },
    })
    const { counts } = await (await GET()).json()
    expect(counts.openReports).toBe(4)
    expect(counts.unreleasedAssessments).toBe(1) // a1 hat Abgaben, a2 nicht, a3 läuft noch
    expect(counts.draftQuestions).toBeNull() // Lehrkräfte sehen keine Fragen-Entwürfe
  })

  it('rechnet Termine der nächsten 7 Tage, nicht frühere und nicht fernere', async () => {
    setup('teacher', {
      assessments: {
        data: [
          { id: 'd1', status: 'draft', opens_at: FUTURE(2), closes_at: FUTURE(3), created_by: 'u-1', department_id: null },
          { id: 'd2', status: 'draft', opens_at: FUTURE(20), closes_at: FUTURE(21), created_by: 'u-1', department_id: null },
          { id: 'd3', status: 'draft', opens_at: PAST(1), closes_at: FUTURE(1), created_by: 'u-1', department_id: null },
        ],
      },
    })
    const { counts } = await (await GET()).json()
    expect(counts.upcomingDrafts).toBe(1)
  })

  it('zählt für eine Lehrkraft nur eigene Nachweise', async () => {
    setup('teacher', {
      assessments: {
        data: [
          { id: 'd1', status: 'draft', opens_at: FUTURE(1), closes_at: FUTURE(2), created_by: 'anderer', department_id: null },
          { id: 'd2', status: 'draft', opens_at: FUTURE(1), closes_at: FUTURE(2), created_by: 'u-1', department_id: null },
        ],
      },
    })
    const { counts } = await (await GET()).json()
    expect(counts.upcomingDrafts).toBe(1)
  })

  it('beschränkt einen Bereichs-Admin auf seinen Fachbereich und zählt Entwürfe', async () => {
    const { seen } = setup('department_admin', {
      drafts: { count: 6 },
      groups: { count: 2 },
      assessments: {
        data: [
          { id: 'd1', status: 'draft', opens_at: FUTURE(1), closes_at: FUTURE(2), created_by: 'x', department_id: 'dep-1' },
          { id: 'd2', status: 'draft', opens_at: FUTURE(1), closes_at: FUTURE(2), created_by: 'x', department_id: 'dep-2' },
        ],
      },
    })
    const { counts } = await (await GET()).json()
    expect(counts.upcomingDrafts).toBe(1)
    expect(counts.draftQuestions).toBe(6)
    expect(seen['question_report_groups'].find((c) => c.method === 'in')?.args).toEqual(['department_id', ['dep-1']])
  })

  it('zählt Meldungen auch für Lehrkräfte nur im Bereich der Bereichsleiste (QA PROJ-73 B1)', async () => {
    const { seen } = setup('teacher', { groups: { count: 1 } }, 'dep-7')
    await GET()
    expect(seen['question_report_groups'].find((c) => c.method === 'in')?.args).toEqual(['department_id', ['dep-7']])
  })

  it('filtert in „Alle Bereiche“ nicht nach Bereich', async () => {
    const { seen } = setup('admin', { groups: { count: 1 } }, null)
    await GET()
    expect(hasCall(seen['question_report_groups'], 'in')).toBe(false)
  })

  it('zählt eine liegengebliebene Übernahme (älter als 24 h) wieder als offen (QA PROJ-73 B4)', async () => {
    const { seen } = setup('teacher', { groups: { count: 1 } })
    await GET()
    const or = String(seen['question_report_groups'].find((c) => c.method === 'or')?.args[0])
    expect(or).toMatch(/and\(status\.eq\.in_pruefung,claimed_at\.lt\.\d{4}-/)
  })

  it('schließt die eigene Prüfung bei den offenen Meldungen aus', async () => {
    const { seen } = setup('teacher', { groups: { count: 1 } })
    await GET()
    const or = seen['question_report_groups'].find((c) => c.method === 'or')
    expect(String(or?.args[0])).toContain('handled_by.neq.u-1')
    expect(hasCall(seen['question_report_groups'], 'select')).toBe(true)
  })

  it('lässt eine ausgefallene Quelle auf null und liefert die übrigen', async () => {
    setup('department_admin', {
      groups: { error: { message: 'boom' } },
      drafts: { count: 3 },
      assessments: { data: [] },
    })
    const res = await GET()
    expect(res.status).toBe(200)
    const { counts } = await res.json()
    expect(counts.openReports).toBeNull()
    expect(counts.draftQuestions).toBe(3)
    expect(counts.unreleasedAssessments).toBe(0)
  })

  it('setzt beide Nachweis-Werte auf null, wenn die Abfrage scheitert, und antwortet trotzdem', async () => {
    setup('teacher', { assessments: { error: { message: 'boom' } } })
    const res = await GET()
    expect(res.status).toBe(200)
    const { counts } = await res.json()
    expect(counts.upcomingDrafts).toBeNull()
    expect(counts.unreleasedAssessments).toBeNull()
  })
})
