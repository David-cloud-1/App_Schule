import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'
import { GET, POST } from './route'

vi.mock('../_lib/auth', () => ({ requireTeacherOrAdmin: vi.fn() }))
import { requireTeacherOrAdmin } from '../_lib/auth'

const P = '11111111-1111-4111-8111-111111111111'
const A = '22222222-2222-4222-8222-222222222222'
const rpc = vi.fn()

function asTeacher() {
  vi.mocked(requireTeacherOrAdmin).mockResolvedValue({
    error: null,
    user: { id: 'u1', email: undefined },
    supabase: { rpc } as never,
    role: 'teacher',
    isSuperAdmin: false,
    isDepartmentAdmin: false,
    suggestedDepartmentId: null,
  })
}

function denied(status: 401 | 403) {
  vi.mocked(requireTeacherOrAdmin).mockResolvedValue({
    error: NextResponse.json({ error: status === 401 ? 'Unauthorized' : 'Forbidden' }, { status }),
    user: null,
    supabase: null,
  })
}

function get(params: Record<string, string>) {
  const url = new URL('http://localhost/api/admin/kalender')
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  return new NextRequest(url)
}

function post(body: unknown) {
  return new NextRequest('http://localhost/api/admin/kalender', {
    method: 'POST',
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })
}

const valid = {
  person_id: P,
  art_id: A,
  datum_von: '2026-11-24',
  datum_bis: '2026-11-25',
  ganztaegig: true,
  abteilungen: ['spedition', 'kep'],
  notiz: 'Raum 12',
}

beforeEach(() => {
  vi.clearAllMocks()
  asTeacher()
})

describe('GET /api/admin/kalender', () => {
  it('gibt 401 ohne Anmeldung und 403 für Azubis, ohne die Datenbank zu fragen', async () => {
    denied(401)
    expect((await GET(get({ von: '2026-11-01', bis: '2026-11-30' }))).status).toBe(401)
    denied(403)
    expect((await GET(get({ von: '2026-11-01', bis: '2026-11-30' }))).status).toBe(403)
    expect(rpc).not.toHaveBeenCalled()
  })

  it('lehnt fehlende oder zu lange Zeiträume ab', async () => {
    expect((await GET(get({ von: '2026-11-01' }))).status).toBe(400)
    expect((await GET(get({ von: '2026-01-01', bis: '2026-12-31' }))).status).toBe(400)
    expect(rpc).not.toHaveBeenCalled()
  })

  it('reicht Filter durch und erkennt „Mehr laden“', async () => {
    rpc.mockResolvedValue({ data: Array.from({ length: 51 }, (_, i) => ({ id: `a${i}` })), error: null })
    const res = await GET(
      get({ von: '2026-11-01', bis: '2026-11-30', abteilung: 'kep', status: 'offen', q: 'Meier', limit: '50', offset: '50' }),
    )
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.items).toHaveLength(50)
    expect(json.hasMore).toBe(true)
    expect(rpc).toHaveBeenCalledWith('abw_liste', {
      p_von: '2026-11-01',
      p_bis: '2026-11-30',
      p_abteilung: 'kep',
      p_status: 'offen',
      p_art_id: null,
      p_suche: 'Meier',
      p_limit: 51,
      p_offset: 50,
    })
  })

  it('lehnt unbekannte Abteilungen im Filter ab', async () => {
    expect((await GET(get({ von: '2026-11-01', bis: '2026-11-30', abteilung: 'x' }))).status).toBe(400)
  })
})

describe('POST /api/admin/kalender', () => {
  it('gibt 401 ohne Anmeldung', async () => {
    denied(401)
    expect((await POST(post(valid))).status).toBe(401)
  })

  it('legt an und gibt die neue Kennung zurück', async () => {
    rpc.mockResolvedValue({ data: 'neu-id', error: null })
    const res = await POST(post(valid))
    expect(res.status).toBe(201)
    expect(await res.json()).toEqual({ id: 'neu-id' })
    expect(rpc).toHaveBeenCalledWith('abw_anlegen', {
      p_person_id: P,
      p_art_id: A,
      p_von: '2026-11-24',
      p_bis: '2026-11-25',
      p_ganztaegig: true,
      p_zeit_von: null,
      p_zeit_bis: null,
      p_alle: false,
      p_abteilungen: ['spedition', 'kep'],
      p_freitext: null,
      p_notiz: 'Raum 12',
    })
  })

  it('schickt bei „Alle Abteilungen“ keine Einzelauswahl mit', async () => {
    rpc.mockResolvedValue({ data: 'neu-id', error: null })
    await POST(post({ ...valid, alle_abteilungen: true }))
    expect(rpc).toHaveBeenCalledWith('abw_anlegen', expect.objectContaining({ p_alle: true, p_abteilungen: [] }))
  })

  it('gibt 400 mit Feld bei ungültiger Eingabe und kaputtem JSON', async () => {
    const res = await POST(post({ ...valid, abteilungen: [] }))
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({
      error: 'Bitte mindestens eine Abteilung oder „Alle Abteilungen“ wählen.',
      field: 'abteilungen',
    })
    expect((await POST(post('{kaputt'))).status).toBe(400)
    expect(rpc).not.toHaveBeenCalled()
  })

  it('übersetzt Datenbank-Fehler (keine Berechtigung, Flut-Schutz) und versteckt technische', async () => {
    rpc.mockResolvedValue({ data: null, error: { code: 'ABW03', message: 'Kein Zugang zum Kalender.' } })
    let res = await POST(post(valid))
    expect(res.status).toBe(403)
    expect((await res.json()).error).toBe('Kein Zugang zum Kalender.')

    rpc.mockResolvedValue({ data: null, error: { code: 'ABW01', message: 'Bitte kurz warten' } })
    expect((await POST(post(valid))).status).toBe(429)

    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    rpc.mockResolvedValue({ data: null, error: { code: '42P01', message: 'relation does not exist' } })
    res = await POST(post(valid))
    expect(res.status).toBe(500)
    expect((await res.json()).error).not.toContain('relation')
    spy.mockRestore()
  })
})
