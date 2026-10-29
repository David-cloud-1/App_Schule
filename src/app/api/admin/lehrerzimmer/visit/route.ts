import { NextResponse } from 'next/server'
import { requireTeacherOrAdmin } from '../../_lib/auth'
import { callForum } from '../_lib/forum-api'

/** Die Übersicht wurde besucht → „neue Beiträge“ in der Seitenleiste beginnen bei 0. */
export async function POST() {
  const auth = await requireTeacherOrAdmin()
  if (auth.error) return auth.error

  const res = await callForum(auth.supabase, 'api/admin/lehrerzimmer/visit', 'forum_mark_overview_visited')
  if (res.error) return res.error
  return NextResponse.json({ ok: true })
}
