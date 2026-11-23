import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'
import { GET as GET_UEBERSICHT } from './route'
import { GET as GET_LISTE } from './[id]/route'
import { PUT as PUT_HAKEN } from './[id]/haken/route'
import { PUT as PUT_VARIANTE } from './[id]/variante/route'
import { POST as POST_NEU } from './[id]/neu/route'

vi.mock('../_lib/auth', () => ({ requireTeacherOrAdmin: vi.fn() }))
import { requireTeacherOrAdmin } from '../_lib/auth'

const ID = 'dienstreise-beantragen'
const rpc = vi.fn()

/** Baukasten-Kette: .select().eq()… liefert sich selbst, das Ende liefert { data, error } */
function kette(ergebnisse: Array<{ data: unknown; error: unknown }>) {
  const aufrufe: Array<[string, unknown[]]> = []
  let i = 0
  const proxy: Record<string, unknown> = {}
  for (const name of ['select', 'eq', 'is', 'not', 'order']) {
    proxy[name] = (...args: unknown[]) => {
      aufrufe.push([name, args])
      return proxy
    }
  }
  proxy.limit = (...args: unknown[]) => {
    aufrufe.push(['limit', args])
    return Promise.resolve(ergebnisse[Math.min(i++, ergebnisse.length - 1)])
  }
  return { proxy, aufrufe }
}

const from = vi.fn()

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(requireTeacherOrAdmin).mockResolvedValue({
    error: null,
    user: { id: 'u1', email: undefined },
    supabase: { rpc, from } as never,
    role: 'teacher',
    isSuperAdmin: false,
    isDepartmentAdmin: false,
    suggestedDepartmentId: null,
  } as never)
})

const ctx = (id = ID) => ({ params: Promise.resolve({ id }) })
const req = (method: string, body?: unknown, path = '') =>
  new NextRequest(`http://localhost/api/admin/checklisten/${ID}${path}`, {
    method,
    body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
  })

function nichtAngemeldet(status: number) {
  vi.mocked(requireTeacherOrAdmin).mockResolvedValue({
    error: NextResponse.json({ error: status === 401 ? 'Unauthorized' : 'Forbidden' }, { status }),
    user: null,
    supabase: null,
  } as never)
}

describe('Anmeldung und Rolle (alle Routen)', () => {
  it.each([401, 403])('liefert %i, ohne die Datenbank zu fragen', async (status) => {
    nichtAngemeldet(status)
    const antworten = await Promise.all([
      GET_UEBERSICHT(),
      GET_LISTE(req('GET'), ctx()),
      PUT_HAKEN(req('PUT', { schritt: 'a', erledigt: true }), ctx()),
      PUT_VARIANTE(req('PUT', { variante: null }), ctx()),
      POST_NEU(req('POST'), ctx()),
    ])
    for (const a of antworten) expect(a.status).toBe(status)
    expect(rpc).not.toHaveBeenCalled()
    expect(from).not.toHaveBeenCalled()
  })
})

describe('GET /api/admin/checklisten', () => {
  it('liefert die offenen Durchläufe mit ihren Haken, nur für die eigene Person', async () => {
    const { proxy, aufrufe } = kette([
      {
        data: [
          {
            id: 'd1',
            checkliste: ID,
            variante: 'fortbildungsgang',
            gestartet_am: '2026-11-23T08:00:00Z',
            archiviert_am: null,
            checklisten_haken: [{ schritt: 'antrag-ausfuellen' }, { schritt: 'anlagen-beifuegen' }],
          },
        ],
        error: null,
      },
    ])
    from.mockReturnValue(proxy)
    const res = await GET_UEBERSICHT()
    expect(res.status).toBe(200)
    expect(res.headers.get('Cache-Control')).toBe('private, no-store')
    const json = await res.json()
    expect(json.offen).toEqual([
      {
        id: 'd1',
        checkliste: ID,
        variante: 'fortbildungsgang',
        gestartet_am: '2026-11-23T08:00:00Z',
        archiviert_am: null,
        haken: ['antrag-ausfuellen', 'anlagen-beifuegen'],
      },
    ])
    expect(from).toHaveBeenCalledWith('checklisten_durchlaeufe')
    expect(aufrufe).toContainEqual(['eq', ['owner_id', 'u1']])
    expect(aufrufe).toContainEqual(['is', ['archiviert_am', null]])
    expect(aufrufe).toContainEqual(['limit', [100]])
  })

  it('meldet Datenbankfehler ohne Technik-Text', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    from.mockReturnValue(kette([{ data: null, error: { code: 'XX000', message: 'interner Fehler' } }]).proxy)
    const res = await GET_UEBERSICHT()
    expect(res.status).toBe(500)
    expect((await res.json()).error).toBe('Das hat nicht geklappt. Bitte versuche es erneut.')
    spy.mockRestore()
  })
})

