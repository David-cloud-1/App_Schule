// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { chainMock, type ChainCall } from '@/test/supabase-chain-mock'

vi.mock('@/app/api/admin/_lib/auth', () => ({ requireTeacherOrAdmin: vi.fn() }))
vi.mock('@/lib/supabase-server', () => ({ createServiceClient: vi.fn() }))

import { requireTeacherOrAdmin } from '@/app/api/admin/_lib/auth'
import { createServiceClient } from '@/lib/supabase-server'
import { DELETE as verwerfen, GET as laden, PUT as speichern } from './ablaeufe/[id]/editor/route'
import { POST as vorschau } from './ablaeufe/[id]/editor/vorschau/route'
import { POST as rohfassung } from './ablaeufe/[id]/editor/rohfassung/route'
import { POST as veroeffentlichen } from './ablaeufe/[id]/editor/veroeffentlichen/route'

const ID = '11111111-1111-4111-8111-111111111111'
const ctx = { params: Promise.resolve({ id: ID }) }

const STRUKTUR = {
  cover: { title: 'Haftung' },
  chapters: [{ title: 'Grundlagen', elements: [{ type: 'text', content: '<p>Hallo</p>' }] }],
}
const GEAENDERT = { ...STRUKTUR, chapters: [{ title: 'Neu', elements: [] }] }

const BASIS = {
  id: ID,
  owner_id: 'u1',
  werkzeug: 'skript',
  status: 'fertig',
  schritt: 5,
  datei_name: 'heft.docx',
  datei_groesse: 1000,
  kennzahlen: null,
  gliederung: [],
  auswahl: { seiten: '', abschnitte: [] },
  einstellungen: { format: 'seite', niveau: 'mittel', bildungsgang: 'auto', lernfeld: '', umfang: '' },
  prompt: null,
  antwort: 'cover:\n  title: Haftung\nchapters: []',
  pruefung: { lesbar: true, fehler: null, befunde: [], korrekturen: 0, nachbesserungsPrompt: null },
  ergebnis: { titel: 'Haftung', dateiname: 'Haftung.html', format: 'seite', kapitel: 1, aufgaben: 3, fertigAm: '2026-11-01T10:00:00Z' },
  titel: 'Mein Material',
  updated_at: '2026-11-03T10:00:00Z',
  entwurf: null as unknown,
  entwurf_am: null as string | null,
  entwurf_pruefung: null as unknown,
}

let zeile: Record<string, unknown>
let updates: { payload: Record<string, unknown>; calls: ChainCall[] }[]
let konflikt: boolean
let link: boolean
let vorhanden: Set<string>
let speicher: Record<string, ReturnType<typeof vi.fn>>
let antworten: Record<string, { status: number; body: unknown }>
let kernAufrufe: { pfad: string; body: Record<string, unknown> }[]

const json = (body: unknown, method = 'POST') =>
  new Request('http://t', { method, body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } })

function kernSagt(pfad: string, body: unknown, status = 200) {
  antworten[pfad] = { status, body }
}
const kernPfade = () => kernAufrufe.map((a) => a.pfad)
/** So schreibt PostgREST einen timestamptz: `2026-11-12T09:00:00.123+00:00` */
const alsDbZeit = (iso: string) => new Date(iso).toISOString().replace('Z', '+00:00')
const letzter = (pfad: string) => [...kernAufrufe].reverse().find((a) => a.pfad === pfad)!.body

