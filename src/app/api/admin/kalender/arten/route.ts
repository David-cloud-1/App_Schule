import { NextRequest, NextResponse } from 'next/server'
import { requireTeacherOrAdmin } from '../../_lib/auth'
import { artInputSchema, artenSortierungSchema } from '@/lib/kalender'
import { callKalender, parseBody } from '../_lib/kalender-api'

const ROUTE = 'api/admin/kalender/arten'

/** Neue Abwesenheitsart (nur Super-Admin; prüft die Datenbank). */
export async function POST(request: NextRequest) {
  const auth = await requireTeacherOrAdmin()
  if (auth.error) return auth.error
  if (!auth.isSuperAdmin) {
    return NextResponse.json({ error: 'Abwesenheitsarten verwaltet der Super-Admin.' }, { status: 403 })
  }

  const body = await parseBody(request, artInputSchema)
  if (body.error) return body.error

  const res = await callKalender<string>(auth.supabase, ROUTE, 'abw_art_speichern', {
    p_id: null,
    p_name: body.data.name,
    p_farbe: body.data.farbe,
    p_icon: body.data.icon,
    p_aktiv: body.data.aktiv,
    p_mit_freitext: body.data.mit_freitext,
  })
  if (res.error) return res.error
  return NextResponse.json({ id: res.data }, { status: 201 })
}

/** Reihenfolge speichern (IDs in neuer Reihenfolge; „Sonstige“ bleibt am Ende). */
export async function PUT(request: NextRequest) {
  const auth = await requireTeacherOrAdmin()
  if (auth.error) return auth.error
  if (!auth.isSuperAdmin) {
    return NextResponse.json({ error: 'Abwesenheitsarten verwaltet der Super-Admin.' }, { status: 403 })
  }

  const body = await parseBody(request, artenSortierungSchema)
  if (body.error) return body.error

  const res = await callKalender(auth.supabase, ROUTE, 'abw_arten_sortieren', { p_ids: body.data.ids })
  if (res.error) return res.error
  return NextResponse.json({ ok: true })
}
