/**
 * PROJ-132: „Fragen hinzufügen“ – gemeinsame Logik für „Aus Material erstellen“
 * und „Aus einer Tabelle übernehmen“.
 *
 * Alles hier sind reine Funktionen ohne Datenbank und ohne KI-Aufruf. Der
 * Server nutzt sie zum Prüfen und Übernehmen, der Browser nach dem Bearbeiten
 * einer Karte in der Vorschau erneut. So gelten überall dieselben Regeln.
 *
 * Die Lehrkraft sieht das Austauschformat der KI nie. Es bleibt das bewährte
 * Format aus PROJ-38 (Zeilen mit antwort_a … antwort_e) und wird nur um den
 * Fragetyp „Freitext“ erweitert.
 */
import { analyzeQuestion, type QualityFinding } from './question-quality'
import { buildQualityRules } from './question-rules'
import { duplicateKey, extractJson, stripInvalidEscapes, DIFFICULTIES, type Difficulty } from './assessment-import'
import type { PromptDepartment } from './question-prompt'

// ─── Grenzen ───────────────────────────────────────────────────────────────

/** Wie viele Vorschläge die KI je Auftrag machen soll */
export const INTAKE_COUNTS = [5, 10, 15, 20] as const
export type IntakeCount = (typeof INTAKE_COUNTS)[number]

/** Text des Skripts je Auftrag; der Rest des Auftrags (Regeln, Format) braucht noch etwa 6.000 Zeichen */
export const MAX_PART_CHARS = 24_000
/** Obergrenze des fertigen Auftrags (wie PROJ-38) */
export const MAX_INTAKE_PROMPT_CHARS = 30_000
/** Mehr Fragen nimmt eine Übernahme nicht an */
export const MAX_INTAKE_QUESTIONS = 200
export const MAX_QUESTION_TEXT = 1000
export const MAX_OPTION_TEXT = 500
export const MAX_EXPLANATION = 2000
export const MAX_SAMPLE_ANSWER = 2000
/** Größe der Antwort der KI bzw. der Tabelle in Zeichen */
export const MAX_ANSWER_CHARS = 500_000

export type IntakeType = 'multiple_choice' | 'open'
export type IntakeSource = 'material' | 'table'

/** Eine Frage in der Vorschau – noch nicht gespeichert */
export interface IntakeQuestion {
  question_text: string
  type: IntakeType
  /** Bei Auswahl genau 5, bei Freitext leer */
  options: string[]
  /** Index der richtigen Antwort, null = unbekannt (bei Freitext immer null) */
  correct_index: number | null
  /** Musterantwort (nur Freitext) */
  sample_answer: string | null
  explanation: string | null
  difficulty: Difficulty
  class_level: number | null
  /** Strukturfehler in Alltagssprache – solche Fragen müssen erst bearbeitet werden */
  errors: string[]
  /** Zeile in der Tabelle (Kopfzeile = 1, erste Frage = 2) */
  source_row?: number
  /** Nur Tabelle: Fach-Kürzel und Thema aus den Spalten */
  fach_code?: string | null
  thema?: string | null
}

// ─── Skript in Teile teilen ────────────────────────────────────────────────

/** Schneidet einen zu langen Absatz an Zeilenenden, Satzenden oder Leerzeichen */
function hardSplit(paragraph: string, max: number): string[] {
  const pieces: string[] = []
  let rest = paragraph
  while (rest.length > max) {
    const window = rest.slice(0, max)
    const cut = Math.max(window.lastIndexOf('\n'), window.lastIndexOf('. '), window.lastIndexOf(' '))
    const at = cut > max * 0.5 ? cut + 1 : max
    pieces.push(rest.slice(0, at).trim())
    rest = rest.slice(at).trim()
  }
  if (rest) pieces.push(rest)
  return pieces
}

/**
 * Teilt den Text an Absatzgrenzen in Teile, die je höchstens `max` Zeichen
 * haben. Es geht nichts verloren und nichts wird gekürzt: setzt man die Teile
 * wieder zusammen, steht derselbe Text da.
 */
export function splitMaterial(text: string, max: number = MAX_PART_CHARS): string[] {
  const clean = text.trim()
  if (clean === '') return []
  if (clean.length <= max) return [clean]

  const paragraphs = clean.split(/\n{2,}/).flatMap((p) => (p.length > max ? hardSplit(p, max) : [p]))
  const parts: string[] = []
  let current = ''
  for (const paragraph of paragraphs) {
    const joined = current ? `${current}\n\n${paragraph}` : paragraph
    if (joined.length > max && current) {
      parts.push(current)
      current = paragraph
    } else {
      current = joined
    }
  }
  if (current) parts.push(current)
  return parts
}