beforeEach(() => {
  vi.clearAllMocks()
  zeile = { ...BASIS }
  updates = []
  konflikt = false
  link = false
  vorhanden = new Set(['einlesung.zip'])
  antworten = {}
  kernAufrufe = []
  const db = chainMock((tabelle, calls) => {
    if (tabelle === 'werkzeug_links') return { data: link ? { id: 'l1' } : null }
    if (tabelle === 'regal_freigaben') return { data: null }
    const upd = calls.find((c) => c.method === 'update')
    if (upd) {
      if (konflikt) return { data: null }
      updates.push({ payload: upd.args[0] as Record<string, unknown>, calls })
      // Wie die echte Datenbank: Zeitpunkte kommen als `…+00:00` zurück, nicht als `…Z`
      const payload = { ...(upd.args[0] as Record<string, unknown>) }
      if (typeof payload.entwurf_am === 'string') payload.entwurf_am = alsDbZeit(payload.entwurf_am)
      zeile = { ...zeile, ...payload }
      return { data: { id: ID, entwurf_am: zeile.entwurf_am ?? null } }
    }
    return { data: zeile }
  })
  vi.mocked(requireTeacherOrAdmin).mockResolvedValue({ error: null, user: { id: 'u1' }, supabase: db.client, role: 'teacher' } as never)
  speicher = {
    createSignedUrl: vi.fn(async (pfad: string) => ({ data: { signedUrl: `https://speicher.test/lesen/${pfad}` } })),
    createSignedUploadUrl: vi.fn(async (pfad: string) => ({ data: { signedUrl: `https://speicher.test/schreiben/${pfad}` } })),
    list: vi.fn(async (_ordner: string, opt: { search: string }) => ({
      data: [...vorhanden].filter((n) => n === opt.search).map((name) => ({ name })),
      error: null,
    })),
    remove: vi.fn().mockResolvedValue({ data: [] }),
    upload: vi.fn().mockResolvedValue({ error: null }),
    download: vi.fn().mockResolvedValue({ data: null, error: { message: 'fehlt' } }),
  }
  vi.mocked(createServiceClient).mockReturnValue({ ...db.client, storage: { from: () => speicher } } as never)
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init: { body: string }) => {
      const pfad = new URL(url).pathname
      kernAufrufe.push({ pfad, body: JSON.parse(init.body) })
      const a = antworten[pfad]
      if (!a) return new Response(JSON.stringify({ error: `ungeplant: ${pfad}` }), { status: 500 })
      return new Response(JSON.stringify(a.body), { status: a.status })
    }),
  )
  vi.stubEnv('WERKZEUGKISTE_KERN_URL', 'https://kern.test')
  vi.stubEnv('WERKZEUGKISTE_KERN_SECRET', 'geheim')
})

describe('Editor öffnen', () => {
  it('übersetzt ohne Entwurf die veröffentlichte Antwort über den Kern', async () => {
    kernSagt('/api/editor/struktur', { struktur: STRUKTUR })
    const res = await laden(new Request('http://t'), ctx)
    expect(res.status).toBe(200)
    const d = await res.json()
    expect(d).toMatchObject({ id: ID, titel: 'Mein Material', werkzeug: 'skript', struktur: STRUKTUR, stand: null, befunde: null })
    expect(letzter('/api/editor/struktur')).toMatchObject({ antwort: BASIS.antwort, werkzeug: 'skript' })
  })

  it('öffnet einen vorhandenen Entwurf ohne Kern, mit Stand und Befunden', async () => {
    zeile = { ...BASIS, entwurf: GEAENDERT, entwurf_am: '2026-11-12T09:00:00Z', entwurf_pruefung: { befunde: [{ text: 'x', schwere: 'hoch', stellen: [] }] } }
    link = true
    const d = await (await laden(new Request('http://t'), ctx)).json()
    expect(d.struktur).toEqual(GEAENDERT)
    expect(d.stand).toBe('2026-11-12T09:00:00Z')
    expect(d.befunde).toHaveLength(1)
    expect(d.oeffentlich).toBe(true)
    expect(kernPfade()).toEqual([])
  })

  it('lehnt H5P-Materialien, andere Werkzeuge, unfertige und fremde Materialien ab', async () => {
    for (const anders of [
      { einstellungen: { ...BASIS.einstellungen, format: 'h5p' }, ergebnis: { ...BASIS.ergebnis, format: 'h5p' } },
      { werkzeug: 'kahoot' },
      { status: 'laeuft' },
    ]) {
      zeile = { ...BASIS, ...anders }
      const res = await laden(new Request('http://t'), ctx)
      expect(res.status).toBe(400)
      expect((await res.json()).error).toContain('nicht bearbeiten')
    }
    zeile = null as never
    expect((await laden(new Request('http://t'), ctx)).status).toBe(404)
  })

  it('reicht Fehler des Kerns als Satz weiter', async () => {
    kernSagt('/api/editor/struktur', { error: 'Die Antwort der KI hat nicht die verlangte Form.' }, 400)
    const res = await laden(new Request('http://t'), ctx)
    expect(res.status).toBe(400)
    expect((await res.json()).error).toContain('verlangte Form')
  })
})