describe('GET /api/admin/checklisten/[id]', () => {
  it('gibt 404 für unbekannte Listen, ohne die Datenbank zu fragen', async () => {
    expect((await GET_LISTE(req('GET'), ctx('gibt-es-nicht'))).status).toBe(404)
    expect((await GET_LISTE(req('GET'), ctx('../etc'))).status).toBe(404)
    expect(from).not.toHaveBeenCalled()
  })

  it('liefert den offenen Durchlauf und die früheren mit Zahl der Haken', async () => {
    const { proxy } = kette([
      {
        data: [
          { id: 'd2', checkliste: ID, variante: null, gestartet_am: 'g', archiviert_am: null, checklisten_haken: [{ schritt: 'x' }] },
        ],
        error: null,
      },
      { data: [{ id: 'd1', variante: 'bezirksreise', gestartet_am: 'a', archiviert_am: 'b', checklisten_haken: [{ count: 7 }] }], error: null },
    ])
    from.mockReturnValue(proxy)
    const res = await GET_LISTE(req('GET'), ctx())
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.offen.haken).toEqual(['x'])
    expect(json.fruehere).toEqual([{ id: 'd1', variante: 'bezirksreise', gestartet_am: 'a', archiviert_am: 'b', anzahl_haken: 7 }])
  })

  it('liefert offen = null, solange nichts abgehakt wurde', async () => {
    from.mockReturnValue(kette([{ data: [], error: null }]).proxy)
    const json = await (await GET_LISTE(req('GET'), ctx())).json()
    expect(json.offen).toBeNull()
    expect(json.fruehere).toEqual([])
  })
})

describe('PUT /api/admin/checklisten/[id]/haken', () => {
  it('setzt einen Haken über die Datenbank-Funktion (gewünschter Zustand)', async () => {
    rpc.mockResolvedValue({ data: 'lauf-1', error: null })
    const res = await PUT_HAKEN(req('PUT', { schritt: 'antrag-stellen', erledigt: true, variante: 'bezirksreise' }), ctx())
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ durchlaufId: 'lauf-1', schritt: 'antrag-stellen', erledigt: true })
    expect(rpc).toHaveBeenCalledWith('checkliste_haken_setzen', {
      p_checkliste: ID,
      p_schritt: 'antrag-stellen',
      p_erledigt: true,
      p_variante: 'bezirksreise',
    })
  })

  it('entfernt einen Haken (erledigt = false), Variante bleibt leer', async () => {
    rpc.mockResolvedValue({ data: 'lauf-1', error: null })
    const res = await PUT_HAKEN(req('PUT', { schritt: 'antrag-stellen', erledigt: false }), ctx())
    expect(res.status).toBe(200)
    expect(rpc).toHaveBeenCalledWith('checkliste_haken_setzen', expect.objectContaining({ p_erledigt: false, p_variante: null }))
  })

  it.each([
    ['fehlender Zustand', { schritt: 'a' }],
    ['Zustand als Text', { schritt: 'a', erledigt: 'ja' }],
    ['Großbuchstaben im Schritt', { schritt: 'Antrag', erledigt: true }],
    ['Leerzeichen im Schritt', { schritt: 'a b', erledigt: true }],
    ['zu langer Schritt', { schritt: 'a'.repeat(61), erledigt: true }],
    ['unbekanntes Feld', { schritt: 'a', erledigt: true, extra: 1 }],
  ])('lehnt ab: %s (400)', async (_name, body) => {
    const res = await PUT_HAKEN(req('PUT', body), ctx())
    expect(res.status).toBe(400)
    expect(rpc).not.toHaveBeenCalled()
  })

  it('lehnt kaputtes JSON mit 400 ab', async () => {
    expect((await PUT_HAKEN(req('PUT', '{kaputt'), ctx())).status).toBe(400)
  })

  it('lehnt eine Variante ab, die nicht zur Liste gehört (400)', async () => {
    const res = await PUT_HAKEN(req('PUT', { schritt: 'a', erledigt: true, variante: 'klassenfahrt' }), ctx())
    expect(res.status).toBe(400)
    expect(rpc).not.toHaveBeenCalled()
  })

  it('gibt 404 für unbekannte Listen', async () => {
    expect((await PUT_HAKEN(req('PUT', { schritt: 'a', erledigt: true }), ctx('nope'))).status).toBe(404)
  })

  it('übersetzt „zu viele Haken“ in 409 mit verständlichem Text', async () => {
    rpc.mockResolvedValue({ data: null, error: { code: 'CHK02', message: 'In diesem Durchlauf sind zu viele Schritte abgehakt.' } })
    const res = await PUT_HAKEN(req('PUT', { schritt: 'a', erledigt: true }), ctx())
    expect(res.status).toBe(409)
    expect((await res.json()).error).toBe('In diesem Durchlauf sind zu viele Schritte abgehakt.')
  })

  it('übersetzt eine Zeilenregel-Verletzung (z. B. keine Lehrer-Rolle) in 403', async () => {
    rpc.mockResolvedValue({ data: null, error: { code: '42501', message: 'new row violates row-level security policy' } })
    const res = await PUT_HAKEN(req('PUT', { schritt: 'a', erledigt: true }), ctx())
    expect(res.status).toBe(403)
    expect(JSON.stringify(await res.json())).not.toContain('row-level')
  })

  it('verrät bei unerwarteten Fehlern keine Technik (500)', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    rpc.mockResolvedValue({ data: null, error: { code: 'XX000', message: 'boom' } })
    const res = await PUT_HAKEN(req('PUT', { schritt: 'a', erledigt: true }), ctx())
    expect(res.status).toBe(500)
    expect(JSON.stringify(await res.json())).not.toContain('boom')
    spy.mockRestore()
  })
})

