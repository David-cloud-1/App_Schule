import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireTeacherOrAdmin } from '@/app/api/admin/_lib/auth'
import { LINK_ADMIN_SEITE, type LinkAdminListe } from '@/lib/werkzeugkiste-links'
import { linkAdminZeile, type LinkAdminRoh } from '@/lib/werkzeugkiste-links-server'
import { fehler, ungueltig } from '@/lib/werkzeugkiste-server'

const seiteSchema = z.coerce.number().int().min(1).max(1000).default(1)

/**
 * GET /api/admin/werkzeugkiste/links?seite= (PROJ-67) — alle aktiven
 * öffentlichen Links mit Besitzer und Aufrufen, nur für den Super-Admin. Alle
 * anderen bekommen 404 (die Datenbankfunktion prüft es zusätzlich selbst).
 */
export async function GET(request: Request) {
  const auth = await requireTeacherOrAdmin()
  if (auth.error) return auth.error
  if (!auth.isSuperAdmin) return fehler('Nicht gefunden.', 404)

  const seite = seiteSchema.safeParse(new URL(request.url).searchParams.get('seite') ?? undefined)
  if (!seite.success) return ungueltig(seite.error)

  const von = (seite.data - 1) * LINK_ADMIN_SEITE
  const { data, error } = await auth.supabase.rpc('link_admin_liste', { p_limit: LINK_ADMIN_SEITE, p_offset: von })
  if (error) return fehler('Die Übersicht konnte gerade nicht geladen werden.', 500)

  const zeilen = (Array.isArray(data) ? data : []) as LinkAdminRoh[]
  const eintraege = zeilen.map(linkAdminZeile)
  const gesamt = zeilen.length > 0 ? Number(zeilen[0].gesamt) || eintraege.length : 0
  const antwort: LinkAdminListe = { eintraege, gesamt, hatMehr: von + eintraege.length < gesamt }
  return NextResponse.json(antwort, { headers: { 'Cache-Control': 'no-store' } })
}
