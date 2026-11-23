import { describe, it, expect } from 'vitest'
import {
  applyAnswer,
  applyJoker,
  applyWager,
  buildSlipQuestion,
  isRuleError,
  planVariants,
  pickProposal,
  questionEligibility,
  settleBlitz,
  settleQuiz,
  toClientQuestion,
  variantsEnabled,
  wagerStake,
  type RoundSlip,
  type SlipSource,
} from './quiz-round-rules'
import type { QuizRoundForm } from './quiz-round'

/** Deterministischer Zufall */
function seq(...values: number[]) {
  let i = 0
  return () => values[i++ % values.length]
}

const opt = (q: number, o: number) => `00000000-0000-4000-8000-${String(q * 10 + o).padStart(12, '0')}`

function source(q: number, nOptions = 5): SlipSource {
  const options = Array.from({ length: nOptions }, (_, o) => ({ id: opt(q, o), option_text: `Option ${o}` }))
  return {
    id: `q${q}`,
    question_text: `Frage ${q}?`,
    difficulty: 'mittel',
    explanation: `Erklärung ${q}`,
    options,
    correct_option_id: opt(q, 0),
  }
}

function slipOf(forms: QuizRoundForm[], variants = true, rng = seq(0.1)): RoundSlip {
  return {
    questions: forms.map((f, i) => buildSlipQuestion(source(i), f, rng)),
    variants,
    jokers_used: 0,
    wager: null,
  }
}

function ok<T>(x: T) {
  if (isRuleError(x)) throw new Error(`Regelfehler: ${(x as { message: string }).message}`)
  return x as Exclude<T, { error: string }>
}

describe('Hauptschalter', () => {
  it('ist ohne Wert aus und nur mit „an“ o. ä. an', () => {
    expect(variantsEnabled(undefined)).toBe(false)
    expect(variantsEnabled('aus')).toBe(false)
    expect(variantsEnabled('an')).toBe(true)
    expect(variantsEnabled(' TRUE ')).toBe(true)
  })
})

describe('Eignung', () => {
  const opts = (n: number, text = 'Spediteur') => Array.from({ length: n }, (_, i) => ({ option_text: `${text} ${i}` }))

  it('normale Frage mit 5 Optionen kann beides', () => {
    expect(questionEligibility({ question_text: 'Wer haftet beim Frachtvertrag?', options: opts(5) })).toEqual({
      true_false: true,
      eliminate: true,
    })
  })

  it.each(['Welche Aussage trifft nicht zu?', 'Was gehört KEIN Bestandteil?', 'Alle außer einem sind richtig.', 'Welche Aussage ist falsch?', 'Welche Angabe ist unzutreffend?'])(
    'Verneinung „%s“ → keine Variante',
    (text) => {
      expect(questionEligibility({ question_text: text, options: opts(5) })).toEqual({ true_false: false, eliminate: false })
    },
  )

  it('„Nichts“ oder „Keinesfalls“ als Teil eines anderen Wortes zählt nicht als „nicht“', () => {
    expect(questionEligibility({ question_text: 'Was bedeutet Nichtigkeit?', options: opts(5) }).true_false).toBe(true)
  })

  it.each(['Alle genannten Antworten', 'Keine der Antworten', 'a und b', 'Beide sind richtig'])(
    'Verweis-Option „%s“ → keine Variante',
    (text) => {
      const options = [...opts(4), { option_text: text }]
      expect(questionEligibility({ question_text: 'Was gilt?', options })).toEqual({ true_false: false, eliminate: false })
    },
  )

  it('weniger als 4 Optionen: kein Rauswerfen, Richtig/Falsch erlaubt', () => {
    expect(questionEligibility({ question_text: 'Was gilt?', options: opts(3) })).toEqual({ true_false: true, eliminate: false })
  })

  it('zu lang für Richtig/Falsch', () => {
    const e = questionEligibility({ question_text: 'x'.repeat(200), options: [...opts(4), { option_text: 'y'.repeat(100) }] })
    expect(e).toEqual({ true_false: false, eliminate: true })
  })

  it('„nur klassisch“ markierte Frage → nie Variante', () => {
    expect(questionEligibility({ question_text: 'Was gilt?', options: opts(5), classic_only: true })).toEqual({
      true_false: false,
      eliminate: false,
    })
  })
})

