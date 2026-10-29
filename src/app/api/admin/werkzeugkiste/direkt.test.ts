import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextResponse } from 'next/server'
import { chainMock, eqValue, type ChainCall } from '@/test/supabase-chain-mock'

const ki = vi.hoisted(() => ({ stream: vi.fn() }))

vi.mock('@/app/api/admin/_lib/auth', () => ({ requireTeacherOrAdmin: vi.fn(), requireAdmin: vi.fn() }))
vi.mock('@/lib/supabase-server', () => ({ createServiceClient: vi.fn() }))
vi.mock('next/server', async (orig) => ({ ...(await orig<typeof import('next/server')>()), after: vi.fn() }))
vi.mock('@anthropic-ai/sdk', () => {
  class APIError extends Error {}
  class Anthropic {
    static APIError = APIError
    messages = { stream: ki.stream }
  }
  return { default: Anthropic }
})

import Anthropic from '@anthropic-ai/sdk'
import { after } from 'next/server'
import { requireAdmin, requireTeacherOrAdmin } from '@/app/api/admin/_lib/auth'
import { createServiceClient } from '@/lib/supabase-server'
import { DELETE as abbrechen, GET as status, POST as starten } from './ablaeufe/[id]/direkt/route'
import { POST as teilArbeiter } from '../../intern/werkzeugkiste/teil/route'
import { GET as kiTest } from './ki-test/route'
import { anfrageFuer, bearbeiteTeil, gekuerztHinweis, istAblehnung, guthabenGesperrt, MAX_ANTWORT_BAUSTEINE, promptBloecke } from '@/lib/werkzeugkiste-direkt'

const ID = '11111111-1111-4111-8111-111111111111'
const LAUF = '22222222-2222-4222-8222-222222222222'
const TEIL = '33333333-3333-4333-8333-333333333333'
const ctx = { params: Promise.resolve({ id: ID }) }

const ZEILE = {
  id: ID,
  owner_id: 'u1',
  werkzeug: 'skript',
  status: 'laeuft',
  schritt: 2,
  datei_name: 'heft.pdf',
  datei_groesse: 1000,
  kennzahlen: { seiten: 3, loesungen: 1, bilder: 0, tabellen: 0 },
  gliederung: [],
  auswahl: { seiten: '', abschnitte: [] },
  einstellungen: { format: 'h5p', niveau: 'mittel', bildungsgang: 'auto', lernfeld: '', umfang: '' },
  prompt: null,
  antwort: null,
  pruefung: null,
  ergebnis: null,
  weg: null,
  updated_at: '2026-10-28T08:00:00Z',
}
const EINSTELLUNGEN = {
  modell: 'claude-sonnet-5-5',
  preise: { 'claude-sonnet-5-5': { ein: 2, aus: 10, cache_schreiben: 2.5, cache_lesen: 0.1 } },
  usd_eur: 0.9,
  guthaben_leer_seit: null as string | null,
  letzte_probe_am: null as string | null,
}
const LAUF_ZEILE = {
  id: LAUF,
  owner_id: 'u1',
  ablauf_id: ID,
  werkzeug: 'skript',
  status: 'laeuft',
  fehler: null,
  fehler_art: null,
  teile_gesamt: 1,
  teile_fertig: 0,
  abschluss_versuche: 0,
  abschluss_gestartet_am: null,
  kosten_eur: 0,
  gestartet_am: '2026-10-28T08:00:00Z',
  beendet_am: null,
}

let einstellungen: typeof EINSTELLUNGEN
let laeufe: Record<string, unknown>[]
let teil: Record<string, unknown>
let heuteZahl: number
let db: ReturnType<typeof chainMock>
let fetchMock: ReturnType<typeof vi.fn>
let speicher: Record<string, ReturnType<typeof vi.fn>>

const methode = (calls: ChainCall[], m: string) => calls.find((c) => c.method === m)?.args[0] as Record<string, unknown>

