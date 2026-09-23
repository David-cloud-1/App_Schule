import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { ExamSessionClient } from './exam-session-client'

const PART_DURATION_MINUTES: Record<number, number> = { 1: 90, 2: 90, 3: 45 }

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
  const totalMinutes = storedDuration ?? parts.reduce((sum: number, p: number) => sum + (PART_DURATION_MINUTES[p] ?? 0), 0)
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

  return (
    <ExamSessionClient
      sessionId={sessionId}
      questions={questions}
      initialRemainingSeconds={remainingSeconds}
      partsSelected={parts}
      initialAnswers={initialAnswers}
      assessmentTitle={resultsJson?.assessment?.title ?? null}
    />
  )
}
