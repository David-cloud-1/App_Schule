// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { chainMock } from '@/test/supabase-chain-mock'

vi.mock('@/app/api/admin/_lib/auth', () => ({ requireTeacherOrAdmin: vi.fn() }))
vi.mock('@/lib/supabase-server', () => ({ createServiceClient: vi.fn() }))

import { NextResponse } from 'next/server'
import { requireTeacherOrAdmin } from '@/app/api/admin/_lib/auth'
import { createServiceClient } from '@/lib/supabase-server'
import { POST as anlegen } from './materialien/route'
import { GET as editorLaden, DELETE as editorVerwerfen } from './ablaeufe/[id]/editor/route'
import { GET as download } from './ablaeufe/[id]/download/route'
import { POST as linkErzeugen } from './ablaeufe/[id]/link/route'
import { PUT as freigeben } from './ablaeufe/[id]/freigabe/route'
import { PATCH as aendern } from './ablaeufe/[id]/route'
import { POST as bauen } from './ablaeufe/[id]/bauen/route'
import { POST as einlesen } from './ablaeufe/[id]/einlesen/route'
import { POST as kapitelEinsetzen } from './ablaeufe/[id]/kapitel/einsetzen/route'
import { POST as vorschau } from './ablaeufe/[id]/editor/vorschau/route'
import { SPEICHER_GRENZE_BYTES } from '@/lib/werkzeugkiste-materialien'
import { zeileZuMaterial, type ListenZeile } from '@/lib/werkzeugkiste-materialien-server'
import { EIGENE_SEITE, findeWerkzeug, werkzeugeDerGruppe } from '@/lib/werkzeugkiste'
import { baukastenWeg, grundgeruest, istEditierbar, kernWerkzeug, nieVeroeffentlicht, STANDARD_SCHULE } from '@/lib/werkzeugkiste-editor'

const ID = '11111111-1111-4111-8111-111111111111'
const ctx = { params: Promise.resolve({ id: ID }) }

/** Eine frisch angelegte eigene Seite: Entwurf ja, Fassung nein */
const NEU = {
  id: ID,
  owner_id: 'u1',
  werkzeug: EIGENE_SEITE,
  status: 'fertig',
  schritt: 5,
  datei_name: null,
  datei_groesse: null,
  kennzahlen: null,
  gliederung: [],
  auswahl: { seiten: '', abschnitte: [] },
  einstellungen: { format: 'seite' },
  prompt: null,
  antwort: null,
  pruefung: null,
  ergebnis: null,
  titel: 'Mein Thema',
  skript_hochgeladen_am: '2026-11-12T10:00:00Z',
  skript_entfernt_am: null,
  herkunft_name: null,
  hat_entwurf: true,
  updated_at: '2026-11-12T10:00:00Z',
  entwurf: grundgeruest('Mein Thema', 'Untertitel'),
  entwurf_am: '2026-11-12T10:00:00+00:00',
  entwurf_pruefung: null,
}

let zeile: Record<string, unknown>
let writes: { methode: string; payload: unknown }[]
let rpcs: string[]
let speicherGenutzt: number
let kernAufrufe: { pfad: string; body: Record<string, unknown> }[]

const json = (body: unknown, methode = 'POST') =>
  new Request('http://t', { method: methode, body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } })

