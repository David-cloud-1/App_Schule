import { describe, it, expect, vi, beforeEach } from 'vitest'
import { PATCH } from './route'
import { NextRequest } from 'next/server'
import { chainMock } from '@/test/supabase-chain-mock'

vi.mock('@/lib/supabase-server', () => ({
  createClient: vi.fn(),
  createServiceClient: vi.fn(),
}))

import { createClient, createServiceClient } from '@/lib/supabase-server'

const TARGET_USER_ID = '550e8400-e29b-41d4-a716-446655440099'
const ADMIN_ID = 'admin-uuid-0000-0000-0000-000000000001'
const DEPT_SPED = '11111111-1111-4111-8111-111111111111'
const DEPT_TOUR = '22222222-2222-4222-8222-222222222222'

function makeCtx(id = TARGET_USER_ID) {
  return { params: Promise.resolve({ id }) }
}

function makeRequest(body: unknown) {
  const url = new URL(`http://localhost/api/admin/users/${TARGET_USER_ID}`)
  return new NextRequest(url, {
    method: 'PATCH',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  })
}

function makeAdminClient(role: 'admin' | 'department_admin' = 'admin', departmentId = DEPT_SPED) {
  const { client } = chainMock(
    (table) => {
      if (table === 'profiles') return { data: { role, department_id: departmentId } }
      if (table === 'admin_audit_log') return {}
      return {}
    },
    { auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: ADMIN_ID, email: 'a@a.com' } } }) } },
  )
  return client
}

function makeUnauthClient() {
  return { auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) }, from: vi.fn() }
}

function makeNonAdminClient() {
  const { client } = chainMock(() => ({ data: { role: 'student' } }), {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u' } } }) },
  })
  return client
}

function makeServiceClient(opts: {
  target?: unknown
  updateUserError?: unknown
  updateProfileError?: unknown
} = {}) {
  const { client } = chainMock((table) => {
    if (table === 'profiles') {
      return { data: opts.target === undefined ? { role: 'student', department_id: DEPT_SPED } : opts.target, error: opts.updateProfileError ?? null }
    }
    return {}
  })
  ;(client as unknown as { auth: unknown }).auth = {
    admin: { updateUserById: vi.fn().mockResolvedValue({ error: opts.updateUserError ?? null }) },
  }
  return client
}

