import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextResponse } from 'next/server'
import { chainMock, selectArg, type ChainResolver } from '@/test/supabase-chain-mock'

vi.mock('@/app/api/admin/_lib/auth', () => ({ requireTeacherOrAdmin: vi.fn() }))
vi.mock('@/lib/supabase-server', () => ({ createServiceClient: vi.fn() }))

import { requireTeacherOrAdmin } from '@/app/api/admin/_lib/auth'
import { createServiceClient } from '@/lib/supabase-server'
import { GET as materialien } from './materialien/route'
import { POST as kopie } from './ablaeufe/[id]/kopie/route'
import { GET as antwort } from './ablaeufe/[id]/antwort/route'
import { POST as neuerAblauf } from './ablaeufe/route'
import { PATCH as ablaufSpeichern } from './ablaeufe/[id]/route'
import { POST as bauen } from './ablaeufe/[id]/bauen/route'

/**
 * „Meine Materialien“ (PROJ-52, Paket 1): Liste, Umbenennen, Kopie für ein
 * anderes Werkzeug, KI-Antwort, Speichergrenze und Titel beim Bauen.
 */

const ID = '11111111-1111-4111-8111-111111111111'
const NEU = '22222222-2222-4222-8222-222222222222'
const ctx = { params: Promise.resolve({ id: ID }) }
const GB = 1024 * 1024 * 1024

const KENNZAHLEN = { seiten: 12, loesungen: 30, bilder: 4, tabellen: 2 }
const MATERIAL = {
  id: ID,
  owner_id: 'u1',
  werkzeug: 'skript',
  status: 'fertig',
  schritt: 5,
  datei_name: 'Haftung.pdf',
  datei_groesse: 5000,
  kennzahlen: KENNZAHLEN,
  gliederung: [{ nr: 1, titel: 'Kapitel 1' }],
  auswahl: { seiten: '1-5', abschnitte: [] },
  einstellungen: { format: 'seite', niveau: 'schwer', bildungsgang: 'spedition', lernfeld: '', umfang: '' },
  prompt: 'P',
  antwort: 'title: Haftung',
  pruefung: { lesbar: true },
  ergebnis: { titel: 'Haftung im Frachtrecht', dateiname: 'Haftung.h5p', format: 'h5p', kapitel: 6, aufgaben: 31 },
  updated_at: '2026-10-29T08:00:00Z',
  titel: 'Haftung im Frachtrecht',
  skript_hochgeladen_am: '2026-01-05T08:00:00Z',
  skript_entfernt_am: null,
}

let zeile: Record<string, unknown> | null
let db: ReturnType<typeof chainMock>
let svc: ReturnType<typeof chainMock>
let speicher: Record<string, ReturnType<typeof vi.fn>>
let rpc: ReturnType<typeof vi.fn>
let kernFetch: ReturnType<typeof vi.fn>

