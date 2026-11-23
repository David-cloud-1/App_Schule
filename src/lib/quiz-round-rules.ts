/**
 * PROJ-129: Server-Regeln für Runden mit Rundenzettel.
 *
 * Reine Funktionen ohne Datenbank: Eignung einer Frage für Varianten,
 * Variantenplanung, Verarbeitung einer Antwort gegen den Zettel, Joker, Wette
 * und Abrechnung. Die API-Wege laden/speichern nur den Zettel und rufen diese
 * Funktionen auf. Diese Datei darf NIE in den Browser gelangen – der Zettel
 * enthält die Lösungen.
 */
import {
  ELIMINATE_HEARTS,
  JOKER_MAX_PER_ROUND,
  JOKER_PRICE,
  WAGER_MAX_STAKE,
  type QuizRoundForm,
  type RoundAnswerRequest,
  type RoundAnswerResponse,
  type RoundJokerResponse,
  type RoundQuestion,
  type RoundWagerResponse,
  type WagerOutcome,
} from '@/lib/quiz-round'

// ── Zahlen (Tech Design Abschnitt D) ───────────────────────────────────────
export const QUIZ_XP_FULL = 10
export const QUIZ_XP_FULL_STREAK_BONUS = 5
export const QUIZ_XP_HALF = 5
export const QUIZ_XP_HALF_STREAK_BONUS = 2
export const STREAK_BONUS_THRESHOLD = 7
export const QUIZ_ROUND_BONUS = 3
export const QUIZ_ROUND_BONUS_MIN_TOTAL = 5
/** Wie lange ein Zettel gilt */
export const ROUND_MAX_AGE_MS = 3 * 60 * 60 * 1000
/** Blitzrunde: Antworten nach 60 s + Puffer zählen nicht mehr */
export const BLITZ_ANSWER_WINDOW_MS = 70 * 1000
export const BLITZ_TF_MIN_KNOWN = 40
export const BLITZ_TF_CARDS = 60
export const BLITZ_CLASSIC_CARDS = 40
/** Richtig/Falsch nur, wenn Frage + längste Option höchstens so lang sind */
export const TRUE_FALSE_MAX_CHARS = 280

/** Hauptschalter (Env `QUIZ_VARIANTEN`). Standard: aus. */
export function variantsEnabled(env: string | undefined = process.env.QUIZ_VARIANTEN): boolean {
  return ['an', 'on', '1', 'true', 'ja'].includes((env ?? '').trim().toLowerCase())
}

// ── Zettel ──────────────────────────────────────────────────────────────────
export type AnswerPresentation = 'classic' | 'true_false' | 'eliminate' | 'joker'

export interface SlipQuestion {
  question_id: string
  question_text: string
  difficulty: string
  form: QuizRoundForm
  /** Optionen in der Reihenfolge, die der Browser sieht */
  options: { id: string; option_text: string }[]
  /** Schnappschuss beim Start */
  correct_option_id: string
  explanation: string | null
  proposal_option_id?: string
  // Spielstand
  answered: boolean
  correct?: boolean
  selected_option_id?: string
  says_true?: boolean
  eliminated: string[]
  /** Richtige Option angetippt (Herz verloren) */
  kept: string[]
  mistakes: number
  joker_removed: string[]
  /** Rauswerfen: der letzte Tipp, der die Frage entschieden hat */
  last_tap?: string
  answered_at?: string
}

export interface SlipWager {
  stake: number
  accepted: boolean | null
}

export interface RoundSlip {
  questions: SlipQuestion[]
  variants: boolean
  jokers_used: number
  wager: SlipWager | null
}

export type RuleError = { error: 'bad_request' | 'conflict' | 'too_poor' | 'expired'; message: string }

export function isRuleError(x: unknown): x is RuleError {
  return typeof x === 'object' && x !== null && 'error' in x
}

// ── Eignung ─────────────────────────────────────────────────────────────────
const NEGATION_RE =
  /(?<![\p{L}])(nicht|kein|keine|keinen|keinem|keiner|keines|außer|ausser|falsch|falsche|falschen|falscher|unzutreffend\p{L}*|unrichtig\p{L}*)(?![\p{L}])/iu

