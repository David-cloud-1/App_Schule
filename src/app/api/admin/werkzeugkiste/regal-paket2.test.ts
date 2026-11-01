import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextResponse } from 'next/server'
import { chainMock, type ChainResolver } from '@/test/supabase-chain-mock'

vi.mock('@/app/api/admin/_lib/auth', () => ({ requireTeacherOrAdmin: vi.fn(), writeAuditLog: vi.fn() }))
vi.mock('@/lib/supabase-server', () => ({ createServiceClient: vi.fn() }))

import { requireTeacherOrAdmin, writeAuditLog } from '@/app/api/admin/_lib/auth'
import { createServiceClient } from '@/lib/supabase-server'
import { GET as regalListe } from './regal/route'
import { POST as anpassen } from './regal/[id]/anpassen/route'
import { GET as moderation } from './regal/moderation/route'
import { POST as entnehmen } from './regal/[id]/entnehmen/route'
import { POST as zulassen } from './regal/[id]/zulassen/route'
import { POST as pruefen } from './ablaeufe/[id]/pruefen/route'
import { POST as kopie } from './ablaeufe/[id]/kopie/route'
import { PUT as freigabeSetzen } from './ablaeufe/[id]/freigabe/route'
import { GET as materialien } from './materialien/route'

/**
 * Regal des Kollegiums (PROJ-53, Paket 2): Anpassen (Kopie ohne Skript), Moderation
 * durch den Super-Admin und die Prüfstelle für Kopien. Wer das Material sehen
 * darf, entscheidet die Datenbankfunktion regal_anpassen_quelle; hier wird geprüft,
 * dass die Kopie genau das und nichts mehr bekommt.
 */

const F1 = '11111111-1111-4111-8111-111111111111'
const A1 = '22222222-2222-4222-8222-222222222222'
const ctxF = { params: Promise.resolve({ id: F1 }) }
const ctxA = { params: Promise.resolve({ id: A1 }) }
const ctxKaputt = { params: Promise.resolve({ id: 'kein-uuid' }) }
const GB = 1024 * 1024 * 1024

let rpc: ReturnType<typeof vi.fn>
let db: ReturnType<typeof chainMock>
let svc: ReturnType<typeof chainMock>
let speicher: Record<string, ReturnType<typeof vi.fn>>
let tabellen: Record<string, unknown>
let kernFetch: ReturnType<typeof vi.fn>

function anmelden(rpcAntworten: Record<string, { data?: unknown; error?: unknown }> = {}, istAdmin = false, resolver?: ChainResolver) {
  rpc = vi.fn((name: string) => Promise.resolve({ data: name === 'wk_speicher_genutzt' ? 0 : null, error: null, ...(rpcAntworten[name] ?? {}) }))
  db = chainMock(resolver ?? ((t) => ({ data: tabellen[t] ?? null })), { rpc })
  vi.mocked(requireTeacherOrAdmin).mockResolvedValue({
    error: null,
    user: { id: 'u1', email: 'l@schule.de' },
    supabase: db.client,
    role: istAdmin ? 'admin' : 'teacher',
    isSuperAdmin: istAdmin,
    isDepartmentAdmin: false,
    suggestedDepartmentId: null,
  } as never)
}

function ablehnen(status: number) {
  vi.mocked(requireTeacherOrAdmin).mockResolvedValue({ error: NextResponse.json({ error: 'x' }, { status }), user: null, supabase: null } as never)
}

const json = (body: unknown, method = 'POST') =>
  new Request('http://t', { method, body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } })

