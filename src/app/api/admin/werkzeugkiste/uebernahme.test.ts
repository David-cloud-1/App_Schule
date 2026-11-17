// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { chainMock } from '@/test/supabase-chain-mock'

vi.mock('@/app/api/admin/_lib/auth', () => ({ requireTeacherOrAdmin: vi.fn() }))
vi.mock('@/lib/supabase-server', () => ({ createServiceClient: vi.fn() }))

import { requireTeacherOrAdmin } from '@/app/api/admin/_lib/auth'
import { createServiceClient } from '@/lib/supabase-server'
import { GET as gliederung } from './ablaeufe/[id]/editor/uebernahme/gliederung/route'
import { POST as vorschau } from './ablaeufe/[id]/editor/uebernahme/vorschau/route'
import { POST as uebernehmen } from './ablaeufe/[id]/editor/uebernahme/route'

const ZIEL = '11111111-1111-4111-8111-111111111111'
const EIGEN = '22222222-2222-4222-8222-222222222222'
const FREMD = '33333333-3333-4333-8333-333333333333'
const FREIGABE = '44444444-4444-4444-8444-444444444444'
const ctx = { params: Promise.resolve({ id: ZIEL }) }

const STRUKTUR = {
  cover: { title: 'Heft' },
  chapters: [
    { title: 'A', elements: [{ type: 'text', content: 'Hallo' }, { type: 'image', path: 'images/eigen_abcdef12.png' }, { type: 'unbekannt' }] },
    { title: 'B', elements: [{ type: 'true_false', statement: 'Wahr?' }] },
  ],
  final_chapter: { question_set: { questions: [{ type: 'multiple_choice', question: 'F' }] } },
}
const BASIS = {
  owner_id: 'u1',
  werkzeug: 'skript',
  status: 'fertig',
  schritt: 5,
  datei_name: 'heft.docx',
  datei_groesse: 1000,
  kennzahlen: null,
  gliederung: [],
  auswahl: { seiten: '', abschnitte: [] },
  einstellungen: { format: 'seite' },
  prompt: null,
  antwort: 'x',
  pruefung: null,
  ergebnis: { titel: 'T', format: 'seite' },
  titel: 'M',
  updated_at: '2026-11-03T10:00:00Z',
  entwurf: null,
  entwurf_am: null,
  entwurf_pruefung: null,
}
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3])
const JPG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3])

let zeilen: Record<string, Record<string, unknown> | null>
let regal: Record<string, Record<string, unknown>>
let dateien: Map<string, Uint8Array>
let vorhanden: string[]
let speicher: Record<string, ReturnType<typeof vi.fn>>
let kernAntworten: Record<string, unknown>
let kernAufrufe: { pfad: string; body: Record<string, unknown> }[]
let rpcAufrufe: string[]

const post = (body: unknown) => new Request('http://t', { method: 'POST', body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } })
const leer = { themen: [], bloecke: [], fragen: [] }
const gut = (extra: Record<string, unknown> = {}) =>
  post({ quelle: { art: 'eigen', id: EIGEN }, auswahl: { ...leer, themen: [1] }, seitenGroesse: 1000, ...extra })
const urlMit = (art: string, id: string) => new Request(`http://t/gliederung?art=${art}&id=${id}`)