describe('Variantenplanung', () => {
  const all = (n: number, known = true) =>
    Array.from({ length: n }, () => ({ known, eligibility: { true_false: true, eliminate: true } }))

  it('erste und letzte Frage klassisch, höchstens 3, nie zwei nebeneinander', () => {
    for (let run = 0; run < 300; run++) {
      const forms = planVariants(all(10), Math.random, 3)
      expect(forms[0]).toBe('classic')
      expect(forms[9]).toBe('classic')
      const idx = forms.map((f, i) => (f === 'classic' ? -1 : i)).filter((i) => i >= 0)
      expect(idx.length).toBeLessThanOrEqual(3)
      for (let k = 1; k < idx.length; k++) expect(idx[k] - idx[k - 1]).toBeGreaterThan(1)
    }
  })

  it('Ziel über 3 wird auf 3 begrenzt', () => {
    const forms = planVariants(all(10), seq(0.3, 0.7, 0.1, 0.9, 0.5), 9)
    expect(forms.filter((f) => f !== 'classic').length).toBeLessThanOrEqual(3)
  })

  it('ungekannte Fragen bleiben klassisch', () => {
    expect(planVariants(all(10, false), Math.random, 3).every((f) => f === 'classic')).toBe(true)
  })

  it('ungeeignete Fragen bleiben klassisch', () => {
    const c = Array.from({ length: 10 }, () => ({ known: true, eligibility: { true_false: false, eliminate: false } }))
    expect(planVariants(c, Math.random, 3).every((f) => f === 'classic')).toBe(true)
  })

  it('nur Rauswerfen möglich → Rauswerfen', () => {
    const c = Array.from({ length: 3 }, () => ({ known: true, eligibility: { true_false: false, eliminate: true } }))
    expect(planVariants(c, seq(0), 1)).toEqual(['classic', 'eliminate', 'classic'])
  })

  it('kurze Runden (unter 3) bleiben klassisch', () => {
    expect(planVariants(all(2), Math.random, 3)).toEqual(['classic', 'classic'])
  })
})

describe('Richtig/Falsch-Vorschlag', () => {
  it('50 % richtige Option, sonst eine falsche', () => {
    expect(pickProposal(['a', 'b', 'c'], 'a', seq(0.2))).toBe('a')
    expect(pickProposal(['a', 'b', 'c'], 'a', seq(0.7, 0.9))).toBe('c')
  })

  it('der Browser sieht Vorschlag, aber nie die Lösung', () => {
    const q = buildSlipQuestion(source(1), 'true_false', seq(0.7, 0))
    const client = toClientQuestion(q, 3) as unknown as Record<string, unknown>
    expect(client.proposal_option_id).toBe(q.proposal_option_id)
    expect(JSON.stringify(client)).not.toContain('correct')
    expect(client).not.toHaveProperty('explanation')
  })
})