describe('Entwurf speichern', () => {
  it('legt den ersten Entwurf an (Stand null) und gibt den neuen Stand zurück', async () => {
    const res = await speichern(json({ struktur: GEAENDERT, stand: null }, 'PUT'), ctx)
    expect(res.status).toBe(200)
    const { stand } = await res.json()
    expect(typeof stand).toBe('string')
    expect(updates[0].payload).toMatchObject({ entwurf: GEAENDERT })
    // Zurück kommt der Stand, wie ihn die Datenbank schreibt
    expect(stand).toBe(zeile.entwurf_am)
    expect(Date.parse(stand)).toBe(Date.parse(updates[0].payload.entwurf_am as string))
    // Bedingung: es gab noch keinen Entwurf
    expect(updates[0].calls.some((c) => c.method === 'is' && c.args[0] === 'entwurf_am' && c.args[1] === null)).toBe(true)
    // Nichts Veröffentlichtes wird angefasst
    expect(updates[0].payload).not.toHaveProperty('antwort')
    expect(updates[0].payload).not.toHaveProperty('ergebnis')
  })

  it('schreibt nur mit dem zuletzt gesehenen Stand (Zwei-Tabs-Regel)', async () => {
    zeile = { ...BASIS, entwurf: STRUKTUR, entwurf_am: '2026-11-12T09:00:00Z' }
    expect((await speichern(json({ struktur: GEAENDERT, stand: null }, 'PUT'), ctx)).status).toBe(409)
    expect((await speichern(json({ struktur: GEAENDERT, stand: '2026-11-12T08:00:00Z' }, 'PUT'), ctx)).status).toBe(409)
    expect(updates).toHaveLength(0)
    const ok = await speichern(json({ struktur: GEAENDERT, stand: '2026-11-12T09:00:00Z' }, 'PUT'), ctx)
    expect(ok.status).toBe(200)
    expect(updates[0].calls.some((c) => c.method === 'eq' && c.args[0] === 'entwurf_am' && c.args[1] === '2026-11-12T09:00:00Z')).toBe(true)
  })

  it('speichert mehrmals hintereinander ohne Neuladen (QA BUG-1: Z gegen +00:00)', async () => {
    let stand: string | null = null
    for (let i = 0; i < 3; i++) {
      const res = await speichern(json({ struktur: { ...GEAENDERT, cover: { title: `v${i}` } }, stand }, 'PUT'), ctx)
      expect(res.status).toBe(200)
      stand = (await res.json()).stand
    }
    expect(updates).toHaveLength(3)
    // Auch ein Browser, der den Stand als …Z kennt, gilt als aktuell
    const z = new Date(stand!).toISOString()
    expect(z.endsWith('Z')).toBe(true)
    expect((await speichern(json({ struktur: GEAENDERT, stand: z }, 'PUT'), ctx)).status).toBe(200)
  })

  it('meldet 409, wenn ein anderes Fenster zwischen Lesen und Schreiben gespeichert hat', async () => {
    konflikt = true
    const res = await speichern(json({ struktur: GEAENDERT, stand: null }, 'PUT'), ctx)
    expect(res.status).toBe(409)
    expect((await res.json()).error).toContain('anderen Fenster')
  })

  it('lehnt kaputte Strukturen ab', async () => {
    for (const kaputt of [{}, { cover: {}, chapters: 'x' }, { cover: {}, chapters: [{ elements: [{ kein: 'typ' }] }] }]) {
      expect((await speichern(json({ struktur: kaputt, stand: null }, 'PUT'), ctx)).status).toBe(400)
    }
    const riesig = { cover: {}, chapters: [{ title: 'x', elements: [{ type: 'text', content: 'x'.repeat(2_500_000) }] }] }
    expect((await speichern(json({ struktur: riesig, stand: null }, 'PUT'), ctx)).status).toBe(400)
    expect(updates).toHaveLength(0)
  })
})

