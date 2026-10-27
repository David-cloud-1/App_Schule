import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ChevronRight, IdCard, User } from 'lucide-react'
import { createClient, createServiceClient } from '@/lib/supabase-server'
import { XpLevelBadge } from '@/components/xp-level-badge'
import { StreakBadge } from '@/components/streak-badge'
import { XpProgressBar } from '@/components/xp-progress-bar'
import { BadgeGallery, type UnlockedBadge } from '@/components/badge-gallery'
import { fetchBadgeDefinitions, toBadgeDisplay, type BadgeDisplay } from '@/lib/badges'
import { BetriebVorschau } from '@/components/betrieb-vorschau'
import { LeaderboardOptOutToggle } from '@/components/leaderboard-opt-out-toggle'
import { PseudonymSettings } from '@/components/pseudonym-settings'
import { isTeacherRole } from '@/lib/roles'
import { AreaSwitcher } from '@/components/area-switcher'
import { getLinkContext, LINKED_DEPARTMENT_CODE } from '@/lib/linked-account'
import { OverallStatsRow } from '@/components/overall-stats-row'
import { WeekActivityDots } from '@/components/week-activity-dots'
import { fetchAllUserAnswers } from '@/lib/quiz-answers'
import { buildLast7Days, toBerlinDateStr } from '@/lib/home-today'

