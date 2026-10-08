// Abgabe und Autosave einer Leistungsnachweis-Teilnahme (PROJ-21). Liegt hier
// statt in der Session-Route, weil auch die automatische Abgabe wegen
// Fokus-Verlusten (PROJ-30) durch genau diesen Code läuft — ein Rechenweg für
// Zeitlimit, Fragen-Snapshot und Bewertung bei Freigabe.

import type { SupabaseClient } from '@supabase/supabase-js'
import { createServiceClient } from '@/lib/supabase-server'
import { gradeSnapshot, type GradeBoundary, type RedactedQuestion } from '@/lib/graded-assessments'
import { fetchAnswerKey } from '@/lib/answer-key'
import { FOCUS_COUNT_FROM_SECONDS, FOCUS_MAX_EVENTS, FOCUS_MAX_REPORTS_PER_MINUTE } from '@/lib/focus-tracking'

// Grace period on top of the attempt's duration for network latency and the
// client's own auto-submit round trip.
export const DEADLINE_GRACE_SECONDS = 60

export type AssessmentResultsJson = {
  durationMinutes?: number
  parts: Record<string, RedactedQuestion[]>
  draft_answers?: Record<string, string>
  assessment?: { title: string; accessCode: string; released: boolean }
}

export type AssessmentSession = {
  id: string
  started_at: string
  assessment_id: string | null
  results_json: unknown
}

export type SubmitOutcome = { ok: true } | { ok: false; status: number; error: string }

/** Zeitpunkt, nach dem der Server keine Antworten und keine Meldungen mehr annimmt. */
export function assessmentDeadlineMs(startedAt: string, durationMinutes: number): number {
  return new Date(startedAt).getTime() + (durationMinutes * 60 + DEADLINE_GRACE_SECONDS) * 1000
}

export async function saveAssessmentDraft(
  client: SupabaseClient,
  session: AssessmentSession,
  answers: Record<string, string>,
): Promise<SubmitOutcome> {
  const resultsJson = session.results_json as AssessmentResultsJson
  const deadline = assessmentDeadlineMs(session.started_at, resultsJson.durationMinutes ?? 0)
  if (Date.now() > deadline) {
    return { ok: false, status: 409, error: 'Die Bearbeitungszeit ist abgelaufen.' }
  }
  const { error } = await client
    .from('exam_sessions')
    .update({ results_json: { ...resultsJson, draft_answers: { ...(resultsJson.draft_answers ?? {}), ...answers } } })
    .eq('id', session.id)
  if (error) return { ok: false, status: 500, error: 'Failed to save answers' }
  return { ok: true }
}

/**
 * Gibt eine Teilnahme ab. Nach dem Fristende zählt nur, was rechtzeitig
 * gespeichert wurde; war die Freigabe schon erfolgt (Nachzügler), wird sofort
 * bewertet. Offene Fokus-Einträge werden mit der Abgabe geschlossen.
 */
export async function finishAssessmentAttempt(params: {
  client: SupabaseClient
  session: AssessmentSession
  action: 'submit' | 'abort'
  answers: Record<string, string>
}): Promise<SubmitOutcome> {
  const { client, session, action, answers } = params
  const resultsJson = session.results_json as AssessmentResultsJson
  const durationMinutes = resultsJson.durationMinutes ?? 0
  const deadline = assessmentDeadlineMs(session.started_at, durationMinutes)
  const pastDeadline = Date.now() > deadline

  // After the deadline only what was autosaved in time counts — answers
  // sent with a late submit are ignored.
  const submittedAnswers = pastDeadline
    ? { ...(resultsJson.draft_answers ?? {}) }
    : { ...(resultsJson.draft_answers ?? {}), ...answers }

  const service = createServiceClient()
  const { data: assessment } = await service
    .from('graded_assessments')
    .select('title, access_code, part, grading_scale, results_released_at, focus_tracking')
    .eq('id', session.assessment_id!)
    .single()

  if (!assessment) return { ok: false, status: 404, error: 'Leistungsnachweis nicht gefunden.' }

  const partKey = String(assessment.part)
  const snapshot = resultsJson.parts[partKey] ?? []
  let nextResults: Record<string, unknown> = {
    durationMinutes: resultsJson.durationMinutes,
    parts: { [partKey]: snapshot },
    submitted_answers: submittedAnswers,
    assessment: { title: assessment.title, accessCode: assessment.access_code, released: false },
  }

  // Straggler: results were released while this attempt was still running.
  if (assessment.results_released_at) {
    const key = await fetchAnswerKey(snapshot.map((q) => q.id))
    const { part, scored } = gradeSnapshot(snapshot, submittedAnswers, key, assessment.grading_scale as GradeBoundary[])
    nextResults = {
      ...nextResults,
      parts: { [partKey]: part },
      assessment: { title: assessment.title, accessCode: assessment.access_code, released: true, ...scored },
    }
  }

  const { error } = await client
    .from('exam_sessions')
    .update({
      status: action === 'abort' ? 'aborted' : 'completed',
      ended_at: new Date().toISOString(),
      results_json: nextResults,
    })
    .eq('id', session.id)

  if (error) return { ok: false, status: 500, error: 'Failed to update session' }

  // PROJ-30: ein noch offener „weg"-Eintrag endet mit der Abgabe. Fehler hier
  // dürfen die Abgabe nie rückgängig machen oder verzögern.
  if (assessment.focus_tracking) {
    try {
      await service.rpc('focus_report', {
        p_session_id: session.id,
        p_action: 'finalize',
        p_event_id: null,
        p_question_id: null,
        p_question_number: null,
        p_client_seconds: null,
        p_effective_now: new Date(Math.min(Date.now(), deadline)).toISOString(),
        p_count_from_seconds: FOCUS_COUNT_FROM_SECONDS,
        p_max_events: FOCUS_MAX_EVENTS,
        p_max_per_minute: FOCUS_MAX_REPORTS_PER_MINUTE * 10,
      })
    } catch (err) {
      console.error('[finishAssessmentAttempt] focus finalize', err)
    }
  }

  return { ok: true }
}
