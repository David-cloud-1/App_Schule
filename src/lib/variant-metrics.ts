/**
 * PROJ-129 (QA BUG-6): Auswertung der Quiz-Varianten für das Spielspaß-Audit
 * (`npm run fun:audit`). Rein, ohne Datenbank – läuft auch direkt mit Node
 * (Type-Stripping), deshalb keine Imports und keine TS-only-Syntax.
 *
 * Misst: Anteil und Trefferquote je Darstellungsform, Rauswerfen-Ausgang,
 * Joker-Nutzung, Wett-Quote und -Ausgang sowie die Münzen je Runde mit und
 * ohne Varianten (Inflations-Wächter aus dem Tech Design).
 */

export type Presentation = 'classic' | 'true_false' | 'eliminate' | 'joker'

export interface VariantAnswerRow {
  user_id: string
  is_correct: boolean | null
  presentation: string | null
  mistakes: number | null
}

export interface VariantSessionRow {
  user_id: string
  score: number | null
  total: number | null
  coins_earned: number | null
  joker_cost: number | null
  wager_stake: number | null
  wager_won: boolean | null
}

export interface FormStats {
  form: Presentation
  answers: number
  /** Anteil an allen Antworten */
  share: number
  correct: number
  /** Trefferquote innerhalb der Form (0, wenn keine Antworten) */
  hitRate: number
}

export interface VariantReport {
  answers: number
  forms: FormStats[]
  eliminate: { passed: number; failed: number }
  /** Runden über den Rundenzettel (erkennbar an gesetztem `coins_earned`) */
  roundSessions: number
  joker: { rounds: number; share: number; coinsSpent: number }
  wager: { taken: number; share: number; won: number; winRate: number; netCoins: number }
  coins: {
    /** Ø tatsächlich gebuchte Münzen je Runde (inkl. Joker und Wette) */
    perRound: number
    /** Ø Münzen nach alter Regel (1 je Treffer + 3 Bonus ab 5 Fragen) für dieselben Runden */
    perRoundClassicRule: number
  }
}

const FORMS: Presentation[] = ['classic', 'true_false', 'eliminate', 'joker']
const ROUND_BONUS = 3
const ROUND_BONUS_MIN_TOTAL = 5

function ratio(a: number, b: number): number {
  return b > 0 ? a / b : 0
}

function round1(n: number): number {
  return Math.round(n * 10) / 10
}

function formOf(p: string | null): Presentation {
  return p === 'true_false' || p === 'eliminate' || p === 'joker' ? p : 'classic'
}

/**
 * @param userIds nur diese Spieler (z. B. ohne Admin-/Testkonten); ohne Angabe alle
 */
export function analyzeVariants(
  answers: VariantAnswerRow[],
  sessions: VariantSessionRow[],
  userIds?: Set<string>,
): VariantReport {
  const keep = (u: string) => !userIds || userIds.has(u)
  const a = answers.filter((r) => keep(r.user_id))
  const s = sessions.filter((r) => keep(r.user_id) && r.coins_earned !== null)

  const counts = new Map<Presentation, { n: number; ok: number }>(FORMS.map((f) => [f, { n: 0, ok: 0 }]))
  let elimPassed = 0
  let elimFailed = 0
  for (const r of a) {
    const f = formOf(r.presentation)
    const c = counts.get(f)!
    c.n++
    if (r.is_correct) c.ok++
    if (f === 'eliminate') {
      if (r.is_correct) elimPassed++
      else elimFailed++
    }
  }
  const forms = FORMS.map((form) => {
    const c = counts.get(form)!
    return { form, answers: c.n, share: ratio(c.n, a.length), correct: c.ok, hitRate: ratio(c.ok, c.n) }
  })

  let jokerRounds = 0
  let jokerCoins = 0
  let wagerTaken = 0
  let wagerWon = 0
  let wagerNet = 0
  let coinsSum = 0
  let classicSum = 0
  for (const r of s) {
    const cost = r.joker_cost ?? 0
    if (cost > 0) {
      jokerRounds++
      jokerCoins += cost
    }
    if (r.wager_stake !== null && r.wager_won !== null) {
      wagerTaken++
      if (r.wager_won) {
        wagerWon++
        wagerNet += r.wager_stake
      } else {
        // Verlust ist gedeckelt (QA BUG-4) – hier zählt der Einsatz als Obergrenze
        wagerNet -= r.wager_stake
      }
    }
    coinsSum += r.coins_earned ?? 0
    const total = r.total ?? 0
    classicSum += (r.score ?? 0) + (total >= ROUND_BONUS_MIN_TOTAL ? ROUND_BONUS : 0)
  }

  return {
    answers: a.length,
    forms,
    eliminate: { passed: elimPassed, failed: elimFailed },
    roundSessions: s.length,
    joker: { rounds: jokerRounds, share: ratio(jokerRounds, s.length), coinsSpent: jokerCoins },
    wager: {
      taken: wagerTaken,
      share: ratio(wagerTaken, s.length),
      won: wagerWon,
      winRate: ratio(wagerWon, wagerTaken),
      netCoins: wagerNet,
    },
    coins: {
      perRound: round1(ratio(coinsSum, s.length)),
      perRoundClassicRule: round1(ratio(classicSum, s.length)),
    },
  }
}

export const FORM_NAME: Record<Presentation, string> = {
  classic: 'Klassisch (MC)',
  true_false: 'Richtig/Falsch',
  eliminate: 'Rauswerfen',
  joker: 'MC mit Joker',
}
