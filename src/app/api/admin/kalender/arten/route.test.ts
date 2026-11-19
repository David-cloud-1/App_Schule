import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST, PUT } from './route'
import { PATCH } from './[id]/route'

vi.mock('../../_lib/auth', () => ({ requireTeacherOrAdmin: vi.fn() }))
import { requireTeacherOrAdmin } from '../../_lib/auth'

const ID = '44444444-4444-4444-8444-444444444444'
const rpc = vi.fn()

function as(isSuperAdmin: boolean) {
  vi.mocked(requireTeacherOrAdmin).mockResolvedValue({
    error: null,
    user: { id: 'u1', email: undefined },
    supabase: { rpc } as never,
    role: isSuperAdmin ? 'admin' : 'teacher',
    isSuperAdmin,
    isDepartmentAdmin: false,
    suggestedDepartmentId: null,
  })
}

const req = (method: string, body: unknown) =>
  new NextRequest('http://localhost/api/admin/kalender/arten', { method, body: JSON.stringify(body) })

const art = { name: 'Personalrat', farbe: 'blue', icon: 'users' }

beforeEach(() => {
  vi.clearAllMocks()
})

describe('Abwesenheitsarten', () => {
  it('lässt Lehrkräfte keine Arten anlegen, ändern oder sortieren', async () => {
    as(false)
    expect((await POST(req('POST', art))).status).toBe(403)
    expect((await PUT(req('PUT', { ids: [ID] }))).status).toBe(403)
    expect((await PATCH(req('PATCH', art), { params: Promise.resolve({ id: ID }) })).status).toBe(403)
    expect(rpc).not.toHaveBeenCalled()
  })

  it('legt als Super-Admin eine Art an', async () => {
    as(true)
    rpc.mockResolvedValue({ data: ID, error: null })
    const res = await POST(req('POST', art))
    expect(res.status).toBe(201)
    expect(rpc).toHaveBeenCalledWith('abw_art_speichern', {
      p_id: null,
      p_name: 'Personalrat',
      p_farbe: 'blue',
      p_icon: 'users',
      p_aktiv: true,
      p_mit_freitext: false,
    })
  })

  it('lehnt freie Farbwerte ab', async () => {
    as(true)
    expect((await POST(req('POST', { ...art, farbe: '#ff0000' }))).status).toBe(400)
    expect(rpc).not.toHaveBeenCalled()
  })

  it('meldet „Sonstige nicht abschaltbar“ der Datenbank als 400', async () => {
    as(true)
    rpc.mockResolvedValue({
      data: null,
      error: { code: 'ABW04', message: '„Sonstige Abwesenheit“ lässt sich nicht umbenennen oder abschalten.' },
    })
    const res = await PATCH(req('PATCH', { ...art, aktiv: false }), { params: Promise.resolve({ id: ID }) })
    expect(res.status).toBe(400)
  })
})
