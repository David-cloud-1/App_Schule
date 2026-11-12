// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { chainMock } from '@/test/supabase-chain-mock'

vi.mock('@/app/api/admin/_lib/auth', () => ({ requireTeacherOrAdmin: vi.fn() }))
vi.mock('@/lib/supabase-server', () => ({ createServiceClient: vi.fn() }))

import { requireTeacherOrAdmin } from '@/app/api/admin/_lib/auth'
import { createServiceClient } from '@/lib/supabase-server'
import { POST as alsSeite } from './ablaeufe/[id]/als-seite/route'
import { POST as bauen } from './ablaeufe/[id]/bauen/route'
import { POST as einlesen } from './ablaeufe/[id]/einlesen/route'
import { POST as kapitelEinsetzen } from './ablaeufe/[id]/kapitel/einsetzen/route'
import { POST as pruefen } from './ablaeufe/[id]/pruefen/route'
import { entwurfSperre, zeileZuAblauf, type AblaufZeile } from '@/lib/werkzeugkiste-server'
import { zeileZuMaterial, type ListenZeile } from '@/lib/werkzeugkiste-materialien-server'

const ID = '11111111-1111-4111-8111-111111111111'
const ctx = { params: Promise.resolve({ id: ID }) }
const STRUKTUR = { cover: { title: 'Haftung' }, chapters: [{ title: 'A', elements: [] }] }

const BASIS = {
  id: ID,
  owner_id: 'u1',
  werkzeug: 'skript',
  status: 'fertig',
  schritt: 5,
  datei_name: 'heft.docx',
  datei_groesse: 1000,
  kennzahlen: { seiten: 3, loesungen: 0, bilder: 1, tabellen: 0 },
  gliederung: [],
  auswahl: { seiten: '', abschnitte: [] },
  einstellungen: { format: 'h5p', niveau: 'mittel', bildungsgang: 'auto', lernfeld: '', umfang: '' },
  prompt: 'p',
  antwort: 'cover:\n  title: Haftung\nchapters: []',
  pruefung: { lesbar: true, fehler: null, befunde: [], korrekturen: 0, nachbesserungsPrompt: null },
  ergebnis: { titel: 'Haftung', dateiname: 'Haftung.h5p', format: 'h5p', kapitel: 1, aufgaben: 2, fertigAm: '2026-11-01T10:00:00Z' },
  titel: 'Haftung im Frachtrecht',
  skript_hochgeladen_am: '2026-10-01T10:00:00Z',
  skript_entfernt_am: null,
  herkunft_name: null,
  hat_entwurf: false,
  updated_at: '2026-11-03T10:00:00Z',
}

let zeile: Record<string, unknown>
let writes: { methode: string; payload: unknown }[]
let antworten: Record<string, { status: number; body: unknown }>
let kernAufrufe: { pfad: string; body: Record<string, unknown> }[]
let speicher: Record<string, ReturnType<typeof vi.fn>>

const json = (body: unknown) =>
  new Request('http://t', { method: 'POST', body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } })
const kernSagt = (pfad: string, body: unknown, status = 200) => (antworten[pfad] = { status, body })
const letzter = (pfad: string) => [...kernAufrufe].reverse().find((a) => a.pfad === pfad)!.body

