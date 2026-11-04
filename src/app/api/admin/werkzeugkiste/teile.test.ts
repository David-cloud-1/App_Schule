// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextResponse } from 'next/server'
import { chainMock } from '@/test/supabase-chain-mock'

vi.mock('@/app/api/admin/_lib/auth', () => ({ requireTeacherOrAdmin: vi.fn() }))
vi.mock('@/lib/supabase-server', () => ({ createServiceClient: vi.fn() }))

import { requireTeacherOrAdmin } from '@/app/api/admin/_lib/auth'
import { createServiceClient } from '@/lib/supabase-server'
import { POST as promptRoute } from './ablaeufe/[id]/prompt/route'
import { PATCH as aendern } from './ablaeufe/[id]/route'
import { DELETE as teileVerwerfen } from './ablaeufe/[id]/teile/route'
import { POST as teilPrompt } from './ablaeufe/[id]/teile/[nr]/prompt/route'
import { POST as teilAntwort } from './ablaeufe/[id]/teile/[nr]/antwort/route'
import { POST as zusammenfuegen } from './ablaeufe/[id]/zusammenfuegen/route'
import { POST as weiterschreiben } from './ablaeufe/[id]/weiterschreiben/route'
import { POST as fortsetzung } from './ablaeufe/[id]/fortsetzung/route'
import { POST as pruefen } from './ablaeufe/[id]/pruefen/route'
import { POST as bauen } from './ablaeufe/[id]/bauen/route'
import { beschreibeTeil, fingerabdruck, legeTeileAn, teilSatz } from '@/lib/werkzeugkiste-teile-server'
import { schrittErlaubt, type AblaufTeil, type AblaufTeile } from '@/lib/werkzeugkiste'

const ID = '11111111-1111-4111-8111-111111111111'
const ctx = { params: Promise.resolve({ id: ID }) }
const mitNr = (nr: number) => ({ params: Promise.resolve({ id: ID, nr: String(nr) }) })

const BASIS = {
  id: ID,
  owner_id: 'u1',
  werkzeug: 'skript',
  status: 'laeuft',
  schritt: 3,
  datei_name: 'heft.docx',
  datei_groesse: 1000,
  kennzahlen: { seiten: 12, loesungen: 0, bilder: 0, tabellen: 0 },
  gliederung: [
    { nr: 1, titel: 'Frachtvertrag' },
    { nr: 2, titel: 'Haftung' },
    { nr: 3, titel: 'Lagerung' },
  ],
  auswahl: { seiten: '', abschnitte: [] },
  einstellungen: { format: 'h5p', niveau: 'mittel', bildungsgang: 'auto', lernfeld: '', umfang: '' },
  prompt: null,
  antwort: null,
  pruefung: null,
  ergebnis: null,
  teile: null as AblaufTeile | null,
  updated_at: '2026-11-03T10:00:00Z',
}

function teil(nr: number, zusatz: Partial<AblaufTeil> = {}): AblaufTeil {
  return {
    nr,
    inhalt: [`Abschnitt ${nr}`],
    auswahl: { seiten: '', abschnitte: [nr] },
    zeichen: 7000,
    zustand: 'offen',
    kapitel: [],
    befund: null,
    satz: null,
    runden: 0,
    fingerabdruck: null,
    ...zusatz,
  }
}
const fertig = (nr: number, zusatz: Partial<AblaufTeil> = {}) =>
  teil(nr, { zustand: 'fertig', kapitel: [`Kapitel ${nr}`], befund: 'ok', satz: 'ok', fingerabdruck: `fp${nr}`, ...zusatz })
const teileListe = (...t: AblaufTeil[]): AblaufTeile => ({ groesse: 8000, zusammengefuegt: false, hinweise: [], teile: t })

let zeile: Record<string, unknown>
let konflikt: boolean
let updates: Record<string, unknown>[]
let dateien: Map<string, string>
let speicher: Record<string, ReturnType<typeof vi.fn>>
let kernFetch: ReturnType<typeof vi.fn>
let antworten: Record<string, unknown[]>
let kernAufrufe: { pfad: string; body: Record<string, unknown> }[]

const json = (body: unknown) =>
  new Request('http://t', { method: 'POST', body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } })

/** Antworten des Kerns je Pfad der Reihe nach; die letzte wiederholt sich */
function kernSagt(pfad: string, ...body: unknown[]) {
  antworten[pfad] = body
}

const teilCheck = (zusatz: Record<string, unknown> = {}) => ({
  vollstaendig: true,
  lesbar: true,
  kapitel: ['Neues Kapitel'],
  gerettet: null,
  geretteteKapitel: 0,
  eherTeil: null,
  ...zusatz,
})
const pruefOk = (zusatz: Record<string, unknown> = {}) => ({
  lesbar: true,
  fehler: null,
  befunde: [],
  korrekturen: 0,
  nachbesserungsPrompt: null,
  ...zusatz,
})

beforeEach(() => {
  vi.clearAllMocks()
  zeile = { ...BASIS }
  updates = []
  konflikt = false
  dateien = new Map()
  antworten = {}
  kernAufrufe = []
  const db = chainMock((_t, calls) => {
    const upd = calls.find((c) => c.method === 'update')
    // Optimistische Sperre: Hat sich die Zeile seit dem Lesen geändert, trifft die Bedingung nichts
    if (upd && konflikt && calls.some((c) => c.method === 'eq' && c.args[0] === 'updated_at')) return { data: null, count: 0 }
    if (upd) {
      updates.push(upd.args[0] as Record<string, unknown>)
      zeile = { ...zeile, ...(upd.args[0] as Record<string, unknown>) }
    }
    return { data: zeile, count: 0 }
  })
  vi.mocked(requireTeacherOrAdmin).mockResolvedValue({ error: null, user: { id: 'u1' }, supabase: db.client, role: 'teacher' } as never)
  speicher = {
    createSignedUrl: vi.fn().mockResolvedValue({ data: { signedUrl: 'https://speicher.test/lesen?token=t' } }),
    createSignedUploadUrl: vi.fn().mockResolvedValue({ data: { signedUrl: 'https://speicher.test/schreiben?token=t' } }),
    list: vi.fn().mockResolvedValue({ data: [{ name: 'skript.docx' }, { name: 'teil-frei-1.yaml' }, { name: 'teil-frei-2.yaml' }] }),
    remove: vi.fn().mockResolvedValue({ data: [] }),
    upload: vi.fn(async (pfad: string, blob: Blob) => {
      dateien.set(pfad, await blob.text())
      return { error: null }
    }),
    download: vi.fn(async (pfad: string) =>
      dateien.has(pfad) ? { data: new Blob([dateien.get(pfad)!]), error: null } : { data: null, error: { message: 'fehlt' } },
    ),
  }
  vi.mocked(createServiceClient).mockReturnValue({ ...db.client, storage: { from: () => speicher } } as never)
  kernFetch = vi.fn(async (url: string, init: { body: string }) => {
    const pfad = new URL(url).pathname
    kernAufrufe.push({ pfad, body: JSON.parse(init.body) })
    const liste = antworten[pfad]
    if (!liste?.length) return new Response(JSON.stringify({ error: `ungeplant: ${pfad}` }), { status: 500 })
    const body = liste.length > 1 ? liste.shift() : liste[0]
    return new Response(JSON.stringify(body), { status: 200 })
  })
  vi.stubGlobal('fetch', kernFetch)
  vi.stubEnv('WERKZEUGKISTE_KERN_URL', 'https://kern.test')
  vi.stubEnv('WERKZEUGKISTE_KERN_SECRET', 'geheim')
})

