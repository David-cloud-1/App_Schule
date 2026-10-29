import { NextResponse } from 'next/server'
import { requireTeacherOrAdmin } from '../../_lib/auth'
import type { ForumNavCounts } from '@/lib/forum'
import { callForum } from '../_lib/forum-api'

/** Zähler für die Seitenleiste: neue Beiträge, neue Antworten, offene Meldungen. */
export async function GET() {
  const auth = await requireTeacherOrAdmin()
  if (auth.error) return auth.error

  const res = await callForum<ForumNavCounts>(auth.supabase, 'api/admin/lehrerzimmer/nav-counts', 'forum_nav_counts')
  if (res.error) return res.error
  return NextResponse.json(res.data, { headers: { 'Cache-Control': 'no-store' } })
}