// ─── Auftrag für die KI ────────────────────────────────────────────────────

export interface IntakePromptInput {
  /** Name des Fachs, in dem das Thema liegt */
  subjectName: string
  topicName: string
  /** Stufe, auf die die Fragen zielen; null = nicht festgelegt */
  classLevel: number | null
  count: IntakeCount
  /** Ein Teil des Skripts (höchstens `MAX_PART_CHARS`) */
  text: string
  part?: { index: number; total: number }
}

/**
 * Baut den fertigen Auftrag, den die Lehrkraft in ihre KI kopiert. Thema,
 * Stufe, Bereich, Hinweise des Bereichs (PROJ-22), Zahl der Vorschläge und der
 * Text stehen schon drin – die Lehrkraft muss nichts ersetzen.
 */
export function buildIntakePrompt(department: PromptDepartment, input: IntakePromptInput): string {
  const notes = department.promptNotes?.trim()
  const notesBlock = notes ? `\n\nZUSATZHINWEISE DER LEHRKRAFT:\n${notes}` : ''
  const levelLine = input.classLevel
    ? `- Die Fragen sind für Stufe ${input.classLevel} gedacht.`
    : '- Die Fragen passen zum Niveau der Zielgruppe.'
  const partLine = input.part && input.part.total > 1
    ? `\nDas Material ist lang und wurde in ${input.part.total} Teile geteilt. Das ist Teil ${input.part.index} von ${input.part.total}. Frage nur zu dem, was in DIESEM Teil steht.\n`
    : ''

  return `Du bist ein ${department.promptRole}.

Erstelle aus dem folgenden Material genau ${input.count} Multiple-Choice-Fragen für das Thema „${input.topicName}“ im Fach „${input.subjectName}“. Zielgruppe: ${department.targetGroup}.
${partLine}
SO GEHST DU VOR:
- Frage nur nach Inhalten, die im Material stehen. Erfinde keinen Fachinhalt.
- Jede Frage hat genau 5 Antwortoptionen (A, B, C, D, E), davon genau eine richtig.
- Verteile die Schwierigkeit: "leicht" (Grundwissen), "mittel" (Anwendung), "schwer" (Analyse oder Transfer).
- Schreibe zu jeder Frage eine Erklärung in 1 bis 2 Sätzen, warum die Antwort stimmt.
- Keine Frage kommt doppelt vor. Lieber weniger gute Fragen als erzwungene.
${levelLine}

${buildQualityRules(department.targetGroup)}${notesBlock}

Antworte AUSSCHLIESSLICH in diesem Format (kein Text davor oder danach, keine Formatierung):
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
      "erklaerung": "Erklärung, warum A stimmt.",
      "schwierigkeit": "mittel"
    }
  ]
}

--- MATERIAL ---
${input.text.trim()}
--- ENDE ---`
}

/**
 * „Auftrag zum Verbessern“: gibt der KI die bemängelten Fragen mit dem Grund
 * zurück. Die Antwort wird wie jede andere Antwort der KI eingelesen.
 */
export function buildImproveRequest(
  items: { question: IntakeQuestion; reasons: string[] }[],
  targetGroup: string,
): string {
  const blocks = items.map(({ question, reasons }, i) => {
    const options = question.options.map((o, k) => `${String.fromCharCode(65 + k)}) ${o}`).join('\n')
    const right = question.correct_index != null ? String.fromCharCode(65 + question.correct_index) : '?'
    return `${i + 1}. ${question.question_text}\n${options}\nRichtig: ${right}\nProblem: ${reasons.join(' ')}`
  })
  return `Die folgenden Prüfungsfragen für ${targetGroup} wurden beim Prüfen bemängelt. Schreibe jede Frage so um, dass das genannte Problem behoben ist. Die Fachaussage bleibt gleich.

${blocks.join('\n\n')}

Antworte AUSSCHLIESSLICH in diesem Format (kein Text davor oder danach, keine Formatierung):
{ "rows": [ { "question_text": "...", "antwort_a": "...", "antwort_b": "...", "antwort_c": "...", "antwort_d": "...", "antwort_e": "...", "korrekte_antwort": "A", "erklaerung": "...", "schwierigkeit": "mittel" } ] }`
}

