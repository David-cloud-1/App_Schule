import { redirect, notFound } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase-server'
import { ExamSessionClient } from './exam-session-client'
import { getCurrentExamParts } from '@/lib/departments-server'

export type ExamQuestion = {
  id: string
  question_text: string
  type: 'multiple_choice' | 'open'
  difficulty: string
  explanation: string | null
  sample_answer: string | null
  part: number
  answer_options: {
    id: string
    option_text: string
    is_correct: boolean
    display_order: number
  }[]
}

export default async function ExamSessionPage({
  params,
}: {
  params: Promise<{ sessionId: string }>
}) {
  const { sessionId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: session } = await supabase
    .from('exam_sessions')
    .select('*')
    .eq('id', sessionId)
    .eq('user_id', user.id)
    .single()

  if (!session) notFound()

  if (session.status !== 'in_progress') {
    redirect(`/exam/${sessionId}/results`)
  }

  const parts: number[] = session.parts_selected ?? []
  const storedDuration = (session.results_json as { durationMinutes?: number } | null)?.durationMinutes
  // Ältere Sitzungen ohne gespeicherte Dauer: Dauer der Teile aus dem Prüfungsaufbau
  const examParts = storedDuration == null ? await getCurrentExamParts() : []
  const totalMinutes = storedDuration ?? parts.reduce((sum: number, p: number) => sum + (examParts.find((ep) => ep.partNumber === p)?.durationMinutes ?? 0), 0)
  const elapsedSeconds = Math.floor((Date.now() - new Date(session.started_at).getTime()) / 1000)
  const remainingSeconds = Math.max(0, totalMinutes * 60 - elapsedSeconds)

  const resultsJson = session.results_json as {
    durationMinutes?: number
    parts: Record<string, ExamQuestion[]>
    draft_answers?: Record<string, string>
    // Nur gesetzt für Leistungsnachweise (PROJ-21) — vom Beitritts-Endpunkt
    // in die Session gestempelt, siehe Implementation Notes.
    assessment?: { title: string }
  }
  let questions: ExamQuestion[] = Object.values(resultsJson?.parts ?? {}).flat()
  const initialAnswers = resultsJson?.draft_answers ?? {}

  // Leistungsnachweis (PROJ-21): the stored snapshot carries `is_correct`
  // per option so submit-time grading doesn't need a second DB round trip —
  // but that must never reach the browser before the exam is over. Strip it
  // here, in the Server Component, so it never enters the RSC payload sent
  // to the client while the attempt is still in progress.
  if (session.assessment_id) {
    questions = questions.map((q) => ({
      ...q,
      // Redacted, not omitted, so the shape still matches ExamQuestion —
      // grading re-reads the real value from the DB at submit time instead
      // of trusting anything the client could have sent back.
      answer_options: q.answer_options.map((opt) => ({ ...opt, is_correct: false })),
    }))
  }

  // PROJ-30: Einstellungen und bisheriger Zählerstand. graded_assessments und
  // das Protokoll sind für Azubis per RLS nicht lesbar — nur die zwei Werte,
  // die der Runner braucht, gehen an den Browser.
  let focusTracking = false
  let focusAutoSubmitAfter: number | null = null
  let initialFocusCount = 0
  if (session.assessment_id) {
    const service = createServiceClient()
    const { data: assessment } = await service
      .from('graded_assessments')
      .select('focus_tracking, focus_auto_submit_after')
      .eq('id', session.assessment_id)
      .maybeSingle()
    focusTracking = Boolean(assessment?.focus_tracking)
    if (focusTracking) {
      focusAutoSubmitAfter = (assessment?.focus_auto_submit_after as number | null) ?? null
      const { data: summary } = await service
        .from('assessment_focus_summary')
        .select('counted_switches')
        .eq('session_id', sessionId)
        .maybeSingle()
      initialFocusCount = (summary?.counted_switches as number | undefined) ?? 0
    }
  }

  return (
    <ExamSessionClient
      sessionId={sessionId}
      questions={questions}
      initialRemainingSeconds={remainingSeconds}
      partsSelected={parts}
      initialAnswers={initialAnswers}
      assessmentTitle={resultsJson?.assessment?.title ?? null}
      focusTracking={focusTracking}
      focusAutoSubmitAfter={focusAutoSubmitAfter}
      initialFocusCount={initialFocusCount}
    />
  )
}
