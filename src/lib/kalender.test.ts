import { describe, it, expect } from 'vitest'
import {
  abwesenheitInputSchema,
  abwesenheitUpdateSchema,
  addTage,
  artInputSchema,
  heuteInBerlin,
  isIsoDate,
  kalenderErrorStatus,
  listeQuerySchema,
  tageZwischen,
  vertretungSchema,
  zeitraumText,
} from './kalender'

const P = '11111111-1111-4111-8111-111111111111'
const A = '22222222-2222-4222-8222-222222222222'

const gueltig = {
  person_id: P,
  art_id: A,
  datum_von: '2026-11-24',
  datum_bis: '2026-11-25',
  abteilungen: ['spedition'],
}

const fehler = (input: unknown) => {
  const r = abwesenheitInputSchema.safeParse(input)
  return r.success ? null : r.error.issues[0]?.message
}

describe('abwesenheitInputSchema', () => {
  it('nimmt einen ganztägigen Eintrag mit Abteilung an und setzt Standardwerte', () => {
    const r = abwesenheitInputSchema.parse(gueltig)
    expect(r.ganztaegig).toBe(true)
    expect(r.alle_abteilungen).toBe(false)
    expect(r.freitext).toBeNull()
    expect(r.notiz).toBeNull()
  })

  it('verlangt eine Abteilung oder „Alle Abteilungen“', () => {
    expect(fehler({ ...gueltig, abteilungen: [] })).toBe('Bitte mindestens eine Abteilung oder „Alle Abteilungen“ wählen.')
    expect(fehler({ ...gueltig, abteilungen: [], alle_abteilungen: true })).toBeNull()
  })

  it('lehnt unbekannte Abteilungen ab', () => {
    expect(fehler({ ...gueltig, abteilungen: ['marketing'] })).toBe('Unbekannte Abteilung.')
  })

  it('prüft Von ≤ Bis und höchstens ein Jahr', () => {
    expect(fehler({ ...gueltig, datum_von: '2026-11-25', datum_bis: '2026-11-24' })).toBe('„Bis“ darf nicht vor „Von“ liegen.')
    expect(fehler({ ...gueltig, datum_von: '2026-01-01', datum_bis: '2027-01-02' })).toBe(
      'Ein Eintrag darf höchstens ein Jahr lang sein.',
    )
  })

  it('lehnt unmögliche Daten ab', () => {
    expect(fehler({ ...gueltig, datum_von: '2026-02-31' })).toBe('Bitte ein gültiges Datum angeben.')
  })

  it('verlangt bei Uhrzeiten beide Zeiten und am selben Tag bis > von', () => {
    const tag = { ...gueltig, datum_bis: gueltig.datum_von, ganztaegig: false }
    expect(fehler(tag)).toBe('Bitte Uhrzeit von und bis angeben.')
    expect(fehler({ ...tag, zeit_von: '10:00', zeit_bis: '09:00' })).toBe('Die Uhrzeit „bis“ muss nach „von“ liegen.')
    expect(fehler({ ...tag, zeit_von: '08:00', zeit_bis: '11:15' })).toBeNull()
    // über mehrere Tage darf „bis“ früher am Tag liegen
    expect(fehler({ ...gueltig, ganztaegig: false, zeit_von: '13:00', zeit_bis: '10:00' })).toBeNull()
  })

  it('begrenzt Freitext und Notiz auf 300 Zeichen und leert reine Leerzeichen', () => {
    expect(fehler({ ...gueltig, notiz: 'x'.repeat(301) })).toBe('Höchstens 300 Zeichen.')
    expect(abwesenheitInputSchema.parse({ ...gueltig, freitext: '   ' }).freitext).toBeNull()
  })

  it('verlangt beim Ändern die gesehene Version', () => {
    expect(abwesenheitUpdateSchema.safeParse(gueltig).success).toBe(false)
    expect(abwesenheitUpdateSchema.safeParse({ ...gueltig, version: 3 }).success).toBe(true)
  })
})

describe('vertretungSchema', () => {
  it('kennt nur die drei Status', () => {
    expect(vertretungSchema.safeParse({ version: 1, status: 'eingetragen' }).success).toBe(true)
    expect(vertretungSchema.safeParse({ version: 1, status: 'nicht_noetig' }).success).toBe(true)
    expect(vertretungSchema.safeParse({ version: 1, status: 'erledigt' }).success).toBe(false)
  })
})

describe('listeQuerySchema', () => {
  it('begrenzt den Zeitraum auf gut zwei Monate', () => {
    expect(listeQuerySchema.safeParse({ von: '2026-11-01', bis: '2026-12-31' }).success).toBe(true)
    expect(listeQuerySchema.safeParse({ von: '2026-01-01', bis: '2026-12-31' }).success).toBe(false)
  })
})

describe('artInputSchema', () => {
  it('erlaubt nur Farben aus den Tokens und Symbole aus der Auswahl', () => {
    expect(artInputSchema.safeParse({ name: 'Personalrat', farbe: 'blue', icon: 'users' }).success).toBe(true)
    expect(artInputSchema.safeParse({ name: 'Personalrat', farbe: '#ff0000', icon: 'users' }).success).toBe(false)
    expect(artInputSchema.safeParse({ name: 'Personalrat', farbe: 'blue', icon: 'skull' }).success).toBe(false)
  })
})

describe('kalenderErrorStatus', () => {
  it('übersetzt die Fehler der Datenbank-Funktionen', () => {
    expect(kalenderErrorStatus('ABW01')).toBe(429)
    expect(kalenderErrorStatus('ABW02')).toBe(404)
    expect(kalenderErrorStatus('ABW03')).toBe(403)
    expect(kalenderErrorStatus('ABW04')).toBe(400)
    expect(kalenderErrorStatus('ABW06')).toBe(409)
    expect(kalenderErrorStatus('42501')).toBeNull()
    expect(kalenderErrorStatus(undefined)).toBeNull()
  })
})

describe('Datum', () => {
  it('rechnet heute in deutscher Ortszeit (kurz nach Mitternacht in Berlin = schon der neue Tag)', () => {
    // 23:30 UTC am 23.11. = 00:30 in Berlin am 24.11. (Winterzeit)
    expect(heuteInBerlin(new Date('2026-11-23T23:30:00Z'))).toBe('2026-11-24')
    // Sommerzeit: 22:30 UTC am 30.06. = 00:30 am 01.07.
    expect(heuteInBerlin(new Date('2026-06-30T22:30:00Z'))).toBe('2026-07-01')
  })

  it('verschiebt Daten über Monats-, Jahres- und Zeitumstellungsgrenzen', () => {
    expect(addTage('2026-12-31', 1)).toBe('2027-01-01')
    expect(addTage('2026-03-28', 2)).toBe('2026-03-30')
    expect(addTage('2026-10-24', 2)).toBe('2026-10-26')
    expect(tageZwischen('2026-03-28', '2026-03-30')).toBe(2)
  })

  it('prüft echte Kalenderdaten', () => {
    expect(isIsoDate('2028-02-29')).toBe(true)
    expect(isIsoDate('2026-02-29')).toBe(false)
    expect(isIsoDate('24.11.2026')).toBe(false)
  })

  it('schreibt Zeiträume deutsch', () => {
    expect(zeitraumText('2026-11-24', '2026-11-24')).toBe('24.11.2026')
    expect(zeitraumText('2026-11-24', '2026-11-25')).toBe('24.11.–25.11.2026')
    expect(zeitraumText('2026-12-30', '2027-01-02')).toBe('30.12.2026–02.01.2027')
  })
})