function anmelden(resolver?: ChainResolver) {
  rpc = vi.fn().mockResolvedValue({ data: 0, error: null })
  db = chainMock(
    resolver ??
      ((_t, calls) => {
        const m = calls.map((c) => c.method)
        if (m.includes('update')) {
          zeile = zeile ? { ...zeile, ...(calls.find((c) => c.method === 'update')!.args[0] as object) } : null
          return { data: zeile }
        }
        if (m.includes('insert')) return { data: { ...MATERIAL, id: NEU, status: 'laeuft', schritt: 2, ergebnis: null, antwort: null, prompt: null, pruefung: null, titel: null } }
        if (m.includes('delete')) return { data: null }
        return { data: zeile, count: 0 }
      }),
    { rpc },
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

const json = (body: unknown, method = 'POST') =>
  new Request('http://t', { method, body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } })

beforeEach(() => {
  vi.clearAllMocks()
  zeile = { ...MATERIAL }
  speicher = {
    copy: vi.fn().mockResolvedValue({ data: {}, error: null }),
    list: vi.fn().mockResolvedValue({ data: [{ name: 'skript.pdf', metadata: { size: 1000 } }, { name: 'ausgabe', metadata: { size: 500 } }] }),
    remove: vi.fn().mockResolvedValue({ data: [], error: null }),
    createSignedUrl: vi.fn().mockResolvedValue({ data: { signedUrl: 'https://speicher.test/lesen?token=t' } }),
    createSignedUploadUrl: vi.fn().mockResolvedValue({ data: { signedUrl: 'https://speicher.test/schreiben?token=t' } }),
  }
  svc = chainMock(() => ({ data: null }), { storage: { from: () => speicher } })
  vi.mocked(createServiceClient).mockReturnValue(svc.client as never)
  kernFetch = vi.fn()
  vi.stubGlobal('fetch', kernFetch)
  vi.stubEnv('WERKZEUGKISTE_KERN_URL', 'https://kern.test')
  vi.stubEnv('WERKZEUGKISTE_KERN_SECRET', 'geheim')
  anmelden()
})

const LISTEN_ZEILE = {
  id: ID, werkzeug: 'skript', status: 'fertig', schritt: 5, titel: 'Haftung im Frachtrecht', datei_name: 'Haftung.pdf',
  hat_antwort: true, skript_entfernt_am: null, created_at: '2026-10-29T08:00:00Z', updated_at: '2026-10-29T09:00:00Z',
  laeuft_ab_am: null, video_url: null, ergebnis_titel: 'Haftung im Frachtrecht', ergebnis_format: 'h5p', ergebnis_vorschau: null, ergebnis_text: null,
}

function listeAnmelden(zeilen: unknown[], count = zeilen.length, genutzt = 3 * 1024 * 1024) {
  anmelden(() => ({ data: zeilen, count }))
  rpc.mockResolvedValue({ data: genutzt, error: null })
}

it('lehnt alle neuen Aufrufe ohne Lehrer-Rolle ab', async () => {
  vi.mocked(requireTeacherOrAdmin).mockResolvedValue({ error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }), user: null, supabase: null } as never)
  expect((await materialien(new Request('http://t/api/x'))).status).toBe(403)
  expect((await kopie(new Request('http://t'), ctx)).status).toBe(403)
  expect((await antwort(new Request('http://t'), ctx)).status).toBe(403)
})

