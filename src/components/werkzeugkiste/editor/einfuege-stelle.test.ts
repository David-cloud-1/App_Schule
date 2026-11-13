import { describe, expect, it } from 'vitest'
import { einfuegeortAusAuswahl, einfuegeortAusMarke, neuesThemaNach, themaDerAuswahl } from './einfuege-stelle'
import type { Struktur } from '@/lib/werkzeugkiste-editor'

const S: Struktur = {
  cover: { title: 'X' },
  chapters: [
    { title: 'A', elements: [{ type: 'text' }, { type: 'fill_blanks' }] },
    { title: 'B', elements: [] },
    { title: 'C', elements: [{ type: 'text' }] },
  ],
  final_chapter: { title: 'Z' },
}
const OHNE_THEMA: Struktur = { cover: { title: 'X' }, chapters: [], final_chapter: { title: 'Z' } }

describe('Wohin kommt der neue Block? (PROJ-97)', () => {
  it('Block gewählt: direkt dahinter', () => {
    expect(einfuegeortAusAuswahl({ art: 'block', thema: 0, block: 0 }, S)).toEqual({ thema: 0, index: 1 })
    expect(einfuegeortAusAuswahl({ art: 'block', thema: 0, block: 1 }, S)).toEqual({ thema: 0, index: 2 })
  })
  it('Thema gewählt: am Ende dieses Themas', () => {
    expect(einfuegeortAusAuswahl({ art: 'thema', thema: 0 }, S)).toEqual({ thema: 0, index: 2 })
    expect(einfuegeortAusAuswahl({ art: 'thema', thema: 1 }, S)).toEqual({ thema: 1, index: 0 })
  })
  it('Deckblatt, Lernzielkontrolle oder nichts gewählt: am Ende des letzten Themas', () => {
    for (const a of [{ art: 'deckblatt' as const }, { art: 'abschluss' as const }, null])
      expect(einfuegeortAusAuswahl(a, S)).toEqual({ thema: 2, index: 1 })
  })
  it('eine Auswahl, die es nicht mehr gibt, fällt auf das Ende des letzten Themas zurück', () => {
    expect(einfuegeortAusAuswahl({ art: 'block', thema: 9, block: 0 }, S)).toEqual({ thema: 2, index: 1 })
    expect(einfuegeortAusAuswahl({ art: 'thema', thema: 9 }, S)).toEqual({ thema: 2, index: 1 })
  })
  it('ohne Thema: null (Thema 1 entsteht erst mit dem Block)', () => {
    expect(einfuegeortAusAuswahl(null, OHNE_THEMA)).toBeNull()
    expect(einfuegeortAusAuswahl({ art: 'deckblatt' }, OHNE_THEMA)).toBeNull()
  })
})

describe('Stelle aus der Marke der Vorschau', () => {
  it('Block → dahinter, Thema → am Anfang', () => {
    expect(einfuegeortAusMarke('k0-e1', S)).toEqual({ thema: 0, index: 2 })
    expect(einfuegeortAusMarke('k2', S)).toEqual({ thema: 2, index: 0 })
  })
  it('Lernzielkontrolle, Fremdes und Stellen, die es nicht gibt: undefined', () => {
    for (const m of ['abschluss', 'abschluss-summary', 'k9', 'k0-e2', 'k1-e0', '', 'k0" x', 7, null, undefined, {}])
      expect(einfuegeortAusMarke(m, S)).toBeUndefined()
  })
})

describe('Neues Thema hinter dem gewählten', () => {
  it('fügt hinter dem Thema ein, sonst am Ende', () => {
    const r = neuesThemaNach(S, 0)
    expect(r.index).toBe(1)
    expect(r.struktur.chapters.map((t) => t.title)).toEqual(['A', 'Neues Thema', 'B', 'C'])
    expect(neuesThemaNach(S, null).index).toBe(3)
    expect(neuesThemaNach(S, 9).index).toBe(3)
    expect(neuesThemaNach(OHNE_THEMA, null).struktur.chapters).toHaveLength(1)
  })
  it('verändert die Eingabe nicht', () => {
    neuesThemaNach(S, 0)
    expect(S.chapters).toHaveLength(3)
  })
  it('„hinter welchem Thema?“ aus der Auswahl', () => {
    expect(themaDerAuswahl({ art: 'thema', thema: 1 })).toBe(1)
    expect(themaDerAuswahl({ art: 'block', thema: 2, block: 0 })).toBe(2)
    expect(themaDerAuswahl({ art: 'abschluss' })).toBeNull()
    expect(themaDerAuswahl(null)).toBeNull()
  })
})
