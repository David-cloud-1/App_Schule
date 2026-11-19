import { NextRequest, NextResponse } from 'next/server'
import { requireTeacherOrAdmin } from '../../../_lib/auth'
import { NOT_FOUND, callKalender, isUuid } from '../../_lib/kalender-api'

const ROUTE = 'api/admin/kalender/[id]/storno-abschliessen'

/**
 * Vertretungsplaner bestätigen: Die Vertretung zu einem gelöschten Eintrag ist zurückgenommen,
 * der Eintrag verschwindet aus dem Kalender (prüft die Datenbank: nur Planer, mit `?version=`).
 */
export async function POST(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireTeacherOrAdmin()
  if (auth.error) return auth.error
  const { id } = await ctx.params
  if (!isUuid(id)) return NOT_FOUND()

  const version = Number(request.nextUrl.searchParams.get('version'))
  if (!Number.isInteger(version) || version < 1) {
    return NextResponse.json({ error: 'Version fehlt.' }, { status: 400 })
  }

  const res = await callKalender(auth.supabase, ROUTE, 'abw_storno_abschliessen', { p_id: id, p_version: version })
  if (res.error) return res.error
  return NextResponse.json({ ok: true })
}