describe('Entwurf verwerfen', () => {
  it('leert Entwurf, Prüfung und Vorschau-Datei', async () => {
    zeile = { ...BASIS, entwurf: GEAENDERT, entwurf_am: '2026-11-12T09:00:00Z' }
    const res = await verwerfen(new Request('http://t', { method: 'DELETE' }), ctx)
    expect(res.status).toBe(200)
    expect(updates[0].payload).toMatchObject({ entwurf: null, entwurf_am: null, entwurf_pruefung: null })
    expect(speicher.remove).toHaveBeenCalledWith([`u1/${ID}/entwurf.html`])
  })
})

describe('Vorschau', () => {
  beforeEach(() => {
    kernSagt('/api/editor/bauen', { groesse: 12345, warnungen: 0 })
    kernSagt('/api/editor/pruefen', { befunde: [{ text: 'Kapitel 1 – Keine richtige Antwort', schwere: 'hoch', stellen: [{ kapitel: 0, element: 2 }, { abschluss: true }, { kaputt: 1 }] }] })
  })

  it('baut den Entwurf mit Sprungmarken nach entwurf.html – nie nach ausgabe', async () => {
    zeile = { ...BASIS, entwurf: GEAENDERT, entwurf_am: '2026-11-12T09:00:00Z' }
    const res = await vorschau(json({}), ctx)
    expect(res.status).toBe(200)
    const d = await res.json()
    expect(d.adresse).toBe(`https://speicher.test/lesen/u1/${ID}/entwurf.html`)
    expect(d.groesse).toBe(12345)
    expect(d.befunde[0].stellen).toEqual([{ kapitel: 0, element: 2 }, { abschluss: true }])
    const bau = letzter('/api/editor/bauen')
    expect(bau).toMatchObject({ struktur: GEAENDERT, marken: true, werkzeug: 'skript' })
    expect(JSON.stringify(bau.datei_ziel)).toContain('entwurf.html')
    expect(JSON.stringify(kernAufrufe)).not.toContain('/ausgabe')
    expect((bau.einlesung as { url: string }).url).toContain('einlesung.zip')
    // Befunde hängen am Entwurf, solange er nicht weitergespeichert wurde
    expect(updates[0].payload).toEqual({ entwurf_pruefung: { befunde: d.befunde } })
    expect(updates[1].payload).toHaveProperty('speicher_bytes')
    expect(updates[0].calls.some((c) => c.method === 'eq' && c.args[0] === 'entwurf_am')).toBe(true)
  })

  it('meldet fehlende Bilder als Hinweis am Block (QA BUG-5)', async () => {
    zeile = { ...BASIS, entwurf: GEAENDERT, entwurf_am: '2026-11-12T09:00:00Z' }
    kernSagt('/api/editor/bauen', {
      groesse: 1,
      fehlende_bilder: [{ kapitel: 1, element: 3, pfad: 'images/lager.png' }, { kaputt: true }],
    })
    const d = await (await vorschau(json({}), ctx)).json()
    expect(d.befunde[0]).toEqual({ text: 'Bild fehlt: lager.png', schwere: 'mittel', stellen: [{ kapitel: 1, element: 3 }] })
    expect(d.befunde).toHaveLength(2)
  })

  it('ohne Entwurf: baut die veröffentlichte Fassung und speichert nichts', async () => {
    kernSagt('/api/editor/struktur', { struktur: STRUKTUR })
    const res = await vorschau(json({}), ctx)
    expect(res.status).toBe(200)
    expect(letzter('/api/editor/bauen').struktur).toEqual(STRUKTUR)
    // Nur die Speichergröße wird nachgezählt – kein Entwurf, keine Befunde
    expect(updates.map((u) => Object.keys(u.payload))).toEqual([['speicher_bytes']])
  })

  it('nimmt ohne Skript den Bilder-Auszug, ohne beides gar keine Bilder', async () => {
    zeile = { ...BASIS, entwurf: GEAENDERT, entwurf_am: 'x' }
    vorhanden = new Set(['auszug.zip'])
    await vorschau(json({}), ctx)
    expect((letzter('/api/editor/bauen').einlesung as { url: string }).url).toContain('auszug.zip')
    vorhanden = new Set()
    await vorschau(json({}), ctx)
    expect(letzter('/api/editor/bauen')).not.toHaveProperty('einlesung')
  })
})

