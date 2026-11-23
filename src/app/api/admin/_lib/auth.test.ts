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
  requireManager,
  requireSuperAdmin,
  assertSingleDepartment,
  writeAuditLogStrict,
  changedFields,
  canViewAssessment,
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

function makeManagerCookies(scope: string | undefined) {
  return {
    get: vi.fn((name: string) => (name === ADMIN_SCOPE_COOKIE && scope ? { value: scope } : undefined)),
  }
}

describe('requireSuperAdmin (PROJ-127)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(cookies).mockResolvedValue(makeCookies(undefined) as never)
  })

  it('returns 401 when not authenticated', async () => {
    vi.mocked(createClient).mockResolvedValue(makeUnauthSupabase() as never)
    expect((await requireSuperAdmin()).error?.status).toBe(401)
  })

  it.each(['student', 'teacher', 'department_admin'])('returns 403 for role %s', async (role) => {
    vi.mocked(createClient).mockResolvedValue(makeSupabase({ role, department_id: 'dept-a' }) as never)
    expect((await requireSuperAdmin()).error?.status).toBe(403)
  })

  it('returns 403 for a profile with no role at all', async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabase(null) as never)
    expect((await requireSuperAdmin()).error?.status).toBe(403)
  })

  it('super-admin without a switcher cookie works in their own department', async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabase({ role: 'admin', department_id: 'dept-a' }) as never)
    const auth = await requireSuperAdmin()
    expect(auth.error).toBeNull()
    if (auth.error) return
    expect(auth.isSuperAdmin).toBe(true)
    expect(auth.role).toBe('admin')
    expect(auth.departmentId).toBe('dept-a')
    expect(auth.scopeIsAll).toBe(false)
  })

  it('super-admin with a valid switcher cookie works in the chosen department', async () => {
    vi.mocked(cookies).mockResolvedValue(makeCookies('dept-chosen') as never)
    vi.mocked(createClient).mockResolvedValue(makeSupabase({ role: 'admin', department_id: 'dept-a' }, true) as never)
    const auth = await requireSuperAdmin()
    if (auth.error) throw new Error('expected success')
    expect(auth.departmentId).toBe('dept-chosen')
  })

  it('super-admin with a switcher cookie pointing at a deleted department falls back to their own', async () => {
    vi.mocked(cookies).mockResolvedValue(makeCookies('dept-gone') as never)
    vi.mocked(createClient).mockResolvedValue(makeSupabase({ role: 'admin', department_id: 'dept-a' }, false) as never)
    const auth = await requireSuperAdmin()
    if (auth.error) throw new Error('expected success')
    expect(auth.departmentId).toBe('dept-a')
  })

  it('super-admin without any own department falls back to the default department', async () => {
    vi.mocked(getFallbackDepartment).mockResolvedValue({ id: 'dept-fallback' } as never)
    vi.mocked(createClient).mockResolvedValue(makeSupabase({ role: 'admin', department_id: null }) as never)
    const auth = await requireSuperAdmin()
    if (auth.error) throw new Error('expected success')
    expect(auth.departmentId).toBe('dept-fallback')
  })
})

describe('requireManager (PROJ-127)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(cookies).mockResolvedValue(makeManagerCookies(undefined) as never)
  })

  it('returns 401 when not authenticated', async () => {
    vi.mocked(createClient).mockResolvedValue(makeUnauthSupabase() as never)
    expect((await requireManager()).error?.status).toBe(401)
  })

  it('returns 403 for a student', async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabase({ role: 'student', department_id: 'dept-a' }) as never)
    expect((await requireManager()).error?.status).toBe(403)
  })

  it('lets a teacher in, starting in the profile department', async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabase({ role: 'teacher', department_id: 'dept-a' }) as never)
    const auth = await requireManager()
    if (auth.error) throw new Error('expected success')
    expect(auth.isSuperAdmin).toBe(false)
    expect(auth.role).toBe('teacher')
    expect(auth.departmentId).toBe('dept-a')
    expect(auth.scopeIsAll).toBe(false)
  })

  it('follows the scope bar for a teacher', async () => {
    vi.mocked(cookies).mockResolvedValue(makeManagerCookies('dept-chosen') as never)
    vi.mocked(createClient).mockResolvedValue(makeSupabase({ role: 'teacher', department_id: 'dept-a' }, true) as never)
    const auth = await requireManager()
    if (auth.error) throw new Error('expected success')
    expect(auth.departmentId).toBe('dept-chosen')
  })

  it('marks "Alle Bereiche" and keeps the profile department for reads', async () => {
    vi.mocked(cookies).mockResolvedValue(makeManagerCookies(SCOPE_ALL) as never)
    vi.mocked(createClient).mockResolvedValue(makeSupabase({ role: 'teacher', department_id: 'dept-a' }) as never)
    const auth = await requireManager()
    if (auth.error) throw new Error('expected success')
    expect(auth.scopeIsAll).toBe(true)
    expect(auth.departmentId).toBe('dept-a')
    expect(assertSingleDepartment(auth)?.status).toBe(400)
  })

  it('a teacher (or former department admin) without a department works in the default department', async () => {
    vi.mocked(getFallbackDepartment).mockResolvedValue({ id: 'dept-fallback' } as never)
    vi.mocked(createClient).mockResolvedValue(makeSupabase({ role: 'department_admin', department_id: null }) as never)
    const auth = await requireManager()
    if (auth.error) throw new Error('expected success')
    expect(auth.departmentId).toBe('dept-fallback')
  })

  it('a scope cookie naming an unknown department falls back to the profile department', async () => {
    vi.mocked(cookies).mockResolvedValue(makeManagerCookies('dept-gone') as never)
    vi.mocked(createClient).mockResolvedValue(makeSupabase({ role: 'teacher', department_id: 'dept-a' }, false) as never)
    const auth = await requireManager()
    if (auth.error) throw new Error('expected success')
    expect(auth.departmentId).toBe('dept-a')
  })

  it('super-admin keeps the switcher department and is never asked to pick one', async () => {
    vi.mocked(cookies).mockResolvedValue(makeManagerCookies(SCOPE_ALL) as never)
    vi.mocked(createClient).mockResolvedValue(makeSupabase({ role: 'admin', department_id: 'dept-a' }) as never)
    const auth = await requireManager()
    if (auth.error) throw new Error('expected success')
    expect(auth.isSuperAdmin).toBe(true)
    expect(auth.departmentId).toBe('dept-a')
    expect(assertSingleDepartment(auth)).toBeNull()
  })
})