export default async function ProfilePage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Fetch profile data
  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, pseudonym, show_real_name, total_xp, current_streak, leaderboard_opt_out, department_id, role')
    .eq('id', user.id)
    .single()

  const displayName = (profile?.display_name as string | null) ?? user.email?.split('@')[0] ?? 'Azubi'
  const pseudonym = (profile?.pseudonym as string | null) ?? 'Unbekannt'
  const showRealName = (profile?.show_real_name as boolean | null) ?? false
  const totalXp = (profile?.total_xp as number | null) ?? 0
  const currentStreak = (profile?.current_streak as number | null) ?? 0
  const leaderboardOptOut = (profile?.leaderboard_opt_out as boolean | null) ?? false

  // Lehrer-Rollen sehen hier nur eine kurze Spielkarte (PROJ-50); ihr Profil liegt unter „Mein Konto“
  const isTeacher = isTeacherRole(profile?.role)

  // Gesamtstatistik und Wochenaktivität (PROJ-41, vorher auf der Startseite)
  const now = new Date()
  const weekStart = new Date(now.getTime() - 7 * 86_400_000)
  const [{ rows: answers }, sessionsResult, blitzResult] = isTeacher
    ? [{ rows: [] as Awaited<ReturnType<typeof fetchAllUserAnswers>>['rows'] }, { data: null }, { data: null }]
    : await Promise.all([
        fetchAllUserAnswers(supabase, user.id),
        supabase.from('quiz_sessions').select('completed_at').eq('user_id', user.id).gte('completed_at', weekStart.toISOString()),
        supabase.from('blitz_rounds').select('calendar_day').eq('user_id', user.id).gte('calendar_day', toBerlinDateStr(weekStart)),
      ])
  const totalCorrect = answers.filter((a) => a.is_correct).length
  const totalWrong = answers.length - totalCorrect
  const accuracy = answers.length > 0 ? Math.round((totalCorrect / answers.length) * 100) : 0
  const learnedDates = new Set([
    ...(sessionsResult.data ?? []).map((r) => toBerlinDateStr(new Date(r.completed_at as string))),
    ...(blitzResult.data ?? []).map((r) => r.calendar_day as string),
  ])
  const weekActivity = buildLast7Days(now, learnedDates)

  // Fetch unlocked badges
  const { data: userBadgeRows } = isTeacher
    ? { data: null }
    : await supabase.from('user_badges').select('badge_id, unlocked_at').eq('user_id', user.id).order('unlocked_at', { ascending: true })

  const unlockedBadges: UnlockedBadge[] = (userBadgeRows ?? []).map((r) => ({
    badge_id: r.badge_id as string,
    unlocked_at: r.unlocked_at as string,
  }))

  // Badges des eigenen Fachbereichs (PROJ-22)
  let badgeDefinitions: BadgeDisplay[] = []
  if (!isTeacher) {
    try {
      const defs = await fetchBadgeDefinitions(supabase, (profile?.department_id as string | null) ?? null)
      badgeDefinitions = defs.map(toBadgeDisplay)
    } catch (err) {
      console.error('[profile] badge definitions:', err)
    }
  }

  // Bereichs-Umschalter nur für Super-Admin und dessen Zweitkonto (PROJ-29)
  let areaSwitch: { current: 'main' | 'linked'; mainName: string; linkedName: string } | null = null
  try {
    const service = createServiceClient()
    const link = await getLinkContext(service, user.id)
    if (link) {
      let mainDepartmentId = (profile?.department_id as string | null) ?? null
      if (link.current === 'linked') {
        const { data: main } = await service.from('profiles').select('department_id').eq('id', link.mainUserId).maybeSingle()
        mainDepartmentId = (main as { department_id: string | null } | null)?.department_id ?? null
      }
      const { data: departments } = await service.from('departments').select('id, code, name').limit(50)
      const rows = (departments ?? []) as { id: string; code: string; name: string }[]
      areaSwitch = {
        current: link.current,
        mainName: rows.find((d) => d.id === mainDepartmentId)?.name ?? 'Hauptkonto',
        linkedName: rows.find((d) => d.code === LINKED_DEPARTMENT_CODE)?.name ?? 'Tourismus',
      }
    }
  } catch (err) {
    console.error('[profile] area switch:', err)
  }

  return (
    <div className="min-h-screen bg-[#111827] flex flex-col">
      {/* Header */}
      <header className="bg-[#1F2937] border-b border-[#4B5563] px-4 py-4 sticky top-0 z-10">
        <div className="max-w-md mx-auto flex items-center gap-3">
          <span className="font-semibold text-[#F9FAFB]">Profil</span>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-6 w-full space-y-5">
        {areaSwitch && (
          <div className="bg-[#1F2937] border border-[#4B5563] rounded-2xl p-5">
            <AreaSwitcher {...areaSwitch} />
          </div>
        )}

        {/* Profile card */}
        <div className="bg-[#1F2937] border border-[#4B5563] rounded-2xl p-5">
          <div className="flex items-center gap-4 mb-4">
            {/* Avatar */}
            <div className="w-14 h-14 rounded-full bg-[#374151] border-2 border-[#4B5563] flex items-center justify-center flex-shrink-0">
              <User size={28} className="text-[#9CA3AF]" />
            </div>

            {/* Name + badges */}
            <div className="flex-1 min-w-0">
              <p className="font-bold text-[#F9FAFB] text-lg truncate">{displayName}</p>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <XpLevelBadge totalXp={totalXp} />
                <StreakBadge streak={currentStreak} variant="pill" />
              </div>
            </div>
          </div>

          {/* XP progress */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-[#9CA3AF]">
              <span>{totalXp.toLocaleString('de-DE')} XP gesamt</span>
            </div>
            <XpProgressBar totalXp={totalXp} />
          </div>
        </div>

        {isTeacher && (
          <Link
            href="/admin/konto"
            className="flex min-h-11 items-center gap-3 bg-[#1F2937] border border-[#4B5563] rounded-2xl p-4 transition-all duration-200 hover:border-[#58CC02]/60 active:scale-95"
          >
            <IdCard size={20} className="text-[#58CC02] flex-shrink-0" />
            <span className="flex-1 min-w-0">
              <span className="block text-sm font-semibold text-[#F9FAFB]">Dein Lehrkraft-Profil</span>
              <span className="block text-xs text-[#9CA3AF]">Fächer, Aufgaben, Anmeldung und Einstellungen findest du unter „Mein Konto“.</span>
            </span>
            <ChevronRight size={18} className="text-[#9CA3AF] flex-shrink-0" />
          </Link>
        )}

        {!isTeacher && answers.length > 0 && (
          <OverallStatsRow totalCorrect={totalCorrect} totalWrong={totalWrong} accuracyPercent={accuracy} />
        )}

        {!isTeacher && (
          <>
            <WeekActivityDots weekActivity={weekActivity} />

            {/* Badge gallery */}
            <div className="bg-[#1F2937] border border-[#4B5563] rounded-2xl p-5">
              <BadgeGallery definitions={badgeDefinitions} unlockedBadges={unlockedBadges} />
            </div>
          </>
        )}

        {/* Mein Betrieb (PROJ-34; ersetzt die flache Hof-Galerie, die für Bereiche ohne Aufbau-Welt bleibt) */}
        <div className="bg-[#1F2937] border border-[#4B5563] rounded-2xl p-5">
          <BetriebVorschau />
        </div>

        {/* Privacy settings — bei Lehrer-Rollen unter „Mein Konto“ */}
        {!isTeacher && (
          <div className="bg-[#1F2937] border border-[#4B5563] rounded-2xl p-5 space-y-5">
            <h2 className="text-sm font-semibold text-[#F9FAFB]">Rangliste</h2>
            <PseudonymSettings initialPseudonym={pseudonym} initialShowRealName={showRealName} />
            <div className="border-t border-[#374151] pt-4">
              <LeaderboardOptOutToggle initialOptOut={leaderboardOptOut} />
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
