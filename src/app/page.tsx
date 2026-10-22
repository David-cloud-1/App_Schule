import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase-server'
import { getCurrentDepartment } from '@/lib/departments-server'
import { NO_DEPARTMENT_ID } from '@/lib/departments'
import { fetchAllUserAnswers } from '@/lib/quiz-answers'
import { fetchActiveQuestionSubjects, groupQuestionIdsBySubject } from '@/lib/subject-questions'
import { computeWeakQuestionIds } from '@/lib/weak-questions'
import { PlayerMenu } from '@/components/player-menu'
import { OnboardingCard } from '@/components/onboarding-card'
import { CoinBalance } from '@/components/coin-balance'
import { BlitzRoundTile } from '@/components/blitz-round-card'
import { StarterCoinsBanner } from '@/components/starter-coins-banner'
import { TodayWeekDots } from '@/components/today-week-dots'
import { TodayHeroCard } from '@/components/today-hero-card'
import { SubjectRings, type SubjectRing } from '@/components/subject-rings'
import { getLevelFromXp, getXpWithinLevel, getXpCostOfLevel, getProgressPercent, MAX_LEVEL } from '@/lib/xp-utils'
import {
  buildCurrentWeek,
  continueHref,
  countAnsweredToday,
  pickContinueTarget,
  toBerlinDateStr,
} from '@/lib/home-today'
import { cn } from '@/lib/utils'
import { Zap, Flame, Target } from 'lucide-react'

