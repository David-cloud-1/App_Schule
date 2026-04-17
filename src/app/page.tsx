import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { LogoutButton } from '@/components/logout-button'
import { Truck, Shield, BookOpen, Zap, Flame, Trophy } from 'lucide-react'
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
    .select('role, display_name')
    .eq('id', user.id)
    .single()

  const isAdmin = profile?.role === 'admin'
  const displayName = profile?.display_name ?? user.email?.split('@')[0] ?? 'Lernender'

  return (
    <div className="min-h-screen bg-[#111827]">
      {/* Header */}
      <header className="bg-[#1F2937] border-b border-[#4B5563] px-4 py-4 sticky top-0 z-10">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Truck className="w-5 h-5 text-[#58CC02]" />
            <span className="font-bold text-[#F9FAFB]">SpediLern</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 bg-[#111827] rounded-full px-3 py-1.5 border border-[#4B5563]">
              <Zap size={13} className="text-[#58CC02]" />
              <span className="text-xs font-bold text-[#F9FAFB]">0 XP</span>
            </div>
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
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-[#F9FAFB] tracking-tight">
            Hallo, {displayName}! 👋
          </h1>
          <p className="text-[#9CA3AF] mt-1 text-sm">
            Bereit für die heutige Lerneinheit?
          </p>
        </div>

        {/* Quick stats — placeholders until PROJ-4/5 */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <Card className="bg-[#1F2937] border-[#4B5563] rounded-2xl">
            <CardContent className="p-3 text-center">
              <Zap size={20} className="text-[#58CC02] mx-auto mb-1" />
              <p className="text-lg font-bold text-[#F9FAFB]">0</p>
              <p className="text-xs text-[#9CA3AF]">XP</p>
            </CardContent>
          </Card>
          <Card className="bg-[#1F2937] border-[#4B5563] rounded-2xl">
            <CardContent className="p-3 text-center">
              <Flame size={20} className="text-[#FF9600] mx-auto mb-1" />
              <p className="text-lg font-bold text-[#F9FAFB]">0</p>
              <p className="text-xs text-[#9CA3AF]">Streak</p>
            </CardContent>
          </Card>
          <Card className="bg-[#1F2937] border-[#4B5563] rounded-2xl">
            <CardContent className="p-3 text-center">
              <Trophy size={20} className="text-[#FFD700] mx-auto mb-1" />
              <p className="text-lg font-bold text-[#F9FAFB]">–</p>
              <p className="text-xs text-[#9CA3AF]">Rang</p>
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