describe('Rohfassung', () => {
  it('übersetzt in beide Richtungen über den Kern', async () => {
    kernSagt('/api/editor/block-yaml', { text: 'type: text\n' })
    kernSagt('/api/editor/block-lesen', { block: { type: 'text' } })
    let res = await rohfassung(json({ richtung: 'schreiben', block: { type: 'text' } }), ctx)
    expect(await res.json()).toEqual({ text: 'type: text\n' })
    res = await rohfassung(json({ richtung: 'lesen', text: 'type: text' }), ctx)
    expect(await res.json()).toEqual({ block: { type: 'text' } })
  })

  it('zeigt den Satz des Kerns bei unlesbarer Rohfassung', async () => {
    kernSagt('/api/editor/block-lesen', { error: 'Diese Rohfassung ist nicht lesbar (Zeile 2).', hint: 'Bitte die Einrückung prüfen.' }, 400)
    const res = await rohfassung(json({ richtung: 'lesen', text: 'type: [' }), ctx)
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: 'Diese Rohfassung ist nicht lesbar (Zeile 2).', hint: 'Bitte die Einrückung prüfen.' })
  })
})

describe('Veröffentlichen', () => {
  const STAND = '2026-11-12T09:00:00Z'
  beforeEach(() => {
    zeile = { ...BASIS, entwurf: GEAENDERT, entwurf_am: STAND }
    kernSagt('/api/editor/bauen', { titel: 'Neu', dateiname: 'Neu.html', format: 'seite', kapitel: 1, aufgaben: 0, groesse: 100 })
    kernSagt('/api/editor/yaml', { antwort: 'cover:\n  title: Neu\n' })
    kernSagt('/api/editor/pruefen', { befunde: [] })
  })

  const NEU = `u1/${ID}/ausgabe-neu`
  const NEU_VORSCHAU = `u1/${ID}/vorschau-neu.html`
  /** Die Zwischendateien liegen nach dem Bau im Speicher */
  const zwischendateienDa = () =>
    speicher.download.mockImplementation(async (pfad: string) =>
      pfad === NEU || pfad === NEU_VORSCHAU ? { data: new Blob([`<html>${pfad}</html>`]), error: null } : { data: null, error: { message: 'fehlt' } },
    )
  const hochgeladen = () => speicher.upload.mock.calls.map((c) => c[0] as string)

  it('baut in Zwischendateien, speichert und ersetzt erst dann die veröffentlichte Datei', async () => {
    zwischendateienDa()
    const res = await veroeffentlichen(json({ stand: STAND }), ctx)
    expect(res.status).toBe(200)
    const bau = letzter('/api/editor/bauen')
    expect(bau).toMatchObject({ struktur: GEAENDERT, marken: false, hoechstens: 8_000_000 })
    expect(JSON.stringify(bau.datei_ziel)).toContain(NEU)
    expect(JSON.stringify(bau.vorschau_ziel)).toContain(NEU_VORSCHAU)
    // Erst die Schritte ohne Nebenwirkung, zuletzt der Bau
    expect(kernPfade().at(-1)).toBe('/api/editor/bauen')
    expect(kernPfade().slice(0, 2).sort()).toEqual(['/api/editor/pruefen', '/api/editor/yaml'])
    const p = updates[0].payload
    expect(p).toMatchObject({ antwort: 'cover:\n  title: Neu\n', entwurf: null, entwurf_am: null, entwurf_pruefung: null })
    expect(p.ergebnis).toMatchObject({ titel: 'Neu', dateiname: 'Neu.html', format: 'seite', kapitel: 1, aufgaben: 0, fertigAm: '2026-11-01T10:00:00Z' })
    expect(p.pruefung).toMatchObject({ lesbar: true, befunde: [] })
    expect(updates[0].calls.some((c) => c.method === 'eq' && c.args[0] === 'entwurf_am' && c.args[1] === STAND)).toBe(true)
    // Jetzt erst ersetzt: veröffentlichte Datei und Lehrer-Vorschau
    expect(hochgeladen()).toEqual([`u1/${ID}/ausgabe`, `u1/${ID}/vorschau.html`])
    expect(speicher.upload.mock.calls[0][2]).toMatchObject({ upsert: true, contentType: 'text/html' })
    const entfernt = speicher.remove.mock.calls.flatMap((c) => c[0] as string[])
    expect(entfernt).toEqual(expect.arrayContaining([NEU, NEU_VORSCHAU, `u1/${ID}/entwurf.html`]))
  })

  it('nimmt den Stand als …Z genauso an wie als …+00:00 (QA BUG-1)', async () => {
    zwischendateienDa()
    zeile = { ...zeile, entwurf_am: '2026-11-12T09:00:00.123+00:00' }
    expect((await veroeffentlichen(json({ stand: '2026-11-12T09:00:00.123Z' }), ctx)).status).toBe(200)
  })

  it('ändert nichts, wenn der Bau scheitert (z. B. zu groß)', async () => {
    kernSagt('/api/editor/bauen', { error: 'Die Seite ist zu groß geworden (9.1 MB von 8 MB).', hint: 'Entferne Bilder oder teile das Material auf.' }, 413)
    const res = await veroeffentlichen(json({ stand: STAND }), ctx)
    expect(res.status).toBe(400)
    expect((await res.json()).error).toContain('zu groß')
    expect(updates).toHaveLength(0)
    expect(speicher.upload).not.toHaveBeenCalled()
  })

  it('ändert nichts, wenn der Kern nach dem Bau scheitern würde (QA BUG-2)', async () => {
    kernSagt('/api/editor/yaml', { error: 'kaputt' }, 500)
    const res = await veroeffentlichen(json({ stand: STAND }), ctx)
    expect(res.ok).toBe(false)
    // Gar nicht erst gebaut, nichts gespeichert, nichts ersetzt
    expect(kernPfade()).not.toContain('/api/editor/bauen')
    expect(updates).toHaveLength(0)
    expect(speicher.upload).not.toHaveBeenCalled()
  })

  it('braucht einen Entwurf und den aktuellen Stand', async () => {
    expect((await veroeffentlichen(json({ stand: 'alt' }), ctx)).status).toBe(409)
    expect((await veroeffentlichen(json({ stand: '2026-11-12T08:00:00Z' }), ctx)).status).toBe(409)
    zeile = { ...BASIS }
    expect((await veroeffentlichen(json({ stand: null }), ctx)).status).toBe(400)
    expect(kernPfade()).toEqual([])
  })

  it('behält den Entwurf eines anderen Fensters – und die veröffentlichte Datei bleibt unberührt (QA BUG-2)', async () => {
    zwischendateienDa()
    konflikt = true
    const res = await veroeffentlichen(json({ stand: STAND }), ctx)
    expect(res.status).toBe(409)
    expect(speicher.upload).not.toHaveBeenCalled()
    const entfernt = speicher.remove.mock.calls.flatMap((c) => c[0] as string[])
    expect(entfernt).toEqual([NEU, NEU_VORSCHAU])
  })

  it('nimmt das Speichern zurück, wenn das Ersetzen der Datei scheitert (QA BUG-2)', async () => {
    zwischendateienDa()
    speicher.upload.mockResolvedValueOnce({ error: { message: 'Speicher voll' } })
    const res = await veroeffentlichen(json({ stand: STAND }), ctx)
    expect(res.status).toBe(502)
    expect((await res.json()).error).toContain('bisherige Fassung')
    expect(updates).toHaveLength(2)
    expect(updates[1].payload).toMatchObject({ antwort: BASIS.antwort, entwurf: GEAENDERT, ergebnis: BASIS.ergebnis })
    expect(Date.parse(updates[1].payload.entwurf_am as string)).toBe(Date.parse(STAND))
  })
})

describe('Zugriff', () => {
  it('Azubis und Abgemeldete kommen nicht durch', async () => {
    const verboten = new Response(JSON.stringify({ error: 'Kein Zugriff' }), { status: 403 })
    vi.mocked(requireTeacherOrAdmin).mockResolvedValue({ error: verboten } as never)
    expect((await laden(new Request('http://t'), ctx)).status).toBe(403)
    expect((await vorschau(json({}), ctx)).status).toBe(403)
    expect(kernPfade()).toEqual([])
  })
})
