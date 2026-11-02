import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from './route'
import { POST as CONFIRM } from './confirm/route'
import { chainMock } from '@/test/supabase-chain-mock'

vi.mock('@/lib/supabase-server', () => ({ createClient: vi.fn(), createServiceClient: vi.fn() }))
import { createClient, createServiceClient } from '@/lib/supabase-server'

const TARGET_ID = '550e8400-e29b-41d4-a716-446655440099'
const ADMIN_ID = '550e8400-e29b-41d4-a716-446655440001'
const DEPT = '11111111-1111-4111-8111-111111111111'

function callEmail(body: unknown, id = TARGET_ID) {
  const req = new NextRequest(`http://localhost/api/admin/users/${id}/email`, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  })
  return POST(req, { params: Promise.resolve({ id }) })
}
function callConfirm(id = TARGET_ID) {
  return CONFIRM(new Request(`http://localhost/api/admin/users/${id}/email/confirm`, { method: 'POST' }), {
    params: Promise.resolve({ id }),
  })
}

function adminClient(role: 'admin' | 'department_admin' = 'admin') {
  const mock = chainMock(
    (table) => (table === 'profiles' ? { data: { role, department_id: DEPT } } : {}),
    { auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: ADMIN_ID, email: 'a@a.de' } } }) } },
  )
  vi.mocked(createClient).mockResolvedValue(mock.client as never)
  return mock
}

function serviceClient(opts: { confirmedAt?: string | null; updateError?: unknown; missing?: boolean } = {}) {
  const mock = chainMock((table) =>
    table === 'profiles' ? { data: { id: TARGET_ID, display_name: 'Anna', department_id: DEPT } } : {},
  )
  const getUserById = vi.fn().mockResolvedValue(
    opts.missing
      ? { data: { user: null }, error: { message: 'nope' } }
      : { data: { user: { id: TARGET_ID, email: 'alt@x.de', email_confirmed_at: opts.confirmedAt ?? null } }, error: null },
  )
  const updateUserById = vi.fn().mockResolvedValue({ error: opts.updateError ?? null })
  Object.assign(mock.client, { auth: { admin: { getUserById, updateUserById } } })
  vi.mocked(createServiceClient).mockReturnValue(mock.client as never)
  return { ...mock, getUserById, updateUserById }
}

describe('POST /api/admin/users/[id]/email (PROJ-59)', () => {
  beforeEach(() => vi.clearAllMocks())

  it('403 für den Bereichs-Admin', async () => {
    adminClient('department_admin')
    serviceClient()
    expect((await callEmail({ email: 'neu@x.de' })).status).toBe(403)
    expect((await callConfirm()).status).toBe(403)
  })

  it('400 beim eigenen Konto', async () => {
    adminClient()
    serviceClient()
    expect((await callEmail({ email: 'neu@x.de' }, ADMIN_ID)).status).toBe(400)
    expect((await callConfirm(ADMIN_ID)).status).toBe(400)
  })

  it('400 bei ungültiger oder gleicher Adresse', async () => {
    adminClient()
    const svc = serviceClient()
    expect((await callEmail({ email: 'keine-mail' })).status).toBe(400)
    expect((await callEmail({ email: 'ALT@x.de' })).status).toBe(400)
    expect(svc.updateUserById).not.toHaveBeenCalled()
  })

  it('ändert die Adresse sofort bestätigt und protokolliert alt/neu', async () => {
    const admin = adminClient()
    const svc = serviceClient()
    const res = await callEmail({ email: '  Neu@X.de ' })
    expect(res.status).toBe(200)
    expect(svc.updateUserById).toHaveBeenCalledWith(TARGET_ID, { email: 'neu@x.de', email_confirm: true })
    const log = admin.writes.find((w) => w.table === 'admin_audit_log')
    expect(log?.payload).toMatchObject({ action_type: 'user.email_change', details: { old: 'alt@x.de', new: 'neu@x.de' } })
  })

  it('409 mit festem Satz, wenn die Adresse vergeben ist', async () => {
    const admin = adminClient()
    serviceClient({ updateError: { status: 422, code: 'email_exists', message: 'exists' } })
    const res = await callEmail({ email: 'neu@x.de' })
    expect(res.status).toBe(409)
    expect((await res.json()).error).toBe('Diese E-Mail gehört schon zu einem anderen Konto.')
    expect(admin.writes.find((w) => w.table === 'admin_audit_log')).toBeUndefined()
  })

  it('markiert eine unbestätigte E-Mail als bestätigt und protokolliert es', async () => {
    const admin = adminClient()
    const svc = serviceClient({ confirmedAt: null })
    expect((await callConfirm()).status).toBe(200)
    expect(svc.updateUserById).toHaveBeenCalledWith(TARGET_ID, { email_confirm: true })
    expect(admin.writes.find((w) => w.table === 'admin_audit_log')?.payload).toMatchObject({ action_type: 'user.email_confirm' })
  })

  it('409, wenn die E-Mail schon bestätigt ist', async () => {
    adminClient()
    const svc = serviceClient({ confirmedAt: '2026-10-01T00:00:00Z' })
    expect((await callConfirm()).status).toBe(409)
    expect(svc.updateUserById).not.toHaveBeenCalled()
  })

  it('404, wenn das Login-Konto fehlt', async () => {
    adminClient()
    serviceClient({ missing: true })
    expect((await callConfirm()).status).toBe(404)
    expect((await callEmail({ email: 'neu@x.de' })).status).toBe(404)
  })
})
