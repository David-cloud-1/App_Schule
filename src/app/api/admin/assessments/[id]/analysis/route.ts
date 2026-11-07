import { NextRequest, NextResponse } from 'next/server'
import { requireTeacherOrAdmin } from '../../../_lib/auth'
import { createServiceClient } from '@/lib/supabase-server'
import {
  applyGrading,
  snapshotQuestionIds,
  type GradeBoundary,
  type SessionRow,
} from '@/lib/graded-assessments'
import { fetchAnswerKey } from '@/lib/answer-key'
import { analyzeAssessment } from '@/lib/assessment-analysis'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Aufgabenanalyse eines Nachweises (PROJ-75): Lösungsquote, Trennschärfe,
 * Antwortverteilung und Ampel je Frage. Der Zugriff auf den Nachweis folgt
 * dem Zeilenschutz von graded_assessments (wer ihn nicht sieht, bekommt 404);
 * Antworten und Klarnamen werden erst danach mit dem Dienst-Client gelesen.
 */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!UUID_RE.test(id)) return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 })

  const auth = await requireTeacherOrAdmin()
  if (auth.error) return auth.error
  const { supabase } = auth

  const { data: assessment } = await supabase
    .from('graded_assessments')
    .select('id, part, grading_scale, status, results_released_at, excluded_question_ids')
    .eq('id', id)
    .single()
  if (!assessment) return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 })

  const excludedIds = (assessment.excluded_question_ids as string[] | null) ?? []

  const service = createServiceClient()
  const { data: sessions } = await service
    .from('exam_sessions')
    .select('id, user_id, participant_name, started_at, ended_at, status, results_json, excluded_from_grading')
    .eq('assessment_id', id)
    .order('started_at', { ascending: true })

  const rawRows = (sessions ?? []) as unknown as SessionRow[]
  const key = await fetchAnswerKey(snapshotQuestionIds(rawRows, assessment.part))
  const rows = applyGrading(rawRows, assessment.part, key, assessment.grading_scale as GradeBoundary[], excludedIds)
  const analysis = analyzeAssessment(rows, assessment.part)

  // Welche Fragen sind schon für künftige Nachweise gesperrt?
  const ids = analysis.items.map((i) => i.id)
  const blocked = new Set<string>()
  if (ids.length > 0) {
    const { data } = await supabase
      .from('questions')
      .select('id, blocked_for_assessments')
      .in('id', ids)
      .eq('blocked_for_assessments', true)
      .limit(500)
    for (const row of data ?? []) blocked.add(row.id as string)
  }

  return NextResponse.json({
    ...analysis,
    items: analysis.items.map((i) => ({ ...i, blocked: blocked.has(i.id) })),
    status: assessment.status,
    released: !!assessment.results_released_at,
  })
}
