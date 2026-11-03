import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from './route'
import { chainMock } from '@/test/supabase-chain-mock'

vi.mock('@/lib/supabase-server', () => ({
  createClient: vi.fn(),
  createServiceClient: vi.fn(),
}))

import { createClient, createServiceClient } from '@/lib/supabase-server'

const ADMIN_ID = '550e8400-e29b-41d4-a716-446655440000'
const STUDENT = '550e8400-e29b-41d4-a716-446655440001'
const TEACHER = '550e8400-e29b-41d4-a716-446655440002'
const SUPER = '550e8400-e29b-41d4-a716-446655440003'
const BEREICHS_ADMIN = '550e8400-e29b-41d4-a716-446655440004'
const LINKED = '550e8400-e29b-41d4-a716-446655440005'
const MISSING = '550e8400-e29b-41d4-a716-446655440006'
const DEPT_A = '11111111-1111-4111-8111-111111111111'
const DEPT_B = '22222222-2222-4222-8222-222222222222'

type Profile = { id: string; role: string; department_id: string | null; linked_main_user_id: string | null }
const PROFILES: Profile[] = [
  { id: ADMIN_ID, role: 'admin', department_id: DEPT_A, linked_main_user_id: null },
  { id: STUDENT, role: 'student', department_id: DEPT_A, linked_main_user_id: null },
  { id: TEACHER, role: 'teacher', department_id: DEPT_A, linked_main_user_id: null },
  { id: SUPER, role: 'admin', department_id: DEPT_A, linked_main_user_id: null },
  { id: BEREICHS_ADMIN, role: 'department_admin', department_id: DEPT_A, linked_main_user_id: null },
  { id: LINKED, role: 'student', department_id: DEPT_A, linked_main_user_id: ADMIN_ID },
]

function request(body: unknown) {
  return new NextRequest(new URL('http://localhost/api/admin/users/bulk'), {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  })
}

function authClient(role: string | null) {
  const { client, writes } = chainMock(
    (table) => (table === 'profiles' ? { data: { role, department_id: DEPT_A } } : {}),
    { auth: { getUser: vi.fn().mockResolvedValue({ data: { user: role ? { id: ADMIN_ID, email: 'a@a.de' } : null } }) } },
  )
  return { client, writes }
}

function serviceClient(opts: { failBanFor?: string[]; departmentExists?: boolean; failMoveFor?: string } = {}) {
  const { client, writes } = chainMock((table, calls) => {
    if (table === 'departments') return { data: opts.departmentExists === false ? null : { id: DEPT_B } }
    if (table === 'profiles' && calls.some((c) => c.method === 'update')) {
      const id = calls.find((c) => c.method === 'eq')?.args[1]
      return { error: id === opts.failMoveFor ? { message: 'boom' } : null }
    }
    if (table === 'profiles') {
      const ids = (calls.find((c) => c.method === 'in')?.args[1] as string[]) ?? []
      return { data: PROFILES.filter((p) => ids.includes(p.id)) }
    }
    return {}
  })
  const updateUserById = vi.fn(async (id: string) => ({ error: opts.failBanFor?.includes(id) ? { message: 'boom' } : null }))
  ;(client as unknown as { auth: unknown }).auth = { admin: { updateUserById } }
  return { client, writes, updateUserById }
}

function setup(role: string | null = 'admin', service = serviceClient()) {
  const auth = authClient(role)
  vi.mocked(createClient).mockResolvedValue(auth.client as never)
  vi.mocked(createServiceClient).mockReturnValue(service.client as never)
  return { auth, service }
}

const auditOf = (writes: { table: string; payload: unknown }[]) =>
  writes.filter((w) => w.table === 'admin_audit_log').map((w) => w.payload as Record<string, unknown>)

