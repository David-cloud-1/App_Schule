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
  const totalMinutes = parts.reduce((sum: number, p: number) => sum + (PART_DURATION_MINUTES[p] ?? 0), 0)
  const elapsedSeconds = Math.floor((Date.now() - new Date(session.started_at).getTime()) / 1000)
  const remainingSeconds = Math.max(0, totalMinutes * 60 - elapsedSeconds)

  const resultsJson = session.results_json as { parts: Record<string, { questions: ExamQuestion[] }> }
  const questions: ExamQuestion[] = Object.values(resultsJson?.parts ?? {}).flatMap((p) => p.questions ?? [])

  return (
    <ExamSessionClient
      sessionId={sessionId}
      questions={questions}
      initialRemainingSeconds={remainingSeconds}
      partsSelected={parts}
    />
  )
}
