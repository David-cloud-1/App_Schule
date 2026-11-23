import { describe, it, expect, vi, beforeEach } from 'vitest'
import { PATCH } from './route'
import { NextRequest } from 'next/server'
import { chainMock } from '@/test/supabase-chain-mock'

vi.mock('@/lib/supabase-server', () => ({
  createClient: vi.fn(),
  createServiceClient: vi.fn(),
}))

vi.mock('@/lib/pseudonym-server', () => ({ ensurePseudonym: vi.fn(async () => {}) }))

import { createClient, createServiceClient } from '@/lib/supabase-server'
import { ensurePseudonym } from '@/lib/pseudonym-server'

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

function makeAdminClient(role: 'admin' | 'department_admin' | 'teacher' = 'admin', departmentId = DEPT_SPED) {
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
    if (table === 'departments') return { data: { id: DEPT_TOUR } }
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
    const res = await PATCH(makeRequest({ role: 'teacher', department_id: DEPT_SPED }), makeCtx())
    expect(res.status).toBe(200)
  })

  it('vergibt „Bereichs-Admin“ nicht mehr neu (PROJ-127)', async () => {
    vi.mocked(createClient).mockResolvedValue(makeAdminClient() as never)
    vi.mocked(createServiceClient).mockReturnValue(makeServiceClient() as never)
    const res = await PATCH(makeRequest({ role: 'department_admin', department_id: DEPT_SPED }), makeCtx())
    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/nicht mehr vergeben/)
  })

  it('super-admin can move a user to another department', async () => {
    vi.mocked(createClient).mockResolvedValue(makeAdminClient() as never)
    vi.mocked(createServiceClient).mockReturnValue(makeServiceClient() as never)
    const res = await PATCH(makeRequest({ department_id: DEPT_TOUR }), makeCtx())
    expect(res.status).toBe(200)
  })

  it('a teacher gets 403 when trying to assign a role (PROJ-127)', async () => {
    vi.mocked(createClient).mockResolvedValue(makeAdminClient('teacher', DEPT_SPED) as never)
    vi.mocked(createServiceClient).mockReturnValue(
      makeServiceClient({ target: { role: 'student', department_id: DEPT_SPED } }) as never
    )
    const res = await PATCH(makeRequest({ role: 'admin' }), makeCtx())
    expect(res.status).toBe(403)
  })

  it('a teacher can move a student of the chosen department (PROJ-127)', async () => {
    vi.mocked(createClient).mockResolvedValue(makeAdminClient('teacher', DEPT_SPED) as never)
    vi.mocked(createServiceClient).mockReturnValue(
      makeServiceClient({ target: { role: 'student', department_id: DEPT_SPED } }) as never
    )
    const res = await PATCH(makeRequest({ department_id: DEPT_TOUR }), makeCtx())
    expect(res.status).toBe(200)
  })

  it('a teacher gets 403 for a student outside the chosen department (PROJ-127)', async () => {
    vi.mocked(createClient).mockResolvedValue(makeAdminClient('teacher', DEPT_SPED) as never)
    vi.mocked(createServiceClient).mockReturnValue(
      makeServiceClient({ target: { role: 'student', department_id: DEPT_TOUR } }) as never
    )
    const res = await PATCH(makeRequest({ banned: true }), makeCtx())
    expect(res.status).toBe(403)
  })

  it.each(['teacher', 'department_admin', 'admin'])(
    'a teacher gets 403 when targeting a %s account, even in the same department (PROJ-127)',
    async (role) => {
      vi.mocked(createClient).mockResolvedValue(makeAdminClient('teacher', DEPT_SPED) as never)
      vi.mocked(createServiceClient).mockReturnValue(
        makeServiceClient({ target: { role, department_id: DEPT_SPED } }) as never
      )
      const res = await PATCH(makeRequest({ banned: true }), makeCtx())
      expect(res.status).toBe(403)
    }
  )

  it('a teacher gets 403 for the linked second account of the super-admin (PROJ-29)', async () => {
    vi.mocked(createClient).mockResolvedValue(makeAdminClient('teacher', DEPT_SPED) as never)
    vi.mocked(createServiceClient).mockReturnValue(
      makeServiceClient({ target: { role: 'student', department_id: DEPT_SPED, linked_main_user_id: 'x' } }) as never
    )
    const res = await PATCH(makeRequest({ banned: true }), makeCtx())
    expect(res.status).toBe(403)
  })

  it('a teacher may ban a student of the chosen department; the log names old and new value', async () => {
    const admin = chainMock(
      (table) =>
        table === 'profiles'
          ? { data: { role: 'teacher', department_id: DEPT_SPED, first_name: 'Erika', last_name: 'Lehr' } }
          : {},
      { auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: ADMIN_ID, email: 'a@a.com' } } }) } },
    )
    vi.mocked(createClient).mockResolvedValue(admin.client as never)
    vi.mocked(createServiceClient).mockReturnValue(makeServiceClient() as never)
    const res = await PATCH(makeRequest({ banned: true }), makeCtx())
    expect(res.status).toBe(200)
    const log = admin.writes.find((w) => w.table === 'admin_audit_log')!.payload as Record<string, unknown>
    expect(log).toMatchObject({ action_type: 'user.ban', admin_name: 'Erika Lehr', details: { gesperrt: { alt: false, neu: true } } })
  })

  it('takes the ban back and answers 503 when the audit log cannot be written (PROJ-127)', async () => {
    const admin = chainMock(
      (table) =>
        table === 'profiles'
          ? { data: { role: 'teacher', department_id: DEPT_SPED } }
          : table === 'admin_audit_log'
            ? { error: { code: '42501', message: 'denied' } }
            : {},
      { auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: ADMIN_ID, email: 'a@a.com' } } }) } },
    )
    vi.mocked(createClient).mockResolvedValue(admin.client as never)
    const service = makeServiceClient()
    vi.mocked(createServiceClient).mockReturnValue(service as never)
    const res = await PATCH(makeRequest({ banned: true }), makeCtx())
    expect(res.status).toBe(503)
    const update = (service as unknown as { auth: { admin: { updateUserById: ReturnType<typeof vi.fn> } } }).auth.admin.updateUserById
    expect(update).toHaveBeenNthCalledWith(1, TARGET_USER_ID, { ban_duration: '876000h' })
    expect(update).toHaveBeenNthCalledWith(2, TARGET_USER_ID, { ban_duration: 'none' })
  })

  describe('Rolle „Lehrkraft“ (PROJ-44)', () => {
    function serviceWithWrites(target: unknown) {
      const mock = chainMock((table) =>
        table === 'profiles' ? { data: target } : table === 'departments' ? { data: { id: DEPT_TOUR } } : {}
      )
      ;(mock.client as unknown as { auth: unknown }).auth = { admin: { updateUserById: vi.fn() } }
      return mock
    }

    it('lässt den Super-Admin einen Azubi zur Lehrkraft machen – ohne den Bereich anzufassen', async () => {
      vi.mocked(createClient).mockResolvedValue(makeAdminClient('admin') as never)
      const service = serviceWithWrites({ role: 'student', department_id: DEPT_TOUR })
      vi.mocked(createServiceClient).mockReturnValue(service.client as never)

      const res = await PATCH(makeRequest({ role: 'teacher' }), makeCtx())
      expect(res.status).toBe(200)
      expect(service.writes).toContainEqual({ table: 'profiles', method: 'update', payload: { role: 'teacher' } })
      // Lehrer-Rollen erscheinen in der Rangliste nur unter Pseudonym
      expect(ensurePseudonym).toHaveBeenCalledWith(service.client, TARGET_USER_ID)
    })

    it('protokolliert den Wechsel mit alter und neuer Rolle', async () => {
      const admin = chainMock(
        (table) => (table === 'profiles' ? { data: { role: 'admin', department_id: DEPT_SPED } } : {}),
        { auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: ADMIN_ID, email: 'a@a.com' } } }) } },
      )
      vi.mocked(createClient).mockResolvedValue(admin.client as never)
      vi.mocked(createServiceClient).mockReturnValue(serviceWithWrites({ role: 'student', department_id: DEPT_SPED }).client as never)

      await PATCH(makeRequest({ role: 'teacher' }), makeCtx())
      const log = admin.writes.find((w) => w.table === 'admin_audit_log')!.payload as Record<string, unknown>
      expect(log.action_type).toBe('user.role_change')
      expect(log.details).toEqual({ from: 'student', to: 'teacher' })
    })

    it('verweigert einer Lehrkraft die Vergabe mit 403', async () => {
      vi.mocked(createClient).mockResolvedValue(makeAdminClient('teacher', DEPT_SPED) as never)
      const service = serviceWithWrites({ role: 'student', department_id: DEPT_SPED })
      vi.mocked(createServiceClient).mockReturnValue(service.client as never)

      const res = await PATCH(makeRequest({ role: 'teacher' }), makeCtx())
      expect(res.status).toBe(403)
      expect(service.writes).toEqual([])
    })

    it('legt beim Entziehen der Rolle kein Pseudonym an', async () => {
      vi.mocked(createClient).mockResolvedValue(makeAdminClient('admin') as never)
      vi.mocked(createServiceClient).mockReturnValue(serviceWithWrites({ role: 'teacher', department_id: DEPT_SPED }).client as never)

      const res = await PATCH(makeRequest({ role: 'student' }), makeCtx())
      expect(res.status).toBe(200)
      expect(ensurePseudonym).not.toHaveBeenCalled()
    })

    it('nennt den Grund verständlich, wenn jemand noch „Bereichs-Admin“ vergeben will (PROJ-127)', async () => {
      vi.mocked(createClient).mockResolvedValue(makeAdminClient('admin') as never)
      vi.mocked(createServiceClient).mockReturnValue(serviceWithWrites({ role: 'teacher', department_id: null }).client as never)

      const res = await PATCH(makeRequest({ role: 'department_admin' }), makeCtx())
      expect(res.status).toBe(400)
      expect((await res.json()).error).toBe('Die Rolle Bereichs-Admin wird nicht mehr vergeben. Bitte wähle „Lehrkraft“.')
    })

    it('lässt den Super-Admin eine Lehrkraft in einen anderen Fachbereich verschieben (BUG-3)', async () => {
      vi.mocked(createClient).mockResolvedValue(makeAdminClient('admin') as never)
      const service = serviceWithWrites({ role: 'teacher', department_id: DEPT_SPED })
      vi.mocked(createServiceClient).mockReturnValue(service.client as never)

      const res = await PATCH(makeRequest({ department_id: DEPT_TOUR }), makeCtx())
      expect(res.status).toBe(200)
      expect(service.writes).toContainEqual({ table: 'profiles', method: 'update', payload: { department_id: DEPT_TOUR } })
    })

    it('verweigert einer Lehrkraft das Verschieben einer anderen Lehrkraft (403)', async () => {
      vi.mocked(createClient).mockResolvedValue(makeAdminClient('teacher', DEPT_SPED) as never)
      const service = serviceWithWrites({ role: 'teacher', department_id: DEPT_SPED })
      vi.mocked(createServiceClient).mockReturnValue(service.client as never)

      const res = await PATCH(makeRequest({ department_id: DEPT_TOUR }), makeCtx())
      expect(res.status).toBe(403)
      expect(service.writes).toEqual([])
    })

    it('lehnt unbekannte Rollen mit 400 ab', async () => {
      vi.mocked(createClient).mockResolvedValue(makeAdminClient('admin') as never)
      vi.mocked(createServiceClient).mockReturnValue(serviceWithWrites({ role: 'student', department_id: DEPT_SPED }).client as never)

      const res = await PATCH(makeRequest({ role: 'superuser' }), makeCtx())
      expect(res.status).toBe(400)
    })
  })
})