beforeEach(() => {
  vi.clearAllMocks()
  zeile = { ...NEU }
  writes = []
  rpcs = []
  kernAufrufe = []
  speicherGenutzt = 0
  const db = chainMock(
    (_t, calls) => {
      for (const m of ['insert', 'update', 'delete']) {
        const c = calls.find((x) => x.method === m)
        if (c) writes.push({ methode: m, payload: c.args[0] })
      }
      const eingefuegt = calls.some((x) => x.method === 'insert')
      return { data: eingefuegt ? { id: ID } : zeile, count: 0 }
    },
    {
      rpc: vi.fn(async (name: string) => {
        rpcs.push(name)
        return { data: name === 'wk_speicher_genutzt' ? speicherGenutzt : null, error: null }
      }),
    },
  )
  vi.mocked(requireTeacherOrAdmin).mockResolvedValue({ error: null, user: { id: 'u1' }, supabase: db.client, role: 'teacher' } as never)
  const speicher = {
    createSignedUrl: vi.fn(async (p: string) => ({ data: { signedUrl: `https://speicher.test/${p}` } })),
    createSignedUploadUrl: vi.fn(async (p: string) => ({ data: { signedUrl: `https://speicher.test/s/${p}` } })),
    list: vi.fn(async () => ({ data: [], error: null })),
    remove: vi.fn().mockResolvedValue({ data: [] }),
  }
  vi.mocked(createServiceClient).mockReturnValue({ ...db.client, storage: { from: () => speicher } } as never)
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init: { body: string }) => {
      kernAufrufe.push({ pfad: new URL(url).pathname, body: JSON.parse(init.body) })
      return new Response(JSON.stringify({ groesse: 10, warnungen: 0, befunde: [], fehlende_bilder: [], titel: 'x', dateiname: 'x.html' }), { status: 200 })
    }),
  )
  vi.stubEnv('WERKZEUGKISTE_KERN_URL', 'https://kern.test')
  vi.stubEnv('WERKZEUGKISTE_KERN_SECRET', 'geheim')
})

describe('Grundgerüst (E2)', () => {
  it('hat Deckblatt, Thema 1 mit Lernziele-Box und eine leere Lernzielkontrolle', () => {
    const s = grundgeruest('  Haftung  ', ' Ein Überblick ')
    expect(s.cover).toEqual({ title: 'Haftung', subtitle: 'Ein Überblick', school: STANDARD_SCHULE, duration: '' })
    expect(s.chapters).toHaveLength(1)
    expect(s.chapters[0].title).toBe('Thema 1')
    expect(s.chapters[0].elements).toHaveLength(1)
    const text = s.chapters[0].elements[0]
    expect(text.type).toBe('text')
    const html = String(text.content)
    expect(html).toContain('<div class="lernziele">')
    expect(html).toContain('Nach diesem Kapitel kannst du…')
    // Boxen nur mit Klasse, nie mit Inline-Stil
    expect(html).not.toContain('style=')
    expect(html).toContain('<h2>Thema 1</h2>')
    expect(s.final_chapter).toEqual({ title: 'Lernzielkontrolle' })
  })

  it('lässt den Untertitel weg, wenn er leer ist', () => {
    expect('subtitle' in grundgeruest('T').cover).toBe(false)
    expect('subtitle' in grundgeruest('T', '   ').cover).toBe(false)
  })
})

describe('Werkzeug „Eigene Seite“', () => {
  it('ist bekannt, aber kein Werkzeug mit Ablauf', () => {
    const w = findeWerkzeug(EIGENE_SEITE)!
    expect(w.name).toBe('Eigene Seite')
    expect(w.ohneAblauf).toBe(true)
    expect(w.aktiv).toBe(false)
    expect(w.formate.map((f) => f.label)).toEqual(['Interaktive Seite'])
  })

  it('erscheint in keiner Gruppe der Werkzeug-Übersicht', () => {
    for (const g of ['selbstlernen', 'ueben', 'unterricht', 'hoeren'] as const) {
      expect(werkzeugeDerGruppe(g).some((x) => x.id === EIGENE_SEITE)).toBe(false)
    }
  })

  it('ist im Baukasten bearbeitbar, auch ohne Ergebnis', () => {
    expect(istEditierbar({ werkzeug: EIGENE_SEITE, status: 'fertig', format: null })).toBe(true)
    expect(baukastenWeg({ werkzeug: EIGENE_SEITE, status: 'fertig', format: null, hatAntwort: false })).toBe('bearbeiten')
    expect(baukastenWeg({ werkzeug: EIGENE_SEITE, status: 'laeuft' })).toBeNull()
  })

  it('heißt für den Kern „arbeitsblatt“ – er kennt „eigen“ nicht', () => {
    expect(kernWerkzeug(EIGENE_SEITE)).toBe('arbeitsblatt')
    expect(kernWerkzeug('skript')).toBe('skript')
  })

  it('„nie veröffentlicht“ gilt nur ohne Fassung und nur für eigene Seiten', () => {
    expect(nieVeroeffentlicht({ werkzeug: EIGENE_SEITE, antwort: null, ergebnis: null })).toBe(true)
    expect(nieVeroeffentlicht({ werkzeug: EIGENE_SEITE, antwort: 'cover: {}', ergebnis: { titel: 'x' } })).toBe(false)
    expect(nieVeroeffentlicht({ werkzeug: 'skript', antwort: null, ergebnis: null })).toBe(false)
  })
})

