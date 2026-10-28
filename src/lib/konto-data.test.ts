import { describe, it, expect, vi } from 'vitest'
import { chainMock, eqValue } from '@/test/supabase-chain-mock'

vi.mock('@/lib/supabase-server', () => ({ createServiceClient: vi.fn(() => {
  throw new Error('Das Service-Konto muss in Tests übergeben werden')
}) }))

import { loadAufgaben, loadBeitrag } from './konto-data'

const ME = 'u1'

describe('loadAufgaben (PROJ-50)', () => {
  it('zählt die Abgaben der Klasse mit dem Service-Konto, nur für die eigenen laufenden Nachweise (BUG-1)', async () => {
    // Eigener Client: darf die Nachweise lesen, aber (per RLS) keine fremden Prüfungssitzungen
    const own = chainMock((table, calls) => {
      if (table === 'graded_assessments') {
        const status = eqValue(calls, 'status')
        return status === 'open' ? { data: [{ id: 'a1', title: 'LF5 Test' }, { id: 'a2', title: 'LF6 Test' }], count: 2 } : { data: [], count: 0 }
      }
      return { data: [] }
    })
    const service = chainMock((table) =>
      table === 'exam_sessions'
        ? { data: [{ assessment_id: 'a1', status: 'completed' }, { assessment_id: 'a1', status: 'aborted' }, { assessment_id: 'a1', status: 'completed' }] }
        : { data: [] },
    )
    const result = await loadAufgaben(own.client, ME, service.client)

    expect(result.running.items).toEqual([
      { id: 'a1', title: 'LF5 Test', submissions: 3 },
      { id: 'a2', title: 'LF6 Test', submissions: 0 },
    ])
    // Sitzungen werden nur über das Service-Konto und nur für die eigenen Nachweise gelesen
    expect(own.queries.some((q) => q.table === 'exam_sessions')).toBe(false)
    const sessionsQuery = service.queries.find((q) => q.table === 'exam_sessions')!
    expect(sessionsQuery.calls.find((c) => c.method === 'in')?.args).toEqual(['assessment_id', ['a1', 'a2']])
    expect(sessionsQuery.calls.some((c) => c.method === 'neq' && c.args[1] === 'in_progress')).toBe(true)
  })

  it('fragt keine Sitzungen ab, wenn nichts läuft', async () => {
    const own = chainMock(() => ({ data: [], count: 0 }))
    const service = chainMock(() => ({ data: [] }))
    await loadAufgaben(own.client, ME, service.client)
    expect(service.queries).toHaveLength(0)
  })

  it('zeigt „noch nicht angesehen“ nur für geschlossene Nachweise der Person', async () => {
    const own = chainMock(() => ({ data: [], count: 0 }))
    await loadAufgaben(own.client, ME, chainMock(() => ({ data: [] })).client)
    const closed = own.queries.find((q) => eqValue(q.calls, 'status') === 'closed')!
    expect(eqValue(closed.calls, 'created_by')).toBe(ME)
    expect(closed.calls.some((c) => c.method === 'is' && c.args[0] === 'creator_viewed_at' && c.args[1] === null)).toBe(true)
    const draft = own.queries.find((q) => eqValue(q.calls, 'status') === 'draft')!
    expect(draft.calls.some((c) => c.method === 'is')).toBe(false)
  })
})

describe('loadBeitrag (PROJ-50)', () => {
  const at = '2026-10-27T10:00:00Z'
  const versions = [
    { content_type: 'exam_question_set', content_id: 'set1', change_type: 'deleted', data: { name: 'Set A' }, created_at: at },
    { content_type: 'question', content_id: 'q1', change_type: 'updated', data: { question_text: 'Was ist CMR?' }, created_at: at },
    { content_type: 'question', content_id: 'q1', change_type: 'created', data: { question_text: 'Alt' }, created_at: '2026-10-26T10:00:00Z' },
    { content_type: 'topic', content_id: 't1', change_type: 'deleted', data: { name: 'Incoterms' }, created_at: at },
  ]
  const own = () =>
    chainMock((table, calls) => {
      if (table === 'content_versions' && calls.some((c) => c.method === 'limit')) return { data: versions }
      return { data: null, count: 3 }
    })

  it('prüft Gelöschtes mit dem Service-Konto: ein Set im Papierkorb bleibt anklickbar (BUG-5)', async () => {
    const service = chainMock((table) => (table === 'exam_question_sets' ? { data: [{ id: 'set1' }] } : { data: [] }))
    const result = await loadBeitrag(own().client, ME, service.client)
    const set = result.recent.find((r) => r.key === 'exam_question_set:set1')!
    expect(set).toMatchObject({ deleted: true, gone: false })
    // Themen, die weder im Papierkorb noch sonst existieren, gelten als endgültig gelöscht
    expect(result.recent.find((r) => r.key === 'topic:t1')).toMatchObject({ deleted: true, gone: true })
  })

  it('fragt die Existenz nur für gelöschte Inhalte ab', async () => {
    const service = chainMock(() => ({ data: [] }))
    await loadBeitrag(own().client, ME, service.client)
    expect(service.queries.map((q) => q.table).sort()).toEqual(['exam_question_sets', 'topics'])
  })

  it('zählt pro Inhalt nur den jüngsten eigenen Eintrag und liefert Suchtexte für Fragen und Themen', async () => {
    const result = await loadBeitrag(own().client, ME, chainMock(() => ({ data: [] })).client)
    expect(result.recent.map((r) => r.key)).toEqual(['exam_question_set:set1', 'question:q1', 'topic:t1'])
    expect(result.recent.find((r) => r.key === 'question:q1')).toMatchObject({ title: 'Was ist CMR?', searchText: 'Was ist CMR?' })
    expect(result).toMatchObject({ questionsCreated: 3, changes: 3, assessments: 3 })
  })
})