function resolver(table: string, calls: ChainCall[]) {
  const methods = calls.map((c) => c.method)
  if (table === 'werkzeug_ablaeufe') {
    if (methods.includes('update')) return { data: { ...ZEILE, ...methode(calls, 'update') } }
    return { data: ZEILE }
  }
  if (table === 'ki_einstellungen') {
    if (methods.includes('update')) Object.assign(einstellungen, methode(calls, 'update'))
    return { data: einstellungen }
  }
  if (table === 'ki_laeufe') {
    if (methods.includes('insert')) {
      const neu = { ...LAUF_ZEILE, ...methode(calls, 'insert') }
      laeufe.push(neu)
      return { data: neu }
    }
    if (methods.includes('update')) {
      const l = laeufe[0]
      if (l) Object.assign(l, methode(calls, 'update'))
      return { data: l ?? null }
    }
    if (calls.some((c) => c.method === 'select' && (c.args[1] as { head?: boolean })?.head)) return { count: heuteZahl }
    return { data: laeufe[0] ?? null }
  }
  if (table === 'ki_lauf_teile') {
    if (methods.includes('insert')) return { data: [{ id: TEIL }] }
    if (methods.includes('update')) {
      const upd = methode(calls, 'update')
      // Übernahme nur, wenn sich der Stand nicht geändert hat (wie die Datenbank)
      if (eqValue(calls, 'versuche') !== undefined && eqValue(calls, 'versuche') !== teil.versuche) return { data: null }
      Object.assign(teil, upd)
      if (upd.status === 'fertig' && laeufe[0]) Object.assign(laeufe[0], { teile_fertig: 1 })
      return { data: teil }
    }
    return { data: methods.includes('maybeSingle') ? teil : [teil] }
  }
  return { data: null }
}

function anmelden() {
  db = chainMock(resolver, { storage: { from: () => speicher } })
  vi.mocked(createServiceClient).mockReturnValue(db.client as never)
  vi.mocked(requireTeacherOrAdmin).mockResolvedValue({ error: null, user: { id: 'u1' }, supabase: db.client, role: 'teacher' } as never)
}

const json = (body: unknown) =>
  new Request('https://app.test/x', { method: 'POST', body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } })
const START = { werkzeug: 'skript', einstellungen: ZEILE.einstellungen }