beforeEach(() => {
  vi.clearAllMocks()
  zeile = { ...BASIS }
  writes = []
  antworten = {}
  kernAufrufe = []
  const db = chainMock((_t, calls) => {
    for (const m of ['insert', 'update', 'delete']) {
      const c = calls.find((x) => x.method === m)
      if (c) writes.push({ methode: m, payload: c.args[0] })
    }
    return { data: zeile, count: 0 }
  }, { rpc: vi.fn().mockResolvedValue({ data: 0, error: null }) })
  vi.mocked(requireTeacherOrAdmin).mockResolvedValue({ error: null, user: { id: 'u1' }, supabase: db.client, role: 'teacher' } as never)
  speicher = {
    createSignedUrl: vi.fn(async (pfad: string) => ({ data: { signedUrl: `https://speicher.test/lesen/${pfad}` } })),
    createSignedUploadUrl: vi.fn(async (pfad: string) => ({ data: { signedUrl: `https://speicher.test/schreiben/${pfad}` } })),
    list: vi.fn(async (_o: string, opt: { search: string }) => ({ data: opt.search === 'einlesung.zip' ? [{ name: 'einlesung.zip' }] : [], error: null })),
    copy: vi.fn().mockResolvedValue({ error: null }),
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

describe('H5P als Interaktive Seite kopieren', () => {
  beforeEach(() => {
    kernSagt('/api/editor/struktur', { struktur: STRUKTUR })
    kernSagt('/api/editor/bauen', { titel: 'Haftung', dateiname: 'Haftung.html', format: 'seite', kapitel: 1, aufgaben: 2, groesse: 100 })
  })

  it('legt eine neue Seite an, kopiert Einlesung und Skript und baut als Seite', async () => {
    const res = await alsSeite(json({}), ctx)
    expect(res.status).toBe(201)
    const { id } = await res.json()
    expect(id).not.toBe(ID)
    // Erst geprüft, ob der Kern die Antwort als Kapitel liest – mit Format „seite“
    expect(letzter('/api/editor/struktur')).toMatchObject({ antwort: BASIS.antwort, einstellungen: { format: 'seite' } })
    const neu = writes.find((w) => w.methode === 'insert')!.payload as Record<string, unknown>
    expect(neu).toMatchObject({
      id,
      owner_id: 'u1',
      status: 'fertig',
      titel: 'Haftung im Frachtrecht (Seite)',
      antwort: BASIS.antwort,
      einstellungen: { format: 'seite' },
      skript_hochgeladen_am: BASIS.skript_hochgeladen_am,
    })
    expect(speicher.copy).toHaveBeenCalledWith(`u1/${ID}/einlesung.zip`, `u1/${id}/einlesung.zip`)
    expect(speicher.copy).toHaveBeenCalledWith(`u1/${ID}/skript.docx`, `u1/${id}/skript.docx`)
    const bau = letzter('/api/editor/bauen')
    expect(bau).toMatchObject({ struktur: STRUKTUR, marken: false, hoechstens: 8_000_000 })
    expect(JSON.stringify(bau.datei_ziel)).toContain(`u1/${id}/ausgabe`)
    // Das Original wird nicht angefasst
    expect(JSON.stringify(kernAufrufe)).not.toContain(`${ID}/ausgabe`)
    expect(writes.filter((w) => w.methode === 'update').every((w) => !('antwort' in (w.payload as object)))).toBe(true)
  })

  it('räumt die halbe Kopie wieder ab, wenn der Bau scheitert', async () => {
    kernSagt('/api/editor/bauen', { error: 'Die Seite ist zu groß geworden (9.0 MB von 8 MB).' }, 413)
    const res = await alsSeite(json({}), ctx)
    expect(res.status).toBe(400)
    expect(writes.some((w) => w.methode === 'delete')).toBe(true)
  })

  it('legt nichts an, wenn der Kern die Antwort nicht als Kapitel lesen kann', async () => {
    kernSagt('/api/editor/struktur', { error: 'Die Antwort ist unvollständig: Es wurden keine Kapitel gefunden.' }, 400)
    const res = await alsSeite(json({}), ctx)
    expect(res.status).toBe(400)
    expect(writes).toHaveLength(0)
  })

  it('nur für H5P der Kapitel-Werkzeuge', async () => {
    for (const anders of [
      { ergebnis: { ...BASIS.ergebnis, format: 'seite' }, einstellungen: { ...BASIS.einstellungen, format: 'seite' } },
      { werkzeug: 'kahoot' },
      { status: 'laeuft' },
      { antwort: null },
    ]) {
      zeile = { ...BASIS, ...anders }
      expect((await alsSeite(json({}), ctx)).status).toBe(400)
    }
    expect(kernAufrufe).toHaveLength(0)
  })
})

describe('Schritt 4 ist gesperrt, solange ein Entwurf im Editor liegt', () => {
  beforeEach(() => {
    zeile = { ...BASIS, ergebnis: { ...BASIS.ergebnis, format: 'seite' }, hat_entwurf: true }
  })

  it('Neu bauen und Kapitel einsetzen antworten mit 409 und Code', async () => {
    for (const res of [await bauen(json({}), ctx), await kapitelEinsetzen(json({ index: 0, antwort: 'title: X' }), ctx)]) {
      expect(res.status).toBe(409)
      expect(await res.json()).toMatchObject({ code: 'entwurf_im_editor', error: 'Zu diesem Material gibt es einen Entwurf im Editor.' })
    }
    expect(kernAufrufe).toHaveLength(0)
  })

  it('eine andere Antwort einfügen geht nicht, dieselbe erneut prüfen schon', async () => {
    const anders = await pruefen(json({ antwort: 'cover:\n  title: Neu\nchapters: []' }), ctx)
    expect(anders.status).toBe(409)
    kernSagt('/api/pruefen', { lesbar: true, fehler: null, befunde: [], korrekturen: 0, nachbesserungsPrompt: null })
    const gleich = await pruefen(json({ antwort: BASIS.antwort }), ctx)
    expect(gleich.status).toBe(200)
  })

  it('Neu einlesen ist gesperrt – der Entwurf würde sonst zum alten Skript gehören (QA BUG-6)', async () => {
    const res = await einlesen(json({}), ctx)
    expect(res.status).toBe(409)
    expect(await res.json()).toMatchObject({ code: 'entwurf_im_editor' })
    expect(kernAufrufe).toHaveLength(0)
  })

  it('ohne Entwurf oder bei unfertigen Abläufen sperrt nichts', () => {
    expect(entwurfSperre({ status: 'fertig', hat_entwurf: false })).toBeNull()
    expect(entwurfSperre({ status: 'laeuft', hat_entwurf: true })).toBeNull()
    expect(entwurfSperre({ status: 'fertig', hat_entwurf: null })).toBeNull()
  })
})

describe('Listen und Ablauf kennen den Baukasten', () => {
  it('Material-Zeile: Weg in den Baukasten und offene Änderungen', () => {
    const z = (extra: Partial<ListenZeile>) =>
      zeileZuMaterial({
        id: ID,
        werkzeug: 'skript',
        status: 'fertig',
        schritt: 5,
        titel: 'T',
        datei_name: null,
        hat_antwort: true,
        skript_entfernt_am: null,
        created_at: '2026-11-01',
        updated_at: '2026-11-01',
        laeuft_ab_am: null,
        video_url: null,
        ergebnis_titel: 'T',
        ergebnis_format: 'seite',
        ergebnis_fertig_am: null,
        ergebnis_vorschau: null,
        ergebnis_text: null,
        ...extra,
      })
    expect(z({})).toMatchObject({ baukasten: 'bearbeiten' })
    expect(z({}).entwurfOffen).toBeUndefined()
    expect(z({ hat_entwurf: true })).toMatchObject({ entwurfOffen: true })
    expect(z({ ergebnis_format: 'h5p' })).toMatchObject({ baukasten: 'als-seite' })
    expect(z({ ergebnis_format: 'h5p', hat_antwort: false }).baukasten).toBeNull()
    expect(z({ werkzeug: 'kahoot', ergebnis_format: 'xlsx' }).baukasten).toBeNull()
    expect(z({ status: 'laeuft' }).baukasten).toBeNull()
  })

  it('Ablauf trägt den Entwurf für den Hinweis in Schritt 4', () => {
    expect(zeileZuAblauf({ ...BASIS, hat_entwurf: true } as unknown as AblaufZeile).entwurfImEditor).toBe(true)
    expect(zeileZuAblauf({ ...BASIS } as unknown as AblaufZeile).entwurfImEditor).toBeUndefined()
  })
})
