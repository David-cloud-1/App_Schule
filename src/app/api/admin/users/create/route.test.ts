import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from './route'
import {
  ADMIN_ID,
  DEPT_SPED,
  DEPT_TOUR,
  adminClientMock,
  noUserClientMock,
  serviceClientMock,
} from '@/test/account-create-mocks'

vi.mock('@/lib/supabase-server', () => ({ createClient: vi.fn(), createServiceClient: vi.fn() }))
import { createClient, createServiceClient } from '@/lib/supabase-server'

const PASSWORD = 'Hafen-Kran-Birke-47'
const BODY = { name: 'Anna Azubi', email: 'Anna@Example.de', role: 'student', departmentId: DEPT_SPED, password: PASSWORD }

function call(body: unknown) {
  return POST(
    new NextRequest('http://localhost/api/admin/users/create', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'content-type': 'application/json' },
    }),
  )
}

function setup(admin = adminClientMock(), service = serviceClientMock()) {
  vi.mocked(createClient).mockResolvedValue(admin.client as never)
  vi.mocked(createServiceClient).mockReturnValue(service.client as never)
  return { admin, service }
}

describe('POST /api/admin/users/create (PROJ-62)', () => {
  beforeEach(() => vi.clearAllMocks())

  it('401 ohne Login', async () => {
    vi.mocked(createClient).mockResolvedValue(noUserClientMock() as never)
    expect((await call(BODY)).status).toBe(401)
  })

  it.each(['teacher', 'department_admin', 'student'])('403 für %s', async (role) => {
    const { service } = setup(adminClientMock({ role }))
    expect((await call(BODY)).status).toBe(403)
    expect(service.createUser).not.toHaveBeenCalled()
  })

  it.each([
    ['ohne Name', { ...BODY, name: '  ' }],
    ['ungültige E-Mail', { ...BODY, email: 'keine-mail' }],
    ['zu kurzes Passwort', { ...BODY, password: 'kurz' }],
    ['unbekannte Rolle', { ...BODY, role: 'department_admin' }],
    ['ohne Bereich', { ...BODY, departmentId: 'x' }],
  ])('400 %s', async (_label, body) => {
    const { service } = setup()
    expect((await call(body)).status).toBe(400)
    expect(service.createUser).not.toHaveBeenCalled()
  })

  it('400 für einen unbekannten oder inaktiven Bereich', async () => {
    const { service } = setup()
    const res = await call({ ...BODY, departmentId: '99999999-9999-4999-8999-999999999999' })
    expect(res.status).toBe(400)
    expect(service.createUser).not.toHaveBeenCalled()
  })

  it('legt ein bestätigtes Konto mit Pflichtwechsel an, setzt Rolle/Bereich/Name und protokolliert ohne Passwort', async () => {
    const { admin, service } = setup()
    const res = await call(BODY)
    expect(res.status).toBe(200)

    expect(service.createUser).toHaveBeenCalledWith({
      email: 'anna@example.de',
      password: PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: 'Anna Azubi' },
      app_metadata: { must_change_password: true },
    })
    const profileUpdate = service.writes.find((w) => w.table === 'profiles' && w.method === 'update')
    expect(profileUpdate?.payload).toEqual({ role: 'student', department_id: DEPT_SPED, display_name: 'Anna Azubi' })

    const log = admin.writes.find((w) => w.table === 'admin_audit_log')
    expect(log?.payload).toMatchObject({
      admin_id: ADMIN_ID,
      action_type: 'user.create',
      object_type: 'user',
      object_label: 'Anna Azubi',
      department_id: DEPT_SPED,
      details: { rolle: 'student', bereich: 'SPED' },
    })
    expect(JSON.stringify(log?.payload)).not.toContain(PASSWORD)

    const json = await res.json()
    expect(json.account).toEqual({
      name: 'Anna Azubi',
      email: 'anna@example.de',
      password: PASSWORD,
      role: 'student',
      departmentName: 'Spedition',
      appUrl: 'https://spedilern.vercel.app',
    })
    expect(service.deleteUser).not.toHaveBeenCalled()
  })

  it('ohne Bereichs-Domain bleibt appUrl leer (dann gilt die aktuelle Adresse)', async () => {
    setup()
    const json = await (await call({ ...BODY, departmentId: DEPT_TOUR })).json()
    expect(json.account.appUrl).toBeNull()
    expect(json.account.departmentName).toBe('Tourismus')
  })

  it('Lehrkraft bekommt ein Pseudonym, Azubi nicht über diesen Weg', async () => {
    const teacher = setup(adminClientMock(), serviceClientMock({ pseudonym: null }))
    await call({ ...BODY, role: 'teacher' })
    expect(teacher.service.rpc).toHaveBeenCalledWith('generate_unique_pseudonym', { p_department_id: DEPT_SPED })

    const student = setup(adminClientMock(), serviceClientMock({ pseudonym: null }))
    await call(BODY)
    expect(student.service.rpc).not.toHaveBeenCalled()
  })

  it('Super-Admin als Rolle ist einzeln erlaubt', async () => {
    const { service } = setup(adminClientMock(), serviceClientMock({ pseudonym: null }))
    const res = await call({ ...BODY, role: 'admin' })
    expect(res.status).toBe(200)
    const profileUpdate = service.writes.find((w) => w.table === 'profiles' && w.method === 'update')
    expect(profileUpdate?.payload).toMatchObject({ role: 'admin' })
  })

  it('409 wenn die E-Mail schon ein Konto hat; nichts wird geändert', async () => {
    const { admin, service } = setup(adminClientMock(), serviceClientMock({ createError: { code: 'email_exists', message: 'A user with this email address has already been registered' } }))
    const res = await call(BODY)
    expect(res.status).toBe(409)
    expect((await res.json()).error).toContain('Passwort neu vergeben')
    expect(service.writes).toHaveLength(0)
    expect(admin.writes).toHaveLength(0)
  })

  it('Protokoll scheitert: Konto wird wieder gelöscht, Antwort 503 ohne Passwort', async () => {
    const { service } = setup(adminClientMock({ auditError: { code: '500', message: 'down' } }))
    const res = await call(BODY)
    expect(res.status).toBe(503)
    expect(service.deleteUser).toHaveBeenCalledTimes(1)
    expect(JSON.stringify(await res.json())).not.toContain(PASSWORD)
  })

  it('Profil lässt sich nicht setzen: Konto wird wieder gelöscht, Antwort 500', async () => {
    const { service, admin } = setup(adminClientMock(), serviceClientMock({ profileUpdateRows: [] }))
    const res = await call(BODY)
    expect(res.status).toBe(500)
    expect(service.deleteUser).toHaveBeenCalledTimes(1)
    expect(admin.writes.find((w) => w.table === 'admin_audit_log')).toBeUndefined()
  })

  it('zu schwaches Passwort: verständliche Meldung', async () => {
    setup(adminClientMock(), serviceClientMock({ createError: { code: 'weak_password', message: 'weak' } }))
    const res = await call(BODY)
    expect(res.status).toBe(400)
    expect((await res.json()).error).toContain('zu schwach')
  })
})