beforeEach(() => {
  vi.clearAllMocks()
  zeilen = {
    [ZIEL]: { ...BASIS, id: ZIEL },
    [EIGEN]: { ...BASIS, id: EIGEN, entwurf: STRUKTUR, entwurf_am: '2026-11-03T10:00:00Z' },
    [FREMD]: { ...BASIS, id: FREMD, owner_id: 'u2', entwurf: STRUKTUR, entwurf_am: '2026-11-03T10:00:00Z' },
  }
  regal = {
    [FREIGABE]: {
      ablauf_id: FREMD,
      owner_id: 'u2',
      titel: 'Spedition Grundlagen',
      werkzeug: 'skript',
      antwort: 'yaml-des-regals',
      einstellungen: { format: 'seite' },
      pruefung: null,
      ergebnis: { format: 'seite' },
      besitzer_name: 'Frau Müller',
      von_mir: false,
      auszug_am: '2026-11-01T00:00:00Z',
    },
  }
  dateien = new Map([
    [`u2/${FREMD}/eigen_abcdef12.png`, PNG],
    [`u2/${FREMD}/eigen_abcdef12.vorschau.jpg`, JPG],
    [`u1/${EIGEN}/eigen_abcdef12.png`, PNG],
    [`u1/${EIGEN}/eigen_abcdef12.vorschau.jpg`, JPG],
  ])
  vorhanden = ['einlesung.zip', 'auszug.zip']
  kernAntworten = {
    '/api/editor/struktur': { struktur: STRUKTUR },
    '/api/editor/bauen': { groesse: 1234 },
  }
  kernAufrufe = []
  rpcAufrufe = []
  const db = chainMock((_t, calls) => {
    if (calls.some((c) => c.method === 'update')) return { data: { id: ZIEL } }
    const eq = calls.find((c) => c.method === 'eq' && c.args[0] === 'id')
    return { data: eq ? (zeilen[String(eq.args[1])] ?? null) : null }
  })
  // Die Sicht „Regal“ entscheidet die Datenbank: unbekannte Freigaben liefern keine Zeile
  const rpc = vi.fn(async (name: string, args?: { p_freigabe_id?: string }) => {
    rpcAufrufe.push(name)
    if (name === 'regal_anpassen_quelle') {
      const z = args?.p_freigabe_id ? regal[args.p_freigabe_id] : undefined
      return { data: z ? [z] : [], error: null }
    }
    return { data: 1000, error: null }
  })
  vi.mocked(requireTeacherOrAdmin).mockResolvedValue({ error: null, user: { id: 'u1' }, supabase: { ...db.client, rpc }, role: 'teacher' } as never)
  speicher = {
    list: vi.fn(async (_o: string, opt: { search?: string }) => ({
      data: vorhanden.filter((n) => opt?.search === undefined || n === opt.search).map((name) => ({ name, created_at: '2026-01-01T00:00:00Z' })),
      error: null,
    })),
    download: vi.fn(async (pfad: string) => {
      const b = dateien.get(pfad)
      return b ? { data: new Blob([b as BlobPart]), error: null } : { data: null, error: { message: 'fehlt' } }
    }),
    upload: vi.fn().mockResolvedValue({ error: null }),
    remove: vi.fn().mockResolvedValue({ data: [] }),
    createSignedUrl: vi.fn(async (p: string) => ({ data: { signedUrl: `https://speicher.test/lesen/${p}` } })),
    createSignedUploadUrl: vi.fn(async (p: string) => ({ data: { signedUrl: `https://speicher.test/schreiben/${p}` } })),
  }
  vi.mocked(createServiceClient).mockReturnValue({ ...db.client, storage: { from: () => speicher } } as never)
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init?: { body?: string }) => {
      const pfad = new URL(url).pathname
      kernAufrufe.push({ pfad, body: init?.body ? JSON.parse(init.body) : {} })
      return pfad in kernAntworten ? new Response(JSON.stringify(kernAntworten[pfad])) : new Response('{"error":"ungeplant"}', { status: 500 })
    }),
  )
  vi.stubEnv('WERKZEUGKISTE_KERN_URL', 'https://kern.test')
  vi.stubEnv('WERKZEUGKISTE_KERN_SECRET', 'geheim')
})

describe('Gliederung der Quelle (PROJ-108)', () => {
  it('zeigt Themen, Blöcke und Fragen eines eigenen Materials', async () => {
    const res = await gliederung(urlMit('eigen', EIGEN), ctx)
    expect(res.status).toBe(200)
    const g = await res.json()
    expect(g.themen.map((t: { titel: string }) => t.titel)).toEqual(['A', 'B'])
    expect(g.themen[0].bloecke[2].passt).toBe(false)
    expect(g.fragen).toHaveLength(1)
    expect(g.herkunft).toBeUndefined()
  })

  it('zeigt Regal-Material mit Herkunft und liest die veröffentlichte Fassung über den Kern', async () => {
    const res = await gliederung(urlMit('regal', FREIGABE), ctx)
    expect(res.status).toBe(200)
    expect((await res.json()).herkunft).toBe('Spedition Grundlagen, Frau Müller')
    expect(kernAufrufe.find((a) => a.pfad === '/api/editor/struktur')?.body.antwort).toBe('yaml-des-regals')
  })

  it('ein fremdes, nicht geteiltes Material gibt es nicht: 404 (eigen und Regal)', async () => {
    expect((await gliederung(urlMit('eigen', FREMD), ctx)).status).toBe(404)
    expect((await gliederung(urlMit('regal', '55555555-5555-4555-8555-555555555555'), ctx)).status).toBe(404)
    expect(kernAufrufe).toHaveLength(0)
  })

  it('Regal-Material ohne Format Interaktive Seite ist keine Quelle', async () => {
    regal[FREIGABE].ergebnis = { format: 'h5p' }
    regal[FREIGABE].einstellungen = { format: 'h5p' }
    expect((await gliederung(urlMit('regal', FREIGABE), ctx)).status).toBe(400)
  })

  it('das Ziel muss ein eigenes Material sein', async () => {
    zeilen[ZIEL] = { ...BASIS, id: ZIEL, owner_id: 'u2' }
    expect((await gliederung(urlMit('eigen', EIGEN), ctx)).status).toBe(403)
  })

  it('lehnt ungültige Angaben ab', async () => {
    expect((await gliederung(urlMit('alles', EIGEN), ctx)).status).toBe(400)
    expect((await gliederung(urlMit('eigen', 'kein-uuid'), ctx)).status).toBe(400)
  })
})

