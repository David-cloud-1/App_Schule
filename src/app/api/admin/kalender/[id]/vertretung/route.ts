import { NextRequest, NextResponse } from 'next/server'
import { requireTeacherOrAdmin } from '../../../_lib/auth'
import { vertretungSchema } from '@/lib/kalender'
import { NOT_FOUND, callKalender, isUuid, parseBody } from '../../_lib/kalender-api'

const ROUTE = 'api/admin/kalender/[id]/vertretung'

/** Vertretungsstatus setzen — nur Vertretungsplaner und Super-Admin (prüft die Datenbank). */
export async function PUT(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireTeacherOrAdmin()
  if (auth.error) return auth.error
  const { id } = await ctx.params
  if (!isUuid(id)) return NOT_FOUND()

  const body = await parseBody(request, vertretungSchema)
  if (body.error) return body.error

  const res = await callKalender<number>(auth.supabase, ROUTE, 'abw_vertretung_setzen', {
    p_id: id,
    p_version: body.data.version,
    p_status: body.data.status,
  })
  if (res.error) return res.error
  return NextResponse.json({ version: res.data })
}
