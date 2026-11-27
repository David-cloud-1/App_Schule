import { describe, it, expect } from 'vitest'
import { chainMock } from '@/test/supabase-chain-mock'
import { describeHidden, loadHiddenInfo, HIDDEN_BEFORE_TEXT, REPORT_BATCH_DESCRIPTION, type StatusVersion } from './hidden-info'

const v = (over: Partial<StatusVersion> = {}): StatusVersion => ({
  content_id: 'q1',
  change_type: 'deactivated',
  created_at: '2026-11-27T10:00:00Z',
  changed_by_label: null,
  batch_id: null,
  profiles: { first_name: 'Anna', last_name: 'Huber', display_name: 'a.huber' },
  ...over,
})

describe('describeHidden (PROJ-131, B40)', () => {
  it('nennt Person und Datum', () => {
    expect(describeHidden(v(), null)).toBe('Ausgeblendet von Anna Huber am 27.11.')
  })
  it('nennt eine Meldung als Grund', () => {
    expect(describeHidden(v(), REPORT_BATCH_DESCRIPTION)).toBe('Ausgeblendet nach einer Meldung')
  })
  it('sagt bei Bestandsfragen „schon vorher“', () => {
    expect(describeHidden(v({ change_type: 'created', changed_by_label: 'Stand bei Einführung', profiles: null }), null)).toBe(HIDDEN_BEFORE_TEXT)
    expect(describeHidden(undefined, null)).toBe(HIDDEN_BEFORE_TEXT)
  })
  it('unterscheidet ausgeblendet angelegte Fragen', () => {
    expect(describeHidden(v({ change_type: 'created' }), null)).toBe('Ausgeblendet angelegt von Anna Huber am 27.11.')
  })
})

describe('loadHiddenInfo', () => {
  it('nimmt je Frage die jüngste Version und den Vorgang dazu', async () => {
    const mock = chainMock((table) => {
      if (table === 'content_versions') return { data: [v({ batch_id: 'b1' }), v({ batch_id: null })] }
      if (table === 'content_change_batches') return { data: [{ id: 'b1', description: REPORT_BATCH_DESCRIPTION }] }
      return {}
    })
    const result = await loadHiddenInfo(mock.client, ['q1', 'q2'])
    expect(result.get('q1')).toBe('Ausgeblendet nach einer Meldung')
    expect(result.get('q2')).toBe(HIDDEN_BEFORE_TEXT)
  })
  it('fragt ohne IDs nichts ab', async () => {
    const mock = chainMock(() => ({}))
    expect((await loadHiddenInfo(mock.client, [])).size).toBe(0)
    expect(mock.queries).toHaveLength(0)
  })
})
