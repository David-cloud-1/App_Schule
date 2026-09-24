import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient, createServiceClient } from '@/lib/supabase-server'
import { gradeSnapshot, type GradeBoundary, type RedactedQuestion } from '@/lib/graded-assessments'
import { fetchAnswerKey } from '@/lib/answer-key'

const PART_DURATION_MINUTES: Record<number, number> = { 1: 90, 2: 90, 3: 45 }

const SubmitSchema = z.object({
  action: z.enum(['submit', 'abort', 'save']),
  answers: z.record(z.string(), z.string()).optional(),
})

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: session, error } = await supabase
    .from('exam_sessions')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (error || !session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  }

  // Calculate remaining seconds based on server start time
  const parts: number[] = session.parts_selected ?? []
  const totalMinutes = parts.reduce((sum: number, p: number) => sum + (PART_DURATION_MINUTES[p] ?? 0), 0)
  const totalSeconds = totalMinutes * 60
  const elapsedSeconds = Math.floor((Date.now() - new Date(session.started_at).getTime()) / 1000)
  const remainingSeconds = Math.max(0, totalSeconds - elapsedSeconds)

  return NextResponse.json({ ...session, remainingSeconds })
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: session } = await supabase
    .from('exam_sessions')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  if (session.status !== 'in_progress') {
    return NextResponse.json({ error: 'Session already ended' }, { status: 400 })
  }

  const body = await request.json()
  const parsed = SubmitSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const { action, answers = {} } = parsed.data
  const resultsJson = session.results_json as {
    durationMinutes?: number
    parts: Record<string, Record<string, unknown>[]>
    draft_answers?: Record<string, string>
  }

  if (session.assessment_id) {
    return handleAssessmentPatch(supabase, session, action, answers)
  }

  // Autosave: persist draft answers without ending the session or scoring
  if (action === 'save') {
    const mergedDrafts = { ...(resultsJson.draft_answers ?? {}), ...answers }
    const { error } = await supabase
      .from('exam_sessions')
      .update({ results_json: { ...resultsJson, draft_answers: mergedDrafts } })
      .eq('id', id)

    if (error) return NextResponse.json({ error: 'Failed to save answers' }, { status: 500 })
    return NextResponse.json({ success: true })
  }

  // Submit / abort: score MC questions and embed answers into results_json.
  // Submitted answers win, but fall back to any autosaved draft for robustness.
  const effectiveAnswers = { ...(resultsJson.draft_answers ?? {}), ...answers }
  const updatedParts: Record<string, unknown> = {}

  for (const [partStr, partQuestions] of Object.entries(resultsJson.parts)) {
    type ScoredQuestion = { type: string; is_correct?: boolean; [key: string]: unknown }
    const questions: ScoredQuestion[] = (partQuestions ?? []).map((q: Record<string, unknown>): ScoredQuestion => {
      const studentAnswer = effectiveAnswers[q.id as string] ?? null
      if (q.type === 'multiple_choice') {
        const correctOption = (q.answer_options as { id: string; is_correct: boolean }[] ?? []).find((o) => o.is_correct)
        const isCorrect = studentAnswer ? studentAnswer === correctOption?.id : false
        return { ...q, type: q.type as string, student_answer: studentAnswer, is_correct: isCorrect, correct_option_id: correctOption?.id }
      }
      return { ...q, type: q.type as string, student_answer: studentAnswer, self_score: null }
    })

    const mcQuestions = questions.filter((q) => q.type === 'multiple_choice')
    const mcScore = mcQuestions.length
      ? Math.round((mcQuestions.filter((q) => q.is_correct).length / mcQuestions.length) * 100)
      : 100

    updatedParts[partStr] = { questions, score: mcScore, passed: mcScore >= 50 }
  }

  const { error } = await supabase
    .from('exam_sessions')
    .update({
      status: action === 'abort' ? 'aborted' : 'completed',
      ended_at: new Date().toISOString(),
      results_json: { parts: updatedParts },
    })
    .eq('id', id)

  if (error) return NextResponse.json({ error: 'Failed to update session' }, { status: 500 })

  return NextResponse.json({ success: true })
}

// Grace period on top of the attempt's duration for network latency and the
// client's own auto-submit round trip.
const DEADLINE_GRACE_SECONDS = 60

type AssessmentResultsJson = {
  durationMinutes?: number
  parts: Record<string, RedactedQuestion[]>
  draft_answers?: Record<string, string>
  assessment?: { title: string; accessCode: string; released: boolean }
}

/**
 * Leistungsnachweis (PROJ-21). Differs from a normal exam in three ways:
 * the time limit is enforced here rather than trusted to the browser; the
 * answer key never lands in the (owner-readable) session row before
 * release — only the submitted answers do; and a submission that arrives
 * after the admin already released results is graded on the spot.
 */
async function handleAssessmentPatch(
  supabase: Awaited<ReturnType<typeof createClient>>,
  session: { id: string; started_at: string; assessment_id: string | null; results_json: unknown },
  action: 'submit' | 'abort' | 'save',
  answers: Record<string, string>,
) {
  const resultsJson = session.results_json as AssessmentResultsJson
  const durationMinutes = resultsJson.durationMinutes ?? 0
  const deadline = new Date(session.started_at).getTime() + (durationMinutes * 60 + DEADLINE_GRACE_SECONDS) * 1000
  const pastDeadline = Date.now() > deadline

  if (action === 'save') {
    if (pastDeadline) {
      return NextResponse.json({ error: 'Die Bearbeitungszeit ist abgelaufen.' }, { status: 409 })
    }
    const { error } = await supabase
      .from('exam_sessions')
      .update({ results_json: { ...resultsJson, draft_answers: { ...(resultsJson.draft_answers ?? {}), ...answers } } })
      .eq('id', session.id)
    if (error) return NextResponse.json({ error: 'Failed to save answers' }, { status: 500 })
    return NextResponse.json({ success: true })
  }

  // After the deadline only what was autosaved in time counts — answers
  // sent with a late submit are ignored.
  const submittedAnswers = pastDeadline
    ? { ...(resultsJson.draft_answers ?? {}) }
    : { ...(resultsJson.draft_answers ?? {}), ...answers }

  const service = createServiceClient()
  const { data: assessment } = await service
    .from('graded_assessments')
    .select('title, access_code, part, grading_scale, results_released_at')
    .eq('id', session.assessment_id!)
    .single()

  if (!assessment) return NextResponse.json({ error: 'Leistungsnachweis nicht gefunden.' }, { status: 404 })

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

  const { error } = await supabase
    .from('exam_sessions')
    .update({
      status: action === 'abort' ? 'aborted' : 'completed',
      ended_at: new Date().toISOString(),
      results_json: nextResults,
    })
    .eq('id', session.id)

  if (error) return NextResponse.json({ error: 'Failed to update session' }, { status: 500 })
  return NextResponse.json({ success: true })
}
