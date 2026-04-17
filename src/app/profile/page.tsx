import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, User } from 'lucide-react'
import { createClient } from '@/lib/supabase-server'
import { XpLevelBadge } from '@/components/xp-level-badge'
import { StreakBadge } from '@/components/streak-badge'
import { XpProgressBar } from '@/components/xp-progress-bar'
import { BadgeGallery, type UnlockedBadge } from '@/components/badge-gallery'

export default async function ProfilePage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Fetch profile data
  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, total_xp, current_streak')
    .eq('id', user.id)
    .single()

  const displayName = (profile?.display_name as string | null) ?? user.email?.split('@')[0] ?? 'Azubi'
  const totalXp = (profile?.total_xp as number | null) ?? 0
  const currentStreak = (profile?.current_streak as number | null) ?? 0

  // Fetch unlocked badges
  const { data: userBadgeRows } = await supabase
    .from('user_badges')
    .select('badge_id, unlocked_at')
    .eq('user_id', user.id)
    .order('unlocked_at', { ascending: true })

  const unlockedBadges: UnlockedBadge[] = (userBadgeRows ?? []).map((r) => ({
    badge_id: r.badge_id as string,
    unlocked_at: r.unlocked_at as string,
  }))

  return (
    <div className="min-h-screen bg-[#111827] flex flex-col">
      {/* Header */}
      <header className="bg-[#1F2937] border-b border-[#4B5563] px-4 py-4 sticky top-0 z-10">
        <div className="max-w-md mx-auto flex items-center gap-3">
          <Link href="/" className="text-[#9CA3AF] hover:text-[#F9FAFB] transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <span className="font-semibold text-[#F9FAFB]">Profil</span>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-6 w-full space-y-5">
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

        {/* Badge gallery */}
        <div className="bg-[#1F2937] border border-[#4B5563] rounded-2xl p-5">
          <BadgeGallery unlockedBadges={unlockedBadges} />
        </div>
      </main>
    </div>
  )
}
