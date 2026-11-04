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
  requireContentAdmin,
  canAdminSubject,
  canAdminDepartmentContent,
  canAdminQuestion,
  requireTeacher,
  ADMIN_DEPARTMENT_COOKIE,
  ADMIN_SCOPE_COOKIE,
  SCOPE_ALL,
  resolveTargetDepartment,
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

  it('returns 403 for a teacher without management rights, even with a department (PROJ-44)', async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabase({ role: 'teacher', department_id: 'dept-a' }) as never)
    const auth = await requireAdmin()
    expect(auth.error?.status).toBe(403)
    const withoutDepartment = makeSupabase({ role: 'teacher', department_id: null })
    vi.mocked(createClient).mockResolvedValue(withoutDepartment as never)
    expect((await requireAdmin()).error?.status).toBe(403)
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

function makeContentSupabase(profile: unknown, departments: unknown[] = [{ id: 'dept-a' }, { id: 'dept-b' }]) {
  const { client } = chainMock((table) => {
    if (table === 'profiles') return { data: profile }
    if (table === 'departments') return { data: departments }
    return {}
  }, {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1', email: 'u1@example.com' } } }) },
  })
  return client
}

function makeScopeCookies(scope: string | undefined, department?: string) {
  return {
    get: vi.fn((name: string) => {
      if (name === ADMIN_SCOPE_COOKIE && scope) return { value: scope }
      if (name === ADMIN_DEPARTMENT_COOKIE && department) return { value: department }
      return undefined
    }),
  }
}

describe('requireContentAdmin (PROJ-70)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(cookies).mockResolvedValue(makeCookies(undefined) as never)
  })

  it('returns 401 when not authenticated', async () => {
    vi.mocked(createClient).mockResolvedValue(makeUnauthSupabase() as never)
    const auth = await requireContentAdmin()
    expect(auth.error?.status).toBe(401)
  })

  it('returns 403 for a student', async () => {
    vi.mocked(createClient).mockResolvedValue(makeContentSupabase({ role: 'student' }) as never)
    const auth = await requireContentAdmin()
    expect(auth.error?.status).toBe(403)
  })

  it.each(['teacher', 'department_admin', 'admin'])('lets %s in and knows every department', async (role) => {
    vi.mocked(createClient).mockResolvedValue(makeContentSupabase({ role, department_id: 'dept-a' }) as never)
    const auth = await requireContentAdmin()
    expect(auth.error).toBeNull()
    if (auth.error) return
    expect(auth.departmentIds).toEqual(['dept-a', 'dept-b'])
    expect(auth.subjectIds).toBeNull()
  })

  it('a teacher without any subject entry is no longer rejected', async () => {
    vi.mocked(createClient).mockResolvedValue(makeContentSupabase({ role: 'teacher', department_id: 'dept-a' }) as never)
    const auth = await requireContentAdmin()
    expect(auth.error).toBeNull()
  })

  it('starts a teacher in the profile department', async () => {
    vi.mocked(createClient).mockResolvedValue(makeContentSupabase({ role: 'teacher', department_id: 'dept-b' }) as never)
    const auth = await requireContentAdmin()
    if (auth.error) throw new Error('unexpected')
    expect(auth.scopeDepartmentIds).toEqual(['dept-b'])
    expect(auth.departmentId).toBe('dept-b')
  })

  it('starts a teacher without profile department in "all areas"', async () => {
    vi.mocked(createClient).mockResolvedValue(makeContentSupabase({ role: 'teacher', department_id: null }) as never)
    const auth = await requireContentAdmin()
    if (auth.error) throw new Error('unexpected')
    expect(auth.scopeDepartmentIds).toBeNull()
    expect(auth.departmentId).toBeNull()
  })

  it('follows the scope cookie: "alle" and a concrete department', async () => {
    vi.mocked(createClient).mockResolvedValue(makeContentSupabase({ role: 'teacher', department_id: 'dept-a' }) as never)
    vi.mocked(cookies).mockResolvedValue(makeScopeCookies(SCOPE_ALL) as never)
    const all = await requireContentAdmin()
    if (all.error) throw new Error('unexpected')
    expect(all.scopeDepartmentIds).toBeNull()

    vi.mocked(createClient).mockResolvedValue(makeContentSupabase({ role: 'teacher', department_id: 'dept-a' }) as never)
    vi.mocked(cookies).mockResolvedValue(makeScopeCookies('dept-b') as never)
    const one = await requireContentAdmin()
    if (one.error) throw new Error('unexpected')
    expect(one.scopeDepartmentIds).toEqual(['dept-b'])
  })

  it('falls back to the start department when the cookie names an unknown department', async () => {
    vi.mocked(createClient).mockResolvedValue(makeContentSupabase({ role: 'department_admin', department_id: 'dept-a' }) as never)
    vi.mocked(cookies).mockResolvedValue(makeScopeCookies('gibt-es-nicht') as never)
    const auth = await requireContentAdmin()
    if (auth.error) throw new Error('unexpected')
    expect(auth.scopeDepartmentIds).toEqual(['dept-a'])
  })
})

describe('resolveTargetDepartment (PROJ-70)', () => {
  const base = { departmentIds: ['dept-a', 'dept-b'] }

  it('prefers an explicit, known department', () => {
    expect(resolveTargetDepartment({ ...base, departmentId: 'dept-a' } as never, 'dept-b')).toBe('dept-b')
  })

  it('uses the scope department without an explicit one', () => {
    expect(resolveTargetDepartment({ ...base, departmentId: 'dept-a' } as never)).toBe('dept-a')
  })

  it('has no target in "all areas" without an explicit department', () => {
    expect(resolveTargetDepartment({ ...base, departmentId: null } as never)).toBeNull()
  })

  it('rejects an unknown department', () => {
    expect(resolveTargetDepartment({ ...base, departmentId: 'dept-a' } as never, 'dept-x')).toBeNull()
  })
})

describe('Inhalts-Rechte (PROJ-70)', () => {
  const teacher = { isSuperAdmin: false, isDepartmentAdmin: false, departmentIds: ['dept-a', 'dept-b'], subjectIds: null }

  it('every content role may administer any subject, in any area', () => {
    expect(canAdminSubject(teacher as never, 'subj-x', 'dept-z')).toBe(true)
  })

  it('may create content in every known department, but not in an unknown one', () => {
    expect(canAdminDepartmentContent(teacher as never, 'dept-a')).toBe(true)
    expect(canAdminDepartmentContent(teacher as never, 'dept-b')).toBe(true)
    expect(canAdminDepartmentContent(teacher as never, 'dept-c')).toBe(false)
    expect(canAdminDepartmentContent(teacher as never, null)).toBe(false)
  })

  it('may administer any question without querying subjects', async () => {
    expect(await canAdminQuestion(teacher as never, 'q-1')).toBe(true)
  })
})

describe('requireTeacher (PROJ-48)', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when not authenticated', async () => {
    vi.mocked(createClient).mockResolvedValue(makeUnauthSupabase() as never)
    const auth = await requireTeacher()
    expect(auth.error?.status).toBe(401)
  })

  it('returns 403 for an admin (no assignments needed, no self-service for them)', async () => {
    vi.mocked(createClient).mockResolvedValue(makeContentSupabase({ role: 'admin' }) as never)
    const auth = await requireTeacher()
    expect(auth.error?.status).toBe(403)
  })

  it('allows a plain teacher', async () => {
    vi.mocked(createClient).mockResolvedValue(makeContentSupabase({ role: 'teacher' }) as never)
    const auth = await requireTeacher()
    expect(auth.error).toBeNull()
  })
})