const CROSS_REF_RE =
  /(alle\s+(genannten|oben|der\s+genannten|antworten|aussagen|vorherigen)|keine\s+der|keine\s+(dieser|von\s+den)|(?<![\p{L}])beide(?![\p{L}])|sowohl\s+[a-e]\)?\s+als\s+auch|(?<![\p{L}])[a-e]\)?\s+(und|&)\s+[a-e]\)?(?![\p{L}])|antwort\s+[a-e](?![\p{L}]))/iu

export interface Eligibility {
  true_false: boolean
  eliminate: boolean
}

export function questionEligibility(q: {
  question_text: string
  options: { option_text: string }[]
  classic_only?: boolean
}): Eligibility {
  const none = { true_false: false, eliminate: false }
  if (q.classic_only) return none
  if (q.options.length < 2) return none
  if (NEGATION_RE.test(q.question_text)) return none
  if (q.options.some((o) => CROSS_REF_RE.test(o.option_text))) return none
  const longest = Math.max(...q.options.map((o) => o.option_text.length))
  return {
    true_false: q.question_text.length + longest <= TRUE_FALSE_MAX_CHARS,
    eliminate: q.options.length >= 4,
  }
}

// ── Variantenplanung ────────────────────────────────────────────────────────
export type Rng = () => number

export function shuffle<T>(arr: T[], rng: Rng = Math.random): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** Ziel-Anzahl Varianten: 0–3, im Schnitt ≈ 1,9 */
const TARGET_WEIGHTS: [number, number][] = [
  [0, 1],
  [1, 2],
  [2, 4],
  [3, 3],
]

function pickTarget(rng: Rng): number {
  const sum = TARGET_WEIGHTS.reduce((s, [, w]) => s + w, 0)
  let r = rng() * sum
  for (const [n, w] of TARGET_WEIGHTS) {
    if (r < w) return n
    r -= w
  }
  return 2
}

export const MAX_VARIANTS_PER_ROUND = 3

/**
 * Darstellungsform je Platz. Erster und letzter Platz immer klassisch,
 * höchstens 3 Varianten, nie zwei nebeneinander, nur bei gekannten,
 * geeigneten Fragen.
 */
export function planVariants(
  candidates: { known: boolean; eligibility: Eligibility }[],
  rng: Rng = Math.random,
  target: number = pickTarget(rng),
): QuizRoundForm[] {
  const forms: QuizRoundForm[] = candidates.map(() => 'classic')
  const n = candidates.length
  const limit = Math.min(target, MAX_VARIANTS_PER_ROUND)
  if (n < 3 || limit <= 0) return forms

  const possible = []
  for (let i = 1; i < n - 1; i++) {
    const c = candidates[i]
    if (c.known && (c.eligibility.true_false || c.eligibility.eliminate)) possible.push(i)
  }
  const chosen: number[] = []
  for (const i of shuffle(possible, rng)) {
    if (chosen.length >= limit) break
    if (chosen.some((j) => Math.abs(j - i) <= 1)) continue
    chosen.push(i)
  }
  for (const i of chosen) {
    const e = candidates[i].eligibility
    forms[i] = e.true_false && e.eliminate ? (rng() < 0.5 ? 'true_false' : 'eliminate') : e.true_false ? 'true_false' : 'eliminate'
  }
  return forms
}

/** Vorschlag für Richtig/Falsch: 50 % die richtige, sonst eine zufällige falsche Option */
export function pickProposal(optionIds: string[], correctId: string, rng: Rng = Math.random): string {
  const wrong = optionIds.filter((id) => id !== correctId)
  if (wrong.length === 0 || rng() < 0.5) return correctId
  return wrong[Math.floor(rng() * wrong.length)]
}

// ── Zettel anlegen ──────────────────────────────────────────────────────────
export interface SlipSource {
  id: string
  question_text: string
  difficulty: string
  explanation: string | null
  /** Bereits gemischt */
  options: { id: string; option_text: string }[]
  correct_option_id: string
}

