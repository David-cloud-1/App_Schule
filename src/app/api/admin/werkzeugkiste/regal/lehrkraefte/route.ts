import { NextResponse } from 'next/server'
import { requireTeacherOrAdmin } from '@/app/api/admin/_lib/auth'
import { fehler } from '@/lib/werkzeugkiste-server'

/**
 * GET /api/admin/werkzeugkiste/regal/lehrkraefte?suche= (PROJ-53) — Personensuche
 * im Teilen-Dialog. Liefert nur Lehrer-Rollen und nur Name und Kennung, nie
 * die E-Mail-Adresse und nie Azubis (die Datenbankfunktion erzwingt das).
 */
export async function GET(request: Request) {
  const auth = await requireTeacherOrAdmin()
  if (auth.error) return auth.error

  const suche = (new URL(request.url).searchParams.get('suche') ?? '').trim().slice(0, 60)
  if (suche.length < 2) return NextResponse.json({ lehrkraefte: [] })

  const { data, error } = await auth.supabase.rpc('regal_lehrkraefte', { p_suche: suche })
  if (error) return fehler('Die Suche hat gerade nicht geklappt.', 500)
  const lehrkraefte = ((Array.isArray(data) ? data : []) as { id: string; name: string }[]).map((l) => ({ id: l.id, name: l.name }))
  return NextResponse.json({ lehrkraefte }, { headers: { 'Cache-Control': 'no-store' } })
}
