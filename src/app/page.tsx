import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'
import { createClient } from '@/lib/supabase-server'
import { LogoutButton } from '@/components/logout-button'
import { XpLevelBadge } from '@/components/xp-level-badge'
import { XpProgressBar } from '@/components/xp-progress-bar'
import { StreakBadge } from '@/components/streak-badge'
import { SubjectProgressCard } from '@/components/subject-progress-card'
import { WeekActivityDots } from '@/components/week-activity-dots'
import { OverallStatsRow } from '@/components/overall-stats-row'
import { OnboardingCard } from '@/components/onboarding-card'
import { Button } from '@/components/ui/button'
import {
  Truck,
  Zap,
  Shield,
  BookOpen,
  BarChart3,
  Calculator,
  Package,
  Scale,
  User,
  Trophy,
  ClipboardList,
} from 'lucide-react'

// Static subject metadata (icon per IHK code)
const SUBJECT_META: Record<string, { icon: LucideIcon }> = {
  BGP: { icon: BarChart3 },
  KSK: { icon: Calculator },
  STG: { icon: Truck },
  LOP: { icon: Package },
  PUG: { icon: Scale },
}

/** Format a Date as YYYY-MM-DD in Europe/Berlin timezone */
function toBerlinDateStr(date: Date): string {
  return new Intl.DateTimeFormat('sv', { timeZone: 'Europe/Berlin' }).format(date)
}

