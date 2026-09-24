// Shared helpers for PROJ-21 (Benotete Leistungsnachweise) — code generation,
// grading-scale validation and grade computation, used by both the admin and
// student-facing API routes so the rules stay in exactly one place.

export type GradeBoundary = { grade: 1 | 2 | 3 | 4 | 5 | 6; minPercent: number }

export const IHK_DEFAULT_SCALE: GradeBoundary[] = [
  { grade: 1, minPercent: 92 },
  { grade: 2, minPercent: 81 },
  { grade: 3, minPercent: 67 },
  { grade: 4, minPercent: 50 },
  { grade: 5, minPercent: 30 },
  { grade: 6, minPercent: 0 },
]

// Excludes 0/O/1/I/L — mirrors the requirement that the code stay
// unambiguous when read aloud or handwritten on a whiteboard.
const CODE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ'
const CODE_LENGTH = 6

export function generateAccessCode(): string {
  let code = ''
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)]
  }
  return code
}

export function normalizeAccessCode(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, '')
}

export function formatAccessCode(code: string): string {
  return code.length > 4 ? `${code.slice(0, 4)}-${code.slice(4)}` : code
}

/** Grenzen müssen lückenlos absteigend sein (Note 1 > Note 2 > … > Note 6 = 0). */
export function validateGradingScale(scale: unknown): string | null {
  if (!Array.isArray(scale) || scale.length !== 6) return 'Notenschlüssel muss genau 6 Einträge haben.'
  const grades = new Set<number>()
  for (const entry of scale) {
    if (
      typeof entry !== 'object' || entry === null ||
      typeof (entry as GradeBoundary).grade !== 'number' ||
      typeof (entry as GradeBoundary).minPercent !== 'number'
    ) {
      return 'Notenschlüssel-Einträge müssen grade und minPercent enthalten.'
    }
    grades.add((entry as GradeBoundary).grade)
  }
  if (grades.size !== 6 || ![1, 2, 3, 4, 5, 6].every((g) => grades.has(g))) {
    return 'Notenschlüssel muss genau die Noten 1 bis 6 enthalten.'
  }
  const sorted = [...(scale as GradeBoundary[])].sort((a, b) => a.grade - b.grade)
  for (let i = 0; i < sorted.length; i++) {
    const b = sorted[i]
    if (b.minPercent < 0 || b.minPercent > 100) return 'Grenzen müssen zwischen 0 und 100 % liegen.'
    if (i > 0 && b.minPercent >= sorted[i - 1].minPercent) {
      return 'Grenzen müssen von Note 1 zu Note 6 absteigend sein.'
    }
  }
  if (sorted[sorted.length - 1]?.minPercent !== 0) return 'Note 6 muss bei 0 % beginnen.'
  return null
}

/**
 * Combines the admin-controlled status (draft/open/closed) with the
 * scheduled join window: an assessment the admin opened but forgot to close
 * still stops accepting joins once closesAt passes, and one opened ahead of
 * its scheduled start isn't joinable until opensAt.
 */
export function effectiveAssessmentStatus(
  status: 'draft' | 'open' | 'closed',
  opensAt: string,
  closesAt: string,
  now: Date = new Date(),
): 'not_open' | 'open' | 'closed' {
  if (status === 'draft') return 'not_open'
  if (status === 'closed') return 'closed'
  if (now.getTime() < new Date(opensAt).getTime()) return 'not_open'
  if (now.getTime() > new Date(closesAt).getTime()) return 'closed'
  return 'open'
}

export function gradeForPercent(percent: number, scale: GradeBoundary[]): number {
  const sorted = [...scale].sort((a, b) => a.grade - b.grade)
  for (const b of sorted) {
    if (percent >= b.minPercent) return b.grade
  }
  return 6
}

/**
 * Scores a graded assessment from its stored (already-answered) question
 * snapshot. Only multiple_choice questions count — assessments are
 * validated MC-only at creation, but this stays defensive in case a
 * non-MC question ever ends up in a snapshot.
 */
export function scoreAssessmentQuestions(
  questions: { type: string; is_correct?: boolean }[],
  scale: GradeBoundary[],
): { points: number; totalPoints: number; percent: number; grade: number } {
  const mcQuestions = questions.filter((q) => q.type === 'multiple_choice')
  const totalPoints = mcQuestions.length
  const points = mcQuestions.filter((q) => q.is_correct).length
  const percent = totalPoints > 0 ? Math.round((points / totalPoints) * 100) : 0
  return { points, totalPoints, percent, grade: gradeForPercent(percent, scale) }
}

export type SnapshotQuestion = {
  id: string
  type: string
  student_answer?: string | null
  is_correct?: boolean
  question_text?: string
  answer_options?: { id: string; option_text: string; is_correct: boolean }[]
}

export type SessionRow = {
  id: string
  participant_name: string | null
  started_at: string
  ended_at: string | null
  status: string
  excluded_from_grading: boolean
  results_json: { parts?: Record<string, { questions: SnapshotQuestion[] }> } | null
}

export type ParticipantRow = {
  sessionId: string
  name: string
  points: number | null
  totalPoints: number | null
  percent: number | null
  grade: number | null
  durationMinutes: number | null
  submittedAt: string | null
  excluded: boolean
  status: 'in_progress' | 'completed'
}