describe('POST /api/admin/users/bulk (PROJ-61)', () => {
  beforeEach(() => vi.clearAllMocks())

  it('401 ohne Anmeldung', async () => {
    setup(null)
    expect((await POST(request({ action: 'ban', ids: [STUDENT] }))).status).toBe(401)
  })

  it.each(['department_admin', 'teacher', 'student'])('403 für %s, auch mit gültigem Aufruf', async (role) => {
    const { service } = setup(role)
    const res = await POST(request({ action: 'ban', ids: [STUDENT] }))
    expect(res.status).toBe(403)
    expect(service.updateUserById).not.toHaveBeenCalled()
    expect(service.writes).toHaveLength(0)
  })

  it('400 bei ungültigen Eingaben', async () => {
    setup()
    for (const body of [
      { action: 'ban', ids: [] },
      { action: 'ban', ids: ['kein-uuid'] },
      { action: 'delete', ids: [STUDENT] },
      { action: 'move', ids: [STUDENT] },
      { action: 'ban', ids: Array.from({ length: 501 }, (_, i) => `550e8400-e29b-41d4-a716-${String(i).padStart(12, '0')}`) },
    ]) {
      expect((await POST(request(body))).status).toBe(400)
    }
  })

  it('400 bei kaputtem JSON', async () => {
    setup()
    const bad = new NextRequest(new URL('http://localhost/api/admin/users/bulk'), { method: 'POST', body: '{nope' })
    expect((await POST(bad)).status).toBe(400)
  })

  it('Sperren: bearbeitet Azubi, Lehrkraft und Bereichs-Admin, überspringt den Rest mit Grund', async () => {
    const { service } = setup()
    const res = await POST(request({ action: 'ban', ids: [STUDENT, TEACHER, BEREICHS_ADMIN, SUPER, ADMIN_ID, LINKED, MISSING] }))
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.summary).toEqual({ done: 3, skipped: 4, failed: 0 })
    const byId = Object.fromEntries(json.results.map((r: { id: string }) => [r.id, r]))
    expect(byId[STUDENT]).toEqual({ id: STUDENT, status: 'done' })
    expect(byId[BEREICHS_ADMIN].status).toBe('done')
    expect(byId[SUPER]).toEqual({ id: SUPER, status: 'skipped', reason: 'super_admin' })
    expect(byId[ADMIN_ID]).toEqual({ id: ADMIN_ID, status: 'skipped', reason: 'self' })
    expect(byId[LINKED]).toEqual({ id: LINKED, status: 'skipped', reason: 'linked' })
    expect(byId[MISSING]).toEqual({ id: MISSING, status: 'skipped', reason: 'not_found' })
    expect(service.updateUserById).toHaveBeenCalledTimes(3)
    expect(service.updateUserById).toHaveBeenCalledWith(STUDENT, { ban_duration: '876000h' })
    expect(service.updateUserById).not.toHaveBeenCalledWith(SUPER, expect.anything())
  })

  it('schreibt pro erledigter Änderung einen eigenen Protokoll-Eintrag, nicht für Übersprungene', async () => {
    const { auth } = setup()
    await POST(request({ action: 'ban', ids: [STUDENT, TEACHER, SUPER] }))
    const entries = auditOf(auth.writes)
    expect(entries).toHaveLength(2)
    expect(entries.map((e) => e.object_id).sort()).toEqual([STUDENT, TEACHER].sort())
    expect(entries[0]).toMatchObject({ admin_id: ADMIN_ID, action_type: 'user.ban', object_type: 'user', details: { bulk: true } })
  })

  it('Entsperren hebt die Sperre auf und protokolliert user.unban', async () => {
    const { auth, service } = setup()
    await POST(request({ action: 'unban', ids: [STUDENT] }))
    expect(service.updateUserById).toHaveBeenCalledWith(STUDENT, { ban_duration: 'none' })
    expect(auditOf(auth.writes)[0]).toMatchObject({ action_type: 'user.unban', object_id: STUDENT })
  })

  it('Bereich ändern: verschiebt, überspringt Bereichs-Admin („Rolle zuerst ändern“) und schon Dortige', async () => {
    const { auth, service } = setup()
    const res = await POST(request({ action: 'move', ids: [STUDENT, BEREICHS_ADMIN, SUPER], department_id: DEPT_B }))
    const json = await res.json()
    expect(json.summary).toEqual({ done: 1, skipped: 2, failed: 0 })
    expect(json.results.find((r: { id: string }) => r.id === BEREICHS_ADMIN)).toMatchObject({ reason: 'role_first' })
    const updates = service.writes.filter((w) => w.table === 'profiles' && w.method === 'update')
    expect(updates).toEqual([{ table: 'profiles', method: 'update', payload: { department_id: DEPT_B } }])
    expect(auditOf(auth.writes)[0]).toMatchObject({
      action_type: 'user.move_department',
      object_id: STUDENT,
      department_id: DEPT_B,
      details: { from: DEPT_A, to: DEPT_B, bulk: true },
    })
  })

  it('Bereich ändern: wer schon im Zielbereich ist, wird übersprungen', async () => {
    setup()
    const json = await (await POST(request({ action: 'move', ids: [STUDENT], department_id: DEPT_A }))).json()
    expect(json.results[0]).toEqual({ id: STUDENT, status: 'skipped', reason: 'same_department' })
  })

  it('Bereich ändern: 400, wenn der Ziel-Bereich nicht existiert', async () => {
    const { service } = setup('admin', serviceClient({ departmentExists: false }))
    const res = await POST(request({ action: 'move', ids: [STUDENT], department_id: DEPT_B }))
    expect(res.status).toBe(400)
    expect(service.writes.filter((w) => w.method === 'update')).toHaveLength(0)
  })

  it('Teilfehler: ein fehlgeschlagenes Konto stoppt die anderen nicht und wird nicht protokolliert', async () => {
    const { auth } = setup('admin', serviceClient({ failBanFor: [TEACHER] }))
    const json = await (await POST(request({ action: 'ban', ids: [STUDENT, TEACHER, BEREICHS_ADMIN] }))).json()
    expect(json.summary).toEqual({ done: 2, skipped: 0, failed: 1 })
    expect(json.results[1]).toEqual({ id: TEACHER, status: 'failed' })
    expect(auditOf(auth.writes).map((e) => e.object_id)).not.toContain(TEACHER)
  })

  it('Teilfehler beim Verschieben', async () => {
    setup('admin', serviceClient({ failMoveFor: STUDENT }))
    const json = await (await POST(request({ action: 'move', ids: [STUDENT, TEACHER], department_id: DEPT_B }))).json()
    expect(json.summary).toEqual({ done: 1, skipped: 0, failed: 1 })
  })

  it('doppelte Ids werden nur einmal bearbeitet; Ergebnis bleibt in Eingabe-Reihenfolge', async () => {
    const { service } = setup()
    const json = await (await POST(request({ action: 'ban', ids: [TEACHER, STUDENT, TEACHER] }))).json()
    expect(json.results.map((r: { id: string }) => r.id)).toEqual([TEACHER, STUDENT])
    expect(service.updateUserById).toHaveBeenCalledTimes(2)
  })

  it('nimmt 500 Konten in einem Aufruf an', async () => {
    setup()
    const ids = Array.from({ length: 500 }, (_, i) => `550e8400-e29b-41d4-a716-${String(100 + i).padStart(12, '0')}`)
    const res = await POST(request({ action: 'unban', ids }))
    expect(res.status).toBe(200)
    expect((await res.json()).summary.skipped).toBe(500) // alle unbekannt → "nicht gefunden"
  })
})
