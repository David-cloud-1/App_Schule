import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin, ADMIN_DEPARTMENT_COOKIE } from '../../_lib/auth'

const Schema = z.object({ department_id: z.string().uuid() })

/**
 * Bereichs-Umschalter im Admin-Panel (PROJ-24) — nur der Super-Admin hat
 * mehrere Bereiche zur Auswahl. Setzt ein Cookie, das requireAdmin() bei
 * jeder folgenden Admin-Anfrage liest.
 */
export async function POST(request: NextRequest) {
  const auth = await requireAdmin()
  if (auth.error) return auth.error
  if (!auth.isSuperAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = Schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  const { data: dept } = await auth.supabase
    .from('departments')
    .select('id')
    .eq('id', parsed.data.department_id)
    .maybeSingle()
  if (!dept) {
    return NextResponse.json({ error: 'Fachbereich nicht gefunden' }, { status: 404 })
  }

  const response = NextResponse.json({ ok: true })
  response.cookies.set(ADMIN_DEPARTMENT_COOKIE, parsed.data.department_id, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  })
  return response
}
