import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from './route'
import { chainMock } from '@/test/supabase-chain-mock'

vi.mock('@/lib/supabase-server', () => ({
  createClient: vi.fn(),
  createServiceClient: vi.fn(),
}))

import { createClient } from '@/lib/supabase-server'

const ADMIN_ID = '550e8400-e29b-41d4-a716-446655440000'
const DEPT = '11111111-1111-4111-8111-111111111111'

const BODY = {
  count: 12,
  selection_only: false,
  scope: 'department',
  role: 'student',
  activity: '14',
  sort: 'xp',
  dir: 'desc',
  has_search: true,
}

function request(body: unknown) {
  return new NextRequest(new URL('http://localhost/api/admin/users/export-log'), {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  })
}

function setup(role: string | null, auditError: unknown = null) {
  const { client, writes } = chainMock(
    (table) => (table === 'profiles' ? { data: { role, department_id: DEPT } } : { error: auditError }),
    { auth: { getUser: vi.fn().mockResolvedValue({ data: { user: role ? { id: ADMIN_ID } : null } }) } },
  )
  vi.mocked(createClient).mockResolvedValue(client as never)
  return writes
}

describe('POST /api/admin/users/export-log (PROJ-61)', () => {
  beforeEach(() => vi.clearAllMocks())

  it('401 ohne Anmeldung', async () => {
    setup(null)
    expect((await POST(request(BODY))).status).toBe(401)
  })

  it.each(['department_admin', 'teacher', 'student'])('403 für %s und kein Eintrag', async (role) => {
    const writes = setup(role)
    expect((await POST(request(BODY))).status).toBe(403)
    expect(writes).toHaveLength(0)
  })

  it('400 bei ungültigen Eingaben', async () => {
    setup('admin')
    for (const body of [{}, { ...BODY, count: -1 }, { ...BODY, sort: 'passwort' }, { ...BODY, activity: '99' }, { ...BODY, role: 'hacker' }]) {
      expect((await POST(request(body))).status).toBe(400)
    }
  })

  it('schreibt user.export mit Anzahl und Filter, ohne Personendaten', async () => {
    const writes = setup('admin')
    const res = await POST(request({ ...BODY, search: 'anna@example.de', names: ['Anna'] }))
    expect(res.status).toBe(200)
    expect(writes).toHaveLength(1)
    const entry = writes[0].payload as Record<string, unknown>
    expect(entry).toMatchObject({
      admin_id: ADMIN_ID,
      action_type: 'user.export',
      object_type: 'user',
      object_id: null,
      department_id: DEPT,
      details: {
        count: 12,
        filter: { selection_only: false, scope: 'department', role: 'student', activity: '14', sort: 'xp', dir: 'desc', has_search: true },
      },
    })
    expect(JSON.stringify(entry)).not.toContain('anna')
  })

  it('500, wenn das Protokoll nicht geschrieben werden kann (Browser lädt dann nichts herunter)', async () => {
    setup('admin', { message: 'db down' })
    const res = await POST(request(BODY))
    expect(res.status).toBe(500)
    expect((await res.json()).error).toMatch(/protokolliert/)
  })
})