describe('Antworten', () => {
  it('klassisch: richtig/falsch, Erklärung und Lösung kommen erst mit der Antwort', () => {
    const slip = slipOf(['classic', 'classic'])
    const r = ok(applyAnswer(slip, { kind: 'choice', question_index: 0, option_id: opt(0, 2) }))
    expect(r.response).toMatchObject({ status: 'resolved', correct: false, correct_option_id: opt(0, 0), explanation: 'Erklärung 0' })
    expect(r.slip.questions[0].answered).toBe(true)
  })

  it('doppelte Anfrage ändert nichts und liefert dieselbe Antwort', () => {
    const slip = slipOf(['classic', 'classic'])
    const first = ok(applyAnswer(slip, { kind: 'choice', question_index: 0, option_id: opt(0, 0) }))
    const again = ok(applyAnswer(first.slip, { kind: 'choice', question_index: 0, option_id: opt(0, 3) }))
    expect(again.changed).toBe(false)
    expect(again.response).toMatchObject({ correct: true })
  })

  it('fremde Option, falsche Form oder unbekannter Platz → Fehler', () => {
    const slip = slipOf(['classic', 'true_false', 'classic'])
    expect(applyAnswer(slip, { kind: 'choice', question_index: 0, option_id: opt(5, 0) })).toMatchObject({ error: 'bad_request' })
    expect(applyAnswer(slip, { kind: 'choice', question_index: 1, option_id: opt(1, 0) })).toMatchObject({ error: 'bad_request' })
    expect(applyAnswer(slip, { kind: 'true_false', question_index: 7, says_true: true })).toMatchObject({ error: 'bad_request' })
  })

  it('Richtig/Falsch: „Stimmt“ ist richtig genau dann, wenn der Vorschlag stimmt', () => {
    const right = slipOf(['classic', 'true_false', 'classic'], true, seq(0.1)) // Vorschlag = richtige Option
    expect(ok(applyAnswer(right, { kind: 'true_false', question_index: 1, says_true: true })).response).toMatchObject({ correct: true })
    expect(ok(applyAnswer(right, { kind: 'true_false', question_index: 1, says_true: false })).response).toMatchObject({ correct: false })

    const wrong = slipOf(['classic', 'true_false', 'classic'], true, seq(0.9, 0.1)) // Vorschlag = falsche Option
    expect(ok(applyAnswer(wrong, { kind: 'true_false', question_index: 1, says_true: false })).response).toMatchObject({ correct: true })
  })

  it('Rauswerfen: alle falschen weg → bestanden ohne Fehlgriff', () => {
    let slip = slipOf(['classic', 'eliminate', 'classic'])
    for (const o of [1, 2, 3]) {
      const r = ok(applyAnswer(slip, { kind: 'eliminate', question_index: 1, option_id: opt(1, o) }))
      expect(r.response).toMatchObject({ status: 'eliminated', hearts_left: 2 })
      slip = r.slip
    }
    const last = ok(applyAnswer(slip, { kind: 'eliminate', question_index: 1, option_id: opt(1, 4) }))
    expect(last.response).toMatchObject({
      status: 'resolved',
      correct: true,
      eliminate: { option_id: opt(1, 4), step: 'eliminated', hearts_left: 2, mistakes: 0 },
    })
    expect(last.slip.questions[1].selected_option_id).toBe(opt(1, 0))
  })

  it('Rauswerfen: richtige Option angetippt → Herz weg; doppelter Tipp kostet kein zweites Herz', () => {
    const slip = slipOf(['classic', 'eliminate', 'classic'])
    const r = ok(applyAnswer(slip, { kind: 'eliminate', question_index: 1, option_id: opt(1, 0) }))
    expect(r.response).toMatchObject({ status: 'heart_lost', hearts_left: 1 })
    const again = ok(applyAnswer(r.slip, { kind: 'eliminate', question_index: 1, option_id: opt(1, 0) }))
    expect(again.changed).toBe(false)
    expect(again.response).toMatchObject({ status: 'heart_lost', hearts_left: 1 })
    const repeatEliminated = ok(applyAnswer(r.slip, { kind: 'eliminate', question_index: 1, option_id: opt(1, 0) }))
    expect(repeatEliminated.slip.questions[1].mistakes).toBe(1)
  })

  it('Rauswerfen mit 1 Fehlgriff bestanden → halbe Wertung', () => {
    let slip = slipOf(['classic', 'eliminate', 'classic'])
    for (const o of [0, 1, 2, 3, 4]) slip = ok(applyAnswer(slip, { kind: 'eliminate', question_index: 1, option_id: opt(1, o) })).slip
    const q = slip.questions[1]
    expect(q).toMatchObject({ answered: true, correct: true, mistakes: 1 })
  })
})

describe('Joker', () => {
  it('streicht zwei falsche Optionen, nie die richtige; zweiter Klick kostet nichts', () => {
    const slip = slipOf(['classic', 'classic', 'classic'])
    const r = ok(applyJoker(slip, 0, 20, seq(0.3)))
    expect(r.response.removed_option_ids).toHaveLength(2)
    expect(r.response.removed_option_ids).not.toContain(opt(0, 0))
    expect(r.response).toMatchObject({ jokers_used: 1, coins_reserved: 5 })
    const again = ok(applyJoker(r.slip, 0, 20))
    expect(again.changed).toBe(false)
    expect(again.response.removed_option_ids).toEqual(r.response.removed_option_ids)
  })

  it('zu wenig Münzen → too_poor; der Stand muss alle Joker der Runde decken', () => {
    const slip = slipOf(['classic', 'classic', 'classic'])
    expect(applyJoker(slip, 0, 4)).toMatchObject({ error: 'too_poor' })
    const one = ok(applyJoker(slip, 0, 9))
    expect(applyJoker(one.slip, 1, 9)).toMatchObject({ error: 'too_poor' })
  })

  it('höchstens zwei pro Runde, nicht bei Varianten, nicht nach Antwort, nicht bei ausgeschaltetem Schalter', () => {
    let slip = slipOf(['classic', 'classic', 'true_false', 'classic', 'classic'])
    slip = ok(applyJoker(slip, 0, 100)).slip
    slip = ok(applyJoker(slip, 1, 100)).slip
    expect(applyJoker(slip, 3, 100)).toMatchObject({ error: 'conflict' })
    expect(applyJoker(slipOf(['classic', 'true_false', 'classic']), 1, 100)).toMatchObject({ error: 'conflict' })
    const answered = ok(applyAnswer(slipOf(['classic', 'classic']), { kind: 'choice', question_index: 0, option_id: opt(0, 0) })).slip
    expect(applyJoker(answered, 0, 100)).toMatchObject({ error: 'conflict' })
    expect(applyJoker(slipOf(['classic', 'classic'], false), 0, 100)).toMatchObject({ error: 'conflict' })
  })

  it('nicht auf der Wettfrage', () => {
    const slip = { ...slipOf(['classic', 'classic', 'classic', 'classic', 'classic']), wager: { stake: 5, accepted: null } }
    expect(applyJoker(slip, 4, 100)).toMatchObject({ error: 'conflict' })
  })
})

