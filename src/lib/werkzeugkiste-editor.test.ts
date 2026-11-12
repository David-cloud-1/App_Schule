import { describe, expect, it } from 'vitest'
import {
  befundeJeStelle,
  dupliziereBlock,
  dupliziereThema,
  istEditierbar,
  kurzzeile,
  loescheBlock,
  loescheThema,
  neuesThema,
  setzeAbschluss,
  setzeBlock,
  setzeThemaTitel,
  sprungmarke,
  typName,
  verschiebeBlock,
  verschiebeThema,
  type Struktur,
} from './werkzeugkiste-editor'

const b = (n: string) => ({ type: 'text', content: n })
const S: Struktur = {
  cover: { title: 'T' },
  chapters: [
    { title: 'A', elements: [b('a0'), b('a1'), b('a2')], extra: 'bleibt' },
    { title: 'B', elements: [b('b0')] },
  ],
  final_chapter: { title: 'Lernzielkontrolle' },
  unbekannt: 1,
}
const inhalte = (s: Struktur) => s.chapters.map((t) => t.elements.map((e) => e.content))

describe('Blöcke verschieben', () => {
  it('innerhalb eines Themas nach unten und oben (Ziel = Position vor dem Entfernen)', () => {
    expect(inhalte(verschiebeBlock(S, { thema: 0, block: 0 }, { thema: 0, block: 2 }))[0]).toEqual(['a1', 'a0', 'a2'])
    expect(inhalte(verschiebeBlock(S, { thema: 0, block: 0 }, { thema: 0, block: 3 }))[0]).toEqual(['a1', 'a2', 'a0'])
    expect(inhalte(verschiebeBlock(S, { thema: 0, block: 2 }, { thema: 0, block: 0 }))[0]).toEqual(['a2', 'a0', 'a1'])
  })

  it('in ein anderes Thema, auch ans Ende und in ein leeres', () => {
    expect(inhalte(verschiebeBlock(S, { thema: 0, block: 1 }, { thema: 1, block: 0 }))).toEqual([['a0', 'a2'], ['a1', 'b0']])
    expect(inhalte(verschiebeBlock(S, { thema: 0, block: 1 }, { thema: 1, block: 99 }))).toEqual([['a0', 'a2'], ['b0', 'a1']])
    const mitLeer = neuesThema(S)
    expect(inhalte(verschiebeBlock(mitLeer, { thema: 1, block: 0 }, { thema: 2, block: 0 }))[2]).toEqual(['b0'])
  })

  it('verändert das Original nie und liefert bei Unsinn dieselbe Struktur', () => {
    const vorher = JSON.stringify(S)
    verschiebeBlock(S, { thema: 0, block: 0 }, { thema: 1, block: 0 })
    expect(JSON.stringify(S)).toBe(vorher)
    expect(verschiebeBlock(S, { thema: 5, block: 0 }, { thema: 0, block: 0 })).toBe(S)
    expect(verschiebeBlock(S, { thema: 0, block: 9 }, { thema: 0, block: 0 })).toBe(S)
    expect(verschiebeBlock(S, { thema: 0, block: 1 }, { thema: 0, block: 1 })).toBe(S)
    expect(verschiebeBlock(S, { thema: 0, block: 1 }, { thema: 0, block: 2 })).toBe(S)
  })
})

describe('Themen', () => {
  it('verschieben, löschen, duplizieren, umbenennen, hinzufügen', () => {
    expect(verschiebeThema(S, 0, 1).chapters.map((t) => t.title)).toEqual(['B', 'A'])
    expect(verschiebeThema(S, 0, 5)).toBe(S)
    expect(loescheThema(S, 0).chapters.map((t) => t.title)).toEqual(['B'])
    const d = dupliziereThema(S, 0)
    expect(d.chapters.map((t) => t.title)).toEqual(['A', 'A (Kopie)', 'B'])
    expect(d.chapters[1].extra).toBe('bleibt')
    d.chapters[1].elements[0].content = 'geändert'
    expect(d.chapters[0].elements[0].content).toBe('a0') // tiefe Kopie
    expect(setzeThemaTitel(S, 1, 'Neu').chapters[1].title).toBe('Neu')
    expect(neuesThema(S).chapters[2]).toEqual({ title: 'Neues Thema', elements: [] })
  })
})

