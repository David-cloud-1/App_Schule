import { after, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServiceClient } from '@/lib/supabase-server'
import { internErlaubt, schliesseAb } from '@/lib/werkzeugkiste-direkt'

export const maxDuration = 300

/**
 * POST /api/intern/werkzeugkiste/abschluss (PROJ-64) — Arbeiter, der die Teile
 * zusammenfügt, prüft und die Datei baut. Nur für die App selbst; quittiert
 * sofort mit 202.
 */
export async function POST(request: Request) {
  if (!internErlaubt(request)) return NextResponse.json({ error: 'nicht erlaubt' }, { status: 401 })
  const parsed = z.object({ id: z.string().uuid() }).safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Ungültige Eingabe.' }, { status: 400 })
  after(() => schliesseAb(createServiceClient(), parsed.data.id))
  return NextResponse.json({ ok: true }, { status: 202 })
}
