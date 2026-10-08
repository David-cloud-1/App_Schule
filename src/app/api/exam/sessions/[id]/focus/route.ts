import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient, createServiceClient } from '@/lib/supabase-server'
import { assessmentDeadlineMs, finishAssessmentAttempt } from '@/lib/assessment-submit'
import {
  FOCUS_COUNT_FROM_SECONDS,
  FOCUS_MAX_EVENTS,
  FOCUS_MAX_REPORTS_PER_MINUTE,
} from '@/lib/focus-tracking'

// Meldungen des Prüfungs-Runners zum Verlassen der Seite (PROJ-30).
// Die Zeit stempelt der Server; der Browser liefert nur Art, Kennung des
// Eintrags, aktuelle Frage und — beim Zurückkommen — seine gemessene Dauer als
// Rückfall, falls die „weg"-Meldung verloren ging.

const Schema = z
  .object({
    action: z.enum(['leave', 'return', 'resume']),
    eventId: z.string().uuid().optional(),
    questionId: z.string().uuid().nullish(),
    questionNumber: z.number().int().min(1).max(1000).nullish(),
    seconds: z.number().int().min(0).max(86_400).optional(),
  })
  .refine((v) => v.action === 'resume' || v.eventId !== undefined, { message: 'eventId fehlt' })

type FocusResult = {
  countedSwitches: number
  countedSeconds: number
  shortCount: number
  autoSubmitted: boolean
  warn: boolean
  rateLimited?: boolean
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const parsed = Schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  const { action, eventId, questionId, questionNumber, seconds } = parsed.data

  // Nur die eigene Teilnahme
  const { data: session } = await supabase
    .from('exam_sessions')
    .select('id, started_at, status, assessment_id, results_json')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()
  if (!session || !session.assessment_id) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  }
  // Nach der Abgabe wird nichts mehr protokolliert (kein Fehler für den Browser)
  if (session.status !== 'in_progress') {
    return NextResponse.json({ ignored: true, ended: true })
  }

  const service = createServiceClient()
  const { data: assessment } = await service
    .from('graded_assessments')
    .select('focus_tracking, focus_auto_submit_after')
    .eq('id', session.assessment_id)
    .single()
  if (!assessment) return NextResponse.json({ error: 'Leistungsnachweis nicht gefunden.' }, { status: 404 })
  if (!assessment.focus_tracking) return NextResponse.json({ tracking: false })

  const durationMinutes = (session.results_json as { durationMinutes?: number } | null)?.durationMinutes ?? 0
  const deadline = assessmentDeadlineMs(session.started_at, durationMinutes)
  const now = Date.now()
  if (now > deadline) {
    return NextResponse.json({ error: 'Die Bearbeitungszeit ist abgelaufen.' }, { status: 409 })
  }

  const { data, error } = await service.rpc('focus_report', {
    p_session_id: session.id,
    p_action: action,
    p_event_id: eventId ?? null,
    p_question_id: questionId ?? null,
    p_question_number: questionNumber ?? null,
    p_client_seconds: seconds ?? null,
    p_effective_now: new Date(Math.min(now, deadline)).toISOString(),
    p_count_from_seconds: FOCUS_COUNT_FROM_SECONDS,
    p_max_events: FOCUS_MAX_EVENTS,
    p_max_per_minute: FOCUS_MAX_REPORTS_PER_MINUTE,
  })
  if (error || !data) {
    console.error('[POST /api/exam/sessions/[id]/focus]', error)
    return NextResponse.json({ error: 'Meldung fehlgeschlagen.' }, { status: 500 })
  }
  const result = data as FocusResult
  if (result.rateLimited) {
    return NextResponse.json({ error: 'Zu viele Meldungen. Bitte kurz warten.' }, { status: 429 })
  }

  // Automatische Abgabe: der Server zählt selbst, der Browser behauptet nichts.
  const limit = assessment.focus_auto_submit_after as number | null
  if (limit != null && result.countedSwitches >= limit && !result.autoSubmitted) {
    // Wer die Markierung als Erster setzt, gibt ab — zwei gleichzeitige
    // Meldungen lösen nicht zweimal aus.
    const { data: claimed } = await service
      .from('assessment_focus_summary')
      .update({ auto_submitted: true })
      .eq('session_id', session.id)
      .eq('auto_submitted', false)
      .select('session_id')

    if (claimed && claimed.length > 0) {
      const outcome = await finishAssessmentAttempt({
        client: service,
        session,
        action: 'submit',
        answers: {},
      })
      if (!outcome.ok) {
        await service.from('assessment_focus_summary').update({ auto_submitted: false }).eq('session_id', session.id)
        return NextResponse.json({ error: 'Automatische Abgabe fehlgeschlagen.' }, { status: 500 })
      }
      return NextResponse.json({
        countedSwitches: result.countedSwitches,
        warn: result.warn,
        autoSubmitAfter: limit,
        autoSubmitted: true,
      })
    }
  }

  return NextResponse.json({
    countedSwitches: result.countedSwitches,
    warn: result.warn,
    autoSubmitAfter: limit,
    autoSubmitted: false,
  })
}
