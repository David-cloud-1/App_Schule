import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createServiceClient } from '@/lib/supabase-server'
import { getLevelFromXp } from '@/lib/xp-utils'

type Period = 'week' | 'month' | 'all'

function getStartDate(period: Period): string | null {
  const now = new Date()
  if (period === 'week') {
    // Monday 00:00 of current week (Europe/Berlin)
    const berlinNow = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Berlin' }))
    const day = berlinNow.getDay() // 0=Sun, 1=Mon, ...
    const diffToMonday = day === 0 ? -6 : 1 - day
    berlinNow.setDate(berlinNow.getDate() + diffToMonday)
    berlinNow.setHours(0, 0, 0, 0)
    return berlinNow.toISOString()
  }
  if (period === 'month') {
    const berlinNow = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Berlin' }))
    berlinNow.setDate(1)
    berlinNow.setHours(0, 0, 0, 0)
    return berlinNow.toISOString()
  }
  return null
}

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const period = (searchParams.get('period') ?? 'week') as Period

  const service = createServiceClient()
  const startDate = getStartDate(period)

  if (period === 'all') {
    // All-time: use total_xp from profiles
    const { data: rows, error } = await service
      .from('profiles')
      .select('id, display_name, total_xp, leaderboard_opt_out')
      .order('total_xp', { ascending: false })
      .order('display_name', { ascending: true })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const allRows = rows ?? []
    const currentUserRow = allRows.find((r) => r.id === user.id)

    // Build ranked list excluding opt-out users (except current user)
    const visibleRows = allRows.filter((r) => !r.leaderboard_opt_out || r.id === user.id)
    const publicRows = visibleRows.filter((r) => !r.leaderboard_opt_out)

    // Assign ranks based on public rows only
    const rankedPublic = publicRows.map((r, i) => ({ ...r, rank: i + 1 }))

    // Find current user's rank in the full (non-opt-out) list
    let currentUserEntry = null
    if (currentUserRow) {
      const myRankInAll = rankedPublic.findIndex((r) => r.id === user.id)
      currentUserEntry = {
        id: currentUserRow.id,
        display_name: currentUserRow.leaderboard_opt_out ? null : currentUserRow.display_name,
        total_xp: currentUserRow.total_xp,
        level: getLevelFromXp(currentUserRow.total_xp ?? 0),
        rank: myRankInAll >= 0 ? myRankInAll + 1 : allRows.filter((r) => r.total_xp > (currentUserRow.total_xp ?? 0)).length + 1,
        is_current_user: true,
        is_opted_out: currentUserRow.leaderboard_opt_out,
      }
    }

    const top10 = rankedPublic.slice(0, 10).map((r) => ({
      ...r,
      level: getLevelFromXp(r.total_xp ?? 0),
      is_current_user: r.id === user.id,
    }))
    const currentUserInTop10 = top10.some((r) => r.is_current_user)

    return NextResponse.json({
      entries: top10,
      current_user: currentUserInTop10 ? null : currentUserEntry,
    })
  }

  // Week / Month: aggregate xp_earned from quiz_sessions
  const { data: sessionRows, error: sessionError } = await service
    .from('quiz_sessions')
    .select('user_id, xp_earned')
    .gte('completed_at', startDate!)

  if (sessionError) return NextResponse.json({ error: sessionError.message }, { status: 500 })

  // Aggregate XP per user
  const xpMap = new Map<string, number>()
  for (const row of sessionRows ?? []) {
    xpMap.set(row.user_id, (xpMap.get(row.user_id) ?? 0) + (row.xp_earned ?? 0))
  }

  // Fetch all profiles to get display names, opt-out, and total_xp (for level)
  const { data: profileRows, error: profileError } = await service
    .from('profiles')
    .select('id, display_name, total_xp, leaderboard_opt_out')

  if (profileError) return NextResponse.json({ error: profileError.message }, { status: 500 })

  const profileMap = new Map(profileRows?.map((p) => [p.id, p]) ?? [])
  const currentUserProfile = profileMap.get(user.id)

  // Build entries for all users with XP in period (include current user even if 0)
  const userIds = new Set([...xpMap.keys(), user.id])
  const allEntries = Array.from(userIds).map((uid) => {
    const profile = profileMap.get(uid)
    return {
      id: uid,
      display_name: profile?.display_name ?? null,
      xp: xpMap.get(uid) ?? 0,
      leaderboard_opt_out: profile?.leaderboard_opt_out ?? false,
    }
  })

  // Sort: XP desc, then display_name asc (alphabetical tiebreaker)
  allEntries.sort((a, b) => {
    if (b.xp !== a.xp) return b.xp - a.xp
    return (a.display_name ?? '').localeCompare(b.display_name ?? '', 'de')
  })

  // Public entries (non-opted-out)
  const publicEntries = allEntries.filter((e) => !e.leaderboard_opt_out)
  const rankedPublic = publicEntries.map((e, i) => ({ ...e, rank: i + 1 }))

  const currentUserXp = xpMap.get(user.id) ?? 0
  const currentUserRank = rankedPublic.findIndex((e) => e.id === user.id)

  const top10 = rankedPublic.slice(0, 10).map((e) => ({
    id: e.id,
    display_name: e.display_name,
    total_xp: e.xp,
    level: getLevelFromXp(profileMap.get(e.id)?.total_xp ?? 0),
    rank: e.rank,
    is_current_user: e.id === user.id,
  }))

  const currentUserInTop10 = top10.some((e) => e.is_current_user)

  const currentUserEntry = {
    id: user.id,
    display_name: currentUserProfile?.leaderboard_opt_out ? null : currentUserProfile?.display_name ?? null,
    total_xp: currentUserXp,
    level: getLevelFromXp(currentUserProfile?.total_xp ?? 0),
    rank: currentUserRank >= 0 ? currentUserRank + 1 : allEntries.filter((e) => !e.leaderboard_opt_out && e.xp > currentUserXp).length + 1,
    is_current_user: true,
    is_opted_out: currentUserProfile?.leaderboard_opt_out ?? false,
  }

  return NextResponse.json({
    entries: top10,
    current_user: currentUserInTop10 ? null : currentUserEntry,
  })
}
