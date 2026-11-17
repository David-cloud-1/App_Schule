import { describe, expect, it } from 'vitest'
import { uebernimmAufgabe } from '@/components/werkzeugkiste/editor/aufgabenwerk/bauplan'
import { normalisiere } from '@/components/werkzeugkiste/editor/aufgabenwerk/teile'
import type { Block } from '@/lib/werkzeugkiste-editor'
import { restSignatur } from './baukasten-editor'

/**
 * QA PROJ-114 (2026-11-17): Belege für Funde in der Übernahme (`uebernimmAufgabe`).
 * Die Tests beschreiben das **gewünschte** Verhalten; ein roter Test = offener Fund.
 */

const b = (x: Record<string, unknown>) => x as unknown as Block

describe('QA PROJ-114 – Übernahme', () => {
  it('BUG-2: „correct: 1“ (der Kern liest es als richtig) geht beim Speichern nicht verloren', () => {
    const alt = b({ type: 'multiple_choice', question: 'F', answers: [{ text: 'a', correct: 1 }, { text: 'b', correct: 0 }] })
    // Das Werk rechnet beim Öffnen auf true/false um; erst dieser Stand geht an die App
    const offen = normalisiere(alt)
    expect((offen.answers as Array<Record<string, unknown>>).map((a) => a.correct)).toEqual([true, false])
    const r = uebernimmAufgabe(alt, { ...offen, question: 'F2' })
    expect(r.ok).toBe(true)
    if (r.ok) expect((r.block.answers as Array<Record<string, unknown>>).map((a) => a.correct)).toEqual([true, false])
  })

  it('BUG-3: Kapiteltest – Zusatzfelder bleiben nach dem Umsortieren bei ihrer Frage', () => {
    const q0 = { type: 'multiple_choice', question: 'A', quelle: 'Q0', answers: [{ text: 'x', correct: true }, { text: 'y', correct: false }] }
    const q1 = { type: 'multiple_choice', question: 'B', quelle: 'Q1', answers: [{ text: 'x', correct: true }, { text: 'y', correct: false }] }
    const alt = b({ type: 'question_set', questions: [q0, q1] })
    const r = uebernimmAufgabe(alt, { type: 'question_set', questions: [q1, q0] })
    expect(r.ok).toBe(true)
    if (r.ok) {
      const q = r.block.questions as Array<Record<string, unknown>>
      expect(q[0].question).toBe('B')
      expect(q[0].quelle).toBe('Q1')
    }
  })

  it('BUG-4: Bestandsblock mit mehr Einträgen als die Höchstzahl lässt sich trotzdem ändern', () => {
    const answers = Array.from({ length: 11 }, (_, i) => ({ text: `a${i}`, correct: i === 0 }))
    const alt = b({ type: 'multiple_choice', question: 'F', answers })
    const r = uebernimmAufgabe(alt, { ...alt, question: 'F neu' })
    expect(r.ok).toBe(true)
  })

  it('BUG-6: Bestehensgrenze außerhalb 0–100 wird nicht gespeichert', () => {
    const alt = b({ type: 'question_set', questions: [{ type: 'true_false', question: 'A', correct: true }] })
    const r = uebernimmAufgabe(alt, { ...alt, pass_percentage: 500 })
    expect(r.ok).toBe(false)
  })

  it('Sicherheit: fremde Felder, __proto__ und anderer Typ werden abgewiesen bzw. verworfen', () => {
    const alt = b({ type: 'multiple_choice', question: 'F', geheim: 'bleibt', answers: [{ text: 'a', correct: true }, { text: 'b', correct: false }] })
    const boese = JSON.parse(
      '{"type":"multiple_choice","question":"<img src=x onerror=alert(1)>","geheim":"neu","neuFeld":1,"__proto__":{"x":1},"answers":[{"text":"a","correct":true,"__proto__":{"y":1},"constructor":"z"},{"text":"b","correct":"true"}]}',
    )
    const r = uebernimmAufgabe(alt, boese)
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.block.geheim).toBe('bleibt')
      expect('neuFeld' in r.block).toBe(false)
      expect(({} as Record<string, unknown>).x).toBeUndefined()
      const a = r.block.answers as Array<Record<string, unknown>>
      expect(Object.keys(a[0]).sort()).toEqual(['correct', 'feedback', 'text'])
      expect(a[1].correct).toBe(false)
      // Tags bleiben als Text stehen (der Kern maskiert die Frage mit _esc)
      expect(r.block.question).toContain('<img')
    }
    expect(uebernimmAufgabe(alt, { ...boese, type: 'true_false' }).ok).toBe(false)
    const tief = { type: 'question_set', questions: [{ type: 'question_set', questions: [] }] }
    expect(uebernimmAufgabe(b({ type: 'question_set', questions: [] }), tief).ok).toBe(false)
  })
})