const kernPfade = () => kernAufrufe.map((a) => a.pfad)
const letzter = (pfad: string) => [...kernAufrufe].reverse().find((a) => a.pfad === pfad)!.body

describe('Teil-Liste anlegen (Prompt-Route)', () => {
  it('teilt ein langes Skript mit der kleinen Teilgröße und legt statt eines Prompts die Teil-Liste an', async () => {
    zeile = { ...BASIS, schritt: 2, antwort: 'alt', pruefung: { lesbar: true } }
    kernSagt('/api/teilen', {
      teile: [
        { auswahl: { seiten: '', abschnitte: [1] }, zeichen: 6000 },
        { auswahl: { seiten: '', abschnitte: [2] }, zeichen: 7000 },
        { auswahl: { seiten: '', abschnitte: [3] }, zeichen: 5000 },
      ],
    })
    const res = await promptRoute(new Request('http://t'), ctx)
    expect(res.status).toBe(200)
    const a = (await res.json()).ablauf
    expect(letzter('/api/teilen').max_zeichen).toBe(8000)
    expect(kernPfade()).toEqual(['/api/teilen'])
    expect(a.prompt).toBeNull()
    expect(a.teile.groesse).toBe(8000)
    expect(a.teile.teile.map((t: AblaufTeil) => [t.nr, t.zustand, t.inhalt])).toEqual([
      [1, 'offen', ['Frachtvertrag']],
      [2, 'offen', ['Haftung']],
      [3, 'offen', ['Lagerung']],
    ])
    expect(a.schritt).toBe(3)
    // eine Antwort aus einem früheren Durchgang gilt für die Teile nicht mehr
    expect(updates[0]).toMatchObject({ prompt: null, antwort: null, pruefung: null })
    // mit Teil-Liste sind Schritt 3 erlaubt, Schritt 4 erst nach dem Zusammenfügen
    expect(schrittErlaubt(a, 3)).toBe(true)
    expect(schrittErlaubt(a, 4)).toBe(false)
  })

  it('lässt ein kurzes Skript beim einen Prompt wie bisher', async () => {
    zeile = { ...BASIS, schritt: 2 }
    kernSagt('/api/teilen', { teile: [{ auswahl: { seiten: '', abschnitte: [] }, zeichen: 3000 }] })
    kernSagt('/api/prompt', { prompt: 'Du bist …', hinweis: '', warnung: '' })
    const a = (await (await promptRoute(new Request('http://t'), ctx)).json()).ablauf
    expect(a.prompt).toBe('Du bist …')
    expect(a.teile).toBeNull()
    expect(letzter('/api/prompt')).not.toHaveProperty('teil')
  })

  it('teilt kurze Werkzeuge nie (Kahoot hat kurze Antworten)', async () => {
    zeile = { ...BASIS, werkzeug: 'kahoot', schritt: 2 }
    kernSagt('/api/prompt', { prompt: 'Kahoot …', hinweis: '', warnung: '' })
    await promptRoute(new Request('http://t'), ctx)
    expect(kernPfade()).toEqual(['/api/prompt'])
  })

  it('lässt eingefügte Teil-Antworten unangetastet, auch beim erneuten Aufruf', async () => {
    zeile = { ...BASIS, teile: teileListe(fertig(1), teil(2)) }
    const res = await promptRoute(new Request('http://t'), ctx)
    expect(res.status).toBe(200)
    expect((await res.json()).ablauf.teile.teile[0].zustand).toBe('fertig')
    expect(kernAufrufe).toHaveLength(0)
    expect(updates).toHaveLength(0)
  })

  it('verwirft eine alte, noch leere Teil-Liste, wenn jetzt ein Prompt genügt', async () => {
    zeile = { ...BASIS, teile: teileListe(teil(1), teil(2)) }
    kernSagt('/api/teilen', { teile: [{ auswahl: { seiten: '', abschnitte: [] }, zeichen: 3000 }] })
    kernSagt('/api/prompt', { prompt: 'p', hinweis: '', warnung: '' })
    await promptRoute(new Request('http://t'), ctx)
    expect(updates[0]).toMatchObject({ prompt: 'p', teile: null })
  })
})

