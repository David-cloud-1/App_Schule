import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import {
  requireContentAdmin,
  ADMIN_SCOPE_COOKIE,
  ADMIN_DEPARTMENT_COOKIE,
  SCOPE_ALL,
} from '../../_lib/auth'

const Schema = z.object({
  /** „alle“ oder die ID eines Fachbereichs */
  bereich: z.union([z.literal(SCOPE_ALL), z.string().uuid()]),
})

const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 60 * 60 * 24 * 30,
}

/**
 * Bereichsleiste (PROJ-70): setzt, welchen Bereich die Inhalts-Seiten zeigen.
 * Jede Lehrer-Rolle darf wählen. Wählt jemand einen konkreten Bereich, folgt
 * der Super-Admin damit auch den Seiten, die genau einen Bereich brauchen
 * (Hof-Items, Bereich-Einstellungen) — „Alle Bereiche“ lässt das alte Cookie
 * unberührt, weil dort kein einzelner Bereich gemeint ist.
 */
export async function POST(request: NextRequest) {
  const auth = await requireContentAdmin()
  if (auth.error) return auth.error

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

  const { bereich } = parsed.data
  if (bereich !== SCOPE_ALL && !auth.departmentIds.includes(bereich)) {
    return NextResponse.json({ error: 'Fachbereich nicht gefunden' }, { status: 404 })
  }

  const response = NextResponse.json({ ok: true, bereich })
  response.cookies.set(ADMIN_SCOPE_COOKIE, bereich, COOKIE_OPTIONS)
  if (bereich !== SCOPE_ALL && auth.isSuperAdmin) {
    response.cookies.set(ADMIN_DEPARTMENT_COOKIE, bereich, COOKIE_OPTIONS)
  }
  return response
}
