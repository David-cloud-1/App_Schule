import { NextRequest, NextResponse } from 'next/server'
import { requireTeacherOrAdmin } from '../../_lib/auth'
import { reportInputSchema } from '@/lib/forum'
import { callForum, parseBody } from '../_lib/forum-api'

const ROUTE = 'api/admin/lehrerzimmer/reports'

/** Offene Meldungen für die Moderation — nur Super-Admin und Bereichs-Admins. */
export async function GET() {
  const auth = await requireTeacherOrAdmin()
  if (auth.error) return auth.error
  if (!auth.isSuperAdmin && !auth.isDepartmentAdmin) {
    return NextResponse.json({ error: 'Nur für Admins.' }, { status: 403 })
  }

  const res = await callForum<unknown[]>(auth.supabase, ROUTE, 'forum_list_reports')
  if (res.error) return res.error
  return NextResponse.json({ items: res.data ?? [] })
}

/** Einen Beitrag oder eine Antwort melden (einmal pro Person). */
export async function POST(request: NextRequest) {
  const auth = await requireTeacherOrAdmin()
  if (auth.error) return auth.error

  const body = await parseBody(request, reportInputSchema)
  if (body.error) return body.error

  const res = await callForum(auth.supabase, ROUTE, 'forum_report', {
    p_target_type: body.data.target_type,
    p_target_id: body.data.target_id,
    p_reason: body.data.reason,
    p_note: body.data.note ?? null,
  })
  if (res.error) return res.error
  return NextResponse.json({ ok: true }, { status: 201 })
}
