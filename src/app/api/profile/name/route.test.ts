import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { chainMock, eqValue } from '@/test/supabase-chain-mock'

vi.mock('@/lib/supabase-server', () => ({ createClient: vi.fn(), createServiceClient: vi.fn() }))

import { createClient, createServiceClient } from '@/lib/supabase-server'
import { PATCH } from './route'

type Before = { first_name: string | null; last_name: string | null; display_name: string | null; department_id: string | null }
const EMPTY: Before = { first_name: null, last_name: null, display_name: 'erika.muster', department_id: 'd1' }

function makeClient(user: unknown, role: string | null, before: Before = EMPTY) {
  return chainMock(
    (table, calls) => {
      if (table !== 'profiles') return {}
      const select = String(calls.find((c) => c.method === 'select')?.args[0] ?? '')
      return { data: select === 'role' ? (role ? { role } : null) : before }
    },
    { auth: { getUser: vi.fn().mockResolvedValue({ data: { user } }) } },
  )
}

function makeService(updateError: unknown = null) {
  const mock = chainMock((table, calls) => (calls.some((c) => c.method === 'update') ? { error: updateError } : {}))
  vi.mocked(createServiceClient).mockReturnValue(mock.client as never)
  return mock
}

const req = (body: unknown) =>
  new NextRequest('http://localhost/api/profile/name', {
    method: 'PATCH',
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })

describe('PATCH /api/profile/name (PROJ-121)', () => {
  beforeEach(() => vi.clearAllMocks())

  it('antwortet 401 ohne Login', async () => {
    vi.mocked(createClient).mockResolvedValue(makeClient(null, null).client as never)
    makeService()
    expect((await PATCH(req({ firstName: 'Erika', lastName: 'Muster' }))).status).toBe(401)
  })

  it('antwortet 403 für Azubis und schreibt nichts', async () => {
    vi.mocked(createClient).mockResolvedValue(makeClient({ id: 'u1' }, 'student').client as never)
    const service = makeService()
    expect((await PATCH(req({ firstName: 'Erika', lastName: 'Muster' }))).status).toBe(403)
    expect(service.writes).toEqual([])
  })

  it.each(['teacher', 'department_admin', 'admin'])('speichert Vor-, Nachnamen und Anzeigenamen für %s in einem Schritt, nur in der eigenen Zeile', async (role) => {
    vi.mocked(createClient).mockResolvedValue(makeClient({ id: 'u1' }, role).client as never)
    const service = makeService()
    const res = await PATCH(req({ firstName: ' Erika ', lastName: 'Muster' }))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ firstName: 'Erika', lastName: 'Muster', displayName: 'Erika Muster' })
    const write = service.writes.find((w) => w.table === 'profiles')
    expect(write?.payload).toEqual({ first_name: 'Erika', last_name: 'Muster', display_name: 'Erika Muster' })
    expect(eqValue(service.queries.find((q) => q.calls.some((c) => c.method === 'update'))!.calls, 'id')).toBe('u1')
  })

  it('protokolliert die Ersteingabe als „erstmals angegeben“', async () => {
    vi.mocked(createClient).mockResolvedValue(makeClient({ id: 'u1' }, 'teacher').client as never)
    const service = makeService()
    await PATCH(req({ firstName: 'Erika', lastName: 'Muster' }))
    const log = service.writes.find((w) => w.table === 'admin_audit_log')
    expect(log?.payload).toMatchObject({
      admin_id: 'u1',
      action_type: 'user.name_set',
      object_id: 'u1',
      details: { first_time: true, new: 'Erika Muster' },
    })
  })

  it('protokolliert eine Änderung mit altem und neuem Namen', async () => {
    const before = { first_name: 'Erika', last_name: 'Muster', display_name: 'Erika Muster', department_id: 'd1' }
    vi.mocked(createClient).mockResolvedValue(makeClient({ id: 'u1' }, 'teacher', before).client as never)
    const service = makeService()
    await PATCH(req({ firstName: 'Erika', lastName: 'Meier' }))
    const log = service.writes.find((w) => w.table === 'admin_audit_log')
    expect(log?.payload).toMatchObject({ details: { old: 'Erika Muster', new: 'Erika Meier' } })
  })

  it('schreibt bei unverändertem Namen kein weiteres Protokoll', async () => {
    const before = { first_name: 'Erika', last_name: 'Muster', display_name: 'Erika Muster', department_id: 'd1' }
    vi.mocked(createClient).mockResolvedValue(makeClient({ id: 'u1' }, 'teacher', before).client as never)
    const service = makeService()
    expect((await PATCH(req({ firstName: 'Erika', lastName: 'Muster' }))).status).toBe(200)
    expect(service.writes.find((w) => w.table === 'admin_audit_log')).toBeUndefined()
  })

  it('lehnt ungültige Eingaben mit 400 und Hinweis auf das Feld ab, ohne zu schreiben', async () => {
    for (const [body, field] of [
      [{ firstName: '', lastName: 'Muster' }, 'firstName'],
      [{ firstName: 'Erika', lastName: '   ' }, 'lastName'],
      [{ firstName: 'Er1ka', lastName: 'Muster' }, 'firstName'],
      [{ firstName: 'Erika', lastName: '<script>' }, 'lastName'],
      [{ firstName: 'a'.repeat(61), lastName: 'Muster' }, 'firstName'],
    ] as const) {
      vi.mocked(createClient).mockResolvedValue(makeClient({ id: 'u1' }, 'teacher').client as never)
      const service = makeService()
      const res = await PATCH(req(body))
      expect(res.status, JSON.stringify(body)).toBe(400)
      expect((await res.json()).field).toBe(field)
      expect(service.writes).toEqual([])
    }
  })

  it('lehnt kein JSON und fehlende Felder ab', async () => {
    vi.mocked(createClient).mockResolvedValue(makeClient({ id: 'u1' }, 'teacher').client as never)
    makeService()
    expect((await PATCH(req('kein json'))).status).toBe(400)
    expect((await PATCH(req({ firstName: 'Erika' }))).status).toBe(400)
  })

  it('ignoriert mitgeschickte Fremdfelder (Rolle, Id, Anzeigename)', async () => {
    vi.mocked(createClient).mockResolvedValue(makeClient({ id: 'u1' }, 'teacher').client as never)
    const service = makeService()
    await PATCH(req({ firstName: 'Erika', lastName: 'Muster', role: 'admin', id: 'u2', display_name: 'Chef' }))
    expect(service.writes.find((w) => w.table === 'profiles')?.payload).toEqual({
      first_name: 'Erika',
      last_name: 'Muster',
      display_name: 'Erika Muster',
    })
  })

  it('antwortet 500 mit verständlichem Satz, wenn das Speichern scheitert', async () => {
    vi.mocked(createClient).mockResolvedValue(makeClient({ id: 'u1' }, 'teacher').client as never)
    makeService({ message: 'db down' })
    const res = await PATCH(req({ firstName: 'Erika', lastName: 'Muster' }))
    expect(res.status).toBe(500)
    expect((await res.json()).error).toBe('Der Name konnte nicht gespeichert werden.')
  })
})
