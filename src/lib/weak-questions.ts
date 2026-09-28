import type { UserAnswer } from '@/lib/quiz-answers'

/** Correct answers in a row that close a gap again. */
export const CORRECT_STREAK_TO_CLOSE = 2

/**
 * When the current gap rule took over (2026-09-28 00:00 Europe/Berlin).
 * Mistakes before it only count through the old rule, so switching rules
 * didn't suddenly open hundreds of gaps nobody had seen before.
 */
export const GAP_RULE_SINCE = '2026-09-27T22:00:00Z'

/** Old rule, applied to answers before GAP_RULE_SINCE: more wrong than right. */
const LEGACY_ERROR_THRESHOLD = 0.5

/**
 * Question ids that are currently a "Lücke" for the user, worst first.
 *
 * A question becomes a gap when it's answered wrong, and stays one until it
 * has been answered correctly CORRECT_STREAK_TO_CLOSE times in a row. A new
 * wrong answer reopens it. Answers before GAP_RULE_SINCE only carry over the
 * gaps the old error-rate rule had open at that point.
 *
 * `answers` must be in chronological order (oldest first).
 */
export function computeWeakQuestionIds(answers: UserAnswer[]): string[] {
  const since = Date.parse(GAP_RULE_SINCE)
  const stats = new Map<
    string,
    { total: number; wrong: number; correctStreak: number; open: boolean; legacyDone: boolean }
  >()

  for (const { question_id, is_correct, answered_at } of answers) {
    const s = stats.get(question_id) ?? {
      total: 0,
      wrong: 0,
      correctStreak: 0,
      open: false,
      legacyDone: false,
    }
    const isNew = Date.parse(answered_at) >= since

    if (isNew && !s.legacyDone) {
      // First answer under the new rule: carry over what the old rule left open.
      s.open = s.total > 0 && s.wrong / s.total > LEGACY_ERROR_THRESHOLD
      s.legacyDone = true
    }

    s.total++
    if (is_correct) {
      s.correctStreak++
    } else {
      s.wrong++
      s.correctStreak = 0
      if (isNew) s.open = true
    }
    stats.set(question_id, s)
  }

  return [...stats.entries()]
    .filter(([, s]) => {
      const open = s.legacyDone ? s.open : s.wrong / s.total > LEGACY_ERROR_THRESHOLD
      return open && s.correctStreak < CORRECT_STREAK_TO_CLOSE
    })
    // Not yet started on first, then by overall error rate.
    .sort(([, a], [, b]) => a.correctStreak - b.correctStreak || b.wrong / b.total - a.wrong / a.total)
    .map(([id]) => id)
}
