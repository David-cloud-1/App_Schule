import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import { checkAndAwardBadges } from '@/lib/badges'
import { getLevelFromXp } from '@/lib/xp-utils'

/**
 * POST /api/badges/migrate
 *
 * One-time migration: retroactively awards all earned badges for every user.
 * Badges awarded here have `is_retroactive = true` — no unlock modals are shown.
 *
 * This route is admin-only (service role key required via Supabase RLS, or call
 * from a trusted environment). For now it is protected by a simple secret header.
 */
export async function POST(request: Request) {
  // Simple secret check — set BADGE_MIGRATE_SECRET env var to protect this endpoint
  const secret = process.env.BADGE_MIGRATE_SECRET
  if (secret) {
    const authHeader = request.headers.get('x-migrate-secret')
    if (authHeader !== secret) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  const supabase = createServiceClient()

  // Fetch all profiles
  const { data: profiles, error: profilesErr } = await supabase
    .from('profiles')
    .select('id, total_xp, longest_streak')

  if (profilesErr) {
    return NextResponse.json({ error: 'Failed to fetch profiles' }, { status: 500 })
  }

  const results: { userId: string; awarded: number }[] = []

  for (const profile of profiles ?? []) {
    const userId = profile.id as string
    const totalXp = (profile.total_xp as number) ?? 0
    const longestStreak = (profile.longest_streak as number) ?? 0
    const level = getLevelFromXp(totalXp)

    const newBadges = await checkAndAwardBadges(supabase, userId, {
      streak: longestStreak,
      level,
      sessionScore: 0,
      sessionTotal: 0,
      isRetroactive: true,
    })

    results.push({ userId, awarded: newBadges.length })
  }

  const totalAwarded = results.reduce((sum, r) => sum + r.awarded, 0)
  return NextResponse.json({
    message: `Migration complete. ${totalAwarded} badges awarded across ${results.length} users.`,
    results,
  })
}