describe('Liste „Meine Materialien“', () => {
  it('liefert schmale Zeilen, nur eingelesene, eigene, Entwürfe zuerst', async () => {
    listeAnmelden([
      { ...LISTEN_ZEILE, id: 'e1', status: 'laeuft', schritt: 3, titel: null, laeuft_ab_am: '2026-11-02T03:30:00Z', ergebnis_titel: null, ergebnis_format: null, hat_antwort: false },
      LISTEN_ZEILE,
    ])
    const res = await materialien(new Request('http://t/api/x'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.eintraege).toHaveLength(2)
    expect(body.eintraege[0]).toMatchObject({ id: 'e1', art: 'entwurf', titel: 'Haftung.pdf', schritt: 3, laeuftAbAm: '2026-11-02T03:30:00Z', hatDatei: false })
    expect(body.eintraege[1]).toMatchObject({
      art: 'material', titel: 'Haftung im Frachtrecht', format: 'h5p', hatDatei: true, hatVorschau: true, hatAntwort: true, skriptEntfernt: false, laeuftAbAm: null,
    })
    expect(body.speicher).toEqual({ genutztBytes: 3 * 1024 * 1024, grenzeBytes: 2 * GB })
    expect(body.hatMehr).toBe(false)

    const q = db.queries[0].calls
    expect(q.find((c) => c.method === 'eq')!.args).toEqual(['owner_id', 'u1'])
    expect(q.find((c) => c.method === 'not')!.args).toEqual(['kennzahlen', 'is', null])
    expect(q.filter((c) => c.method === 'order').map((c) => c.args)).toEqual([
      ['status', { ascending: false }],
      ['updated_at', { ascending: false }],
    ])
    expect(q.find((c) => c.method === 'range')!.args).toEqual([0, 49])
  })

  it('lädt weder Prompt noch Antwort und das Ergebnis nur als Pfade', async () => {
    listeAnmelden([LISTEN_ZEILE])
    await materialien(new Request('http://t/api/x'))
    const spalten = selectArg(db.queries[0].calls).split(', ')
    expect(spalten).not.toContain('prompt')
    expect(spalten).not.toContain('antwort')
    expect(spalten).not.toContain('ergebnis')
    expect(spalten).toContain('hat_antwort')
  })

  it('erkennt reine Texte (keine Datei) und eine fehlende Vorschau', async () => {
    listeAnmelden([{ ...LISTEN_ZEILE, ergebnis_text: 'A · Paare zuordnen', ergebnis_vorschau: 'false' }])
    const m = (await (await materialien(new Request('http://t/api/x'))).json()).eintraege[0]
    expect(m).toMatchObject({ hatDatei: false, hatVorschau: false })
  })

  it('meldet entfernte Skripte', async () => {
    listeAnmelden([{ ...LISTEN_ZEILE, skript_entfernt_am: '2027-10-30T03:30:00Z' }])
    expect((await (await materialien(new Request('http://t/api/x'))).json()).eintraege[0].skriptEntfernt).toBe(true)
  })

  it('sucht in Titel und Skriptname und entschärft Sonderzeichen', async () => {
    listeAnmelden([])
    await materialien(new Request('http://t/api/x?suche=' + encodeURIComponent('a%b,(c)_*"')))
    const or = db.queries[0].calls.find((c) => c.method === 'or')!.args[0]
    expect(or).toBe('titel.ilike.%a b c%,datei_name.ilike.%a b c%')
  })

  it('ignoriert eine Suche, die nur aus Sonderzeichen besteht', async () => {
    listeAnmelden([])
    await materialien(new Request('http://t/api/x?suche=' + encodeURIComponent('%%,,')))
    expect(db.queries[0].calls.some((c) => c.method === 'or')).toBe(false)
  })

  it('filtert nach Werkzeug und lehnt unbekannte ab', async () => {
    listeAnmelden([])
    await materialien(new Request('http://t/api/x?werkzeug=kahoot'))
    expect(db.queries[0].calls.filter((c) => c.method === 'eq').map((c) => c.args)).toContainEqual(['werkzeug', 'kahoot'])
    const res = await materialien(new Request('http://t/api/x?werkzeug=gibtsnicht'))
    expect(res.status).toBe(400)
  })

  it('lädt seitenweise und sagt, ob es mehr gibt', async () => {
    listeAnmelden([LISTEN_ZEILE], 120)
    const body = await (await materialien(new Request('http://t/api/x?seite=2'))).json()
    expect(db.queries[0].calls.find((c) => c.method === 'range')!.args).toEqual([50, 99])
    expect(body.gesamt).toBe(120)
    expect(body.hatMehr).toBe(true)
    listeAnmelden([LISTEN_ZEILE], 51)
    expect((await (await materialien(new Request('http://t/api/x?seite=2'))).json()).hatMehr).toBe(false)
  })

  it('begrenzt die Seitengröße und lehnt unsinnige Seiten ab', async () => {
    listeAnmelden([])
    expect((await materialien(new Request('http://t/api/x?je=500'))).status).toBe(400)
    expect((await materialien(new Request('http://t/api/x?seite=0'))).status).toBe(400)
    expect((await materialien(new Request('http://t/api/x?seite=abc'))).status).toBe(400)
  })

  it('meldet einen Datenbankfehler verständlich', async () => {
    anmelden(() => ({ data: null, error: { message: 'kaputt' } }))
    const res = await materialien(new Request('http://t/api/x'))
    expect(res.status).toBe(500)
    expect((await res.json()).error).not.toMatch(/kaputt/)
  })
})

describe('Umbenennen', () => {
  it('speichert den getrimmten Titel eines fertigen Materials', async () => {
    const res = await ablaufSpeichern(json({ titel: '  Haftung (neu)  ' }, 'PATCH'), ctx)
    expect(res.status).toBe(200)
    expect(db.writes.find((w) => w.method === 'update')!.payload).toMatchObject({ titel: 'Haftung (neu)' })
  })

  it('lässt Entwürfe nicht umbenennen', async () => {
    zeile = { ...MATERIAL, status: 'laeuft', ergebnis: null }
    const res = await ablaufSpeichern(json({ titel: 'Neu' }, 'PATCH'), ctx)
    expect(res.status).toBe(400)
    expect(db.writes.some((w) => w.method === 'update')).toBe(false)
  })

  it('lehnt leere, zu lange und unsichtbare Titel mit einem Satz ab', async () => {
    expect((await (await ablaufSpeichern(json({ titel: '   ' }, 'PATCH'), ctx)).json()).error).toMatch(/nicht leer/)
    expect((await (await ablaufSpeichern(json({ titel: 'x'.repeat(121) }, 'PATCH'), ctx)).json()).error).toMatch(/zu lang/)
    expect((await (await ablaufSpeichern(json({ titel: 'a\u0000b' }, 'PATCH'), ctx)).json()).error).toMatch(/ungültige Zeichen/)
    expect(db.writes.some((w) => w.method === 'update')).toBe(false)
  })

  it('gibt für fremde Materialien 404 (RLS liefert nichts)', async () => {
    zeile = null
    expect((await ablaufSpeichern(json({ titel: 'Neu' }, 'PATCH'), ctx)).status).toBe(404)
  })
})

describe('Fertigstellen macht ein Material (Bauen)', () => {
  const bereit = (extra: Record<string, unknown> = {}) => {
    zeile = { ...MATERIAL, status: 'laeuft', schritt: 4, ergebnis: null, titel: null, ...extra }
    kernFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ titel: 'Haftung KI-Titel', dateiname: 'H.h5p', format: 'h5p', kapitel: 2, aufgaben: 9 }), { status: 200 }),
    )
  }

  it('setzt den Titel aus der KI-Antwort und zählt den Speicher neu', async () => {
    bereit()
    const res = await bauen(new Request('http://t'), ctx)
    expect(res.status).toBe(200)
    expect(db.writes.find((w) => w.method === 'update')!.payload).toMatchObject({ status: 'fertig', schritt: 5, titel: 'Haftung KI-Titel' })
    // Speichergröße: 1000 + 500 aus der Ordnerliste, mit dem Service-Schlüssel gesetzt
    expect(svc.writes.find((w) => w.method === 'update')!.payload).toEqual({ speicher_bytes: 1500 })
  })

  it('behält einen von der Lehrkraft geänderten Titel bei einer überarbeiteten Fassung', async () => {
    bereit({ titel: 'Mein Titel', ergebnis: { titel: 'Alter KI-Titel', dateiname: 'a', format: 'h5p', kapitel: 1, aufgaben: 1 } })
    await bauen(new Request('http://t'), ctx)
    expect(db.writes.find((w) => w.method === 'update')!.payload).toMatchObject({ titel: 'Mein Titel' })
  })

  it('übernimmt den neuen KI-Titel, wenn nie umbenannt wurde', async () => {
    bereit({ titel: 'Alter KI-Titel', ergebnis: { titel: 'Alter KI-Titel', dateiname: 'a', format: 'h5p', kapitel: 1, aufgaben: 1 } })
    await bauen(new Request('http://t'), ctx)
    expect(db.writes.find((w) => w.method === 'update')!.payload).toMatchObject({ titel: 'Haftung KI-Titel' })
  })
})