export function buildSlipQuestion(src: SlipSource, form: QuizRoundForm, rng: Rng = Math.random): SlipQuestion {
  return {
    question_id: src.id,
    question_text: src.question_text,
    difficulty: src.difficulty,
    form,
    options: src.options,
    correct_option_id: src.correct_option_id,
    explanation: src.explanation,
    proposal_option_id:
      form === 'true_false' ? pickProposal(src.options.map((o) => o.id), src.correct_option_id, rng) : undefined,
    answered: false,
    eliminated: [],
    kept: [],
    mistakes: 0,
    joker_removed: [],
  }
}

/** Was der Browser sieht – ohne Lösung */
export function toClientQuestion(q: SlipQuestion, index: number): RoundQuestion {
  const out: RoundQuestion = {
    index,
    id: q.question_id,
    question_text: q.question_text,
    difficulty: q.difficulty,
    form: q.form,
    options: q.options.map((o) => ({ id: o.id, option_text: o.option_text })),
  }
  if (q.form === 'true_false' && q.proposal_option_id) out.proposal_option_id = q.proposal_option_id
  return out
}

// ── Wertung ─────────────────────────────────────────────────────────────────
export function presentationOf(q: SlipQuestion): AnswerPresentation {
  if (q.form === 'classic' && q.joker_removed.length > 0) return 'joker'
  return q.form
}

export type RewardTier = 'full' | 'half' | 'none'

export function rewardTier(q: SlipQuestion): RewardTier {
  if (!q.answered || !q.correct) return 'none'
  if (q.form === 'true_false') return 'half'
  if (q.form === 'eliminate') return q.mistakes === 0 ? 'full' : 'half'
  return 'full'
}

export function xpFor(tier: RewardTier, streakBonus: boolean): number {
  if (tier === 'full') return QUIZ_XP_FULL + (streakBonus ? QUIZ_XP_FULL_STREAK_BONUS : 0)
  if (tier === 'half') return QUIZ_XP_HALF + (streakBonus ? QUIZ_XP_HALF_STREAK_BONUS : 0)
  return 0
}

/** Münzen in halben Einheiten (1 Münze = 2) */
export function halfCoinsFor(tier: RewardTier): number {
  return tier === 'full' ? 2 : tier === 'half' ? 1 : 0
}

function answerCoinsUpTo(slip: RoundSlip, lastIndexInclusive: number): number {
  let half = 0
  for (let i = 0; i <= lastIndexInclusive && i < slip.questions.length; i++) half += halfCoinsFor(rewardTier(slip.questions[i]))
  return Math.floor(half / 2)
}

/**
 * Einsatz der Wette: alle bis zur vorletzten Frage verdienten Münzen
 * inklusive Rundenbonus, abzüglich Joker, höchstens 10. So sinkt der
 * Münzstand vor der Runde durch eine verlorene Wette nie.
 */
export function wagerStake(slip: RoundSlip): number {
  const total = slip.questions.length
  if (total < QUIZ_ROUND_BONUS_MIN_TOTAL) return 0
  const earned = answerCoinsUpTo(slip, total - 2) + QUIZ_ROUND_BONUS - slip.jokers_used * JOKER_PRICE
  return Math.max(0, Math.min(WAGER_MAX_STAKE, earned))
}

// ── Antwort verarbeiten ─────────────────────────────────────────────────────
function resolvedResponse(q: SlipQuestion, slip: RoundSlip, index: number): RoundAnswerResponse {
  const isPenultimate = index === slip.questions.length - 2
  return {
    status: 'resolved',
    correct: q.correct === true,
    correct_option_id: q.correct_option_id,
    explanation: q.explanation,
    ...(q.form === 'eliminate'
      ? {
          eliminate: {
            option_id: q.last_tap ?? q.correct_option_id,
            step: q.correct ? ('eliminated' as const) : ('heart_lost' as const),
            hearts_left: Math.max(0, ELIMINATE_HEARTS - q.mistakes),
            mistakes: q.mistakes,
          },
        }
      : {}),
    ...(isPenultimate ? { wager_offer: slip.wager ? { stake: slip.wager.stake } : null } : {}),
  }
}