beforeEach(() => {
  vi.clearAllMocks()
  tabellen = {}
  speicher = {
    copy: vi.fn().mockResolvedValue({ error: null }),
    list: vi.fn().mockResolvedValue({ data: [{ name: 'ausgabe', metadata: { size: 1000 } }] }),
    remove: vi.fn().mockResolvedValue({ data: [] }),
    createSignedUrl: vi.fn().mockResolvedValue({ data: { signedUrl: 'https://speicher.test/lesen?token=t' } }),
    download: vi.fn().mockResolvedValue({ data: null, error: { message: 'nicht da' } }),
    upload: vi.fn().mockResolvedValue({ error: null }),
  }
  svc = chainMock(() => ({ data: null }), { storage: { from: () => speicher } })
  vi.mocked(createServiceClient).mockReturnValue(svc.client as never)
  kernFetch = vi.fn()
  vi.stubGlobal('fetch', kernFetch)
  vi.stubEnv('WERKZEUGKISTE_KERN_URL', 'https://kern.test')
  vi.stubEnv('WERKZEUGKISTE_KERN_SECRET', 'geheim')
})

// ── Anpassen ─────────────────────────────────────────────────────────────

const QUELLE = {
  ablauf_id: A1,
  owner_id: 'u-besitzer',
  titel: 'Haftung im Frachtrecht',
  werkzeug: 'skript',
  antwort: 'cover:\n  title: Haftung',
  einstellungen: { format: 'h5p', niveau: 'schwer', bildungsgang: 'spedition', lernfeld: '', umfang: '' },
  pruefung: { lesbar: true, fehler: null, befunde: [{ text: 'Hinweis' }], korrekturen: 0, nachbesserungsPrompt: 'N' },
  ergebnis: { titel: 'Haftung', dateiname: 'Haftung.h5p', format: 'h5p', kapitel: 6, aufgaben: 31, fertigAm: '2026-10-01T08:00:00Z' },
  besitzer_name: 'Frau Meier',
  von_mir: false,
  auszug_am: '2026-10-02T08:00:00Z',
}

function mitQuelle(extra: Record<string, unknown> = {}, rpcExtra: Record<string, { data?: unknown; error?: unknown }> = {}) {
  anmelden({ regal_anpassen_quelle: { data: [{ ...QUELLE, ...extra }] }, ...rpcExtra })
  svc = chainMock((_t, calls) => (calls.some((c) => c.method === 'insert') ? { data: { id: 'neu', owner_id: 'u1', werkzeug: 'skript', status: 'fertig', schritt: 5, updated_at: '2026-11-01T08:00:00Z', herkunft_name: 'Frau Meier', antwort: QUELLE.antwort, pruefung: QUELLE.pruefung, ergebnis: QUELLE.ergebnis } } : { data: null }), {
    storage: { from: () => speicher },
  })
  vi.mocked(createServiceClient).mockReturnValue(svc.client as never)
}

