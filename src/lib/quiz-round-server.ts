/**
 * PROJ-129: Datenbank-Seite der Runden mit Rundenzettel (nur Server).
 *
 * Der Zettel liegt in `quiz_rounds` (RLS ohne Richtlinie, nur Service-Schlüssel).
 * Jede Änderung läuft über `mutateRound`: lesen → Regel anwenden → nur
 * speichern, wenn die Version noch stimmt (sonst neu lesen). So bleiben
 * parallele oder doppelt gesendete Anfragen harmlos.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { createServiceClient } from '@/lib/supabase-server'
import { fetchAnswerKey } from '@/lib/answer-key'
import { fetchAllRows } from '@/lib/fetch-all-rows'
import type { QuizRoundForm } from '@/lib/quiz-round'
import {
  ROUND_MAX_AGE_MS,
  buildSlipQuestion,
  isRuleError,
  questionEligibility,
  shuffle,
  type RoundSlip,
  type RuleError,
  type SlipSource,
} from '@/lib/quiz-round-rules'

export interface RoundRow {
  id: string
  user_id: string
  kind: 'quiz' | 'blitz'
  blitz_form: 'true_false' | 'classic' | null
  subject_id: string | null
  slip: RoundSlip
  version: number
  created_at: string
  finished_at: string | null
  result: unknown
}

const ROW_COLS = 'id, user_id, kind, blitz_form, subject_id, slip, version, created_at, finished_at, result'

export type RoundLoadError = { status: 404 | 410 | 500; message: string }

/** Rundenzettel des Spielers. 404 = fremd/unbekannt, 410 = abgelaufen. */
export async function loadRound(
  service: SupabaseClient,
  roundId: string,
  userId: string,
  { allowFinished = false }: { allowFinished?: boolean } = {},
): Promise<RoundRow | RoundLoadError> {
  const { data, error } = await service
    .from('quiz_rounds')
    .select(ROW_COLS)
    .eq('id', roundId)
    .eq('user_id', userId)
    .maybeSingle()
  if (error) {
    console.error('[quiz-rounds] load:', error)
    return { status: 500, message: 'Runde konnte nicht geladen werden' }
  }
  if (!data) return { status: 404, message: 'Runde nicht gefunden' }
  const row = data as RoundRow
  if (Date.now() - Date.parse(row.created_at) > ROUND_MAX_AGE_MS) return { status: 410, message: 'Runde ist abgelaufen' }
  if (row.finished_at && !allowFinished) return { status: 410, message: 'Runde ist schon abgerechnet' }
  return row
}

export function isLoadError(x: unknown): x is RoundLoadError {
  return typeof x === 'object' && x !== null && 'status' in x && 'message' in x && !('slip' in x)
}

type Mutation<R> = (slip: RoundSlip, row: RoundRow) => { slip: RoundSlip; response: R; changed: boolean } | RuleError

/**
 * Regel auf den Zettel anwenden und mit Versionsprüfung speichern.
 * Bei gleichzeitiger Änderung wird bis zu 4× neu gelesen.
 */
export async function mutateRound<R>(
  roundId: string,
  userId: string,
  fn: Mutation<R>,
  check?: (row: RoundRow) => RoundLoadError | null,
): Promise<{ response: R } | RuleError | RoundLoadError> {
  const service = createServiceClient()
  for (let attempt = 0; attempt < 4; attempt++) {
    const row = await loadRound(service, roundId, userId)
    if (isLoadError(row)) return row
    const blocked = check?.(row)
    if (blocked) return blocked
    const out = fn(row.slip, row)
    if (isRuleError(out)) return out
    if (!out.changed) return { response: out.response }
    const { data, error } = await service
      .from('quiz_rounds')
      .update({ slip: out.slip, version: row.version + 1 })
      .eq('id', row.id)
      .eq('version', row.version)
      .is('finished_at', null)
      .select('id')
    if (error) {
      console.error('[quiz-rounds] save:', error)
      return { status: 500, message: 'Runde konnte nicht gespeichert werden' }
    }
    if (data && data.length === 1) return { response: out.response }
    // Jemand anderes war schneller → neu lesen
  }
  return { status: 500, message: 'Runde ist gerade beschäftigt, bitte noch einmal versuchen' }
}

// ── Gekannte Fragen ─────────────────────────────────────────────────────────
/**
 * Frage-IDs, die der Spieler schon klassisch (oder per bestandenem
 * Rauswerfen) richtig beantwortet hat. Mit `among` nur innerhalb dieser IDs.
 */
