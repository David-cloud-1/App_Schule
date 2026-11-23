import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'
import { PUT } from './route'

vi.mock('../../../_lib/auth', () => ({ requireSuperAdmin: vi.fn() }))
import { requireSuperAdmin } from '../../../_lib/auth'

const ID = '55555555-5555-4555-8555-555555555555'
const rpc = vi.fn()

function as(isSuperAdmin: boolean) {
  vi.mocked(requireSuperAdmin).mockResolvedValue({
    error: null,
    user: { id: 'u1', email: undefined },
    supabase: { rpc } as never,
    role: isSuperAdmin ? 'admin' : 'department_admin',
    isSuperAdmin,
    departmentId: "d1",
    scopeIsAll: false,
  })
}

const req = (body: unknown) =>
  new NextRequest(`http://localhost/api/admin/users/${ID}/vertretungsplaner`, { method: 'PUT', body: JSON.stringify(body) })
const ctx = (id = ID) => ({ params: Promise.resolve({ id }) })

beforeEach(() => vi.clearAllMocks())

describe('PUT /api/admin/users/[id]/vertretungsplaner', () => {
  it('gibt 401/403 ohne Anmeldung bzw. für Lehrkräfte (requireSuperAdmin)', async () => {
    vi.mocked(requireSuperAdmin).mockResolvedValue({
      error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
      user: null,
      supabase: null,
    })
    expect((await PUT(req({ wert: true }), ctx())).status).toBe(403)
  })

  it('lässt Bereichs-Admins das Recht nicht vergeben', async () => {
    as(false)
    expect((await PUT(req({ wert: true }), ctx())).status).toBe(403)
    expect(rpc).not.toHaveBeenCalled()
  })

  it('setzt als Super-Admin das Recht', async () => {
    as(true)
    rpc.mockResolvedValue({ data: null, error: null })
    const res = await PUT(req({ wert: true }), ctx())
    expect(res.status).toBe(200)
    expect(rpc).toHaveBeenCalledWith('abw_planer_setzen', { p_user_id: ID, p_wert: true })
  })

  it('prüft Eingabe und Kennung', async () => {
    as(true)
    expect((await PUT(req({ wert: 'ja' }), ctx())).status).toBe(400)
    expect((await PUT(req({ wert: true }), ctx('abc'))).status).toBe(404)
    expect(rpc).not.toHaveBeenCalled()
  })

  it('meldet „nur Lehrkräfte“ der Datenbank als 400', async () => {
    as(true)
    rpc.mockResolvedValue({ data: null, error: { code: 'ABW04', message: 'Nur Lehrkräfte können Vertretungsplaner sein.' } })
    expect((await PUT(req({ wert: true }), ctx())).status).toBe(400)
  })
})