export default async function HomePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Date range for 7-day activity window
  const now = new Date()
  const sixDaysAgo = new Date(now)
  sixDaysAgo.setDate(sixDaysAgo.getDate() - 6)
  sixDaysAgo.setHours(0, 0, 0, 0)

  // ── Parallel data fetching ────────────────────────────────────────────────
  const [profileResult, subjectsResult, answersResult, sessionsResult] = await Promise.all([
    supabase
      .from('profiles')
      .select('display_name, role, total_xp, current_streak')
      .eq('id', user.id)
      .single(),

    supabase
      .from('subjects')
      .select(`
        id, code, name, color,
        question_subjects(
          question_id,
          questions!inner(is_active)
        )
      `)
      .order('code'),

    supabase
      .from('quiz_answers')
      .select('question_id, is_correct')
      .eq('user_id', user.id),

    supabase
      .from('quiz_sessions')
      .select('completed_at')
      .eq('user_id', user.id)
      .gte('completed_at', sixDaysAgo.toISOString()),
  ])

  // ── Extract profile data ──────────────────────────────────────────────────
  const profile = profileResult.data
  const totalXp = (profile?.total_xp as number) ?? 0
  const currentStreak = (profile?.current_streak as number) ?? 0
  const displayName = profile?.display_name ?? user.email?.split('@')[0] ?? 'Lernender'
  const isAdmin = profile?.role === 'admin'

  // ── Aggregate answer data ─────────────────────────────────────────────────
  const answers = answersResult.data ?? []
  const seenQuestionIds = new Set(answers.map((a) => a.question_id))
  const correctQuestionIds = new Set(
    answers.filter((a) => a.is_correct).map((a) => a.question_id),
  )

  const totalAnswered = answers.length
  const totalCorrect = answers.filter((a) => a.is_correct).length
  const totalWrong = totalAnswered - totalCorrect
  const accuracy = totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0

  const hasSessions = totalAnswered > 0

  // ── Per-subject progress ─────────────────────────────────────────────────
  type RawSubject = {
    id: string
    code: string
    name: string
    color: string
    question_subjects: { question_id: string; questions: { is_active: boolean } }[]
  }

  const subjects = (subjectsResult.data ?? []).map((s) => {
    const raw = s as unknown as RawSubject
    const activeIds = raw.question_subjects
      .filter((qs) => qs.questions?.is_active === true)
      .map((qs) => qs.question_id)

    const total = activeIds.length
    const seenCount = activeIds.filter((id) => seenQuestionIds.has(id)).length
    const correctCount = activeIds.filter((id) => correctQuestionIds.has(id)).length

    return {
      id: raw.id,
      code: raw.code,
      name: raw.name,
      color: raw.color,
      totalQuestions: total,
      seenCount,
      correctCount,
      seenPercent: total > 0 ? Math.round((seenCount / total) * 100) : 0,
      correctPercent: total > 0 ? Math.round((correctCount / total) * 100) : 0,
    }
  })

  // ── 7-day activity dots ──────────────────────────────────────────────────
  const recentSessions = sessionsResult.data ?? []
  const sessionDates = new Set(
    recentSessions.map((s) => toBerlinDateStr(new Date(s.completed_at))),
  )

  const weekActivity = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now)
    d.setDate(d.getDate() - (6 - i))
    const dateStr = toBerlinDateStr(d)
    return {
      date: d,
      dateStr,
      learned: sessionDates.has(dateStr),
      isToday: i === 6,
    }
  })

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#111827]">
      {/* Header */}
      <header className="bg-[#1F2937] border-b border-[#4B5563] px-4 py-4 sticky top-0 z-10">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Truck className="w-5 h-5 text-[#58CC02]" />
            <span className="font-bold text-[#F9FAFB]">SpediLern</span>
          </div>
          <div className="flex items-center gap-2">
            {/* XP pill */}
            <div className="flex items-center gap-1 bg-[#111827] rounded-full px-3 py-1.5 border border-[#4B5563]">
              <Zap size={13} className="text-[#58CC02]" />
              <span className="text-xs font-bold text-[#F9FAFB]">
                {totalXp.toLocaleString('de-DE')} XP
              </span>
            </div>
            {/* Streak pill */}
            <StreakBadge streak={currentStreak} variant="pill" />
            {/* Leaderboard link */}
            <Link
              href="/leaderboard"
              className="flex items-center justify-center w-7 h-7 rounded-full bg-[#374151] hover:bg-[#4B5563] transition-colors text-[#FFD700] hover:text-[#FFD700]/80"
              aria-label="Rangliste"
            >
              <Trophy className="w-4 h-4" />
            </Link>
            {/* Profile link */}
            <Link
              href="/profile"
              className="flex items-center justify-center w-7 h-7 rounded-full bg-[#374151] hover:bg-[#4B5563] transition-colors text-[#9CA3AF] hover:text-[#F9FAFB]"
              aria-label="Profil"
            >
              <User className="w-4 h-4" />
            </Link>
            {isAdmin && (
              <Link
                href="/admin"
                className="flex items-center gap-1 text-xs bg-[#374151] hover:bg-[#4B5563] rounded-lg px-3 py-1.5 transition-colors text-[#9CA3AF]"
              >
                <Shield className="w-3.5 h-3.5" />
                Admin
              </Link>
            )}
            <LogoutButton />
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-md mx-auto px-4 py-6 space-y-4 pb-8">
        {/* Onboarding card — only for new users */}
        {!hasSessions && <OnboardingCard displayName={displayName} />}

        {/* ── Section 1: Gamification Header ── */}
        <div className="bg-[#1F2937] border border-[#4B5563] rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs text-[#9CA3AF] mb-1">
                {hasSessions ? `Weiter so, ${displayName}!` : `Hallo, ${displayName}!`}
              </p>
              <div className="flex items-center gap-2">
                <XpLevelBadge totalXp={totalXp} />
                <span className="text-sm font-semibold text-[#F9FAFB]">
                  {totalXp.toLocaleString('de-DE')} XP gesamt
                </span>
              </div>
            </div>
            <StreakBadge streak={currentStreak} variant="card" />
          </div>
          <XpProgressBar totalXp={totalXp} />
        </div>

        {/* ── Section 2: Subject Progress ── */}
        <div>
          <h2 className="text-xs font-semibold text-[#9CA3AF] uppercase tracking-wide mb-3">
            Fach-Fortschritt
          </h2>
          <div className="space-y-3">
            {subjects.map((subject) => (
              <SubjectProgressCard
                key={subject.id}
                icon={SUBJECT_META[subject.code]?.icon ?? Package}
                {...subject}
              />
            ))}
          </div>
        </div>

        {/* ── Section 3: 7-Day Activity ── */}
        <WeekActivityDots weekActivity={weekActivity} />

        {/* ── Section 4: Overall Stats (only if sessions exist) ── */}
        {hasSessions && (
          <OverallStatsRow
            totalCorrect={totalCorrect}
            totalWrong={totalWrong}
            accuracyPercent={accuracy}
          />
        )}

        {/* ── CTA Buttons ── */}
        <Link href="/subjects">
          <Button className="w-full rounded-2xl bg-[#58CC02] hover:bg-[#4CAD02] text-white font-bold text-base py-6 transition-all duration-200 active:scale-95 shadow-lg shadow-green-900/30">
            <BookOpen className="mr-2" size={20} />
            Jetzt lernen
          </Button>
        </Link>

        <Link href="/exam">
          <Button variant="outline" className="w-full rounded-2xl border-[#1CB0F6]/50 text-[#1CB0F6] hover:bg-[#1CB0F6]/10 font-bold text-base py-6 transition-all duration-200 active:scale-95">
            <ClipboardList className="mr-2" size={20} />
            Prüfungssimulation
          </Button>
        </Link>

        <p className="text-center text-[#6B7280] text-xs">
          <Link href="/exam-history" className="text-[#9CA3AF] underline underline-offset-2">
            Prüfungsverlauf
          </Link>
        </p>
      </main>
    </div>
  )
}
