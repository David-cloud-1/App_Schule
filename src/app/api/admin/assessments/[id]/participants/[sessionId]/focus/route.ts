import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin, assertCanAdminDepartment } from '../../../../../_lib/auth'
import { createServiceClient } from '@/lib/supabase-server'
import { FOCUS_MAX_EVENTS } from '@/lib/focus-tracking'

const IdSchema = z.string().uuid()

/**
 * Detailprotokoll eines Teilnehmers (PROJ-30): jeder Eintrag mit Beginn,
 * Dauer und Frage. Nur für Admins des Fachbereichs des Nachweises — Azubis
 * haben auf die Protokoll-Tabellen keinen Zugriff.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; sessionId: string }> },
) {
  const { id, sessionId } = await params
  const auth = await requireAdmin()
  if (auth.error) return auth.error
  const { supabase } = auth

  if (!IdSchema.safeParse(id).success || !IdSchema.safeParse(sessionId).success) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  // Bereichsprüfung vor jedem Service-Client-Zugriff (PROJ-24)
  const { data: assessment } = await supabase
    .from('graded_assessments')
    .select('department_id, focus_tracking, focus_auto_submit_after')
    .eq('id', id)
    .maybeSingle()
  if (!assessment) return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 })
  const forbidden = assertCanAdminDepartment(auth, assessment.department_id as string)
  if (forbidden) return forbidden

  const service = createServiceClient()
  const { data: session } = await service
    .from('exam_sessions')
    .select('id')
    .eq('id', sessionId)
    .eq('assessment_id', id)
    .maybeSingle()
  if (!session) return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 })

  const [{ data: summary }, { data: events }] = await Promise.all([
    service
      .from('assessment_focus_summary')
      .select('counted_switches, counted_seconds, short_count, auto_submitted')
      .eq('session_id', sessionId)
      .maybeSingle(),
    service
      .from('assessment_focus_events')
      .select('id, left_at, returned_at, duration_seconds, question_id, question_number, counted')
      .eq('session_id', sessionId)
      .order('left_at', { ascending: true })
      .limit(FOCUS_MAX_EVENTS),
  ])

  return NextResponse.json({
    focusTracking: Boolean(assessment.focus_tracking),
    autoSubmitAfter: assessment.focus_auto_submit_after ?? null,
    summary: {
      countedSwitches: summary?.counted_switches ?? 0,
      countedSeconds: summary?.counted_seconds ?? 0,
      shortCount: summary?.short_count ?? 0,
      autoSubmitted: summary?.auto_submitted ?? false,
    },
    events: (events ?? []).map((e) => ({
      id: e.id,
      leftAt: e.left_at,
      returnedAt: e.returned_at,
      durationSeconds: e.duration_seconds,
      questionNumber: e.question_number,
      counted: e.counted,
    })),
    // Obergrenze erreicht → die Liste zeigt nicht alle Einträge, die Zähler schon
    truncated: (events?.length ?? 0) >= FOCUS_MAX_EVENTS,
  })
}