/** Kern-Antworten nach Pfad, Arbeiter-Anstöße quittiert mit 202 */
function kern(antworten: Record<string, unknown>) {
  fetchMock.mockImplementation(async (url: string) => {
    if (url.includes('/api/intern/')) return new Response('{}', { status: 202 })
    const pfad = Object.keys(antworten).find((p) => url.endsWith(p))
    return new Response(JSON.stringify(pfad ? antworten[pfad] : {}), { status: 200 })
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  einstellungen = { ...EINSTELLUNGEN }
  laeufe = []
  heuteZahl = 0
  teil = {
    id: TEIL, lauf_id: LAUF, nr: 1, auswahl: ZEILE.auswahl, zeichen: 5000, status: 'wartet', phase: 'erstellen',
    versuche: 0, gestartet_am: null, ein_tokens: 0, aus_tokens: 0, cache_schreiben_tokens: 0, cache_lesen_tokens: 0,
    ki_aufrufe: 0, kosten_usd: 0,
  }
  speicher = {
    createSignedUrl: vi.fn().mockResolvedValue({ data: { signedUrl: 'https://speicher.test/lesen' } }),
    createSignedUploadUrl: vi.fn().mockResolvedValue({ data: { signedUrl: 'https://speicher.test/schreiben' } }),
    upload: vi.fn().mockResolvedValue({ error: null }),
    download: vi.fn().mockResolvedValue({ data: new Blob(['cover: {}']) }),
  }
  fetchMock = vi.fn()
  vi.stubGlobal('fetch', fetchMock)
  vi.stubEnv('WERKZEUGKISTE_KERN_URL', 'https://kern.test')
  vi.stubEnv('WERKZEUGKISTE_KERN_SECRET', 'geheim')
  vi.stubEnv('CRON_SECRET', 'intern-geheim')
  vi.stubEnv('ANTHROPIC_API_KEY', 'sk-test')
  vi.stubEnv('WERKZEUGKISTE_DIREKT', '1')
  anmelden()
})

describe('Direkt erstellen – Start, Sperren, Abbruch (PROJ-64)', () => {
  it('lehnt Aufrufe ohne Lehrer-Rolle ab', async () => {
    vi.mocked(requireTeacherOrAdmin).mockResolvedValue({
      error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
      user: null,
      supabase: null,
    } as never)
    expect((await starten(json(START), ctx)).status).toBe(403)
    expect((await status(new Request('https://app.test/x'), ctx)).status).toBe(403)
  })

  it('startet ohne Freischaltung keinen bezahlten Lauf (Funktion vorerst ausgeblendet)', async () => {
    vi.stubEnv('WERKZEUGKISTE_DIREKT', '')
    const res = await starten(json(START), ctx)
    expect(res.status).toBe(404)
    expect((await res.json()).error).toContain('kostenlosen Weg')
    expect(db.writes.some((w) => w.table === 'ki_laeufe')).toBe(false)
    expect(ki.stream).not.toHaveBeenCalled()
  })

  it('startet einen Lauf mit den Teilen des Kerns und stößt je Teil einen Arbeiter an', async () => {
    kern({ '/api/teilen': { teile: [{ auswahl: { seiten: '', abschnitte: [] }, zeichen: 5000 }] } })
    const res = await starten(json(START), ctx)
    expect(res.status).toBe(202)
    expect((await res.json()).lauf).toMatchObject({ id: LAUF, status: 'laeuft', teileGesamt: 1 })
    const insert = db.writes.find((w) => w.table === 'ki_laeufe' && w.method === 'insert')!.payload as Record<string, unknown>
    expect(insert).toMatchObject({ owner_id: 'u1', ablauf_id: ID, modell: 'claude-sonnet-5-5', usd_eur: 0.9, zeichen: 5000 })
    const anstoss = fetchMock.mock.calls.find(([url]) => String(url).endsWith('/api/intern/werkzeugkiste/teil'))!
    expect(anstoss[0]).toBe('https://app.test/api/intern/werkzeugkiste/teil')
    expect(anstoss[1].headers['x-werkzeugkiste-intern']).toBe('intern-geheim')
    expect(JSON.parse(anstoss[1].body)).toEqual({ id: TEIL })
  })

  it('startet bei Doppelklick nichts Zweites', async () => {
    laeufe.push({ ...LAUF_ZEILE })
    const res = await starten(json(START), ctx)
    expect(res.status).toBe(200)
    expect(db.writes.some((w) => w.table === 'ki_laeufe' && w.method === 'insert')).toBe(false)
  })

  it('sperrt bei leerem Guthaben mit dem Satz für den kostenlosen Weg, erlaubt aber stündlich eine Probe', async () => {
    einstellungen.guthaben_leer_seit = new Date().toISOString()
    einstellungen.letzte_probe_am = new Date().toISOString()
    const res = await starten(json(START), ctx)
    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body.sperre).toBe('guthaben')
    expect(body.error).toContain('kostenlos mit deiner eigenen KI')

    expect(guthabenGesperrt({ guthabenLeerSeit: 'x', letzteProbeAm: new Date(Date.now() - 2 * 3600_000).toISOString() })).toBe(false)
    expect(guthabenGesperrt({ guthabenLeerSeit: null, letzteProbeAm: null })).toBe(false)
  })

  it('begrenzt auf 20 direkte Läufe in 24 Stunden', async () => {
    heuteZahl = 20
    const res = await starten(json(START), ctx)
    expect(res.status).toBe(429)
    expect((await res.json()).sperre).toBe('tageslimit')
  })

  it('fragt ab 2 € nach und startet erst mit Bestätigung', async () => {
    const teure = { teile: Array.from({ length: 30 }, () => ({ auswahl: { seiten: '1', abschnitte: [] }, zeichen: 22_000 })) }
    kern({ '/api/teilen': teure })
    const res = await starten(json(START), ctx)
    expect(res.status).toBe(409)
    expect((await res.json()).schaetzungEur).toBeGreaterThan(2)
    kern({ '/api/teilen': teure })
    expect((await starten(json({ ...START, bestaetigt: true }), ctx)).status).toBe(202)
  })

  it('weist ungültige Einstellungen ab', async () => {
    expect((await starten(json({ werkzeug: 'podcast', einstellungen: ZEILE.einstellungen }), ctx)).status).toBe(400)
    expect((await starten(json({ ...START, preis: 0 }), ctx)).status).toBe(400)
  })

  it('bricht einen laufenden Lauf ab', async () => {
    laeufe.push({ ...LAUF_ZEILE })
    const res = await abbrechen(new Request('https://app.test/x', { method: 'DELETE' }), ctx)
    expect(res.status).toBe(200)
    expect((await res.json()).lauf.status).toBe('abgebrochen')
  })

  it('liefert Stand, Sperre und Teile für die Schätzung', async () => {
    kern({ '/api/teilen': { teile: [{ auswahl: {}, zeichen: 1234 }] } })
    const res = await status(new Request('https://app.test/x?schaetzung=1'), ctx)
    const body = await res.json()
    expect(body).toMatchObject({ lauf: null, sperre: null, teile: [1234], usdEur: 0.9 })
    expect(body.preis.aus).toBe(10)
  })
})