describe('canAdminDepartment / assertCanAdminDepartment', () => {
  const superAdmin = { isSuperAdmin: true, departmentId: 'dept-a', role: 'admin' as const, scopeIsAll: false }
  const teacher = { isSuperAdmin: false, departmentId: 'dept-a', role: 'teacher' as const, scopeIsAll: false }
  const teacherAll = { ...teacher, scopeIsAll: true }

  it('super-admin can admin any department, including an orphaned (null) one', () => {
    expect(canAdminDepartment(superAdmin as never, 'dept-a')).toBe(true)
    expect(canAdminDepartment(superAdmin as never, 'dept-b')).toBe(true)
    expect(canAdminDepartment(superAdmin as never, null)).toBe(true)
  })

  it('a teacher administers the department chosen in the scope bar', () => {
    expect(canAdminDepartment(teacher as never, 'dept-a')).toBe(true)
    expect(canAdminDepartment(teacher as never, 'dept-b')).toBe(false)
  })

  it('a teacher in "Alle Bereiche" may touch any department object', () => {
    expect(canAdminDepartment(teacherAll as never, 'dept-b')).toBe(true)
  })

  it('orphaned (null) department objects stay super-admin-only', () => {
    expect(canAdminDepartment(teacher as never, null)).toBe(false)
    expect(canAdminDepartment(teacherAll as never, null)).toBe(false)
  })

  it('assertCanAdminDepartment returns 404 (not 403) for a foreign department', () => {
    expect(assertCanAdminDepartment(teacher as never, 'dept-b')?.status).toBe(404)
  })

  it('assertCanAdminDepartment returns null (allowed) for the chosen department', () => {
    expect(assertCanAdminDepartment(teacher as never, 'dept-a')).toBeNull()
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

describe('writeAuditLogStrict (PROJ-127)', () => {
  function auditClient(insertError: unknown, profile: unknown = { department_id: 'dept-a', first_name: 'Erika', last_name: 'Muster' }) {
    return chainMock((table) => {
      if (table === 'profiles') return { data: profile }
      if (table === 'admin_audit_log') return { error: insertError }
      return {}
    })
  }

  it('returns true and stores the actor name as text', async () => {
    const db = auditClient(null)
    const ok = await writeAuditLogStrict(db.client, {
      admin_id: 'u1', action_type: 'shop_item.update', object_type: 'shop_item', object_id: 'i1',
    })
    expect(ok).toBe(true)
    const insert = db.writes.find((w) => w.table === 'admin_audit_log')
    expect(insert?.payload).toMatchObject({ admin_name: 'Erika Muster', department_id: 'dept-a' })
  })

  it('returns false when the insert fails (no silent success)', async () => {
    const db = auditClient({ code: '42501', message: 'permission denied' })
    expect(await writeAuditLogStrict(db.client, { admin_id: 'u1', action_type: 'x', object_type: 'y' })).toBe(false)
  })

  it('retries without the name column before the migration is applied', async () => {
    let calls = 0
    const db = chainMock((table) => {
      if (table === 'profiles') return { data: null }
      if (table === 'admin_audit_log') {
        calls++
        return calls === 1 ? { error: { code: 'PGRST204', message: "Could not find the 'admin_name' column" } } : {}
      }
      return {}
    })
    expect(await writeAuditLogStrict(db.client, { admin_id: 'u1', action_type: 'x', object_type: 'y' })).toBe(true)
    expect(calls).toBe(2)
  })
})

describe('changedFields (PROJ-127)', () => {
  it('keeps only fields whose value really changes, with old and new value', () => {
    expect(changedFields({ price: 10, name: 'A' }, { price: 12, name: 'A' })).toEqual({ price: { alt: 10, neu: 12 } })
  })
})

describe('canViewAssessment (PROJ-127)', () => {
  const base = { user: { id: 'me' }, isSuperAdmin: false, isDepartmentAdmin: false, role: 'teacher' }
  it('any teacher sees shared assessments of their profile department', () => {
    const auth = { ...base, ownDepartmentId: 'dept-a' }
    expect(canViewAssessment(auth as never, { department_id: 'dept-a', created_by: 'other', shared_with_department: true })).toBe(true)
    expect(canViewAssessment(auth as never, { department_id: 'dept-b', created_by: 'other', shared_with_department: true })).toBe(false)
    expect(canViewAssessment(auth as never, { department_id: 'dept-a', created_by: 'other', shared_with_department: false })).toBe(false)
  })
  it('a teacher without profile department sees only their own', () => {
    const auth = { ...base, ownDepartmentId: null }
    expect(canViewAssessment(auth as never, { department_id: 'dept-a', created_by: 'other', shared_with_department: true })).toBe(false)
    expect(canViewAssessment(auth as never, { department_id: 'dept-a', created_by: 'me', shared_with_department: false })).toBe(true)
  })
})
