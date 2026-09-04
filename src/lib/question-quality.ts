/**
 * Qualitätsanalyse für Multiple-Choice-Fragen.
 *
 * Prüft die Rate-Tells, die in den Bestandsdurchläufen 1–4 nachweislich
 * aufgetreten sind: ein Prüfling darf die richtige Antwort NUR am Fachwissen
 * erkennen, nie an einer äußerlichen Eigenschaft.
 *
 * Reine Funktionen ohne DB-Zugriff — verwendet vom Torwächter im Draft-Flow
 * (src/app/api/admin/ai-generate/_lib/process-job.ts) und vom Audit-Script
 * (scripts/quality/audit.ts).
 */

/**
 * Ab wie vielen Zeichen Vorsprung die richtige Antwort auffällig lang ist.
 * Bewusst kein Nulltoleranz-Wert: würde die richtige Antwort NIE die längste
 * sein dürfen, entstünde das ebenso verwertbare inverse Muster
 * (\"die längste ist nie richtig\"). Ziel ist Zufallsniveau, nicht Null.
 */
export const LENGTH_LEAD_BLOCKER = 8

/** Zielkorridor für den Anteil Fragen, in denen die richtige die längste ist. */
export const LONGEST_RATE_TARGET = { min: 0.12, max: 0.28, chance: 0.2 } as const

export type Severity = 'blocker' | 'warning'

export interface QualityFinding {
  code: string
  severity: Severity
  message: string
}

export interface QualityReport {
  ok: boolean
  blockers: number
  warnings: number
  findings: QualityFinding[]
}

export interface QuestionInput {
  question_text: string
  options: string[]
  correct_index: number
  explanation?: string | null
}

/** Signalwörter, die eine Option ohne Fachwissen als falsch erkennbar machen. */
export const ABSOLUTE_WORDS = [
  'ausschließlich',
  'nur',
  'immer',
  'nie',
  'niemals',
  'allein',
  'lediglich',
  'stets',
] as const

const ABSOLUTE_RE = new RegExp(`(^|[^a-zäöüß])(${ABSOLUTE_WORDS.join('|')})([^a-zäöüß]|$)`, 'i')

const FILLER_RE =
  /^(alle (antworten|der genannten|genannten)|keine (der genannten|dieser|angabe)|beides|nichts davon|a und b|none of the above)/i

/** Präpositionen, mit denen eine Option zum Satzfragment statt zur Aussage wird. */
const FRAGMENT_STARTERS = [
  'für',
  'zur',
  'zum',
  'bei',
  'nach',
  'mit',
  'ohne',
  'durch',
  'gegen',
  'wegen',
]

export function normalizeOption(text: string): string {
  return text.trim().replace(/\s+/g, ' ')
}

/** Erstes bedeutungstragendes Wort, kleingeschrieben und ohne Satzzeichen. */
export function firstWord(text: string): string {
  const match = normalizeOption(text)
    .toLowerCase()
    .match(/[a-zäöüß0-9]+/)
  return match ? match[0] : ''
}

export function hasAbsoluteWord(text: string): boolean {
  return ABSOLUTE_RE.test(text)
}

/**
 * Reine Zahlenoptionen ("1,25 Millionen Euro", "8,33 SZR/kg") sind von der
 * Längenprüfung ausgenommen: dort entscheidet die Stellenzahl über die Länge,
 * das ist kein nutzbarer Rate-Trick.
 */
export function isNumericSet(options: string[]): boolean {
  return options.every((o) => {
    const t = normalizeOption(o)
    if (!/\d/.test(t)) return false
    // höchstens drei Wörter neben der Zahl (Einheit, Währung)
    const words = t.split(' ').filter((w) => !/^[\d.,%€]+$/.test(w))
    return words.length <= 3 && t.length <= 40
  })
}

function wordCount(text: string): number {
  return normalizeOption(text).split(' ').filter(Boolean).length
}

