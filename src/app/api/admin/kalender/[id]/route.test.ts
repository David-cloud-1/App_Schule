import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'
import { DELETE, GET, PATCH } from './route'
import { PUT as PUT_VERTRETUNG } from './vertretung/route'
import { POST as POST_WIEDERHERSTELLEN } from './wiederherstellen/route'

vi.mock('../../_lib/auth', () => ({ requireTeacherOrAdmin: vi.fn() }))
import { requireTeacherOrAdmin } from '../../_lib/auth'

const ID = '33333333-3333-4333-8333-333333333333'
const P = '11111111-1111-4111-8111-111111111111'
const A = '22222222-2222-4222-8222-222222222222'
const rpc = vi.fn()

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(requireTeacherOrAdmin).mockResolvedValue({
    error: null,
    user: { id: 'u1', email: undefined },
    supabase: { rpc } as never,
    role: 'teacher',
    isSuperAdmin: false,
    isDepartmentAdmin: false,
    suggestedDepartmentId: null,
  })
})

const ctx = (id = ID) => ({ params: Promise.resolve({ id }) })
const req = (method: string, body?: unknown, query = '') =>
  new NextRequest(`http://localhost/api/admin/kalender/${ID}${query}`, {
    method,
    body: body === undefined ? undefined : JSON.stringify(body),
  })

const eintrag = {
  person_id: P,
  art_id: A,
  datum_von: '2026-11-24',
  datum_bis: '2026-11-24',
  ganztaegig: false,
  zeit_von: '08:00',
  zeit_bis: '11:15',
  alle_abteilungen: true,
}

describe('GET /api/admin/kalender/[id]', () => {
  it('gibt 404 für ungültige Kennungen, ohne die Datenbank zu fragen', async () => {
    expect((await GET(req('GET'), ctx('abc'))).status).toBe(404)
    expect(rpc).not.toHaveBeenCalled()
  })

  it('meldet gelöschte Einträge als 404 mit verständlichem Text', async () => {
    rpc.mockResolvedValue({ data: null, error: { code: 'ABW02', message: 'Eintrag wurde gelöscht.' } })
    const res = await GET(req('GET'), ctx())
    expect(res.status).toBe(404)
    expect((await res.json()).error).toBe('Eintrag wurde gelöscht.')
  })

  it('liefert den Eintrag', async () => {
    rpc.mockResolvedValue({ data: { id: ID, version: 2 }, error: null })
    const res = await GET(req('GET'), ctx())
    expect(res.status).toBe(200)
    expect((await res.json()).item.version).toBe(2)
    expect(rpc).toHaveBeenCalledWith('abw_eintrag', { p_id: ID })
  })
})

describe('PATCH /api/admin/kalender/[id]', () => {
  it('verlangt die Version', async () => {
    expect((await PATCH(req('PATCH', eintrag), ctx())).status).toBe(400)
    expect(rpc).not.toHaveBeenCalled()
  })

  it('ändert mit Version und Uhrzeiten', async () => {
    rpc.mockResolvedValue({ data: 4, error: null })
    const res = await PATCH(req('PATCH', { ...eintrag, version: 3 }), ctx())
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ version: 4 })
    expect(rpc).toHaveBeenCalledWith(
      'abw_aendern',
      expect.objectContaining({ p_id: ID, p_version: 3, p_zeit_von: '08:00', p_zeit_bis: '11:15', p_alle: true }),
    )
  })

  it('meldet einen Versionskonflikt als 409', async () => {
    rpc.mockResolvedValue({ data: null, error: { code: 'ABW06', message: 'Der Eintrag wurde gerade geändert. Bitte neu laden.' } })
    expect((await PATCH(req('PATCH', { ...eintrag, version: 1 }), ctx())).status).toBe(409)
  })

  it('meldet fehlende Rechte als 403', async () => {
    rpc.mockResolvedValue({ data: null, error: { code: 'ABW03', message: 'Diesen Eintrag darfst du nicht ändern.' } })
    expect((await PATCH(req('PATCH', { ...eintrag, version: 1 }), ctx())).status).toBe(403)
  })
})

describe('DELETE /api/admin/kalender/[id]', () => {
  it('verlangt die Version', async () => {
    expect((await DELETE(req('DELETE'), ctx())).status).toBe(400)
    expect((await DELETE(req('DELETE', undefined, '?version=x'), ctx())).status).toBe(400)
    expect(rpc).not.toHaveBeenCalled()
  })

  it('löscht mit Version', async () => {
    rpc.mockResolvedValue({ data: null, error: null })
    const res = await DELETE(req('DELETE', undefined, '?version=2'), ctx())
    expect(res.status).toBe(200)
    expect(rpc).toHaveBeenCalledWith('abw_loeschen', { p_id: ID, p_version: 2 })
  })

  it('gibt 401 ohne Anmeldung', async () => {
    vi.mocked(requireTeacherOrAdmin).mockResolvedValue({
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
      user: null,
      supabase: null,
    })
    expect((await DELETE(req('DELETE', undefined, '?version=2'), ctx())).status).toBe(401)
  })
})

describe('PUT /api/admin/kalender/[id]/vertretung', () => {
  it('setzt den Status mit Version', async () => {
    rpc.mockResolvedValue({ data: 2, error: null })
    const res = await PUT_VERTRETUNG(req('PUT', { version: 1, status: 'eingetragen' }), ctx())
    expect(res.status).toBe(200)
    expect(rpc).toHaveBeenCalledWith('abw_vertretung_setzen', { p_id: ID, p_version: 1, p_status: 'eingetragen' })
  })

  it('lehnt unbekannte Status ab', async () => {
    expect((await PUT_VERTRETUNG(req('PUT', { version: 1, status: 'fertig' }), ctx())).status).toBe(400)
    expect(rpc).not.toHaveBeenCalled()
  })

  it('reicht „nur Planer“ der Datenbank als 403 durch', async () => {
    rpc.mockResolvedValue({
      data: null,
      error: { code: 'ABW03', message: 'Den Vertretungsstatus ändern nur Vertretungsplaner.' },
    })
    const res = await PUT_VERTRETUNG(req('PUT', { version: 1, status: 'eingetragen' }), ctx())
    expect(res.status).toBe(403)
    expect((await res.json()).error).toBe('Den Vertretungsstatus ändern nur Vertretungsplaner.')
  })
})

describe('POST /api/admin/kalender/[id]/wiederherstellen', () => {
  it('stellt wieder her und gibt die neue Version zurück', async () => {
    rpc.mockResolvedValue({ data: 6, error: null })
    const res = await POST_WIEDERHERSTELLEN(req('POST'), ctx())
    expect(await res.json()).toEqual({ version: 6 })
    expect(rpc).toHaveBeenCalledWith('abw_wiederherstellen', { p_id: ID })
  })
})
