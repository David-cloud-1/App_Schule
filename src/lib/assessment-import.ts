/**
 * PROJ-38: Fragen-Import für Leistungsnachweise per Kopier-Prompt.
 *
 * Der Ausbilder lädt Aufgaben- und Lösungsblatt hoch, die App liest den Text
 * ohne KI aus und baut den Prompt (buildAssessmentImportPrompt). Die Antwort
 * einer externen KI wird hier wieder eingelesen (parseAiAnswer). Es gibt
 * keinen KI-Aufruf — der Weg ist kostenlos.
 */
import type { PromptDepartment, PromptSubject } from './question-prompt'
import { buildQualityRules } from './question-rules'
import { analyzeQuestion, type QualityFinding } from './question-quality'

/** Ab dieser Länge passt ein Prompt in gängigen kostenlosen Chats nicht mehr zuverlässig. */
export const MAX_PROMPT_CHARS = 30_000
export const MAX_IMPORT_QUESTIONS = 200
export const MAX_QUESTION_CHARS = 1000
export const MAX_OPTION_CHARS = 500
export const MIN_MATERIAL_CHARS = 50

export const DIFFICULTIES = ['leicht', 'mittel', 'schwer'] as const
export type Difficulty = (typeof DIFFICULTIES)[number]

// ─── Prompt ────────────────────────────────────────────────────────────────

export interface ImportMaterial {
  /** Text des Aufgabenblatts */
  task: string
  /** Text des Lösungsblatts (optional) */
  solution?: string | null
}

function classLevelLine(levels: number[]): string {
  if (levels.length === 0) return '- klassenstufe: immer null'
  return `- klassenstufe: ${levels.join(', ')} — nur wenn aus dem Material eindeutig, sonst null`
}

export function buildAssessmentImportPrompt(
  department: PromptDepartment,
  subjects: PromptSubject[],
  material: ImportMaterial,
): string {
  const task = material.task.trim()
  const solution = material.solution?.trim() ?? ''
  const subjectLines = subjects.map((s) => `- ${s.code} = ${s.name}`).join('\n')
  const exampleCode = subjects[0]?.code ?? 'FACH'
  const notes = department.promptNotes?.trim()
  const notesBlock = notes ? `\n\nZUSATZHINWEISE DER LEHRKRAFT:\n${notes}` : ''

  const answerRule = solution
    ? '- Die richtige Antwort stammt IMMER aus dem Lösungsblatt. Widerspricht das Lösungsblatt dem Aufgabenblatt oder fehlt eine Lösung, setze "needs_review": true und "korrekte_antwort": null.'
    : '- Es liegt KEIN Lösungsblatt vor. Setze die richtige Antwort nur, wenn sie sich aus dem Aufgabentext selbst sicher ergibt. Sonst "needs_review": true und "korrekte_antwort": null — rate nicht.'

  const materialBlock = solution
    ? `--- AUFGABENBLATT ---\n${task}\n--- ENDE AUFGABENBLATT ---\n\n--- LÖSUNGSBLATT ---\n${solution}\n--- ENDE LÖSUNGSBLATT ---`
    : `--- AUFGABENBLATT ---\n${task}\n--- ENDE AUFGABENBLATT ---`

  return `Du bist ein ${department.promptRole}.

Wandle die Aufgaben aus dem folgenden Material in Multiple-Choice-Fragen für einen benoteten Leistungsnachweis um. Das Material sind bestehende Aufgaben der Lehrkraft (teils offene Aufgaben mit Freitext, Zuordnungstabellen, Aufzählungen oder Kürzel).

FÄCHER:
${subjectLines}

SO WANDELST DU UM:
- Jede Aufgabe, die sich als Multiple-Choice fassen lässt, wird zu einer oder mehreren Fragen. Die Anzahl richtet sich nach den Aufgaben im Material — erfinde keine zusätzlichen Themen.
- Zuordnungstabellen: jede Zeile wird eine eigene Frage, mit allen nötigen Angaben im Fragetext.
- Aufgaben wie "Nennen Sie zwei Vorteile …": als Frage "Welcher der folgenden Punkte ist ein Vorteil …?" mit einer richtigen und vier plausibel falschen Optionen (die falschen dürfen nicht ebenfalls richtig sein).
- Abkürzungen oder Begriffe zum Ausfüllen: die Frage nennt die Beschreibung, die Optionen sind passende Kürzel bzw. Begriffe.
- Rechenaufgaben: alle Zahlen in die Frage schreiben, die Optionen sind mögliche Ergebnisse.
${answerRule}
- Erfinde keinen Fachinhalt, der nicht im Material steht. Füge nur dort Angaben zum Fragetext hinzu, wo sie nötig sind, damit die Antwort eindeutig ist.
- Aufgaben, die sich nicht als Multiple-Choice fassen lassen (Zeichnungen, Skizzen, Diagramme zum Ergänzen, Beschriftungen ohne Text), lässt du weg und nennst sie kurz in "skipped".

FELDER:
- Genau 5 Antwortoptionen (A–E), davon exakt eine korrekt
- schwierigkeit: "leicht" (Grundwissen), "mittel" (Anwendung), "schwer" (Analyse/Transfer)
- erklaerung: 1–2 Sätze, warum die Antwort stimmt
- fach_code: eines der oben genannten Kürzel
${classLevelLine(department.classLevels)}

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
      "erklaerung": "Erklärung, warum A korrekt ist.",
      "fach_code": "${exampleCode}",
      "schwierigkeit": "mittel",
      "klassenstufe": null,
      "needs_review": false
    }
  ],
  "skipped": ["Aufgabe 5 (Vertragsskizze): Zeichnung, nicht als Multiple-Choice umgesetzt"]
}

${materialBlock}`
}

