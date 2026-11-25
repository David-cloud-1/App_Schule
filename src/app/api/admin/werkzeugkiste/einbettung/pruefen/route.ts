import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireTeacherOrAdmin } from '@/app/api/admin/_lib/auth'
import { ungueltig } from '@/lib/werkzeugkiste-server'
import { PRUEF_MAX_LINKS, pruefeErreichbar } from '@/lib/werkzeugkiste-einbettung-server'

const eingabeSchema = z
  .object({ urls: z.array(z.string().max(2000)).min(1).max(PRUEF_MAX_LINKS) })
  .strict()

/**
 * POST /api/admin/werkzeugkiste/einbettung/pruefen (PROJ-109) — Ist der Link eines Einbett-Blocks erreichbar?
 *   {urls: [...]} → {ergebnisse: [{url, status: 'ok' | 'nicht_erreichbar' | 'nicht_geprueft'}]}
 * Geprüft werden nur Anbieter der Liste; alles andere ist „nicht_geprueft“ (kein Abruf).
 */
export async function POST(request: Request) {
  const auth = await requireTeacherOrAdmin()
  if (auth.error) return auth.error
  const eingabe = eingabeSchema.safeParse(await request.json().catch(() => null))
  if (!eingabe.success) return ungueltig(eingabe.error)
  const urls = [...new Set(eingabe.data.urls)]
  const ergebnisse = await Promise.all(urls.map(async (url) => ({ url, status: await pruefeErreichbar(url) })))
  return NextResponse.json({ ergebnisse })
}
