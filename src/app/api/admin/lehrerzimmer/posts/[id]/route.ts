import { NextRequest, NextResponse } from 'next/server'
import { requireTeacherOrAdmin } from '../../../_lib/auth'
import { postInputSchema } from '@/lib/forum'
import { callForum, isUuid, NOT_FOUND, parseBody } from '../../_lib/forum-api'

const ROUTE = 'api/admin/lehrerzimmer/posts/[id]'
type Ctx = { params: Promise<{ id: string }> }

/** Beitrag mit Antworten. Das Öffnen setzt ihn für die Person auf „gelesen“. */
export async function GET(_request: NextRequest, ctx: Ctx) {
  const auth = await requireTeacherOrAdmin()
  if (auth.error) return auth.error
  const { id } = await ctx.params
  if (!isUuid(id)) return NOT_FOUND()

  const res = await callForum<unknown | null>(auth.supabase, ROUTE, 'forum_get_thread', { p_post_id: id })
  if (res.error) return res.error
  if (!res.data) return NOT_FOUND()

  // Der Lesestand darf das Anzeigen nie verhindern.
  const read = await auth.supabase.rpc('forum_mark_read', { p_post_id: id })
  if (read.error) console.error(`[${ROUTE}] mark_read`, read.error)

  return NextResponse.json(res.data)
}

export async function PATCH(request: NextRequest, ctx: Ctx) {
  const auth = await requireTeacherOrAdmin()
  if (auth.error) return auth.error
  const { id } = await ctx.params
  if (!isUuid(id)) return NOT_FOUND()

  const body = await parseBody(request, postInputSchema)
  if (body.error) return body.error

  const res = await callForum(auth.supabase, ROUTE, 'forum_update_post', {
    p_id: id,
    p_category: body.data.category,
    p_title: body.data.title,
    p_body: body.data.body,
    p_department_id: body.data.department_id ?? null,
    p_subject_id: body.data.subject_id ?? null,
  })
  if (res.error) return res.error
  return NextResponse.json({ ok: true })
}

/** Löschen = Papierkorb (30 Tage), nur der Autor. */
export async function DELETE(_request: NextRequest, ctx: Ctx) {
  const auth = await requireTeacherOrAdmin()
  if (auth.error) return auth.error
  const { id } = await ctx.params
  if (!isUuid(id)) return NOT_FOUND()

  const res = await callForum(auth.supabase, ROUTE, 'forum_delete_post', { p_id: id })
  if (res.error) return res.error
  return NextResponse.json({ ok: true })
}