// ─── Antwort der KI einlesen ───────────────────────────────────────────────

/** Eine Frage aus der KI-Antwort, vereinheitlicht und noch nicht gegen die DB geprüft */
export interface ParsedQuestion {
  question_text: string
  options: string[]
  /** null = Schlüssel unbekannt (needs_review) */
  correct_index: number | null
  explanation: string | null
  fach_code: string | null
  difficulty: Difficulty
  class_level: number | null
  needs_review: boolean
  /** Strukturfehler — solche Fragen sind nicht importierbar */
  errors: string[]
}

export type ParseResult =
  | { ok: true; questions: ParsedQuestion[]; skipped: string[] }
  | { ok: false; error: string }

const LETTERS = ['A', 'B', 'C', 'D', 'E']

/**
 * Manche KI-Chats liefern Antworten, die beim Kopieren Markdown-Fluchtzeichen vor
 * Unterstrichen/Klammern stehen lassen (z. B. "antwort\_e", "\[ … \]"). Das sind keine
 * gültigen JSON-Escapes — JSON.parse scheitert sonst komplett daran.
 */
function stripInvalidEscapes(text: string): string {
  return text.replace(/\\([^"\\/bfnrtu])/g, '$1')
}

/** Findet das JSON in einer Chat-Antwort: pur, in ```-Block oder mit Text drumherum. */
export function extractJson(raw: string): unknown | null {
  const text = raw.trim()
  if (!text) return null
  const attempts: string[] = [text]
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fence) attempts.push(fence[1].trim())
  const firstObj = text.indexOf('{')
  const lastObj = text.lastIndexOf('}')
  if (firstObj !== -1 && lastObj > firstObj) attempts.push(text.slice(firstObj, lastObj + 1))
  const firstArr = text.indexOf('[')
  const lastArr = text.lastIndexOf(']')
  if (firstArr !== -1 && lastArr > firstArr) attempts.push(text.slice(firstArr, lastArr + 1))
  for (const candidate of attempts) {
    try {
      return JSON.parse(candidate)
    } catch {
      // nächster Versuch
    }
  }
  for (const candidate of attempts) {
    try {
      return JSON.parse(stripInvalidEscapes(candidate))
    } catch {
      // nächster Versuch
    }
  }
  return null
}

const str = (v: unknown): string => (typeof v === 'string' ? v.trim() : typeof v === 'number' ? String(v) : '')

function toDifficulty(v: unknown): Difficulty {
  const d = str(v).toLowerCase()
  return (DIFFICULTIES as readonly string[]).includes(d) ? (d as Difficulty) : 'mittel'
}

function toClassLevel(v: unknown): number | null {
  const n = typeof v === 'number' ? v : Number(str(v))
  return Number.isInteger(n) && n > 0 ? n : null
}

function toCorrectIndex(v: unknown, optionCount: number): number | null {
  if (typeof v === 'number' && Number.isInteger(v)) return v >= 0 && v < optionCount ? v : null
  const letter = str(v).toUpperCase()
  const i = LETTERS.indexOf(letter)
  return i >= 0 && i < optionCount ? i : null
}

function normalizeRow(raw: unknown): ParsedQuestion {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const errors: string[] = []

  // Format 1: Bulk-Import (antwort_a … antwort_e), Format 2: options[] (Datei-Import)
  let options: string[]
  let correct: number | null
  if (Array.isArray(r.options)) {
    options = r.options.map(str)
    correct = toCorrectIndex(r.correct_index, options.length)
  } else {
    options = [r.antwort_a, r.antwort_b, r.antwort_c, r.antwort_d, r.antwort_e].map(str)
    // fehlende hintere Optionen (z. B. nur A–D) nicht als leere Optionen zählen
    while (options.length > 0 && options[options.length - 1] === '') options.pop()
    correct = toCorrectIndex(r.korrekte_antwort, options.length)
  }

  const needsReview = r.needs_review === true || correct === null
  const question_text = str(r.question_text)

  if (!question_text) errors.push('Fragetext fehlt')
  else if (question_text.length > MAX_QUESTION_CHARS) errors.push(`Fragetext zu lang (max. ${MAX_QUESTION_CHARS} Zeichen)`)
  if (options.length < 2) errors.push('Weniger als 2 Antwortoptionen')
  if (options.some((o) => o === '')) errors.push('Leere Antwortoption')
  if (options.some((o) => o.length > MAX_OPTION_CHARS)) errors.push(`Antwortoption zu lang (max. ${MAX_OPTION_CHARS} Zeichen)`)
  if (new Set(options.map((o) => o.toLowerCase())).size !== options.length) errors.push('Doppelte Antwortoptionen')

  // Ein unbekannter Schlüssel (correct_index null) wird in der Vorschau vom Ausbilder gesetzt
  const explanation = str(r.erklaerung ?? r.explanation)
  return {
    question_text,
    options,
    correct_index: correct,
    explanation: explanation || null,
    fach_code: str(r.fach_code) || null,
    difficulty: toDifficulty(r.schwierigkeit ?? r.difficulty),
    class_level: toClassLevel(r.klassenstufe ?? r.class_level),
    needs_review: needsReview,
    errors,
  }
}

export function parseAiAnswer(raw: string): ParseResult {
  const json = extractJson(raw)
  if (json === null || typeof json !== 'object') {
    return { ok: false, error: 'Die Antwort ist kein gültiges JSON. Bitte die KI bitten, ausschließlich das JSON auszugeben.' }
  }
  const obj = json as Record<string, unknown>
  const list = Array.isArray(json) ? json : Array.isArray(obj.rows) ? obj.rows : Array.isArray(obj.questions) ? obj.questions : null
  if (!list) {
    return { ok: false, error: 'Im JSON fehlt die Liste „rows" (bzw. „questions").' }
  }
  if (list.length === 0) return { ok: false, error: 'Die Antwort enthält keine Fragen.' }
  if (list.length > MAX_IMPORT_QUESTIONS) {
    return { ok: false, error: `Die Antwort enthält mehr als ${MAX_IMPORT_QUESTIONS} Fragen. Bitte das Material in Teilen importieren.` }
  }
  const skipped = Array.isArray(obj.skipped) ? obj.skipped.map(str).filter(Boolean) : []
  return { ok: true, questions: list.map(normalizeRow), skipped }
}

// ─── Qualitätsprüfung & Duplikate ──────────────────────────────────────────

/** Schlüssel zur Duplikat-Erkennung: Groß-/Kleinschreibung, Leerraum und Satzzeichen am Rand egal */
export function duplicateKey(questionText: string): string {
  return questionText.toLowerCase().replace(/\s+/g, ' ').replace(/[\s?.!:;,]+$/g, '').trim()
}

export interface QuestionQuality {
  blockers: QualityFinding[]
  warnings: QualityFinding[]
}

/** Torwächter für eine Frage; ohne bekannten Schlüssel gibt es nichts zu prüfen. */
export function assessQuestionQuality(q: Pick<ParsedQuestion, 'question_text' | 'options' | 'correct_index' | 'explanation'>): QuestionQuality {
  if (q.correct_index === null || q.options.length < 2) return { blockers: [], warnings: [] }
  const report = analyzeQuestion({
    question_text: q.question_text,
    options: q.options,
    correct_index: q.correct_index,
    explanation: q.explanation,
  })
  return {
    blockers: report.findings.filter((f) => f.severity === 'blocker'),
    warnings: report.findings.filter((f) => f.severity !== 'blocker'),
  }
}

// ─── Dateityp ──────────────────────────────────────────────────────────────

export const MATERIAL_MAX_BYTES = 4 * 1024 * 1024 // Vercel begrenzt den Request-Body auf 4,5 MB

export type MaterialKind = 'pdf' | 'docx' | 'doc'

/** Erkennt den Typ am Dateiinhalt, dann an der Endung — Browser melden .doc oft falsch. */
export function detectMaterialKind(buffer: Buffer, fileName: string): MaterialKind | null {
  if (buffer.length >= 4 && buffer.subarray(0, 4).toString('latin1') === '%PDF') return 'pdf'
  if (buffer.length >= 4 && buffer[0] === 0x50 && buffer[1] === 0x4b && buffer[2] === 0x03 && buffer[3] === 0x04) {
    // ZIP-Container: nur Word-Endungen zulassen (auch .doc, das in Wahrheit .docx ist)
    return /\.docx?$/i.test(fileName) ? 'docx' : null
  }
  if (
    buffer.length >= 8 &&
    buffer.subarray(0, 8).equals(Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]))
  ) {
    return 'doc'
  }
  return null
}

export const MIME_BY_KIND: Record<MaterialKind, string> = {
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  doc: 'application/msword',
}
