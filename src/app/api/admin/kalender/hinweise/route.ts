import { NextRequest, NextResponse } from 'next/server'
import { requireTeacherOrAdmin } from '../../_lib/auth'
import { hinweisGesehenSchema, type KalenderHinweis } from '@/lib/kalender'
import { NO_STORE, callKalender, parseBody } from '../_lib/kalender-api'

const ROUTE = 'api/admin/kalender/hinweise'

/** Eigene, ungesehene Hinweise der letzten 14 Tage („Neu für dich“). */
export async function GET() {
  const auth = await requireTeacherOrAdmin()
  if (auth.error) return auth.error

  const res = await callKalender<KalenderHinweis[]>(auth.supabase, ROUTE, 'abw_hinweise')
  if (res.error) return res.error
  return NextResponse.json({ items: res.data ?? [] }, { headers: NO_STORE })
}

/** Hinweis wegklicken („Okay“); ohne `id` alle eigenen. */
export async function POST(request: NextRequest) {
  const auth = await requireTeacherOrAdmin()
  if (auth.error) return auth.error

  const body = await parseBody(request, hinweisGesehenSchema)
  if (body.error) return body.error

  const res = await callKalender(auth.supabase, ROUTE, 'abw_hinweis_gesehen', { p_id: body.data.id ?? null })
  if (res.error) return res.error
  return NextResponse.json({ ok: true })
}
