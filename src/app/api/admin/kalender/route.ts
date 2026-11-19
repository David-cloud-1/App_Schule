import { NextRequest, NextResponse } from 'next/server'
import { requireTeacherOrAdmin } from '../_lib/auth'
import { abwesenheitInputSchema, listeQuerySchema, type Abwesenheit } from '@/lib/kalender'
import { NO_STORE, callKalender, eintragParams, parseBody } from './_lib/kalender-api'

const ROUTE = 'api/admin/kalender'

/** Einträge eines Zeitraums mit Filtern (PROJ-120). */
export async function GET(request: NextRequest) {
  const auth = await requireTeacherOrAdmin()
  if (auth.error) return auth.error

  const parsed = listeQuerySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams.entries()))
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Ungültige Filter.' }, { status: 400 })
  }
  const q = parsed.data

  // Eine Zeile mehr holen, um „Mehr laden“ ohne zweite Abfrage zu erkennen.
  const limit = Math.min(q.limit, 499)
  const res = await callKalender<Abwesenheit[]>(auth.supabase, ROUTE, 'abw_liste', {
    p_von: q.von,
    p_bis: q.bis,
    p_abteilung: q.abteilung ?? null,
    p_status: q.status ?? null,
    p_art_id: q.art ?? null,
    p_suche: q.q || null,
    p_limit: limit + 1,
    p_offset: q.offset,
  })
  if (res.error) return res.error

  const rows = res.data ?? []
  return NextResponse.json({ items: rows.slice(0, limit), hasMore: rows.length > limit }, { headers: NO_STORE })
}

/** Abwesenheit anlegen (für sich oder für andere). */
export async function POST(request: NextRequest) {
  const auth = await requireTeacherOrAdmin()
  if (auth.error) return auth.error

  const body = await parseBody(request, abwesenheitInputSchema)
  if (body.error) return body.error

  const res = await callKalender<string>(auth.supabase, ROUTE, 'abw_anlegen', eintragParams(body.data))
  if (res.error) return res.error
  return NextResponse.json({ id: res.data }, { status: 201 })
}
