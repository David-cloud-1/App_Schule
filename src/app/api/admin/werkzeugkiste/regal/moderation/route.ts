import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireTeacherOrAdmin } from '@/app/api/admin/_lib/auth'
import { MODERATION_SEITE, type ModerationListe } from '@/lib/werkzeugkiste-regal'
import { moderationZeile, type ModerationRoh } from '@/lib/werkzeugkiste-regal-server'
import { fehler, ungueltig } from '@/lib/werkzeugkiste-server'

const seiteSchema = z.coerce.number().int().min(1).max(1000).default(1)

/**
 * GET /api/admin/werkzeugkiste/regal/moderation?seite= (PROJ-53, Paket 2) — alle
 * Freigaben mit Besitzer, Stufe und Ladezahl, nur für den Super-Admin. Alle
 * anderen bekommen 404 (die Datenbankfunktion prüft es zusätzlich selbst).
 */
export async function GET(request: Request) {
  const auth = await requireTeacherOrAdmin()
  if (auth.error) return auth.error
  if (!auth.isSuperAdmin) return fehler('Nicht gefunden.', 404)

  const seite = seiteSchema.safeParse(new URL(request.url).searchParams.get('seite') ?? undefined)
  if (!seite.success) return ungueltig(seite.error)

  const von = (seite.data - 1) * MODERATION_SEITE
  const { data, error } = await auth.supabase.rpc('regal_moderation_liste', { p_limit: MODERATION_SEITE, p_offset: von })
  if (error) return fehler('Die Übersicht konnte gerade nicht geladen werden.', 500)

  const zeilen = (Array.isArray(data) ? data : []) as ModerationRoh[]
  const eintraege = zeilen.map(moderationZeile)
  const gesamt = zeilen.length > 0 ? Number(zeilen[0].gesamt) || eintraege.length : 0
  const antwort: ModerationListe = { eintraege, gesamt, hatMehr: von + eintraege.length < gesamt }
  return NextResponse.json(antwort, { headers: { 'Cache-Control': 'no-store' } })
}