describe('QA PROJ-114 – weitere Belege nach den Korrekturen', () => {
  it('BUG-2: auch in Fallakte und Video zählt „wahr“ im Sinne des Kerns', () => {
    const f = normalisiere(b({ type: 'fallakte', situation: 's', steps: [{ question: 'F', answers: [{ text: 'a', correct: 'ja' }, { text: 'b', correct: 0 }] }] }))
    const antworten = (f.steps as Array<Record<string, unknown>>)[0].answers as Array<Record<string, unknown>>
    expect(antworten.map((a) => a.correct)).toEqual([true, false])
  })

  it('BUG-4: Bestandsblock mit Text über dem Richtwert bleibt änderbar, sehr lange Texte nicht', () => {
    const alt = b({ type: 'crossword', words: [{ word: 'W'.repeat(80), clue: 'u' }, { word: 'X', clue: 'v' }] })
    expect(uebernimmAufgabe(alt, { ...alt, description: 'neu' }).ok).toBe(true)
    expect(uebernimmAufgabe(alt, { ...alt, description: 'z'.repeat(30_000) }).ok).toBe(false)
  })

  it('BUG-6: Ein Bestandswert außerhalb der Grenzen darf unverändert bleiben, ein neuer nicht', () => {
    const alt = b({ type: 'freitext', question: 'F', solution: 'L', rows: 20 })
    expect(uebernimmAufgabe(alt, { ...alt, question: 'F2' }).ok).toBe(true)
    expect(uebernimmAufgabe(alt, { ...alt, rows: 30 }).ok).toBe(false)
  })

  it('BUG-3: Fragen ohne „type“ im Bestand behalten ihre Zusatzfelder', () => {
    const q = { question: 'A', quelle: 'Q', answers: [{ text: 'x', correct: true }, { text: 'y', correct: false }] }
    const alt = b({ type: 'question_set', questions: [q] })
    const offen = normalisiere(alt)
    const r = uebernimmAufgabe(alt, { ...offen })
    expect(r.ok && (r.block.questions as Array<Record<string, unknown>>)[0].quelle).toBe('Q')
  })
})

describe('QA PROJ-114 – BUG-1: Sitzung gehört zu ihrem Platz', () => {
  const struktur = (blocks: Array<Record<string, unknown>>) => ({ chapters: [{ title: 'T', elements: blocks }] })
  const a = { type: 'text', text: 'A' }
  const mc = { type: 'multiple_choice', question: 'F' }
  const c = { type: 'text', text: 'C' }

  it('eigene Änderungen an der Aufgabe verändern den Fingerabdruck nicht', () => {
    const vorher = restSignatur(struktur([a, mc, c]), { thema: 0, block: 1 })
    expect(restSignatur(struktur([a, { ...mc, question: 'Neu' }, c]), { thema: 0, block: 1 })).toBe(vorher)
  })

  it('Löschen, Einfügen und Verschieben anderer Blöcke verändert ihn', () => {
    const ort = { thema: 0, block: 1 }
    const vorher = restSignatur(struktur([a, mc, c]), ort)
    expect(restSignatur(struktur([mc, c]), ort)).not.toBe(vorher)
    expect(restSignatur(struktur([a, { type: 'text', text: 'neu' }, mc, c]), ort)).not.toBe(vorher)
    expect(restSignatur(struktur([c, mc, a]), ort)).not.toBe(vorher)
  })
})
