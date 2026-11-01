import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextResponse } from 'next/server'
import { chainMock } from '@/test/supabase-chain-mock'

vi.mock('@/app/api/admin/_lib/auth', () => ({ requireTeacherOrAdmin: vi.fn() }))
vi.mock('@/lib/supabase-server', () => ({ createServiceClient: vi.fn() }))

import { requireTeacherOrAdmin } from '@/app/api/admin/_lib/auth'
import { createServiceClient } from '@/lib/supabase-server'
import { GET as regalListe } from './regal/route'
import { GET as lehrkraefte } from './regal/lehrkraefte/route'
import { GET as optionen } from './regal/optionen/route'
import { GET as regalDownload } from './regal/[id]/download/route'
import { GET as freigabeLesen, PUT as freigabeSetzen, DELETE as freigabeEntfernen } from './ablaeufe/[id]/freigabe/route'
import { GET as materialien } from './materialien/route'

/**
 * Regal des Kollegiums (PROJ-53, Paket 1): Schnittstellen. Wer was sehen darf,
 * entscheidet die Datenbank (regal_darf_sehen); hier wird geprüft, dass jede
 * Route die Rolle verlangt, die Eingabe formt, die richtigen Funktionen mit
 * den richtigen Werten ruft und nichts aus dem Skript herausgibt.
 */

const F1 = '11111111-1111-4111-8111-111111111111'
const A1 = '22222222-2222-4222-8222-222222222222'
const D1 = '33333333-3333-4333-8333-333333333333'
const ctxF = { params: Promise.resolve({ id: F1 }) }
const ctxA = { params: Promise.resolve({ id: A1 }) }
const ctxKaputt = { params: Promise.resolve({ id: 'kein-uuid' }) }

let rpc: ReturnType<typeof vi.fn>
let db: ReturnType<typeof chainMock>
let tabellen: Record<string, unknown>