describe('Zu große Abschnitte zerlegen (PROJ-71)', () => {
  const zerlegt = {
    teile: [
      { auswahl: { seiten: '', abschnitte: [1] }, zeichen: 6000 },
      { auswahl: { seiten: '', abschnitte: [2], ausschnitt: { von: 0, bis: 6046 } }, zeichen: 6044, unterteil: { nr: 1, von: 2 }, beginnt: 'Haftung' },
      { auswahl: { seiten: '', abschnitte: [2], ausschnitt: { von: 6046, bis: 13148 } }, zeichen: 7100, unterteil: { nr: 2, von: 2 }, beginnt: 'Aufgabe 3:' },
      { auswahl: { seiten: '', abschnitte: [3] }, zeichen: 5000 },
    ],
  }

  it('bittet den Kern um die Zerlegung und speichert Ausschnitt, Unterteil und Beschriftung', async () => {
    zeile = { ...BASIS, schritt: 2 }
    kernSagt('/api/teilen', zerlegt)
    const a = (await (await promptRoute(new Request('http://t'), ctx)).json()).ablauf
    expect(letzter('/api/teilen')).toMatchObject({ max_zeichen: 8000, zerlegen: true })
    const liste = a.teile.teile as AblaufTeil[]
    expect(liste).toHaveLength(4)
    expect(liste[1]).toMatchObject({ auswahl: { abschnitte: [2], ausschnitt: { von: 0, bis: 6046 } }, unterteil: { nr: 1, von: 2 }, beginnt: 'Haftung' })
    expect(liste[2].inhalt).toEqual(['Haftung, 2. von 2 (ab Aufgabe 3:)'])
    expect(liste[1].inhalt).toEqual(['Haftung, 1. von 2'])
    // ganze Abschnitte bleiben ohne die neuen Angaben, wie bisher
    expect(liste[0].auswahl).toEqual({ seiten: '', abschnitte: [1] })
    expect(liste[0]).not.toHaveProperty('unterteil')
    expect(liste[3].inhalt).toEqual(['Lagerung'])
  })

  it('verwirft einen unsinnigen Ausschnitt, statt falsch zu beschriften', async () => {
    zeile = { ...BASIS, schritt: 2 }
    kernSagt('/api/teilen', {
      teile: [
        { auswahl: { seiten: '', abschnitte: [1], ausschnitt: { von: 9, bis: 3 } }, zeichen: 6000, unterteil: { nr: 1, von: 2 }, beginnt: 'x' },
        { auswahl: { seiten: '', abschnitte: [2], ausschnitt: { von: 'a', bis: 3 } }, zeichen: 6000, unterteil: { nr: 2, von: 2 } },
      ],
    })
    const liste = (await (await promptRoute(new Request('http://t'), ctx)).json()).ablauf.teile.teile as AblaufTeil[]
    for (const t of liste) {
      expect(t.auswahl).not.toHaveProperty('ausschnitt')
      expect(t).not.toHaveProperty('unterteil')
    }
    expect(liste[0].inhalt).toEqual(['Frachtvertrag'])
  })

  it('behält den Vorspann (Text vor der ersten Überschrift) und beschriftet ihn', async () => {
    zeile = { ...BASIS, schritt: 2 }
    kernSagt('/api/teilen', {
      teile: [
        { auswahl: { seiten: '', abschnitte: [], vorspann: true }, zeichen: 7700 },
        { auswahl: { seiten: '', abschnitte: [1, 2] }, zeichen: 7000 },
      ],
    })
    const liste = (await (await promptRoute(new Request('http://t'), ctx)).json()).ablauf.teile.teile as AblaufTeil[]
    expect(liste[0].auswahl).toEqual({ seiten: '', abschnitte: [], vorspann: true })
    expect(liste[0].inhalt).toEqual(['Einstieg (Text vor der ersten Überschrift)'])
    expect(liste[1].auswahl).not.toHaveProperty('vorspann')
  })

  it('merkt sich einen zu großen Teil', async () => {
    zeile = { ...BASIS, schritt: 2 }
    kernSagt('/api/teilen', {
      teile: [
        { auswahl: { seiten: '', abschnitte: [1] }, zeichen: 6000 },
        { auswahl: { seiten: '', abschnitte: [2] }, zeichen: 30000, zuGross: true },
      ],
    })
    const liste = (await (await promptRoute(new Request('http://t'), ctx)).json()).ablauf.teile.teile as AblaufTeil[]
    expect(liste[1].zuGross).toBe(true)
    expect(liste[0]).not.toHaveProperty('zuGross')
  })

  it('gibt dem Kern beim Prompt, bei der Antwortprüfung die Auswahl samt Ausschnitt', async () => {
    const ausschnitt = { von: 100, bis: 5000 }
    zeile = {
      ...BASIS,
      teile: teileListe(teil(1), teil(2, { auswahl: { seiten: '', abschnitte: [2], ausschnitt }, unterteil: { nr: 1, von: 2 } }), teil(3)),
    }
    kernSagt('/api/prompt', { prompt: 'Teilprompt' })
    await teilPrompt(json({}), mitNr(2))
    expect(letzter('/api/prompt').auswahl).toEqual({ seiten: '', abschnitte: [2], ausschnitt })

    kernSagt('/api/teil-pruefen', teilCheck())
    kernSagt('/api/pruefen', pruefOk())
    await teilAntwort(json({ antwort: 'chapters: x' }), mitNr(2))
    expect(letzter('/api/pruefen').auswahl).toEqual({ seiten: '', abschnitte: [2], ausschnitt })
    // der Vergleich „falscher Teil“ bekommt alle Auswahlen, mit Ausschnitten
    expect((letzter('/api/teil-pruefen').teile as { ausschnitt?: unknown }[])[1].ausschnitt).toEqual(ausschnitt)
  })
})

describe('Lange Texte ohne Teilungsmöglichkeit und fertige Materialien (Prompt-Route)', () => {
  it('gibt einem langen Text, der sich nicht teilen lässt, einen Prompt und den Hinweis auf den Nachhol-Prompt', async () => {
    zeile = { ...BASIS, schritt: 2 }
    kernSagt('/api/teilen', { teile: [{ auswahl: { seiten: '', abschnitte: [] }, zeichen: 40000 }] })
    kernSagt('/api/prompt', { prompt: 'Du bist …', hinweis: '', warnung: '' })
    const b = await (await promptRoute(new Request('http://t'), ctx)).json()
    expect(b.ablauf.prompt).toBe('Du bist …')
    expect(b.ablauf.teile).toBeNull()
    expect(b.hinweis).toBe(
      'Dein Text lässt sich nicht in kleinere Teile zerlegen. Bei sehr langen Texten kann die Antwort abbrechen. Dann hilft der Nachhol-Prompt.',
    )
  })

  it('hängt den Hinweis an bestehende Hinweise des Kerns an und lässt ihn bei kurzen Texten weg', async () => {
    zeile = { ...BASIS, schritt: 2 }
    kernSagt('/api/teilen', { teile: [{ auswahl: { seiten: '', abschnitte: [] }, zeichen: 3000 }] })
    kernSagt('/api/prompt', { prompt: 'p', hinweis: 'Seite 99 gibt es nicht.', warnung: '' })
    expect((await (await promptRoute(new Request('http://t'), ctx)).json()).hinweis).toBe('Seite 99 gibt es nicht.')
  })

  it('legt bei einem fertigen Material keine Teil-Liste an', async () => {
    zeile = { ...BASIS, status: 'fertig', schritt: 5 }
    kernSagt('/api/prompt', { prompt: 'p', hinweis: '', warnung: '' })
    const b = await (await promptRoute(new Request('http://t'), ctx)).json()
    expect(kernPfade()).toEqual(['/api/prompt'])
    expect(b.ablauf.teile).toBeNull()
  })
})