describe('Meine Materialien: Zeile einer eigenen Seite', () => {
  const basis: ListenZeile = {
    id: ID,
    werkzeug: EIGENE_SEITE,
    status: 'fertig',
    schritt: 5,
    titel: 'Mein Thema',
    datei_name: null,
    hat_antwort: false,
    hat_entwurf: true,
    skript_entfernt_am: null,
    created_at: '2026-11-12T10:00:00Z',
    updated_at: '2026-11-12T10:00:00Z',
    laeuft_ab_am: null,
    video_url: null,
    ergebnis_titel: null,
    ergebnis_format: null,
    ergebnis_fertig_am: null,
    ergebnis_vorschau: null,
    ergebnis_text: null,
  }

  it('ist Interaktive Seite, bearbeitbar, aber ohne Datei und ohne Vorschau', () => {
    const m = zeileZuMaterial(basis)
    expect(m).toMatchObject({
      art: 'material',
      format: 'seite',
      titel: 'Mein Thema',
      hatDatei: false,
      hatVorschau: false,
      entwurfOffen: true,
      nochNichtVeroeffentlicht: true,
      baukasten: 'bearbeiten',
      laeuftAbAm: null,
    })
  })

  it('hat nach dem Veröffentlichen eine Datei und gilt nicht mehr als unveröffentlicht', () => {
    const m = zeileZuMaterial({ ...basis, hat_antwort: true, hat_entwurf: false, ergebnis_titel: 'Mein Thema', ergebnis_format: 'seite' })
    expect(m.hatDatei).toBe(true)
    expect(m.hatVorschau).toBe(true)
    expect(m.nochNichtVeroeffentlicht).toBeUndefined()
    expect(m.entwurfOffen).toBeUndefined()
  })
})