describe('Anpassen – Kopie ohne Skript', () => {
  it('verlangt die Lehrer-Rolle (Azubis nie)', async () => {
    for (const status of [401, 403]) {
      ablehnen(status)
      expect((await anpassen(json({}), ctxF)).status).toBe(status)
    }
  })

  it('antwortet auf ungültige Kennung und nicht sichtbares Material mit 404', async () => {
    anmelden()
    expect((await anpassen(json({}), ctxKaputt)).status).toBe(404)
    expect(rpc).not.toHaveBeenCalled()
    anmelden({ regal_anpassen_quelle: { data: [] } })
    expect((await anpassen(json({}), ctxF)).status).toBe(404)
    expect(svc.writes).toHaveLength(0)
  })

  it('lehnt das eigene Material und Material ohne Auszug oder Antwort ab, ohne etwas anzulegen', async () => {
    mitQuelle({ von_mir: true })
    expect((await anpassen(json({}), ctxF)).status).toBe(409)
    mitQuelle({ auszug_am: null })
    const r = await anpassen(json({}), ctxF)
    expect(r.status).toBe(409)
    expect((await r.json()).error).toMatch(/nicht anpassen/)
    mitQuelle({ antwort: null })
    expect((await anpassen(json({}), ctxF)).status).toBe(409)
    expect(svc.writes).toHaveLength(0)
    expect(speicher.copy).not.toHaveBeenCalled()
  })

  it('prüft die Speichergrenze der ladenden Lehrkraft am Anfang', async () => {
    mitQuelle({}, { wk_speicher_genutzt: { data: 3 * GB } })
    const res = await anpassen(json({}), ctxF)
    expect(res.status).toBe(409)
    expect((await res.json()).error).toMatch(/Speicher ist voll/)
    expect(svc.writes).toHaveLength(0)
  })

  it('legt ein neues Material der ladenden Lehrkraft an: Antwort ja, Skript nein', async () => {
    mitQuelle()
    const res = await anpassen(json({}), ctxF)
    expect(res.status).toBe(201)

    const insert = svc.writes.find((w) => w.method === 'insert')!.payload as Record<string, unknown>
    // Besitzer ist die anfragende Lehrkraft, nicht die Urheberin
    expect(insert.owner_id).toBe('u1')
    expect(insert).toMatchObject({
      status: 'fertig',
      titel: 'Haftung im Frachtrecht (Kopie)',
      werkzeug: 'skript',
      antwort: QUELLE.antwort,
      pruefung: QUELLE.pruefung,
      herkunft_name: 'Frau Meier',
    })
    expect(insert.einstellungen).toEqual(QUELLE.einstellungen)
    expect(insert.ergebnis).toMatchObject({ titel: 'Haftung', dateiname: 'Haftung.h5p' })
    expect(insert.skript_entfernt_am).toEqual(expect.any(String)) // kein Skript → nichts fürs 12-Monats-Aufräumen
    // Kein Skript, kein Prompt, keine Dateiangaben aus dem Original
    for (const feld of ['prompt', 'datei_name', 'datei_groesse', 'gliederung', 'auswahl']) expect(insert).not.toHaveProperty(feld)
    expect(String(insert.id)).not.toBe(A1)
    // Die Antwort kommt als Material mit Herkunft zurück, die Oberfläche öffnet es bei Schritt 4
    const body = await res.json()
    expect(body.ablauf.herkunft).toBe('Frau Meier')
    expect(body.ablauf.status).toBe('fertig')
  })

  it('kopiert im Speicher nur Datei, Vorschau und Bilder-Auszug — nie Skript oder Einlesung', async () => {
    mitQuelle()
    await anpassen(json({}), ctxF)
    const neuId = String((svc.writes.find((w) => w.method === 'insert')!.payload as { id: string }).id)
    const kopien = speicher.copy.mock.calls.map((c) => [c[0], c[1]])
    expect(kopien).toEqual([
      [`u-besitzer/${A1}/auszug.zip`, `u1/${neuId}/einlesung.zip`], // der Auszug wird die „Einlesung“ der Kopie
      [`u-besitzer/${A1}/ausgabe`, `u1/${neuId}/ausgabe`],
      [`u-besitzer/${A1}/vorschau.html`, `u1/${neuId}/vorschau.html`],
    ])
    // Nie aus dem Ordner der Besitzerin: Skript oder Original-Einlesung
    for (const [von] of kopien) {
      expect(String(von)).not.toMatch(/skript\.|einlesung\.zip/)
    }
  })

  it('lässt die Vorschau weg, wenn das Material keine hat', async () => {
    mitQuelle({ ergebnis: { ...QUELLE.ergebnis, hatVorschau: false } })
    await anpassen(json({}), ctxF)
    expect(speicher.copy).toHaveBeenCalledTimes(2)
  })

  it('kürzt sehr lange Titel so, dass „(Kopie)“ stehen bleibt', async () => {
    mitQuelle({ titel: 'T'.repeat(120) })
    await anpassen(json({}), ctxF)
    const titel = (svc.writes.find((w) => w.method === 'insert')!.payload as { titel: string }).titel
    expect(titel).toHaveLength(120)
    expect(titel.endsWith(' (Kopie)')).toBe(true)
  })

  it('räumt auf und meldet ruhig, wenn eine Datei fehlt', async () => {
    mitQuelle()
    speicher.copy.mockResolvedValueOnce({ error: { message: 'Object not found' } })
    const res = await anpassen(json({}), ctxF)
    expect(res.status).toBe(502)
    expect((await res.json()).error).toMatch(/Datei fehlt/)
    expect(svc.writes.some((w) => w.method === 'delete')).toBe(true) // die angelegte Zeile ist wieder weg

    mitQuelle()
    speicher.copy.mockResolvedValueOnce({ error: null }).mockResolvedValueOnce({ error: { message: 'x' } })
    expect((await anpassen(json({}), ctxF)).status).toBe(502)
  })
})