export function analyzeQuestion(q: QuestionInput): QualityReport {
  const findings: QualityFinding[] = []
  const options = (q.options ?? []).map(normalizeOption)
  const add = (code: string, severity: Severity, message: string) =>
    findings.push({ code, severity, message })

  // ── Struktur ───────────────────────────────────────────────────────────────
  if (options.length !== 5) {
    add('option_count', 'blocker', `Es müssen genau 5 Optionen sein, gefunden: ${options.length}.`)
  }
  if (options.some((o) => o.length === 0)) {
    add('empty_option', 'blocker', 'Mindestens eine Option ist leer.')
  }
  const seen = new Map<string, number>()
  for (const o of options) {
    const key = o.toLowerCase()
    seen.set(key, (seen.get(key) ?? 0) + 1)
  }
  for (const [key, count] of seen) {
    if (count > 1 && key.length > 0) {
      add('duplicate_options', 'blocker', `Option kommt ${count}× vor: „${key}".`)
    }
  }
  if (q.correct_index < 0 || q.correct_index >= options.length) {
    add('correct_index', 'blocker', 'correct_index zeigt auf keine gültige Option.')
    return finish(findings)
  }
  if (!q.explanation || q.explanation.trim().length < 10) {
    add('missing_explanation', 'warning', 'Erklärung fehlt oder ist zu kurz (< 10 Zeichen).')
  }

  const correct = options[q.correct_index]
  const distractors = options.filter((_, i) => i !== q.correct_index)
  if (distractors.length === 0) return finish(findings)

  // ── 1. Länge: die richtige Antwort darf nicht die längste sein ─────────────
  if (!isNumericSet(options)) {
    const maxDistractor = Math.max(...distractors.map((d) => d.length))
    const lead = correct.length - maxDistractor
    if (lead >= LENGTH_LEAD_BLOCKER || correct.length > maxDistractor * 1.25) {
      add(
        'longest_is_correct',
        'blocker',
        `Die richtige Antwort ist deutlich die längste Option (${correct.length} vs. ${maxDistractor} Zeichen, +${lead}). Kürzen oder einen Distraktor darüber heben.`
      )
    } else if (lead >= 0) {
      // Knapp vorn ist einzeln unauffällig — erst die Häufung über viele Fragen
      // macht daraus den Trick "klick die längste Option" (siehe analyzeBatch).
      add(
        'longest_marginal',
        'warning',
        `Die richtige Antwort ist die längste, aber nur knapp (+${lead} Zeichen). Einzeln unbedenklich; zählt in die Batch-Quote.`
      )
    }
  }

  // ── 2. Satzanfang: die richtige darf nicht die einzige aus dem Muster sein ─
  const distractorFirstWords = new Set(distractors.map(firstWord))
  const correctFirstWord = firstWord(correct)
  if (distractorFirstWords.size === 1 && !distractorFirstWords.has(correctFirstWord)) {
    const [common] = [...distractorFirstWords]
    add(
      'first_word_tell',
      'blocker',
      `Alle Distraktoren beginnen mit „${common}", die richtige Antwort mit „${correctFirstWord}" — deterministisch erkennbar. Richtige ins Muster heben oder Distraktoren auf zwei Anfangswörter verteilen.`
    )
  }

  // ── 3. Telegrammstil: Stichpunkt zwischen ausformulierten Sätzen ───────────
  const correctWords = wordCount(correct)
  const minDistractorWords = Math.min(...distractors.map(wordCount))
  if (minDistractorWords >= 6 && correctWords * 2 <= minDistractorWords) {
    add(
      'telegram_style',
      'warning',
      `Die richtige Antwort ist ein Stichpunkt (${correctWords} Wörter), die Distraktoren sind Sätze (mind. ${minDistractorWords} Wörter) — fällt optisch auf. Als vollen Satz neu fassen.`
    )
  }

  // ── 4. Signalwörter: höchstens eine der fünf Optionen darf eines tragen ────
  const withAbsolute = options.filter(hasAbsoluteWord)
  if (withAbsolute.length > 1) {
    add(
      'absolute_overuse',
      'blocker',
      `${withAbsolute.length} von ${options.length} Optionen enthalten ein Signalwort (${ABSOLUTE_WORDS.join('/')}). Höchstens eine darf eines tragen — Distraktoren durch eine inhaltlich falsche Aussage ersetzen, nicht durch ein vorangestelltes Absolutwort.`
    )
  }
  const distractorsWithAbsolute = distractors.filter(hasAbsoluteWord).length
  if (distractorsWithAbsolute === distractors.length && !hasAbsoluteWord(correct)) {
    add(
      'absolute_distractor_tell',
      'blocker',
      'Jeder Distraktor trägt ein Signalwort, die richtige Antwort keins — ohne Fachwissen ausschließbar.'
    )
  }

  // ── Füller-Optionen ────────────────────────────────────────────────────────
  for (const o of options) {
    if (FILLER_RE.test(o)) {
      add('filler_option', 'blocker', `Füller-Option nicht zulässig: „${o}".`)
    }
  }

  // ── Grammatik: jede Option muss die Frage beantworten ──────────────────────
  if (/welche aussage|was (ist|versteht|bedeutet|beschreibt)/i.test(q.question_text)) {
    const fragments = options.filter((o) => FRAGMENT_STARTERS.includes(firstWord(o)))
    if (fragments.length > 0 && fragments.length < options.length) {
      add(
        'fragment_option',
        'warning',
        `Satzfragment statt Aussage: „${fragments[0]}". Bei Aussage-Fragen müssen alle Optionen vollständige Aussagen sein.`
      )
    }
  }

  return finish(findings)
}

