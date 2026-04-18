import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Trophy } from 'lucide-react'
import { createClient } from '@/lib/supabase-server'
import { LeaderboardClient } from './leaderboard-client'

export default async function LeaderboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <div className="min-h-screen bg-[#111827]">
      <header className="bg-[#1F2937] border-b border-[#4B5563] px-4 py-4 sticky top-0 z-10">
        <div className="max-w-md mx-auto flex items-center gap-3">
          <Link href="/" className="text-[#9CA3AF] hover:text-[#F9FAFB] transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <div className="flex items-center gap-2">
            <Trophy size={18} className="text-[#FFD700]" />
            <span className="font-semibold text-[#F9FAFB]">Rangliste</span>
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-6">
        <LeaderboardClient userId={user.id} />
      </main>
    </div>
  )
}
