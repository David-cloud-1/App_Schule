import { NextRequest, NextResponse } from 'next/server'
import { requireTeacherOrAdmin } from '../../../_lib/auth'
import { replyInputSchema } from '@/lib/forum'
import { callForum, isUuid, NOT_FOUND, parseBody } from '../../_lib/forum-api'

const ROUTE = 'api/admin/lehrerzimmer/replies/[id]'
type Ctx = { params: Promise<{ id: string }> }

export async function PATCH(request: NextRequest, ctx: Ctx) {
  const auth = await requireTeacherOrAdmin()
  if (auth.error) return auth.error
  const { id } = await ctx.params
  if (!isUuid(id)) return NOT_FOUND()

  const body = await parseBody(request, replyInputSchema)
  if (body.error) return body.error

  const res = await callForum(auth.supabase, ROUTE, 'forum_update_reply', { p_id: id, p_body: body.data.body })
  if (res.error) return res.error
  return NextResponse.json({ ok: true })
}

export async function DELETE(_request: NextRequest, ctx: Ctx) {
  const auth = await requireTeacherOrAdmin()
  if (auth.error) return auth.error
  const { id } = await ctx.params
  if (!isUuid(id)) return NOT_FOUND()

  const res = await callForum(auth.supabase, ROUTE, 'forum_delete_reply', { p_id: id })
  if (res.error) return res.error
  return NextResponse.json({ ok: true })
}