/**
 * Verarbeitet eine Antwort gegen den Zettel. Gibt den neuen Zettel und die
 * Antwort für den Browser zurück. Wiederholte Anfragen ändern nichts und
 * liefern dieselbe Antwort.
 */
export function applyAnswer(
  slip: RoundSlip,
  req: RoundAnswerRequest,
  now: Date = new Date(),
): { slip: RoundSlip; response: RoundAnswerResponse; changed: boolean } | RuleError {
  const index = req.question_index
  const original = slip.questions[index]
  if (!original) return { error: 'bad_request', message: 'Frage gibt es in dieser Runde nicht' }

  if (original.answered) return { slip, response: resolvedResponse(original, slip, index), changed: false }

  const kindMatches =
    (req.kind === 'choice' && original.form === 'classic') ||
    (req.kind === 'true_false' && original.form === 'true_false') ||
    (req.kind === 'eliminate' && original.form === 'eliminate')
  if (!kindMatches) return { error: 'bad_request', message: 'Antwort passt nicht zur Darstellungsform' }

  // Wette muss vor der letzten Frage entschieden sein – sonst gilt „nicht eingesetzt“
  const isLast = index === slip.questions.length - 1
  const wager = slip.wager && isLast && slip.wager.accepted === null ? { ...slip.wager, accepted: false } : slip.wager

  const q: SlipQuestion = { ...original, eliminated: [...original.eliminated], kept: [...original.kept] }
  const optionIds = q.options.map((o) => o.id)
  const stamp = now.toISOString()

  if (req.kind === 'choice') {
    if (!optionIds.includes(req.option_id)) return { error: 'bad_request', message: 'Option gehört nicht zur Frage' }
    q.answered = true
    q.selected_option_id = req.option_id
    q.correct = req.option_id === q.correct_option_id
    q.answered_at = stamp
  } else if (req.kind === 'true_false') {
    const proposalIsCorrect = q.proposal_option_id === q.correct_option_id
    q.answered = true
    q.says_true = req.says_true
    q.selected_option_id = q.proposal_option_id
    q.correct = req.says_true === proposalIsCorrect
    q.answered_at = stamp
  } else {
    if (!optionIds.includes(req.option_id)) return { error: 'bad_request', message: 'Option gehört nicht zur Frage' }
    // Wiederholter Tipp (Doppelklick, Netz-Wiederholung) kostet nichts extra
    if (q.eliminated.includes(req.option_id)) {
      return {
        slip,
        response: { status: 'eliminated', option_id: req.option_id, hearts_left: ELIMINATE_HEARTS - q.mistakes },
        changed: false,
      }
    }
    if (q.kept.includes(req.option_id)) {
      return {
        slip,
        response: { status: 'heart_lost', option_id: req.option_id, hearts_left: ELIMINATE_HEARTS - q.mistakes },
        changed: false,
      }
    }
    if (req.option_id === q.correct_option_id) {
      q.kept.push(req.option_id)
      q.mistakes += 1
      if (q.mistakes >= ELIMINATE_HEARTS) {
        q.answered = true
        q.correct = false
        q.selected_option_id = q.correct_option_id
        q.last_tap = req.option_id
        q.answered_at = stamp
      } else {
        const next = replaceQuestion(slip, index, q, wager)
        return {
          slip: next,
          response: { status: 'heart_lost', option_id: req.option_id, hearts_left: ELIMINATE_HEARTS - q.mistakes },
          changed: true,
        }
      }
    } else {
      q.eliminated.push(req.option_id)
      const wrongCount = optionIds.length - 1
      if (q.eliminated.length >= wrongCount) {
        q.answered = true
        q.correct = true
        // Gespeichert wird die Option, die übrig bleibt
        q.selected_option_id = q.correct_option_id
        q.last_tap = req.option_id
        q.answered_at = stamp
      } else {
        const next = replaceQuestion(slip, index, q, wager)
        return {
          slip: next,
          response: { status: 'eliminated', option_id: req.option_id, hearts_left: ELIMINATE_HEARTS - q.mistakes },
          changed: true,
        }
      }
    }
  }

  let next = replaceQuestion(slip, index, q, wager)
  // Wette anbieten mit der Antwort auf die vorletzte Frage
  if (index === next.questions.length - 2 && next.variants && next.wager === null) {
    const stake = wagerStake(next)
    if (stake >= 1) next = { ...next, wager: { stake, accepted: null } }
  }
  const response = resolvedResponse(q, next, index)
  return { slip: next, response, changed: true }
}

