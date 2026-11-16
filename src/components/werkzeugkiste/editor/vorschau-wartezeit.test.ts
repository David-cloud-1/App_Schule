import { describe, expect, it } from 'vitest'
import { markenSchluessel, stelleStimmt, vorschauWartezeit } from '@/components/werkzeugkiste/editor/use-editor-zustand'
import type { Struktur } from '@/lib/werkzeugkiste-editor'

describe('vorschauWartezeit (PROJ-112)', () => {
  it('wartet ohne Messwert die Grundzeit', () => {
    expect(vorschauWartezeit(0)).toBe(1500)
    expect(vorschauWartezeit(NaN)).toBe(1500)
  })
  it('bleibt bei schnellen Bauten bei der Grundzeit', () => {
    expect(vorschauWartezeit(1200)).toBe(1500)
  })
  it('wartet nach langsamen Bauten die halbe Bauzeit', () => {
    expect(vorschauWartezeit(6000)).toBe(3000)
  })
  it('wartet nie länger als drei Sekunden', () => {
    expect(vorschauWartezeit(60_000)).toBe(3000)
  })
})

const struktur = (texte: string[], titel = 'Thema'): Struktur => ({
  cover: { title: 'T' },
  chapters: [{ title: titel, elements: texte.map((t) => ({ type: 'text', content: t })) }],
})

describe('stelleStimmt (PROJ-113): Klick in eine noch nicht neu gebaute Seite', () => {
  const gebaut = markenSchluessel(struktur(['A', 'B', 'C']))

  it('Deckblatt und Lernzielkontrolle stimmen immer, auch ohne gebauten Stand', () => {
    expect(stelleStimmt('deckblatt', struktur(['A']), null)).toBe(true)
    expect(stelleStimmt('abschluss', struktur(['A']), null)).toBe(true)
  })
  it('ohne sicheren gebauten Stand stimmt keine Nummerierung', () => {
    expect(stelleStimmt('k0-e1', struktur(['A', 'B', 'C']), null)).toBe(false)
  })
  it('ein anderer Block wurde bearbeitet: der angeklickte Block stimmt trotzdem', () => {
    expect(stelleStimmt('k0-e1', struktur(['A neu', 'B', 'C']), gebaut)).toBe(true)
  })
  it('der angeklickte Block wurde selbst geändert: stimmt nicht', () => {
    expect(stelleStimmt('k0-e0', struktur(['A neu', 'B', 'C']), gebaut)).toBe(false)
  })
  it('ein Block wurde davor eingefügt: die Nummern sind verschoben, stimmt nicht', () => {
    expect(stelleStimmt('k0-e1', struktur(['neu', 'A', 'B', 'C']), gebaut)).toBe(false)
  })
  it('ein Block wurde gelöscht: die Stelle gibt es nicht mehr', () => {
    expect(stelleStimmt('k0-e2', struktur(['A', 'B']), gebaut)).toBe(false)
  })
  it('Themen-Marke: gleicher Titel stimmt, anderer nicht', () => {
    expect(stelleStimmt('k0', struktur(['A', 'B', 'C']), gebaut)).toBe(true)
    expect(stelleStimmt('k0', struktur(['A', 'B', 'C'], 'Anders'), gebaut)).toBe(false)
  })
})