// ─── Einlesen: Antwort der KI ──────────────────────────────────────────────

const LETTERS = ['A', 'B', 'C', 'D', 'E']

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
  const i = LETTERS.indexOf(str(v).toUpperCase())
  return i >= 0 && i < optionCount ? i : null
}

const OPEN_WORDS = new Set(['freitext', 'open', 'offen', 'frei'])

/**
 * Prüft die Struktur einer Frage und nennt Fehler in Alltagssprache. Gilt für
 * Einlesen, Bearbeiten in der Vorschau und Übernehmen.
 */
export function validateIntakeQuestion(q: Pick<IntakeQuestion, 'question_text' | 'type' | 'options' | 'correct_index' | 'sample_answer' | 'explanation'>): string[] {
  const errors: string[] = []
  const text = q.question_text.trim()
  if (!text) errors.push('Es fehlt der Fragetext.')
  else if (text.length > MAX_QUESTION_TEXT) errors.push(`Der Fragetext ist zu lang (höchstens ${MAX_QUESTION_TEXT} Zeichen).`)
  if ((q.explanation ?? '').length > MAX_EXPLANATION) errors.push(`Die Erklärung ist zu lang (höchstens ${MAX_EXPLANATION} Zeichen).`)

  if (q.type === 'open') {
    const sample = (q.sample_answer ?? '').trim()
    if (!sample) errors.push('Es fehlt die Musterantwort.')
    else if (sample.length > MAX_SAMPLE_ANSWER) errors.push(`Die Musterantwort ist zu lang (höchstens ${MAX_SAMPLE_ANSWER} Zeichen).`)
    return errors
  }

  const options = q.options.map((o) => o.trim())
  if (options.length !== 5) errors.push('Es müssen genau 5 Antworten da sein.')
  else if (options.some((o) => o === '')) errors.push('Mindestens eine Antwort ist leer.')
  if (options.some((o) => o.length > MAX_OPTION_TEXT)) errors.push(`Eine Antwort ist zu lang (höchstens ${MAX_OPTION_TEXT} Zeichen).`)
  if (new Set(options.filter(Boolean).map((o) => o.toLowerCase())).size !== options.filter(Boolean).length) {
    errors.push('Zwei Antworten sind gleich.')
  }
  if (q.correct_index === null || q.correct_index < 0 || q.correct_index >= options.length) {
    errors.push('Es fehlt die richtige Antwort.')
  }
  return errors
}

function normalizeRow(raw: unknown): IntakeQuestion {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const typeWord = str(r.typ ?? r.type ?? r.fragetyp).toLowerCase()
  const sample = str(r.musterantwort ?? r.sample_answer)
  const isOpen = OPEN_WORDS.has(typeWord) || (typeWord === '' && sample !== '' && !r.antwort_a && !Array.isArray(r.options))

  let options: string[] = []
  let correct: number | null = null
  if (!isOpen) {
    if (Array.isArray(r.options)) {
      options = r.options.map(str)
      correct = toCorrectIndex(r.correct_index, options.length)
    } else {
      options = [r.antwort_a, r.antwort_b, r.antwort_c, r.antwort_d, r.antwort_e].map(str)
      correct = toCorrectIndex(r.korrekte_antwort, options.length)
    }
  }

  const q: IntakeQuestion = {
    question_text: str(r.question_text),
    type: isOpen ? 'open' : 'multiple_choice',
    options,
    correct_index: correct,
    sample_answer: isOpen ? sample || null : null,
    explanation: str(r.erklaerung ?? r.explanation) || null,
    difficulty: toDifficulty(r.schwierigkeit ?? r.difficulty),
    class_level: toClassLevel(r.klassenstufe ?? r.class_level),
    errors: [],
  }
  q.errors = validateIntakeQuestion(q)
  return q
}

/**
 * Rettet vollständige Fragen aus einer abgeschnittenen Antwort: Die Liste der
 * Fragen wird Objekt für Objekt gelesen, ein angefangenes letztes Objekt fällt weg.
 */
