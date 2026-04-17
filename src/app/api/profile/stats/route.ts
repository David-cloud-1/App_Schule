import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { getLevelFromXp } from '@/lib/xp-utils'

export async function GET() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('total_xp, current_streak, longest_streak')
    .eq('id', user.id)
    .single()

  if (error || !profile) {
    console.error('[GET /api/profile/stats] fetch:', error)
    return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 })
  }

  const totalXp       = (profile.total_xp       as number) ?? 0
  const currentStreak = (profile.current_streak  as number) ?? 0
  const longestStreak = (profile.longest_streak  as number) ?? 0
  const level         = getLevelFromXp(totalXp)

  return NextResponse.json({ total_xp: totalXp, current_streak: currentStreak, longest_streak: longestStreak, level })
}
