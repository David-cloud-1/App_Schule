import { describe, expect, it } from 'vitest'
import {
  alleAbgelehnt,
  fallHref,
  fallSchrittAusParam,
  fundstelleKurz,
  istFallPfad,
  istKurzeFrage,
  kopierText,
  standAnzeige,
  wendeErsetzungenAn,
  type Entscheidung,
  type Fund,
  type Fundstelle,
} from '@/lib/schulrecht'

const text = 'Max Müller aus der 10b hat am 03.05.2026 gefehlt.'
const stelle = (t: string) => ({ start: text.indexOf(t), ende: text.indexOf(t) + t.length })
const funde: Fund[] = [
  { id: 0, art: 'vorname', text: 'Max Müller', ...stelle('Max Müller'), vorschlag: 'Schüler A' },
  { id: 1, art: 'klasse', text: '10b', ...stelle('10b'), vorschlag: 'Klasse X' },
  { id: 2, art: 'datum', text: '03.05.2026', ...stelle('03.05.2026'), vorschlag: '[Datum]' },
]

describe('Ersetzungen im Sachverhalt (PROJ-55, E3)', () => {
  it('nimmt ohne Entscheidung den Vorschlag', () => {
    expect(wendeErsetzungenAn(text, funde, {})).toBe('Schüler A aus der Klasse X hat am [Datum] gefehlt.')
  })

  it('lässt abgelehnte Stellen stehen und übernimmt geänderte Ersatztexte', () => {
    const e: Record<number, Entscheidung> = { 0: { art: 'aendern', text: 'Schülerin B' }, 2: { art: 'ablehnen' } }
    expect(wendeErsetzungenAn(text, funde, e)).toBe('Schülerin B aus der Klasse X hat am 03.05.2026 gefehlt.')
  })

  it('behandelt einen leeren Ersatztext wie eine Ablehnung', () => {
    expect(wendeErsetzungenAn(text, funde, { 0: { art: 'aendern', text: '  ' } })).toContain('Max Müller')
  })

  it('überspringt überlappende Funde und solche außerhalb des Textes', () => {
    const fremd: Fund[] = [
      ...funde,
      { id: 3, art: 'vorname', text: 'Müller', start: 4, ende: 10, vorschlag: 'X' },
      { id: 4, art: 'vorname', text: 'weg', start: 900, ende: 903, vorschlag: 'Y' },
    ]
    expect(wendeErsetzungenAn(text, fremd, {})).toBe('Schüler A aus der Klasse X hat am [Datum] gefehlt.')
  })

  it('verlangt eine Bestätigung nur, wenn Funde da sind und alle abgelehnt wurden', () => {
    const alle: Record<number, Entscheidung> = { 0: { art: 'ablehnen' }, 1: { art: 'ablehnen' }, 2: { art: 'ablehnen' } }
    expect(alleAbgelehnt(funde, alle)).toBe(true)
    expect(alleAbgelehnt(funde, { ...alle, 1: { art: 'annehmen' } })).toBe(false)
    expect(alleAbgelehnt([], {})).toBe(false)
  })
})

describe('Anzeige und Adressen (PROJ-55)', () => {
  const f: Fundstelle = {
    kuerzel: 'BayEUG',
    nr: 'Art. 56',
    vorschrift: 'Bayerisches Gesetz über das Erziehungs- und Unterrichtswesen',
    titel: 'Pflichten der Schüler',
    stand: '2026-07-01',
    rang: 'gesetz',
    text: '(1) Text.',
  }

  it('formatiert Stand-Datum und Kurzform', () => {
    expect(standAnzeige('2026-07-01')).toBe('01.07.2026')
    expect(standAnzeige('Juli 2026')).toBe('Juli 2026')
    expect(fundstelleKurz(f)).toBe('BayEUG Art. 56')
  })

  it('kopiert den Wortlaut mit Quellenangabe, bei Verwaltungsvorschriften mit Rang', () => {
    expect(kopierText(f)).toBe(
      'BayEUG Art. 56 – Pflichten der Schüler\n\n(1) Text.\n\nQuelle: Bayerisches Gesetz über das Erziehungs- und Unterrichtswesen, Stand 01.07.2026',
    )
    expect(kopierText({ ...f, rang: 'dienstordnung' })).toContain('keine Gesetzeskraft')
  })

  it('erkennt eine sehr kurze Frage', () => {
    expect(istKurzeFrage('Handy')).toBe(true)
    expect(istKurzeFrage('  Handy einkassieren ')).toBe(false)
  })

  it('kennt den Aktennotiz-Pfad für den Rahmen ohne Seitenleiste', () => {
    expect(istFallPfad('/admin/schulrecht/fall')).toBe(true)
    expect(istFallPfad('/admin/schulrecht/fall/abc')).toBe(true)
    expect(istFallPfad('/admin/schulrecht')).toBe(false)
    expect(istFallPfad(null)).toBe(false)
    expect(fallHref('a b', 2)).toBe('/admin/schulrecht/fall/a%20b?schritt=2')
  })

  it('öffnet vorwärts nur vorbereitete Schritte', () => {
    expect(fallSchrittAusParam({ prompt: null, schritt: 1 }, '3')).toBe(1)
    expect(fallSchrittAusParam({ prompt: 'x', schritt: 2 }, '3')).toBe(3)
    expect(fallSchrittAusParam({ prompt: 'x', schritt: 2 }, null)).toBe(2)
    expect(fallSchrittAusParam({ prompt: 'x', schritt: 2 }, 'abc')).toBe(2)
  })
})
