import { NextRequest, NextResponse } from 'next/server'
import { requireTeacherOrAdmin } from '../../_lib/auth'
import { hideInputSchema } from '@/lib/forum'
import { callForum, parseBody } from '../_lib/forum-api'

/** Ausblenden / Einblenden (Moderation); wird im Änderungsprotokoll erfasst. */
export async function POST(request: NextRequest) {
  const auth = await requireTeacherOrAdmin()
  if (auth.error) return auth.error

  const body = await parseBody(request, hideInputSchema)
  if (body.error) return body.error

  const res = await callForum(auth.supabase, 'api/admin/lehrerzimmer/hide', 'forum_set_hidden', {
    p_target_type: body.data.target_type,
    p_target_id: body.data.target_id,
    p_hidden: body.data.hidden,
  })
  if (res.error) return res.error
  return NextResponse.json({ ok: true })
}
