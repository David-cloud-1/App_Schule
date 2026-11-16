// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { chainMock } from '@/test/supabase-chain-mock'

vi.mock('@/app/api/admin/_lib/auth', () => ({ requireTeacherOrAdmin: vi.fn() }))
vi.mock('@/lib/supabase-server', () => ({ createServiceClient: vi.fn() }))

import { requireTeacherOrAdmin } from '@/app/api/admin/_lib/auth'
import { createServiceClient } from '@/lib/supabase-server'
import { POST as uebernehmen } from './ablaeufe/[id]/editor/bilder/uebernehmen/route'

const ZIEL = '11111111-1111-4111-8111-111111111111'
const QUELLE = '22222222-2222-4222-8222-222222222222'
const ctx = { params: Promise.resolve({ id: ZIEL }) }

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
let dateien: Map<string, Uint8Array>
let vorhanden: string[]
let speicher: Record<string, ReturnType<typeof vi.fn>>
let kernAntworten: Record<string, unknown>
let kernPfade: string[]

const anfrage = (body: unknown) =>
  new Request('http://t', { method: 'POST', body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } })
const gut = (extra: Record<string, unknown> = {}) => anfrage({ von: QUELLE, pfade: ['images/eigen_abcdef12.png'], seitenGroesse: 1000, ...extra })

beforeEach(() => {
  vi.clearAllMocks()
  zeilen = { [ZIEL]: { ...BASIS, id: ZIEL }, [QUELLE]: { ...BASIS, id: QUELLE } }
  dateien = new Map([
    [`u1/${QUELLE}/eigen_abcdef12.png`, PNG],
    [`u1/${QUELLE}/eigen_abcdef12.vorschau.jpg`, JPG],
  ])
  vorhanden = []
  kernAntworten = {}
  kernPfade = []
  const db = chainMock((_t, calls) => {
    if (calls.some((c) => c.method === 'update')) return { data: { id: ZIEL } }
    const eq = calls.find((c) => c.method === 'eq' && c.args[0] === 'id')
    return { data: eq ? (zeilen[String(eq.args[1])] ?? null) : null }
  })
  const rpc = vi.fn(async () => ({ data: 1000, error: null }))
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
    vi.fn(async (url: string) => {
      const pfad = new URL(url).pathname
      kernPfade.push(pfad)
      return pfad in kernAntworten ? new Response(JSON.stringify(kernAntworten[pfad])) : new Response('{"error":"ungeplant"}', { status: 500 })
    }),
  )
  vi.stubEnv('WERKZEUGKISTE_KERN_URL', 'https://kern.test')
  vi.stubEnv('WERKZEUGKISTE_KERN_SECRET', 'geheim')
})

