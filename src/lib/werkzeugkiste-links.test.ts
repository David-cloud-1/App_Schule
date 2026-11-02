import { beforeEach, describe, expect, it } from 'vitest'
import { kannLinkHaben, linkAdresse, LINK_CODE_MUSTER } from '@/lib/werkzeugkiste-links'
import {
  linkAdminZeile,
  linkBremse,
  linkBremseZuruecksetzen,
  linkZuStand,
  LINK_PRO_MINUTE_UND_CODE,
  LINK_PRO_MINUTE_UND_QUELLE,
  nichtAktivSeite,
  OEFFENTLICH_CSP,
  OEFFENTLICH_KOPF,
} from '@/lib/werkzeugkiste-links-server'

const CODE = '0123456789abcdef'.repeat(3)

describe('Öffentlicher Link: reine Hilfsfunktionen (PROJ-67)', () => {
  it('erlaubt einen Link nur für fertige Interaktive Seiten mit Datei', () => {
    expect(kannLinkHaben('seite', true)).toBe(true)
    expect(kannLinkHaben('h5p', true)).toBe(false)
    expect(kannLinkHaben('word', true)).toBe(false)
    expect(kannLinkHaben('seite', false)).toBe(false)
    expect(kannLinkHaben(null, true)).toBe(false)
    expect(kannLinkHaben(undefined, true)).toBe(false)
  })

  it('baut die Adresse ohne doppelten Schrägstrich', () => {
    expect(linkAdresse('https://spedilern.vercel.app', CODE)).toBe(`https://spedilern.vercel.app/s/${CODE}`)
    expect(linkAdresse('https://spedilern.vercel.app/', CODE)).toBe(`https://spedilern.vercel.app/s/${CODE}`)
  })

  it('erkennt nur Codes mit genau 48 Hexzeichen', () => {
    expect(LINK_CODE_MUSTER.test(CODE)).toBe(true)
    expect(LINK_CODE_MUSTER.test(CODE.slice(1))).toBe(false)
    expect(LINK_CODE_MUSTER.test(CODE + '0')).toBe(false)
    expect(LINK_CODE_MUSTER.test(CODE.toUpperCase())).toBe(false)
    expect(LINK_CODE_MUSTER.test('g'.repeat(48))).toBe(false)
    expect(LINK_CODE_MUSTER.test(`${CODE}\n`)).toBe(false)
  })
})

describe('Öffentlicher Link: Zeilen aus der Datenbank', () => {
  it('wandelt link_lesen in den Stand um', () => {
    expect(linkZuStand({ code: CODE, erzeugtAm: '2026-11-04T10:00:00Z', aufrufe: 3, letzterAufruf: null })).toEqual({
      code: CODE,
      erzeugtAm: '2026-11-04T10:00:00Z',
      aufrufe: 3,
      letzterAufruf: null,
    })
  })

  it('verwirft fehlende oder ungültige Codes', () => {
    expect(linkZuStand(null)).toBeNull()
    expect(linkZuStand('x')).toBeNull()
    expect(linkZuStand({ code: 'kurz' })).toBeNull()
    expect(linkZuStand({})).toBeNull()
  })

  it('wandelt die Admin-Zeile um (Zähler als Zahl)', () => {
    expect(
      linkAdminZeile({
        link_id: 'l1', titel: 'Haftung', werkzeug: 'skript', besitzer_name: 'Frau Muster',
        erzeugt_am: '2026-11-04', aufrufe: '12', letzter_aufruf: null, gesamt: '1',
      }),
    ).toMatchObject({ id: 'l1', aufrufe: 12, besitzerName: 'Frau Muster', letzterAufruf: null })
  })
})

describe('Öffentliche Auslieferung: Kopfzeilen (PROJ-67)', () => {
  it('sperrt die Seite in eine Sandbox ohne eigene Herkunft', () => {
    expect(OEFFENTLICH_CSP).toContain('sandbox allow-scripts allow-modals')
    // allow-same-origin würde der Seite Cookies und Schnittstellen der App öffnen
    expect(OEFFENTLICH_CSP).not.toContain('allow-same-origin')
    expect(OEFFENTLICH_CSP).not.toContain('allow-popups')
    expect(OEFFENTLICH_CSP).not.toContain('allow-top-navigation')
    expect(OEFFENTLICH_CSP).not.toContain('allow-forms')
  })

  it('erlaubt keine Verbindung ins Netz, keine Formulare, keine Fremdquellen', () => {
    expect(OEFFENTLICH_CSP).toContain("default-src 'none'")
    expect(OEFFENTLICH_CSP).toContain("connect-src 'none'")
    expect(OEFFENTLICH_CSP).toContain("form-action 'none'")
    expect(OEFFENTLICH_CSP).toContain("base-uri 'none'")
    expect(OEFFENTLICH_CSP).toContain("frame-ancestors 'none'")
    expect(OEFFENTLICH_CSP).not.toMatch(/https?:/)
    expect(OEFFENTLICH_CSP).not.toContain('*')
  })

  it('verhindert Zwischenspeicher, Suchmaschinen und Herkunftsangabe', () => {
    expect(OEFFENTLICH_KOPF['Cache-Control']).toBe('no-store')
    expect(OEFFENTLICH_KOPF['X-Robots-Tag']).toContain('noindex')
    expect(OEFFENTLICH_KOPF['Referrer-Policy']).toBe('no-referrer')
    expect(OEFFENTLICH_KOPF['X-Content-Type-Options']).toBe('nosniff')
  })

  it('zeigt bei ungültigen Links immer dieselbe ruhige 404-Seite', async () => {
    const res = nichtAktivSeite()
    expect(res.status).toBe(404)
    const html = await res.text()
    expect(html).toContain('Dieser Link ist nicht mehr aktiv.')
    expect(html).not.toMatch(/Fehler|Exception|supabase|Skript/i)
    expect(res.headers.get('X-Robots-Tag')).toContain('noindex')
    expect(res.headers.get('Content-Security-Policy')).not.toContain('allow-scripts')
  })
})

describe('Öffentliche Auslieferung: Mengenbremse (PROJ-67)', () => {
  beforeEach(() => linkBremseZuruecksetzen())

  it('lässt je Code und Quelle nur eine Höchstzahl pro Minute durch', () => {
    const t = 1_000_000
    for (let i = 0; i < LINK_PRO_MINUTE_UND_CODE; i++) expect(linkBremse('1.2.3.4', CODE, t + i)).toBe(true)
    expect(linkBremse('1.2.3.4', CODE, t + 100)).toBe(false)
    // andere Quelle ist nicht betroffen
    expect(linkBremse('5.6.7.8', CODE, t + 100)).toBe(true)
  })

  it('gibt nach einer Minute wieder frei', () => {
    const t = 2_000_000
    for (let i = 0; i < LINK_PRO_MINUTE_UND_CODE; i++) linkBremse('1.2.3.4', CODE, t)
    expect(linkBremse('1.2.3.4', CODE, t + 1000)).toBe(false)
    expect(linkBremse('1.2.3.4', CODE, t + 61_000)).toBe(true)
  })

  it('bremst Durchprobieren vieler Codes von einer Quelle', () => {
    const t = 3_000_000
    for (let i = 0; i < LINK_PRO_MINUTE_UND_QUELLE; i++) {
      expect(linkBremse('9.9.9.9', i.toString(16).padStart(48, '0'), t)).toBe(true)
    }
    expect(linkBremse('9.9.9.9', 'f'.repeat(48), t)).toBe(false)
  })
})
