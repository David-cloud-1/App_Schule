import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'
import { GET } from './route'
import { GET as GET_HINWEISE, POST as POST_HINWEISE } from '../hinweise/route'
import { GET as GET_UEBER } from '../ueberschneidungen/route'

vi.mock('../../_lib/auth', () => ({ requireTeacherOrAdmin: vi.fn() }))
import { requireTeacherOrAdmin } from '../../_lib/auth'

const P = '11111111-1111-4111-8111-111111111111'
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

describe('GET /api/admin/kalender/meta', () => {
  it('liefert ich, Arten (Zahlen statt Text), Lehrkräfte und Abteilungen', async () => {
    rpc.mockImplementation(async (fn: string) => {
      if (fn === 'abw_ich') return { data: { id: 'u1', ist_planer: true, ist_super_admin: false }, error: null }
      if (fn === 'abw_arten') return { data: [{ id: 'a', name: 'Fortbildung', anzahl: '3' }], error: null }
      if (fn === 'abw_lehrkraefte') return { data: [{ id: P, name: 'Frau Meier' }], error: null }
      return { data: null, error: null }
    })
    const json = await (await GET()).json()
    expect(json.ich.ist_planer).toBe(true)
    expect(json.arten[0].anzahl).toBe(3)
    expect(json.lehrkraefte).toEqual([{ id: P, name: 'Frau Meier' }])
    expect(json.abteilungen.map((a: { id: string }) => a.id)).toEqual(['spedition', 'touristik', 'verkehrsservice', 'kep', 'bik-bvj', 'schulleitung'])
  })

  it('gibt 403 für Azubis', async () => {
    vi.mocked(requireTeacherOrAdmin).mockResolvedValue({
      error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
      user: null,
      supabase: null,
    })
    expect((await GET()).status).toBe(403)
    expect(rpc).not.toHaveBeenCalled()
  })
})

describe('Hinweise', () => {
  it('liest die eigenen Hinweise', async () => {
    rpc.mockResolvedValue({ data: [{ id: 'h1' }], error: null })
    expect((await (await GET_HINWEISE()).json()).items).toEqual([{ id: 'h1' }])
    expect(rpc).toHaveBeenCalledWith('abw_hinweise', undefined)
  })

  it('markiert einen oder alle als gesehen', async () => {
    rpc.mockResolvedValue({ data: null, error: null })
    const body = (b: unknown) => new NextRequest('http://localhost/x', { method: 'POST', body: JSON.stringify(b) })
    await POST_HINWEISE(body({ id: P }))
    expect(rpc).toHaveBeenLastCalledWith('abw_hinweis_gesehen', { p_id: P })
    await POST_HINWEISE(body({}))
    expect(rpc).toHaveBeenLastCalledWith('abw_hinweis_gesehen', { p_id: null })
    expect((await POST_HINWEISE(body({ id: 'x' }))).status).toBe(400)
  })
})

describe('GET /api/admin/kalender/ueberschneidungen', () => {
  it('fragt Überschneidungen derselben Person ab', async () => {
    rpc.mockResolvedValue({ data: [], error: null })
    const url = new URL('http://localhost/api/admin/kalender/ueberschneidungen')
    url.searchParams.set('person', P)
    url.searchParams.set('von', '2026-11-24')
    url.searchParams.set('bis', '2026-11-25')
    const res = await GET_UEBER(new NextRequest(url))
    expect(res.status).toBe(200)
    expect(rpc).toHaveBeenCalledWith('abw_ueberschneidungen', {
      p_person_id: P,
      p_von: '2026-11-24',
      p_bis: '2026-11-25',
      p_ausser: null,
    })
  })

  it('verlangt eine Person', async () => {
    const url = new URL('http://localhost/api/admin/kalender/ueberschneidungen?von=2026-11-24&bis=2026-11-25')
    expect((await GET_UEBER(new NextRequest(url))).status).toBe(400)
  })
})