describe('PATCH /api/admin/users/[id]', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when not authenticated', async () => {
    vi.mocked(createClient).mockResolvedValue(makeUnauthClient() as never)
    const res = await PATCH(makeRequest({ banned: true }), makeCtx())
    expect(res.status).toBe(401)
  })

  it('returns 403 when not admin', async () => {
    vi.mocked(createClient).mockResolvedValue(makeNonAdminClient() as never)
    const res = await PATCH(makeRequest({ banned: true }), makeCtx())
    expect(res.status).toBe(403)
  })

  it('returns 400 when admin tries to edit themselves', async () => {
    vi.mocked(createClient).mockResolvedValue(makeAdminClient() as never)
    vi.mocked(createServiceClient).mockReturnValue(makeServiceClient() as never)
    const selfCtx = { params: Promise.resolve({ id: ADMIN_ID }) }
    const res = await PATCH(makeRequest({ banned: true }), selfCtx)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toContain('selbst')
  })

  it('returns 404 when the target user does not exist', async () => {
    vi.mocked(createClient).mockResolvedValue(makeAdminClient() as never)
    vi.mocked(createServiceClient).mockReturnValue(makeServiceClient({ target: null }) as never)
    const res = await PATCH(makeRequest({ banned: true }), makeCtx())
    expect(res.status).toBe(404)
  })

  it('bans user and returns ok (super-admin)', async () => {
    vi.mocked(createClient).mockResolvedValue(makeAdminClient() as never)
    vi.mocked(createServiceClient).mockReturnValue(makeServiceClient() as never)
    const res = await PATCH(makeRequest({ banned: true }), makeCtx())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
  })

  it('unbans user and returns ok', async () => {
    vi.mocked(createClient).mockResolvedValue(makeAdminClient() as never)
    vi.mocked(createServiceClient).mockReturnValue(makeServiceClient() as never)
    const res = await PATCH(makeRequest({ banned: false }), makeCtx())
    expect(res.status).toBe(200)
  })

  it('returns 400 for invalid payload', async () => {
    vi.mocked(createClient).mockResolvedValue(makeAdminClient() as never)
    vi.mocked(createServiceClient).mockReturnValue(makeServiceClient() as never)
    const res = await PATCH(makeRequest({ banned: 'yes' }), makeCtx())
    expect(res.status).toBe(400)
  })

  it('returns 500 when the ban call fails', async () => {
    vi.mocked(createClient).mockResolvedValue(makeAdminClient() as never)
    vi.mocked(createServiceClient).mockReturnValue(
      makeServiceClient({ updateUserError: { message: 'Auth error' } }) as never
    )
    const res = await PATCH(makeRequest({ banned: true }), makeCtx())
    expect(res.status).toBe(500)
  })

  it('super-admin can change a role', async () => {
    vi.mocked(createClient).mockResolvedValue(makeAdminClient() as never)
    vi.mocked(createServiceClient).mockReturnValue(makeServiceClient() as never)
    const res = await PATCH(makeRequest({ role: 'department_admin', department_id: DEPT_SPED }), makeCtx())
    expect(res.status).toBe(200)
  })

  it('rejects department_admin role without a department_id', async () => {
    vi.mocked(createClient).mockResolvedValue(makeAdminClient() as never)
    vi.mocked(createServiceClient).mockReturnValue(makeServiceClient() as never)
    const res = await PATCH(makeRequest({ role: 'department_admin' }), makeCtx())
    expect(res.status).toBe(400)
  })

  it('super-admin can move a user to another department', async () => {
    vi.mocked(createClient).mockResolvedValue(makeAdminClient() as never)
    vi.mocked(createServiceClient).mockReturnValue(makeServiceClient() as never)
    const res = await PATCH(makeRequest({ department_id: DEPT_TOUR }), makeCtx())
    expect(res.status).toBe(200)
  })

  it('department_admin gets 403 when trying to assign a role', async () => {
    vi.mocked(createClient).mockResolvedValue(makeAdminClient('department_admin', DEPT_SPED) as never)
    vi.mocked(createServiceClient).mockReturnValue(
      makeServiceClient({ target: { role: 'student', department_id: DEPT_SPED } }) as never
    )
    const res = await PATCH(makeRequest({ role: 'admin' }), makeCtx())
    expect(res.status).toBe(403)
  })

  it('department_admin can move their own student to another department', async () => {
    vi.mocked(createClient).mockResolvedValue(makeAdminClient('department_admin', DEPT_SPED) as never)
    vi.mocked(createServiceClient).mockReturnValue(
      makeServiceClient({ target: { role: 'student', department_id: DEPT_SPED } }) as never
    )
    const res = await PATCH(makeRequest({ department_id: DEPT_TOUR }), makeCtx())
    expect(res.status).toBe(200)
  })

  it('department_admin gets 404 for a student in a foreign department', async () => {
    vi.mocked(createClient).mockResolvedValue(makeAdminClient('department_admin', DEPT_SPED) as never)
    vi.mocked(createServiceClient).mockReturnValue(
      makeServiceClient({ target: { role: 'student', department_id: DEPT_TOUR } }) as never
    )
    const res = await PATCH(makeRequest({ banned: true }), makeCtx())
    expect(res.status).toBe(404)
  })

  it('department_admin gets 404 when targeting another admin, even in their own department', async () => {
    vi.mocked(createClient).mockResolvedValue(makeAdminClient('department_admin', DEPT_SPED) as never)
    vi.mocked(createServiceClient).mockReturnValue(
      makeServiceClient({ target: { role: 'department_admin', department_id: DEPT_SPED } }) as never
    )
    const res = await PATCH(makeRequest({ banned: true }), makeCtx())
    expect(res.status).toBe(404)
  })
})