describe('Auswahl oder Einstellungen ändern (PATCH)', () => {
  it('fragt mit 409 nach, wenn eingefügte Teil-Antworten verloren gingen', async () => {
    zeile = { ...BASIS, teile: teileListe(fertig(1), fertig(2), teil(3)) }
    const res = await aendern(
      new Request('http://t', { method: 'PATCH', body: JSON.stringify({ auswahl: { seiten: '', abschnitte: [1, 2] } }) }),
      ctx,
    )
    expect(res.status).toBe(409)
    const b = await res.json()
    expect(b).toMatchObject({ code: 'teile_vorhanden', eingefuegt: 2 })
    expect(b.error).toContain('2 eingefügten Teil-Antworten')
    expect(updates).toHaveLength(0)
  })

  it('speichert ohne Rückfrage, wenn sich nichts ändert', async () => {
    zeile = { ...BASIS, teile: teileListe(fertig(1), teil(2)) }
    const res = await aendern(
      new Request('http://t', {
        method: 'PATCH',
        body: JSON.stringify({ auswahl: { seiten: '', abschnitte: [] }, einstellungen: BASIS.einstellungen }),
      }),
      ctx,
    )
    expect(res.status).toBe(200)
    expect(updates[0]).not.toHaveProperty('teile')
  })

  it('fragt auch bei geänderter Einstellung nach', async () => {
    zeile = { ...BASIS, teile: teileListe(fertig(1), teil(2)) }
    const res = await aendern(
      new Request('http://t', { method: 'PATCH', body: JSON.stringify({ einstellungen: { ...BASIS.einstellungen, niveau: 'schwer' } }) }),
      ctx,
    )
    expect(res.status).toBe(409)
  })

  it('verwirft eine Teil-Liste ohne eingefügte Antwort still und setzt zurück auf Schritt 2', async () => {
    zeile = { ...BASIS, teile: teileListe(teil(1), teil(2)) }
    const res = await aendern(
      new Request('http://t', { method: 'PATCH', body: JSON.stringify({ auswahl: { seiten: '', abschnitte: [1] } }) }),
      ctx,
    )
    expect(res.status).toBe(200)
    expect(updates[0]).toMatchObject({ teile: null, prompt: null, schritt: 2 })
  })
})

describe('Teile verwerfen (DELETE)', () => {
  it('entfernt Liste und Teil-Dateien; eine zusammengefügte Gesamtantwort entfällt mit', async () => {
    zeile = { ...BASIS, schritt: 4, antwort: 'gesamt', pruefung: { lesbar: true }, teile: { ...teileListe(fertig(1), fertig(2)), zusammengefuegt: true } }
    const res = await teileVerwerfen(new Request('http://t', { method: 'DELETE' }), ctx)
    expect(res.status).toBe(200)
    expect(updates[0]).toMatchObject({ teile: null, antwort: null, pruefung: null, schritt: 2 })
    expect(speicher.remove).toHaveBeenCalledWith(['u1/' + ID + '/teil-frei-1.yaml', 'u1/' + ID + '/teil-frei-2.yaml'])
  })

  it('verweigert bei einem fertigen Material', async () => {
    zeile = { ...BASIS, status: 'fertig', teile: teileListe(fertig(1)) }
    expect((await teileVerwerfen(new Request('http://t', { method: 'DELETE' }), ctx)).status).toBe(400)
  })
})

describe('Prompt je Teil', () => {
  beforeEach(() => {
    zeile = { ...BASIS, teile: teileListe(fertig(1), teil(2, { zustand: 'abgeschnitten', kapitel: ['Haftung 1', 'Haftung 2'] }), teil(3)) }
    kernSagt('/api/prompt', { prompt: 'Teilprompt' })
  })

  it('verlangt vom Kern „Teil 2 von 3“ mit der Auswahl dieses Teils', async () => {
    const res = await teilPrompt(json({}), mitNr(3))
    expect(await res.json()).toEqual({ prompt: 'Teilprompt', nr: 3, von: 3 })
    expect(letzter('/api/prompt')).toMatchObject({ auswahl: { seiten: '', abschnitte: [3] }, teil: { nr: 3, von: 3 }, werkzeug: 'skript' })
    expect(letzter('/api/prompt').teil).not.toHaveProperty('fertig')
    expect(updates).toHaveLength(0)
  })

  it('baut mit weiter den Weiterschreib-Prompt aus den fertigen Kapiteln', async () => {
    await teilPrompt(json({ weiter: true }), mitNr(2))
    expect(letzter('/api/prompt').teil).toEqual({ nr: 2, von: 3, fertig: ['Haftung 1', 'Haftung 2'] })
  })

  it('kennt nur vorhandene und abgeschnittene Teile', async () => {
    expect((await teilPrompt(json({ weiter: true }), mitNr(3))).status).toBe(400)
    expect((await teilPrompt(json({}), mitNr(9))).status).toBe(404)
    expect((await teilPrompt(json({ unbekannt: 1 }), mitNr(1))).status).toBe(400)
    zeile = { ...BASIS }
    expect((await teilPrompt(json({}), mitNr(1))).status).toBe(400)
  })
})