export default async function HomePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const department = await getCurrentDepartment()

  const now = new Date()
  const today = toBerlinDateStr(now)
  const week = buildCurrentWeek(now, new Set())
  const weekStart = week[0].dateStr

  // ── Parallel data fetching ────────────────────────────────────────────────
  const [profileResult, subjectsResult, questionSubjects, { rows: answers }, sessionsResult, blitzResult, lastSessionResult] =
    await Promise.all([
      supabase
        .from('profiles')
        .select('display_name, role, total_xp, current_streak')
        .eq('id', user.id)
        .single(),

      // Nur Fächer des eigenen Bereichs (PROJ-23)
      supabase.from('subjects').select('id, code, name, color, icon_name').eq('department_id', department?.id ?? NO_DEPARTMENT_ID).order('code'),

      fetchActiveQuestionSubjects(supabase),

      fetchAllUserAnswers(supabase, user.id),

      // Lerntage der laufenden Woche (ein Tag Puffer wegen der Zeitzone)
      supabase
        .from('quiz_sessions')
        .select('completed_at')
        .eq('user_id', user.id)
        .gte('completed_at', new Date(Date.parse(`${weekStart}T00:00:00Z`) - 86_400_000).toISOString()),

      supabase
        .from('blitz_rounds')
        .select('calendar_day, correct_count')
        .eq('user_id', user.id)
        .gte('calendar_day', weekStart),

      // Letzte Runde mit Fach — Ziel für „Weiterlernen“
      supabase
        .from('quiz_sessions')
        .select('id, subject_id')
        .eq('user_id', user.id)
        .not('subject_id', 'is', null)
        .order('completed_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ])

  // ── Profile ───────────────────────────────────────────────────────────────
  const profile = profileResult.data
  const totalXp = (profile?.total_xp as number) ?? 0
  const currentStreak = (profile?.current_streak as number) ?? 0
  const displayName = profile?.display_name ?? user.email?.split('@')[0] ?? 'Lernender'
  const isAdmin = profile?.role === 'admin' || profile?.role === 'department_admin'
  const hasSessions = answers.length > 0

  const level = getLevelFromXp(totalXp)
  const levelPercent = getProgressPercent(totalXp)
  const xpToNextLevel = getXpCostOfLevel(level) - getXpWithinLevel(totalXp)

  // ── Woche & Tagesziel ─────────────────────────────────────────────────────
  const blitzRows = (blitzResult.data ?? []) as { calendar_day: string; correct_count: number }[]
  const learnedDates = new Set([
    ...(sessionsResult.data ?? []).map((s) => toBerlinDateStr(new Date(s.completed_at as string))),
    ...blitzRows.map((r) => r.calendar_day),
  ])
  const weekDays = buildCurrentWeek(now, learnedDates)
  const learnedToday = learnedDates.has(today)
  // Die Blitzrunde speichert keine Einzelantworten — sie zählt mit ihren richtigen
  const blitzToday = blitzRows.find((r) => r.calendar_day === today)?.correct_count ?? 0
  const answeredToday = countAnsweredToday(answers, now) + blitzToday

  // ── Fächer ────────────────────────────────────────────────────────────────
  const subjectRows = subjectsResult.data ?? []
  const activeIdsBySubject = groupQuestionIdsBySubject(questionSubjects)
  const correctIds = new Set(answers.filter((a) => a.is_correct).map((a) => a.question_id))

  const rings: SubjectRing[] = subjectRows.map((s) => {
    const activeIds = activeIdsBySubject.get(s.id) ?? []
    const correct = activeIds.filter((id) => correctIds.has(id)).length
    return {
      id: s.id,
      code: s.code,
      name: s.name,
      color: s.color,
      iconName: s.icon_name as string | null,
      correctPercent: activeIds.length > 0 ? Math.round((correct / activeIds.length) * 100) : 0,
      hasQuestions: activeIds.length > 0,
    }
  })

  const weakCount = computeWeakQuestionIds(answers).length

  // ── Weiterlernen ──────────────────────────────────────────────────────────
  let continueTarget: { href: string; label: string } | null = null
  const lastSession = lastSessionResult.data as { id: string; subject_id: string | null } | null
  if (lastSession?.subject_id) {
    const { data: sessionAnswers } = await supabase
      .from('quiz_answers')
      .select('questions(topic_id)')
      .eq('session_id', lastSession.id)
    const topicIds = ((sessionAnswers ?? []) as unknown as { questions: { topic_id: string | null } | null }[]).map(
      (r) => r.questions?.topic_id ?? null,
    )
    const target = pickContinueTarget(lastSession.subject_id, topicIds, subjectRows)

    if (target) {
      // Gibt es heute noch unbeantwortete Fragen? (Das Quiz blendet ab UTC-Mitternacht aus.)
      const todayUtc = new Date(now)
      todayUtc.setUTCHours(0, 0, 0, 0)
      const answeredTodayIds = new Set(
        answers.filter((a) => new Date(a.answered_at) >= todayUtc).map((a) => a.question_id),
      )
      let pool = activeIdsBySubject.get(target.subjectId) ?? []
      let label = subjectRows.find((s) => s.id === target.subjectId)?.name ?? ''

      if (target.topicId) {
        const [{ data: topicQuestions }, { data: topic }] = await Promise.all([
          supabase.from('questions').select('id').eq('topic_id', target.topicId).eq('is_active', true),
          supabase.from('topics').select('name').eq('id', target.topicId).maybeSingle(),
        ])
        const inTopic = new Set((topicQuestions ?? []).map((q) => q.id as string))
        pool = pool.filter((id) => inTopic.has(id))
        label = (topic?.name as string | undefined) ?? label
      }

      if (pool.some((id) => !answeredTodayIds.has(id))) {
        continueTarget = { href: continueHref(target), label: `${target.subjectCode} · ${label}` }
      }
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#111827]">
      {/* Statusleiste */}
      <header className="sticky top-0 z-10 bg-[#111827]/90 backdrop-blur px-4 py-2">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className="flex items-center gap-1 rounded-full bg-[#1F2937] px-3 py-1.5"
              aria-label={`Streak: ${currentStreak} Tage`}
            >
              <Flame size={14} className={currentStreak > 0 ? 'text-[#FF9600]' : 'text-[#4B5563]'} />
              <span className="text-xs font-bold text-[#F9FAFB] tabular-nums">{currentStreak}</span>
            </span>
            <span className="flex items-center gap-1 rounded-full bg-[#1F2937] px-3 py-1.5" aria-label={`${totalXp} XP`}>
              <Zap size={14} className="text-[#58CC02]" />
              <span className="text-xs font-bold text-[#F9FAFB] tabular-nums">{totalXp.toLocaleString('de-DE')}</span>
            </span>
            <CoinBalance variant="pill" className="bg-[#1F2937] border-transparent" />
          </div>
          <PlayerMenu displayName={displayName} isAdmin={isAdmin} />
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 pt-3 pb-6 space-y-6">
        {/* Begrüßung & Woche */}
        <section className="space-y-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#F9FAFB] truncate">Hallo, {displayName} 👋</h1>
            {!learnedToday && currentStreak > 0 && (
              <p className="mt-1 text-sm text-[#FF9600]">
                Lerne heute, um deine {currentStreak}-Tage-Streak zu halten
              </p>
            )}
          </div>
          <TodayWeekDots days={weekDays} />
        </section>

        {/* Onboarding card — only for new users */}
        {!hasSessions && <OnboardingCard displayName={displayName} />}

        {/* Starter-coins hint (PROJ-19) — shown once per account */}
        <StarterCoinsBanner />

        <TodayHeroCard
          answeredToday={answeredToday}
          level={level}
          levelPercent={levelPercent}
          xpToNextLevel={xpToNextLevel}
          isMaxLevel={level >= MAX_LEVEL}
          continueTarget={continueTarget}
        />

        {/* Nebenaktionen */}
        <div className="grid grid-cols-2 gap-3">
          <BlitzRoundTile />
          {weakCount > 0 ? (
            <Link
              href="/quiz?mode=weak"
              className="flex min-h-[68px] items-center gap-3 rounded-2xl border border-[#FF9600]/40 bg-[#FF9600]/10 px-3 py-3 transition-all duration-200 hover:bg-[#FF9600]/15 active:scale-95"
            >
              <GapsContent weakCount={weakCount} />
            </Link>
          ) : (
            <div
              aria-disabled
              className="flex min-h-[68px] items-center gap-3 rounded-2xl border border-[#374151] bg-[#1F2937]/50 px-3 py-3 opacity-70"
            >
              <GapsContent weakCount={0} />
            </div>
          )}
        </div>

        {/* Fächer */}
        {rings.length > 0 && (
          <section>
            <div className="mb-3 flex items-baseline justify-between">
              <h2 className="text-base font-bold text-[#F9FAFB]">Deine Fächer</h2>
              <Link href="/subjects" className="text-xs font-semibold text-[#1CB0F6]">
                Alle anzeigen
              </Link>
            </div>
            <SubjectRings subjects={rings} />
          </section>
        )}
      </main>
    </div>
  )
}

function GapsContent({ weakCount }: { weakCount: number }) {
  const active = weakCount > 0
  return (
    <>
      <span
        className={cn(
          'flex size-10 shrink-0 items-center justify-center rounded-full',
          active ? 'bg-[#FF9600]/20' : 'bg-[#374151]',
        )}
      >
        <Target className={cn('size-5', active ? 'text-[#FF9600]' : 'text-[#6B7280]')} />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-bold text-[#F9FAFB] truncate">Lücken</span>
        <span className="block truncate text-xs text-[#9CA3AF]">
          {active ? `${weakCount} offen` : 'Keine Lücken 💪'}
        </span>
      </span>
    </>
  )
}
