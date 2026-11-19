import { NextRequest, NextResponse } from 'next/server'
import { requireTeacherOrAdmin } from '../../../_lib/auth'
import { artInputSchema } from '@/lib/kalender'
import { NOT_FOUND, callKalender, isUuid, parseBody } from '../../_lib/kalender-api'

const ROUTE = 'api/admin/kalender/arten/[id]'

/** Art umbenennen, Farbe/Symbol ändern, aktiv/inaktiv schalten (nur Super-Admin). */
export async function PATCH(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireTeacherOrAdmin()
  if (auth.error) return auth.error
  if (!auth.isSuperAdmin) {
    return NextResponse.json({ error: 'Abwesenheitsarten verwaltet der Super-Admin.' }, { status: 403 })
  }
  const { id } = await ctx.params
  if (!isUuid(id)) return NOT_FOUND()

  const body = await parseBody(request, artInputSchema)
  if (body.error) return body.error

  const res = await callKalender<string>(auth.supabase, ROUTE, 'abw_art_speichern', {
    p_id: id,
    p_name: body.data.name,
    p_farbe: body.data.farbe,
    p_icon: body.data.icon,
    p_aktiv: body.data.aktiv,
    p_mit_freitext: body.data.mit_freitext,
  })
  if (res.error) return res.error
  return NextResponse.json({ id: res.data })
}
