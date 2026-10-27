import { describe, it, expect, vi } from 'vitest'
import { chainMock } from '@/test/supabase-chain-mock'
import { checkVersionConflict, groupIntoBatch, isContentType } from './content-history'

describe('isContentType', () => {
  it('erkennt gültige Inhaltstypen', () => {
    expect(isContentType('question')).toBe(true)
    expect(isContentType('topic')).toBe(true)
    expect(isContentType('subject')).toBe(true)
    expect(isContentType('exam_question_set')).toBe(true)
  })

  it('lehnt unbekannte Typen ab', () => {
    expect(isContentType('answer_option')).toBe(false)
    expect(isContentType('')).toBe(false)
  })
})

describe('checkVersionConflict', () => {
  it('meldet keinen Konflikt, wenn expectedVersion fehlt', async () => {
    const { client } = chainMock(() => ({ data: null }))
    const result = await checkVersionConflict(client, 'question', 'q-1', undefined)
    expect(result).toBeNull()
  })

  it('meldet keinen Konflikt, wenn die Zählnummer noch übereinstimmt', async () => {
    const { client } = chainMock((table) => {
      if (table === 'questions') return { data: { version_number: 3 } }
      return { data: null }
    })
    const result = await checkVersionConflict(client, 'question', 'q-1', 3)
    expect(result).toBeNull()
  })

  it('meldet einen Konflikt mit dem Namen der letzten ändernden Person', async () => {
    const { client } = chainMock((table) => {
      if (table === 'questions') return { data: { version_number: 5 } }
      if (table === 'content_versions') {
        return {
          data: {
            created_at: '2026-10-27T10:00:00Z',
            changed_by_label: null,
            profiles: { display_name: 'Frau Muster' },
          },
        }
      }
      return { data: null }
    })
    const result = await checkVersionConflict(client, 'question', 'q-1', 3)
    expect(result).toEqual({
      currentVersion: 5,
      changedByName: 'Frau Muster',
      changedAt: '2026-10-27T10:00:00Z',
    })
  })

  it('fällt auf changed_by_label zurück, wenn kein Profil verknüpft ist (Skript/Korrekturlauf)', async () => {
    const { client } = chainMock((table) => {
      if (table === 'questions') return { data: { version_number: 2 } }
      if (table === 'content_versions') {
        return {
          data: {
            created_at: '2026-10-27T10:00:00Z',
            changed_by_label: 'Qualitäts-Korrekturlauf 2026-10-27',
            profiles: null,
          },
        }
      }
      return { data: null }
    })
    const result = await checkVersionConflict(client, 'question', 'q-1', 1)
    expect(result?.changedByName).toBe('Qualitäts-Korrekturlauf 2026-10-27')
  })
})

describe('groupIntoBatch', () => {
  it('ruft bei weniger als zwei Inhalten die Datenbank-Funktion gar nicht erst auf', async () => {
    const rpc = vi.fn()
    const { client } = chainMock(() => ({ data: null }), { rpc })
    const result = await groupIntoBatch(client, 'question', ['q-1'], 'Test')
    expect(result).toBeNull()
    expect(rpc).not.toHaveBeenCalled()
  })

  it('bündelt mehrere Inhalte über die RPC-Funktion und gibt die Vorgangs-ID zurück', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: 'batch-1', error: null })
    const { client } = chainMock(() => ({ data: null }), { rpc })
    const result = await groupIntoBatch(client, 'question', ['q-1', 'q-2'], 'Bulk-Import')
    expect(result).toBe('batch-1')
    expect(rpc).toHaveBeenCalledWith('group_recent_versions_into_batch', {
      p_content_type: 'question',
      p_content_ids: ['q-1', 'q-2'],
      p_description: 'Bulk-Import',
    })
  })

  it('bricht die Aktion nicht ab, wenn das Bündeln fehlschlägt', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: null, error: { message: 'boom' } })
    const { client } = chainMock(() => ({ data: null }), { rpc })
    const result = await groupIntoBatch(client, 'question', ['q-1', 'q-2'], 'Bulk-Import')
    expect(result).toBeNull()
  })
})
