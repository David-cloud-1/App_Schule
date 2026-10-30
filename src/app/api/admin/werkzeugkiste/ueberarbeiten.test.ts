import { beforeEach, describe, expect, it, vi } from 'vitest'
import { chainMock } from '@/test/supabase-chain-mock'

vi.mock('@/app/api/admin/_lib/auth', () => ({ requireTeacherOrAdmin: vi.fn() }))
vi.mock('@/lib/supabase-server', () => ({ createServiceClient: vi.fn() }))

import { requireTeacherOrAdmin } from '@/app/api/admin/_lib/auth'
import { createServiceClient } from '@/lib/supabase-server'
import { GET as kapitelListe, POST as kapitelPrompt } from './ablaeufe/[id]/kapitel/route'
import { POST as kapitelEinsetzen } from './ablaeufe/[id]/kapitel/einsetzen/route'
import { POST as bauen } from './ablaeufe/[id]/bauen/route'

const ID = '11111111-1111-4111-8111-111111111111'
const ctx = { params: Promise.resolve({ id: ID }) }
const STAND = '2026-10-30T10:00:00Z'

const BASIS = {
  id: ID,
  owner_id: 'u1',
  werkzeug: 'skript',
  status: 'laeuft',
  schritt: 4,
  datei_name: 'heft.pdf',
  datei_groesse: 1000,
  kennzahlen: { seiten: 3 },
  gliederung: [],
  auswahl: { seiten: '', abschnitte: [] },
  einstellungen: { format: 'h5p', niveau: 'mittel', bildungsgang: 'auto', lernfeld: '', umfang: '' },
  prompt: 'p',
  antwort: 'chapters:\n  - title: Eins',
  pruefung: { lesbar: true },
  ergebnis: null,
  updated_at: STAND,
}

let zeile: Record<string, unknown>
let kernFetch: ReturnType<typeof vi.fn>
let updates: Record<string, unknown>[]

const json = (body: unknown) =>
  new Request('http://t', { method: 'POST', body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } })
const kernAntwort = (body: unknown, status = 200) => kernFetch.mockResolvedValueOnce(new Response(JSON.stringify(body), { status }))

beforeEach(() => {
  vi.clearAllMocks()
  zeile = { ...BASIS }
  updates = []
  const db = chainMock(
    (_t, calls) => {
      const upd = calls.find((c) => c.method === 'update')
      if (upd) {
        updates.push(upd.args[0] as Record<string, unknown>)
        zeile = { ...zeile, ...(upd.args[0] as Record<string, unknown>) }
      }
      return { data: zeile, count: 0 }
    },
    { rpc: vi.fn().mockResolvedValue({ data: 0, error: null }) },
  )
  vi.mocked(requireTeacherOrAdmin).mockResolvedValue({
    error: null,
    user: { id: 'u1' },
    supabase: db.client,
    role: 'teacher',
  } as never)
  const speicher = {
    createSignedUrl: vi.fn().mockResolvedValue({ data: { signedUrl: 'https://speicher.test/lesen?token=t' } }),
    createSignedUploadUrl: vi.fn().mockResolvedValue({ data: { signedUrl: 'https://speicher.test/schreiben?token=t' } }),
    list: vi.fn().mockResolvedValue({ data: [] }),
    remove: vi.fn().mockResolvedValue({ data: [] }),
  }
  vi.mocked(createServiceClient).mockReturnValue({ ...db.client, storage: { from: () => speicher } } as never)
  kernFetch = vi.fn()
  vi.stubGlobal('fetch', kernFetch)
  vi.stubEnv('WERKZEUGKISTE_KERN_URL', 'https://kern.test')
  vi.stubEnv('WERKZEUGKISTE_KERN_SECRET', 'geheim')
})

