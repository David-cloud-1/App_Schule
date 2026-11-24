import { vi } from 'vitest'
import { chainMock } from '@/test/supabase-chain-mock'

/**
 * Gemeinsame Attrappen für die Tests der Schnittstellen „Konten anlegen“
 * (PROJ-62). Die Test-Dateien mocken `@/lib/supabase-server` selbst und geben
 * die Clients hier hinein.
 */

export const ADMIN_ID = '550e8400-e29b-41d4-a716-446655440001'
export const DEPT_SPED = '11111111-1111-4111-8111-111111111111'
export const DEPT_TOUR = '22222222-2222-4222-8222-222222222222'
export const BATCH_ID = '33333333-3333-4333-8333-333333333333'

export const DEPARTMENT_ROWS = [
  { id: DEPT_SPED, code: 'SPED', name: 'Spedition', domain: 'spedilern.vercel.app' },
  { id: DEPT_TOUR, code: 'TOUR', name: 'Tourismus', domain: null },
]

/** Client der angemeldeten Person (Rolle, Protokoll) */
export function adminClientMock(opts: { role?: string | null; auditError?: unknown } = {}) {
  const role = opts.role === undefined ? 'admin' : opts.role
  return chainMock(
    (table) => {
      if (table === 'profiles') return { data: role ? { role, department_id: DEPT_SPED } : null }
      if (table === 'admin_audit_log') return { error: opts.auditError ?? null }
      return {}
    },
    { auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: ADMIN_ID, email: 'chef@example.de' } } }) } },
  )
}

export function noUserClientMock() {
  return { auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) } }
}

/** Service-Client: Bereiche, vorhandene Konten, Anlegen, Profil, Protokoll-Zählung */
export function serviceClientMock(
  opts: {
    existingEmails?: string[]
    usageRows?: { details: { batch_id?: string } | null }[]
    createError?: { code?: string; message?: string } | null
    profileUpdateError?: unknown
    profileUpdateRows?: unknown[]
    pseudonym?: string | null
  } = {},
) {
  let counter = 0
  const mock = chainMock((table, calls) => {
    if (table === 'departments') return { data: DEPARTMENT_ROWS }
    if (table === 'admin_audit_log') return { data: opts.usageRows ?? [] }
    if (table === 'profiles') {
      if (calls.some((c) => c.method === 'update')) {
        return opts.profileUpdateError
          ? { error: opts.profileUpdateError }
          : { data: opts.profileUpdateRows ?? [{ id: 'new' }] }
      }
      return { data: { pseudonym: opts.pseudonym === undefined ? 'Hafen-Kran' : opts.pseudonym, department_id: DEPT_SPED } }
    }
    return {}
  })
  const createUser = vi.fn(async () => {
    if (opts.createError) return { data: { user: null }, error: opts.createError }
    counter += 1
    return { data: { user: { id: `00000000-0000-4000-8000-00000000000${counter % 10}` } }, error: null }
  })
  const deleteUser = vi.fn(async () => ({ error: null }))
  const listUsers = vi.fn(async () => ({
    data: { users: (opts.existingEmails ?? []).map((email, i) => ({ id: `old-${i}`, email })) },
    error: null,
  }))
  const rpc = vi.fn(async () => ({ data: 'Neues-Pseudonym', error: null }))
  Object.assign(mock.client, { auth: { admin: { createUser, deleteUser, listUsers } }, rpc })
  return { ...mock, createUser, deleteUser, listUsers, rpc }
}