describe('Speichergrenze und Entwurfs-Bremse', () => {
  const datei = { werkzeug: 'skript', datei: { name: 'heft.pdf', groesse: 1000, typ: 'application/pdf' } }

  it('lehnt einen neuen Ablauf bei vollem Speicher ab, ohne etwas anzulegen', async () => {
    rpc.mockResolvedValue({ data: 2 * GB, error: null })
    const res = await neuerAblauf(json(datei))
    expect(res.status).toBe(409)
    expect((await res.json()).error).toMatch(/Speicher ist voll/)
    expect(db.writes.some((w) => w.method === 'insert')).toBe(false)
  })

  it('erlaubt Abläufe knapp unter der Grenze', async () => {
    rpc.mockResolvedValue({ data: 2 * GB - 1, error: null })
    expect((await neuerAblauf(json(datei))).status).toBe(201)
  })

  it('sperrt nicht, wenn die Verbrauchs-Abfrage ausfällt (der Zähler ist keine Sicherheitsgrenze)', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'weg' } })
    expect((await neuerAblauf(json(datei))).status).toBe(201)
  })

  it('zählt für die 50er-Bremse nur Entwürfe', async () => {
    await neuerAblauf(json(datei))
    const zaehlen = db.queries[0].calls
    expect(zaehlen.filter((c) => c.method === 'eq').map((c) => c.args)).toEqual([['owner_id', 'u1'], ['status', 'laeuft']])
  })
})

