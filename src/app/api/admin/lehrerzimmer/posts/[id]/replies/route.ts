import { NextRequest, NextResponse } from 'next/server'
import { requireTeacherOrAdmin } from '../../../../_lib/auth'
import { replyInputSchema } from '@/lib/forum'
import { callForum, isUuid, NOT_FOUND, parseBody } from '../../../_lib/forum-api'

export async function POST(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireTeacherOrAdmin()
  if (auth.error) return auth.error
  const { id } = await ctx.params
  if (!isUuid(id)) return NOT_FOUND()

  const body = await parseBody(request, replyInputSchema)
  if (body.error) return body.error

  const res = await callForum<string>(auth.supabase, 'api/admin/lehrerzimmer/posts/[id]/replies', 'forum_create_reply', {
    p_post_id: id,
    p_body: body.data.body,
  })
  if (res.error) return res.error
  return NextResponse.json({ id: res.data }, { status: 201 })
}