describe('Überarbeiten (PROJ-52, Paket 2)', () => {
  it('listet die Kapitel der gespeicherten Antwort über den Kern', async () => {
    kernAntwort({ kapitel: ['Eins', 'Zwei'] })
    const res = await kapitelListe(new Request('http://t'), ctx)
    expect((await res.json()).kapitel).toEqual(['Eins', 'Zwei'])
    expect(JSON.parse(kernFetch.mock.calls[0][1].body).antwort).toBe(BASIS.antwort)
    expect(kernFetch.mock.calls[0][0]).toBe('https://kern.test/api/kapitel-liste')
  })

  it('liefert ohne Antwort eine leere Liste, ohne den Kern zu fragen', async () => {
    zeile = { ...BASIS, antwort: null }
    expect((await (await kapitelListe(new Request('http://t'), ctx)).json()).kapitel).toEqual([])
    expect(kernFetch).not.toHaveBeenCalled()
  })

  it('baut den Prompt für ein Kapitel im Kern, mit Werkzeug und Einstellungen', async () => {
    kernAntwort({ prompt: 'Du überarbeitest EIN Kapitel …', titel: 'Eins' })
    const res = await kapitelPrompt(json({ index: 0, wunsch: '  Mehr Beispiele  ' }), ctx)
    expect(await res.json()).toEqual({ prompt: 'Du überarbeitest EIN Kapitel …', titel: 'Eins' })
    const body = JSON.parse(kernFetch.mock.calls[0][1].body)
    expect(body).toMatchObject({ index: 0, wunsch: 'Mehr Beispiele', werkzeug: 'skript', einstellungen: { format: 'h5p' } })
  })

  it('prüft Eingaben vor dem Kern: Wunsch, Kapitelnummer, fehlende Antwort', async () => {
    expect((await kapitelPrompt(json({ index: 0, wunsch: '   ' }), ctx)).status).toBe(400)
    expect((await kapitelPrompt(json({ index: -1, wunsch: 'x' }), ctx)).status).toBe(400)
    expect((await kapitelPrompt(json({ index: 0, wunsch: 'x'.repeat(4001) }), ctx)).status).toBe(400)
    zeile = { ...BASIS, antwort: null }
    expect((await kapitelPrompt(json({ index: 0, wunsch: 'x' }), ctx)).status).toBe(400)
    expect(kernFetch).not.toHaveBeenCalled()
  })

  it('meldet Kern-Fehler mit verständlichem Satz', async () => {
    kernAntwort({ error: 'Dieses Kapitel lässt sich in der Antwort nicht finden.', hint: '' }, 400)
    const res = await kapitelPrompt(json({ index: 9, wunsch: 'x' }), ctx)
    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe('Dieses Kapitel lässt sich in der Antwort nicht finden.')
  })

  it('setzt ein Kapitel ein: neue Antwort gespeichert, Prüfung geleert, fertige Datei unberührt', async () => {
    zeile = { ...BASIS, status: 'fertig', schritt: 5, ergebnis: { titel: 'T', dateiname: 'T.h5p', format: 'h5p', kapitel: 1, aufgaben: 1 } }
    kernAntwort({ antwort: 'chapters:\n  - title: Eins neu' })
    const res = await kapitelEinsetzen(json({ index: 0, antwort: 'title: Eins neu' }), ctx)
    expect(res.status).toBe(200)
    const a = (await res.json()).ablauf
    expect(a.antwort).toBe('chapters:\n  - title: Eins neu')
    expect(a.pruefung).toBeNull()
    expect(a.status).toBe('fertig')
    expect(updates[0]).not.toHaveProperty('ergebnis')
    expect(updates[0]).not.toHaveProperty('status')
    expect(JSON.parse(kernFetch.mock.calls[0][1].body)).toMatchObject({ index: 0, kapitel_antwort: 'title: Eins neu' })
  })

  it('weist eine leere Kapitel-Antwort ab, ohne zu speichern', async () => {
    expect((await kapitelEinsetzen(json({ index: 0, antwort: '' }), ctx)).status).toBe(400)
    expect(updates).toHaveLength(0)
  })

  describe('Zwei-Tabs-Regel beim Neubauen', () => {
    const fertig = { ...BASIS, status: 'fertig', schritt: 5, ergebnis: { titel: 'T', dateiname: 'T.h5p', format: 'h5p', kapitel: 1, aufgaben: 1 } }
    const gebaut = { titel: 'Neu', dateiname: 'Neu.h5p', format: 'h5p', kapitel: 1, aufgaben: 2, warnungen: 0 }

    it('fragt nach (409), wenn das Material inzwischen geändert wurde', async () => {
      zeile = { ...fertig, updated_at: '2026-10-30T11:00:00Z' }
      const res = await bauen(json({ stand: STAND }), ctx)
      expect(res.status).toBe(409)
      expect((await res.json()).hint).toBe('Trotzdem ersetzen?')
      expect(kernFetch).not.toHaveBeenCalled()
    })

    it('baut bei gleichem Stand oder nach Bestätigung', async () => {
      zeile = { ...fertig }
      kernAntwort(gebaut)
      expect((await bauen(json({ stand: STAND }), ctx)).status).toBe(200)
      zeile = { ...fertig, updated_at: '2026-10-30T11:00:00Z' }
      kernAntwort(gebaut)
      expect((await bauen(json({ stand: STAND, ersetzen: true }), ctx)).status).toBe(200)
    })

    it('fragt bei einem ersten Bauen (Entwurf) nie nach', async () => {
      zeile = { ...BASIS, updated_at: '2026-10-30T11:00:00Z' }
      kernAntwort(gebaut)
      expect((await bauen(json({ stand: STAND }), ctx)).status).toBe(200)
    })

    it('lehnt unbekannte Felder ab', async () => {
      expect((await bauen(json({ stand: STAND, x: 1 }), ctx)).status).toBe(400)
    })
  })
})
