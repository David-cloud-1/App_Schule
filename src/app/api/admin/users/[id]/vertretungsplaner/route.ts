import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '../../../_lib/auth'
import { planerSchema } from '@/lib/kalender'
import { NOT_FOUND, callKalender, isUuid, parseBody } from '../../../kalender/_lib/kalender-api'

const ROUTE = 'api/admin/users/[id]/vertretungsplaner'

/** Planer-Recht für den Abwesenheitskalender setzen (PROJ-120, nur Super-Admin). */
export async function PUT(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin()
  if (auth.error) return auth.error
  if (!auth.isSuperAdmin) {
    return NextResponse.json({ error: 'Das Planer-Recht vergibt der Super-Admin.' }, { status: 403 })
  }
  const { id } = await ctx.params
  if (!isUuid(id)) return NOT_FOUND()

  const body = await parseBody(request, planerSchema)
  if (body.error) return body.error

  const res = await callKalender(auth.supabase, ROUTE, 'abw_planer_setzen', {
    p_user_id: id,
    p_wert: body.data.wert,
  })
  if (res.error) return res.error
  return NextResponse.json({ ok: true, wert: body.data.wert })
}
