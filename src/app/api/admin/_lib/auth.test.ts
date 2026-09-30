import { describe, it, expect, vi, beforeEach } from 'vitest'
import { chainMock } from '@/test/supabase-chain-mock'

vi.mock('@/lib/supabase-server', () => ({
  createClient: vi.fn(),
}))
vi.mock('next/headers', () => ({
  cookies: vi.fn(),
}))
vi.mock('@/lib/departments', () => ({
  getFallbackDepartment: vi.fn(),
}))

import { createClient } from '@/lib/supabase-server'
import { cookies } from 'next/headers'
import { getFallbackDepartment } from '@/lib/departments'
import {
  requireAdmin,
  canAdminDepartment,
  assertCanAdminDepartment,
  ADMIN_DEPARTMENT_COOKIE,
} from './auth'

function makeCookies(value: string | undefined) {
  return {
    get: vi.fn((name: string) => (name === ADMIN_DEPARTMENT_COOKIE && value ? { value } : undefined)),
  }
}

function makeSupabase(profile: unknown, departmentExists = true) {
  const { client } = chainMock((table) => {
    if (table === 'profiles') return { data: profile }
    if (table === 'departments') return { data: departmentExists ? { id: 'dept-chosen' } : null }
    return {}
  }, {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1', email: 'u1@example.com' } } }) },
  })
  return client
}

function makeUnauthSupabase() {
  return { auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) }, from: vi.fn() }
}

describe('requireAdmin', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(cookies).mockResolvedValue(makeCookies(undefined) as never)
  })

  it('returns 401 when not authenticated', async () => {
    vi.mocked(createClient).mockResolvedValue(makeUnauthSupabase() as never)
    const auth = await requireAdmin()
    expect(auth.error?.status).toBe(401)
  })

  it('returns 403 for a student', async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabase({ role: 'student', department_id: 'dept-a' }) as never)
    const auth = await requireAdmin()
    expect(auth.error?.status).toBe(403)
  })

  it('returns 403 for a profile with no role at all', async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabase(null) as never)
    const auth = await requireAdmin()
    expect(auth.error?.status).toBe(403)
  })

  it('super-admin without a switcher cookie works in their own department', async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabase({ role: 'admin', department_id: 'dept-a' }) as never)
    const auth = await requireAdmin()
    expect(auth.error).toBeNull()
    if (auth.error) return
    expect(auth.isSuperAdmin).toBe(true)
    expect(auth.role).toBe('admin')
    expect(auth.departmentId).toBe('dept-a')
  })

  it('super-admin with a valid switcher cookie works in the chosen department', async () => {
    vi.mocked(cookies).mockResolvedValue(makeCookies('dept-chosen') as never)
    vi.mocked(createClient).mockResolvedValue(makeSupabase({ role: 'admin', department_id: 'dept-a' }, true) as never)
    const auth = await requireAdmin()
    expect(auth.error).toBeNull()
    if (auth.error) return
    expect(auth.departmentId).toBe('dept-chosen')
  })

  it('super-admin with a switcher cookie pointing at a deleted department falls back to their own', async () => {
    vi.mocked(cookies).mockResolvedValue(makeCookies('dept-gone') as never)
    vi.mocked(createClient).mockResolvedValue(makeSupabase({ role: 'admin', department_id: 'dept-a' }, false) as never)
    const auth = await requireAdmin()
    expect(auth.error).toBeNull()
    if (auth.error) return
    expect(auth.departmentId).toBe('dept-a')
  })

  it('super-admin without any own department falls back to the default department', async () => {
    vi.mocked(getFallbackDepartment).mockResolvedValue({ id: 'dept-fallback' } as never)
    vi.mocked(createClient).mockResolvedValue(makeSupabase({ role: 'admin', department_id: null }) as never)
    const auth = await requireAdmin()
    expect(auth.error).toBeNull()
    if (auth.error) return
    expect(auth.departmentId).toBe('dept-fallback')
  })

  it('department_admin works only in their own department, ignoring the cookie', async () => {
    vi.mocked(cookies).mockResolvedValue(makeCookies('dept-chosen') as never)
    vi.mocked(createClient).mockResolvedValue(makeSupabase({ role: 'department_admin', department_id: 'dept-b' }) as never)
    const auth = await requireAdmin()
    expect(auth.error).toBeNull()
    if (auth.error) return
    expect(auth.isSuperAdmin).toBe(false)
    expect(auth.departmentId).toBe('dept-b')
  })

  it('department_admin without an assigned department is rejected (fail closed)', async () => {
    vi.mocked(getFallbackDepartment).mockResolvedValue({ id: 'dept-fallback' } as never)
    vi.mocked(createClient).mockResolvedValue(makeSupabase({ role: 'department_admin', department_id: null }) as never)
    const auth = await requireAdmin()
    expect(auth.error?.status).toBe(403)
    // Darf NICHT heimlich in den Standardbereich rutschen.
    expect(getFallbackDepartment).not.toHaveBeenCalled()
  })
})

describe('canAdminDepartment / assertCanAdminDepartment', () => {
  const superAdmin = { isSuperAdmin: true, departmentId: 'dept-a', role: 'admin' as const }
  const deptAdmin = { isSuperAdmin: false, departmentId: 'dept-a', role: 'department_admin' as const }

  it('super-admin can admin any department, including an orphaned (null) one', () => {
    expect(canAdminDepartment(superAdmin as never, 'dept-a')).toBe(true)
    expect(canAdminDepartment(superAdmin as never, 'dept-b')).toBe(true)
    expect(canAdminDepartment(superAdmin as never, null)).toBe(true)
  })

  it('department_admin can only admin their own department', () => {
    expect(canAdminDepartment(deptAdmin as never, 'dept-a')).toBe(true)
    expect(canAdminDepartment(deptAdmin as never, 'dept-b')).toBe(false)
  })

  it('department_admin fails closed on an orphaned (null) department object', () => {
    expect(canAdminDepartment(deptAdmin as never, null)).toBe(false)
  })

  it('assertCanAdminDepartment returns 404 (not 403) for a foreign department', () => {
    const res = assertCanAdminDepartment(deptAdmin as never, 'dept-b')
    expect(res?.status).toBe(404)
  })

  it('assertCanAdminDepartment returns null (allowed) for the own department', () => {
    expect(assertCanAdminDepartment(deptAdmin as never, 'dept-a')).toBeNull()
  })
})
