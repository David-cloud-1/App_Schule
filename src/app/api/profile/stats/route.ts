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
    .select('total_xp, current_streak, longest_streak, coin_balance, starter_coins, starter_coins_seen')
    .eq('id', user.id)
    .single()

  if (error || !profile) {
    console.error('[GET /api/profile/stats] fetch:', error)
    return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 })
  }

  const totalXp       = (profile.total_xp       as number) ?? 0
  const currentStreak = (profile.current_streak  as number) ?? 0
  const longestStreak = (profile.longest_streak  as number) ?? 0
  const coinBalance   = (profile.coin_balance    as number) ?? 0
  const starterCoins  = profile.starter_coins as number | null
  const starterSeen   = (profile.starter_coins_seen as boolean) ?? false
  const level         = getLevelFromXp(totalXp)

  return NextResponse.json({
    total_xp: totalXp,
    current_streak: currentStreak,
    longest_streak: longestStreak,
    level,
    coin_balance: coinBalance,
    // Non-null exactly once, until the client acks it via
    // POST /api/profile/coins/ack-starter (PROJ-19 "einmaliger Hinweis").
    starter_coins_hint: starterCoins !== null && !starterSeen ? starterCoins : null,
  })
}
