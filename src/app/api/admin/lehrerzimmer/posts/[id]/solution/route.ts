import { NextRequest, NextResponse } from 'next/server'
import { requireTeacherOrAdmin } from '../../../../_lib/auth'
import { solutionInputSchema } from '@/lib/forum'
import { callForum, isUuid, NOT_FOUND, parseBody } from '../../../_lib/forum-api'

/** Lösung markieren oder (reply_id = null) zurücknehmen — nur der Fragesteller. */
export async function PUT(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireTeacherOrAdmin()
  if (auth.error) return auth.error
  const { id } = await ctx.params
  if (!isUuid(id)) return NOT_FOUND()

  const body = await parseBody(request, solutionInputSchema)
  if (body.error) return body.error

  const res = await callForum(auth.supabase, 'api/admin/lehrerzimmer/posts/[id]/solution', 'forum_set_solution', {
    p_post_id: id,
    p_reply_id: body.data.reply_id,
  })
  if (res.error) return res.error
  return NextResponse.json({ ok: true })
}