describe('Teil-Antwort einfügen', () => {
  beforeEach(() => {
    zeile = { ...BASIS, teile: teileListe(fertig(1, { fingerabdruck: fingerabdruck('Antwort Eins') }), teil(2), teil(3)) }
    kernSagt('/api/teil-pruefen', teilCheck())
    kernSagt('/api/pruefen', pruefOk())
  })

  it('übernimmt eine vollständige Antwort, prüft sofort und speichert die Datei', async () => {
    const res = await teilAntwort(json({ antwort: 'cover: x' }), mitNr(2))
    const b = await res.json()
    expect(b.uebernommen).toBe(true)
    expect(b.teil).toMatchObject({ nr: 2, zustand: 'fertig', befund: 'ok', kapitel: ['Neues Kapitel'], runden: 0 })
    expect(b.teil.satz).toBe('Teil 2 ist vollständig und in Ordnung (1 Kapitel).')
    expect(b.tippKleiner).toBe(false)
    expect(dateien.get(`u1/${ID}/teil-frei-2.yaml`)).toBe('cover: x')
    // die Prüfstelle prüft den Teil mit seiner Auswahl und im Teil-Modus (kein Abschlusskapitel-Befund)
    expect(letzter('/api/pruefen')).toMatchObject({ teil: true, auswahl: { seiten: '', abschnitte: [2] } })
    // Vergleich mit allen Teilen für „falscher Teil“
    expect(letzter('/api/teil-pruefen')).toMatchObject({ nr: 2, teile: [{ abschnitte: [1] }, { abschnitte: [2] }, { abschnitte: [3] }] })
    expect(b.ablauf.teile.teile[0].zustand).toBe('fertig')
  })

  it('rettet eine abgeschnittene Antwort: nur die vollständigen Kapitel bleiben, der Teil gilt als abgeschnitten', async () => {
    kernSagt('/api/teil-pruefen', teilCheck({ vollstaendig: false, gerettet: 'chapters: gerettet', geretteteKapitel: 2, kapitel: ['A', 'B'] }))
    const b = await (await teilAntwort(json({ antwort: 'chapters: abgebrochen' }), mitNr(2))).json()
    expect(b.uebernommen).toBe(true)
    expect(b.teil).toMatchObject({ zustand: 'abgeschnitten', kapitel: ['A', 'B'], befund: null })
    expect(b.teil.satz).toContain('2 Kapitel sind vollständig angekommen, der Rest von Teil 2 fehlt')
    expect(b.geretteteKapitel).toBe(2)
    expect(dateien.get(`u1/${ID}/teil-frei-2.yaml`)).toBe('chapters: gerettet')
  })

  it('hängt die Antwort auf den Weiterschreib-Prompt an und zählt die Runde', async () => {
    zeile = { ...BASIS, teile: teileListe(fertig(1), teil(2, { zustand: 'abgeschnitten', kapitel: ['A', 'B'], fingerabdruck: 'x' }), teil(3)) }
    dateien.set(`u1/${ID}/teil-frei-2.yaml`, 'chapters: bisher')
    kernSagt('/api/teil-pruefen', teilCheck({ kapitel: ['C'] }))
    kernSagt('/api/zusammenfuegen', { antwort: 'chapters: bisher plus neu' })
    const b = await (await teilAntwort(json({ antwort: 'chapters: neu', weiter: true }), mitNr(2))).json()
    expect(letzter('/api/zusammenfuegen').antworten).toEqual(['chapters: bisher', 'chapters: neu'])
    expect(b.teil).toMatchObject({ zustand: 'fertig', kapitel: ['A', 'B', 'C'], runden: 1, fingerabdruck: 'x' })
    expect(b.tippKleiner).toBe(false)
    expect(dateien.get(`u1/${ID}/teil-frei-2.yaml`)).toBe('chapters: bisher plus neu')
  })

  it('warnt bei der Antwort auf den Weiterschreib-Prompt nicht vor einem „falschen Teil“', async () => {
    zeile = { ...BASIS, teile: teileListe(fertig(1), teil(2, { zustand: 'abgeschnitten', kapitel: ['A'], fingerabdruck: 'x' }), teil(3)) }
    dateien.set(`u1/${ID}/teil-frei-2.yaml`, 'chapters: bisher')
    kernSagt('/api/teil-pruefen', teilCheck({ kapitel: ['C'], eherTeil: 3 }))
    kernSagt('/api/zusammenfuegen', { antwort: 'chapters: bisher plus neu' })
    const b = await (await teilAntwort(json({ antwort: 'chapters: neu', weiter: true }), mitNr(2))).json()
    expect(b.uebernommen).toBe(true)
  })

  it('schreibt nur auf dem gelesenen Stand und meldet 409, wenn sich der Ablauf inzwischen geändert hat', async () => {
    konflikt = true
    const res = await teilAntwort(json({ antwort: 'cover: x' }), mitNr(2))
    expect(res.status).toBe(409)
    expect((await res.json()).error).toContain('Lade die Seite neu')
    expect(updates).toHaveLength(0)
  })

  it('rät bei erneutem Abbruch zu einem kleineren Abschnitt', async () => {
    zeile = { ...BASIS, teile: teileListe(fertig(1), teil(2, { zustand: 'abgeschnitten', kapitel: ['A'], runden: 1 }), teil(3)) }
    dateien.set(`u1/${ID}/teil-frei-2.yaml`, 'chapters: bisher')
    kernSagt('/api/teil-pruefen', teilCheck({ vollstaendig: false, gerettet: 'chapters: noch ein Stück', kapitel: ['B'], geretteteKapitel: 1 }))
    kernSagt('/api/zusammenfuegen', { antwort: 'chapters: bisher noch ein Stück' })
    const b = await (await teilAntwort(json({ antwort: 'chapters: x', weiter: true }), mitNr(2))).json()
    expect(b.teil).toMatchObject({ zustand: 'abgeschnitten', runden: 2, kapitel: ['A', 'B'] })
    expect(b.tippKleiner).toBe(true)
  })

  it('weiterschreiben geht nur bei einem abgeschnittenen Teil, mit vorhandener Datei', async () => {
    expect((await teilAntwort(json({ antwort: 'x', weiter: true }), mitNr(2))).status).toBe(400)
    zeile = { ...BASIS, teile: teileListe(teil(1, { zustand: 'abgeschnitten', kapitel: ['A'] })) }
    expect((await teilAntwort(json({ antwort: 'x', weiter: true }), mitNr(1))).status).toBe(400)
  })

  it('warnt und speichert nichts, wenn die Antwort schon bei einem anderen Teil steht', async () => {
    const b = await (await teilAntwort(json({ antwort: 'Antwort Eins' }), mitNr(2))).json()
    expect(b).toEqual({ uebernommen: false, warnung: { art: 'doppelt', teil: 1, satz: 'Diese Antwort hast du schon bei Teil 1 eingefügt.' } })
    expect(speicher.upload).not.toHaveBeenCalled()
    expect(updates).toHaveLength(0)
  })

  it('warnt bei einer Antwort, die eher zu einem anderen Teil gehört, und übernimmt sie mit „trotzdem“', async () => {
    kernSagt('/api/teil-pruefen', teilCheck({ eherTeil: 3 }))
    const b = await (await teilAntwort(json({ antwort: 'chapters: x' }), mitNr(2))).json()
    expect(b.uebernommen).toBe(false)
    expect(b.warnung).toMatchObject({ art: 'falscher_teil', teil: 3 })
    expect(b.warnung.satz).toBe('Diese Antwort passt eher zu Teil 3 als zu Teil 2.')
    expect(speicher.upload).not.toHaveBeenCalled()
    const c = await (await teilAntwort(json({ antwort: 'chapters: x', trotzdem: true }), mitNr(2))).json()
    expect(c.uebernommen).toBe(true)
    expect(speicher.upload).toHaveBeenCalledTimes(1)
  })

  it('meldet eine unlesbare Antwort mit dem Satz der Prüfstelle und behält die alte Antwort', async () => {
    zeile = { ...BASIS, teile: teileListe(fertig(1), fertig(2, { kapitel: ['Alt'] }), teil(3)) }
    kernSagt('/api/teil-pruefen', teilCheck({ lesbar: false, vollstaendig: true, kapitel: [] }))
    kernSagt('/api/pruefen', pruefOk({ lesbar: false, fehler: 'Die Antwort der KI ist an einer Stelle verrutscht (Zeile 4).' }))
    const b = await (await teilAntwort(json({ antwort: 'cover: [kaputt' }), mitNr(2))).json()
    expect(b).toEqual({ uebernommen: false, fehler: 'Die Antwort der KI ist an einer Stelle verrutscht (Zeile 4).' })
    expect(speicher.upload).not.toHaveBeenCalled()
    expect(updates).toHaveLength(0)
  })

  it('sagt, wenn nicht einmal ein Kapitel zu retten ist', async () => {
    kernSagt('/api/teil-pruefen', teilCheck({ vollstaendig: false, lesbar: false, gerettet: null, kapitel: [] }))
    kernSagt('/api/pruefen', pruefOk({ lesbar: true }))
    const b = await (await teilAntwort(json({ antwort: 'chapters:\n  - title: E' }), mitNr(2))).json()
    expect(b.uebernommen).toBe(false)
    expect(b.fehler).toBe('Die Antwort bricht ab, bevor ein Kapitel fertig war. Frage Teil 2 noch einmal an.')
  })

  it('zeigt einen schweren Befund mit Nachbesserungs-Prompt', async () => {
    kernSagt('/api/pruefen', pruefOk({ befunde: [{ text: 'Kapitel 1 – Bild fehlt', schwere: 'hoch' }, { text: 'Kapitel 2 – Tipp', schwere: 'mittel' }], nachbesserungsPrompt: 'Bitte …' }))
    const b = await (await teilAntwort(json({ antwort: 'chapters: x' }), mitNr(2))).json()
    expect(b.teil.befund).toBe('hoch')
    expect(b.teil.satz).toBe('Achtung: Kapitel 1 – Bild fehlt. Frage diesen Teil am besten noch einmal an.')
    expect(b.nachbesserungsPrompt).toBe('Bitte …')
  })

  it('macht eine frühere Zusammenfügung ungültig, wenn ein Teil ersetzt wird', async () => {
    zeile = { ...BASIS, schritt: 4, antwort: 'gesamt', pruefung: { lesbar: true }, teile: { ...teileListe(fertig(1), fertig(2)), zusammengefuegt: true, hinweise: ['x'] } }
    const b = await (await teilAntwort(json({ antwort: 'chapters: neu' }), mitNr(2))).json()
    expect(updates[0]).toMatchObject({ antwort: null, pruefung: null, schritt: 3 })
    expect(b.ablauf.teile).toMatchObject({ zusammengefuegt: false, hinweise: [] })
  })

  it('prüft Eingaben, Zustand und Besitz vor dem Kern', async () => {
    expect((await teilAntwort(json({ antwort: '' }), mitNr(2))).status).toBe(400)
    expect((await teilAntwort(json({ antwort: 'x'.repeat(500_001) }), mitNr(2))).status).toBe(400)
    expect((await teilAntwort(json({ antwort: 'x', fremd: 1 }), mitNr(2))).status).toBe(400)
    expect((await teilAntwort(json({ antwort: 'x' }), mitNr(9))).status).toBe(404)
    zeile = { ...zeile, status: 'fertig' }
    expect((await teilAntwort(json({ antwort: 'x' }), mitNr(2))).status).toBe(400)
    zeile = { ...BASIS }
    expect((await teilAntwort(json({ antwort: 'x' }), mitNr(1))).status).toBe(400)
    expect(kernAufrufe).toHaveLength(0)
    vi.mocked(requireTeacherOrAdmin).mockResolvedValueOnce({ error: NextResponse.json({ error: 'x' }, { status: 403 }) } as never)
    expect((await teilAntwort(json({ antwort: 'x' }), mitNr(2))).status).toBe(403)
  })
})

