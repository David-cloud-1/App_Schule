import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { chainMock, eqValue } from '@/test/supabase-chain-mock'

vi.mock('@/lib/supabase-server', () => ({ createClient: vi.fn() }))

import { createClient } from '@/lib/supabase-server'
import { PATCH } from './route'

function makeClient(user: unknown, role: string | null, updateError: unknown = null) {
  return chainMock(
    (table, calls) => {
      if (table === 'profiles' && calls.some((c) => c.method === 'update')) return { error: updateError }
      return { data: role ? { role } : null }
    },
    { auth: { getUser: vi.fn().mockResolvedValue({ data: { user } }) } },
  )
}

const req = (body: unknown) =>
  new NextRequest('http://localhost/api/profile/kuerzel', { method: 'PATCH', body: typeof body === 'string' ? body : JSON.stringify(body) })

describe('PATCH /api/profile/kuerzel (PROJ-50)', () => {
  beforeEach(() => vi.clearAllMocks())

  it('antwortet 401 ohne Login', async () => {
    vi.mocked(createClient).mockResolvedValue(makeClient(null, null).client as never)
    expect((await PATCH(req({ kuerzel: 'MU' }))).status).toBe(401)
  })

  it('antwortet 403 für Azubis', async () => {
    vi.mocked(createClient).mockResolvedValue(makeClient({ id: 'u1' }, 'student').client as never)
    expect((await PATCH(req({ kuerzel: 'MU' }))).status).toBe(403)
  })

  it('speichert das Kürzel groß geschrieben, nur in der eigenen Zeile und nur diese Spalte', async () => {
    const mock = makeClient({ id: 'u1' }, 'teacher')
    vi.mocked(createClient).mockResolvedValue(mock.client as never)
    const res = await PATCH(req({ kuerzel: ' mü ' }))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ kuerzel: 'MÜ' })
    expect(mock.writes).toEqual([{ table: 'profiles', method: 'update', payload: { kuerzel: 'MÜ' } }])
    expect(eqValue(mock.queries.at(-1)!.calls, 'id')).toBe('u1')
  })

  it('entfernt das Kürzel bei leerer Eingabe oder null', async () => {
    for (const kuerzel of ['', '  ', null]) {
      const mock = makeClient({ id: 'u1' }, 'department_admin')
      vi.mocked(createClient).mockResolvedValue(mock.client as never)
      expect((await PATCH(req({ kuerzel }))).status).toBe(200)
      expect(mock.writes[0].payload).toEqual({ kuerzel: null })
    }
  })

  it('lehnt ungültige Kürzel mit 400 ab, ohne zu schreiben', async () => {
    for (const kuerzel of ['A', 'ABCDEF', 'A1', 'A B', 'ab!']) {
      const mock = makeClient({ id: 'u1' }, 'teacher')
      vi.mocked(createClient).mockResolvedValue(mock.client as never)
      const res = await PATCH(req({ kuerzel }))
      expect(res.status, kuerzel).toBe(400)
      expect(mock.writes).toEqual([])
    }
  })

  it('lehnt falsche Formen ab (Zahl, kein JSON, Rolle mitschicken wird ignoriert)', async () => {
    vi.mocked(createClient).mockResolvedValue(makeClient({ id: 'u1' }, 'teacher').client as never)
    expect((await PATCH(req({ kuerzel: 5 }))).status).toBe(400)
    expect((await PATCH(req('kein json'))).status).toBe(400)
    const mock = makeClient({ id: 'u1' }, 'teacher')
    vi.mocked(createClient).mockResolvedValue(mock.client as never)
    await PATCH(req({ kuerzel: 'MU', role: 'admin' }))
    expect(mock.writes[0].payload).toEqual({ kuerzel: 'MU' })
  })

  it('meldet 400, wenn die Datenbank-Regel greift, und 500 bei anderen Fehlern', async () => {
    vi.mocked(createClient).mockResolvedValue(makeClient({ id: 'u1' }, 'teacher', { code: '23514' }).client as never)
    expect((await PATCH(req({ kuerzel: 'MU' }))).status).toBe(400)
    vi.mocked(createClient).mockResolvedValue(makeClient({ id: 'u1' }, 'teacher', { code: 'XX000' }).client as never)
    expect((await PATCH(req({ kuerzel: 'MU' }))).status).toBe(500)
  })
})
