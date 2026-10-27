import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST, PASSWORD_SET_LIMIT_PER_HOUR } from './route'
import { chainMock } from '@/test/supabase-chain-mock'

vi.mock('@/lib/supabase-server', () => ({
  createClient: vi.fn(),
  createServiceClient: vi.fn(),
}))

import { createClient, createServiceClient } from '@/lib/supabase-server'

const TARGET_ID = '550e8400-e29b-41d4-a716-446655440099'
const ADMIN_ID = '550e8400-e29b-41d4-a716-446655440001'
const DEPT_SPED = '11111111-1111-4111-8111-111111111111'
const DEPT_TOUR = '22222222-2222-4222-8222-222222222222'
const PASSWORD = 'Hafen-Kran-Birke-47'

function call(body: unknown, id = TARGET_ID) {
  const req = new NextRequest(`http://localhost/api/admin/users/${id}/password`, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  })
  return POST(req, { params: Promise.resolve({ id }) })
}

function adminClient(role: 'admin' | 'department_admin' | 'teacher' = 'admin', departmentId = DEPT_SPED) {
  const mock = chainMock(
    (table) => (table === 'profiles' ? { data: { role, department_id: departmentId } } : {}),
    { auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: ADMIN_ID, email: 'a@a.de' } } }) } },
  )
  vi.mocked(createClient).mockResolvedValue(mock.client as never)
  return mock
}

function serviceClient(opts: { target?: unknown; recentCount?: number; updateError?: unknown; revokeError?: unknown } = {}) {
  const mock = chainMock((table) => {
    if (table === 'profiles') {
      return {
        data:
          opts.target === undefined
            ? { role: 'student', department_id: DEPT_SPED, linked_main_user_id: null }
            : opts.target,
      }
    }
    if (table === 'admin_audit_log') return { count: opts.recentCount ?? 0 }
    return {}
  })
  const updateUserById = vi.fn().mockResolvedValue({ error: opts.updateError ?? null })
  const rpc = vi.fn().mockResolvedValue({ error: opts.revokeError ?? null })
  Object.assign(mock.client, { auth: { admin: { updateUserById } }, rpc })
  vi.mocked(createServiceClient).mockReturnValue(mock.client as never)
  return { ...mock, updateUserById, rpc }
}

describe('POST /api/admin/users/[id]/password (PROJ-58)', () => {
  beforeEach(() => vi.clearAllMocks())

  it('401 ohne Login', async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
    } as never)
    expect((await call({ password: PASSWORD })).status).toBe(401)
  })

  it('403 für eine Lehrkraft ohne Admin-Rolle', async () => {
    adminClient('teacher')
    expect((await call({ password: PASSWORD })).status).toBe(403)
  })

  it('Super-Admin: setzt Passwort + Pflichtwechsel-Merker, meldet ab und protokolliert ohne Passwort', async () => {
    const admin = adminClient('admin')
    const service = serviceClient({ target: { role: 'teacher', department_id: DEPT_TOUR, linked_main_user_id: null } })
    const res = await call({ password: PASSWORD })
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(JSON.stringify(json)).not.toContain(PASSWORD)
    expect(service.updateUserById).toHaveBeenCalledWith(TARGET_ID, {
      password: PASSWORD,
      app_metadata: { must_change_password: true },
    })
    expect(service.rpc).toHaveBeenCalledWith('admin_revoke_user_sessions', { target_user_id: TARGET_ID })
    const log = admin.writes.find((w) => w.table === 'admin_audit_log')
    expect(log?.payload).toMatchObject({ action_type: 'user.password_set', object_id: TARGET_ID, department_id: DEPT_TOUR })
    expect(JSON.stringify(log?.payload)).not.toContain(PASSWORD)
  })

  it('Bereichs-Admin: eigener Azubi ok', async () => {
    adminClient('department_admin', DEPT_SPED)
    serviceClient()
    expect((await call({ password: PASSWORD })).status).toBe(200)
  })

  it.each([
    ['Lehrkraft im eigenen Bereich', { role: 'teacher', department_id: DEPT_SPED, linked_main_user_id: null }],
    ['Bereichs-Admin im eigenen Bereich', { role: 'department_admin', department_id: DEPT_SPED, linked_main_user_id: null }],
    ['Azubi in fremdem Bereich', { role: 'student', department_id: DEPT_TOUR, linked_main_user_id: null }],
  ])('Bereichs-Admin: 404 bei %s', async (_label, target) => {
    adminClient('department_admin', DEPT_SPED)
    const service = serviceClient({ target })
    expect((await call({ password: PASSWORD })).status).toBe(404)
    expect(service.updateUserById).not.toHaveBeenCalled()
  })

  it('404 für unbekannte Konten und den verknüpften Zweitaccount', async () => {
    adminClient('admin')
    serviceClient({ target: null })
    expect((await call({ password: PASSWORD })).status).toBe(404)
    serviceClient({ target: { role: 'student', department_id: DEPT_SPED, linked_main_user_id: ADMIN_ID } })
    expect((await call({ password: PASSWORD })).status).toBe(404)
  })

  it('400 für das eigene Konto', async () => {
    adminClient('admin')
    serviceClient()
    expect((await call({ password: PASSWORD }, ADMIN_ID)).status).toBe(400)
  })

  it('400 bei zu kurzem Passwort, mit verständlicher Meldung', async () => {
    adminClient('admin')
    const service = serviceClient()
    const res = await call({ password: 'kurz' })
    expect(res.status).toBe(400)
    expect((await res.json()).error).toContain('mindestens 8 Zeichen')
    expect(service.updateUserById).not.toHaveBeenCalled()
  })

  it('429 nach zu vielen Vergaben in der letzten Stunde', async () => {
    adminClient('admin')
    const service = serviceClient({ recentCount: PASSWORD_SET_LIMIT_PER_HOUR })
    expect((await call({ password: PASSWORD })).status).toBe(429)
    expect(service.updateUserById).not.toHaveBeenCalled()
  })

  it('500 ohne Protokoll, wenn Supabase das Passwort nicht setzt', async () => {
    const admin = adminClient('admin')
    serviceClient({ updateError: { code: 'unexpected_failure', message: 'x' } })
    expect((await call({ password: PASSWORD })).status).toBe(500)
    expect(admin.writes.find((w) => w.table === 'admin_audit_log')).toBeUndefined()
  })

  it('bleibt erfolgreich, wenn nur das Abmelden anderer Geräte scheitert (Proxy schützt)', async () => {
    adminClient('admin')
    serviceClient({ revokeError: { message: 'function missing' } })
    vi.spyOn(console, 'error').mockImplementation(() => {})
    expect((await call({ password: PASSWORD })).status).toBe(200)
  })
})
