import { NextRequest, NextResponse } from 'next/server'
import { requireTeacherOrAdmin } from '../../_lib/auth'
import { ueberschneidungQuerySchema } from '@/lib/kalender'
import { NO_STORE, callKalender } from '../_lib/kalender-api'

const ROUTE = 'api/admin/kalender/ueberschneidungen'

/** Bestehende Einträge derselben Person im Zeitraum (Hinweis im Formular). */
export async function GET(request: NextRequest) {
  const auth = await requireTeacherOrAdmin()
  if (auth.error) return auth.error

  const parsed = ueberschneidungQuerySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams.entries()))
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Ungültige Angaben.' }, { status: 400 })
  }
  const q = parsed.data

  const res = await callKalender<unknown[]>(auth.supabase, ROUTE, 'abw_ueberschneidungen', {
    p_person_id: q.person,
    p_von: q.von,
    p_bis: q.bis,
    p_ausser: q.ausser ?? null,
  })
  if (res.error) return res.error
  return NextResponse.json({ items: res.data ?? [] }, { headers: NO_STORE })
}
