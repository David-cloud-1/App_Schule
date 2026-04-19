import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ClipboardList } from 'lucide-react'
import { createClient } from '@/lib/supabase-server'
import { ExamResultsClient } from './exam-results-client'

export type QuestionResult = {
  id: string
  question_text: string
  type: 'multiple_choice' | 'open'
  difficulty: string
  explanation: string | null
  sample_answer: string | null
  student_answer: string | null
  is_correct?: boolean
  correct_option_id?: string
  self_score?: number | null
  answer_options?: { id: string; option_text: string; is_correct: boolean; display_order: number }[]
}

export type PartResult = {
  questions: QuestionResult[]
  score: number
  passed: boolean
}

export type ExamResultsJson = {
  parts: Record<string, PartResult>
}

export default async function ExamResultsPage({
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
  if (session.status === 'in_progress') redirect(`/exam/${sessionId}`)

  const results = session.results_json as ExamResultsJson

  return (
    <div className="min-h-screen bg-[#111827] flex flex-col">
      <header className="bg-[#1F2937] border-b border-[#4B5563] px-4 py-4 sticky top-0 z-10">
        <div className="max-w-md mx-auto flex items-center gap-3">
          <Link href="/exam-history" className="text-[#9CA3AF] hover:text-[#F9FAFB] transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <div className="flex items-center gap-2">
            <ClipboardList size={20} className="text-[#1CB0F6]" />
            <span className="font-bold text-[#F9FAFB]">Auswertung</span>
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-6 flex-1 w-full">
        <ExamResultsClient
          sessionId={sessionId}
          results={results}
          status={session.status as 'completed' | 'aborted'}
          partsSelected={session.parts_selected as number[]}
          endedAt={session.ended_at}
          startedAt={session.started_at}
        />
      </main>
    </div>
  )
}
