import { describe, expect, it } from 'vitest'
import {
  blitzPoints,
  formatJokerCost,
  formatWagerOutcome,
  jokerState,
  RoundAnswerRequestSchema,
  RoundJokerRequestSchema,
  RoundWagerRequestSchema,
  swipeDecision,
  type JokerConfig,
} from './quiz-round'

const joker: JokerConfig = { enabled: true, price: 5, max_per_round: 2 }
const base = {
  joker,
  form: 'classic' as const,
  coinBalance: 20,
  jokersUsed: 0,
  usedOnThisQuestion: false,
  isLastQuestion: false,
  wagerOffered: false,
  answered: false,
}

describe('jokerState', () => {
  it('ist bei klassischer Frage mit genug Münzen verfügbar', () => {
    expect(jokerState(base)).toBe('available')
  })
  it('fehlt bei Varianten und bei ausgeschaltetem Schalter', () => {
    expect(jokerState({ ...base, form: 'true_false' })).toBe('hidden')
    expect(jokerState({ ...base, form: 'eliminate' })).toBe('hidden')
    expect(jokerState({ ...base, joker: { ...joker, enabled: false } })).toBe('hidden')
  })
  it('fehlt auf der Wettfrage, ist auf der letzten Frage ohne Wette aber da', () => {
    expect(jokerState({ ...base, isLastQuestion: true, wagerOffered: true })).toBe('hidden')
    expect(jokerState({ ...base, isLastQuestion: true, wagerOffered: false })).toBe('available')
  })
  it('ist gesperrt, wenn der Münzstand nicht alle Joker der Runde deckt', () => {
    expect(jokerState({ ...base, coinBalance: 4 })).toBe('too_poor')
    expect(jokerState({ ...base, coinBalance: 9, jokersUsed: 1 })).toBe('too_poor')
    expect(jokerState({ ...base, coinBalance: 10, jokersUsed: 1 })).toBe('available')
  })
  it('erlaubt höchstens 2 Joker pro Runde', () => {
    expect(jokerState({ ...base, jokersUsed: 2, coinBalance: 100 })).toBe('limit')
  })
  it('zeigt „eingesetzt“ auf der Frage, auf der er schon genutzt wurde', () => {
    expect(jokerState({ ...base, usedOnThisQuestion: true, jokersUsed: 2 })).toBe('used')
  })
  it('verschwindet, sobald geantwortet wurde', () => {
    expect(jokerState({ ...base, answered: true })).toBe('hidden')
  })
})

describe('swipeDecision', () => {
  it('rechts = Stimmt, links = Stimmt nicht, kurz = nichts', () => {
    expect(swipeDecision(120)).toBe(true)
    expect(swipeDecision(-120)).toBe(false)
    expect(swipeDecision(40)).toBeNull()
    expect(swipeDecision(-79)).toBeNull()
  })
})

describe('Texte für das Ergebnis', () => {
  it('beschreibt die Wette', () => {
    expect(formatWagerOutcome({ stake: 8, won: true, delta: 8 })).toBe('Wette gewonnen: +8 Münzen')
    expect(formatWagerOutcome({ stake: 1, won: false, delta: -1 })).toBe('Wette verloren: −1 Münze')
  })
  it('beschreibt die Joker-Kosten', () => {
    expect(formatJokerCost(10)).toBe('Joker: −10 Münzen')
  })
})

describe('blitzPoints', () => {
  it('rechnet Treffer − Fehler und nie unter 0 bei Richtig/Falsch', () => {
    expect(blitzPoints('true_false', 18, 6)).toBe(12)
    expect(blitzPoints('true_false', 3, 9)).toBe(0)
  })
  it('zählt im klassischen Notbetrieb nur Treffer', () => {
    expect(blitzPoints('classic', 7, 5)).toBe(7)
  })
})

describe('Schemas der Anfragen', () => {
  const uuid = '11111111-1111-4111-8111-111111111111'
  it('nimmt gültige Antworten an', () => {
    expect(RoundAnswerRequestSchema.safeParse({ kind: 'choice', question_index: 0, option_id: uuid }).success).toBe(true)
    expect(RoundAnswerRequestSchema.safeParse({ kind: 'true_false', question_index: 3, says_true: false }).success).toBe(true)
    expect(RoundAnswerRequestSchema.safeParse({ kind: 'eliminate', question_index: 9, option_id: uuid }).success).toBe(true)
  })
  it('lehnt fremde Felder-Kombinationen und Unsinn ab', () => {
    expect(RoundAnswerRequestSchema.safeParse({ kind: 'choice', question_index: 0, says_true: true }).success).toBe(false)
    expect(RoundAnswerRequestSchema.safeParse({ kind: 'joker', question_index: 0 }).success).toBe(false)
    expect(RoundAnswerRequestSchema.safeParse({ kind: 'choice', question_index: -1, option_id: uuid }).success).toBe(false)
    expect(RoundAnswerRequestSchema.safeParse({ kind: 'choice', question_index: 0, option_id: 'abc' }).success).toBe(false)
    expect(RoundJokerRequestSchema.safeParse({ question_index: 1.5 }).success).toBe(false)
    expect(RoundWagerRequestSchema.safeParse({ accept: 'ja' }).success).toBe(false)
  })
})