describe('Teile zusammenfügen', () => {
  const bereit = () => {
    zeile = { ...BASIS, teile: teileListe(fertig(1), fertig(2), fertig(3)) }
    for (const n of [1, 2, 3]) dateien.set(`u1/${ID}/teil-frei-${n}.yaml`, `teil ${n}`)
    kernSagt('/api/zusammenfuegen', { antwort: 'cover: gesamt', hinweise: ['Teil 1 endet und Teil 2 beginnt mit dem Kapitel „X“.'] })
    kernSagt('/api/pruefen', pruefOk({ befunde: [{ text: 'Kapitel 2 – Hinweis', schwere: 'mittel' }] }))
  }

  it('fügt in Reihenfolge zusammen, prüft die Gesamtantwort und erlaubt Schritt 4', async () => {
    bereit()
    const res = await zusammenfuegen(json({}), ctx)
    const b = await res.json()
    expect(res.status).toBe(200)
    expect(letzter('/api/zusammenfuegen')).toEqual({ antworten: ['teil 1', 'teil 2', 'teil 3'], werkzeug: 'skript' })
    // die Gesamtantwort wird gegen die ganze Auswahl geprüft, nicht im Teil-Modus
    expect(letzter('/api/pruefen')).toMatchObject({ antwort: 'cover: gesamt', auswahl: { seiten: '', abschnitte: [] } })
    expect(letzter('/api/pruefen')).not.toHaveProperty('teil')
    expect(b.ablauf.antwort).toBe('cover: gesamt')
    expect(b.ablauf.pruefung).toEqual({ lesbar: true, fehler: null, befunde: [{ text: 'Kapitel 2 – Hinweis' }], korrekturen: 0, nachbesserungsPrompt: null })
    expect(b.ablauf.teile.zusammengefuegt).toBe(true)
    expect(b.hinweise).toEqual(['Teil 1 endet und Teil 2 beginnt mit dem Kapitel „X“.'])
    expect(b.ablauf.schritt).toBe(4)
    expect(schrittErlaubt(b.ablauf, 4)).toBe(true)
  })

  it('verlangt, dass jeder Teil eingefügt ist', async () => {
    zeile = { ...BASIS, teile: teileListe(fertig(1), teil(2), teil(3)) }
    const res = await zusammenfuegen(json({}), ctx)
    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe('Die Teile 2, 3 fehlen noch.')
    expect(kernAufrufe).toHaveLength(0)
  })

  it('sperrt bei einem schweren Befund', async () => {
    zeile = { ...BASIS, teile: teileListe(fertig(1), fertig(2, { befund: 'hoch' })) }
    const res = await zusammenfuegen(json({}), ctx)
    expect(res.status).toBe(400)
    expect((await res.json()).error).toContain('Teil 2 hat einen schweren Fehler')
  })

  it('fragt bei einem abgeschnittenen Teil nach und hält den Rest dann in den Hinweisen fest', async () => {
    bereit()
    zeile = { ...zeile, teile: teileListe(fertig(1), fertig(2), teil(3, { zustand: 'abgeschnitten', kapitel: ['A', 'B'] })) }
    const res = await zusammenfuegen(json({}), ctx)
    expect(res.status).toBe(409)
    expect(await res.json()).toMatchObject({ code: 'unvollstaendig', teile: [3] })
    expect(kernAufrufe).toHaveLength(0)
    const ok = await (await zusammenfuegen(json({ unvollstaendigOk: true }), ctx)).json()
    expect(ok.hinweise).toContain('Teil 3 ist unvollständig: Er wurde nach Kapitel 2 abgeschnitten, der Rest davon fehlt in der Datei.')
  })

  it('meldet eine fehlende Teil-Datei, statt zu raten', async () => {
    bereit()
    dateien.delete(`u1/${ID}/teil-frei-2.yaml`)
    const res = await zusammenfuegen(json({}), ctx)
    expect(res.status).toBe(400)
    expect((await res.json()).error).toContain('Teil 2')
  })

  it('verweigert ohne Teil-Liste und bei fertigem Material', async () => {
    expect((await zusammenfuegen(json({}), ctx)).status).toBe(400)
    zeile = { ...BASIS, status: 'fertig', teile: teileListe(fertig(1)) }
    expect((await zusammenfuegen(json({}), ctx)).status).toBe(400)
  })
})