describe('Blöcke ändern', () => {
  it('löschen, duplizieren, ersetzen – unbekannte Felder bleiben erhalten', () => {
    expect(inhalte(loescheBlock(S, { thema: 0, block: 1 }))[0]).toEqual(['a0', 'a2'])
    const d = dupliziereBlock(S, { thema: 0, block: 0 })
    expect(inhalte(d)[0]).toEqual(['a0', 'a0', 'a1', 'a2'])
    expect(d.chapters[0].elements[0]).not.toBe(d.chapters[0].elements[1])
    const neu = setzeBlock(S, { thema: 1, block: 0 }, { type: 'true_false', question: 'Q' })
    expect(neu.chapters[1].elements[0]).toEqual({ type: 'true_false', question: 'Q' })
    expect(neu.unbekannt).toBe(1)
    expect(neu.chapters[0].extra).toBe('bleibt')
  })

  it('Lernzielkontrolle setzen und entfernen', () => {
    expect(setzeAbschluss(S, { title: 'X' }).final_chapter).toEqual({ title: 'X' })
    expect('final_chapter' in setzeAbschluss(S, undefined)).toBe(false)
  })
})

describe('Anzeige', () => {
  it('Klartext statt Fachbegriff', () => {
    expect(typName('fill_blanks')).toBe('Lückentext')
    expect(typName('was_neues')).toBe('Unbekannter Block')
  })

  it('Kurzzeile ohne HTML, Sternchen und Überlänge', () => {
    expect(kurzzeile({ type: 'text', content: '<div class="lernziele"><ul><li>Du kannst &amp; willst</li></ul></div>' })).toBe('Du kannst & willst')
    expect(kurzzeile({ type: 'fill_blanks', text: 'Der *Frachtführer* haftet' })).toBe('Der Frachtführer haftet')
    expect(kurzzeile({ type: 'dialog_cards', cards: [1, 2, 3] })).toBe('3 Einträge')
    expect(kurzzeile({ type: 'text', content: 'x '.repeat(100) }, 20)).toHaveLength(20)
    expect(kurzzeile({ type: 'text', content: '<script>alert(1)</script>' })).toBe('')
  })

  it('Befunde je Thema und Block zählen', () => {
    const k = befundeJeStelle([
      { text: 'a', schwere: 'hoch', stellen: [{ kapitel: 0, element: 2 }, { kapitel: 1 }] },
      { text: 'b', schwere: 'mittel', stellen: [{ kapitel: 0, element: 2 }, { abschluss: true }] },
    ])
    expect(k.get('k0-e2')).toBe(2)
    expect(k.get('k1')).toBe(1)
    expect(k.get('abschluss')).toBe(1)
    expect(befundeJeStelle(null).size).toBe(0)
  })

  it('Sprungmarken wie im Kern (data-wk)', () => {
    expect(sprungmarke({ thema: 2, block: 3 })).toBe('k2-e3')
    expect(sprungmarke({ thema: 1 })).toBe('k1')
    expect(sprungmarke('abschluss')).toBe('abschluss')
  })
})

describe('Was ist editierbar?', () => {
  it('nur fertige Seiten der fünf Kapitel-Werkzeuge', () => {
    for (const w of ['skript', 'kreativ', 'differenzierung', 'arbeitsblatt', 'lernsituation']) {
      expect(istEditierbar({ werkzeug: w, status: 'fertig', format: 'seite' })).toBe(true)
    }
    expect(istEditierbar({ werkzeug: 'skript', status: 'fertig', format: 'h5p' })).toBe(false)
    expect(istEditierbar({ werkzeug: 'skript', status: 'laeuft', format: 'seite' })).toBe(false)
    expect(istEditierbar({ werkzeug: 'kahoot', status: 'fertig', format: 'seite' })).toBe(false)
  })
})