export async function fetchKnownQuestionIds(
  service: SupabaseClient,
  userId: string,
  among?: string[],
): Promise<Set<string>> {
  if (among && among.length === 0) return new Set()
  const { rows, error } = await fetchAllRows<{ question_id: string }>('known questions', (from, to) => {
    let q = service
      .from('quiz_answers')
      .select('question_id')
      .eq('user_id', userId)
      .eq('is_correct', true)
      .in('presentation', ['classic', 'eliminate'])
    if (among) q = q.in('question_id', among)
    return q.order('id').range(from, to)
  })
  if (error) {
    console.error('[quiz-rounds] known questions:', error)
    return new Set()
  }
  return new Set(rows.map((r) => r.question_id))
}

// ── Zettel anlegen ──────────────────────────────────────────────────────────
export interface PoolQuestion {
  id: string
  question_text: string
  explanation: string | null
  difficulty: string
  answer_options: { id: string; option_text: string; display_order?: number }[]
}

/**
 * Lösungen per Service-Schlüssel dazuholen und Fragen ohne genau eine
 * richtige Option aussortieren (die könnte man nicht fair werten).
 */
export async function toSlipSources(questions: PoolQuestion[]): Promise<SlipSource[]> {
  const key = await fetchAnswerKey(questions.map((q) => q.id))
  const out: SlipSource[] = []
  for (const q of questions) {
    const k = key.get(q.id)
    const options = shuffle(q.answer_options ?? []).map((o) => ({ id: o.id, option_text: o.option_text }))
    const correct = options.filter((o) => k?.options.get(o.id) === true)
    if (correct.length !== 1 || options.length < 2) continue
    out.push({
      id: q.id,
      question_text: q.question_text,
      difficulty: q.difficulty,
      explanation: k?.explanation ?? q.explanation,
      options,
      correct_option_id: correct[0].id,
    })
  }
  return out
}

export function eligibilityOf(src: SlipSource) {
  return questionEligibility({ question_text: src.question_text, options: src.options })
}

/** Alte Zettel des Spielers aufräumen (älter als 1 Tag) */
export async function cleanupOldRounds(service: SupabaseClient, userId: string): Promise<void> {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const { error } = await service.from('quiz_rounds').delete().eq('user_id', userId).lt('created_at', cutoff)
  if (error) console.error('[quiz-rounds] cleanup:', error)
}

export async function insertRound(
  service: SupabaseClient,
  row: {
    user_id: string
    kind: 'quiz' | 'blitz'
    blitz_form?: 'true_false' | 'classic'
    subject_id?: string | null
    class_level?: number | null
    topic_id?: string | null
    slip: RoundSlip
  },
): Promise<string | null> {
  const { data, error } = await service.from('quiz_rounds').insert(row).select('id').single()
  if (error || !data) {
    console.error('[quiz-rounds] insert:', error)
    return null
  }
  return data.id as string
}

export function buildSlip(sources: SlipSource[], forms: QuizRoundForm[], variants: boolean): RoundSlip {
  return {
    questions: sources.map((s, i) => buildSlipQuestion(s, forms[i] ?? 'classic')),
    variants,
    jokers_used: 0,
    wager: null,
  }
}

// ── Abrechnen ───────────────────────────────────────────────────────────────
/**
 * Runde für die Abrechnung beanspruchen: setzt `finished_at` nur, wenn es
 * noch leer ist. Ist sie schon abgerechnet, kommt das gespeicherte Ergebnis.
 */
export async function claimRoundForFinish(
  service: SupabaseClient,
  roundId: string,
  userId: string,
): Promise<{ row: RoundRow } | { result: unknown } | RoundLoadError> {
  const row = await loadRound(service, roundId, userId, { allowFinished: true })
  if (isLoadError(row)) return row
  if (row.finished_at) {
    if (row.result) return { result: row.result }
    return { status: 500, message: 'Runde wird gerade abgerechnet' }
  }
  const { data, error } = await service
    .from('quiz_rounds')
    .update({ finished_at: new Date().toISOString() })
    .eq('id', row.id)
    .is('finished_at', null)
    .select(ROW_COLS)
  if (error) {
    console.error('[quiz-rounds] claim:', error)
    return { status: 500, message: 'Runde konnte nicht abgerechnet werden' }
  }
  if (!data || data.length !== 1) {
    const again = await loadRound(service, roundId, userId, { allowFinished: true })
    if (!isLoadError(again) && again.result) return { result: again.result }
    return { status: 500, message: 'Runde wird gerade abgerechnet' }
  }
  return { row: data[0] as RoundRow }
}

/** Beanspruchung zurücknehmen, wenn das Speichern scheitert (Wiederholung möglich) */
export async function releaseRound(service: SupabaseClient, roundId: string): Promise<void> {
  await service.from('quiz_rounds').update({ finished_at: null }).eq('id', roundId).is('result', null)
}

export async function storeRoundResult(service: SupabaseClient, roundId: string, result: unknown): Promise<void> {
  const { error } = await service.from('quiz_rounds').update({ result }).eq('id', roundId)
  if (error) console.error('[quiz-rounds] store result:', error)
}
