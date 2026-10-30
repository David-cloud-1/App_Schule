import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextResponse } from 'next/server'
import { chainMock, type ChainResolver } from '@/test/supabase-chain-mock'

vi.mock('@/app/api/admin/_lib/auth', () => ({ requireTeacherOrAdmin: vi.fn() }))
vi.mock('@/lib/supabase-server', () => ({ createServiceClient: vi.fn() }))

import { requireTeacherOrAdmin } from '@/app/api/admin/_lib/auth'
import { createServiceClient } from '@/lib/supabase-server'
import { POST as neuerAblauf } from './ablaeufe/route'
import { GET as ablaufLesen, PATCH as ablaufSpeichern, DELETE as ablaufLoeschen } from './ablaeufe/[id]/route'
import { POST as einlesen } from './ablaeufe/[id]/einlesen/route'
import { POST as prompt } from './ablaeufe/[id]/prompt/route'
import { POST as pruefen } from './ablaeufe/[id]/pruefen/route'
import { POST as bauen } from './ablaeufe/[id]/bauen/route'
import { GET as download } from './ablaeufe/[id]/download/route'
import { GET as vorschau } from './ablaeufe/[id]/vorschau/route'
import { GET as aufraeumen } from '../../cron/werkzeugkiste-aufraeumen/route'

const ID = '11111111-1111-4111-8111-111111111111'
const ctx = { params: Promise.resolve({ id: ID }) }

const BASIS_ZEILE = {
  id: ID,
  owner_id: 'u1',
  werkzeug: 'skript',
  status: 'laeuft',
  schritt: 1,
  datei_name: 'heft.pdf',
  datei_groesse: 1000,
  kennzahlen: null,
  gliederung: [],
  auswahl: { seiten: '', abschnitte: [] },
  einstellungen: { format: 'h5p', niveau: 'mittel', bildungsgang: 'auto', lernfeld: '', umfang: '' },
  prompt: null,
  antwort: null,
  pruefung: null,
  ergebnis: null,
  updated_at: '2026-10-28T08:00:00Z',
}

let zeile: Record<string, unknown> | null
let db: ReturnType<typeof chainMock>
let speicher: Record<string, ReturnType<typeof vi.fn>>
let kernFetch: ReturnType<typeof vi.fn>

function anmelden(resolver?: ChainResolver) {
  db = chainMock(
    resolver ??
      ((_table, calls) => {
        const methods = calls.map((c) => c.method)
        if (methods.includes('update')) {
          const upd = calls.find((c) => c.method === 'update')!.args[0] as Record<string, unknown>
          zeile = zeile ? { ...zeile, ...upd } : null
          return { data: zeile }
        }
        if (methods.includes('delete')) return { data: null }
        return { data: zeile, count: 0 }
      }),
  )
  vi.mocked(requireTeacherOrAdmin).mockResolvedValue({
    error: null,
    user: { id: 'u1', email: 'l@schule.de' },
    supabase: db.client,
    role: 'teacher',
    isSuperAdmin: false,
    isDepartmentAdmin: false,
    suggestedDepartmentId: null,
  } as never)
}

function json(body: unknown, method = 'POST') {
  return new Request('http://test.local', { method, body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } })
}

beforeEach(() => {
  vi.clearAllMocks()
  zeile = { ...BASIS_ZEILE }
  speicher = {
    createSignedUrl: vi.fn().mockResolvedValue({ data: { signedUrl: 'https://speicher.test/lesen?token=t' } }),
    createSignedUploadUrl: vi.fn().mockResolvedValue({ data: { signedUrl: 'https://speicher.test/schreiben?token=t' } }),
    list: vi.fn().mockResolvedValue({ data: [{ name: 'skript.pdf' }, { name: 'einlesung.zip' }] }),
    remove: vi.fn().mockResolvedValue({ data: [] }),
    download: vi.fn().mockResolvedValue({ data: new Blob(['<html>Vorschau</html>']), error: null }),
  }
  vi.mocked(createServiceClient).mockReturnValue({ storage: { from: () => speicher } } as never)
  kernFetch = vi.fn()
  vi.stubGlobal('fetch', kernFetch)
  vi.stubEnv('WERKZEUGKISTE_KERN_URL', 'https://kern.test')
  vi.stubEnv('WERKZEUGKISTE_KERN_SECRET', 'geheim')
  anmelden()
})