describe('Wette', () => {
  function playToPenultimate(allCorrect = true, n = 10, jokers = 0) {
    let slip = slipOf(Array.from({ length: n }, () => 'classic' as const))
    for (let j = 0; j < jokers; j++) slip = ok(applyJoker(slip, j, 100)).slip
    let last: ReturnType<typeof applyAnswer> | null = null
    for (let i = 0; i < n - 1; i++) {
      last = applyAnswer(slip, { kind: 'choice', question_index: i, option_id: opt(i, allCorrect ? 0 : 1) })
      slip = ok(last).slip
    }
    return { slip, response: ok(last!).response }
  }

  it('Angebot kommt mit der vorletzten Antwort; Einsatz = Rundenmünzen inkl. Bonus, höchstens 10', () => {
    const { slip, response } = playToPenultimate(true)
    // 9 richtige = 9 + 3 Bonus = 12 → 10
    expect(response).toMatchObject({ status: 'resolved', wager_offer: { stake: 10 } })
    expect(slip.wager).toEqual({ stake: 10, accepted: null })
  })

  it('Einsatz zieht Joker-Kosten ab, damit der Stand vor der Runde nie sinkt', () => {
    const { slip } = playToPenultimate(true, 10, 2) // 9 + 3 − 10 = 2
    expect(wagerStake(slip)).toBe(2)
  })

  it('kein Angebot unter 5 Fragen, ohne Einsatz oder bei ausgeschaltetem Schalter', () => {
    expect(playToPenultimate(true, 4).response).toMatchObject({ wager_offer: null })
    const { slip } = playToPenultimate(false, 10, 0) // 0 + 3 = 3 → Angebot
    expect(slip.wager?.stake).toBe(3)
    const poor = playToPenultimate(false, 10, 2) // 0 + 3 − 10 < 1
    expect(poor.slip.wager).toBeNull()
    let off = slipOf(Array.from({ length: 6 }, () => 'classic' as const), false)
    for (let i = 0; i < 5; i++) off = ok(applyAnswer(off, { kind: 'choice', question_index: i, option_id: opt(i, 0) })).slip
    expect(off.wager).toBeNull()
  })

  it('gewonnen verdoppelt, verloren nimmt den Einsatz – nie unter den Stand vor der Runde', () => {
    for (const lastRight of [true, false]) {
      let { slip } = playToPenultimate(true)
      slip = ok(applyWager(slip, true)).slip
      slip = ok(applyAnswer(slip, { kind: 'choice', question_index: 9, option_id: opt(9, lastRight ? 0 : 1) })).slip
      const s = settleQuiz(slip, false)
      expect(s.wager).toEqual({ stake: 10, won: lastRight, delta: lastRight ? 10 : -10 })
      expect(s.net_coins).toBe(lastRight ? 10 + 3 + 10 : 9 + 3 - 10)
      expect(s.net_coins).toBeGreaterThanOrEqual(0)
    }
  })

  it('Wette nach der letzten Antwort zählt nicht; Entscheidung ist endgültig', () => {
    let { slip } = playToPenultimate(true)
    slip = ok(applyAnswer(slip, { kind: 'choice', question_index: 9, option_id: opt(9, 0) })).slip
    expect(slip.wager?.accepted).toBe(false)
    const late = ok(applyWager(slip, true))
    expect(late.response.accepted).toBe(false)

    let { slip: s2 } = playToPenultimate(true)
    s2 = ok(applyWager(s2, false)).slip
    expect(ok(applyWager(s2, true)).response.accepted).toBe(false)
  })

  it('ohne Angebot → conflict', () => {
    expect(applyWager(slipOf(['classic', 'classic']), true)).toMatchObject({ error: 'conflict' })
  })
})

