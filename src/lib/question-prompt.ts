/**
 * Prompt-Baukasten (PROJ-22): der kopierbare Fragen-Prompt, zusammengesetzt
 * aus den Daten des Fachbereichs statt fest im Code.
 *
 *   Rolle          ← departments.prompt_role
 *   Fächer         ← aktive Fächer des Bereichs (Kürzel = Name)
 *   Klassenstufen  ← departments.class_levels
 *   Qualitätsregeln← buildQualityRules(departments.target_group)
 *   Zusatzhinweise ← departments.prompt_notes (optional)
 *   JSON-Format    ← für alle Bereiche gleich (= Bulk-Import-Format)
 *
 * Läuft ohne KI-Aufruf: der Admin kopiert den Text in eine externe KI und
 * fügt das JSON wieder ein — kostenlos.
 */
import type { Department } from './departments'
import type { DepartmentSubject } from './subjects'
import { buildQualityRules } from './question-rules'

export type PromptDepartment = Pick<Department, 'promptRole' | 'targetGroup' | 'promptNotes' | 'classLevels'>
export type PromptSubject = Pick<DepartmentSubject, 'code' | 'name'>

/** [10, 11, 12] → „10, 11 oder 12" */
export function formatClassLevels(levels: number[]): string {
  if (levels.length === 0) return ''
  if (levels.length === 1) return String(levels[0])
  return `${levels.slice(0, -1).join(', ')} oder ${levels[levels.length - 1]}`
}

function classLevelRule(levels: number[]): string {
  if (levels.length === 0) return '- klassenstufe: immer weglassen (null)'
  return `- klassenstufe: ${formatClassLevels(levels)} — falls nicht eindeutig aus dem Kontext, weglassen (null)`
}

/** Beispielwert im JSON: die mittlere Klassenstufe (Spedition: 11). */
function exampleClassLevel(levels: number[]): string {
  if (levels.length === 0) return 'null'
  return String(levels[Math.floor((levels.length - 1) / 2)] ?? levels[0])
}

/**
 * @param subjects aktive Fächer des Bereichs, in Anzeige-Reihenfolge
 */
export function buildQuestionPrompt(department: PromptDepartment, subjects: PromptSubject[]): string {
  const subjectLines = subjects.map((s) => `- ${s.code} = ${s.name}`).join('\n')
  const exampleCode = subjects[0]?.code ?? 'FACH'
  const notes = department.promptNotes?.trim()
  const notesBlock = notes ? `\n\nZUSATZHINWEISE DER LEHRKRAFT:\n${notes}` : ''

  return `Du bist ein ${department.promptRole}.

Analysiere den folgenden Dokumentinhalt und erstelle daraus Multiple-Choice-Prüfungsfragen.

FÄCHER:
${subjectLines}

REGELN:
- Genau 5 Antwortoptionen (A, B, C, D, E), davon exakt eine korrekt
- Fragen auf Prüfungsniveau (nicht zu einfach, nicht zu komplex)
- Schwierigkeit: "leicht" (Grundwissen), "mittel" (Anwendung), "schwer" (Analyse/Transfer)
- Erklärung warum die Antwort korrekt ist (1-2 Sätze)
- Maximal 75 Fragen
${classLevelRule(department.classLevels)}

${buildQualityRules(department.targetGroup)}${notesBlock}

Antworte AUSSCHLIESSLICH mit diesem JSON (kein Text davor/danach, kein Markdown):
{
  "rows": [
    {
      "question_text": "Frage hier?",
      "antwort_a": "Antwort A",
      "antwort_b": "Antwort B",
      "antwort_c": "Antwort C",
      "antwort_d": "Antwort D",
      "antwort_e": "Antwort E",
      "korrekte_antwort": "A",
      "erklaerung": "Erklärung warum A korrekt ist.",
      "fach_code": "${exampleCode}",
      "schwierigkeit": "mittel",
      "klassenstufe": ${exampleClassLevel(department.classLevels)}
    }
  ]
}

--- DOKUMENT ---
[Hier deinen Text einfügen]
--- ENDE ---`
}

/**
 * Kontext für den bezahlten Upload-Pfad (process-job.ts): dieselbe Rolle,
 * Fächerliste und Qualitätsregeln wie der kopierte Prompt.
 */
export function buildUploadExamContext(department: PromptDepartment, subjects: PromptSubject[]): string {
  const subjectList = subjects.map((s) => `${s.code} (${s.name})`).join(', ')
  const notes = department.promptNotes?.trim()
  return `
Du erstellst Prüfungsfragen für ${department.targetGroup}. Du bist ein ${department.promptRole}.
Fächer: ${subjectList}.
Erstelle ausschließlich Multiple-Choice-Fragen mit genau 5 Antwortoptionen, wobei exakt eine korrekt ist.
Setze "review_required": true wenn die Frage eine eindeutige korrekte Antwort nicht zweifelsfrei belegt.

${buildQualityRules(department.targetGroup)}${notes ? `\n\nZUSATZHINWEISE DER LEHRKRAFT:\n${notes}` : ''}
`
}