describe('Gleiches Skript, anderes Werkzeug (Kopie)', () => {
  it('legt einen neuen Ablauf bei Schritt 2 an und kopiert Skript und Einlesung im Speicher', async () => {
    const res = await kopie(new Request('http://t'), ctx)
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.ablauf.id).toBe(NEU)

    const insert = db.writes.find((w) => w.method === 'insert')!.payload as Record<string, unknown>
    expect(insert).toMatchObject({ owner_id: 'u1', werkzeug: 'skript', datei_name: 'Haftung.pdf', schritt: 2, kennzahlen: KENNZAHLEN })
    // Nichts Fertiges wird mitgenommen
    for (const feld of ['prompt', 'antwort', 'pruefung', 'ergebnis', 'status', 'titel']) expect(insert).not.toHaveProperty(feld)
    expect(insert.einstellungen).toMatchObject({ niveau: 'schwer', bildungsgang: 'spedition', format: 'seite' })

    expect(speicher.copy).toHaveBeenCalledWith(`u1/${ID}/einlesung.zip`, `u1/${NEU}/einlesung.zip`)
    expect(speicher.copy).toHaveBeenCalledWith(`u1/${ID}/skript.pdf`, `u1/${NEU}/skript.pdf`)
  })

  it('lässt die 12-Monats-Uhr vom ersten Hochladen weiterlaufen (nur mit dem Service-Schlüssel)', async () => {
    await kopie(new Request('http://t'), ctx)
    const uhr = svc.writes.find((w) => w.method === 'update' && 'skript_hochgeladen_am' in (w.payload as object))!
    expect(uhr.payload).toEqual({ skript_hochgeladen_am: '2026-01-05T08:00:00Z' })
    expect(db.writes.some((w) => w.method === 'update')).toBe(false)
  })

  it('lehnt ein Material ohne Skript, Video-Fragen und volle Speicher ab', async () => {
    zeile = { ...MATERIAL, skript_entfernt_am: '2027-10-30T03:30:00Z' }
    const r1 = await kopie(new Request('http://t'), ctx)
    expect(r1.status).toBe(409)
    expect((await r1.json()).error).toMatch(/12 Monaten entfernt/)

    zeile = { ...MATERIAL, werkzeug: 'youtube', datei_name: null }
    expect((await kopie(new Request('http://t'), ctx)).status).toBe(409)

    zeile = { ...MATERIAL }
    rpc.mockResolvedValue({ data: 3 * GB, error: null })
    expect((await kopie(new Request('http://t'), ctx)).status).toBe(409)
    expect(db.writes.some((w) => w.method === 'insert')).toBe(false)
    expect(speicher.copy).not.toHaveBeenCalled()
  })

  it('räumt auf, wenn die Einlesung sich nicht kopieren lässt', async () => {
    speicher.copy.mockResolvedValueOnce({ data: null, error: { message: 'weg' } })
    const res = await kopie(new Request('http://t'), ctx)
    expect(res.status).toBe(502)
    expect(speicher.remove).toHaveBeenCalled()
    expect(db.writes.some((w) => w.method === 'delete')).toBe(true)
  })

  it('gibt für fremde Materialien 404', async () => {
    zeile = null
    expect((await kopie(new Request('http://t'), ctx)).status).toBe(404)
    expect(speicher.copy).not.toHaveBeenCalled()
  })
})

describe('KI-Antwort herunterladen', () => {
  it('liefert die gespeicherte Antwort als .yaml-Anhang mit sicherem Dateinamen', async () => {
    zeile = { ...MATERIAL, titel: 'Außenhandel: "Incoterms" / Teil 1' }
    const res = await antwort(new Request('http://t'), ctx)
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('title: Haftung')
    expect(res.headers.get('content-type')).toContain('text/yaml')
    expect(res.headers.get('x-content-type-options')).toBe('nosniff')
    const kopf = res.headers.get('content-disposition')!
    expect(kopf).toMatch(/^attachment; filename="[\x20-\x7e]+"; filename\*=UTF-8''/)
    expect(kopf).toContain(encodeURIComponent('Außenhandel_Incoterms_Teil_1.yaml'))
    expect(kopf).not.toContain('/')
  })

  it('gibt 404, wenn es keine Antwort gibt oder das Material fremd ist', async () => {
    zeile = { ...MATERIAL, antwort: null }
    expect((await antwort(new Request('http://t'), ctx)).status).toBe(404)
    zeile = null
    expect((await antwort(new Request('http://t'), ctx)).status).toBe(404)
  })
})