// ── Regal-Liste: Moderationsschalter und „anpassbar“ ─────────────────────────

describe('Regal-Liste im Paket 2', () => {
  it('liefert „anpassbar“ je Karte und den Moderationsschalter nur dem Super-Admin auf Seite 1', async () => {
    const zeile = { freigabe_id: F1, titel: 'T', werkzeug: 'skript', format: null, fach_id: null, fach_name: null, notiz: null, besitzer_name: 'x', von_mir: false, mit_mir_geteilt: false, hat_datei: true, anpassbar: true, geladen: 0, geteilt_am: '2026-11-01T08:00:00Z', gesamt: 1 }
    anmelden({ regal_liste: { data: [zeile] }, regal_filterwerte: { data: [] } }, false)
    const lehrkraft = await (await regalListe(new Request('http://t/api'))).json()
    expect(lehrkraft.eintraege[0].anpassbar).toBe(true)
    expect(lehrkraft.moderation).toBeUndefined()

    anmelden({ regal_liste: { data: [zeile] }, regal_filterwerte: { data: [] } }, true)
    expect((await (await regalListe(new Request('http://t/api'))).json()).moderation).toBe(true)
  })
})

// ── Moderation ────────────────────────────────────────────────────────────

describe('Moderation durch den Super-Admin', () => {
  const zeile = (extra: Record<string, unknown> = {}) => ({
    freigabe_id: F1, titel: 'Haftung', werkzeug: 'skript', besitzer_name: 'Frau Meier', stufe: 'alle', geladen: 4,
    geteilt_am: '2026-11-01T08:00:00Z', entnommen_am: null, entnommen_grund: null, gesamt: 51, ...extra,
  })

  it('verlangt die Lehrer-Rolle und sonst den Super-Admin (alle anderen 404)', async () => {
    for (const status of [401, 403]) {
      ablehnen(status)
      expect((await moderation(new Request('http://t/api'))).status).toBe(status)
      expect((await entnehmen(json({ grund: 'Urheberrecht' }), ctxF)).status).toBe(status)
      expect((await zulassen(json({}), ctxF)).status).toBe(status)
    }
    anmelden({}, false) // Lehrkraft oder Bereichs-Admin
    expect((await moderation(new Request('http://t/api'))).status).toBe(404)
    expect((await entnehmen(json({ grund: 'Urheberrecht' }), ctxF)).status).toBe(404)
    expect((await zulassen(json({}), ctxF)).status).toBe(404)
    expect(rpc).not.toHaveBeenCalled()
  })

  it('listet alle Freigaben seitenweise', async () => {
    anmelden({ regal_moderation_liste: { data: [zeile(), zeile({ freigabe_id: A1, entnommen_am: '2026-11-02T08:00:00Z', entnommen_grund: 'Urheberrecht' })] } }, true)
    const j = await (await moderation(new Request('http://t/api?seite=2'))).json()
    expect(rpc).toHaveBeenCalledWith('regal_moderation_liste', { p_limit: 50, p_offset: 50 })
    expect(j.gesamt).toBe(51)
    expect(j.eintraege[0]).toMatchObject({ id: F1, besitzerName: 'Frau Meier', stufe: 'alle', geladen: 4, entnommenAm: null })
    expect(j.eintraege[1].entnommenGrund).toBe('Urheberrecht')
    expect(j.hatMehr).toBe(false)
    anmelden({}, true)
    expect((await moderation(new Request('http://t/api?seite=0'))).status).toBe(400)
  })

  it('nimmt mit Grund aus dem Regal und protokolliert es', async () => {
    anmelden({}, true)
    const res = await entnehmen(json({ grund: '  Urheberrecht des Verlags  ' }), ctxF)
    expect(res.status).toBe(200)
    expect(rpc).toHaveBeenCalledWith('regal_entnehmen', { p_freigabe_id: F1, p_grund: 'Urheberrecht des Verlags' })
    expect(writeAuditLog).toHaveBeenCalledWith(db.client, expect.objectContaining({
      admin_id: 'u1',
      action_type: 'regal_entnommen',
      object_type: 'regal_freigabe',
      object_id: F1,
      details: { grund: 'Urheberrecht des Verlags' },
    }))
  })

  it('verlangt einen Grund und lehnt kaputte Eingaben ab, ohne die Datenbank zu fragen', async () => {
    anmelden({}, true)
    for (const body of [{}, { grund: '' }, { grund: 'ab' }, { grund: 'x'.repeat(301) }, { grund: 'a\u0000b' }, null]) {
      expect((await entnehmen(json(body), ctxF)).status).toBe(400)
    }
    expect((await entnehmen(json({ grund: 'Urheberrecht' }), ctxKaputt)).status).toBe(404)
    expect(rpc).not.toHaveBeenCalled()
    expect(writeAuditLog).not.toHaveBeenCalled()
  })

  it('meldet Datenbankfehler ruhig und protokolliert dann nichts', async () => {
    anmelden({ regal_entnehmen: { error: { code: 'P0001', message: 'Dieses Material wurde schon aus dem Regal genommen.' } } }, true)
    const res = await entnehmen(json({ grund: 'Urheberrecht' }), ctxF)
    expect(res.status).toBe(409)
    expect((await res.json()).error).toMatch(/schon aus dem Regal genommen/)
    anmelden({ regal_entnehmen: { error: { code: 'P0002', message: 'x' } } }, true)
    expect((await entnehmen(json({ grund: 'Urheberrecht' }), ctxF)).status).toBe(404)
    expect(writeAuditLog).not.toHaveBeenCalled()
  })

  it('hebt die Sperre auf und protokolliert es', async () => {
    anmelden({}, true)
    expect((await zulassen(json({}), ctxF)).status).toBe(200)
    expect(rpc).toHaveBeenCalledWith('regal_wieder_zulassen', { p_freigabe_id: F1 })
    expect(writeAuditLog).toHaveBeenCalledWith(db.client, expect.objectContaining({ action_type: 'regal_wieder_zugelassen', object_id: F1 }))
    anmelden({ regal_wieder_zulassen: { error: { code: 'P0002', message: 'x' } } }, true)
    expect((await zulassen(json({}), ctxF)).status).toBe(404)
  })
})