describe('Interne Arbeiter (PROJ-64)', () => {
  it('nehmen nur Aufträge mit dem Geheimnis an und quittieren sofort', async () => {
    const ohne = new Request('https://app.test/x', { method: 'POST', body: JSON.stringify({ id: TEIL }) })
    expect((await teilArbeiter(ohne)).status).toBe(401)
    const mit = new Request('https://app.test/x', {
      method: 'POST',
      body: JSON.stringify({ id: TEIL }),
      headers: { 'x-werkzeugkiste-intern': 'intern-geheim' },
    })
    expect((await teilArbeiter(mit)).status).toBe(202)
    expect(after).toHaveBeenCalledTimes(1)
  })

  it('teilen den Prompt in zwischengespeicherte Anweisungen und den Skripttext', () => {
    const [anweisung, text] = promptBloecke('REGELN …\nLEHRTEXT:\nSkript')
    expect(anweisung).toEqual({ type: 'text', text: 'REGELN …', cache_control: { type: 'ephemeral' } })
    expect(text).toEqual({ type: 'text', text: 'LEHRTEXT:\nSkript' })
    expect(promptBloecke('ohne Marker')).toEqual([{ type: 'text', text: 'ohne Marker' }])
  })

  it('verbucht den genauen Verbrauch, speichert die Antwort und meldet den Teil fertig', async () => {
    laeufe.push({ ...LAUF_ZEILE })
    kern({
      '/api/prompt': { prompt: 'REGELN\nLEHRTEXT:\nSkript' },
      '/api/pruefen': { lesbar: true, fehler: null, befunde: [], nachbesserungsPrompt: null },
    })
    ki.stream.mockReturnValue({
      finalMessage: async () => ({
        content: [{ type: 'text', text: 'cover: {}\nchapters: []' }],
        stop_reason: 'end_turn',
        usage: { input_tokens: 1000, output_tokens: 5000, cache_creation_input_tokens: 11_000, cache_read_input_tokens: 0 },
      }),
      abort: vi.fn(),
    })
    await bearbeiteTeil(db.client, 'https://app.test', TEIL)
    expect(teil).toMatchObject({ status: 'fertig', ein_tokens: 1000, aus_tokens: 5000, cache_schreiben_tokens: 11_000, ki_aufrufe: 1 })
    // 1000×2 + 5000×10 + 11000×2,5 = 79.500 je Million → 0,0795 $
    expect(Number(teil.kosten_usd)).toBeCloseTo(0.0795, 6)
    expect(speicher.upload).toHaveBeenCalledWith('u1/' + ID + '/teil-1.yaml', expect.any(Blob), expect.anything())
    // letzter Teil fertig → Abschluss angestoßen
    expect(fetchMock.mock.calls.some(([url]) => String(url).endsWith('/api/intern/werkzeugkiste/abschluss'))).toBe(true)
  })

  it('sperrt bei leerem Guthaben und beendet den Lauf mit dem Satz für den kostenlosen Weg', async () => {
    laeufe.push({ ...LAUF_ZEILE })
    kern({ '/api/prompt': { prompt: 'REGELN\nLEHRTEXT:\nSkript' } })
    const fehler = new (Anthropic as unknown as { APIError: new (m: string) => Error }).APIError('Your credit balance is too low')
    ki.stream.mockReturnValue({ finalMessage: async () => Promise.reject(fehler), abort: vi.fn(), currentMessage: undefined })
    await bearbeiteTeil(db.client, 'https://app.test', TEIL)
    expect(einstellungen.guthaben_leer_seit).toBeTruthy()
    expect(laeufe[0]).toMatchObject({ status: 'fehlgeschlagen', fehler_art: 'guthaben' })
    expect(teil.status).toBe('fehlgeschlagen')
  })

  it('übernimmt einen Teil nicht doppelt', async () => {
    laeufe.push({ ...LAUF_ZEILE })
    teil.status = 'laeuft'
    teil.gestartet_am = new Date().toISOString()
    await bearbeiteTeil(db.client, 'https://app.test', TEIL)
    expect(ki.stream).not.toHaveBeenCalled()
  })

  it('schaltet das Nachdenken mit dem Wert „between_tools“ aus („disabled“ lehnt die KI mit 400 ab) und deckelt die Antwort (Praxistest 1 und 2)', async () => {
    laeufe.push({ ...LAUF_ZEILE })
    kern({
      '/api/prompt': { prompt: 'REGELN\nLEHRTEXT:\nSkript' },
      '/api/pruefen': { lesbar: true, fehler: null, befunde: [], nachbesserungsPrompt: null },
    })
    ki.stream.mockReturnValue({
      finalMessage: async () => ({ content: [{ type: 'text', text: 'cover: {}' }], stop_reason: 'end_turn', usage: { input_tokens: 10, output_tokens: 10 } }),
      abort: vi.fn(),
    })
    await bearbeiteTeil(db.client, 'https://app.test', TEIL)
    const gesendet = ki.stream.mock.calls[0][0]
    expect(gesendet.thinking).toEqual({ type: 'between_tools' })
    expect(gesendet.max_tokens).toBe(MAX_ANTWORT_BAUSTEINE)
    expect(anfrageFuer('m', []).thinking).toEqual({ type: 'between_tools' })
    expect(anfrageFuer('m', [], 50).max_tokens).toBe(50)
  })

  const abgeschnitten = () =>
    ki.stream.mockReturnValue({
      finalMessage: async () => ({
        content: [{ type: 'text', text: 'cover:\n  title: A\nchapters:\n  - title: Eins\n    elements: []\n  - title: Zw' }],
        stop_reason: 'max_tokens',
        usage: { input_tokens: 5000, output_tokens: MAX_ANTWORT_BAUSTEINE },
      }),
      abort: vi.fn(),
    })

  it('rettet eine abgeschnittene Antwort: gleiche Anfrage nicht wiederholt, vollständige Kapitel behalten, klarer Hinweis', async () => {
    laeufe.push({ ...LAUF_ZEILE })
    kern({
      '/api/prompt': { prompt: 'REGELN\nLEHRTEXT:\nSkript' },
      '/api/retten': { antwort: 'cover:\n  title: A\nchapters:\n  - title: Eins\n    elements: []\n', kapitel: 1 },
      '/api/pruefen': { lesbar: true, fehler: null, befunde: [], nachbesserungsPrompt: null },
    })
    abgeschnitten()
    await bearbeiteTeil(db.client, 'https://app.test', TEIL)
    expect(ki.stream).toHaveBeenCalledTimes(1) // nichts doppelt bezahlt
    expect(teil).toMatchObject({ status: 'fertig', ki_aufrufe: 1, aus_tokens: MAX_ANTWORT_BAUSTEINE })
    const hochgeladen = speicher.upload.mock.calls.map(([pfad]) => pfad as string)
    expect(hochgeladen).toContain('u1/' + ID + '/teil-1.yaml')
    expect(hochgeladen).toContain('u1/' + ID + '/teil-1.hinweis')
    // der gerettete Text (nicht der abgeschnittene) wurde gespeichert
    const yaml = speicher.upload.mock.calls.find(([pfad]) => String(pfad).endsWith('teil-1.yaml'))![1] as Blob
    expect(await yaml.text()).not.toContain('Zw')
    expect(fetchMock.mock.calls.some(([url]) => String(url).endsWith('/api/intern/werkzeugkiste/abschluss'))).toBe(true)
  })

  it('beendet den Lauf mit klarem Satz, wenn sich nichts retten lässt — ohne zweiten KI-Aufruf', async () => {
    laeufe.push({ ...LAUF_ZEILE })
    fetchMock.mockImplementation(async (url: string) => {
      if (url.includes('/api/intern/')) return new Response('{}', { status: 202 })
      if (url.endsWith('/api/prompt')) return new Response(JSON.stringify({ prompt: 'R\nLEHRTEXT:\nS' }), { status: 200 })
      return new Response(JSON.stringify({ error: 'Aus der abgeschnittenen Antwort ließ sich kein vollständiges Kapitel retten.' }), { status: 400 })
    })
    abgeschnitten()
    await bearbeiteTeil(db.client, 'https://app.test', TEIL)
    expect(ki.stream).toHaveBeenCalledTimes(1)
    expect(laeufe[0]).toMatchObject({ status: 'fehlgeschlagen', fehler_art: 'zulang' })
    expect(String(laeufe[0].fehler)).toContain('zu lang')
    expect(teil).toMatchObject({ status: 'fehlgeschlagen', ki_aufrufe: 1 })
  })

  it('formuliert den Hinweis für gekürzte Teile mit Fundort', () => {
    expect(gekuerztHinweis(1, 1, 3, { seiten: '', abschnitte: [] })).toContain('Das Material wurde nach Kapitel 3 abgeschnitten')
    const teil2 = gekuerztHinweis(2, 6, 4, { seiten: '', abschnitte: [5, 6, 7] })
    expect(teil2).toContain('Teil 2 von 6 (Abschnitte 5, 6, 7)')
    expect(gekuerztHinweis(3, 6, 1, { seiten: '10-14', abschnitte: [] })).toContain('Seiten 10-14')
  })

  it('wiederholt eine endgültige Ablehnung der KI (400) nicht, sondern beendet den Lauf sofort', async () => {
    laeufe.push({ ...LAUF_ZEILE })
    kern({ '/api/prompt': { prompt: 'R\nLEHRTEXT:\nS' } })
    const abgelehnt = Object.assign(new Error('400 invalid_request_error: thinking'), { status: 400 })
    ki.stream.mockReturnValue({ finalMessage: async () => Promise.reject(abgelehnt), abort: vi.fn(), currentMessage: undefined })
    await bearbeiteTeil(db.client, 'https://app.test', TEIL)
    expect(ki.stream).toHaveBeenCalledTimes(1)
    expect(laeufe[0]).toMatchObject({ status: 'fehlgeschlagen', fehler_art: 'ki' })
    expect(teil.status).toBe('fehlgeschlagen')
    expect(istAblehnung({ status: 400 })).toBe(true)
    expect(istAblehnung({ status: 429 })).toBe(false)
    expect(istAblehnung({ status: 500 })).toBe(false)
    expect(istAblehnung(new Error('Netz'))).toBe(false)
  })

  it('versucht bei einem vorübergehenden Fehler (Netz, 500) den Teil später noch einmal', async () => {
    laeufe.push({ ...LAUF_ZEILE })
    kern({ '/api/prompt': { prompt: 'R\nLEHRTEXT:\nS' } })
    ki.stream.mockReturnValue({ finalMessage: async () => Promise.reject(Object.assign(new Error('boom'), { status: 500 })), abort: vi.fn(), currentMessage: undefined })
    await bearbeiteTeil(db.client, 'https://app.test', TEIL)
    expect(teil.status).toBe('wartet')
    expect(laeufe[0].status).toBe('laeuft')
  })
})

