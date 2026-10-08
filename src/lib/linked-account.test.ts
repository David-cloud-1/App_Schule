import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ensureLinkedUser, getLinkContext } from './linked-account'
import type { SupabaseClient } from '@supabase/supabase-js'

type Row = Record<string, unknown> | null

/** Baut einen minimalen Service-Client; je Tabelle wird die Reihenfolge der Antworten vorgegeben */
function makeService(opts: {
  profileReads?: Row[]
  department?: Row
  createUser?: { data: { user: { id: string } } | null; error: unknown }
  updateError?: unknown
}) {
  const reads = [...(opts.profileReads ?? [])]
  const updateEq = vi.fn().mockResolvedValue({ error: opts.updateError ?? null })
  const update = vi.fn().mockReturnValue({ eq: updateEq })
  const deleteUser = vi.fn().mockResolvedValue({ error: null })
  const createUser = vi.fn().mockResolvedValue(opts.createUser ?? { data: { user: { id: 'new-linked' } }, error: null })

  const profileSelect = () => {
    const chain = {
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockImplementation(() => Promise.resolve({ data: reads.shift() ?? null, error: null })),
    }
    return chain
  }
  const from = vi.fn((table: string) => {
    if (table === 'profiles') return { select: vi.fn(profileSelect), update }
    if (table === 'departments') {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: 'department' in opts ? opts.department : { id: 'dept-tour' }, error: null }),
            }),
          }),
        }),
      }
    }
    throw new Error(`unexpected table ${table}`)
  })
  const service = {
    from,
    rpc: vi.fn().mockResolvedValue({ data: 'Eisbär Pauschal', error: null }),
    auth: { admin: { createUser, deleteUser } },
  }
  return { service: service as unknown as SupabaseClient, update, deleteUser, createUser, rpc: service.rpc }
}

describe('getLinkContext', () => {
  it('returns main context for a super admin', async () => {
    const { service } = makeService({ profileReads: [{ role: 'admin', linked_main_user_id: null }] })
    expect(await getLinkContext(service, 'u1')).toEqual({ mainUserId: 'u1', current: 'main' })
  })

  it('returns linked context for a linked account whose main is still super admin', async () => {
    const { service } = makeService({
      profileReads: [{ role: 'student', linked_main_user_id: 'main' }, { role: 'admin' }],
    })
    expect(await getLinkContext(service, 'linked')).toEqual({ mainUserId: 'main', current: 'linked' })
  })

  it('denies a linked account whose main lost super admin', async () => {
    const { service } = makeService({
      profileReads: [{ role: 'student', linked_main_user_id: 'main' }, { role: 'department_admin' }],
    })
    expect(await getLinkContext(service, 'linked')).toBeNull()
  })

  it('denies students and department admins', async () => {
    for (const role of ['student', 'department_admin']) {
      const { service } = makeService({ profileReads: [{ role, linked_main_user_id: null }] })
      expect(await getLinkContext(service, 'u')).toBeNull()
    }
  })

  it('denies unknown profiles', async () => {
    const { service } = makeService({ profileReads: [null] })
    expect(await getLinkContext(service, 'u')).toBeNull()
  })
})

describe('ensureLinkedUser', () => {
  beforeEach(() => vi.spyOn(console, 'error').mockImplementation(() => {}))

  it('returns the existing linked account without creating one', async () => {
    const { service, createUser } = makeService({ profileReads: [{ id: 'existing' }] })
    expect(await ensureLinkedUser(service, 'main')).toBe('existing')
    expect(createUser).not.toHaveBeenCalled()
  })

  it('creates a password-less, unroutable account and links it', async () => {
    const { service, createUser, update, rpc } = makeService({ profileReads: [null] })
    expect(await ensureLinkedUser(service, 'main')).toBe('new-linked')
    const args = createUser.mock.calls[0][0]
    expect(args.email).toMatch(/^tourismus-.+@linked\.invalid$/)
    expect(args.email_confirm).toBe(true)
    expect(args.password).toBeUndefined()
    expect(rpc).toHaveBeenCalledWith('generate_unique_pseudonym', { p_department_id: 'dept-tour' })
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        role: 'student',
        department_id: 'dept-tour',
        linked_main_user_id: 'main',
        leaderboard_opt_out: true,
        pseudonym: 'Eisbär Pauschal',
      }),
    )
  })

  it('removes the surplus account and returns the winner when linking races', async () => {
    const { service, deleteUser } = makeService({
      profileReads: [null, { id: 'winner' }],
      updateError: { message: 'duplicate key' },
    })
    expect(await ensureLinkedUser(service, 'main')).toBe('winner')
    expect(deleteUser).toHaveBeenCalledWith('new-linked')
  })

  it('throws when linking fails and nobody else linked', async () => {
    const { service, deleteUser } = makeService({ profileReads: [null, null], updateError: { message: 'x' } })
    await expect(ensureLinkedUser(service, 'main')).rejects.toThrow()
    expect(deleteUser).toHaveBeenCalled()
  })

  it('throws when the department is missing', async () => {
    const { service, createUser } = makeService({ profileReads: [null], department: null })
    await expect(ensureLinkedUser(service, 'main')).rejects.toThrow('Bereich')
    expect(createUser).not.toHaveBeenCalled()
  })

  it('throws when the account cannot be created', async () => {
    const { service } = makeService({ profileReads: [null], createUser: { data: null, error: { message: 'nope' } } })
    await expect(ensureLinkedUser(service, 'main')).rejects.toThrow('angelegt')
  })
})
