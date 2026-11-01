import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireTeacherOrAdmin } from '@/app/api/admin/_lib/auth'
import { createServiceClient } from '@/lib/supabase-server'
import { ausgabePfad, dateiVorhanden, downloadAdresse, fehler } from '@/lib/werkzeugkiste-server'

type Kontext = { params: Promise<{ id: string }> }

const NICHT_GEFUNDEN = 'Dieses Material gibt es nicht mehr oder du darfst es nicht sehen.'
const DATEI_FEHLT = 'Die Datei ist nicht mehr vorhanden. Bitte die Besitzerin oder den Besitzer, das Material neu zu erstellen.'

/**
 * GET /api/admin/werkzeugkiste/regal/:id/download (PROJ-53) — fertige Datei
 * aus dem Regal. Die Datenbankfunktion prüft die Sichtbarkeit (sonst 404,
 * auch für Material, das es gar nicht gibt), zählt höchstens einmal je
 * Person und Tag (eigene Downloads nie) und nennt nur, was für die
 * kurzlebige Adresse nötig ist. Die Datei läuft nie durch die App. Mit
 * `?pruefen=1` kommt `{ url }` als JSON, damit die Oberfläche eine fehlende
 * Datei ruhig melden kann.
 */
export async function GET(request: Request, { params }: Kontext) {
  const auth = await requireTeacherOrAdmin()
  if (auth.error) return auth.error

  const id = (await params).id
  if (!z.string().uuid().safeParse(id).success) return fehler(NICHT_GEFUNDEN, 404)

  const { data, error } = await auth.supabase.rpc('regal_download_vorbereiten', { p_freigabe_id: id })
  if (error) return fehler('Das hat gerade nicht geklappt. Bitte versuche es erneut.', 500)
  const zeile = (Array.isArray(data) ? data[0] : null) as { ablauf_id: string; owner_id: string; dateiname: string | null } | null
  if (!zeile || !zeile.dateiname) return fehler(NICHT_GEFUNDEN, 404)

  const service = createServiceClient()
  const pfad = ausgabePfad(zeile.owner_id, zeile.ablauf_id)
  if (!(await dateiVorhanden(service, pfad))) return fehler(DATEI_FEHLT, 404)
  const url = await downloadAdresse(service, pfad, zeile.dateiname)
  if (!url) return fehler(DATEI_FEHLT, 404)
  if (new URL(request.url).searchParams.get('pruefen') === '1') {
    return NextResponse.json({ url }, { headers: { 'Cache-Control': 'no-store' } })
  }
  return NextResponse.redirect(url, 302)
}
