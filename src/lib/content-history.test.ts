import { describe, it, expect, vi } from 'vitest'
import { chainMock } from '@/test/supabase-chain-mock'
import {
  checkVersionConflict,
  groupIntoBatch,
  isContentType,
  loadLastChanges,
  periodSchema,
  versionConflictBody,
} from './content-history'

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

describe('loadLastChanges (PROJ-70)', () => {
  const rows = [
    { content_id: 'a', version_number: 3, created_at: '2026-11-03T10:00:00Z', changed_by: 'u1', changed_by_label: null, profiles: { display_name: 'Frau Muster' } },
    { content_id: 'a', version_number: 2, created_at: '2026-11-02T10:00:00Z', changed_by: 'u2', changed_by_label: null, profiles: { display_name: 'Herr Alt' } },
    { content_id: 'b', version_number: 1, created_at: '2026-11-01T10:00:00Z', changed_by: null, changed_by_label: null, profiles: null },
    { content_id: 'c', version_number: 1, created_at: '2026-11-01T11:00:00Z', changed_by: null, changed_by_label: 'Qualitäts-Korrekturlauf', profiles: null },
  ]

  it('nimmt je Inhalt die neueste Version und fragt nur einmal', async () => {
    const { client, from } = chainMock(() => ({ data: rows }))
    const map = await loadLastChanges(client, 'subject', ['a', 'b', 'c'])
    expect(from).toHaveBeenCalledTimes(1)
    expect(map.get('a')).toEqual({ name: 'Frau Muster', at: '2026-11-03T10:00:00Z' })
  })

  it('zeigt „Gelöschtes Konto“ ohne Person und die Quelle bei Läufen', async () => {
    const { client } = chainMock(() => ({ data: rows }))
    const map = await loadLastChanges(client, 'question', ['a', 'b', 'c'])
    expect(map.get('b')?.name).toBe('Gelöschtes Konto')
    expect(map.get('c')?.name).toBe('Qualitäts-Korrekturlauf')
  })

  it('fragt bei leerer Liste gar nicht erst', async () => {
    const { client, from } = chainMock(() => ({ data: [] }))
    expect((await loadLastChanges(client, 'topic', [])).size).toBe(0)
    expect(from).not.toHaveBeenCalled()
  })
})

describe('versionConflictBody (PROJ-70)', () => {
  it('nennt die Person, die zuletzt geändert hat', () => {
    const body = versionConflictBody({ currentVersion: 4, changedByName: 'Frau Muster', changedAt: '2026-11-04T08:00:00Z' }, 'Dieses Thema')
    expect(body).toMatchObject({ error: 'Dieses Thema wurde gerade von Frau Muster geändert.', conflict: true, currentVersion: 4 })
  })

  it('bleibt ohne Namen verständlich', () => {
    const body = versionConflictBody({ currentVersion: 2, changedByName: null, changedAt: '2026-11-04T08:00:00Z' }, 'Dieses Fach')
    expect(body.error).toBe('Dieses Fach wurde gerade von jemand anderem geändert.')
  })
})

describe('periodSchema (PROJ-70)', () => {
  it('akzeptiert einen gültigen Zeitraum', () => {
    expect(periodSchema.safeParse({ from: '2026-11-01T00:00:00Z', to: '2026-11-04T00:00:00Z' }).success).toBe(true)
  })
  it('lehnt umgekehrte, zu lange und ungültige Zeiträume ab', () => {
    expect(periodSchema.safeParse({ from: '2026-11-04T00:00:00Z', to: '2026-11-01T00:00:00Z' }).success).toBe(false)
    expect(periodSchema.safeParse({ from: '2024-01-01T00:00:00Z', to: '2026-01-01T00:00:00Z' }).success).toBe(false)
    expect(periodSchema.safeParse({ from: 'heute', to: 'morgen' }).success).toBe(false)
  })
})