// ── Prüfstelle für Kopien ────────────────────────────────────────────────

describe('Prüfstelle bei Kopien aus dem Regal', () => {
  const kopieZeile = {
    id: A1, owner_id: 'u1', werkzeug: 'skript', status: 'fertig', schritt: 5, datei_name: null, datei_groesse: null,
    kennzahlen: null, gliederung: null, auswahl: null, einstellungen: {}, prompt: null, antwort: 'alt', pruefung: null,
    ergebnis: null, updated_at: '2026-11-01T08:00:00Z', herkunft_name: 'Frau Meier',
  }
  const kernPruefung = { lesbar: true, fehler: null, befunde: [{ text: 'Fehlalarm ohne Skripttext' }], korrekturen: 2, nachbesserungsPrompt: 'Bitte nachbessern' }

  function kernAntwort() {
    kernFetch.mockResolvedValueOnce(new Response(JSON.stringify(kernPruefung), { status: 200 }))
  }

  it('prüft auch ohne Prompt, aber nur auf Lesbarkeit: Befunde zum Skripttext entfallen', async () => {
    tabellen = { werkzeug_ablaeufe: kopieZeile }
    anmelden()
    kernAntwort()
    const res = await pruefen(json({ antwort: 'cover:\n  title: T\nchapters: []' }), ctxA)
    expect(res.status).toBe(200)
    const gespeichert = db.writes.find((w) => w.method === 'update')!.payload as { pruefung: Record<string, unknown> }
    expect(gespeichert.pruefung).toMatchObject({ lesbar: true, befunde: [], korrekturen: 2, nachbesserungsPrompt: null })
  })

  it('verlangt bei normalen Abläufen weiter zuerst den Prompt und behält deren Befunde', async () => {
    tabellen = { werkzeug_ablaeufe: { ...kopieZeile, herkunft_name: null } }
    anmelden()
    expect((await pruefen(json({ antwort: 'cover:\n  title: T\nchapters: []' }), ctxA)).status).toBe(400)

    tabellen = { werkzeug_ablaeufe: { ...kopieZeile, herkunft_name: null, kennzahlen: { seiten: 1, loesungen: 0, bilder: 0, tabellen: 0 }, prompt: 'P' } }
    anmelden()
    kernAntwort()
    await pruefen(json({ antwort: 'cover:\n  title: T\nchapters: []' }), ctxA)
    const gespeichert = db.writes.find((w) => w.method === 'update')!.payload as { pruefung: Record<string, unknown> }
    expect(gespeichert.pruefung).toMatchObject({ befunde: [{ text: 'Fehlalarm ohne Skripttext' }], nachbesserungsPrompt: 'Bitte nachbessern' })
  })
})