describe('POST …/materialien (Leere Seite anlegen)', () => {
  it('legt ein fertiges Material mit Grundgerüst und ohne Fassung an', async () => {
    const res = await anlegen(json({ titel: '  Mein Thema ', untertitel: 'Untertitel' }))
    expect(res.status).toBe(201)
    expect((await res.json()).id).toBe(ID)
    const neu = writes.find((w) => w.methode === 'insert')!.payload as Record<string, unknown>
    expect(neu).toMatchObject({
      owner_id: 'u1',
      werkzeug: EIGENE_SEITE,
      status: 'fertig',
      titel: 'Mein Thema',
      einstellungen: { format: 'seite' },
    })
    expect(neu.entwurf).toMatchObject({ cover: { title: 'Mein Thema', subtitle: 'Untertitel', school: STANDARD_SCHULE } })
    expect(typeof neu.entwurf_am).toBe('string')
    // keine Fassung, kein Skript, kein Ablauftermin
    for (const feld of ['antwort', 'ergebnis', 'datei_name', 'laeuft_ab_am', 'prompt']) expect(feld in neu).toBe(false)
    // kein Kern-Aufruf beim Anlegen
    expect(kernAufrufe).toHaveLength(0)
  })

  it('verlangt einen Titel von 1 bis 120 Zeichen', async () => {
    for (const titel of ['', '   ', 'x'.repeat(121), 'a\u0000b']) {
      const res = await anlegen(json({ titel }))
      expect(res.status).toBe(400)
    }
    expect(writes).toHaveLength(0)
    expect((await anlegen(json({ titel: 'x'.repeat(120) }))).status).toBe(201)
  })

  it('begrenzt den Untertitel und lehnt unbekannte Felder ab', async () => {
    expect((await anlegen(json({ titel: 'T', untertitel: 'u'.repeat(201) }))).status).toBe(400)
    expect((await anlegen(json({ titel: 'T', werkzeug: 'skript' }))).status).toBe(400)
    expect((await anlegen(json('kein Objekt'))).status).toBe(400)
    expect(writes).toHaveLength(0)
  })

  it('legt bei erreichter Speichergrenze nichts an', async () => {
    speicherGenutzt = SPEICHER_GRENZE_BYTES
    const res = await anlegen(json({ titel: 'T' }))
    expect(res.status).toBe(409)
    expect(writes).toHaveLength(0)
  })

  it('lehnt Nicht-Lehrkräfte ab (Azubi: 403)', async () => {
    vi.mocked(requireTeacherOrAdmin).mockResolvedValue({ error: NextResponse.json({ error: 'Kein Zugriff' }, { status: 403 }) } as never)
    expect((await anlegen(json({ titel: 'T' }))).status).toBe(403)
    expect(writes).toHaveLength(0)
  })
})

describe('Editor öffnen und zurücksetzen', () => {
  it('öffnet den Entwurf und meldet „nie veröffentlicht“', async () => {
    const res = await editorLaden(new Request('http://t'), ctx)
    expect(res.status).toBe(200)
    const d = await res.json()
    expect(d.nieVeroeffentlicht).toBe(true)
    expect(d.struktur.chapters[0].title).toBe('Thema 1')
    expect(d.stand).toBe(NEU.entwurf_am)
    expect(kernAufrufe).toHaveLength(0)
  })

  it('beginnt ohne Entwurf wieder beim Grundgerüst, statt zu scheitern', async () => {
    zeile = { ...NEU, entwurf: null, entwurf_am: null, hat_entwurf: false }
    const res = await editorLaden(new Request('http://t'), ctx)
    expect(res.status).toBe(200)
    const d = await res.json()
    expect(d.struktur.cover.title).toBe('Mein Thema')
    expect(d.stand).toBeNull()
  })

  it('meldet nach dem Veröffentlichen nichts mehr von „nie veröffentlicht“', async () => {
    zeile = { ...NEU, antwort: 'cover:\n  title: x', ergebnis: { titel: 'x', dateiname: 'x.html', format: 'seite', kapitel: 1, aufgaben: 0 } }
    const res = await editorLaden(new Request('http://t'), ctx)
    expect((await res.json()).nieVeroeffentlicht).toBeUndefined()
  })

  it('„Zurück auf das Grundgerüst“ ersetzt den Entwurf, behält Titel und Untertitel und löscht ihn nicht', async () => {
    zeile = { ...NEU, entwurf: { ...grundgeruest('Alt', 'Unter'), chapters: [{ title: 'Viel Arbeit', elements: [] }] } }
    const res = await editorVerwerfen(new Request('http://t', { method: 'DELETE' }), ctx)
    expect(res.status).toBe(200)
    const u = writes.find((w) => w.methode === 'update')!.payload as Record<string, unknown>
    expect(u.entwurf).toEqual(grundgeruest('Mein Thema', 'Unter'))
    expect(typeof u.entwurf_am).toBe('string')
    expect(u.entwurf).not.toBeNull()
  })

  it('Verwerfen nach dem ersten Veröffentlichen geht wie bei jedem Material auf die Fassung zurück', async () => {
    zeile = { ...NEU, antwort: 'cover:\n  title: x', ergebnis: { titel: 'x', dateiname: 'x.html', format: 'seite', kapitel: 1, aufgaben: 0 } }
    await editorVerwerfen(new Request('http://t', { method: 'DELETE' }), ctx)
    const u = writes.find((w) => w.methode === 'update')!.payload as Record<string, unknown>
    expect(u.entwurf).toBeNull()
  })
})