function finish(findings: QualityFinding[]): QualityReport {
  const blockers = findings.filter((f) => f.severity === 'blocker').length
  const warnings = findings.filter((f) => f.severity === 'warning').length
  return { ok: blockers === 0, blockers, warnings, findings }
}

// ── Batch-Ebene ──────────────────────────────────────────────────────────────
//
// Einzelne Fragen können unauffällig sein und der Bestand trotzdem einen
// Rate-Trick enthalten: entscheidend ist die Quote über viele Fragen hinweg.
// Genau hier ist Durchlauf 1 gescheitert (Ratio optimiert, Quote unverändert).

export interface BatchMetric {
  key: string
  label: string
  value: number
  total: number
  share: number
  target: string
  verdict: 'ok' | 'zu hoch' | 'zu niedrig'
}

export interface BatchReport {
  questions: number
  metrics: BatchMetric[]
  blockedQuestions: number
}

function metric(
  key: string,
  label: string,
  value: number,
  total: number,
  bounds: { min?: number; max?: number },
  target: string
): BatchMetric {
  const share = total > 0 ? value / total : 0
  let verdict: BatchMetric['verdict'] = 'ok'
  if (bounds.max !== undefined && share > bounds.max) verdict = 'zu hoch'
  else if (bounds.min !== undefined && share < bounds.min) verdict = 'zu niedrig'
  return { key, label, value, total, share, target, verdict }
}

export function analyzeBatch(questions: QuestionInput[]): BatchReport {
  let longestIsCorrect = 0
  let firstWordTell = 0
  let telegram = 0
  let structural = 0
  let blocked = 0
  let optionsTotal = 0
  let optionsAbsolute = 0
  let correctAbsolute = 0

  for (const q of questions) {
    const report = analyzeQuestion(q)
    const found = new Set(report.findings.map((f) => f.code))
    if (!report.ok) blocked++
    if (found.has('longest_is_correct') || found.has('longest_marginal')) longestIsCorrect++
    if (found.has('first_word_tell')) firstWordTell++
    if (found.has('telegram_style')) telegram++
    if (
      found.has('option_count') ||
      found.has('duplicate_options') ||
      found.has('empty_option') ||
      found.has('correct_index')
    ) {
      structural++
    }

    const options = (q.options ?? []).map(normalizeOption)
    optionsTotal += options.length
    options.forEach((o, i) => {
      if (!hasAbsoluteWord(o)) return
      optionsAbsolute++
      if (i === q.correct_index) correctAbsolute++
    })
  }

  const n = questions.length
  return {
    questions: n,
    blockedQuestions: blocked,
    metrics: [
      metric(
        'longest_is_correct',
        'Richtige Antwort ist die längste',
        longestIsCorrect,
        n,
        { min: LONGEST_RATE_TARGET.min, max: LONGEST_RATE_TARGET.max },
        `${Math.round(LONGEST_RATE_TARGET.chance * 100)} % (Zufall bei 5 Optionen)`
      ),
      metric('first_word_tell', 'Satzanfang-Tell', firstWordTell, n, { max: 0.03 }, '≤ 3 %'),
      metric('telegram_style', 'Telegrammstil', telegram, n, { max: 0.05 }, '≤ 5 %'),
      metric('structural', 'Strukturfehler', structural, n, { max: 0 }, '0'),
      metric(
        'absolute_options',
        'Optionen mit Signalwort',
        optionsAbsolute,
        optionsTotal,
        { max: 0.12 },
        '≤ 12 % (Grundrauschen)'
      ),
      metric(
        'absolute_correct',
        'davon richtige Antworten',
        correctAbsolute,
        optionsAbsolute,
        { max: 0.25 },
        'niedrig ist fachlich korrekt — nicht künstlich anheben'
      ),
    ],
  }
}
