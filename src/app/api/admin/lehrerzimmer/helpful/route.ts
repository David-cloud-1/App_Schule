import { NextRequest, NextResponse } from 'next/server'
import { requireTeacherOrAdmin } from '../../_lib/auth'
import { targetSchema } from '@/lib/forum'
import { callForum, parseBody } from '../_lib/forum-api'

/** „Hilfreich“ setzen oder zurücknehmen; Antwort: { helpful, count }. */
export async function POST(request: NextRequest) {
  const auth = await requireTeacherOrAdmin()
  if (auth.error) return auth.error

  const body = await parseBody(request, targetSchema)
  if (body.error) return body.error

  const res = await callForum<{ helpful: boolean; count: number }>(
    auth.supabase,
    'api/admin/lehrerzimmer/helpful',
    'forum_toggle_helpful',
    { p_target_type: body.data.target_type, p_target_id: body.data.target_id }
  )
  if (res.error) return res.error
  return NextResponse.json(res.data)
}
