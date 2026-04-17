import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { LogoutButton } from '@/components/logout-button'
import { XpLevelBadge } from '@/components/xp-level-badge'
import { XpProgressBar } from '@/components/xp-progress-bar'
import { StreakBadge } from '@/components/streak-badge'
import { getLevelFromXp } from '@/lib/xp-utils'
import { Truck, Shield, BookOpen, Zap, Trophy } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

export default async function HomePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, display_name, total_xp, current_streak, longest_streak')
    .eq('id', user.id)
    .single()

  const isAdmin = profile?.role === 'admin'
  const displayName = profile?.display_name ?? user.email?.split('@')[0] ?? 'Lernender'
  const totalXp = profile?.total_xp ?? 0
  const currentStreak = profile?.current_streak ?? 0
  const level = getLevelFromXp(totalXp)

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
            {/* XP Pill */}
            <div className="flex items-center gap-1 bg-[#111827] rounded-full px-3 py-1.5 border border-[#4B5563]">
              <Zap size={13} className="text-[#58CC02]" />
              <span className="text-xs font-bold text-[#F9FAFB]">{totalXp} XP</span>
            </div>
            {/* Streak Pill */}
            <StreakBadge streak={currentStreak} variant="pill" />
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
      <main className="max-w-md mx-auto px-4 py-8">
        {/* Welcome */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-[#F9FAFB] tracking-tight">
            Hallo, {displayName}! 👋
          </h1>
          <p className="text-[#9CA3AF] mt-1 text-sm">
            Bereit für die heutige Lerneinheit?
          </p>
        </div>

        {/* Level + XP progress */}
        <div className="bg-[#1F2937] border border-[#4B5563] rounded-2xl p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Zap size={16} className="text-[#58CC02]" />
              <span className="text-sm font-semibold text-[#F9FAFB]">{totalXp} XP gesamt</span>
            </div>
            <XpLevelBadge totalXp={totalXp} />
          </div>
          <XpProgressBar totalXp={totalXp} />
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <Card className="bg-[#1F2937] border-[#4B5563] rounded-2xl">
            <CardContent className="p-3 text-center">
              <Zap size={20} className="text-[#58CC02] mx-auto mb-1" />
              <p className="text-lg font-bold text-[#F9FAFB]">{totalXp}</p>
              <p className="text-xs text-[#9CA3AF]">XP</p>
            </CardContent>
          </Card>
          <Card className="bg-[#1F2937] border-[#4B5563] rounded-2xl">
            <CardContent className="p-3 text-center flex flex-col items-center">
              <StreakBadge streak={currentStreak} variant="card" />
            </CardContent>
          </Card>
          <Card className="bg-[#1F2937] border-[#4B5563] rounded-2xl">
            <CardContent className="p-3 text-center">
              <Trophy size={20} className="text-[#FFD700] mx-auto mb-1" />
              <p className="text-lg font-bold text-[#F9FAFB]">Lvl {level}</p>
              <p className="text-xs text-[#9CA3AF]">Level</p>
            </CardContent>
          </Card>
        </div>

        {/* Main CTA */}
        <Link href="/subjects">
          <Button className="w-full rounded-2xl bg-[#58CC02] hover:bg-[#4CAD02] text-white font-bold text-base py-6 transition-all duration-200 active:scale-95 shadow-lg shadow-green-900/30">
            <BookOpen className="mr-2" size={20} />
            Jetzt lernen
          </Button>
        </Link>

        <p className="text-center text-[#6B7280] text-xs mt-4">
          Wähle ein Fach und beantworte Fragen für deine IHK-Prüfung.
        </p>
      </main>
    </div>
  )
}