describe('KI-Selbsttest (PROJ-64)', () => {
  const adminAuth = (isSuperAdmin: boolean) =>
    vi.mocked(requireAdmin).mockResolvedValue({ error: null, user: { id: 'a1' }, supabase: db.client, isSuperAdmin } as never)

  it('ist nur für den Super-Admin', async () => {
    adminAuth(false)
    expect((await kiTest()).status).toBe(403)
    vi.mocked(requireAdmin).mockResolvedValue({ error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }), user: null } as never)
    expect((await kiTest()).status).toBe(403)
  })

  it('schickt eine winzige Anfrage mit denselben Einstellungen und meldet Verbrauch und Kosten', async () => {
    adminAuth(true)
    ki.stream.mockReturnValue({
      finalMessage: async () => ({ content: [{ type: 'text', text: 'OK' }], stop_reason: 'end_turn', usage: { input_tokens: 20, output_tokens: 3 } }),
      abort: vi.fn(),
    })
    const res = await kiTest()
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body).toMatchObject({ ok: true, modell: 'claude-sonnet-5-5', antwort: 'OK' })
    expect(body.kostenUsd).toBeLessThan(0.001)
    const gesendet = ki.stream.mock.calls[0][0]
    expect(gesendet).toMatchObject({ max_tokens: 50, thinking: { type: 'between_tools' } })
    expect(db.writes.some((w) => w.table === 'ki_laeufe')).toBe(false) // wird nicht als Lauf erfasst
  })

  it('zeigt bei einer Ablehnung der KI den Grund', async () => {
    adminAuth(true)
    ki.stream.mockReturnValue({
      finalMessage: async () => Promise.reject(Object.assign(new Error('To turn thinking off …'), { status: 400 })),
      abort: vi.fn(),
      currentMessage: undefined,
    })
    const res = await kiTest()
    expect(res.status).toBe(502)
    expect(await res.json()).toMatchObject({ ok: false, status: 400, problem: expect.stringContaining('thinking') })
  })
})
