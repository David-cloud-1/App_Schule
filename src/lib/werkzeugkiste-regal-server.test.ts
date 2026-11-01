import { describe, expect, it } from 'vitest'
import {
  fehlerAusFunktion,
  freigabeSchema,
  lesenZuStand,
  regalAbfrageSchema,
  vermerkZuRegal,
  zeileZuKarte,
  type RegalZeile,
} from '@/lib/werkzeugkiste-regal-server'

const U1 = '11111111-1111-4111-8111-111111111111'
const U2 = '22222222-2222-4222-8222-222222222222'

describe('Regal – Eingabeprüfung (PROJ-53)', () => {
  it('nimmt eine gültige Freigabe an und kürzt Leerzeichen der Notiz', () => {
    const r = freigabeSchema.safeParse({ stufe: 'fachbereich', fachId: U1, notiz: '  Für die 11. Klasse  ', bereiche: [U2] })
    expect(r.success).toBe(true)
    if (r.success) expect(r.data.notiz).toBe('Für die 11. Klasse')
  })

  it('lehnt unbekannte Stufen ab, auch „privat“ (das ist Löschen, nicht Speichern)', () => {
    expect(freigabeSchema.safeParse({ stufe: 'privat' }).success).toBe(false)
    expect(freigabeSchema.safeParse({ stufe: 'jeder' }).success).toBe(false)
    expect(freigabeSchema.safeParse({}).success).toBe(false)
  })

  it('lehnt eine zu lange Notiz und Steuerzeichen ab', () => {
    expect(freigabeSchema.safeParse({ stufe: 'alle', notiz: 'x'.repeat(201) }).success).toBe(false)
    expect(freigabeSchema.safeParse({ stufe: 'alle', notiz: 'x'.repeat(200) }).success).toBe(true)
    expect(freigabeSchema.safeParse({ stufe: 'alle', notiz: 'a\u0000b' }).success).toBe(false)
  })

  it('lehnt mehr als 50 Personen und Nicht-Kennungen ab', () => {
    const viele = Array.from({ length: 51 }, (_, i) => `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`)
    expect(freigabeSchema.safeParse({ stufe: 'ausgewaehlte', personen: viele }).success).toBe(false)
    expect(freigabeSchema.safeParse({ stufe: 'ausgewaehlte', personen: viele.slice(0, 50) }).success).toBe(true)
    expect(freigabeSchema.safeParse({ stufe: 'ausgewaehlte', personen: ['nicht-uuid'] }).success).toBe(false)
    expect(freigabeSchema.safeParse({ stufe: 'fachbereich', bereiche: ['x'] }).success).toBe(false)
  })

  it('prüft die Abfrage des Regals (Sortierung, Seite, Werkzeug, Länge)', () => {
    expect(regalAbfrageSchema.parse({})).toMatchObject({ suche: '', sortierung: 'neueste', seite: 1 })
    expect(regalAbfrageSchema.safeParse({ sortierung: 'zufall' }).success).toBe(false)
    expect(regalAbfrageSchema.safeParse({ seite: '0' }).success).toBe(false)
    expect(regalAbfrageSchema.safeParse({ suche: 'x'.repeat(101) }).success).toBe(false)
    expect(regalAbfrageSchema.safeParse({ werkzeug: 'gibt-es-nicht' }).success).toBe(false)
    expect(regalAbfrageSchema.safeParse({ fach: 'kein-uuid' }).success).toBe(false)
    expect(regalAbfrageSchema.safeParse({ werkzeug: 'skript', fach: U1, sortierung: 'geladen', seite: '2' }).success).toBe(true)
  })
})

describe('Regal – Umwandlung (PROJ-53)', () => {
  const zeile: RegalZeile = {
    freigabe_id: U1,
    titel: 'Haftung',
    werkzeug: 'skript',
    format: 'h5p',
    fach_id: null,
    fach_name: null,
    notiz: 'Für Klasse 11',
    besitzer_name: 'Frau Meier',
    von_mir: false,
    mit_mir_geteilt: true,
    hat_datei: true,
    geladen: '4',
    geteilt_am: '2026-11-01T08:00:00Z',
    gesamt: '9',
  }

  it('macht aus einer Zeile eine Karte; die Zahlen kommen aus der Datenbank als Text', () => {
    const k = zeileZuKarte(zeile)
    expect(k).toMatchObject({ id: U1, besitzerName: 'Frau Meier', mitMirGeteilt: true, geladen: 4, hatDatei: true })
  })

  it('gibt in der Karte nie Skript, Prompt oder Antwort heraus', () => {
    const k = zeileZuKarte({ ...zeile, ...({ antwort: 'GEHEIM', prompt: 'GEHEIM', skript: 'GEHEIM' } as object) })
    expect(JSON.stringify(k)).not.toContain('GEHEIM')
  })

  it('liest den Stand der Freigabe und ignoriert Unbrauchbares', () => {
    expect(lesenZuStand(null)).toBeNull()
    expect(lesenZuStand({ stufe: 'privat' })).toBeNull()
    const s = lesenZuStand({
      stufe: 'ausgewaehlte',
      fachId: U2,
      notiz: 'x',
      bereiche: [],
      personen: [{ id: U1, name: 'Herr Weiß', aktiv: false }],
    })
    expect(s?.personen[0]).toEqual({ id: U1, name: 'Herr Weiß', aktiv: false })
    expect(s?.fachId).toBe(U2)
    expect(s?.entnommenAm).toBeNull()
  })

  it('zählt Personen und Bereiche aus den eingebetteten Zählern', () => {
    expect(
      vermerkZuRegal({
        ablauf_id: U1,
        stufe: 'ausgewaehlte',
        entnommen_am: null,
        regal_freigabe_personen: [{ count: 3 }],
        regal_freigabe_bereiche: [{ count: 0 }],
      }),
    ).toEqual({ stufe: 'ausgewaehlte', personen: 3, bereiche: 0, entnommen: false })
    expect(vermerkZuRegal({ ablauf_id: U1, stufe: 'alle', entnommen_am: '2026-11-01T08:00:00Z' }).entnommen).toBe(true)
  })

  it('bildet Datenbankfehler ab: eigene Sätze 409, „nicht gefunden“ und „nicht erlaubt“ sehen gleich aus', async () => {
    const eigen = fehlerAusFunktion({ code: 'P0001', message: 'Bitte wähle mindestens einen Fachbereich.' })
    expect(eigen.status).toBe(409)
    expect((await eigen.json()).error).toBe('Bitte wähle mindestens einen Fachbereich.')
    const a = fehlerAusFunktion({ code: 'P0002', message: 'intern' })
    const b = fehlerAusFunktion({ code: '42501', message: 'intern' })
    expect([a.status, b.status]).toEqual([404, 404])
    expect(await a.json()).toEqual(await b.json())
    const unbekannt = fehlerAusFunktion({ code: 'XX000', message: 'relation "regal_freigaben" does not exist' })
    expect(unbekannt.status).toBe(500)
    expect(JSON.stringify(await unbekannt.json())).not.toContain('regal_freigaben')
  })
})
