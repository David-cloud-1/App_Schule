import { describe, expect, it } from 'vitest'
import type { Struktur } from '@/lib/werkzeugkiste-editor'
import { abschlussFragen, auswahlText, gliederungVon, miniStruktur, waehleInhalte } from '@/lib/werkzeugkiste-uebernahme'

const S: Struktur = {
  cover: { title: 'Heft' },
  chapters: [
    { title: 'A', elements: [{ type: 'text', content: '<p>Hallo</p>' }, { type: 'true_false', statement: 'Wahr?' }, { type: 'gibt_es_nicht' }] },
    { title: 'B', elements: [{ type: 'image', path: 'images/eigen_0123abcd.png' }, { type: 'text', content: 'Zwei' }] },
  ],
  final_chapter: { title: 'Kontrolle', question_set: { questions: [{ type: 'true_false', question: 'F1' }, { type: 'multiple_choice', question: 'F2' }] } },
}
const leer = { themen: [], bloecke: [], fragen: [] }

describe('Gliederung', () => {
  it('nennt Titel, Typ, Kurzzeile und ob das Ziel den Typ kennt', () => {
    const g = gliederungVon(S)
    expect(g.themen.map((t) => t.titel)).toEqual(['A', 'B'])
    expect(g.themen[0].bloecke[0]).toMatchObject({ typ: 'text', kurz: 'Hallo', passt: true })
    expect(g.themen[0].bloecke[2].passt).toBe(false)
    expect(g.fragen).toHaveLength(2)
  })
  it('liefert keine Fragen, wenn es keine Lernzielkontrolle gibt', () => {
    expect(abschlussFragen({ cover: {}, chapters: [] })).toEqual([])
    expect(gliederungVon({ cover: {}, chapters: [{ elements: [] }] }).themen[0].titel).toBe('Ohne Titel')
  })
})

describe('waehleInhalte', () => {
  it('nimmt ganze Themen und lässt unbekannte Typen mit Zählung aus', () => {
    const r = waehleInhalte(S, { ...leer, themen: [0] })
    expect(r.themen).toHaveLength(1)
    expect(r.themen[0].elements.map((b) => b.type)).toEqual(['text', 'true_false'])
    expect(r.ausgelassen).toBe(1)
  })
  it('zählt Blöcke eines ganz gewählten Themas nicht doppelt', () => {
    const r = waehleInhalte(S, { themen: [1], bloecke: [{ thema: 1, block: 0 }, { thema: 0, block: 0 }], fragen: [] })
    expect(r.themen).toHaveLength(1)
    expect(r.bloecke).toHaveLength(1)
    expect(r.bloecke[0]).toMatchObject({ type: 'text', content: '<p>Hallo</p>' })
  })
  it('behält die Reihenfolge der Quelle und entfernt Doppelte', () => {
    const r = waehleInhalte(S, { ...leer, bloecke: [{ thema: 1, block: 1 }, { thema: 0, block: 1 }, { thema: 0, block: 1 }] })
    expect(r.bloecke.map((b) => b.type)).toEqual(['true_false', 'text'])
  })
  it('übernimmt Fragen der Lernzielkontrolle als einzelne Aufgaben', () => {
    const r = waehleInhalte(S, { ...leer, fragen: [1, 0] })
    expect(r.bloecke.map((b) => b.type)).toEqual(['true_false', 'multiple_choice'])
  })
  it('ignoriert Stellen, die es nicht gibt, und ungültige Zahlen', () => {
    const r = waehleInhalte(S, { themen: [9, -1, 1.5], bloecke: [{ thema: 0, block: 99 }, { thema: 7, block: 0 }], fragen: [5] })
    expect(r).toMatchObject({ themen: [], bloecke: [], ausgelassen: 0 })
  })
  it('liefert unabhängige Kopien', () => {
    const r = waehleInhalte(S, { ...leer, bloecke: [{ thema: 0, block: 0 }] })
    r.bloecke[0].content = 'geändert'
    expect(S.chapters[0].elements[0].content).toBe('<p>Hallo</p>')
  })
})

describe('Hilfen', () => {
  it('Text für die Fußzeile', () => {
    expect(auswahlText(1, 0)).toBe('1 Thema')
    expect(auswahlText(2, 3)).toBe('2 Themen und 3 Blöcke')
    expect(auswahlText(0, 1)).toBe('1 Block')
  })
  it('Mini-Struktur: Deckblatt der Quelle, einzelne Blöcke unter „Auswahl“', () => {
    const r = waehleInhalte(S, { themen: [1], bloecke: [{ thema: 0, block: 0 }], fragen: [] })
    const m = miniStruktur(S, r)
    expect(m.cover).toEqual({ title: 'Heft' })
    expect(m.chapters.map((t) => t.title)).toEqual(['B', 'Auswahl'])
  })
})