export function salvageRows(raw: string): unknown[] | null {
  const rowsAt = raw.search(/"(?:rows|questions)"\s*:\s*\[/)
  const start = rowsAt >= 0 ? raw.indexOf('[', rowsAt) : raw.indexOf('[')
  if (start < 0) return null

  const found: unknown[] = []
  let depth = 0
  let objStart = -1
  let inString = false
  let escaped = false
  for (let i = start + 1; i < raw.length; i++) {
    const ch = raw[i]
    if (inString) {
      if (escaped) escaped = false
      else if (ch === '\\') escaped = true
      else if (ch === '"') inString = false
      continue
    }
    if (ch === '"') inString = true
    else if (ch === '{') {
      if (depth === 0) objStart = i
      depth++
    } else if (ch === '}') {
      depth--
      if (depth === 0 && objStart >= 0) {
        const slice = raw.slice(objStart, i + 1)
        for (const candidate of [slice, stripInvalidEscapes(slice)]) {
          try {
            found.push(JSON.parse(candidate))
            break
          } catch {
            // nächster Versuch
          }
        }
        objStart = -1
      }
      if (depth < 0) break
    } else if (ch === ']' && depth === 0) {
      break
    }
  }
  return found.length > 0 ? found : null
}

export type IntakeParseResult =
  | { ok: true; questions: IntakeQuestion[]; skipped: string[]; truncated: boolean }
  | { ok: false; error: string }

export const NO_QUESTIONS_ERROR =
  'Die Antwort enthält keine Fragen, die wir lesen können. Kopiere bitte die ganze Antwort der KI.'

/** Liest die eingefügte Antwort der KI. Verträgt Text drumherum, Formatierungszeichen und abgeschnittene Antworten. */
export function parseIntakeAnswer(raw: string): IntakeParseResult {
  const text = raw.trim()
  if (!text) return { ok: false, error: NO_QUESTIONS_ERROR }

  let list: unknown[] | null = null
  let truncated = false
  let skipped: string[] = []

  const json = extractJson(text)
  if (json !== null && typeof json === 'object') {
    const obj = json as Record<string, unknown>
    list = Array.isArray(json) ? json : Array.isArray(obj.rows) ? obj.rows : Array.isArray(obj.questions) ? obj.questions : null
    if (Array.isArray(obj.skipped)) skipped = obj.skipped.map(str).filter(Boolean)
  }
  if (!list || list.length === 0) {
    list = salvageRows(text)
    truncated = list !== null
  }
  if (!list || list.length === 0) return { ok: false, error: NO_QUESTIONS_ERROR }
  if (list.length > MAX_INTAKE_QUESTIONS) {
    return { ok: false, error: `Die Antwort enthält mehr als ${MAX_INTAKE_QUESTIONS} Fragen. Bitte arbeite in kleineren Teilen.` }
  }
  return { ok: true, questions: list.map(normalizeRow), skipped, truncated }
}

// ─── Einlesen: Tabelle (CSV) ───────────────────────────────────────────────

/** Spaltennamen der Tabelle, die für Auswahl-Fragen Pflicht sind */
export const TABLE_REQUIRED_COLUMNS = [
  'question_text',
  'antwort_a',
  'antwort_b',
  'antwort_c',
  'antwort_d',
  'antwort_e',
  'korrekte_antwort',
] as const

/** Beispiel-Tabelle zum Herunterladen (alte Tabellen ohne die letzten drei Spalten laufen weiter) */
export const TABLE_TEMPLATE = [
  'question_text,antwort_a,antwort_b,antwort_c,antwort_d,antwort_e,korrekte_antwort,erklaerung,schwierigkeit,thema,fach_code,typ,musterantwort',
  '"Was ist ein CMR-Frachtbrief?","Begleitpapier für den Straßentransport","Ein Zollbescheid","Eine Rechnung","Ein Lagerschein","Ein Lieferschein",A,"Pflichtdokument im grenzüberschreitenden Straßengüterverkehr",leicht,,,auswahl,',
  '"Nenne zwei Aufgaben eines Spediteurs.",,,,,,,"Der Spediteur organisiert Transporte.",mittel,,,freitext,"Transport organisieren und Sendungen versichern"',
].join('\n')

const norm = (s: string) => s.replace(/^﻿/, '').trim().toLowerCase()

export type IntakeTableResult =
  | { ok: true; questions: IntakeQuestion[] }
  | { ok: false; error: string }

/**
 * Liest die Zeilen einer Tabelle (schon von papaparse in Spalten zerlegt). Jede
 * Zeile wird wie eine Frage der KI geprüft und merkt sich ihre Zeilennummer.
 */
export function parseIntakeTable(rows: Record<string, unknown>[]): IntakeTableResult {
  if (rows.length === 0) return { ok: false, error: 'In der Tabelle stehen keine Fragen.' }
  if (rows.length > MAX_INTAKE_QUESTIONS) {
    return { ok: false, error: `Die Tabelle hat mehr als ${MAX_INTAKE_QUESTIONS} Fragen. Teile sie bitte auf.` }
  }

  const keyed = rows.map((row) => {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(row)) out[norm(k)] = v
    return out
  })
  const columns = new Set(Object.keys(keyed[0] ?? {}))
  if (!columns.has('question_text')) {
    return { ok: false, error: 'In der Tabelle fehlt die Spalte „question_text“. Lade die Beispiel-Tabelle herunter und übernimm die Spalten.' }
  }
  const hasOpenRows = keyed.some((r) => OPEN_WORDS.has(str(r.typ).toLowerCase()))
  const missing = TABLE_REQUIRED_COLUMNS.filter((c) => !columns.has(c))
  if (missing.length > 0 && !hasOpenRows) {
    return { ok: false, error: `In der Tabelle fehlen Spalten: ${missing.join(', ')}. Lade die Beispiel-Tabelle herunter.` }
  }

  const questions = keyed.map((r, i) => {
    const q = normalizeRow({ ...r, korrekte_antwort: str(r.korrekte_antwort) })
    q.source_row = i + 2
    q.fach_code = str(r.fach_code).toUpperCase() || null
    q.thema = str(r.thema) || null
    return q
  })
  return { ok: true, questions }
}