describe('Antwort ohne Teile: abgeschnitten, weiterschreiben, fortsetzen', () => {
  const abgeschnitten = { kapitel: ['A', 'B', 'C'], rettbar: true, runde: 0 }
  const mitAbbruch = (zusatz: Record<string, unknown> = {}) => ({
    ...BASIS,
    schritt: 4,
    prompt: 'p',
    antwort: 'chapters: abgebrochen',
    pruefung: { lesbar: false, fehler: 'verrutscht', befunde: [], korrekturen: 0, nachbesserungsPrompt: null, abgeschnitten },
    ...zusatz,
  })

  it('Prüfen meldet eine abgeschnittene Antwort an der Prüfung (Ganzes Skript)', async () => {
    zeile = { ...BASIS, prompt: 'p' }
    kernSagt('/api/pruefen', pruefOk({ lesbar: false, fehler: 'verrutscht' }))
    kernSagt('/api/teil-pruefen', teilCheck({ vollstaendig: false, gerettet: 'chapters: x', kapitel: ['A', 'B'], geretteteKapitel: 2 }))
    const a = (await (await pruefen(json({ antwort: 'chapters: abgebrochen' }), ctx)).json()).ablauf
    expect(a.pruefung.abgeschnitten).toEqual({ kapitel: ['A', 'B'], rettbar: true, runde: 0 })
  })

  it('Prüfen lässt eine vollständige Antwort ohne Abbruch-Angabe', async () => {
    zeile = { ...BASIS, prompt: 'p' }
    kernSagt('/api/pruefen', pruefOk())
    kernSagt('/api/teil-pruefen', teilCheck())
    const a = (await (await pruefen(json({ antwort: 'cover: x' }), ctx)).json()).ablauf
    expect(a.pruefung).not.toHaveProperty('abgeschnitten')
  })

  it('Prüfen gilt auch, wenn die Zusatzfrage nach dem Abbruch ausfällt, und fragt Kahoot nie', async () => {
    zeile = { ...BASIS, prompt: 'p' }
    kernSagt('/api/pruefen', pruefOk())
    const res = await pruefen(json({ antwort: 'cover: x' }), ctx)
    expect(res.status).toBe(200)
    zeile = { ...BASIS, werkzeug: 'kahoot', prompt: 'p' }
    kernAufrufe.length = 0
    await pruefen(json({ antwort: 'questions: x' }), ctx)
    expect(kernPfade()).toEqual(['/api/pruefen'])
  })

  it('Prüfen funktioniert auch mit Teil-Liste statt Prompt', async () => {
    zeile = { ...BASIS, teile: { ...teileListe(fertig(1), fertig(2)), zusammengefuegt: true } }
    kernSagt('/api/pruefen', pruefOk())
    kernSagt('/api/teil-pruefen', teilCheck())
    expect((await pruefen(json({ antwort: 'cover: x' }), ctx)).status).toBe(200)
  })

  it('Weiterschreiben kürzt auf die vollständigen Kapitel und liefert den Weiterschreib-Prompt', async () => {
    zeile = mitAbbruch()
    kernSagt('/api/retten', { antwort: 'chapters: gerettet', kapitel: 3 })
    kernSagt('/api/kapitel-liste', { kapitel: ['A', 'B', 'C'] })
    kernSagt('/api/prompt', { prompt: 'Weiter ab C' })
    const b = await (await weiterschreiben(new Request('http://t', { method: 'POST' }), ctx)).json()
    expect(b).toMatchObject({ prompt: 'Weiter ab C', kapitel: ['A', 'B', 'C'], runde: 1, tippKleiner: false })
    expect(letzter('/api/prompt').teil).toEqual({ nr: 1, von: 1, fertig: ['A', 'B', 'C'] })
    expect(b.ablauf.antwort).toBe('chapters: gerettet')
    expect(b.ablauf.pruefung.abgeschnitten).toEqual({ kapitel: ['A', 'B', 'C'], rettbar: true, runde: 1 })
  })

  it('Weiterschreiben rät ab der zweiten Runde zu einem kleineren Abschnitt', async () => {
    zeile = mitAbbruch({ pruefung: { lesbar: true, fehler: null, befunde: [], korrekturen: 0, nachbesserungsPrompt: null, abgeschnitten: { ...abgeschnitten, runde: 1 } } })
    kernSagt('/api/retten', { antwort: 'chapters: g', kapitel: 3 })
    kernSagt('/api/kapitel-liste', { kapitel: ['A'] })
    kernSagt('/api/prompt', { prompt: 'p' })
    const b = await (await weiterschreiben(new Request('http://t', { method: 'POST' }), ctx)).json()
    expect(b).toMatchObject({ runde: 2, tippKleiner: true })
  })

  it('Weiterschreiben nur bei gemeldetem Abbruch, ohne Teile und bei offenem Entwurf', async () => {
    zeile = { ...BASIS, prompt: 'p', antwort: 'cover: x', pruefung: { lesbar: true } }
    expect((await weiterschreiben(new Request('http://t', { method: 'POST' }), ctx)).status).toBe(400)
    zeile = mitAbbruch({ teile: teileListe(teil(1)) })
    expect((await weiterschreiben(new Request('http://t', { method: 'POST' }), ctx)).status).toBe(400)
    zeile = mitAbbruch({ status: 'fertig' })
    expect((await weiterschreiben(new Request('http://t', { method: 'POST' }), ctx)).status).toBe(400)
    expect(kernAufrufe).toHaveLength(0)
  })

  it('Fortsetzung hängt die Antwort an, prüft die Gesamtantwort und entfernt die Abbruch-Angabe', async () => {
    zeile = mitAbbruch({ antwort: 'chapters: gerettet' })
    kernSagt('/api/teil-pruefen', teilCheck({ kapitel: ['D'] }))
    kernSagt('/api/zusammenfuegen', { antwort: 'chapters: gerettet plus D' })
    kernSagt('/api/pruefen', pruefOk())
    const b = await (await fortsetzung(json({ antwort: 'chapters: D' }), ctx)).json()
    expect(b.uebernommen).toBe(true)
    expect(letzter('/api/zusammenfuegen').antworten).toEqual(['chapters: gerettet', 'chapters: D'])
    expect(b.ablauf.antwort).toBe('chapters: gerettet plus D')
    expect(b.ablauf.pruefung).not.toHaveProperty('abgeschnitten')
    expect(b.tippKleiner).toBe(false)
  })

  it('Fortsetzung, die wieder abbricht: Kapitel bleiben, Runde bleibt, Tipp erscheint', async () => {
    zeile = mitAbbruch({ antwort: 'chapters: gerettet', pruefung: { lesbar: true, fehler: null, befunde: [], korrekturen: 0, nachbesserungsPrompt: null, abgeschnitten: { ...abgeschnitten, runde: 1 } } })
    kernSagt('/api/teil-pruefen', teilCheck({ vollstaendig: false, gerettet: 'chapters: D', kapitel: ['D'], geretteteKapitel: 1 }))
    kernSagt('/api/zusammenfuegen', { antwort: 'chapters: gerettet plus D' })
    kernSagt('/api/pruefen', pruefOk())
    const b = await (await fortsetzung(json({ antwort: 'chapters: D abgebrochen' }), ctx)).json()
    expect(b.ablauf.pruefung.abgeschnitten).toEqual({ kapitel: ['A', 'B', 'C', 'D'], rettbar: true, runde: 1 })
    expect(b.tippKleiner).toBe(true)
  })

  it('Fortsetzung ohne verwertbares Kapitel ändert nichts', async () => {
    zeile = mitAbbruch()
    kernSagt('/api/teil-pruefen', teilCheck({ vollstaendig: false, lesbar: false, gerettet: null, kapitel: [] }))
    const b = await (await fortsetzung(json({ antwort: 'Mist' }), ctx)).json()
    expect(b.uebernommen).toBe(false)
    expect(updates).toHaveLength(0)
  })

  it('Fortsetzung prüft Eingaben', async () => {
    zeile = mitAbbruch()
    expect((await fortsetzung(json({ antwort: '' }), ctx)).status).toBe(400)
    zeile = { ...BASIS, prompt: 'p', antwort: 'cover: x', pruefung: { lesbar: true } }
    expect((await fortsetzung(json({ antwort: 'x' }), ctx)).status).toBe(400)
  })
})