describe('PUT /api/admin/checklisten/[id]/variante', () => {
  it('wählt eine Variante', async () => {
    rpc.mockResolvedValue({ data: 'lauf-1', error: null })
    const res = await PUT_VARIANTE(req('PUT', { variante: 'dienstreise-ausland' }), ctx())
    expect(res.status).toBe(200)
    expect(rpc).toHaveBeenCalledWith('checkliste_variante_setzen', { p_checkliste: ID, p_variante: 'dienstreise-ausland' })
  })

  it('hebt die Auswahl auf (null)', async () => {
    rpc.mockResolvedValue({ data: 'lauf-1', error: null })
    expect((await PUT_VARIANTE(req('PUT', { variante: null }), ctx())).status).toBe(200)
    expect(rpc).toHaveBeenCalledWith('checkliste_variante_setzen', { p_checkliste: ID, p_variante: null })
  })

  it('lehnt unbekannte Varianten und fehlende Angaben ab (400)', async () => {
    expect((await PUT_VARIANTE(req('PUT', { variante: 'gibt-es-nicht' }), ctx())).status).toBe(400)
    expect((await PUT_VARIANTE(req('PUT', {}), ctx())).status).toBe(400)
    expect((await PUT_VARIANTE(req('PUT', { variante: 'A B' }), ctx())).status).toBe(400)
    expect(rpc).not.toHaveBeenCalled()
  })
})

describe('POST /api/admin/checklisten/[id]/neu', () => {
  it('startet ohne Rumpf einen neuen Durchlauf ohne Variante (201)', async () => {
    rpc.mockResolvedValue({ data: 'lauf-2', error: null })
    const res = await POST_NEU(req('POST'), ctx())
    expect(res.status).toBe(201)
    expect(await res.json()).toEqual({ durchlaufId: 'lauf-2' })
    expect(rpc).toHaveBeenCalledWith('checkliste_neu_starten', { p_checkliste: ID, p_variante: null })
  })

  it('übernimmt eine gültige Variante', async () => {
    rpc.mockResolvedValue({ data: 'lauf-2', error: null })
    expect((await POST_NEU(req('POST', { variante: 'fortbildungsgang' }), ctx())).status).toBe(201)
    expect(rpc).toHaveBeenCalledWith('checkliste_neu_starten', { p_checkliste: ID, p_variante: 'fortbildungsgang' })
  })

  it('lehnt eine fremde Variante und kaputten Rumpf ab (400)', async () => {
    expect((await POST_NEU(req('POST', { variante: 'klassenfahrt' }), ctx())).status).toBe(400)
    expect((await POST_NEU(req('POST', '{kaputt'), ctx())).status).toBe(400)
    expect(rpc).not.toHaveBeenCalled()
  })

  it('gibt 404 für unbekannte Listen', async () => {
    expect((await POST_NEU(req('POST'), ctx('nope'))).status).toBe(404)
  })
})