/** Shared by the admin results and CSV-export routes so scoring logic lives in one place. */
export function buildParticipantRows(
  sessions: SessionRow[],
  part: number,
  gradingScale: GradeBoundary[],
): ParticipantRow[] {
  const partKey = String(part)
  return sessions.map((s) => {
    const questions = s.results_json?.parts?.[partKey]?.questions ?? []
    let scored: ReturnType<typeof scoreAssessmentQuestions> | null = null
    if (s.status !== 'in_progress' && questions.length > 0) {
      scored = scoreAssessmentQuestions(questions, gradingScale)
    }
    const durationMinutes = s.ended_at
      ? Math.round((new Date(s.ended_at).getTime() - new Date(s.started_at).getTime()) / 60000)
      : null
    return {
      sessionId: s.id,
      name: s.participant_name ?? 'Unbekannt',
      points: scored?.points ?? null,
      totalPoints: scored?.totalPoints ?? null,
      percent: scored?.percent ?? null,
      grade: scored?.grade ?? null,
      durationMinutes,
      submittedAt: s.ended_at,
      excluded: s.excluded_from_grading,
      status: s.status === 'in_progress' ? 'in_progress' : 'completed',
    }
  })
}

/** Redacted question as stored in an assessment session: no answer key, no explanation. */
export type RedactedQuestion = {
  id: string
  question_text: string
  type: string
  difficulty: string
  part: number
  answer_options: { id: string; option_text: string; display_order: number }[]
}

export type GradedQuestion = RedactedQuestion & {
  explanation: string | null
  sample_answer: string | null
  student_answer: string | null
  is_correct: boolean
  correct_option_id: string | undefined
  answer_options: { id: string; option_text: string; display_order: number; is_correct: boolean }[]
}

type KeyEntry = { explanation: string | null; sampleAnswer: string | null; options: Map<string, boolean> }

/**
 * Grades an assessment session from its redacted snapshot, the submitted
 * answers and the answer key fetched server-side at grading time. The key
 * is never stored in the (student-readable) session row before release.
 * Questions missing from the key were deleted after the snapshot — they
 * drop out of the wertung for everyone alike, as the spec requires.
 */
export function gradeSnapshot(
  snapshot: RedactedQuestion[],
  answers: Record<string, string>,
  key: Map<string, KeyEntry>,
  scale: GradeBoundary[],
): { part: { questions: GradedQuestion[]; score: number; passed: boolean }; scored: ReturnType<typeof scoreAssessmentQuestions> } {
  const questions: GradedQuestion[] = []
  for (const q of snapshot) {
    const entry = key.get(q.id)
    if (!entry) continue
    const studentAnswer = answers[q.id] ?? null
    const correctOptionId = [...entry.options.entries()].find(([, correct]) => correct)?.[0]
    questions.push({
      ...q,
      explanation: entry.explanation,
      sample_answer: entry.sampleAnswer,
      student_answer: studentAnswer,
      is_correct: q.type === 'multiple_choice' && studentAnswer != null && studentAnswer === correctOptionId,
      correct_option_id: correctOptionId,
      answer_options: q.answer_options.map((o) => ({ ...o, is_correct: entry.options.get(o.id) ?? false })),
    })
  }
  const scored = scoreAssessmentQuestions(questions, scale)
  return { part: { questions, score: scored.percent, passed: scored.percent >= 50 }, scored }
}

/**
 * For the admin views: grades every submitted attempt live from its stored
 * snapshot + submitted answers, so the Ausbilder sees scores before the
 * release too. In-progress attempts are left untouched (no score yet).
 */
export function applyGrading(
  rows: SessionRow[],
  part: number,
  key: Map<string, KeyEntry>,
  scale: GradeBoundary[],
): SessionRow[] {
  const partKey = String(part)
  return rows.map((row) => {
    if (row.status === 'in_progress') return row
    const results = row.results_json as unknown as {
      parts?: Record<string, RedactedQuestion[] | { questions: RedactedQuestion[] }>
      submitted_answers?: Record<string, string>
    } | null
    const stored = results?.parts?.[partKey]
    // Released rows already hold graded questions in { questions }; unreleased ones the raw snapshot array.
    const snapshot = Array.isArray(stored) ? stored : (stored?.questions ?? [])
    const { part: graded } = gradeSnapshot(snapshot, results?.submitted_answers ?? {}, key, scale)
    return { ...row, results_json: { ...(row.results_json ?? {}), parts: { [partKey]: { questions: graded.questions } } } }
  })
}

/** Question ids referenced by any stored snapshot — to fetch the answer key in one query. */
export function snapshotQuestionIds(rows: SessionRow[], part: number): string[] {
  const partKey = String(part)
  const ids = new Set<string>()
  for (const row of rows) {
    const stored = (row.results_json as unknown as { parts?: Record<string, RedactedQuestion[] | { questions: RedactedQuestion[] }> } | null)?.parts?.[partKey]
    const list = Array.isArray(stored) ? stored : (stored?.questions ?? [])
    for (const q of list) ids.add(q.id)
  }
  return [...ids]
}

/**
 * CSV cell for the Excel-bound export. Neutralises spreadsheet formulas
 * (CSV injection): a Klarname like =HYPERLINK(...) would otherwise run as a
 * formula when the Ausbilder opens the file.
 */
export function csvEscape(value: string): string {
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value
  if (/[;"\n\r]/.test(safe)) return `"${safe.replace(/"/g, '""')}"`
  return safe
}

/** Fisher-Yates — used to fix a per-participant question/option order at join time. */
export function shuffle<T>(items: T[]): T[] {
  const arr = [...items]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}
