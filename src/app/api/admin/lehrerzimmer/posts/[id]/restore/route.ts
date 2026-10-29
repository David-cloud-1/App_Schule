import { NextRequest, NextResponse } from 'next/server'
import { requireTeacherOrAdmin } from '../../../../_lib/auth'
import { callForum, isUuid, NOT_FOUND } from '../../../_lib/forum-api'

/** Beitrag aus dem Papierkorb holen (Autor oder Super-Admin). */
export async function POST(_request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireTeacherOrAdmin()
  if (auth.error) return auth.error
  const { id } = await ctx.params
  if (!isUuid(id)) return NOT_FOUND()

  const res = await callForum(auth.supabase, 'api/admin/lehrerzimmer/posts/[id]/restore', 'forum_restore_post', { p_id: id })
  if (res.error) return res.error
  return NextResponse.json({ ok: true })
}