describe('Übernehmen (PROJ-108)', () => {
  it('gibt ein ganzes Thema ohne Bilder zurück, nichts wird geschrieben', async () => {
    const res = await uebernehmen(gut(), ctx)
    expect(res.status).toBe(200)
    const r = await res.json()
    expect(r.themen).toHaveLength(1)
    expect(r.themen[0].title).toBe('B')
    expect(r.bloecke).toEqual([])
    expect(speicher.upload).not.toHaveBeenCalled()
  })

  it('lässt Typen aus, die das Material nicht kennt, und meldet die Zahl', async () => {
    const r = await (await uebernehmen(gut({ auswahl: { ...leer, themen: [0] } }), ctx)).json()
    expect(r.ausgelassen).toBe(1)
    expect(r.themen[0].elements.map((b: { type: string }) => b.type)).toEqual(['text', 'image'])
  })

  it('übernimmt Fragen der Lernzielkontrolle als einzelne Aufgaben', async () => {
    const r = await (await uebernehmen(gut({ auswahl: { ...leer, fragen: [0] } }), ctx)).json()
    expect(r.bloecke).toEqual([{ type: 'multiple_choice', question: 'F' }])
  })

  it('kopiert Bilder aus eigenem Material in den Ordner des Ziels und setzt neue Namen ein', async () => {
    const r = await (await uebernehmen(gut({ auswahl: { ...leer, bloecke: [{ thema: 0, block: 1 }] } }), ctx)).json()
    expect(r.bloecke[0].path).toMatch(/^images\/eigen_[0-9a-f]{16}\.png$/)
    expect(r.fehlend).toBe(0)
    const pfade = speicher.upload.mock.calls.map((c) => c[0] as string)
    expect(pfade.length).toBe(2)
    expect(pfade.every((p) => p.startsWith(`u1/${ZIEL}/eigen_`))).toBe(true)
  })

  it('Regal-Material: Bilder nur aus dem Bilder-Auszug, nie aus dem Skript des Urhebers', async () => {
    kernAntworten['/api/editor/bild'] = { bild: `data:image/png;base64,${Buffer.from(PNG).toString('base64')}` }
    kernAntworten['/api/editor/bild-ablegen'] = { vorschau: `data:image/jpeg;base64,${Buffer.from(JPG).toString('base64')}`, bytes: 100 }
    dateien.clear()
    const struktur = { ...STRUKTUR, chapters: [{ title: 'A', elements: [{ type: 'image', path: 'images/skript_bild.png' }] }] }
    kernAntworten['/api/editor/struktur'] = { struktur }
    const res = await uebernehmen(
      gut({ quelle: { art: 'regal', id: FREIGABE }, auswahl: { ...leer, bloecke: [{ thema: 0, block: 0 }] } }),
      ctx,
    )
    expect(res.status).toBe(200)
    const bild = kernAufrufe.find((a) => a.pfad === '/api/editor/bild')
    expect(String((bild?.body.einlesung as { url: string }).url)).toContain('auszug.zip')
    expect(kernAufrufe.some((a) => JSON.stringify(a.body).includes('einlesung.zip'))).toBe(false)
  })

  it('zu wenig Platz: nichts wird geschrieben und die Antwort sagt es', async () => {
    const res = await uebernehmen(gut({ auswahl: { ...leer, bloecke: [{ thema: 0, block: 1 }] }, seitenGroesse: 7_999_999 }), ctx)
    expect(res.status).toBe(413)
    expect(speicher.upload).not.toHaveBeenCalled()
  })

  it('ein fehlendes Bild kommt als „fehlend“ zurück, der Block bleibt', async () => {
    dateien.delete(`u1/${EIGEN}/eigen_abcdef12.png`)
    const r = await (await uebernehmen(gut({ auswahl: { ...leer, bloecke: [{ thema: 0, block: 1 }] } }), ctx)).json()
    expect(r.fehlend).toBe(1)
    // Neuer Name, den es im Ziel nicht gibt (nie der alte, der dort auf ein anderes Bild zeigen könnte)
    expect(r.bloecke[0].path).toMatch(/^images\/eigen_[0-9a-f]{16}\.png$/)
    expect(r.bloecke[0].path).not.toBe('images/eigen_abcdef12.png')
  })

  it('nichts gewählt oder nichts passend: 400 mit Satz', async () => {
    expect((await uebernehmen(gut({ auswahl: leer }), ctx)).status).toBe(400)
    const res = await uebernehmen(gut({ auswahl: { ...leer, bloecke: [{ thema: 0, block: 2 }] } }), ctx)
    expect(res.status).toBe(400)
    expect((await res.json()).error).toContain('passt')
  })

  it('nimmt nie Inhalte oder Bildnamen vom Browser an (nur Verweise)', async () => {
    const res = await uebernehmen(gut({ bloecke: [{ type: 'text', content: 'eingeschleust' }], pfade: ['images/fremd.png'] }), ctx)
    expect(res.status).toBe(400)
    expect(speicher.download).not.toHaveBeenCalled()
  })

  it('lehnt zu große oder ungültige Nummern ab', async () => {
    expect((await uebernehmen(gut({ auswahl: { ...leer, themen: [-1] } }), ctx)).status).toBe(400)
    expect((await uebernehmen(gut({ auswahl: { ...leer, themen: Array.from({ length: 41 }, (_, i) => i) } }), ctx)).status).toBe(400)
    expect((await uebernehmen(gut({ seitenGroesse: -1 }), ctx)).status).toBe(400)
  })

  it('fremdes Material (nicht geteilt) und fremdes Ziel werden abgelehnt', async () => {
    expect((await uebernehmen(gut({ quelle: { art: 'eigen', id: FREMD } }), ctx)).status).toBe(404)
    expect((await uebernehmen(gut({ quelle: { art: 'regal', id: '55555555-5555-4555-8555-555555555555' } }), ctx)).status).toBe(404)
    zeilen[ZIEL] = { ...BASIS, id: ZIEL, owner_id: 'u2' }
    expect((await uebernehmen(gut(), ctx)).status).toBe(403)
    expect(speicher.upload).not.toHaveBeenCalled()
  })

  it('aus dem Regal kommt nie der Entwurf des Urhebers', async () => {
    zeilen[FREMD] = { ...BASIS, id: FREMD, owner_id: 'u2', entwurf: { cover: {}, chapters: [{ title: 'GEHEIM', elements: [{ type: 'text', content: 'x' }] }] } }
    const r = await (await uebernehmen(gut({ quelle: { art: 'regal', id: FREIGABE }, auswahl: { ...leer, themen: [1] } }), ctx)).json()
    expect(JSON.stringify(r)).not.toContain('GEHEIM')
    expect(r.herkunft).toBe('Spedition Grundlagen, Frau Müller')
  })
})

