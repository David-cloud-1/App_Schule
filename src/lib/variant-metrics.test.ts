import { describe, it, expect } from 'vitest'
import { analyzeVariants, type VariantAnswerRow, type VariantSessionRow } from './variant-metrics'

const ans = (user_id: string, presentation: string | null, is_correct: boolean): VariantAnswerRow => ({
  user_id,
  presentation,
  is_correct,
  mistakes: 0,
})

const ses = (over: Partial<VariantSessionRow>): VariantSessionRow => ({
  user_id: 'u1',
  score: 0,
  total: 10,
  coins_earned: 0,
  joker_cost: 0,
  wager_stake: null,
  wager_won: null,
  ...over,
})

describe('analyzeVariants (PROJ-129, QA BUG-6)', () => {
  it('zählt Anteil und Trefferquote je Darstellungsform; fehlende Form = klassisch', () => {
    const r = analyzeVariants(
      [
        ans('u1', 'classic', true),
        ans('u1', null, false),
        ans('u1', 'true_false', true),
        ans('u1', 'true_false', false),
        ans('u1', 'eliminate', true),
        ans('u1', 'eliminate', false),
        ans('u1', 'joker', true),
        ans('u1', 'quatsch', true),
      ],
      [],
    )
    expect(r.answers).toBe(8)
    const by = Object.fromEntries(r.forms.map((f) => [f.form, f]))
    expect(by.classic).toMatchObject({ answers: 3, correct: 2 })
    expect(by.true_false).toMatchObject({ answers: 2, correct: 1, hitRate: 0.5, share: 0.25 })
    expect(by.joker.hitRate).toBe(1)
    expect(r.eliminate).toEqual({ passed: 1, failed: 1 })
  })

  it('Joker, Wette und Münzen je Runde nur aus Rundenzettel-Runden (coins_earned gesetzt)', () => {
    const r = analyzeVariants(
      [],
      [
        ses({ score: 9, coins_earned: 22, wager_stake: 10, wager_won: true }),
        ses({ score: 5, coins_earned: -2, joker_cost: 10, wager_stake: 6, wager_won: false }),
        ses({ score: 7, total: 4, coins_earned: 7 }),
        ses({ score: 10, coins_earned: null }), // alte Runde, zählt nicht
      ],
    )
    expect(r.roundSessions).toBe(3)
    expect(r.joker).toMatchObject({ rounds: 1, coinsSpent: 10 })
    expect(r.wager).toMatchObject({ taken: 2, won: 1, winRate: 0.5, netCoins: 4 })
    // tatsächlich (22 − 2 + 7) / 3 = 9; alte Regel (12 + 8 + 7) / 3 = 9
    expect(r.coins).toEqual({ perRound: 9, perRoundClassicRule: 9 })
  })

  it('filtert auf die übergebenen Spieler (ohne Admin-/Testkonten)', () => {
    const r = analyzeVariants([ans('u1', 'classic', true), ans('admin', 'classic', true)], [ses({ user_id: 'admin' })], new Set(['u1']))
    expect(r.answers).toBe(1)
    expect(r.roundSessions).toBe(0)
    expect(r.wager.winRate).toBe(0)
  })
})
