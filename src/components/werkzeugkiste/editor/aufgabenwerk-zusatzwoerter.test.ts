import { describe, expect, it } from 'vitest'
import { FINDER, teileVon, uebernimmAufgabe, BAUPLAENE } from './aufgabenwerk/bauplan'

/** „Wörter ziehen“ mit Zusatzwörtern (distractors) im Aufgabenwerk */
const block = () => ({ type: 'drag_words', text: 'Die *Sonne* geht auf.', distractors: ['Stern'], unbekannt: 'bleibt' })

describe('Wörter ziehen: Zusatzwörter', () => {
  it('der Bauplan kennt das Feld, der Finder zählt weiter nur Lücken', () => {
    const teile = teileVon(BAUPLAENE.drag_words, block())
    expect(teile.map((t) => t.art)).toEqual(['text', 'luecken', 'zeilen'])
    expect(FINDER.drag_words).toBe('.lueckentext .luecke')
  })

  it('übernimmt Zusatzwörter, lässt Unbekanntes stehen', () => {
    const r = uebernimmAufgabe(block(), { ...block(), distractors: ['Stern', 'Komet'], unbekannt: 'X' })
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.block.distractors).toEqual(['Stern', 'Komet'])
      expect(r.block.unbekannt).toBe('bleibt')
    }
  })

  it('mehr als zehn Zusatzwörter werden abgelehnt', () => {
    const viele = Array.from({ length: 11 }, (_, i) => `W${i}`)
    expect(uebernimmAufgabe(block(), { ...block(), distractors: viele }).ok).toBe(false)
  })

  it('ohne Zusatzwörter bleibt ein leeres Feld leer', () => {
    const r = uebernimmAufgabe({ type: 'drag_words', text: 'Die *Sonne* geht auf.' }, { type: 'drag_words', text: 'Die *Sonne* geht auf.', distractors: [] })
    expect(r.ok).toBe(true)
  })
})
