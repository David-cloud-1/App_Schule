import { after, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServiceClient } from '@/lib/supabase-server'
import { bearbeiteTeil, internErlaubt } from '@/lib/werkzeugkiste-direkt'

export const maxDuration = 300

/**
 * POST /api/intern/werkzeugkiste/teil (PROJ-64) — Arbeiter für einen Teil der
 * direkten Erstellung. Nur für die App selbst (Geheimnis im Kopf). Quittiert
 * sofort mit 202 und arbeitet danach weiter (KI-Aufruf bis ~4 Minuten).
 */
export async function POST(request: Request) {
  if (!internErlaubt(request)) return NextResponse.json({ error: 'nicht erlaubt' }, { status: 401 })
  const parsed = z.object({ id: z.string().uuid() }).safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Ungültige Eingabe.' }, { status: 400 })
  const origin = new URL(request.url).origin
  after(() => bearbeiteTeil(createServiceClient(), origin, parsed.data.id))
  return NextResponse.json({ ok: true }, { status: 202 })
}