function anmelden(rpcAntworten: Record<string, { data?: unknown; error?: unknown }> = {}) {
  rpc = vi.fn((name: string) => Promise.resolve({ data: null, error: null, ...(rpcAntworten[name] ?? {}) }))
  db = chainMock((t) => ({ data: tabellen[t] ?? null }), { rpc })
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

function ablehnen(status: number) {
  vi.mocked(requireTeacherOrAdmin).mockResolvedValue({
    error: NextResponse.json({ error: 'x' }, { status }),
    user: null,
    supabase: null,
  } as never)
}

function karte(extra: Record<string, unknown> = {}) {
  return {
    freigabe_id: F1,
    titel: 'Haftung',
    werkzeug: 'skript',
    format: 'h5p',
    fach_id: null,
    fach_name: null,
    notiz: null,
    besitzer_name: 'Frau Meier',
    von_mir: false,
    mit_mir_geteilt: false,
    hat_datei: true,
    geladen: 2,
    geteilt_am: '2026-11-01T08:00:00Z',
    gesamt: 31,
    ...extra,
  }
}

beforeEach(() => {
  tabellen = {}
  vi.mocked(createServiceClient).mockReset()
})

describe('Regal – Rechte (PROJ-53)', () => {
  it.each([
    ['Regal', () => regalListe(new Request('http://t/api'))],
    ['Personensuche', () => lehrkraefte(new Request('http://t/api?suche=me'))],
    ['Optionen', () => optionen()],
    ['Download', () => regalDownload(new Request('http://t/api'), ctxF)],
    ['Freigabe lesen', () => freigabeLesen(new Request('http://t/api'), ctxA)],
    ['Freigabe speichern', () => freigabeSetzen(new Request('http://t/api', { method: 'PUT', body: '{}' }), ctxA)],
    ['Freigabe entfernen', () => freigabeEntfernen(new Request('http://t/api', { method: 'DELETE' }), ctxA)],
  ])('%s: ohne Lehrer-Rolle kommt nichts durch (Azubis nie)', async (_n, aufruf) => {
    for (const status of [401, 403]) {
      ablehnen(status)
      expect((await aufruf()).status).toBe(status)
    }
  })
})

describe('Regal – Liste', () => {
  it('ruft die Datenbankfunktion mit Suche, Filtern, Sortierung und Versatz', async () => {
    anmelden({ regal_liste: { data: [karte()] }, regal_filterwerte: { data: [] } })
    const res = await regalListe(new Request(`http://t/api?suche=Haftung&fach=${D1}&werkzeug=skript&sortierung=geladen&seite=2`))
    expect(res.status).toBe(200)
    expect(rpc).toHaveBeenCalledWith('regal_liste', {
      p_suche: 'Haftung',
      p_fach: D1,
      p_werkzeug: 'skript',
      p_sort: 'geladen',
      p_limit: 30,
      p_offset: 30,
    })
  })

  it('meldet „mehr vorhanden“ ab 30 Einträgen und liefert die Filterwerte nur bei Seite 1', async () => {
    anmelden({
      regal_liste: { data: [karte({ gesamt: 31 })] },
      regal_filterwerte: {
        data: [
          { art: 'fach', schluessel: D1, bezeichnung: 'Recht' },
          { art: 'werkzeug', schluessel: 'skript', bezeichnung: 'skript' },
        ],
      },
    })
    const erste = await (await regalListe(new Request('http://t/api'))).json()
    expect(erste.gesamt).toBe(31)
    expect(erste.hatMehr).toBe(true)
    expect(erste.filter).toEqual({ faecher: [{ id: D1, name: 'Recht' }], werkzeuge: ['skript'] })

    rpc.mockClear()
    const zweite = await (await regalListe(new Request('http://t/api?seite=2'))).json()
    expect(zweite.filter).toBeUndefined()
    expect(rpc).not.toHaveBeenCalledWith('regal_filterwerte')
  })

  it('zeigt ein leeres Regal als leere Liste', async () => {
    anmelden({ regal_liste: { data: [] }, regal_filterwerte: { data: [] } })
    const j = await (await regalListe(new Request('http://t/api'))).json()
    expect(j).toMatchObject({ eintraege: [], gesamt: 0, hatMehr: false })
  })

  it('lehnt ungültige Eingaben ab, ohne die Datenbank zu fragen', async () => {
    anmelden()
    for (const q of ['sortierung=zufall', 'seite=0', `suche=${'x'.repeat(101)}`, 'fach=kein-uuid', 'werkzeug=gibt-es-nicht']) {
      expect((await regalListe(new Request(`http://t/api?${q}`))).status).toBe(400)
    }
    expect(rpc).not.toHaveBeenCalled()
  })

  it('meldet einen Datenbankfehler ruhig, ohne Technik', async () => {
    anmelden({ regal_liste: { error: { code: 'XX000', message: 'relation does not exist' } } })
    const res = await regalListe(new Request('http://t/api'))
    expect(res.status).toBe(500)
    expect(JSON.stringify(await res.json())).not.toContain('relation')
  })

  it('gibt nur schmale Karten heraus', async () => {
    anmelden({ regal_liste: { data: [karte({ antwort: 'GEHEIM', prompt: 'GEHEIM' })] }, regal_filterwerte: { data: [] } })
    const text = await (await regalListe(new Request('http://t/api'))).text()
    expect(text).not.toContain('GEHEIM')
  })
})

describe('Regal – Personensuche', () => {
  it('fragt unter 2 Zeichen gar nicht erst', async () => {
    anmelden()
    const j = await (await lehrkraefte(new Request('http://t/api?suche=m'))).json()
    expect(j.lehrkraefte).toEqual([])
    expect(rpc).not.toHaveBeenCalled()
  })

  it('liefert nur Kennung und Name, nie mehr', async () => {
    anmelden({ regal_lehrkraefte: { data: [{ id: A1, name: 'Frau Meier', email: 'geheim@schule.de' }] } })
    const text = await (await lehrkraefte(new Request('http://t/api?suche=Meier'))).text()
    expect(JSON.parse(text).lehrkraefte).toEqual([{ id: A1, name: 'Frau Meier' }])
    expect(text).not.toContain('geheim')
  })
})

describe('Regal – Optionen für den Dialog', () => {
  it('nennt meine Fachbereiche (Eintrag unter Meine Fächer und Bereichs-Admin) und meine Fächer zuerst', async () => {
    tabellen = {
      teacher_subject_assignments: [{ department_id: 'D-SPED', subject_id: 'F-KSK' }],
      profiles: { role: 'department_admin', department_id: 'D-TOUR' },
    }
    anmelden()
    const service = chainMock((t) =>
      t === 'departments'
        ? { data: [{ id: 'D-SPED', name: 'Spedition' }, { id: 'D-TOUR', name: 'Tourismus' }] }
        : { data: [{ id: 'F-BGP', name: 'BGP' }, { id: 'F-KSK', name: 'KSK' }] },
    )
    vi.mocked(createServiceClient).mockReturnValue(service.client as never)
    const j = await (await optionen()).json()
    expect(j.bereiche.map((b: { name: string }) => b.name)).toEqual(['Spedition', 'Tourismus'])
    expect(j.faecher[0]).toEqual({ id: 'F-KSK', name: 'KSK', eigen: true })
    expect(j.faecher[1].eigen).toBe(false)
    const abfrage = service.queries.find((q) => q.table === 'departments')!
    expect(abfrage.calls.find((c) => c.method === 'in')?.args[1]).toEqual(['D-SPED', 'D-TOUR'])
  })

  it('fragt ohne Fachbereich gar keine Bereiche ab (Lehrkraft ohne Fachbereich, PROJ-46)', async () => {
    tabellen = { teacher_subject_assignments: [], profiles: { role: 'teacher', department_id: null } }
    anmelden()
    const service = chainMock(() => ({ data: [] }))
    vi.mocked(createServiceClient).mockReturnValue(service.client as never)
    const j = await (await optionen()).json()
    expect(j.bereiche).toEqual([])
    expect(service.queries.some((q) => q.table === 'departments')).toBe(false)
  })
})

describe('Regal – Download', () => {
  function speicherMock(vorhanden = true) {
    const speicher = {
      list: vi.fn().mockResolvedValue({ data: vorhanden ? [{ name: 'ausgabe' }] : [], error: null }),
      createSignedUrl: vi.fn().mockResolvedValue({ data: { signedUrl: 'https://speicher.test/lesen?token=t' } }),
    }
    vi.mocked(createServiceClient).mockReturnValue(chainMock(() => ({ data: null }), { storage: { from: () => speicher } }).client as never)
    return speicher
  }

  it('antwortet auf eine ungültige Kennung mit 404, ohne die Datenbank zu fragen', async () => {
    anmelden()
    expect((await regalDownload(new Request('http://t/api'), ctxKaputt)).status).toBe(404)
    expect(rpc).not.toHaveBeenCalled()
  })

  it('antwortet mit 404, wenn die Datenbank nichts herausgibt (nicht sichtbar oder nicht vorhanden)', async () => {
    anmelden({ regal_download_vorbereiten: { data: [] } })
    speicherMock()
    const res = await regalDownload(new Request('http://t/api'), ctxF)
    expect(res.status).toBe(404)
    expect(rpc).toHaveBeenCalledWith('regal_download_vorbereiten', { p_freigabe_id: F1 })
  })

  it('leitet auf den kurzlebigen Link um, mit Dateinamen', async () => {
    anmelden({ regal_download_vorbereiten: { data: [{ ablauf_id: A1, owner_id: 'u2', dateiname: 'Übung.h5p' }] } })
    const speicher = speicherMock()
    const res = await regalDownload(new Request('http://t/api'), ctxF)
    expect(res.status).toBe(302)
    expect(res.headers.get('location')).toBe('https://speicher.test/lesen?token=t&download=%C3%9Cbung.h5p')
    // Der Pfad liegt im Ordner der Besitzerin oder des Besitzers, nicht der ladenden Person
    expect(speicher.createSignedUrl).toHaveBeenCalledWith(`u2/${A1}/ausgabe`, 120)
  })

  it('liefert mit ?pruefen=1 die Adresse als JSON und meldet eine fehlende Datei ruhig', async () => {
    anmelden({ regal_download_vorbereiten: { data: [{ ablauf_id: A1, owner_id: 'u2', dateiname: 'a.h5p' }] } })
    speicherMock()
    const ok = await regalDownload(new Request('http://t/x?pruefen=1'), ctxF)
    expect((await ok.json()).url).toContain('https://speicher.test/lesen')

    speicherMock(false)
    const fehlt = await regalDownload(new Request('http://t/x?pruefen=1'), ctxF)
    expect(fehlt.status).toBe(404)
    expect((await fehlt.json()).error).toMatch(/nicht mehr vorhanden/)
  })
})

describe('Regal – Freigabe des eigenen Materials', () => {
  const material = { id: A1, owner_id: 'u1', status: 'fertig' }

  it('antwortet für fremde, fehlende und unfertige Materialien mit 404', async () => {
    for (const zeile of [null, { ...material, owner_id: 'anderer' }, { ...material, status: 'laeuft' }]) {
      tabellen = { werkzeug_ablaeufe: zeile }
      anmelden()
      expect((await freigabeLesen(new Request('http://t/api'), ctxA)).status).toBe(404)
      expect((await freigabeSetzen(new Request('http://t/api', { method: 'PUT', body: JSON.stringify({ stufe: 'alle' }) }), ctxA)).status).toBe(404)
      expect((await freigabeEntfernen(new Request('http://t/api', { method: 'DELETE' }), ctxA)).status).toBe(404)
      expect(rpc).not.toHaveBeenCalled()
    }
  })

  it('liest den Stand; „Nur ich“ ist freigabe: null', async () => {
    tabellen = { werkzeug_ablaeufe: material }
    anmelden({ regal_freigabe_lesen: { data: null } })
    expect((await (await freigabeLesen(new Request('http://t/api'), ctxA)).json()).freigabe).toBeNull()

    anmelden({
      regal_freigabe_lesen: {
        data: { stufe: 'alle', fachId: null, notiz: 'x', bereiche: [], personen: [], entnommenAm: null, entnommenGrund: null },
      },
    })
    const j = await (await freigabeLesen(new Request('http://t/api'), ctxA)).json()
    expect(j.freigabe).toMatchObject({ stufe: 'alle', notiz: 'x' })
    expect(rpc).toHaveBeenCalledWith('regal_freigabe_lesen', { p_ablauf_id: A1 })
  })

  it('teilt über die Datenbankfunktion mit allen Werten', async () => {
    tabellen = { werkzeug_ablaeufe: material }
    anmelden({ regal_freigabe_setzen: { data: F1 } })
    const res = await freigabeSetzen(
      new Request('http://t/api', {
        method: 'PUT',
        body: JSON.stringify({ stufe: 'fachbereich', fachId: D1, notiz: ' Klasse 11 ', bereiche: [F1], personen: [] }),
      }),
      ctxA,
    )
    expect(res.status).toBe(200)
    expect(rpc).toHaveBeenCalledWith('regal_freigabe_setzen', {
      p_ablauf_id: A1,
      p_stufe: 'fachbereich',
      p_fach_id: D1,
      p_notiz: 'Klasse 11',
      p_bereiche: [F1],
      p_personen: [],
    })
  })

  it('lehnt kaputte Eingaben ab, ohne die Datenbank zu fragen', async () => {
    tabellen = { werkzeug_ablaeufe: material }
    anmelden()
    for (const body of [{ stufe: 'privat' }, { stufe: 'alle', notiz: 'x'.repeat(201) }, { stufe: 'alle', personen: ['x'] }, null]) {
      const res = await freigabeSetzen(new Request('http://t/api', { method: 'PUT', body: JSON.stringify(body) }), ctxA)
      expect(res.status).toBe(400)
    }
    expect(rpc).not.toHaveBeenCalled()
  })

  it('zeigt die Sätze der Datenbank (z. B. Entnahme-Sperre) als 409', async () => {
    tabellen = { werkzeug_ablaeufe: material }
    anmelden({ regal_freigabe_setzen: { error: { code: 'P0001', message: 'Dieses Material wurde vom Admin aus dem Regal genommen und kann nicht erneut geteilt werden.' } } })
    const res = await freigabeSetzen(new Request('http://t/api', { method: 'PUT', body: JSON.stringify({ stufe: 'alle' }) }), ctxA)
    expect(res.status).toBe(409)
    expect((await res.json()).error).toMatch(/vom Admin aus dem Regal genommen/)
  })

  it('nimmt das Material mit „Nur ich“ sofort aus dem Regal', async () => {
    tabellen = { werkzeug_ablaeufe: material }
    anmelden()
    expect((await freigabeEntfernen(new Request('http://t/api', { method: 'DELETE' }), ctxA)).status).toBe(200)
    expect(rpc).toHaveBeenCalledWith('regal_freigabe_entfernen', { p_ablauf_id: A1 })
  })
})

describe('Meine Materialien – Spalte „Regal“', () => {
  it('hängt an fertige Materialien den Vermerk der eigenen Freigabe und lässt andere privat', async () => {
    const zeile = (id: string, extra: object = {}) => ({
      id,
      werkzeug: 'skript',
      status: 'fertig',
      schritt: 5,
      titel: id,
      datei_name: null,
      hat_antwort: true,
      skript_entfernt_am: null,
      created_at: '2026-10-01T08:00:00Z',
      updated_at: '2026-10-01T08:00:00Z',
      laeuft_ab_am: null,
      ...extra,
    })
    tabellen = {
      werkzeug_ablaeufe: [zeile('m1'), zeile('m2')],
      regal_freigaben: [{ ablauf_id: 'm1', stufe: 'ausgewaehlte', entnommen_am: null, regal_freigabe_personen: [{ count: 3 }], regal_freigabe_bereiche: [{ count: 0 }] }],
    }
    anmelden()
    const j = await (await materialien(new Request('http://t/api'))).json()
    expect(j.eintraege.find((e: { id: string }) => e.id === 'm1').regal).toEqual({ stufe: 'ausgewaehlte', personen: 3, bereiche: 0, entnommen: false })
    expect(j.eintraege.find((e: { id: string }) => e.id === 'm2').regal).toBeUndefined()
  })

  it('bleibt ruhig, wenn die Freigaben nicht abrufbar sind (alle gelten dann als privat)', async () => {
    tabellen = { werkzeug_ablaeufe: [{ id: 'm1', werkzeug: 'skript', status: 'fertig', schritt: 5, titel: 'x', created_at: '2026-10-01T08:00:00Z', updated_at: '2026-10-01T08:00:00Z' }] }
    anmelden()
    db.client.from = vi.fn((t: string) => {
      const b = chainMock((tt) => (tt === 'regal_freigaben' ? { data: null, error: { code: '42P01' } } : { data: tabellen[tt] ?? null }))
      return b.client.from(t)
    }) as never
    const res = await materialien(new Request('http://t/api'))
    expect(res.status).toBe(200)
  })
})