function kernAntwort(body: unknown, status = 200) {
  kernFetch.mockResolvedValueOnce(new Response(JSON.stringify(body), { status }))
}

describe('Werkzeugkiste-Schnittstelle (PROJ-51)', () => {
  it('lehnt Aufrufe ohne Lehrer-Rolle ab', async () => {
    vi.mocked(requireTeacherOrAdmin).mockResolvedValue({
      error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
      user: null,
      supabase: null,
    } as never)
    expect((await neuerAblauf(json({}))).status).toBe(403)
    expect((await ablaufLesen(new Request('http://t'), ctx)).status).toBe(403)
    expect((await einlesen(new Request('http://t'), ctx)).status).toBe(403)
  })

  describe('neuer Ablauf', () => {
    it('legt den Ablauf an und gibt eine Hochlade-Adresse für den Browser zurück', async () => {
      const res = await neuerAblauf(json({ werkzeug: 'skript', datei: { name: 'heft.pdf', groesse: 1000, typ: 'application/pdf' } }))
      expect(res.status).toBe(201)
      const body = await res.json()
      expect(body.ablauf.id).toBe(ID)
      expect(body.upload).toEqual({ url: 'https://speicher.test/schreiben?token=t', method: 'PUT', headers: { 'x-upsert': 'true' } })
      expect(speicher.createSignedUploadUrl).toHaveBeenCalledWith(`u1/${ID}/skript.pdf`, { upsert: true })
      const insert = db.writes.find((w) => w.method === 'insert')!.payload as Record<string, unknown>
      expect(insert.owner_id).toBe('u1')
    })

    it('lehnt gesperrte Werkzeuge und falsche Dateien mit verständlichem Satz ab', async () => {
      const r1 = await neuerAblauf(json({ werkzeug: 'podcast', datei: { name: 'a.pdf', groesse: 10, typ: '' } }))
      expect(r1.status).toBe(400)
      expect((await r1.json()).error).toMatch(/nicht freigeschaltet/)
      const r2 = await neuerAblauf(json({ werkzeug: 'skript', datei: { name: 'a.zip', groesse: 10, typ: '' } }))
      expect((await r2.json()).error).toMatch(/Format geht nicht/)
      expect(db.writes).toHaveLength(0)
    })

    it('bremst bei zu vielen offenen Abläufen', async () => {
      anmelden(() => ({ data: null, count: 50 }))
      expect((await neuerAblauf(json({ werkzeug: 'skript', datei: { name: 'a.pdf', groesse: 10, typ: '' } }))).status).toBe(429)
    })
  })

  describe('lesen, speichern, löschen', () => {
    it('liefert 404 für fremde oder unbekannte Abläufe (RLS gibt nichts zurück)', async () => {
      zeile = null
      expect((await ablaufLesen(new Request('http://t'), ctx)).status).toBe(404)
      expect((await ablaufLesen(new Request('http://t'), { params: Promise.resolve({ id: 'kein-uuid' }) })).status).toBe(404)
    })

    it('erhöht den Schritt nur so weit, wie der Ablauf vorbereitet ist', async () => {
      await ablaufSpeichern(json({ schritt: 4 }, 'PATCH'), ctx)
      expect((db.writes.at(-1)!.payload as Record<string, unknown>).schritt).toBeUndefined()
      zeile = { ...BASIS_ZEILE, kennzahlen: { seiten: 1, loesungen: 0, bilder: 0, tabellen: 0 } }
      const res = await ablaufSpeichern(json({ schritt: 2 }, 'PATCH'), ctx)
      expect((await res.json()).ablauf.schritt).toBe(2)
    })

    it('korrigiert ein unbekanntes Format und lehnt fremde Felder ab', async () => {
      const res = await ablaufSpeichern(
        json({ einstellungen: { format: 'gift', niveau: 'leicht', bildungsgang: 'auto', lernfeld: '', umfang: '' } }, 'PATCH'),
        ctx,
      )
      expect((await res.json()).ablauf.einstellungen.format).toBe('h5p')
      expect((await ablaufSpeichern(json({ prompt: 'x' }, 'PATCH'), ctx)).status).toBe(400)
    })

    it('löscht beim Abbrechen auch alle Dateien des Ablaufs', async () => {
      const res = await ablaufLoeschen(new Request('http://t', { method: 'DELETE' }), ctx)
      expect(res.status).toBe(200)
      expect(speicher.list).toHaveBeenCalledWith(`u1/${ID}`, { limit: 100 })
      expect(speicher.remove).toHaveBeenCalledWith([`u1/${ID}/skript.pdf`, `u1/${ID}/einlesung.zip`])
    })
  })

  describe('Kern-Schritte', () => {
    it('Einlesen: gibt dem Kern Lese- und Schreibadresse und speichert die Kennzahlen', async () => {
      kernAntwort({ kennzahlen: { seiten: 9, loesungen: 12, bilder: 2, tabellen: 1 }, gliederung: [] })
      const res = await einlesen(new Request('http://t', { method: 'POST' }), ctx)
      expect(res.status).toBe(200)
      expect((await res.json()).ablauf.kennzahlen.loesungen).toBe(12)
      const [url, init] = kernFetch.mock.calls[0]
      expect(url).toBe('https://kern.test/api/einlesen')
      const body = JSON.parse(init.body)
      expect(body.skript.url).toContain('speicher.test/lesen')
      expect(body.einlesung_ziel.url).toContain('speicher.test/schreiben')
      expect(body.dateiname).toBe('heft.pdf')
    })

    it('Einlesen: reicht den verständlichen Fehler des Kerns weiter', async () => {
      kernAntwort({ error: 'Die Datei „heft.pdf“ konnte nicht gelesen werden.', hint: 'Kennwortgeschützt?' }, 400)
      const res = await einlesen(new Request('http://t', { method: 'POST' }), ctx)
      expect(res.status).toBe(400)
      expect(await res.json()).toEqual({ error: 'Die Datei „heft.pdf“ konnte nicht gelesen werden.', hint: 'Kennwortgeschützt?' })
    })

    it('Prompt: erst nach dem Einlesen; speichert den Prompt und meldet Hinweise', async () => {
      expect((await prompt(new Request('http://t'), ctx)).status).toBe(400)
      zeile = { ...BASIS_ZEILE, schritt: 2, kennzahlen: { seiten: 1, loesungen: 1, bilder: 0, tabellen: 0 } }
      kernAntwort({ prompt: 'Du bist …', hinweis: 'Die Seitenangabe war nicht lesbar.', warnung: '' })
      const res = await prompt(new Request('http://t'), ctx)
      const body = await res.json()
      expect(body.ablauf.prompt).toBe('Du bist …')
      expect(body.ablauf.schritt).toBe(3)
      expect(body.hinweis).toBe('Die Seitenangabe war nicht lesbar.')
    })

    it('Prüfen: speichert Antwort und Prüfergebnis, ohne fremde Felder des Kerns zu übernehmen', async () => {
      zeile = { ...BASIS_ZEILE, schritt: 3, kennzahlen: { seiten: 1, loesungen: 1, bilder: 0, tabellen: 0 }, prompt: 'p' }
      kernAntwort({ lesbar: true, fehler: null, befunde: [{ text: 'Kapitel 2: Bild fehlt', schwere: 'hoch' }], korrekturen: 2, nachbesserungsPrompt: 'Bitte …' })
      const res = await pruefen(json({ antwort: 'cover:\n  title: T\nchapters: []' }), ctx)
      const a = (await res.json()).ablauf
      expect(a.antwort).toContain('cover:')
      expect(a.pruefung).toEqual({ lesbar: true, fehler: null, befunde: [{ text: 'Kapitel 2: Bild fehlt' }], korrekturen: 2, nachbesserungsPrompt: 'Bitte …' })
      expect(a.schritt).toBe(4)
      expect((await pruefen(json({ antwort: '' }), ctx)).status).toBe(400)
    })

    it('Bauen: nur mit lesbarer Antwort; danach fertig mit Ergebnis', async () => {
      zeile = { ...BASIS_ZEILE, schritt: 4, antwort: 'x', pruefung: { lesbar: false } }
      expect((await bauen(new Request('http://t'), ctx)).status).toBe(400)
      zeile = { ...BASIS_ZEILE, schritt: 4, antwort: 'x', pruefung: { lesbar: true } }
      kernAntwort({ titel: 'Haftung', dateiname: 'Haftung.h5p', format: 'h5p', kapitel: 6, aufgaben: 31, warnungen: 0 })
      const res = await bauen(new Request('http://t'), ctx)
      const a = (await res.json()).ablauf
      expect(a.status).toBe('fertig')
      expect(a.schritt).toBe(5)
      expect(a.ergebnis).toEqual({ titel: 'Haftung', dateiname: 'Haftung.h5p', format: 'h5p', kapitel: 6, aufgaben: 31 })
      const body = JSON.parse(kernFetch.mock.calls[0][1].body)
      expect(body.datei_ziel.url).toContain('schreiben')
      expect(body.vorschau_ziel.url).toContain('schreiben')
    })

    it('Bauen: reicht ZIP-Inhalt, Einheit und fehlende Vorschau vom Kern durch (PROJ-54)', async () => {
      zeile = { ...BASIS_ZEILE, werkzeug: 'arbeitsblatt', schritt: 4, antwort: 'x', pruefung: { lesbar: true } }
      kernAntwort({
        titel: 'Haftung', dateiname: 'Haftung.zip', format: 'word', kapitel: 0, aufgaben: 12,
        enthaelt: ['Arbeitsblatt', 'Lösungsblatt'], hatVorschau: false, einheit: 'Aufgaben', warnungen: 0,
      })
      const a = (await (await bauen(new Request('http://t'), ctx)).json()).ablauf
      expect(a.ergebnis).toMatchObject({ enthaelt: ['Arbeitsblatt', 'Lösungsblatt'], hatVorschau: false, einheit: 'Aufgaben' })
      const body = JSON.parse(kernFetch.mock.calls[0][1].body)
      expect(body.werkzeug).toBe('arbeitsblatt')
    })

    it('Bauen: reicht den Text zum Kopieren je Übung durch (LearningApps, PROJ-54)', async () => {
      zeile = {
        ...BASIS_ZEILE, werkzeug: 'learningapps', schritt: 4, antwort: 'x', pruefung: { lesbar: true },
        einstellungen: { ...BASIS_ZEILE.einstellungen, format: '' },
      }
      kernAntwort({
        titel: 'Haftung üben', dateiname: 'Haftung.txt', format: 'text', kapitel: 0, aufgaben: 2, einheit: 'Übungen',
        texte: [{ titel: 'A · Paare zuordnen', text: 'APP 1: A' }, { titel: 'B', text: 42 }, 'kaputt'],
      })
      const a = (await (await bauen(new Request('http://t'), ctx)).json()).ablauf
      // Nur Text kommt an; Leeres fällt weg, Fremdes wird zu Text
      expect(a.ergebnis.texte).toEqual([{ titel: 'A · Paare zuordnen', text: 'APP 1: A' }, { titel: 'B', text: '42' }])
      expect(JSON.parse(kernFetch.mock.calls[0][1].body).werkzeug).toBe('learningapps')
    })

    it('Bauen: reicht Klassenarbeit-Einstellungen an den Kern und den Musik-KI-Hinweis des Lernlieds zurück (PROJ-54)', async () => {
      zeile = {
        ...BASIS_ZEILE, werkzeug: 'pruefung', schritt: 4, antwort: 'x', pruefung: { lesbar: true },
        einstellungen: { ...BASIS_ZEILE.einstellungen, format: 'word', noten: 'frei', notengrenzen: '85,70,55,40,20', hilfsmittel: 'Taschenrechner' },
      }
      kernAntwort({ titel: 'Haftung', dateiname: 'Haftung.zip', format: 'word', kapitel: 0, aufgaben: 40, einheit: 'Punkte', enthaelt: ['Schülerblatt', 'Lösungen'] })
      await bauen(new Request('http://t'), ctx)
      const gesendet = JSON.parse(kernFetch.mock.calls[0][1].body)
      expect(gesendet.werkzeug).toBe('pruefung')
      expect(gesendet.einstellungen).toMatchObject({ noten: 'frei', notengrenzen: '85,70,55,40,20', hilfsmittel: 'Taschenrechner' })

      kernFetch.mockClear()
      zeile = { ...BASIS_ZEILE, werkzeug: 'lied', schritt: 4, antwort: 'x', pruefung: { lesbar: true }, einstellungen: { ...BASIS_ZEILE.einstellungen, format: '' } }
      kernAntwort({
        titel: 'Lernlieder', dateiname: 'Lernlieder.zip', format: 'word', kapitel: 0, aufgaben: 3, einheit: 'Lieder',
        enthaelt: ['Liedtexte', 'Musik-KI-Prompts'], hinweis: 'Im ZIP liegt ein fertiger Prompt für eine Musik-KI (z. B. suno.com).',
      })
      const a = (await (await bauen(new Request('http://t'), ctx)).json()).ablauf
      expect(a.ergebnis).toMatchObject({ einheit: 'Lieder', hinweis: expect.stringContaining('suno.com') })
    })

    it('meldet einen nicht erreichbaren Kern verständlich', async () => {
      zeile = { ...BASIS_ZEILE, kennzahlen: { seiten: 1, loesungen: 1, bilder: 0, tabellen: 0 } }
      kernFetch.mockRejectedValueOnce(new Error('timeout'))
      const res = await prompt(new Request('http://t'), ctx)
      expect(res.status).toBe(504)
      expect((await res.json()).error).toMatch(/nicht erreichbar/)
    })
  })

  describe('Download und Vorschau', () => {
    it('leitet auf einen kurzlebigen Link mit Dateinamen weiter', async () => {
      expect((await download(new Request('http://t'), ctx)).status).toBe(404)
      zeile = { ...BASIS_ZEILE, ergebnis: { titel: 'Ü', dateiname: 'Übung.h5p', format: 'h5p', kapitel: 1, aufgaben: 1 } }
      const res = await download(new Request('http://t'), ctx)
      expect(res.status).toBe(302)
      expect(res.headers.get('location')).toBe('https://speicher.test/lesen?token=t&download=%C3%9Cbung.h5p')
      expect(speicher.createSignedUrl).toHaveBeenCalledWith(`u1/${ID}/ausgabe`, 120)
    })

    it('liefert die Vorschau nur ohne Skripte aus (CSP)', async () => {
      zeile = { ...BASIS_ZEILE, ergebnis: { titel: 'T', dateiname: 'T.h5p', format: 'h5p', kapitel: 1, aufgaben: 1 } }
      const res = await vorschau(new Request('http://t'), ctx)
      expect(res.headers.get('content-security-policy')).toContain("default-src 'none'")
      expect(res.headers.get('content-security-policy')).toContain('sandbox')
      expect(await res.text()).toBe('<html>Vorschau</html>')
    })
  })
})

