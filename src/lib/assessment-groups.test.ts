import { describe, it, expect } from 'vitest'
import {
  applyGroupOrder,
  buildGroupOrders,
  groupDistribution,
  groupForSlot,
  isCollectiveOption,
  isGroupOrders,
  questionsNeedingReview,
  referencesLetters,
  type MixQuestion,
} from './assessment-groups'

const q = (id: string, texts: string[]): MixQuestion => ({
  id,
  options: texts.map((text, i) => ({ id: `${id}-o${i + 1}`, text, order: i + 1 })),
})
const questions = Array.from({ length: 8 }, (_, i) => q(`q${i + 1}`, ['Eins', 'Zwei', 'Drei', 'Vier']))

describe('buildGroupOrders', () => {
  it('Gruppe A bleibt in Originalreihenfolge', () => {
    const o = buildGroupOrders(questions, 42)
    expect(o.A.questionOrder).toEqual(questions.map((x) => x.id))
    expect(o.A.optionOrder.q1).toEqual(['q1-o1', 'q1-o2', 'q1-o3', 'q1-o4'])
  })
  it('gleicher Mischwert ergibt gleiche Reihenfolge, anderer meist eine andere', () => {
    expect(buildGroupOrders(questions, 7).B).toEqual(buildGroupOrders(questions, 7).B)
    expect(buildGroupOrders(questions, 7).B).not.toEqual(buildGroupOrders(questions, 8).B)
  })
  it('Gruppe B enthält alle Fragen und Optionen genau einmal und weicht von A ab', () => {
    const { A, B } = buildGroupOrders(questions, 3)
    expect([...B.questionOrder].sort()).toEqual([...A.questionOrder].sort())
    expect(B.questionOrder).not.toEqual(A.questionOrder)
    expect([...B.optionOrder.q2].sort()).toEqual([...A.optionOrder.q2].sort())
  })
  it('Sammeloptionen bleiben am Ende', () => {
    const qs = [q('a', ['Rot', 'Blau', 'Grün', 'Alle oben genannten']), q('b', ['x', 'y']), q('c', ['x', 'y'])]
    for (let seed = 1; seed < 30; seed++) {
      expect(buildGroupOrders(qs, seed).B.optionOrder.a[3]).toBe('a-o4')
    }
  })
  it('Optionen mit Buchstabenverweis werden nicht gemischt', () => {
    const qs = [q('a', ['Rot', 'Blau', 'A und B', 'Keine']), q('b', ['x', 'y']), q('c', ['x', 'y'])]
    for (let seed = 1; seed < 30; seed++) {
      expect(buildGroupOrders(qs, seed).B.optionOrder.a).toEqual(['a-o1', 'a-o2', 'a-o3', 'a-o4'])
    }
  })
  it('kommt mit einer einzelnen Frage zurecht', () => {
    expect(buildGroupOrders([questions[0]], 1).B.questionOrder).toEqual(['q1'])
  })
})

describe('Erkennung', () => {
  it('Sammeloptionen', () => {
    expect(isCollectiveOption('Alle oben genannten Aussagen')).toBe(true)
    expect(isCollectiveOption('Keine der Antworten ist richtig')).toBe(true)
    expect(isCollectiveOption('Die Spedition haftet')).toBe(false)
  })
  it('Buchstabenverweise', () => {
    expect(referencesLetters('A und B')).toBe(true)
    expect(referencesLetters('a) und c)')).toBe(true)
    expect(referencesLetters('Antwort B ist richtig')).toBe(true)
    expect(referencesLetters('Frachtführer und Spediteur')).toBe(false)
  })
  it('listet Fragen für den Hinweis', () => {
    expect(questionsNeedingReview([q('a', ['x', 'Alle oben genannten']), q('b', ['x', 'y'])])).toEqual(['a'])
  })
})

describe('Zuteilung und Anwendung', () => {
  it('wechselt A, B, A, B', () => {
    expect([0, 1, 2, 3, 4].map(groupForSlot)).toEqual(['A', 'B', 'A', 'B', 'A'])
  })
  it('ungerade Zahl: A hat einen mehr', () => {
    expect(groupDistribution([0, 1, 2].map(groupForSlot))).toEqual({ A: 2, B: 1 })
  })
  it('applyGroupOrder ordnet um und nummeriert display_order neu', () => {
    const rows = [
      { id: 'q1', answer_options: [{ id: 'a', display_order: 1 }, { id: 'b', display_order: 2 }] },
      { id: 'q2', answer_options: [{ id: 'c', display_order: 1 }] },
    ]
    const out = applyGroupOrder(rows, { questionOrder: ['q2', 'q1'], optionOrder: { q1: ['b', 'a'] } })
    expect(out.map((x) => x.id)).toEqual(['q2', 'q1'])
    expect(out[1].answer_options).toEqual([{ id: 'b', display_order: 1 }, { id: 'a', display_order: 2 }])
  })
  it('unbekannte Fragen gehen nicht verloren', () => {
    const out = applyGroupOrder([{ id: 'x' }, { id: 'q1' }], { questionOrder: ['q1'], optionOrder: {} })
    expect(out.map((r) => r.id)).toEqual(['q1', 'x'])
  })
  it('prüft gespeicherte Reihenfolgen', () => {
    expect(isGroupOrders(buildGroupOrders(questions, 1))).toBe(true)
    expect(isGroupOrders({ A: {} })).toBe(false)
    expect(isGroupOrders(null)).toBe(false)
  })
})
