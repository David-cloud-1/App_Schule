import { describe, expect, it } from 'vitest'
import { gueltigeAuswahl } from './editor-schublade'
import type { Struktur } from '@/lib/werkzeugkiste-editor'

// PROJ-96: Die Schublade zeigt nur Stellen, die es im Entwurf noch gibt
const struktur = {
  cover: { title: 'Deckblatt' },
  chapters: [
    { title: 'Eins', elements: [{ type: 'text', content: 'a' }, { type: 'text', content: 'b' }] },
    { title: 'Zwei', elements: [] },
  ],
} as unknown as Struktur

describe('gueltigeAuswahl', () => {
  it('lässt vorhandene Stellen durch', () => {
    expect(gueltigeAuswahl({ art: 'thema', thema: 1 }, struktur)).toEqual({ art: 'thema', thema: 1 })
    expect(gueltigeAuswahl({ art: 'block', thema: 0, block: 1 }, struktur)).toEqual({ art: 'block', thema: 0, block: 1 })
    expect(gueltigeAuswahl({ art: 'deckblatt' }, struktur)).toEqual({ art: 'deckblatt' })
    expect(gueltigeAuswahl({ art: 'abschluss' }, struktur)).toEqual({ art: 'abschluss' })
  })

  it('ergibt null für Stellen, die es nicht (mehr) gibt', () => {
    expect(gueltigeAuswahl(null, struktur)).toBeNull()
    expect(gueltigeAuswahl({ art: 'thema', thema: 2 }, struktur)).toBeNull()
    expect(gueltigeAuswahl({ art: 'block', thema: 0, block: 2 }, struktur)).toBeNull()
    expect(gueltigeAuswahl({ art: 'block', thema: 1, block: 0 }, struktur)).toBeNull()
    expect(gueltigeAuswahl({ art: 'block', thema: 9, block: 0 }, struktur)).toBeNull()
  })
})