describe('Kern bekommt „arbeitsblatt“ statt „eigen“', () => {
  it('beim Bauen der Vorschau', async () => {
    const res = await vorschau(json({ stand: NEU.entwurf_am }), ctx)
    expect(res.status).toBeLessThan(500)
    const baut = kernAufrufe.filter((a) => a.pfad.startsWith('/api/editor/'))
    expect(baut.length).toBeGreaterThan(0)
    for (const a of baut) expect(a.body.werkzeug).toBe('arbeitsblatt')
  })
})

describe('Vor dem ersten Veröffentlichen: „Erst veröffentlichen“', () => {
  it('Download', async () => {
    const res = await download(new Request('http://t'), ctx)
    expect(res.status).toBe(409)
    expect((await res.json()).error).toBe('Erst veröffentlichen.')
  })

  it('öffentlicher Link: kein Aufruf der Datenbankfunktion', async () => {
    const res = await linkErzeugen(new Request('http://t', { method: 'POST' }), ctx)
    expect(res.status).toBe(409)
    expect(rpcs).not.toContain('link_erzeugen')
  })

  it('Regal: kein Teilen', async () => {
    const res = await freigeben(json({ stufe: 'alle' }, 'PUT'), ctx)
    expect(res.status).toBe(409)
    expect(rpcs).not.toContain('regal_freigabe_setzen')
  })

  it('nach dem Veröffentlichen geht der Link wieder', async () => {
    zeile = { ...NEU, antwort: 'cover:\n  title: x', ergebnis: { titel: 'x', dateiname: 'x.html', format: 'seite', kapitel: 1, aufgaben: 0 } }
    await linkErzeugen(new Request('http://t', { method: 'POST' }), ctx)
    expect(rpcs).toContain('link_erzeugen')
  })
})

describe('Schritt 4 gibt es bei eigenen Seiten nicht', () => {
  const leer = new Request('http://t', { method: 'POST', body: '{}', headers: { 'Content-Type': 'application/json' } })

  it.each([
    ['Neu bauen', () => bauen(json({ ersetzen: true }), ctx)],
    ['Einlesen', () => einlesen(leer.clone(), ctx)],
    ['Kapitel einsetzen', () => kapitelEinsetzen(json({ index: 0, antwort: 'x' }), ctx)],
  ])('%s liefert 409 mit Code', async (_n, aufruf) => {
    const res = await aufruf()
    expect(res.status).toBe(409)
    expect((await res.json()).code).toBe('eigene_seite')
  })

  it('auch nach dem Veröffentlichen (kein Entwurf mehr)', async () => {
    zeile = { ...NEU, hat_entwurf: false, entwurf: null, antwort: 'cover: {}', ergebnis: { titel: 'x', dateiname: 'x.html', format: 'seite', kapitel: 1, aufgaben: 0 } }
    const res = await bauen(json({ ersetzen: true }), ctx)
    expect(res.status).toBe(409)
    expect((await res.json()).code).toBe('eigene_seite')
  })

  it('Einstellungen ändern geht nicht, Umbenennen schon', async () => {
    const einstellung = await aendern(json({ schritt: 3 }, 'PATCH'), ctx)
    expect(einstellung.status).toBe(409)
    const umbenennen = await aendern(json({ titel: 'Neuer Name' }, 'PATCH'), ctx)
    expect(umbenennen.status).toBe(200)
  })
})
