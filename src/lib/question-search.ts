/** Treffer in den Antworten werden auf so viele begrenzt, damit die Anfrage-Adresse kurz bleibt. */
export const ANSWER_MATCH_LIMIT = 200

/** Suchbegriff als ILIKE-Muster; `%`, `_` und `\` gelten wörtlich. */
export function likePattern(term: string): string {
  return `%${term.trim().replace(/[\\%_]/g, (c) => `\\${c}`)}%`
}

/**
 * Filtertext für `.or()`: Fragetext passt oder eine der Fragen mit passender
 * Antwort. Der Wert steht in Anführungszeichen, damit Kommas und Klammern im
 * Suchbegriff den Filter nicht zerlegen.
 */
export function questionOrAnswerFilter(term: string, answerQuestionIds: string[]): string {
  const quoted = `"${likePattern(term).replace(/["\\]/g, (c) => `\\${c}`)}"`
  const parts = [`question_text.ilike.${quoted}`]
  if (answerQuestionIds.length > 0) parts.push(`id.in.(${answerQuestionIds.join(',')})`)
  return parts.join(',')
}