// ─── Prüfen: Torwächter, Duplikate, Stufe ──────────────────────────────────

export interface IntakeItemCheck {
  /** Reihenfolge der Gründe, warum die Karte markiert ist (ein Satz je Grund) */
  reasons: string[]
  blockers: QualityFinding[]
  warnings: QualityFinding[]
  /** Gleicher Fragetext existiert schon im Thema (oder steht doppelt in der Vorschau) */
  duplicate: boolean
}

/** Torwächter (PROJ-16) für Auswahl-Fragen ohne Strukturfehler; Freitext hat nichts zu prüfen. */
export function qualityFor(q: IntakeQuestion): { blockers: QualityFinding[]; warnings: QualityFinding[] } {
  if (q.type !== 'multiple_choice' || q.errors.length > 0 || q.correct_index === null) return { blockers: [], warnings: [] }
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

/**
 * Prüft alle Fragen einer Vorschau. `existing` sind die Fragetexte, die es im
 * Thema schon gibt. Doppelte innerhalb der Vorschau zählen ab dem zweiten Auftreten.
 */
export function checkIntakeQuestions(questions: IntakeQuestion[], existing: string[]): IntakeItemCheck[] {
  const known = new Set(existing.map(duplicateKey))
  const seen = new Set<string>()
  return questions.map((q) => {
    const key = duplicateKey(q.question_text)
    const duplicate = key !== '' && (known.has(key) || seen.has(key))
    if (key) seen.add(key)
    const quality = qualityFor(q)
    const reasons: string[] = [...q.errors, ...quality.blockers.map((b) => b.message)]
    if (duplicate) reasons.push('Gibt es schon in diesem Thema.')
    return { reasons, duplicate, ...quality }
  })
}

/**
 * Schlägt die Stufe für ein Thema vor: die häufigste Stufe der vorhandenen
 * Fragen, wenn sie klar vorne liegt (mindestens 60 %). Sonst `null`, dann
 * wählt die Lehrkraft. Themen haben selbst keine Stufe (siehe Tech Design).
 */
export function suggestClassLevel(existing: (number | null)[], allowed: number[]): number | null {
  const counts = new Map<number, number>()
  for (const level of existing) {
    if (level != null && allowed.includes(level)) counts.set(level, (counts.get(level) ?? 0) + 1)
  }
  const total = [...counts.values()].reduce((a, b) => a + b, 0)
  if (total === 0) return allowed.length === 1 ? allowed[0] : null
  const [best, bestCount] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]
  return bestCount / total >= 0.6 ? best : null
}

/** Satz fürs Änderungsprotokoll, z. B. „12 Fragen aus Material „skript.pdf“ übernommen“ */
export function intakeDescription(source: IntakeSource, count: number, fileName?: string | null): string {
  const what = count === 1 ? '1 Frage' : `${count} Fragen`
  const from = source === 'material' ? 'Material' : 'Tabelle'
  const file = fileName ? ` „${fileName.slice(0, 80)}“` : ''
  return `${what} aus ${from}${file} übernommen`
}
