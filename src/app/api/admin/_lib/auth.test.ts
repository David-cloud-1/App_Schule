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

function makeContentSupabase(profile: unknown, assignments: unknown[] = []) {
  const { client } = chainMock((table) => {
    if (table === 'profiles') return { data: profile }
    if (table === 'teacher_subject_assignments') return { data: assignments }
    return {}
  }, {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1', email: 'u1@example.com' } } }) },
  })
  return client
}

describe('requireContentAdmin (PROJ-48)', () => {
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

  it('admin gets a single-item departmentIds array and null subjectIds', async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeContentSupabase({ role: 'admin', department_id: 'dept-a' }) as never
    )
    const auth = await requireContentAdmin()
    expect(auth.error).toBeNull()
    if (auth.error) return
    expect(auth.departmentIds).toEqual(['dept-a'])
    expect(auth.subjectIds).toBeNull()
    expect(auth.isTeacher).toBe(false)
  })

  it('department_admin without an assigned department is rejected (fail closed)', async () => {
    vi.mocked(getFallbackDepartment).mockResolvedValue({ id: 'dept-fallback' } as never)
    vi.mocked(createClient).mockResolvedValue(
      makeContentSupabase({ role: 'department_admin', department_id: null }) as never
    )
    const auth = await requireContentAdmin()
    expect(auth.error?.status).toBe(403)
  })

  it('a teacher without any assignment is rejected', async () => {
    vi.mocked(createClient).mockResolvedValue(makeContentSupabase({ role: 'teacher' }, []) as never)
    const auth = await requireContentAdmin()
    expect(auth.error?.status).toBe(403)
  })

  it('a teacher with assignments gets the distinct departments and subjects (dept-only rows excluded from subjectIds)', async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeContentSupabase({ role: 'teacher' }, [
        { department_id: 'dept-a', subject_id: 'subj-1' },
        { department_id: 'dept-a', subject_id: 'subj-2' },
        { department_id: 'dept-b', subject_id: null },
      ]) as never
    )
    const auth = await requireContentAdmin()
    expect(auth.error).toBeNull()
    if (auth.error) return
    expect(auth.isTeacher).toBe(true)
    expect(auth.departmentIds.sort()).toEqual(['dept-a', 'dept-b'])
    expect(auth.subjectIds?.sort()).toEqual(['subj-1', 'subj-2'])
  })
})

describe('canAdminSubject / canAdminDepartmentContent (PROJ-48)', () => {
  const superAdmin = { isSuperAdmin: true, isDepartmentAdmin: false, departmentIds: ['dept-a'], subjectIds: null }
  const deptAdmin = { isSuperAdmin: false, isDepartmentAdmin: true, departmentIds: ['dept-a'], subjectIds: null }
  const teacher = { isSuperAdmin: false, isDepartmentAdmin: false, departmentIds: ['dept-a', 'dept-b'], subjectIds: ['subj-1'] }

  it('super-admin can admin any subject/department', () => {
    expect(canAdminSubject(superAdmin as never, 'subj-x', 'dept-z')).toBe(true)
    expect(canAdminDepartmentContent(superAdmin as never, 'dept-z')).toBe(true)
  })

  it('department_admin can only admin subjects/content of their own department', () => {
    expect(canAdminSubject(deptAdmin as never, 'subj-x', 'dept-a')).toBe(true)
    expect(canAdminSubject(deptAdmin as never, 'subj-x', 'dept-b')).toBe(false)
    expect(canAdminDepartmentContent(deptAdmin as never, 'dept-a')).toBe(true)
    expect(canAdminDepartmentContent(deptAdmin as never, 'dept-b')).toBe(false)
  })

  it('a teacher can only admin a subject she is assigned to, even within an assigned department', () => {
    expect(canAdminSubject(teacher as never, 'subj-1', 'dept-a')).toBe(true)
    expect(canAdminSubject(teacher as never, 'subj-2', 'dept-a')).toBe(false)
  })

  it('a teacher can admin department content (e.g. creating a new subject) for any department she has an assignment in', () => {
    expect(canAdminDepartmentContent(teacher as never, 'dept-a')).toBe(true)
    expect(canAdminDepartmentContent(teacher as never, 'dept-b')).toBe(true)
    expect(canAdminDepartmentContent(teacher as never, 'dept-c')).toBe(false)
  })
})

describe('canAdminQuestion (PROJ-48)', () => {
  function makeQsSupabase(rows: unknown[]) {
    const { client } = chainMock((table) => {
      if (table === 'question_subjects') return { data: rows }
      return {}
    })
    return client
  }

  it('super-admin can admin any question without querying subjects', async () => {
    const auth = { isSuperAdmin: true, isDepartmentAdmin: false, departmentIds: ['dept-a'], subjectIds: null, supabase: makeQsSupabase([]) }
    expect(await canAdminQuestion(auth as never, 'q-1')).toBe(true)
  })

  it('department_admin can admin a question if any linked subject belongs to their department', async () => {
    const supabase = makeQsSupabase([{ subject_id: 's1', subjects: { department_id: 'dept-a' } }])
    const auth = { isSuperAdmin: false, isDepartmentAdmin: true, departmentIds: ['dept-a'], subjectIds: null, supabase }
    expect(await canAdminQuestion(auth as never, 'q-1')).toBe(true)
  })

  it('a teacher can admin a multi-subject question if she is responsible for at least one linked subject', async () => {
    const supabase = makeQsSupabase([
      { subject_id: 's1', subjects: { department_id: 'dept-a' } },
      { subject_id: 's2', subjects: { department_id: 'dept-a' } },
    ])
    const auth = { isSuperAdmin: false, isDepartmentAdmin: false, departmentIds: ['dept-a'], subjectIds: ['s2'], supabase }
    expect(await canAdminQuestion(auth as never, 'q-1')).toBe(true)
  })

  it('a teacher cannot admin a question with no matching subject', async () => {
    const supabase = makeQsSupabase([{ subject_id: 's1', subjects: { department_id: 'dept-a' } }])
    const auth = { isSuperAdmin: false, isDepartmentAdmin: false, departmentIds: ['dept-a'], subjectIds: ['s2'], supabase }
    expect(await canAdminQuestion(auth as never, 'q-1')).toBe(false)
  })

  it('returns false for an orphaned question with no subject links at all', async () => {
    const supabase = makeQsSupabase([])
    const auth = { isSuperAdmin: false, isDepartmentAdmin: true, departmentIds: ['dept-a'], subjectIds: null, supabase }
    expect(await canAdminQuestion(auth as never, 'q-1')).toBe(false)
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
