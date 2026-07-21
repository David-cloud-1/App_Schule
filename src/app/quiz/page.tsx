import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowLeft, CheckCircle2, Truck, Target } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase-server'
import { fetchAllUserAnswers } from '@/lib/quiz-answers'
import { QuizClient, type QuizQuestion } from './quiz-client'

const QUIZ_SIZE = 10
const WEAK_MIN_ATTEMPTS = 1
const WEAK_ERROR_THRESHOLD = 0.5

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

type RawQuestion = {
  id: string
  question_text: string
  explanation: string | null
  difficulty: string
  answer_options: { id: string; option_text: string; is_correct: boolean; display_order: number }[]
}

export default async function QuizPage({
  searchParams,
}: {
  searchParams: Promise<{ subject?: string; class_level?: string; topic?: string; mode?: string }>
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { subject: subjectId, class_level, topic, mode } = await searchParams
  const isWeakMode = mode === 'weak'
  const classLevel = ['10', '11', '12'].includes(class_level ?? '') ? Number(class_level) : null
  const topicId = topic && UUID_RE.test(topic) ? topic : null

  // ── Resolve subject ───────────────────────────────────────────────────────
  let subject: { id: string; code: string; name: string; color: string } | null = null

  if (subjectId) {
    const { data: subjectData } = await supabase
      .from('subjects')
      .select('id, code, name, color')
      .eq('id', subjectId)
      .single()

    if (!subjectData) redirect('/subjects')
    subject = subjectData
  }

  // ── Build question pool ───────────────────────────────────────────────────
  const selectCols = subjectId
    ? 'id, question_text, explanation, difficulty, answer_options (id, option_text, is_correct, display_order), question_subjects!inner(subject_id)'
    : 'id, question_text, explanation, difficulty, answer_options (id, option_text, is_correct, display_order)'

  let rawQuestions: RawQuestion[] | null = null
  let fetchError: unknown = null

  if (isWeakMode) {
    // ── Weak mode: aggregate personal error rates ─────────────────────────
    const { rows: answers } = await fetchAllUserAnswers(supabase, user.id)

    const stats = new Map<string, { total: number; wrong: number }>()
    for (const { question_id, is_correct } of answers) {
      const s = stats.get(question_id) ?? { total: 0, wrong: 0 }
      s.total++
      if (!is_correct) s.wrong++
      stats.set(question_id, s)
    }

    const weakIds = [...stats.entries()]
      .filter(([, { total, wrong }]) => total >= WEAK_MIN_ATTEMPTS && wrong / total > WEAK_ERROR_THRESHOLD)
      .sort(([, a], [, b]) => b.wrong / b.total - a.wrong / a.total)
      .map(([id]) => id)
      .slice(0, 50)

    if (weakIds.length === 0) {
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
            <Target size={64} className="text-[#58CC02] mb-6" />
            <h1 className="text-2xl font-bold text-[#F9FAFB] mb-3">
              Noch keine Lücken!
            </h1>
            <p className="text-[#9CA3AF] mb-8 leading-relaxed">
              {subject
                ? `Im Fach „${subject.code}" hast du noch keine Fragen oft genug falsch beantwortet.`
                : 'Du hast noch keine Fragen oft genug falsch beantwortet.'}{' '}
              Mach weiter so — Lücken entstehen nach mindestens 3 Versuchen mit über 50% Fehlerquote.
            </p>
            <div className="flex flex-col gap-3 w-full max-w-xs">
              <Link href="/subjects">
                <Button className="w-full rounded-2xl bg-[#58CC02] hover:bg-[#4CAD02] text-white font-bold px-8 py-5 transition-all duration-200 active:scale-95">
                  Fach wählen
                </Button>
              </Link>
              <Link href="/exam">
                <Button variant="outline" className="w-full rounded-2xl border-[#4B5563] text-[#9CA3AF] hover:text-[#F9FAFB] hover:bg-[#374151] font-semibold px-8 py-5 transition-all duration-200">
                  Prüfungssimulation starten
                </Button>
              </Link>
            </div>
          </main>
        </div>
      )
    }

    let weakQuery = supabase
      .from('questions')
      .select(selectCols)
      .eq('is_active', true)
      .in('id', weakIds)

    if (subjectId) {
      weakQuery = weakQuery.eq('question_subjects.subject_id', subjectId)
    }
    if (classLevel) {
      weakQuery = weakQuery.or(`class_level.eq.${classLevel},class_level.is.null`)
    }
    if (topicId) {
      weakQuery = weakQuery.eq('topic_id', topicId)
    }

    const { data, error } = await weakQuery
    rawQuestions = data as unknown as RawQuestion[]
    fetchError = error
  } else {
    // ── Normal mode: exclude already-answered questions today ──────────────
    const todayUtc = new Date()
    todayUtc.setUTCHours(0, 0, 0, 0)

    const { data: todayRows } = await supabase
      .from('quiz_answers')
      .select('question_id')
      .eq('user_id', user.id)
      .gte('answered_at', todayUtc.toISOString())

    const answeredTodayIds = [...new Set((todayRows ?? []).map((r) => r.question_id))]

    let query = supabase
      .from('questions')
      .select(selectCols)
      .eq('is_active', true)

    if (subjectId) {
      query = query.eq('question_subjects.subject_id', subjectId)
    }
    if (classLevel) {
      query = query.or(`class_level.eq.${classLevel},class_level.is.null`)
    }
    if (topicId) {
      query = query.eq('topic_id', topicId)
    }
    if (answeredTodayIds.length > 0) {
      query = query.not('id', 'in', `(${answeredTodayIds.join(',')})`)
    }

    const { data, error } = await query
    rawQuestions = data as unknown as RawQuestion[]
    fetchError = error
  }

  if (fetchError) {
    console.error('[QuizPage] fetch questions:', fetchError)
    redirect('/subjects')
  }

  // ── Empty state ───────────────────────────────────────────────────────────
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
          <div className="flex flex-col gap-3 w-full max-w-xs">
            <Link href="/subjects">
              <Button className="w-full rounded-2xl bg-[#58CC02] hover:bg-[#4CAD02] text-white font-bold px-8 py-5 transition-all duration-200 active:scale-95">
                Anderes Fach wählen
              </Button>
            </Link>
            <Link href="/exam">
              <Button variant="outline" className="w-full rounded-2xl border-[#4B5563] text-[#9CA3AF] hover:text-[#F9FAFB] hover:bg-[#374151] font-semibold px-8 py-5 transition-all duration-200">
                Prüfungssimulation starten
              </Button>
            </Link>
            <Link href="/leaderboard">
              <Button variant="outline" className="w-full rounded-2xl border-[#4B5563] text-[#9CA3AF] hover:text-[#F9FAFB] hover:bg-[#374151] font-semibold px-8 py-5 transition-all duration-200">
                Rangliste ansehen
              </Button>
            </Link>
          </div>
        </main>
      </div>
    )
  }

  const totalAvailable = rawQuestions.length

  // ── Shuffle + limit ───────────────────────────────────────────────────────
  const questions: QuizQuestion[] = shuffle(rawQuestions)
    .slice(0, QUIZ_SIZE)
    .map((q) => ({
      id: q.id,
      question_text: q.question_text,
      explanation: q.explanation,
      difficulty: q.difficulty,
      answer_options: shuffle(q.answer_options ?? []),
    }))

  const weakSubjectFallback = {
    id: 'weak',
    code: 'Lücken',
    name: 'Lücken schließen',
    color: '#FF9600',
  }

  const mixedFallback = {
    id: 'mixed',
    code: 'Gemischt',
    name: 'Gemischtes Lernen',
    color: '#58CC02',
  }

  return (
    <QuizClient
      questions={questions}
      subject={subject ?? (isWeakMode ? weakSubjectFallback : mixedFallback)}
      subjectId={subjectId ?? null}
      totalAvailable={totalAvailable}
    />
  )
}
