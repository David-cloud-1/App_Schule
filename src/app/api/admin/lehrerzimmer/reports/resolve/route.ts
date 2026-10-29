import { NextRequest, NextResponse } from 'next/server'
import { requireTeacherOrAdmin } from '../../../_lib/auth'
import { resolveInputSchema } from '@/lib/forum'
import { callForum, parseBody } from '../../_lib/forum-api'

/** Meldungen abarbeiten: „hide“ blendet aus, „dismiss“ verwirft sie. */
export async function POST(request: NextRequest) {
  const auth = await requireTeacherOrAdmin()
  if (auth.error) return auth.error

  const body = await parseBody(request, resolveInputSchema)
  if (body.error) return body.error

  const res = await callForum(auth.supabase, 'api/admin/lehrerzimmer/reports/resolve', 'forum_resolve_reports', {
    p_target_type: body.data.target_type,
    p_target_id: body.data.target_id,
    p_action: body.data.action,
  })
  if (res.error) return res.error
  return NextResponse.json({ ok: true })
}
