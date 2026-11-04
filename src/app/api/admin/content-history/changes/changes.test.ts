import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { chainMock, hasCall } from '@/test/supabase-chain-mock'

vi.mock('@/lib/supabase-server', () => ({ createClient: vi.fn() }))
vi.mock('next/headers', () => ({ cookies: vi.fn() }))

import { createClient } from '@/lib/supabase-server'
import { cookies } from 'next/headers'
import { GET } from './route'

const DEPT = '11111111-1111-4111-8111-111111111111'
const PERSON = '33333333-3333-4333-8333-333333333333'
const SUBJECT = '44444444-4444-4444-8444-444444444444'

function makeSupabase(role: string | null) {
  return chainMock(
    (table, calls) => {
      if (table === 'profiles') return { data: role ? { role, department_id: DEPT } : null }
      if (table === 'content_versions' && hasCall(calls, 'range')) {
        return {
          count: 51,
          data: [
            {
              id: 'v1', content_type: 'question', content_id: 'q1', version_number: 2, change_type: 'updated',
              department_id: DEPT, changed_by: PERSON, changed_by_label: null, batch_id: null, created_at: '2026-11-04T08:00:00Z',
              profiles: { display_name: 'Frau Muster' }, departments: { name: 'Tourismus', code: 'TOUR' },
            },
          ],
        }
      }
      return {}
    },
    { auth: { getUser: vi.fn().mockResolvedValue({ data: { user: role ? { id: 'u1', email: 'a@a.de' } : null } }) } }
  )
}

const req = (q = '') => new NextRequest(`http://localhost/api/admin/content-history/changes?${q}`)

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(cookies).mockResolvedValue({ get: vi.fn() } as never)
})

describe('GET /api/admin/content-history/changes (PROJ-70)', () => {
  it('ist nur für den Super-Admin', async () => {
    for (const role of ['teacher', 'department_admin']) {
      vi.mocked(createClient).mockResolvedValue(makeSupabase(role).client as never)
      expect((await GET(req())).status).toBe(403)
    }
  })

  it('liefert Einträge mit Person, Bereich und Seitenzahl', async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabase('admin').client as never)
    const body = await (await GET(req())).json()
    expect(body.entries[0]).toMatchObject({ changedByName: 'Frau Muster', departmentName: 'Tourismus', changeType: 'updated' })
    expect(body.totalPages).toBe(2)
  })

  it('setzt die Filter in der Datenbank', async () => {
    const mock = makeSupabase('admin')
    vi.mocked(createClient).mockResolvedValue(mock.client as never)
    await GET(req(`person=${PERSON}&department_id=${DEPT}&type=question&change_type=deleted&subject_id=${SUBJECT}&from=2026-11-01T00:00:00Z&to=2026-11-05T00:00:00Z`))
    const calls = mock.queries.find((q) => q.table === 'content_versions')!.calls
    const eqs = calls.filter((c) => c.method === 'eq').map((c) => `${c.args[0]}=${c.args[1]}`)
    expect(eqs).toEqual(expect.arrayContaining([`changed_by=${PERSON}`, `department_id=${DEPT}`, 'content_type=question', 'change_type=deleted']))
    expect(calls.some((c) => c.method === 'gte' && c.args[0] === 'created_at')).toBe(true)
    const or = calls.find((c) => c.method === 'or')!.args[0] as string
    expect(or).toContain(`data->subject_ids.cs.["${SUBJECT}"]`)
    expect(or).toContain(`content_id.eq.${SUBJECT}`)
  })

  it('lehnt ungültige Filter ab', async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabase('admin').client as never)
    expect((await GET(req('type=unsinn'))).status).toBe(400)
    expect((await GET(req('person=keine-id'))).status).toBe(400)
  })
})
