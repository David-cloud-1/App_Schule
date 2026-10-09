import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, assertCanAdminDepartment } from '../../../_lib/auth'
import { createServiceClient } from '@/lib/supabase-server'
import {
  applyGrading,
  buildStudentReports,
  formatAccessCode,
  snapshotQuestionIds,
  type GradeBoundary,
  type SessionRow,
} from '@/lib/graded-assessments'
import { fetchAnswerKey } from '@/lib/answer-key'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Einzelauswertungen für die Druckansicht (PROJ-28): Fragen, gegebene und
 * richtige Antworten je abgegebenem Teilnehmer. Ohne `sessionId` alle
 * Abgaben (Sammeldruck), mit `sessionId` genau eine.
 * Die Klassenstatistik kommt unverändert aus `/results`.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const auth = await requireAdmin()
  if (auth.error) return auth.error
  const { supabase } = auth

  const sessionId = request.nextUrl.searchParams.get('sessionId')
  if (sessionId !== null && !UUID_RE.test(sessionId)) {
    return NextResponse.json({ error: 'Invalid sessionId' }, { status: 400 })
  }

  const { data: assessment } = await supabase
    .from('graded_assessments')
    .select('title, part, grading_scale, department_id, access_code, opens_at, closes_at, status')
    .eq('id', id)
    .maybeSingle()
  if (!assessment) return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 })
  const forbidden = assertCanAdminDepartment(auth, assessment.department_id as string)
  if (forbidden) return forbidden

  // Service-Client erst nach der Bereichsprüfung: Klarnamen und Antworten
  // liegen in Sitzungen, die für Admins sonst nicht lesbar sind.
  const service = createServiceClient()
  let query = service
    .from('exam_sessions')
    .select('id, participant_name, started_at, ended_at, status, results_json, excluded_from_grading')
    .eq('assessment_id', id)
  if (sessionId) query = query.eq('id', sessionId)
  const { data: sessions, error } = await query
  if (error) return NextResponse.json({ error: 'Failed to fetch reports' }, { status: 500 })

  const rawRows = (sessions ?? []) as unknown as SessionRow[]
  if (sessionId && rawRows.length === 0) return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 })
  if (sessionId && rawRows[0].status === 'in_progress') {
    return NextResponse.json({ error: 'Dieser Teilnehmer schreibt noch.' }, { status: 409 })
  }

  const scale = assessment.grading_scale as GradeBoundary[]
  const key = await fetchAnswerKey(snapshotQuestionIds(rawRows, assessment.part))
  const graded = applyGrading(rawRows, assessment.part, key, scale)

  return NextResponse.json({
    assessment: {
      title: assessment.title,
      part: assessment.part,
      accessCode: formatAccessCode(assessment.access_code),
      opensAt: assessment.opens_at,
      closesAt: assessment.closes_at,
      status: assessment.status,
      gradingScale: scale,
    },
    stillWriting: (sessions ?? []).filter((s) => s.status === 'in_progress').length,
    reports: buildStudentReports(graded, assessment.part, scale),
  })
}
