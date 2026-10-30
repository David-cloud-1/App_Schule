import { NextResponse } from 'next/server'
import { requireTeacherOrAdmin } from '@/app/api/admin/_lib/auth'
import { createServiceClient } from '@/lib/supabase-server'
import { ausgabePfad, dateiVorhanden, downloadAdresse, fehler, ladeEigenenAblauf } from '@/lib/werkzeugkiste-server'

type Kontext = { params: Promise<{ id: string }> }

const DATEI_FEHLT = 'Die Datei ist nicht mehr vorhanden. Über „Überarbeiten“ neu erstellen.'

/**
 * GET /api/admin/werkzeugkiste/ablaeufe/:id/download (PROJ-51) — Weiterleitung
 * auf einen kurzlebigen Link zur fertigen Datei. Die Datei läuft nicht durch
 * die App (sie kann größer als 4,5 MB sein). Mit `?pruefen=1` kommt statt der
 * Weiterleitung `{ url }` als JSON zurück, damit die Oberfläche eine fehlende
 * Datei ruhig melden kann, statt eine Fehlerseite zu öffnen (PROJ-52, BUG-1).
 */
export async function GET(request: Request, { params }: Kontext) {
  const auth = await requireTeacherOrAdmin()
  if (auth.error) return auth.error
  const zeile = await ladeEigenenAblauf(auth.supabase, (await params).id)
  if (!zeile?.ergebnis) return fehler('Zu diesem Ablauf gibt es noch keine fertige Datei.', 404)

  const service = createServiceClient()
  const pfad = ausgabePfad(zeile.owner_id, zeile.id)
  if (!(await dateiVorhanden(service, pfad))) return fehler(DATEI_FEHLT, 404)
  const url = await downloadAdresse(service, pfad, zeile.ergebnis.dateiname)
  if (!url) return fehler(DATEI_FEHLT, 404)
  if (new URL(request.url).searchParams.get('pruefen') === '1') {
    return NextResponse.json({ url }, { headers: { 'Cache-Control': 'no-store' } })
  }
  return NextResponse.redirect(url, 302)
}