describe('Tägliches Aufräumen (PROJ-51)', () => {
  it('lehnt Aufrufe ohne CRON_SECRET ab', async () => {
    vi.stubEnv('CRON_SECRET', 'zeitplan')
    expect((await aufraeumen(new Request('http://t'))).status).toBe(401)
    expect((await aufraeumen(new Request('http://t', { headers: { authorization: 'Bearer falsch' } }))).status).toBe(401)
    vi.stubEnv('CRON_SECRET', '')
    expect((await aufraeumen(new Request('http://t', { headers: { authorization: 'Bearer ' } }))).status).toBe(401)
  })

  it('löscht abgelaufene Abläufe samt Dateien', async () => {
    vi.stubEnv('CRON_SECRET', 'zeitplan')
    const service = chainMock((_t, calls) =>
      calls.some((c) => c.method === 'delete') ? { data: null } : { data: [{ id: 'a1', owner_id: 'u1' }, { id: 'a2', owner_id: 'u2' }] },
    )
    vi.mocked(createServiceClient).mockReturnValue({ ...service.client, storage: { from: () => speicher } } as never)
    const res = await aufraeumen(new Request('http://t', { headers: { authorization: 'Bearer zeitplan' } }))
    expect(await res.json()).toEqual({ geloescht: 2, gefunden: 2 })
    expect(speicher.remove).toHaveBeenCalledTimes(2)
    const abfrage = service.queries[0].calls.find((c) => c.method === 'lt')!
    expect(abfrage.args[0]).toBe('laeuft_ab_am')
  })
})
