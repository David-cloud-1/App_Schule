import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { BADGE_DEFINITIONS } from '@/lib/badges'

export interface BadgeWithStatus {
  id: string
  name: string
  description: string
  icon: string
  sort_order: number
  unlocked: boolean
  unlocked_at: string | null
}

export async function GET() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Fetch this user's unlocked badges
  const { data: userBadges, error } = await supabase
    .from('user_badges')
    .select('badge_id, unlocked_at')
    .eq('user_id', user.id)

  if (error) {
    // Table may not exist yet — return all badges as locked
    console.warn('[GET /api/badges] user_badges query failed:', error.message)
    const badges: BadgeWithStatus[] = BADGE_DEFINITIONS.map((b) => ({
      ...b,
      unlocked: false,
      unlocked_at: null,
    }))
    return NextResponse.json({ badges })
  }

  const unlockedMap = new Map(
    (userBadges ?? []).map((r) => [r.badge_id as string, r.unlocked_at as string]),
  )

  const badges: BadgeWithStatus[] = BADGE_DEFINITIONS.map((b) => ({
    ...b,
    unlocked: unlockedMap.has(b.id),
    unlocked_at: unlockedMap.get(b.id) ?? null,
  }))

  return NextResponse.json({ badges })
}
