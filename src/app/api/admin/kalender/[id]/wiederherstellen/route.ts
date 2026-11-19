import { NextRequest, NextResponse } from 'next/server'
import { requireTeacherOrAdmin } from '../../../_lib/auth'
import { NOT_FOUND, callKalender, isUuid } from '../../_lib/kalender-api'

const ROUTE = 'api/admin/kalender/[id]/wiederherstellen'

/** „Rückgängig“ nach dem Löschen (nur wer gelöscht hat, innerhalb von 15 Minuten). */
export async function POST(_request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireTeacherOrAdmin()
  if (auth.error) return auth.error
  const { id } = await ctx.params
  if (!isUuid(id)) return NOT_FOUND()

  const res = await callKalender<number>(auth.supabase, ROUTE, 'abw_wiederherstellen', { p_id: id })
  if (res.error) return res.error
  return NextResponse.json({ version: res.data })
}