describe('Abrechnung', () => {
  it('Wertung je Darstellungsform; halbe Münzen werden für die Runde zusammengezählt', () => {
    // Plätze: 0 klassisch mit Joker richtig, 1 R/F richtig, 2 klassisch falsch, 3 Rauswerfen 1 Fehlgriff, 4 klassisch richtig
    let slip = slipOf(['classic', 'true_false', 'classic', 'eliminate', 'classic'], true, seq(0.1))
    slip = ok(applyJoker(slip, 0, 100)).slip
    slip = ok(applyAnswer(slip, { kind: 'choice', question_index: 0, option_id: opt(0, 0) })).slip
    slip = ok(applyAnswer(slip, { kind: 'true_false', question_index: 1, says_true: true })).slip
    slip = ok(applyAnswer(slip, { kind: 'choice', question_index: 2, option_id: opt(2, 1) })).slip
    for (const o of [0, 1, 2, 3, 4]) slip = ok(applyAnswer(slip, { kind: 'eliminate', question_index: 3, option_id: opt(3, o) })).slip
    slip = ok(applyAnswer(slip, { kind: 'choice', question_index: 4, option_id: opt(4, 0) })).slip

    const s = settleQuiz(slip, false)
    expect(s.score).toBe(4)
    expect(s.total).toBe(5)
    expect(s.xp).toBe(10 + 5 + 0 + 5 + 10)
    // halbe Münzen: 2 + 1 + 0 + 1 + 2 = 6 → 3 Münzen
    expect(s.answer_coins).toBe(3)
    expect(s.round_bonus).toBe(3)
    expect(s.joker_cost).toBe(5)
    expect(s.net_coins).toBe(1)
  })

  it('Streak-Bonus ab 7 Tagen', () => {
    let slip = slipOf(['classic', 'true_false'], true, seq(0.1))
    slip = ok(applyAnswer(slip, { kind: 'choice', question_index: 0, option_id: opt(0, 0) })).slip
    slip = ok(applyAnswer(slip, { kind: 'true_false', question_index: 1, says_true: true })).slip
    expect(settleQuiz(slip, true).xp).toBe(15 + 7)
  })

  it('nur beantwortete Fragen zählen (kein Rundenbonus bei Abbruch unter 5)', () => {
    let slip = slipOf(Array.from({ length: 10 }, () => 'classic' as const))
    slip = ok(applyAnswer(slip, { kind: 'choice', question_index: 0, option_id: opt(0, 0) })).slip
    expect(settleQuiz(slip, false)).toMatchObject({ total: 1, round_bonus: 0, net_coins: 1 })
  })
})

describe('Blitzrunde', () => {
  function blitz(correct: number, wrong: number): RoundSlip {
    const n = correct + wrong
    const slip = slipOf(Array.from({ length: n }, () => 'true_false' as const), false, seq(0.1))
    slip.questions.forEach((q, i) => {
      q.answered = true
      q.correct = i < correct
    })
    return slip
  }

  it('Richtig/Falsch: Punkte = Treffer − Fehler, nie unter 0', () => {
    expect(settleBlitz(blitz(24, 6), 'true_false')).toMatchObject({ points: 18, coins: 46, xp: 54 })
    expect(settleBlitz(blitz(5, 9), 'true_false')).toMatchObject({ points: 0, coins: 10, xp: 0 })
  })

  it('Raten (50 %) bringt höchstens halb so viele Münzen wie 80 % Treffer', () => {
    const guesser = settleBlitz(blitz(15, 15), 'true_false').coins
    const good = settleBlitz(blitz(24, 6), 'true_false').coins
    expect(guesser).toBeLessThanOrEqual(good / 2)
  })

  it('klassisch: Regeln wie bisher (3 Münzen je Treffer + 10)', () => {
    expect(settleBlitz(blitz(15, 3), 'classic')).toMatchObject({ points: 15, coins: 55, xp: 75 })
  })
})
