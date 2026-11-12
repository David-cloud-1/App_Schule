import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextResponse } from 'next/server'
import { chainMock } from '@/test/supabase-chain-mock'

vi.mock('@/app/api/admin/_lib/auth', () => ({ requireTeacherOrAdmin: vi.fn() }))
vi.mock('@/lib/supabase-server', () => ({ createServiceClient: vi.fn() }))

import { requireTeacherOrAdmin } from '@/app/api/admin/_lib/auth'
import { createServiceClient } from '@/lib/supabase-server'
import { GET as themen } from './themen/route'
import { POST as suche } from './suche/route'
import { POST as aufwaermen } from './aufwaermen/route'
import { POST as fragePrompt } from './frage-prompt/route'
import { GET as vorschrift } from './vorschrift/route'
import { GET as norm } from './norm/route'
import { POST as erkennen } from './erkennen/route'
import { POST as neuerFall } from './faelle/route'
import { GET as fallLesen, PATCH as fallSpeichern, DELETE as fallLoeschen } from './faelle/[id]/route'
import { POST as prompt } from './faelle/[id]/prompt/route'
import { POST as pruefen } from './faelle/[id]/pruefen/route'
import { POST as aktennotiz } from './faelle/[id]/aktennotiz/route'
import { bremseZuruecksetzen, SUCHEN_PRO_MINUTE } from '@/lib/schulrecht-limit'
import { GET as aufraeumen } from '../../cron/werkzeugkiste-aufraeumen/route'

const ID = '11111111-1111-4111-8111-111111111111'
const ctx = { params: Promise.resolve({ id: ID }) }

const BASIS = {
  id: ID,
  owner_id: 'u1',
  schritt: 1,
  sachverhalt: 'Schüler A fehlte bei der Schulaufgabe.',
  fundstellen: [{ kuerzel: 'BayEUG', nr: 'Art. 56' }],
  alle_abgelehnt: false,
  prompt: null,
  antwort: null,
  pruefung: null,
  laeuft_ab_am: '2026-11-03T08:00:00Z',
}

let zeile: Record<string, unknown> | null
let anzahl: number
let db: ReturnType<typeof chainMock>
let kernFetch: ReturnType<typeof vi.fn>
let serviceLoeschen: ReturnType<typeof vi.fn<() => void>>

function anmelden() {
  db = chainMock((_t, calls) => {
    const methods = calls.map((c) => c.method)
    if (methods.includes('insert')) {
      zeile = { ...BASIS, ...(calls.find((c) => c.method === 'insert')!.args[0] as object) }
      return { data: zeile }
    }
    if (methods.includes('update')) {
      zeile = zeile ? { ...zeile, ...(calls.find((c) => c.method === 'update')!.args[0] as object) } : null
      return { data: zeile }
    }
    if (methods.includes('delete')) return { data: null }
    return { data: zeile, count: anzahl }
  })
  vi.mocked(requireTeacherOrAdmin).mockResolvedValue({
    error: null,
    user: { id: 'u1', email: 'l@schule.de' },
    supabase: db.client,
    role: 'teacher',
  } as never)
}

const json = (body: unknown) =>
  new Request('http://test.local', { method: 'POST', body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } })
const kernAntwort = (body: unknown, status = 200) => kernFetch.mockResolvedValueOnce(new Response(JSON.stringify(body), { status }))

beforeEach(() => {
  vi.clearAllMocks()
  zeile = { ...BASIS }
  anzahl = 0
  bremseZuruecksetzen()
  serviceLoeschen = vi.fn<() => void>()
  const kette: Record<string, unknown> = {
    lt: vi.fn().mockReturnValue({ select: vi.fn().mockResolvedValue({ data: [{ id: 'x' }] }), then: (f: (v: unknown) => unknown) => Promise.resolve({ error: null }).then(f) }),
  }
  vi.mocked(createServiceClient).mockReturnValue({
    from: () => ({
      delete: () => {
        serviceLoeschen()
        return kette
      },
      select: () => ({ eq: () => ({ lt: () => ({ order: () => ({ limit: () => Promise.resolve({ data: [], error: null }) }) }) }) }),
    }),
    storage: { from: () => ({}) },
  } as never)
  kernFetch = vi.fn()
  vi.stubGlobal('fetch', kernFetch)
  vi.stubEnv('WERKZEUGKISTE_KERN_URL', 'https://kern.test')
  vi.stubEnv('WERKZEUGKISTE_KERN_SECRET', 'geheim')
  anmelden()
})

