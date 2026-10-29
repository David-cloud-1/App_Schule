import { NextResponse } from 'next/server'
import { requireTeacherOrAdmin } from '../../_lib/auth'
import { callForum } from '../_lib/forum-api'

/** Eigener Papierkorb des Lehrerzimmers (Super-Admin: alle), 30 Tage. */
export async function GET() {
  const auth = await requireTeacherOrAdmin()
  if (auth.error) return auth.error

  const res = await callForum<unknown[]>(auth.supabase, 'api/admin/lehrerzimmer/trash', 'forum_list_trash')
  if (res.error) return res.error
  return NextResponse.json({ items: res.data ?? [] })
}