describe('Vorschau der Auswahl (PROJ-108)', () => {
  it('baut eine Mini-Seite aus dem Gewählten und gibt nur eine Leseadresse zurück', async () => {
    const res = await vorschau(post({ quelle: { art: 'eigen', id: EIGEN }, auswahl: { ...leer, themen: [1] } }), ctx)
    expect(res.status).toBe(200)
    const r = await res.json()
    expect(r.adresse).toMatch(new RegExp(`u1/${ZIEL}/uebernahme-vorschau-[0-9a-f]{12}\\.html`))
    const bau = kernAufrufe.find((a) => a.pfad === '/api/editor/bauen')!
    const mini = bau.body.struktur as { chapters: { title: string }[] }
    expect(mini.chapters.map((t) => t.title)).toEqual(['B'])
    expect(bau.body.marken).toBeUndefined()
  })

  it('Regal-Vorschau liest Bilder nur aus dem Auszug', async () => {
    await vorschau(post({ quelle: { art: 'regal', id: FREIGABE }, auswahl: { ...leer, themen: [0] } }), ctx)
    const bau = kernAufrufe.find((a) => a.pfad === '/api/editor/bauen')!
    expect(String((bau.body.einlesung as { url: string }).url)).toContain('auszug.zip')
  })

  it('ohne Auswahl und für fremde Quellen gibt es keine Vorschau', async () => {
    expect((await vorschau(post({ quelle: { art: 'eigen', id: EIGEN }, auswahl: leer }), ctx)).status).toBe(400)
    expect((await vorschau(post({ quelle: { art: 'eigen', id: FREMD }, auswahl: { ...leer, themen: [0] } }), ctx)).status).toBe(404)
    expect(kernAufrufe.some((a) => a.pfad === '/api/editor/bauen')).toBe(false)
  })
})
