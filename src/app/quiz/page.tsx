import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowLeft, CheckCircle2, Truck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase-server'
import { QuizClient, type QuizQuestion } from './quiz-client'

const QUIZ_SIZE = 10

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export default async function QuizPage({
  searchParams,
}: {
  searchParams: Promise<{ subject?: string }>
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { subject: subjectId } = await searchParams

  // ── Resolve subject + eligible question IDs ─────────────────────────────
  let subject: { id: string; code: string; name: string; color: string } | null = null
  let subjectQuestionIds: string[] | null = null

  if (subjectId) {
    const { data: subjectData } = await supabase
      .from('subjects')
      .select('id, code, name, color')
      .eq('id', subjectId)
      .single()

    if (!subjectData) redirect('/subjects')

    subject = subjectData

    const { data: links } = await supabase
      .from('question_subjects')
      .select('question_id')
      .eq('subject_id', subjectId)

    subjectQuestionIds = (links ?? []).map((l) => l.question_id)
    if (subjectQuestionIds.length === 0) redirect('/subjects')
  }

  // ── Fetch today's already-answered question IDs ──────────────────────────
  const todayUtc = new Date()
  todayUtc.setUTCHours(0, 0, 0, 0)

  const { data: todayRows } = await supabase
    .from('quiz_answers')
    .select('question_id')
    .eq('user_id', user.id)
    .gte('answered_at', todayUtc.toISOString())

  const answeredTodayIds = [...new Set((todayRows ?? []).map((r) => r.question_id))]

  // ── Fetch unanswered active questions ────────────────────────────────────
  type RawQuestion = {
    id: string
    question_text: string
    explanation: string | null
    difficulty: string
    answer_options: { id: string; option_text: string; is_correct: boolean; display_order: number }[]
  }

  let query = supabase
    .from('questions')
    .select(
      'id, question_text, explanation, difficulty, answer_options (id, option_text, is_correct, display_order)',
    )
    .eq('is_active', true)

  if (subjectQuestionIds) {
    query = query.in('id', subjectQuestionIds)
  }
  if (answeredTodayIds.length > 0) {
    query = query.not('id', 'in', `(${answeredTodayIds.join(',')})`)
  }

  const { data: rawQuestions, error } = await query

  if (error) {
    console.error('[QuizPage] fetch questions:', error)
    redirect('/subjects')
  }

  // ── All questions for today already answered ─────────────────────────────
  if (!rawQuestions || rawQuestions.length === 0) {
    return (
      <div className="min-h-screen bg-[#111827] flex flex-col">
        <header className="bg-[#1F2937] border-b border-[#4B5563] px-4 py-4">
          <div className="max-w-md mx-auto flex items-center gap-2">
            <Link href="/subjects" className="text-[#9CA3AF] hover:text-[#F9FAFB] transition-colors">
              <ArrowLeft size={20} />
            </Link>
            <Truck className="w-5 h-5 text-[#58CC02]" />
            <span className="font-bold text-[#F9FAFB]">SpediLern</span>
          </div>
        </header>
        <main className="max-w-md mx-auto px-4 py-16 flex-1 flex flex-col items-center justify-center text-center">
          <CheckCircle2 size={64} className="text-[#58CC02] mb-6" />
          <h1 className="text-2xl font-bold text-[#F9FAFB] mb-3">
            Alle Fragen für heute erledigt!
          </h1>
          <p className="text-[#9CA3AF] mb-8 leading-relaxed">
            {subject
              ? `Du hast heute alle Fragen im Fach „${subject.code}" beantwortet.`
              : 'Du hast heute alle verfügbaren Fragen beantwortet.'}{' '}
            Komm morgen wieder!
          </p>
          <Link href="/subjects">
            <Button className="rounded-2xl bg-[#58CC02] hover:bg-[#4CAD02] text-white font-bold px-8 py-5 transition-all duration-200 active:scale-95">
              Anderes Fach wählen
            </Button>
          </Link>
        </main>
      </div>
    )
  }

  const totalAvailable = rawQuestions.length

  // ── Shuffle + limit ──────────────────────────────────────────────────────
  const questions: QuizQuestion[] = shuffle(rawQuestions as RawQuestion[])
    .slice(0, QUIZ_SIZE)
    .map((q) => ({
      id: q.id,
      question_text: q.question_text,
      explanation: q.explanation,
      difficulty: q.difficulty,
      answer_options: shuffle(q.answer_options ?? []),
    }))

  return (
    <QuizClient
      questions={questions}
      subject={
        subject ?? {
          id: 'mixed',
          code: 'Gemischt',
          name: 'Gemischtes Lernen',
          color: '#58CC02',
        }
      }
      subjectId={subjectId ?? null}
      totalAvailable={totalAvailable}
    />
  )
}