describe('Schulrecht-Schnittstelle (PROJ-55)', () => {
  it('lehnt alle Aufrufe ohne Lehrer-Rolle ab (403)', async () => {
    vi.mocked(requireTeacherOrAdmin).mockResolvedValue({ error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }), user: null, supabase: null } as never)
    const leer = new Request('http://t')
    for (const res of [
      await themen(),
      await suche(json({ frage: 'Handy' })),
      await aufwaermen(),
      await fragePrompt(json({ frage: 'x', fundstellen: [{ kuerzel: 'BSO', nr: '§ 1' }] })),
      await vorschrift(new Request('http://t?kuerzel=BSO')),
      await norm(new Request('http://t?kuerzel=BSO&nr=%C2%A7%201')),
      await erkennen(json({ sachverhalt: 'x' })),
      await neuerFall(json({})),
      await fallLesen(leer, ctx),
      await fallSpeichern(json({ schritt: 2 }), ctx),
      await fallLoeschen(leer, ctx),
      await prompt(leer, ctx),
      await pruefen(json({ antwort: 'x' }), ctx),
      await aktennotiz(leer, ctx),
    ]) {
      expect(res.status).toBe(403)
    }
    expect(kernFetch).not.toHaveBeenCalled()
  })

  describe('Nachschlagen', () => {
    it('reicht die Frage nur im Nachrichtenkörper an den Kern und merkt sich nichts', async () => {
      kernAntwort({ fundstellen: [{ kuerzel: 'BayEUG', nr: 'Art. 56' }] })
      const res = await suche(json({ frage: ' Darf ich das Handy abnehmen? ', quellen: ['BayEUG'] }))
      expect(res.status).toBe(200)
      expect(res.headers.get('Cache-Control')).toBe('no-store')
      const [url, init] = kernFetch.mock.calls[0]
      expect(url).toBe('https://kern.test/api/recht/suche')
      expect(url).not.toContain('Handy')
      expect(JSON.parse(init.body)).toEqual({ frage: 'Darf ich das Handy abnehmen?', quellen: ['BayEUG'] })
      expect(init.headers['X-Kern-Secret']).toBe('geheim')
      expect(db.from).not.toHaveBeenCalled()
    })

    it('prüft die Frage: leer, zu lang, fremde Felder', async () => {
      expect((await suche(json({ frage: '   ' }))).status).toBe(400)
      expect((await suche(json({ frage: 'x'.repeat(501) }))).status).toBe(400)
      expect((await suche(json({ frage: 'Handy', extra: 1 }))).status).toBe(400)
      expect((await suche(json({ frage: 'Handy', quellen: 'BSO' }))).status).toBe(400)
      expect(kernFetch).not.toHaveBeenCalled()
    })

    it('meldet einen nicht erreichbaren Kern verständlich', async () => {
      kernFetch.mockRejectedValueOnce(new Error('netz'))
      const res = await suche(json({ frage: 'Handy' }))
      expect(res.status).toBe(504)
      expect((await res.json()).error).toMatch(/nicht erreichbar/)
    })

    it('Themen, Vorschrift und Norm dürfen im Browser gemerkt werden; Eingaben werden geprüft', async () => {
      kernAntwort({ start: [], weitere: [], quellen: [] })
      expect((await themen()).headers.get('Cache-Control')).toBe('private, max-age=3600')
      kernAntwort({ kuerzel: 'BSO', normen: [] })
      expect((await vorschrift(new Request('http://t?kuerzel=BSO'))).status).toBe(200)
      expect(kernFetch.mock.calls[1][0]).toBe('https://kern.test/api/recht/vorschrift?kuerzel=BSO')
      expect((await vorschrift(new Request('http://t?kuerzel=../x'))).status).toBe(400)
      expect((await norm(new Request('http://t?kuerzel=BSO'))).status).toBe(400)
      kernAntwort({ fundstelle: {} })
      expect((await norm(new Request('http://t?kuerzel=BSO&nr=%C2%A7%201'))).status).toBe(200)
    })

    it('bremst ein zu schnelles Durchsuchen (429), je Person', async () => {
      kernFetch.mockImplementation(async () => new Response(JSON.stringify({ fundstellen: [] }), { status: 200 }))
      for (let i = 0; i < SUCHEN_PRO_MINUTE; i++) expect((await suche(json({ frage: 'Handy' }))).status).toBe(200)
      const res = await suche(json({ frage: 'Handy' }))
      expect(res.status).toBe(429)
      expect((await res.json()).error).toMatch(/schnell/)
      expect((await erkennen(json({ sachverhalt: 'Ein Fall.' }))).status).toBe(429)
      vi.mocked(requireTeacherOrAdmin).mockResolvedValue({ error: null, user: { id: 'u2', email: 'k@schule.de' }, supabase: db.client, role: 'teacher' } as never)
      expect((await suche(json({ frage: 'Handy' }))).status).toBe(200)
    })

    it('wärmt das Modell ohne Inhalt vor', async () => {
      kernAntwort({ ok: true })
      expect((await aufwaermen()).status).toBe(200)
      expect(JSON.parse(kernFetch.mock.calls[0][1].body)).toEqual({})
    })
  })

  describe('Mit meiner KI beantworten (PROJ-88)', () => {
    it('baut den Prompt im Kern aus Frage und Stellen, ohne etwas zu speichern', async () => {
      kernAntwort({ prompt: 'PROMPT' })
      const res = await fragePrompt(json({ frage: ' Darf ich das Handy einsammeln? ', fundstellen: [{ kuerzel: 'BayEUG', nr: 'Art. 56' }] }))
      expect(res.status).toBe(200)
      expect(await res.json()).toEqual({ prompt: 'PROMPT' })
      expect(res.headers.get('Cache-Control')).toBe('no-store')
      const [url, init] = kernFetch.mock.calls[0]
      expect(url).toBe('https://kern.test/api/recht/prompt')
      expect(JSON.parse(init.body)).toEqual({ sachverhalt: 'Darf ich das Handy einsammeln?', fundstellen: [{ kuerzel: 'BayEUG', nr: 'Art. 56' }] })
      expect(db.from).not.toHaveBeenCalled()
    })

    it('prüft die Eingabe: leere Frage, keine oder zu viele Stellen, fremde Felder', async () => {
      const eine = [{ kuerzel: 'BSO', nr: '§ 1' }]
      for (const body of [
        { frage: ' ', fundstellen: eine },
        { frage: 'Handy', fundstellen: [] },
        { frage: 'Handy', fundstellen: Array(16).fill(eine[0]) },
        { frage: 'Handy', fundstellen: eine, name: 'Max' },
      ]) {
        expect((await fragePrompt(json(body))).status).toBe(400)
      }
      expect(kernFetch).not.toHaveBeenCalled()
    })
  })

  describe('Personenbezüge erkennen', () => {
    it('schickt den Text zum Kern, ohne ihn zu speichern', async () => {
      kernAntwort({ funde: [{ id: 0, art: 'vorname', text: 'Max', start: 0, ende: 3, vorschlag: 'Schüler A' }] })
      const res = await erkennen(json({ sachverhalt: 'Max fehlte.' }))
      expect(res.status).toBe(200)
      expect(res.headers.get('Cache-Control')).toBe('no-store')
      expect((await res.json()).funde).toHaveLength(1)
      expect(db.from).not.toHaveBeenCalled()
    })

    it('lehnt leeren oder überlangen Text ab', async () => {
      expect((await erkennen(json({ sachverhalt: '' }))).status).toBe(400)
      expect((await erkennen(json({ sachverhalt: 'x'.repeat(5001) }))).status).toBe(400)
    })
  })

  describe('Fall', () => {
    const gueltig = { sachverhalt: 'Schüler A fehlte.', fundstellen: [{ kuerzel: 'BayEUG', nr: 'Art. 56' }], alleAbgelehnt: false }

    it('legt den Fall mit dem bestätigten Text für die angemeldete Person an', async () => {
      const res = await neuerFall(json(gueltig))
      expect(res.status).toBe(201)
      const insert = db.writes.find((w) => w.method === 'insert')!.payload as Record<string, unknown>
      expect(insert).toMatchObject({ owner_id: 'u1', sachverhalt: 'Schüler A fehlte.', alle_abgelehnt: false })
      const fall = (await res.json()).fall
      expect(fall.id).toBe(ID)
      expect(fall.fundstellen).toEqual([{ kuerzel: 'BayEUG', nr: 'Art. 56' }])
      expect(serviceLoeschen).toHaveBeenCalled() // abgelaufene Fälle werden mit weggeräumt
    })

    it('prüft die Eingabe und bremst bei zu vielen offenen Fällen', async () => {
      expect((await neuerFall(json({ ...gueltig, sachverhalt: '' }))).status).toBe(400)
      expect((await neuerFall(json({ ...gueltig, fundstellen: Array(31).fill({ kuerzel: 'BSO', nr: '§ 1' }) }))).status).toBe(400)
      expect((await neuerFall(json({ ...gueltig, owner_id: 'u2' }))).status).toBe(400)
      anzahl = 20
      expect((await neuerFall(json(gueltig))).status).toBe(429)
    })

    it('liest den Fall; ein fremder, abgelaufener oder ungültiger gibt 404', async () => {
      expect((await fallLesen(new Request('http://t'), ctx)).status).toBe(200)
      zeile = null
      const res = await fallLesen(new Request('http://t'), ctx)
      expect(res.status).toBe(404)
      expect((await res.json()).error).toMatch(/24 Stunden/)
      expect((await fallLesen(new Request('http://t'), { params: Promise.resolve({ id: 'kein-uuid' }) })).status).toBe(404)
    })

    it('erhöht den Schritt nur, wenn der Prompt da ist, und nie rückwärts', async () => {
      expect((await fallSpeichern(json({ schritt: 2 }), ctx)).status).toBe(400)
      zeile = { ...BASIS, prompt: 'P', schritt: 3 }
      const res = await fallSpeichern(json({ schritt: 2 }), ctx)
      expect(res.status).toBe(200)
      expect((await res.json()).fall.schritt).toBe(3)
      expect((await fallSpeichern(json({ schritt: 4 }), ctx)).status).toBe(400)
    })

    it('verwirft den Fall', async () => {
      expect((await fallLoeschen(new Request('http://t'), ctx)).status).toBe(200)
      expect(db.writes.some((w) => w.method === 'delete')).toBe(true)
    })

    it('baut den Prompt im Kern aus Sachverhalt und Fundstellen und merkt sich ihn', async () => {
      kernAntwort({ prompt: 'PROMPT-TEXT' })
      const res = await prompt(new Request('http://t', { method: 'POST' }), ctx)
      expect(res.status).toBe(200)
      expect(JSON.parse(kernFetch.mock.calls[0][1].body)).toEqual({ sachverhalt: BASIS.sachverhalt, fundstellen: BASIS.fundstellen })
      const fall = (await res.json()).fall
      expect(fall.prompt).toBe('PROMPT-TEXT')
      expect(fall.schritt).toBe(2)
    })

    it('prüft die Antwort, speichert sie samt Befunden und meldet erfundene Stellen', async () => {
      zeile = { ...BASIS, prompt: 'P', schritt: 2 }
      kernAntwort({ lesbar: true, fehler: null, befunde: [{ text: 'Die Antwort nennt BayEUG Art. 999 – das gibt es nicht.' }] })
      const res = await pruefen(json({ antwort: 'Nach Art. 999 BayEUG ...' }), ctx)
      expect(res.status).toBe(200)
      const fall = (await res.json()).fall
      expect(fall.pruefung.befunde[0].text).toMatch(/Art\. 999/)
      expect(fall.antwort).toBe('Nach Art. 999 BayEUG ...')
      expect(fall.schritt).toBe(3)
    })

    it('verlangt für die Prüfung einen Prompt und lehnt zu lange Antworten ab', async () => {
      expect((await pruefen(json({ antwort: 'x' }), ctx)).status).toBe(400)
      zeile = { ...BASIS, prompt: 'P' }
      expect((await pruefen(json({ antwort: 'x'.repeat(60_001) }), ctx)).status).toBe(400)
      expect(kernFetch).not.toHaveBeenCalled()
    })

    it('liefert die Word-Datei direkt aus und legt nichts ab', async () => {
      zeile = { ...BASIS, prompt: 'P', antwort: 'Einschätzung …', schritt: 3 }
      kernFetch.mockResolvedValueOnce(
        new Response(new Uint8Array([80, 75, 3, 4]), {
          status: 200,
          headers: {
            'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'Content-Disposition': 'attachment; filename=Aktennotiz_2026-11-02.docx',
          },
        }),
      )
      const res = await aktennotiz(new Request('http://t', { method: 'POST' }), ctx)
      expect(res.status).toBe(200)
      expect(res.headers.get('Content-Disposition')).toBe('attachment; filename="Aktennotiz_2026-11-02.docx"')
      expect(res.headers.get('Cache-Control')).toBe('no-store')
      expect(new Uint8Array(await res.arrayBuffer())[0]).toBe(80)
      expect(JSON.parse(kernFetch.mock.calls[0][1].body)).toMatchObject({ sachverhalt: BASIS.sachverhalt, antwort: 'Einschätzung …' })
      expect(db.writes).toHaveLength(0)
    })

    it('liefert keine Aktennotiz zu einer als unlesbar geprüften Antwort', async () => {
      zeile = { ...BASIS, prompt: 'P', antwort: 'zu kurz', pruefung: { lesbar: false, fehler: 'Die Antwort ist leer oder sehr kurz.', befunde: [] } }
      const res = await aktennotiz(new Request('http://t', { method: 'POST' }), ctx)
      expect(res.status).toBe(400)
      expect(kernFetch).not.toHaveBeenCalled()
    })

    it('verlangt für die Aktennotiz eine eingefügte Antwort und zeigt Kern-Fehler als Satz', async () => {
      expect((await aktennotiz(new Request('http://t', { method: 'POST' }), ctx)).status).toBe(400)
      zeile = { ...BASIS, prompt: 'P', antwort: 'A' }
      kernAntwort({ error: 'Es ist keine Antwort eingefügt.' }, 400)
      const res = await aktennotiz(new Request('http://t', { method: 'POST' }), ctx)
      expect(res.status).toBe(400)
      expect((await res.json()).error).toBe('Es ist keine Antwort eingefügt.')
    })
  })

  it('der tägliche Zeitplan räumt zusätzlich abgelaufene Fälle auf', async () => {
    vi.stubEnv('CRON_SECRET', 's')
    const res = await aufraeumen(new Request('http://t', { headers: { authorization: 'Bearer s' } }))
    expect(res.status).toBe(200)
    expect(await res.json()).toHaveProperty('faelleGeloescht')
    expect(serviceLoeschen).toHaveBeenCalled()
  })
})
