import { describe, it, expect, vi } from 'vitest'
import { chainMock } from '@/test/supabase-chain-mock'

vi.mock('@/lib/assessment-questions', () => ({
  fetchSelectableQuestions: vi.fn(async () => [
    { id: 'q-gemeldet', question_text: 'A', topic: null, class_level: 10, subject_codes: ['KSK'], isPrivate: false, blocked: false },
    { id: 'q-normal', question_text: 'B', topic: null, class_level: 10, subject_codes: ['KSK'], isPrivate: false, blocked: false },
  ]),
}))
import { loadCandidates, openReportCounts } from './assessment-candidates'

function client(reports: unknown) {
  const m = chainMock((table) => {
    if (table === 'question_reports') return reports as never
    return { data: [] }
  })
  // Statistik: keine Frage hat Antworten
  ;(m.client as unknown as { rpc: unknown }).rpc = () => {
    const b: Record<string, unknown> = {}
    for (const k of ['gt', 'order', 'range']) b[k] = () => b
    b.then = (ok: (v: unknown) => unknown) => Promise.resolve({ data: [], error: null }).then(ok)
    return b
  }
  return m
}

describe('loadCandidates – offene Meldungen (QA PROJ-78 BUG-2)', () => {
  it('zählt offene Meldungen auch bei Fragen ohne Antworten in der Statistik', async () => {
    const m = client({ data: [{ question_id: 'q-gemeldet' }, { question_id: 'q-gemeldet' }] })
    const { all } = await loadCandidates(m.client, 'u-1', 'dep-1')
    expect(all.find((c) => c.id === 'q-gemeldet')?.openReports).toBe(2)
    expect(all.find((c) => c.id === 'q-normal')?.openReports).toBe(0)
    const q = m.queries.find((x) => x.table === 'question_reports')!
    expect(q.calls.find((c) => c.method === 'in')?.args).toEqual(['status', ['offen', 'in_pruefung']])
  })

  it('liefert null, wenn die Meldungen nicht lesbar sind', async () => {
    const m = client({ data: null, error: { message: 'boom' } })
    vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(await openReportCounts(m.client)).toBeNull()
  })
})
