import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '../../../_lib/auth'
import { createServiceClient } from '@/lib/supabase-server'
import { buildParticipantRows, type SessionRow, type SnapshotQuestion } from '@/lib/graded-assessments'

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const auth = await requireAdmin()
  if (auth.error) return auth.error
  const { supabase } = auth

  const { data: assessment } = await supabase
    .from('graded_assessments')
    .select('id, part, grading_scale')
    .eq('id', id)
    .single()
  if (!assessment) return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 })

  const service = createServiceClient()
  const { data: sessions } = await service
    .from('exam_sessions')
    .select('id, participant_name, started_at, ended_at, status, results_json, excluded_from_grading')
    .eq('assessment_id', id)
    .order('started_at', { ascending: true })

  const rows = (sessions ?? []) as unknown as SessionRow[]
  const partKey = String(assessment.part)
  const participants = buildParticipantRows(rows, assessment.part, assessment.grading_scale)

  // Grade distribution + per-question aggregation, both excluding sessions
  // the admin has taken out of the wertung.
  const gradeCounts: Record<string, number> = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0, '6': 0 }
  let gradedCount = 0
  let gradeSum = 0
  let passCount = 0
  const questionAgg = new Map<string, { correctCount: number; totalCount: number; optionCounts: Map<string, number> }>()

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const participant = participants[i]
    if (row.excluded_from_grading || participant.grade == null) continue

    gradeCounts[String(participant.grade)] = (gradeCounts[String(participant.grade)] ?? 0) + 1
    gradedCount += 1
    gradeSum += participant.grade
    if (participant.grade <= 4) passCount += 1

    const questions = row.results_json?.parts?.[partKey]?.questions ?? []
    for (const q of questions) {
      if (q.type !== 'multiple_choice') continue
      if (!questionAgg.has(q.id)) questionAgg.set(q.id, { correctCount: 0, totalCount: 0, optionCounts: new Map() })
      const agg = questionAgg.get(q.id)!
      agg.totalCount += 1
      if (q.is_correct) agg.correctCount += 1
      if (q.student_answer) agg.optionCounts.set(q.student_answer, (agg.optionCounts.get(q.student_answer) ?? 0) + 1)
    }
  }

  const referenceQuestions: SnapshotQuestion[] = rows
    .map((s) => s.results_json?.parts?.[partKey]?.questions ?? [])
    .find((qs) => qs.length > 0) ?? []

  const questions = referenceQuestions
    .filter((q) => q.type === 'multiple_choice')
    .map((q) => {
      const agg = questionAgg.get(q.id)
      return {
        id: q.id,
        text: q.question_text ?? '',
        correctCount: agg?.correctCount ?? 0,
        totalCount: agg?.totalCount ?? 0,
        options: (q.answer_options ?? []).map((o) => ({
          id: o.id,
          text: o.option_text,
          isCorrect: o.is_correct,
          selectedCount: agg?.optionCounts.get(o.id) ?? 0,
        })),
      }
    })

  return NextResponse.json({
    participants,
    gradeDistribution: {
      counts: gradeCounts,
      average: gradedCount > 0 ? gradeSum / gradedCount : null,
      passRate: gradedCount > 0 ? (passCount / gradedCount) * 100 : null,
    },
    questions,
  })
}
