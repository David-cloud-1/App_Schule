import { NextRequest, NextResponse } from 'next/server'
import { requireTeacherOrAdmin } from '../../_lib/auth'
import { FORUM_PAGE_SIZE, listQuerySchema, postInputSchema } from '@/lib/forum'
import { callForum, parseBody } from '../_lib/forum-api'

const ROUTE = 'api/admin/lehrerzimmer/posts'

/** Beitragsliste mit Filtern, Suche und Sortierung (PROJ-63). */
export async function GET(request: NextRequest) {
  const auth = await requireTeacherOrAdmin()
  if (auth.error) return auth.error

  const parsed = listQuerySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams.entries()))
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Ungültige Filter.' }, { status: 400 })
  }
  const q = parsed.data

  // Eine Zeile mehr holen, um „Mehr laden“ ohne zweite Abfrage zu erkennen.
  const res = await callForum<unknown[]>(auth.supabase, ROUTE, 'forum_list_posts', {
    p_category: q.category ?? null,
    p_department_id: q.department_id ?? null,
    p_subject_id: q.subject_id ?? null,
    p_only_open: q.only_open,
    p_mine: q.mine,
    p_query: q.q || null,
    p_sort: q.sort,
    p_limit: FORUM_PAGE_SIZE + 1,
    p_offset: q.offset,
  })
  if (res.error) return res.error

  const rows = res.data ?? []
  return NextResponse.json({
    items: rows.slice(0, FORUM_PAGE_SIZE),
    hasMore: rows.length > FORUM_PAGE_SIZE,
  })
}

export async function POST(request: NextRequest) {
  const auth = await requireTeacherOrAdmin()
  if (auth.error) return auth.error

  const body = await parseBody(request, postInputSchema)
  if (body.error) return body.error

  const res = await callForum<string>(auth.supabase, ROUTE, 'forum_create_post', {
    p_category: body.data.category,
    p_title: body.data.title,
    p_body: body.data.body,
    p_department_id: body.data.department_id ?? null,
    p_subject_id: body.data.subject_id ?? null,
  })
  if (res.error) return res.error
  return NextResponse.json({ id: res.data }, { status: 201 })
}
