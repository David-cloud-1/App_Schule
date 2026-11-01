import { NextResponse } from 'next/server'
import { requireTeacherOrAdmin } from '@/app/api/admin/_lib/auth'
import type { RegalFilterwerte, RegalListe } from '@/lib/werkzeugkiste-regal'
import { REGAL_LIMIT, regalAbfrageSchema, zeileZuKarte, type RegalZeile } from '@/lib/werkzeugkiste-regal-server'
import { fehler, ungueltig } from '@/lib/werkzeugkiste-server'

/**
 * GET /api/admin/werkzeugkiste/regal (PROJ-53) — das Regal des Kollegiums:
 * eine Seite schmaler Karten (nie Skript, Prompt oder Antwort) mit Suche,
 * Fach- und Werkzeugfilter und Sortierung. Wer was sieht, entscheidet allein
 * die Datenbankfunktion regal_liste. Bei der ersten Seite kommen die
 * Filterwerte (nur, was im sichtbaren Regal vorkommt) mit.
 */
export async function GET(request: Request) {
  const auth = await requireTeacherOrAdmin()
  if (auth.error) return auth.error

  const params = new URL(request.url).searchParams
  const parsed = regalAbfrageSchema.safeParse({
    suche: params.get('suche') ?? undefined,
    fach: params.get('fach') || undefined,
    werkzeug: params.get('werkzeug') || undefined,
    sortierung: params.get('sortierung') ?? undefined,
    seite: params.get('seite') ?? undefined,
  })
  if (!parsed.success) return ungueltig(parsed.error)
  const { suche, fach, werkzeug, sortierung, seite } = parsed.data

  const von = (seite - 1) * REGAL_LIMIT
  const { data, error } = await auth.supabase.rpc('regal_liste', {
    p_suche: suche,
    p_fach: fach ?? null,
    p_werkzeug: werkzeug ?? null,
    p_sort: sortierung,
    p_limit: REGAL_LIMIT,
    p_offset: von,
  })
  if (error) return fehler('Das Regal konnte gerade nicht geladen werden.', 500)

  const zeilen = (Array.isArray(data) ? data : []) as RegalZeile[]
  const eintraege = zeilen.map(zeileZuKarte)
  const gesamt = zeilen.length > 0 ? Number(zeilen[0].gesamt) || eintraege.length : 0

  const antwort: RegalListe = { eintraege, gesamt, hatMehr: von + eintraege.length < gesamt }
  // Nur der Super-Admin bekommt die Moderationsansicht (die Schnittstellen dafür prüfen es selbst noch einmal)
  if (seite === 1 && auth.isSuperAdmin) antwort.moderation = true

  if (seite === 1) {
    const { data: werte } = await auth.supabase.rpc('regal_filterwerte')
    const filter: RegalFilterwerte = { faecher: [], werkzeuge: [] }
    for (const w of (Array.isArray(werte) ? werte : []) as { art: string; schluessel: string; bezeichnung: string }[]) {
      if (w.art === 'fach') filter.faecher.push({ id: w.schluessel, name: w.bezeichnung })
      else if (w.art === 'werkzeug') filter.werkzeuge.push(w.schluessel)
    }
    filter.faecher.sort((a, b) => a.name.localeCompare(b.name, 'de'))
    antwort.filter = filter
  }

  return NextResponse.json(antwort, { headers: { 'Cache-Control': 'no-store' } })
}
