import { describe, expect, it } from 'vitest'
import { baueVerbrauch, euroText, istMonatKey, monatBerlin, monatLabel, type VerbrauchLauf } from './werkzeugkiste-verbrauch'

const lauf = (id: string, gestartetAm: string, kostenEur: number, extra: Partial<VerbrauchLauf> = {}): VerbrauchLauf => ({
  id,
  werkzeug: 'skript',
  dateiName: 'heft.pdf',
  status: 'fertig',
  kostenEur,
  gestartetAm,
  ...extra,
})
const JETZT = new Date('2026-10-29T10:00:00Z')

describe('Verbrauch je Monat (PROJ-65)', () => {
  it('bildet Monate nach deutscher Zeit — Mitternacht am Monatsende gehört noch zum Vormonat', () => {
    expect(monatBerlin('2026-10-31T22:30:00Z')).toBe('2026-10') // 23:30 MEZ
    expect(monatBerlin('2026-10-31T23:30:00Z')).toBe('2026-11') // 00:30 MEZ
    expect(monatBerlin('2026-06-30T22:30:00Z')).toBe('2026-07') // Sommerzeit: 00:30
    expect(monatLabel('2026-10')).toBe('Oktober 2026')
  })

  it('summiert den Monat mit genauen Werten und zählt die Läufe', () => {
    const v = baueVerbrauch([lauf('a', '2026-10-28T08:00:00Z', 0.125), lauf('b', '2026-10-05T08:00:00Z', 0.5), lauf('c', '2026-09-30T08:00:00Z', 9)], null, JETZT)
    expect(v.gewaehlt).toMatchObject({ key: '2026-10', label: 'Oktober 2026', summe: '0,63 €', anzahl: 2 })
    expect(v.gewaehlt.zeilen.map((z) => z.id)).toEqual(['a', 'b']) // neueste zuerst
    expect(v.gewaehlt.zeilen[0]).toMatchObject({ datum: '28.10.', werkzeug: 'Ganzes Skript', titel: 'heft.pdf', betrag: '0,13 €', abgebrochen: false })
  })

  it('bietet den laufenden Monat und jeden Monat mit Verbrauch an, neueste zuerst', () => {
    const v = baueVerbrauch([lauf('c', '2026-08-02T08:00:00Z', 1), lauf('d', '2026-09-30T08:00:00Z', 1)], null, JETZT)
    expect(v.monate.map((m) => m.key)).toEqual(['2026-10', '2026-09', '2026-08'])
    expect(v.gewaehlt).toMatchObject({ key: '2026-10', summe: '0,00 €', anzahl: 0 })
    expect(v.hatVerbrauch).toBe(true)
  })

  it('wählt den Monat aus der Adresse und fällt bei Unsinn auf den laufenden zurück', () => {
    const l = [lauf('c', '2026-09-12T08:00:00Z', 2)]
    expect(baueVerbrauch(l, '2026-09', JETZT).gewaehlt.anzahl).toBe(1)
    for (const falsch of ['2026-13', 'abc', '2025-01', '', null, undefined]) {
      expect(baueVerbrauch(l, falsch, JETZT).gewaehlt.key).toBe('2026-10')
    }
    expect(istMonatKey('2026-09')).toBe(true)
    expect(istMonatKey('2026-9')).toBe(false)
  })

  it('lässt Läufe ohne Kosten weg und kennzeichnet abgebrochene', () => {
    const v = baueVerbrauch([lauf('x', '2026-10-01T08:00:00Z', 0), lauf('y', '2026-10-02T08:00:00Z', 0.3, { status: 'abgebrochen' })], null, JETZT)
    expect(v.gewaehlt.zeilen).toHaveLength(1)
    expect(v.gewaehlt.zeilen[0].abgebrochen).toBe(true)
  })

  it('zeigt ohne jeden Lauf den Leerzustand an und zeigt Beträge deutsch', () => {
    expect(baueVerbrauch([], null, JETZT).hatVerbrauch).toBe(false)
    expect(euroText(0.001)).toBe('< 0,01 €')
    expect(euroText(1234.5)).toBe('1.234,50 €')
  })

  it('nimmt für unbekannte Werkzeuge und fehlende Dateinamen sinnvolle Texte', () => {
    const v = baueVerbrauch([lauf('z', '2026-10-02T08:00:00Z', 1, { werkzeug: 'neu', dateiName: null })], null, JETZT)
    expect(v.gewaehlt.zeilen[0]).toMatchObject({ werkzeug: 'neu', titel: 'Skript' })
  })
})
