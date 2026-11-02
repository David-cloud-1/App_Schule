import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from './route'
import { chainMock } from '@/test/supabase-chain-mock'

vi.mock('@/lib/supabase-server', () => ({ createClient: vi.fn(), createServiceClient: vi.fn() }))
import { createClient, createServiceClient } from '@/lib/supabase-server'

const TARGET_ID = '550e8400-e29b-41d4-a716-446655440099'
const ADMIN_ID = '550e8400-e29b-41d4-a716-446655440001'
const DEPT = '11111111-1111-4111-8111-111111111111'

function call(body: unknown, id = TARGET_ID) {
  const req = new NextRequest(`http://localhost/api/admin/users/${id}/rename`, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  })
  return POST(req, { params: Promise.resolve({ id }) })
}

function adminClient(role: 'admin' | 'department_admin' | 'teacher' = 'admin') {
  const mock = chainMock(
    (table) => (table === 'profiles' ? { data: { role, department_id: DEPT } } : {}),
    { auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: ADMIN_ID, email: 'a@a.de' } } }) } },
  )
  vi.mocked(createClient).mockResolvedValue(mock.client as never)
  return mock
}

function serviceClient(target: unknown = { id: TARGET_ID, display_name: 'Alt Name', department_id: DEPT }, updateError: unknown = null) {
  const mock = chainMock((table, calls) => {
    if (table === 'profiles' && calls.some((c) => c.method === 'update')) return { error: updateError }
    if (table === 'profiles') return { data: target }
    return {}
  })
  vi.mocked(createServiceClient).mockReturnValue(mock.client as never)
  return mock
}

describe('POST /api/admin/users/[id]/rename (PROJ-59)', () => {
  beforeEach(() => vi.clearAllMocks())

  it('401 ohne Login', async () => {
    vi.mocked(createClient).mockResolvedValue({ auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) } } as never)
    expect((await call({ name: 'Neu Name' })).status).toBe(401)
  })

  it.each(['department_admin', 'teacher'] as const)('403 für %s', async (role) => {
    adminClient(role)
    serviceClient()
    expect((await call({ name: 'Neu Name' })).status).toBe(403)
  })

  it('404 bei ungültiger Id und bei unbekanntem Konto', async () => {
    adminClient()
    serviceClient()
    expect((await call({ name: 'Neu Name' }, 'kein-uuid')).status).toBe(404)
    serviceClient(null)
    expect((await call({ name: 'Neu Name' })).status).toBe(404)
  })

  it('400 bei zu kurzem Namen und bei gleichem Namen', async () => {
    adminClient()
    serviceClient()
    expect((await call({ name: 'A' })).status).toBe(400)
    const same = await call({ name: ' Alt Name ' })
    expect(same.status).toBe(400)
    expect((await same.json()).error).toBe('Das ist schon der aktuelle Name.')
  })

  it('ändert den Namen, trimmt ihn und protokolliert alt/neu', async () => {
    const admin = adminClient()
    const service = serviceClient()
    const res = await call({ name: '  Neuer Name ' })
    expect(res.status).toBe(200)
    expect(service.writes.find((w) => w.table === 'profiles')?.payload).toEqual({ display_name: 'Neuer Name' })
    const log = admin.writes.find((w) => w.table === 'admin_audit_log')
    expect(log?.payload).toMatchObject({
      action_type: 'user.rename',
      object_type: 'user',
      object_id: TARGET_ID,
      details: { old: 'Alt Name', new: 'Neuer Name' },
      department_id: DEPT,
    })
  })

  it('der Super-Admin darf den eigenen Namen ändern', async () => {
    adminClient()
    serviceClient({ id: ADMIN_ID, display_name: 'Ich', department_id: DEPT })
    expect((await call({ name: 'Ich neu' }, ADMIN_ID)).status).toBe(200)
  })

  it('500 ohne Protokoll, wenn das Speichern fehlschlägt', async () => {
    const admin = adminClient()
    serviceClient(undefined, { message: 'boom' })
    expect((await call({ name: 'Neuer Name' })).status).toBe(500)
    expect(admin.writes.find((w) => w.table === 'admin_audit_log')).toBeUndefined()
  })
})
