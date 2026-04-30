import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'
import { createClient } from '@/lib/supabase-server'
import { LogoutButton } from '@/components/logout-button'
import { StreakBadge } from '@/components/streak-badge'
import { SubjectProgressCard } from '@/components/subject-progress-card'
import { WeekActivityDots } from '@/components/week-activity-dots'
import { OverallStatsRow } from '@/components/overall-stats-row'
import { OnboardingCard } from '@/components/onboarding-card'
import { Button } from '@/components/ui/button'
import { getLevelFromXp, getXpWithinLevel, getXpCostOfLevel, getProgressPercent, MAX_LEVEL } from '@/lib/xp-utils'
import {
  Truck,
  Zap,
  Flame,
  Shield,
  BookOpen,
  BarChart3,
  Calculator,
  Package,
  Scale,
  User,
  Trophy,
  ClipboardList,
  CheckCircle2,
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

  // ── Level computations for hero ──────────────────────────────────────────
  const level = getLevelFromXp(totalXp)
  const levelPercent = getProgressPercent(totalXp)
  const xpToNextLevel = getXpCostOfLevel(level) - getXpWithinLevel(totalXp)

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

        {/* ── Section 1: Gamification Hero ── */}
        <div className="bg-[#1F2937] border border-[#4B5563] rounded-2xl p-5 relative overflow-hidden">
          {/* Decorative glow */}
          <div className="absolute -top-8 -right-8 w-32 h-32 bg-[#58CC02]/10 rounded-full blur-2xl pointer-events-none" />

          <div className="flex items-center gap-4 mb-5">
            {/* Level circle */}
            <div className="w-16 h-16 rounded-full bg-[#58CC02]/15 border-2 border-[#58CC02]/50 flex flex-col items-center justify-center flex-shrink-0 shadow-lg shadow-green-900/20">
              <span className="text-[9px] font-bold text-[#58CC02] uppercase tracking-widest leading-none">LVL</span>
              <span className="text-3xl font-bold text-[#58CC02] leading-none">{level}</span>
            </div>

            {/* XP + greeting */}
            <div className="flex-1 min-w-0">
              <p className="text-xs text-[#9CA3AF] mb-1">
                {hasSessions ? `Weiter so, ${displayName}!` : `Hallo, ${displayName}!`}
              </p>
              <div className="flex items-center gap-1.5">
                <Zap size={18} className="text-[#58CC02] flex-shrink-0" />
                <span className="text-2xl font-bold text-[#F9FAFB] leading-none tabular-nums">
                  {totalXp.toLocaleString('de-DE')}
                </span>
                <span className="text-sm text-[#9CA3AF] font-medium">XP</span>
              </div>
            </div>

            {/* Streak */}
            <div className="flex flex-col items-center flex-shrink-0 bg-[#111827] rounded-2xl px-3 py-2 border border-[#4B5563]">
              <Flame size={24} className={currentStreak > 0 ? 'text-[#FF9600]' : 'text-[#4B5563]'} />
              <span className="text-xl font-bold text-[#F9FAFB] leading-none tabular-nums">{currentStreak}</span>
              <span className="text-[10px] text-[#9CA3AF] mt-0.5">Streak</span>
            </div>
          </div>

          {/* XP Progress bar */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs text-[#9CA3AF]">Level {level}</span>
              <span className="text-xs font-semibold text-[#58CC02]">
                {level >= MAX_LEVEL ? '🏆 Max Level!' : `noch ${xpToNextLevel} XP → Lvl ${level + 1}`}
              </span>
            </div>
            <div className="h-4 bg-[#374151] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#58CC02] rounded-full transition-all duration-700 relative"
                style={{ width: `${levelPercent}%` }}
              >
                <div className="absolute inset-0 bg-white/10 rounded-full" />
              </div>
            </div>
          </div>
        </div>

        {/* ── Today's status banner ── */}
        <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl border transition-colors ${
          weekActivity[6].learned
            ? 'bg-[#58CC02]/10 border-[#58CC02]/30'
            : 'bg-[#1F2937] border-[#4B5563]'
        }`}>
          {weekActivity[6].learned ? (
            <>
              <div className="w-9 h-9 rounded-full bg-[#58CC02] flex items-center justify-center flex-shrink-0">
                <CheckCircle2 size={18} className="text-white" />
              </div>
              <div>
                <p className="text-sm font-bold text-[#F9FAFB]">Heute gelernt! 🎉</p>
                <p className="text-xs text-[#9CA3AF]">Dein Streak bleibt erhalten</p>
              </div>
            </>
          ) : (
            <>
              <div className="w-9 h-9 rounded-full bg-[#374151] flex items-center justify-center flex-shrink-0">
                <Flame size={18} className="text-[#FF9600]" />
              </div>
              <div>
                <p className="text-sm font-bold text-[#F9FAFB]">Heute noch nicht gelernt</p>
                <p className="text-xs text-[#9CA3AF]">Streak endet um Mitternacht</p>
              </div>
            </>
          )}
        </div>

        {/* ── CTA Button ── */}
        <Link href="/subjects" className="block mt-2">
          <Button className="w-full rounded-2xl bg-[#58CC02] hover:bg-[#4CAD02] text-white font-bold text-base py-6 transition-all duration-200 active:scale-95 shadow-lg shadow-green-900/30">
            <BookOpen className="mr-2" size={20} />
            Jetzt lernen
          </Button>
        </Link>

        {/* ── Section 2: Overall Stats (only if sessions exist) ── */}
        {hasSessions && (
          <OverallStatsRow
            totalCorrect={totalCorrect}
            totalWrong={totalWrong}
            accuracyPercent={accuracy}
          />
        )}

        {/* ── Section 3: 7-Day Activity ── */}
        <WeekActivityDots weekActivity={weekActivity} />

        {/* ── Section 4: Subject Progress ── */}
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

        <Link href="/exam" className="block mt-2">
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