describe('Bilder ins andere Material übernehmen (PROJ-102)', () => {
  it('kopiert ein eigenes Bild samt Vorschau in den Ordner des Ziels unter neuem Namen', async () => {
    const res = await uebernehmen(gut(), ctx)
    expect(res.status).toBe(200)
    const { zuordnung, fehlend } = await res.json()
    expect(fehlend).toEqual([])
    expect(zuordnung['images/eigen_abcdef12.png']).toMatch(/^images\/eigen_[0-9a-f]{16}\.png$/)
    const pfade = speicher.upload.mock.calls.map((c) => c[0] as string)
    expect(pfade).toHaveLength(2)
    expect(pfade.every((p) => p.startsWith(`u1/${ZIEL}/eigen_`))).toBe(true)
    expect(pfade.some((p) => p.endsWith('.vorschau.jpg'))).toBe(true)
  })

  it('im selben Material gibt es nichts zu kopieren', async () => {
    const res = await uebernehmen(gut({ von: ZIEL }), ctx)
    expect(await res.json()).toEqual({ zuordnung: {}, fehlend: [] })
    expect(speicher.upload).not.toHaveBeenCalled()
  })

  it('lehnt fremde Materialien ab – Quelle und Ziel müssen dem Konto gehören', async () => {
    zeilen[QUELLE] = { ...BASIS, id: QUELLE, owner_id: 'u2' }
    expect((await uebernehmen(gut(), ctx)).status).toBe(403)
    zeilen[QUELLE] = { ...BASIS, id: QUELLE }
    zeilen[ZIEL] = { ...BASIS, id: ZIEL, owner_id: 'u2' }
    expect((await uebernehmen(gut(), ctx)).status).toBe(403)
    expect(speicher.upload).not.toHaveBeenCalled()
    expect(speicher.download).not.toHaveBeenCalled()
  })

  it('ist das Quell-Material weg, kommen die Bilder als „fehlend“ zurück', async () => {
    zeilen[QUELLE] = null
    const res = await uebernehmen(gut(), ctx)
    expect(await res.json()).toEqual({ zuordnung: {}, fehlend: ['images/eigen_abcdef12.png'] })
  })

  it('meldet ein Bild als fehlend, wenn die Datei nicht mehr da ist', async () => {
    dateien.clear()
    const { zuordnung, fehlend } = await (await uebernehmen(gut(), ctx)).json()
    expect(zuordnung).toEqual({})
    expect(fehlend).toEqual(['images/eigen_abcdef12.png'])
  })

  it('schreibt nichts, wenn die Seite danach zu groß wäre', async () => {
    const res = await uebernehmen(gut({ seitenGroesse: 7_999_999 }), ctx)
    expect(res.status).toBe(413)
    expect((await res.json()).error).toContain('nichts eingefügt')
    expect(speicher.upload).not.toHaveBeenCalled()
  })

  it('schreibt nichts, wenn das Ziel schon 30 eigene Bilder hat', async () => {
    vorhanden = Array.from({ length: 30 }, (_, i) => `eigen_a${String(i).padStart(7, '0')}.png`)
    const res = await uebernehmen(gut(), ctx)
    expect(res.status).toBe(409)
    expect(speicher.upload).not.toHaveBeenCalled()
  })

  it('räumt auf, wenn das Ablegen mittendrin scheitert', async () => {
    speicher.upload.mockResolvedValueOnce({ error: null }).mockResolvedValueOnce({ error: { message: 'voll' } })
    const res = await uebernehmen(gut(), ctx)
    expect(res.status).toBe(502)
    expect((await res.json()).error).toContain('nichts eingefügt')
    expect(speicher.remove).toHaveBeenCalledTimes(1)
    expect((speicher.remove.mock.calls[0][0] as string[]).length).toBe(2)
  })

  it('Bilder aus dem Skript-Paket liest der Kern; er legt sie als eigenes Bild im Ziel ab', async () => {
    vorhanden = ['einlesung.zip']
    kernAntworten['/api/editor/bild'] = { bild: `data:image/png;base64,${Buffer.from(PNG).toString('base64')}` }
    kernAntworten['/api/editor/bild-ablegen'] = { vorschau: 'data:image/jpeg;base64,AAAA', breite: 1, hoehe: 1, bytes: 10 }
    const res = await uebernehmen(gut({ pfade: ['images/seite1_x.png'] }), ctx)
    const { zuordnung } = await res.json()
    expect(zuordnung['images/seite1_x.png']).toMatch(/^images\/eigen_[0-9a-f]{16}\.png$/)
    expect(kernPfade).toEqual(['/api/editor/bild', '/api/editor/bild-ablegen'])
  })

  it('verwirft unsinnige Eingaben: Pfade nach oben, fremde Felder, keine Pfade, kaputte Kennung', async () => {
    for (const body of [
      { von: QUELLE, pfade: ['images/../geheim.png'], seitenGroesse: 0 },
      { von: QUELLE, pfade: ['../x.png'], seitenGroesse: 0 },
      { von: QUELLE, pfade: [], seitenGroesse: 0 },
      { von: 'kein-uuid', pfade: ['images/a.png'], seitenGroesse: 0 },
      { von: QUELLE, pfade: ['images/a.png'], seitenGroesse: -1 },
      { von: QUELLE, pfade: ['images/a.png'], seitenGroesse: 0, extra: 1 },
    ]) {
      expect((await uebernehmen(anfrage(body), ctx)).status).toBe(400)
    }
    expect(speicher.download).not.toHaveBeenCalled()
  })
})
