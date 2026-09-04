/**
 * Brücke zwischen dem Import-Format des Bulk-Imports und der Qualitätsprüfung.
 *
 * Der übliche Weg zu neuen Fragen führt über den kopierten Prompt und eine
 * externe KI — geprüft wird deshalb genau hier, beim Einfügen. Die Prüfung
 * läuft ohne KI und kostet nichts, weder im Browser noch auf dem Server.
 */
import { analyzeQuestion, type QualityFinding, type QuestionInput } from './question-quality'
import { QUESTION_QUALITY_RULES } from './question-rules'

export interface ImportRow {
  question_text: string
  antwort_a: string
  antwort_b: string
  antwort_c: string
  antwort_d: string
  antwort_e: string
  korrekte_antwort: 'A' | 'B' | 'C' | 'D' | 'E'
  erklaerung?: string | null
  fach_code: string
  schwierigkeit: string
  klassenstufe?: number | null
  thema?: string | null
}

const LETTERS = ['A', 'B', 'C', 'D', 'E'] as const

/**
 * Robust gegen unvollständige KI-Antworten: die Zeilen sind im Browser noch
 * nicht schema-validiert, fehlende Felder dürfen die Prüfung nicht abstürzen
 * lassen — sie werden als leere Option sichtbar und damit beanstandet.
 */
export function rowToQuestion(row: ImportRow): QuestionInput {
  const text = (v: unknown) => (typeof v === 'string' ? v : '')
  return {
    question_text: text(row?.question_text),
    options: [row?.antwort_a, row?.antwort_b, row?.antwort_c, row?.antwort_d, row?.antwort_e].map(text),
    correct_index: LETTERS.indexOf(row?.korrekte_antwort),
    explanation: row?.erklaerung ?? null,
  }
}

export interface FlaggedRow {
  index: number
  row: ImportRow
  blockers: QualityFinding[]
}

export interface ImportCheck {
  total: number
  clean: number
  flagged: FlaggedRow[]
}

/** Prüft alle Zeilen eines Imports; beanstandet werden nur echte Blocker. */
export function checkImportRows(rows: ImportRow[]): ImportCheck {
  const flagged: FlaggedRow[] = []
  rows.forEach((row, index) => {
    const report = analyzeQuestion(rowToQuestion(row))
    const blockers = report.findings.filter((f) => f.severity === 'blocker')
    if (blockers.length > 0) flagged.push({ index, row, blockers })
  })
  return { total: rows.length, clean: rows.length - flagged.length, flagged }
}

/**
 * Baut einen fertigen Korrekturauftrag für dieselbe KI, die die Fragen
 * erzeugt hat: konkrete Verstöße plus die betroffenen Fragen im
 * Ausgangsformat. Kostet nichts, weil der Nutzer ihn extern einfügt.
 */
export function buildFixPrompt(flagged: FlaggedRow[]): string {
  const items = flagged
    .map((f, i) => {
      const issues = f.blockers.map((b) => `   - ${b.message}`).join('\n')
      return `${i + 1}. „${f.row.question_text}"\n${issues}`
    })
    .join('\n\n')

  const rows = flagged.map((f) => f.row)

  return `Die folgenden ${flagged.length} Prüfungsfragen wurden bei der Qualitätsprüfung beanstandet. Überarbeite sie so, dass die genannten Punkte behoben sind — der fachliche Inhalt und die richtige Antwort bleiben dabei erhalten.

BEANSTANDUNGEN:

${items}

${QUESTION_QUALITY_RULES}

ZU ÜBERARBEITENDE FRAGEN:

${JSON.stringify({ rows }, null, 2)}

Antworte AUSSCHLIESSLICH mit dem korrigierten JSON im selben Format (kein Text davor oder danach, kein Markdown).`
}
