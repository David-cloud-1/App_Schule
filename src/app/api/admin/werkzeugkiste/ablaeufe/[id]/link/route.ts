import { NextResponse } from 'next/server'
import { requireTeacherOrAdmin } from '@/app/api/admin/_lib/auth'
import { fehler, ladeEigenenAblauf } from '@/lib/werkzeugkiste-server'
import { fehlerAusFunktion } from '@/lib/werkzeugkiste-regal-server'
import { linkZuStand } from '@/lib/werkzeugkiste-links-server'

type Kontext = { params: Promise<{ id: string }> }

const NICHT_GEFUNDEN = 'Dieses Material gibt es nicht mehr.'

/**
 * Öffentlicher Link eines eigenen Materials (PROJ-67). Nur die Besitzerin oder
 * der Besitzer, nur fertige Interaktive Seiten. Alle Prüfungen (Besitz, Format,
 * höchstens ein aktiver Link) liegen in den Datenbankfunktionen.
 *
 *   GET     aktueller Link (`link: null` = keiner)
 *   POST    Link erzeugen; gibt es schon einen aktiven, kommt dieser zurück
 *   DELETE  Link abschalten (wirkt sofort, der Code bleibt tot)
 */
async function eigenesMaterial(auth: Extract<Awaited<ReturnType<typeof requireTeacherOrAdmin>>, { error: null }>, id: string) {
  const zeile = await ladeEigenenAblauf(auth.supabase, id)
  return zeile && zeile.owner_id === auth.user.id ? zeile : null
}

export async function GET(_request: Request, { params }: Kontext) {
  const auth = await requireTeacherOrAdmin()
  if (auth.error) return auth.error
  const id = (await params).id
  if (!(await eigenesMaterial(auth, id))) return fehler(NICHT_GEFUNDEN, 404)

  const { data, error } = await auth.supabase.rpc('link_lesen', { p_ablauf_id: id })
  if (error) return fehlerAusFunktion(error)
  return NextResponse.json({ link: linkZuStand(data) }, { headers: { 'Cache-Control': 'no-store' } })
}

export async function POST(_request: Request, { params }: Kontext) {
  const auth = await requireTeacherOrAdmin()
  if (auth.error) return auth.error
  const id = (await params).id
  if (!(await eigenesMaterial(auth, id))) return fehler(NICHT_GEFUNDEN, 404)

  const { data, error } = await auth.supabase.rpc('link_erzeugen', { p_ablauf_id: id })
  if (error) return fehlerAusFunktion(error)
  const link = linkZuStand(data)
  if (!link) return fehler('Das hat gerade nicht geklappt. Bitte versuche es erneut.', 500)
  return NextResponse.json({ link }, { headers: { 'Cache-Control': 'no-store' } })
}

export async function DELETE(_request: Request, { params }: Kontext) {
  const auth = await requireTeacherOrAdmin()
  if (auth.error) return auth.error
  const id = (await params).id
  if (!(await eigenesMaterial(auth, id))) return fehler(NICHT_GEFUNDEN, 404)

  const { error } = await auth.supabase.rpc('link_abschalten', { p_ablauf_id: id })
  if (error) return fehlerAusFunktion(error)
  return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } })
}
