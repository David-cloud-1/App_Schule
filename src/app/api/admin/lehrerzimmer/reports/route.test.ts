import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, POST } from './route'

vi.mock('../../_lib/auth', () => ({ requireTeacherOrAdmin: vi.fn() }))
import { requireTeacherOrAdmin } from '../../_lib/auth'

const ID = '11111111-1111-4111-8111-111111111111'
const rpc = vi.fn()

function as(flags: { isSuperAdmin?: boolean; isDepartmentAdmin?: boolean }) {
  vi.mocked(requireTeacherOrAdmin).mockResolvedValue({
    error: null,
    user: { id: 'u1', email: undefined },
    supabase: { rpc } as never,
    role: flags.isSuperAdmin ? 'admin' : flags.isDepartmentAdmin ? 'department_admin' : 'teacher',
    isSuperAdmin: !!flags.isSuperAdmin,
    isDepartmentAdmin: !!flags.isDepartmentAdmin,
    suggestedDepartmentId: null,
  })
}

const post = (body: unknown) =>
  new NextRequest('http://localhost/api/admin/lehrerzimmer/reports', { method: 'POST', body: JSON.stringify(body) })

beforeEach(() => vi.clearAllMocks())

describe('GET /reports (Moderation)', () => {
  it('gibt 403 für normale Lehrkräfte, ohne die Datenbank zu fragen', async () => {
    as({})
    expect((await GET()).status).toBe(403)
    expect(rpc).not.toHaveBeenCalled()
  })

  it('liefert Meldungen für Bereichs-Admins', async () => {
    as({ isDepartmentAdmin: true })
    rpc.mockResolvedValue({ data: [{ target_id: ID, report_count: 2 }], error: null })
    const res = await GET()
    expect(res.status).toBe(200)
    expect((await res.json()).items).toHaveLength(1)
  })

  it('liefert Meldungen für den Super-Admin', async () => {
    as({ isSuperAdmin: true })
    rpc.mockResolvedValue({ data: [], error: null })
    expect((await GET()).status).toBe(200)
  })
})

describe('POST /reports (melden)', () => {
  const valid = { target_type: 'post', target_id: ID, reason: 'unpassend', note: ' Beleidigend ' }

  it('nimmt eine Meldung an (201) und reicht den Hinweis gekürzt weiter', async () => {
    as({})
    rpc.mockResolvedValue({ data: null, error: null })
    const res = await POST(post(valid))
    expect(res.status).toBe(201)
    expect(rpc).toHaveBeenCalledWith('forum_report', {
      p_target_type: 'post',
      p_target_id: ID,
      p_reason: 'unpassend',
      p_note: 'Beleidigend',
    })
  })

  it('gibt 400 bei unbekanntem Grund oder zu langem Hinweis', async () => {
    as({})
    expect((await POST(post({ ...valid, reason: 'doof' }))).status).toBe(400)
    expect((await POST(post({ ...valid, note: 'x'.repeat(301) }))).status).toBe(400)
    expect(rpc).not.toHaveBeenCalled()
  })

  it('gibt 409, wenn schon gemeldet', async () => {
    as({})
    rpc.mockResolvedValue({ data: null, error: { code: 'FRM05', message: 'Das hast du schon gemeldet.' } })
    const res = await POST(post(valid))
    expect(res.status).toBe(409)
    expect((await res.json()).error).toBe('Das hast du schon gemeldet.')
  })

  it('gibt 403 bei eigenem Beitrag', async () => {
    as({})
    rpc.mockResolvedValue({ data: null, error: { code: 'FRM03', message: 'Eigene Beiträge kannst du nicht melden.' } })
    expect((await POST(post(valid))).status).toBe(403)
  })
})
