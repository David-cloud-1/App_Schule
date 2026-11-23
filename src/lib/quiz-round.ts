/**
 * PROJ-129: Vertrag zwischen Browser und Server für Runden mit Rundenzettel.
 *
 * Der Browser bekommt nie die Lösung vor der Antwort. Jede Antwort geht einzeln
 * an den Server, der gegen den Rundenzettel prüft. Diese Datei enthält nur
 * Typen, Zod-Schemas für die Anfragen und reine Regeln für die Oberfläche;
 * sie wird von Browser und Server gemeinsam benutzt.
 *
 * API-Wege (baut /backend):
 *   POST /api/quiz/rounds                    { kind: 'blitz' }        → BlitzRoundStart (409 = heute schon gespielt)
 *   POST /api/quiz/rounds/[id]/answer        RoundAnswerRequest       → RoundAnswerResponse
 *   POST /api/quiz/rounds/[id]/joker         RoundJokerRequest        → RoundJokerResponse (402 zu wenig Münzen, 409 nicht erlaubt)
 *   POST /api/quiz/rounds/[id]/wager         RoundWagerRequest        → RoundWagerResponse
 *   POST /api/quiz/rounds/[id]/finish        –                        → QuizRoundResult | BlitzRoundResult
 * Die normale Quiz-Runde wird auf dem Server beim Laden von /quiz angelegt
 * (QuizRoundStart als Prop für QuizRoundClient). Alle Wege sind wiederholbar:
 * dieselbe Anfrage zweimal liefert dieselbe Antwort ohne doppelte Wirkung.
 */
import { z } from 'zod'
import type { BadgeDisplay } from '@/lib/badges'

// ── Zahlen aus dem Tech Design (Abschnitt D) ────────────────────────────────
export const JOKER_PRICE = 5
export const JOKER_MAX_PER_ROUND = 2
export const WAGER_MAX_STAKE = 10
export const ELIMINATE_HEARTS = 2
export const BLITZ_SECONDS = 60
/** Ab dieser Wischweite (px) zählt ein Wischen als Antwort. */
export const SWIPE_THRESHOLD_PX = 80

// ── Darstellungsformen ──────────────────────────────────────────────────────
export const QUIZ_ROUND_FORMS = ['classic', 'true_false', 'eliminate'] as const
export type QuizRoundForm = (typeof QUIZ_ROUND_FORMS)[number]

export const FORM_LABEL: Record<QuizRoundForm, string> = {
  classic: 'Auswahl',
  true_false: 'Wischfrage',
  eliminate: 'Rauswerfen',
}

/** Erst-Hinweis: ein Satz, einmal je Variante und Gerät. */
export const FORM_HINT: Record<Exclude<QuizRoundForm, 'classic'>, string> = {
  true_false: 'Stimmt die Antwort zur Frage? Tippe „Stimmt“ oder „Stimmt nicht“ – oder wische nach rechts bzw. links.',
  eliminate: 'Tippe alle falschen Antworten weg, bis nur die richtige übrig bleibt. Du hast zwei Herzen.',
}

// ── Daten, die der Browser bekommt (ohne Lösung) ────────────────────────────
export interface RoundOption {
  id: string
  option_text: string
}

export interface RoundQuestion {
  /** Platz in der Runde (0-basiert), Schlüssel für alle Anfragen */
  index: number
  id: string
  question_text: string
  difficulty: string
  form: QuizRoundForm
  options: RoundOption[]
  /** Nur bei Richtig/Falsch: die vorgeschlagene Option (richtig oder falsch) */
  proposal_option_id?: string
}

export interface JokerConfig {
  enabled: boolean
  price: number
  max_per_round: number
}

export interface QuizRoundStart {
  round_id: string
  questions: RoundQuestion[]
  /** Münzstand vor der Runde */
  coin_balance: number
  joker: JokerConfig
}

export interface BlitzRoundStart {
  round_id: string
  /** 'true_false' bei genug gekannten Fragen, sonst klassisch wie bisher */
  form: 'true_false' | 'classic'
  seconds: number
  questions: RoundQuestion[]
}

// ── Anfragen (werden auf dem Server mit diesen Schemas geprüft) ─────────────
const QuestionIndex = z.number().int().min(0).max(99)

export const RoundAnswerRequestSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('choice'), question_index: QuestionIndex, option_id: z.string().uuid() }),
  z.object({ kind: z.literal('true_false'), question_index: QuestionIndex, says_true: z.boolean() }),
  z.object({ kind: z.literal('eliminate'), question_index: QuestionIndex, option_id: z.string().uuid() }),
])
export type RoundAnswerRequest = z.infer<typeof RoundAnswerRequestSchema>

export const RoundJokerRequestSchema = z.object({ question_index: QuestionIndex })
export type RoundJokerRequest = z.infer<typeof RoundJokerRequestSchema>

export const RoundWagerRequestSchema = z.object({ accept: z.boolean() })
export type RoundWagerRequest = z.infer<typeof RoundWagerRequestSchema>

