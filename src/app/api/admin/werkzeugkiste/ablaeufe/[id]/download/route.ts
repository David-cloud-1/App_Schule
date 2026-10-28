import { NextResponse } from 'next/server'
import { requireTeacherOrAdmin } from '@/app/api/admin/_lib/auth'
import { createServiceClient } from '@/lib/supabase-server'
import { ausgabePfad, downloadAdresse, fehler, ladeEigenenAblauf } from '@/lib/werkzeugkiste-server'

type Kontext = { params: Promise<{ id: string }> }

/**
 * GET /api/admin/werkzeugkiste/ablaeufe/:id/download (PROJ-51) — Weiterleitung
 * auf einen kurzlebigen Link zur fertigen Datei. Die Datei läuft nicht durch
 * die App (sie kann größer als 4,5 MB sein).
 */
export async function GET(_request: Request, { params }: Kontext) {
  const auth = await requireTeacherOrAdmin()
  if (auth.error) return auth.error
  const zeile = await ladeEigenenAblauf(auth.supabase, (await params).id)
  if (!zeile?.ergebnis) return fehler('Zu diesem Ablauf gibt es noch keine fertige Datei.', 404)

  const url = await downloadAdresse(createServiceClient(), ausgabePfad(zeile.owner_id, zeile.id), zeile.ergebnis.dateiname)
  if (!url) return fehler('Die Datei ist nicht mehr vorhanden. Erstelle sie über „Antwort überarbeiten“ neu.', 404)
  return NextResponse.redirect(url, 302)
}