describe('Fertig bauen räumt die Teile auf', () => {
  it('entfernt Teil-Liste und Teil-Dateien, die Gesamtantwort bleibt', async () => {
    zeile = { ...BASIS, schritt: 4, antwort: 'cover: gesamt', pruefung: { lesbar: true }, teile: { ...teileListe(fertig(1), fertig(2)), zusammengefuegt: true } }
    kernSagt('/api/bauen', { titel: 'Haftung', dateiname: 'Haftung.h5p', format: 'h5p', kapitel: 6, aufgaben: 31 })
    const res = await bauen(new Request('http://t', { method: 'POST' }), ctx)
    expect(res.status).toBe(200)
    expect(updates.find((u) => u.status === 'fertig')).toMatchObject({ teile: null })
    expect(speicher.remove).toHaveBeenCalledWith([`u1/${ID}/teil-frei-1.yaml`, `u1/${ID}/teil-frei-2.yaml`])
  })
})

describe('Hilfen', () => {
  it('beschreibt Teile: Titel der Word-Abschnitte, Seiten als Bereich', () => {
    const g = [{ nr: 1, titel: 'Frachtvertrag' }, { nr: 2, titel: 'Haftung' }]
    expect(beschreibeTeil({ seiten: '', abschnitte: [2, 3] }, g)).toEqual(['Haftung', 'Abschnitt 3'])
    expect(beschreibeTeil({ seiten: '1,2,3,4', abschnitte: [] }, g)).toEqual(['Seiten 1–4'])
    expect(beschreibeTeil({ seiten: '5', abschnitte: [] }, g)).toEqual(['Seite 5'])
    expect(beschreibeTeil({ seiten: '1,2,4,7,8', abschnitte: [] }, g)).toEqual(['Seiten 1–2, 4, 7–8'])
    expect(beschreibeTeil({ seiten: '', abschnitte: [] }, g)).toEqual([])
  })

  it('beschreibt Unterteile eines zerlegten Abschnitts mit Beginn (PROJ-71)', () => {
    const g = [{ nr: 2, titel: 'Zusammenfassende Übungsaufgaben' }]
    const a = { seiten: '', abschnitte: [2] }
    expect(beschreibeTeil(a, g, { nr: 1, von: 4 }, 'Zusammenfassende Übungsaufgaben')).toEqual(['Zusammenfassende Übungsaufgaben, 1. von 4'])
    expect(beschreibeTeil(a, g, { nr: 2, von: 4 }, 'Aufgabe 3')).toEqual(['Zusammenfassende Übungsaufgaben, 2. von 4 (ab Aufgabe 3)'])
    expect(beschreibeTeil(a, g, { nr: 3, von: 4 }, '')).toEqual(['Zusammenfassende Übungsaufgaben, 3. von 4'])
    expect(beschreibeTeil(a, g)).toEqual(['Zusammenfassende Übungsaufgaben'])
  })

  it('hält die Teil-Liste klein und begrenzt die Zahl der Teile', () => {
    const lang = Array.from({ length: 60 }, (_, i) => ({ auswahl: { seiten: String(i + 1), abschnitte: [] }, zeichen: 100 }))
    expect(legeTeileAn(lang, [], 8000).teile).toHaveLength(40)
    const titel = Array.from({ length: 20 }, (_, i) => ({ nr: i + 1, titel: 'T'.repeat(300) }))
    const t = beschreibeTeil({ seiten: '', abschnitte: titel.map((x) => x.nr) }, titel)
    expect(t).toHaveLength(6)
    expect(t[0].length).toBeLessThanOrEqual(80)
  })

  it('erkennt dieselbe Antwort trotz Zaun und Zeilenumbrüchen', () => {
    expect(fingerabdruck('```yaml\ncover:\n  title: A\n```')).toBe(fingerabdruck('cover:  title: A'))
    expect(fingerabdruck('cover: A')).not.toBe(fingerabdruck('cover: B'))
  })

  it('fasst das Ergebnis in einen Satz', () => {
    const b = [{ text: 'Kapitel 2 – Bild fehlt', schwere: 'mittel' }, { text: 'Kapitel 3 – Tipp', schwere: 'mittel' }]
    expect(teilSatz({ nr: 1, zustand: 'fertig', kapitel: 4, befunde: b, stufe: 'mittel' })).toBe('4 Kapitel angekommen, 2 Hinweise: Die siehst du am Ende in der Prüfung.')
    expect(teilSatz({ nr: 1, zustand: 'fertig', kapitel: 1, befunde: [b[0]], stufe: 'mittel' })).toContain('1 Kapitel angekommen, 1 Hinweis:')
  })
})