export const RoundStartRequestSchema = z.object({ kind: z.literal('blitz') })

// ── Antworten des Servers ───────────────────────────────────────────────────
/** Ein Rauswerfen-Tipp, der die Frage noch nicht entscheidet */
export interface EliminateStepResponse {
  status: 'eliminated' | 'heart_lost'
  option_id: string
  hearts_left: number
}

/** Die Frage ist entschieden */
export interface ResolvedAnswerResponse {
  status: 'resolved'
  correct: boolean
  correct_option_id: string
  explanation: string | null
  /** Nur bei Rauswerfen: der letzte Tipp und die Fehlgriffe */
  eliminate?: { option_id: string; step: 'eliminated' | 'heart_lost'; hearts_left: number; mistakes: number }
  /** Kommt mit der Antwort auf die vorletzte Frage, wenn eine Wette angeboten wird */
  wager_offer?: { stake: number } | null
}

export type RoundAnswerResponse = EliminateStepResponse | ResolvedAnswerResponse

export interface RoundJokerResponse {
  removed_option_ids: string[]
  jokers_used: number
  /** Für diese Runde vorgemerkte Joker-Kosten (abgebucht erst beim Abrechnen) */
  coins_reserved: number
}

export interface RoundWagerResponse {
  accepted: boolean
  stake: number
}

export interface WagerOutcome {
  stake: number
  won: boolean
  /** +stake bei Gewinn, −stake bei Verlust */
  delta: number
}

export interface QuizRoundResult {
  score: number
  total: number
  xp_earned: number
  new_total_xp: number
  new_streak: number
  leveled_up: boolean
  old_level: number
  new_level: number
  new_badges: string[]
  new_badge_details?: BadgeDisplay[]
  /** Netto-Münzen dieser Runde (nach Joker und Wette, nie unter 0) */
  coins_earned: number
  coins: {
    answers: number
    round_bonus: number
    joker_cost: number
    wager: WagerOutcome | null
  }
}

export interface BlitzRoundResult {
  form: 'true_false' | 'classic'
  correct_count: number
  wrong_count: number
  /** Richtig/Falsch: Treffer − Fehler (nie unter 0); klassisch: Treffer */
  points: number
  coins_earned: number
  xp_earned: number
  new_coin_balance: number
  new_total_xp: number
  new_streak: number
}

// ── Reine Regeln für die Oberfläche ─────────────────────────────────────────
export type JokerState = 'hidden' | 'available' | 'used' | 'too_poor' | 'limit'

/**
 * Ob und wie der Joker-Knopf erscheint. Der Server prüft dasselbe noch einmal;
 * das hier ist nur die Anzeige.
 */
export function jokerState(input: {
  joker: JokerConfig
  form: QuizRoundForm
  /** Münzstand vor der Runde */
  coinBalance: number
  jokersUsed: number
  usedOnThisQuestion: boolean
  isLastQuestion: boolean
  wagerOffered: boolean
  answered: boolean
}): JokerState {
  const { joker, form, coinBalance, jokersUsed, usedOnThisQuestion, isLastQuestion, wagerOffered, answered } = input
  if (!joker.enabled || form !== 'classic') return 'hidden'
  if (isLastQuestion && wagerOffered) return 'hidden'
  if (usedOnThisQuestion) return 'used'
  if (answered) return 'hidden'
  if (jokersUsed >= joker.max_per_round) return 'limit'
  // Der Münzstand muss alle Joker dieser Runde decken (nie negativ)
  if (coinBalance < joker.price * (jokersUsed + 1)) return 'too_poor'
  return 'available'
}

/** Wischweite → Antwort. Rechts = „Stimmt“, links = „Stimmt nicht“. */
export function swipeDecision(dx: number, threshold = SWIPE_THRESHOLD_PX): boolean | null {
  if (dx >= threshold) return true
  if (dx <= -threshold) return false
  return null
}

export function coinWord(n: number): string {
  return Math.abs(n) === 1 ? 'Münze' : 'Münzen'
}

/** Zeile für den Ergebnis-Bildschirm, z. B. „Wette gewonnen: +8 Münzen“ */
export function formatWagerOutcome(w: WagerOutcome): string {
  return w.won
    ? `Wette gewonnen: +${w.stake} ${coinWord(w.stake)}`
    : `Wette verloren: −${w.stake} ${coinWord(w.stake)}`
}

export function formatJokerCost(cost: number): string {
  return `Joker: −${cost} ${coinWord(cost)}`
}

/** Blitzrunde: Live-Punktestand, wie der Server ihn rechnet */
export function blitzPoints(form: 'true_false' | 'classic', correct: number, wrong: number): number {
  return form === 'true_false' ? Math.max(0, correct - wrong) : correct
}

export function hintStorageKey(form: Exclude<QuizRoundForm, 'classic'>): string {
  return `quiz_hint_seen_${form}`
}
