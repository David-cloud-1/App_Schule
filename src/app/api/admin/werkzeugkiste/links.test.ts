import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextResponse } from 'next/server'
import { chainMock } from '@/test/supabase-chain-mock'

vi.mock('@/app/api/admin/_lib/auth', () => ({ requireTeacherOrAdmin: vi.fn() }))

import { requireTeacherOrAdmin } from '@/app/api/admin/_lib/auth'
import { GET as linkLesen, POST as linkErzeugen, DELETE as linkAbschalten } from './ablaeufe/[id]/link/route'
import { GET as adminListe } from './links/route'
import { DELETE as adminAbschalten } from './links/[id]/route'
import { GET as materialien } from './materialien/route'

/**
 * Öffentlicher Link (PROJ-67): Schnittstellen. Wer erzeugen oder abschalten darf
 * und welches Format erlaubt ist, entscheidet die Datenbank; hier wird geprüft,
 * dass jede Route die Rolle verlangt, die richtigen Funktionen ruft und
 * Fehler verständlich abbildet.
 */

const A1 = '22222222-2222-4222-8222-222222222222'
const L1 = '33333333-3333-4333-8333-333333333333'
const CODE = 'ab12'.repeat(12)
const ctxA = { params: Promise.resolve({ id: A1 }) }
const ctxL = { params: Promise.resolve({ id: L1 }) }
const ctxKaputt = { params: Promise.resolve({ id: 'kein-uuid' }) }

let rpc: ReturnType<typeof vi.fn>
let db: ReturnType<typeof chainMock>
let tabellen: Record<string, unknown>

function anmelden(opts: { super?: boolean; antworten?: Record<string, { data?: unknown; error?: unknown }> } = {}) {
  rpc = vi.fn((name: string) => Promise.resolve({ data: null, error: null, ...(opts.antworten?.[name] ?? {}) }))
  db = chainMock((t) => ({ data: tabellen[t] ?? null }), { rpc })
  vi.mocked(requireTeacherOrAdmin).mockResolvedValue({
    error: null,
    user: { id: 'u1', email: 'l@schule.de' },
    supabase: db.client,
    role: opts.super ? 'admin' : 'teacher',
    isSuperAdmin: !!opts.super,
    isDepartmentAdmin: false,
    suggestedDepartmentId: null,
  } as never)
}

function ablehnen(status: number) {
  vi.mocked(requireTeacherOrAdmin).mockResolvedValue({
    error: NextResponse.json({ error: 'x' }, { status }),
    user: null,
    supabase: null,
  } as never)
}

const meinAblauf = { id: A1, owner_id: 'u1', status: 'fertig', ergebnis: { format: 'seite', dateiname: 'a.html', titel: 'T' } }
const linkJson = { code: CODE, erzeugtAm: '2026-11-04T10:00:00Z', aufrufe: 4, letzterAufruf: null }

beforeEach(() => {
  vi.resetAllMocks()
  tabellen = { werkzeug_ablaeufe: meinAblauf }
})

describe('Ohne Anmeldung (PROJ-67)', () => {
  it('liefert 401 auf allen neuen Routen', async () => {
    ablehnen(401)
    expect((await linkLesen(new Request('http://x'), ctxA)).status).toBe(401)
    expect((await linkErzeugen(new Request('http://x', { method: 'POST' }), ctxA)).status).toBe(401)
    expect((await linkAbschalten(new Request('http://x', { method: 'DELETE' }), ctxA)).status).toBe(401)
    expect((await adminListe(new Request('http://x'))).status).toBe(401)
    expect((await adminAbschalten(new Request('http://x', { method: 'DELETE' }), ctxL)).status).toBe(401)
  })
})

describe('GET /ablaeufe/:id/link', () => {
  it('liefert den aktuellen Link, nie zwischengespeichert', async () => {
    anmelden({ antworten: { link_lesen: { data: linkJson } } })
    const res = await linkLesen(new Request('http://x'), ctxA)
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ link: linkJson })
    expect(res.headers.get('Cache-Control')).toBe('no-store')
    expect(rpc).toHaveBeenCalledWith('link_lesen', { p_ablauf_id: A1 })
  })

  it('liefert link: null, wenn keiner aktiv ist', async () => {
    anmelden({ antworten: { link_lesen: { data: null } } })
    expect(await (await linkLesen(new Request('http://x'), ctxA)).json()).toEqual({ link: null })
  })

  it('sagt 404 bei kaputter ID, fremdem oder fehlendem Material', async () => {
    anmelden()
    expect((await linkLesen(new Request('http://x'), ctxKaputt)).status).toBe(404)
    tabellen.werkzeug_ablaeufe = { ...meinAblauf, owner_id: 'anderer' }
    expect((await linkLesen(new Request('http://x'), ctxA)).status).toBe(404)
    tabellen.werkzeug_ablaeufe = null
    expect((await linkLesen(new Request('http://x'), ctxA)).status).toBe(404)
    expect(rpc).not.toHaveBeenCalled()
  })
})

