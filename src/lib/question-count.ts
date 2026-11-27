/**
 * Die eine Zählregel für Fragen (PROJ-131, B35): Eine Frage zählt, wenn sie
 * nicht im Papierkorb liegt und zum gewählten Bereich gehört. Ausgeblendete
 * Fragen zählen mit und werden als „davon N ausgeblendet“ genannt.
 * Private Nachweis-Fragen zählen nur für den Super-Admin (PROJ-46).
 * Das Filtern passiert beim Laden (`question-count-server.ts`), hier wird nur
 * gezählt — Baum, Listenkopf und Start benutzen dieselben Zeilen.
 */

export type CountableQuestionRow = {
  topic_id: string | null
  class_level: number | null
  is_active: boolean
  question_subjects: { subject_id: string }[] | null
}

export type QuestionTotals = { total: number; hidden: number }

/** Fragen je Fach. Eine Frage mit mehreren Fächern zählt in jedem, je Fach einmal. */
export function countBySubject(rows: CountableQuestionRow[]): Map<string, QuestionTotals> {
  const result = new Map<string, QuestionTotals>()
  for (const q of rows) {
    for (const sid of new Set((q.question_subjects ?? []).map((qs) => qs.subject_id))) {
      const entry = result.get(sid) ?? { total: 0, hidden: 0 }
      entry.total++
      if (!q.is_active) entry.hidden++
      result.set(sid, entry)
    }
  }
  return result
}

/** „834 Fragen, davon 98 ausgeblendet“ */
export function formatQuestionTotals({ total, hidden }: QuestionTotals): string {
  const base = `${total.toLocaleString('de-DE')} ${total === 1 ? 'Frage' : 'Fragen'}`
  return hidden > 0 ? `${base}, davon ${hidden.toLocaleString('de-DE')} ausgeblendet` : base
}