function replaceQuestion(slip: RoundSlip, index: number, q: SlipQuestion, wager: SlipWager | null): RoundSlip {
  const questions = slip.questions.slice()
  questions[index] = q
  return { ...slip, questions, wager }
}

// ── Joker ──────────────────────────────────────────────────────────────────
export function applyJoker(
  slip: RoundSlip,
  index: number,
  coinBalance: number,
  rng: Rng = Math.random,
): { slip: RoundSlip; response: RoundJokerResponse; changed: boolean } | RuleError {
  const q = slip.questions[index]
  if (!q) return { error: 'bad_request', message: 'Frage gibt es in dieser Runde nicht' }
  const reply = (s: RoundSlip, removed: string[], changed: boolean) => ({
    slip: s,
    response: { removed_option_ids: removed, jokers_used: s.jokers_used, coins_reserved: s.jokers_used * JOKER_PRICE },
    changed,
  })
  // Zweiter Klick auf dieselbe Frage: dieselben Optionen, keine Kosten
  if (q.joker_removed.length > 0) return reply(slip, q.joker_removed, false)

  if (!slip.variants) return { error: 'conflict', message: 'Joker ist ausgeschaltet' }
  if (q.form !== 'classic') return { error: 'conflict', message: 'Joker nur bei klassischen Fragen' }
  if (q.answered) return { error: 'conflict', message: 'Frage ist schon beantwortet' }
  // QA BUG-3: die letzte Frage ist immer die mögliche Wettfrage – auch bevor die
  // Wette angeboten wurde (sonst Joker vorab holen und danach wetten)
  if (index === slip.questions.length - 1) return { error: 'conflict', message: 'Kein Joker auf der letzten Frage' }
  if (slip.jokers_used >= JOKER_MAX_PER_ROUND) return { error: 'conflict', message: 'Höchstens zwei Joker pro Runde' }
  if (coinBalance < JOKER_PRICE * (slip.jokers_used + 1)) return { error: 'too_poor', message: 'Zu wenig Münzen' }

  const wrong = q.options.map((o) => o.id).filter((id) => id !== q.correct_option_id)
  const removeCount = Math.min(2, wrong.length - 1)
  if (removeCount < 1) return { error: 'conflict', message: 'Zu wenige Optionen für den Joker' }
  const removed = shuffle(wrong, rng).slice(0, removeCount)

  const questions = slip.questions.slice()
  questions[index] = { ...q, joker_removed: removed }
  return reply({ ...slip, questions, jokers_used: slip.jokers_used + 1 }, removed, true)
}

// ── Wette ──────────────────────────────────────────────────────────────────
export function applyWager(
  slip: RoundSlip,
  accept: boolean,
): { slip: RoundSlip; response: RoundWagerResponse; changed: boolean } | RuleError {
  if (!slip.wager) return { error: 'conflict', message: 'Keine Wette angeboten' }
  if (slip.wager.accepted !== null) {
    return { slip, response: { accepted: slip.wager.accepted, stake: slip.wager.stake }, changed: false }
  }
  const last = slip.questions[slip.questions.length - 1]
  if (last.answered) {
    // Zu spät: die letzte Frage ist schon beantwortet
    const next = { ...slip, wager: { ...slip.wager, accepted: false } }
    return { slip: next, response: { accepted: false, stake: slip.wager.stake }, changed: true }
  }
  const next = { ...slip, wager: { ...slip.wager, accepted: accept } }
  return { slip: next, response: { accepted: accept, stake: slip.wager.stake }, changed: true }
}

