import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase-server'
import { fetchAllUserAnswers } from '@/lib/quiz-answers'
import { fetchLearnQuestions } from '@/lib/subject-questions'
import { computeWeakQuestionIds } from '@/lib/weak-questions'
import { getCurrentDepartment } from '@/lib/departments-server'
import { normalizeSubjectCode } from '@/lib/subjects'
import { buildTopicPath, matchesClassLevel, quizHref, subjectProgress } from '@/lib/learn-library'
import { getSelectedClassLevel } from '@/lib/learn-library-server'
import { ClassLevelSwitch } from '@/components/class-level-switch'
import { TopicPath } from '@/components/topic-path'
import { DepartmentIcon } from '@/components/department-icon'
import { ProgressBar } from '@/components/progress-ring'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Play, Target } from 'lucide-react'

export default async function SubjectDetailPage({ params }: { params: Promise<{ code: string }> }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { code } = await params
  const department = await getCurrentDepartment()
  if (!department) redirect('/subjects')

  // Nur Fächer des eigenen Bereichs (PROJ-23); Kürzel sind je Bereich eindeutig
  const { data: subject } = await supabase
    .from('subjects')
    .select('id, code, name, color, icon_name')
    .eq('department_id', department.id)
    .eq('code', normalizeSubjectCode(decodeURIComponent(code)))
    .maybeSingle()
  if (!subject) redirect('/subjects')

  const classLevel = await getSelectedClassLevel(department.classLevels)

  const [questions, topicsResult, { rows: answers }, lastSessionResult] = await Promise.all([
    fetchLearnQuestions(supabase, [subject.id]),
    supabase.from('topics').select('id, name').eq('subject_id', subject.id).limit(500),
    fetchAllUserAnswers(supabase, user.id),
    // Letzte Runde in diesem Fach — Grundlage für „Weiter hier“
    supabase
      .from('quiz_sessions')
      .select('id')
      .eq('user_id', user.id)
      .eq('subject_id', subject.id)
      .not('completed_at', 'is', null)
      .order('completed_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  const answeredIds = new Set(answers.map((a) => a.question_id))
  const correctIds = new Set(answers.filter((a) => a.is_correct).map((a) => a.question_id))

  // Thema der letzten Runde: nur, wenn alle ihre Fragen aus demselben Thema stammten
  let lastTopicId: string | null = null
  if (lastSessionResult.data?.id) {
    const { data: sessionAnswers } = await supabase
      .from('quiz_answers')
      .select('question_id')
      .eq('session_id', lastSessionResult.data.id)
    const topicOf = new Map(questions.map((q) => [q.id, q.topicId]))
    const sessionTopics = new Set((sessionAnswers ?? []).map((a) => topicOf.get(a.question_id as string) ?? null))
    if (sessionTopics.size === 1) lastTopicId = [...sessionTopics][0]
  }

  const groups = buildTopicPath({
    questions,
    topics: topicsResult.data ?? [],
    level: classLevel,
    answeredIds,
    correctIds,
    lastTopicId,
  })
  const rows = groups.flatMap((g) => g.topics)
  const masteredCount = rows.filter((r) => r.state === 'gemeistert').length
  const allMastered = rows.length > 0 && masteredCount === rows.length

  const progress = subjectProgress(questions, subject.id, classLevel, correctIds)
  const subjectQuestionIds = new Set(questions.map((q) => q.id))
  const weakCount = computeWeakQuestionIds(answers).filter((id) => subjectQuestionIds.has(id)).length
  const hasQuestions = questions.some((q) => matchesClassLevel(q, classLevel))

  const color = subject.color as string

  return (
    <div className="min-h-screen bg-[#111827]">
      {/* Kopf in Fachfarbe */}
      <header
        className="px-4 pt-3 pb-5"
        style={{ backgroundImage: `linear-gradient(180deg, ${color}33 0%, ${color}0D 70%, transparent 100%)` }}
      >
        <div className="max-w-md mx-auto">
          <Link
            href="/subjects"
            aria-label="Zurück zu Lernen"
            className="-ml-2 inline-flex size-11 items-center justify-center rounded-full text-[#9CA3AF] transition-colors hover:text-[#F9FAFB]"
          >
            <ArrowLeft size={22} />
          </Link>

          <div className="mt-1 flex items-center gap-3">
            <span
              className="flex size-12 shrink-0 items-center justify-center rounded-2xl"
              style={{ backgroundColor: `${color}26` }}
            >
              <DepartmentIcon name={subject.icon_name} className="size-6" style={{ color }} />
            </span>
            <div className="min-w-0">
              <h1 className="text-2xl font-bold tracking-tight text-[#F9FAFB]">{subject.code}</h1>
              <p className="text-sm leading-snug text-[#9CA3AF]">{subject.name}</p>
            </div>
          </div>

          <div className="mt-4">
            <div className="mb-1.5 flex items-baseline justify-between text-sm">
              <span className="font-semibold text-[#F9FAFB]">
                {allMastered
                  ? 'Alle Themen gemeistert 🎉'
                  : rows.length > 0
                    ? `${masteredCount} von ${rows.length} Themen gemeistert`
                    : 'Fortschritt'}
              </span>
              <span className="font-bold tabular-nums text-[#F9FAFB]">{progress.percent} %</span>
            </div>
            <div
              role="progressbar"
              aria-label={`${subject.code}: ${progress.percent} % gemeistert`}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progress.percent}
            >
              <ProgressBar percent={progress.percent} color={color} className="h-2.5" />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 pb-6 space-y-5">
        <ClassLevelSwitch current={classLevel} />

        {/* Hauptaktion + Lücken */}
        <div className="flex gap-3">
          {hasQuestions ? (
            <Button
              asChild
              className="h-auto min-h-[52px] flex-1 rounded-2xl text-base font-bold text-white shadow-lg transition-all duration-200 hover:opacity-90 active:scale-95"
              style={{ backgroundColor: color }}
            >
              <Link href={quizHref({ subjectId: subject.id, classLevel })}>
                <Play className="size-5" />
                Fach gemischt lernen
              </Link>
            </Button>
          ) : (
            <p className="flex-1 rounded-2xl border border-[#374151] px-4 py-3 text-center text-sm text-[#9CA3AF]">
              Noch keine Fragen in dieser Klassenstufe
            </p>
          )}
          {weakCount > 0 && (
            <Button
              asChild
              variant="outline"
              className="h-auto min-h-[52px] rounded-2xl border-[#FF9600]/50 bg-transparent px-4 font-bold text-[#FF9600] hover:bg-[#FF9600]/10 hover:text-[#FF9600] active:scale-95"
            >
              <Link
                href={`/quiz?subject=${subject.id}&mode=weak`}
                aria-label={`${weakCount} ${weakCount === 1 ? 'Lücke' : 'Lücken'} in ${subject.code} schließen`}
              >
                <Target className="size-5" />
                {weakCount}
              </Link>
            </Button>
          )}
        </div>

        {/* Themenpfad */}
        {rows.length > 0 ? (
          <TopicPath groups={groups} subjectId={subject.id} color={color} showGroupTitles={classLevel === null} />
        ) : (
          hasQuestions && (
            <p className="rounded-2xl border border-[#374151] bg-[#1F2937] p-4 text-center text-sm text-[#9CA3AF]">
              Für dieses Fach gibt es noch keine Themen.
            </p>
          )
        )}
      </main>
    </div>
  )
}
