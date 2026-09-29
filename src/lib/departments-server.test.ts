import { describe, it, expect, vi, beforeEach } from 'vitest'
import { chainMock, hasCall, type ChainResolver } from '@/test/supabase-chain-mock'

// Zwei Bereiche wie nach PROJ-25: Spedition (erster) und Tourismus
function row(id: string, domain: string, sort_order: number) {
  return {
    id, code: id.toUpperCase(), slug: id, domain, name: id, app_name: `App ${id}`, tagline: '',
    meta_title: '', meta_description: '', icon_name: 'Truck', currency_name: 'M', hof_name: 'H',
    hof_short_name: 'H', prompt_role: '', target_group: '', prompt_notes: null, class_levels: [10, 11, 12],
    pseudonym_nouns: [], sort_order,
  }
}
const DEPARTMENTS = [row('sped', 'spedilern.vercel.app', 1), row('tour', 'touristiklern.vercel.app', 2)]

// Öffentliche Bereichsliste (anon-Client im Zwischenspeicher)
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => chainMock((table) => (table === 'departments' ? { data: DEPARTMENTS } : {})).client,
}))

let service: ReturnType<typeof chainMock>
const rpc = vi.fn()
vi.mock('@/lib/supabase-server', () => ({
  createClient: vi.fn(),
  createServiceClient: () => service.client,
}))
vi.mock('next/headers', () => ({ headers: vi.fn() }))

import { assignDepartmentIfMissing } from './departments-server'

/** Profil-Tabelle: `updatedRows` = wie viele Zeilen das bedingte Update trifft */
function serviceDb(opts: { updatedRows: number; storedDepartment?: string | null }): ChainResolver {
  return (table, calls) => {
    if (table !== 'profiles') return {}
    if (hasCall(calls, 'update') && hasCall(calls, 'is')) {
      return { data: Array.from({ length: opts.updatedRows }, () => ({ id: 'u1' })) }
    }
    if (hasCall(calls, 'maybeSingle')) return { data: { department_id: opts.storedDepartment ?? null } }
    return {}
  }
}

beforeEach(() => {
  rpc.mockReset().mockResolvedValue({ data: 'Neuer Reisender', error: null })
})

function setup(opts: { updatedRows: number; storedDepartment?: string | null }) {
  service = chainMock(serviceDb(opts), { rpc })
}

describe('assignDepartmentIfMissing (PROJ-23)', () => {
  it('ordnet einem neuen Profil den Bereich der Adresse zu und erzeugt das Pseudonym neu', async () => {
    setup({ updatedRows: 1 })
    const result = await assignDepartmentIfMissing('u1', 'TouristikLern.vercel.app')

    expect(result).toBe('tour')
    const update = service.writes.find((w) => w.table === 'profiles' && (w.payload as { department_id?: string }).department_id)
    expect(update?.payload).toEqual({ department_id: 'tour' })
    // nur speichern, wenn noch leer
    const updateQuery = service.queries.find((q) => q.table === 'profiles' && hasCall(q.calls, 'update'))!
    expect(updateQuery.calls).toContainEqual({ method: 'is', args: ['department_id', null] })
    // Pseudonym mit den Nomen des Bereichs
    expect(rpc).toHaveBeenCalledWith('generate_unique_pseudonym', { p_department_id: 'tour' })
    expect(service.writes).toContainEqual({ table: 'profiles', method: 'update', payload: { pseudonym: 'Neuer Reisender' } })
  })

  it('ordnet bei unbekannter Adresse (Vorschau, localhost) dem ersten Bereich zu', async () => {
    setup({ updatedRows: 1 })
    expect(await assignDepartmentIfMissing('u1', 'spedilern-abc123-team.vercel.app')).toBe('sped')
    expect(await assignDepartmentIfMissing('u1', null)).toBe('sped')
  })

  it('ändert einen bereits gesetzten Bereich nie und würfelt kein neues Pseudonym', async () => {
    setup({ updatedRows: 0, storedDepartment: 'sped' })
    const result = await assignDepartmentIfMissing('u1', 'touristiklern.vercel.app')

    expect(result).toBe('sped')
    expect(rpc).not.toHaveBeenCalled()
    expect(service.writes.some((w) => (w.payload as { pseudonym?: string }).pseudonym)).toBe(false)
  })

  it('behält den Bereich, auch wenn das Pseudonym nicht erzeugt werden kann', async () => {
    setup({ updatedRows: 1 })
    rpc.mockResolvedValueOnce({ data: null, error: { message: 'boom' } })
    expect(await assignDepartmentIfMissing('u1', 'touristiklern.vercel.app')).toBe('tour')
  })
})