// ── Abrechnung normales Quiz ───────────────────────────────────────────────
export interface QuizSettlement {
  score: number
  total: number
  xp: number
  answer_coins: number
  round_bonus: number
  joker_cost: number
  wager: WagerOutcome | null
  /** Netto (kann durch Joker negativ sein; der Stand wird beim Buchen nie negativ) */
  net_coins: number
}

export function settleQuiz(slip: RoundSlip, streakBonus: boolean): QuizSettlement {
  const answered = slip.questions.filter((q) => q.answered)
  const total = answered.length
  let xp = 0
  let half = 0
  let score = 0
  for (const q of answered) {
    const tier = rewardTier(q)
    xp += xpFor(tier, streakBonus)
    half += halfCoinsFor(tier)
    if (q.correct) score++
  }
  const answerCoins = Math.floor(half / 2)
  const roundBonus = total >= QUIZ_ROUND_BONUS_MIN_TOTAL ? QUIZ_ROUND_BONUS : 0
  const jokerCost = slip.jokers_used * JOKER_PRICE

  const last = slip.questions[slip.questions.length - 1]
  let wager: WagerOutcome | null = null
  // QA BUG-2: angenommene Wette + letzte Frage nicht beantwortet = verloren
  // (sonst: bei Unsicherheit einfach abrechnen und nie verlieren)
  if (slip.wager?.accepted && last) {
    const won = last.answered && last.correct === true
    // QA BUG-4: Ein Verlust nimmt nie mehr, als die Runde ohne Wette eingebracht
    // hätte – der Münzstand vor der Runde sinkt durch die Wette nie
    const beforeWager = answerCoins + roundBonus - jokerCost
    const loss = Math.min(slip.wager.stake, Math.max(0, beforeWager))
    wager = { stake: slip.wager.stake, won, delta: won ? slip.wager.stake : -loss }
  }
  const net = answerCoins + roundBonus - jokerCost + (wager?.delta ?? 0)
  return {
    score,
    total,
    xp,
    answer_coins: answerCoins,
    round_bonus: roundBonus,
    joker_cost: jokerCost,
    wager,
    net_coins: net,
  }
}

// ── Abrechnung Blitzrunde ─────────────────────────────────────────────────
export const BLITZ_TF_COINS_PER_POINT = 2
export const BLITZ_TF_XP_PER_POINT = 3
export const BLITZ_CLASSIC_COINS_PER_CORRECT = 3
export const BLITZ_CLASSIC_XP_PER_CORRECT = 5
export const BLITZ_DAILY_BONUS = 10

export function settleBlitz(slip: RoundSlip, form: 'true_false' | 'classic') {
  const answered = slip.questions.filter((q) => q.answered)
  const correct = answered.filter((q) => q.correct).length
  const wrong = answered.length - correct
  if (form === 'true_false') {
    const points = Math.max(0, correct - wrong)
    return {
      correct_count: correct,
      wrong_count: wrong,
      points,
      coins: points * BLITZ_TF_COINS_PER_POINT + BLITZ_DAILY_BONUS,
      xp: points * BLITZ_TF_XP_PER_POINT,
    }
  }
  return {
    correct_count: correct,
    wrong_count: wrong,
    points: correct,
    coins: correct * BLITZ_CLASSIC_COINS_PER_CORRECT + BLITZ_DAILY_BONUS,
    xp: correct * BLITZ_CLASSIC_XP_PER_CORRECT,
  }
}

// ── Streak (wie PROJ-5) ─────────────────────────────────────────────────────
export function getBerlinDateStr(offsetDays = 0, nowMs: number = Date.now()): string {
  const date = new Date(nowMs + offsetDays * 86_400_000)
  return new Intl.DateTimeFormat('sv', { timeZone: 'Europe/Berlin' }).format(date)
}

export function calcNewStreak(lastSessionDate: string | null, currentStreak: number, today: string, yesterday: string): number {
  if (!lastSessionDate) return 1
  if (lastSessionDate === today) return currentStreak
  if (lastSessionDate === yesterday) return currentStreak + 1
  return 1
}