describe('POST /ablaeufe/:id/link', () => {
  it('erzeugt den Link über die Datenbankfunktion', async () => {
    anmelden({ antworten: { link_erzeugen: { data: linkJson } } })
    const res = await linkErzeugen(new Request('http://x', { method: 'POST' }), ctxA)
    expect(res.status).toBe(200)
    expect((await res.json()).link.code).toBe(CODE)
    expect(rpc).toHaveBeenCalledWith('link_erzeugen', { p_ablauf_id: A1 })
  })

  it('zeigt die Format-Sperre der Datenbank als verständlichen Satz (409)', async () => {
    anmelden({ antworten: { link_erzeugen: { error: { code: 'P0001', message: 'Einen Link für alle gibt es nur bei der Interaktiven Seite.' } } } })
    const res = await linkErzeugen(new Request('http://x', { method: 'POST' }), ctxA)
    expect(res.status).toBe(409)
    expect((await res.json()).error).toContain('Interaktiven Seite')
  })

  it('sagt 404 bei fremdem Material, ohne die Funktion zu rufen', async () => {
    anmelden()
    tabellen.werkzeug_ablaeufe = { ...meinAblauf, owner_id: 'anderer' }
    expect((await linkErzeugen(new Request('http://x', { method: 'POST' }), ctxA)).status).toBe(404)
    expect(rpc).not.toHaveBeenCalled()
  })

  it('meldet 500 ohne technischen Text, wenn die Antwort unlesbar ist', async () => {
    anmelden({ antworten: { link_erzeugen: { data: { unsinn: true } } } })
    const res = await linkErzeugen(new Request('http://x', { method: 'POST' }), ctxA)
    expect(res.status).toBe(500)
    expect((await res.json()).error).not.toMatch(/unsinn|rpc|supabase/i)
  })

  it('bildet „nicht erlaubt“ als 404 ab', async () => {
    anmelden({ antworten: { link_erzeugen: { error: { code: '42501', message: 'Nicht erlaubt.' } } } })
    expect((await linkErzeugen(new Request('http://x', { method: 'POST' }), ctxA)).status).toBe(404)
  })
})

describe('DELETE /ablaeufe/:id/link', () => {
  it('schaltet den Link ab', async () => {
    anmelden()
    const res = await linkAbschalten(new Request('http://x', { method: 'DELETE' }), ctxA)
    expect(res.status).toBe(200)
    expect(rpc).toHaveBeenCalledWith('link_abschalten', { p_ablauf_id: A1 })
  })

  it('sagt 404 bei fremdem Material', async () => {
    anmelden()
    tabellen.werkzeug_ablaeufe = { ...meinAblauf, owner_id: 'anderer' }
    expect((await linkAbschalten(new Request('http://x', { method: 'DELETE' }), ctxA)).status).toBe(404)
    expect(rpc).not.toHaveBeenCalled()
  })
})

describe('Super-Admin: Übersicht und Abschalten', () => {
  const zeile = {
    link_id: L1, titel: 'Haftung', werkzeug: 'skript', besitzer_name: 'Frau Muster',
    erzeugt_am: '2026-11-04T10:00:00Z', aufrufe: '7', letzter_aufruf: null, gesamt: '1',
  }

  it('liefert die Liste nur dem Super-Admin', async () => {
    anmelden({ super: true, antworten: { link_admin_liste: { data: [zeile] } } })
    const res = await adminListe(new Request('http://x/api?seite=1'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.eintraege[0]).toMatchObject({ id: L1, aufrufe: 7, besitzerName: 'Frau Muster' })
    // Der Code selbst gehört nicht in die Übersicht
    expect(JSON.stringify(body)).not.toContain(CODE)
    expect(body).toMatchObject({ gesamt: 1, hatMehr: false })
  })

  it('gibt Lehrkräften und Bereichs-Admins 404', async () => {
    anmelden({ antworten: { link_admin_liste: { data: [zeile] } } })
    expect((await adminListe(new Request('http://x/api'))).status).toBe(404)
    expect((await adminAbschalten(new Request('http://x', { method: 'DELETE' }), ctxL)).status).toBe(404)
    expect(rpc).not.toHaveBeenCalled()
  })

  it('lehnt eine ungültige Seite mit 400 ab', async () => {
    anmelden({ super: true })
    expect((await adminListe(new Request('http://x/api?seite=0'))).status).toBe(400)
  })

  it('schaltet einen fremden Link ab und sagt 404 bei kaputter ID', async () => {
    anmelden({ super: true })
    expect((await adminAbschalten(new Request('http://x', { method: 'DELETE' }), ctxL)).status).toBe(200)
    expect(rpc).toHaveBeenCalledWith('link_admin_abschalten', { p_link_id: L1 })
    expect((await adminAbschalten(new Request('http://x', { method: 'DELETE' }), ctxKaputt)).status).toBe(404)
  })
})

describe('Meine Materialien: Kennzeichen „Öffentlich“', () => {
  it('markiert nur Materialien mit aktivem Link und nennt nie den Code', async () => {
    anmelden()
    tabellen = {
      werkzeug_ablaeufe: [
        { id: A1, status: 'fertig', werkzeug: 'skript', titel: 'Haftung', datei_name: 'h.pdf', ergebnis: { titel: 'Haftung', dateiname: 'a.html', format: 'seite' }, kennzahlen: {}, updated_at: '2026-11-04', skript_hochgeladen_am: '2026-11-04' },
      ],
      regal_freigaben: [],
      werkzeug_links: [{ ablauf_id: A1, aufrufe: '9' }],
    }
    const res = await materialien(new Request('http://x/api'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.eintraege[0].oeffentlich).toEqual({ aufrufe: 9 })
    expect(JSON.stringify(body)).not.toContain(CODE)
    const abfrage = db.queries.find((q) => q.table === 'werkzeug_links')
    expect(abfrage?.calls.some((c) => c.method === 'is' && c.args[0] === 'abgeschaltet_am')).toBe(true)
  })
})
