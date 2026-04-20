import { NextResponse } from 'next/server'
import { requireAdmin } from '../_lib/auth'
import { createServiceClient } from '@/lib/supabase-server'

type ProfileRow = {
  id: string
  display_name: string | null
  role: string
  total_xp: number
  current_streak: number
  last_session_date: string | null
}

export async function GET() {
  const auth = await requireAdmin()
  if (auth.error) return auth.error

  const service = createServiceClient()

  const { data: profiles, error: pErr } = await service
    .from('profiles')
    .select('id, display_name, role, total_xp, current_streak, last_session_date')
    .order('total_xp', { ascending: false })

  if (pErr) {
    console.error('[GET /api/admin/users] profiles', pErr)
    return NextResponse.json({ error: 'Failed to load users' }, { status: 500 })
  }

  // Fetch auth users for email + banned status. Supabase admin.listUsers
  // supports paging; loop until we've collected every account (1000/page).
  const authUsersById = new Map<
    string,
    { email: string | undefined; banned_until: string | null }
  >()
  try {
    let page = 1
    const perPage = 1000
    // Guard against runaway loops — 100k users is plenty
    for (let i = 0; i < 100; i++) {
      const { data, error } = await service.auth.admin.listUsers({ page, perPage })
      if (error) {
        console.error('[GET /api/admin/users] auth list', error)
        break
      }
      const users = data?.users ?? []
      for (const u of users) {
        const bannedUntil =
          (u as unknown as { banned_until?: string | null }).banned_until ?? null
        authUsersById.set(u.id, { email: u.email, banned_until: bannedUntil })
      }
      if (users.length < perPage) break
      page++
    }
  } catch (err) {
    console.error('[GET /api/admin/users] listUsers threw', err)
  }

  const now = Date.now()
  const users = (profiles as ProfileRow[]).map((p) => {
    const au = authUsersById.get(p.id)
    const banned = !!(au?.banned_until && new Date(au.banned_until).getTime() > now)
    return {
      id: p.id,
      display_name: p.display_name,
      email: au?.email ?? null,
      role: p.role,
      total_xp: p.total_xp,
      current_streak: p.current_streak,
      last_session_date: p.last_session_date,
      banned,
    }
  })

  return NextResponse.json({ users })
}