// ── Kopie für anderes Werkzeug, Teilen, Liste ────────────────────────────

describe('Weitere Stellen', () => {
  it('„Gleiches Skript, anderes Werkzeug“ sagt bei einer Regal-Kopie, warum es nicht geht', async () => {
    tabellen = { werkzeug_ablaeufe: { id: A1, owner_id: 'u1', werkzeug: 'skript', status: 'fertig', herkunft_name: 'Frau Meier', skript_entfernt_am: '2026-11-01T08:00:00Z', kennzahlen: {}, datei_name: null } }
    anmelden()
    const res = await kopie(json({}), ctxA)
    expect(res.status).toBe(409)
    expect((await res.json()).error).toMatch(/Stammt aus dem Regal/)
  })

  it('holt beim Teilen den fehlenden Bilder-Auszug eines älteren Materials nach', async () => {
    tabellen = { werkzeug_ablaeufe: { id: A1, owner_id: 'u1', status: 'fertig', antwort: 'images/seite3_x44.jpeg', auszug_am: null } }
    anmelden({ regal_freigabe_setzen: { data: F1 } })
    await freigabeSetzen(json({ stufe: 'alle' }), ctxA)
    expect(speicher.download).toHaveBeenCalledWith(`u1/${A1}/einlesung.zip`)

    speicher.download.mockClear()
    tabellen = { werkzeug_ablaeufe: { id: A1, owner_id: 'u1', status: 'fertig', antwort: 'x', auszug_am: '2026-10-02T08:00:00Z' } }
    anmelden({ regal_freigabe_setzen: { data: F1 } })
    await freigabeSetzen(json({ stufe: 'alle' }), ctxA)
    expect(speicher.download).not.toHaveBeenCalled()
  })

  it('zeigt Regal-Kopien in „Meine Materialien“ mit Herkunft', async () => {
    tabellen = {
      werkzeug_ablaeufe: [{ id: 'm1', werkzeug: 'skript', status: 'fertig', schritt: 5, titel: 'T (Kopie)', datei_name: null, hat_antwort: true, skript_entfernt_am: '2026-11-01T08:00:00Z', herkunft_name: 'Frau Meier', created_at: '2026-11-01T08:00:00Z', updated_at: '2026-11-01T08:00:00Z' }],
    }
    anmelden()
    const j = await (await materialien(new Request('http://t/api'))).json()
    expect(j.eintraege[0]).toMatchObject({ ausRegal: 'Frau Meier', skriptEntfernt: true })
  })
})
