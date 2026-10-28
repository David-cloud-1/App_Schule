import { requireTeacherOrAdmin } from '@/app/api/admin/_lib/auth'
import { createServiceClient } from '@/lib/supabase-server'
import { fehler, ladeEigenenAblauf, vorschauPfad, WK_BUCKET } from '@/lib/werkzeugkiste-server'

type Kontext = { params: Promise<{ id: string }> }

/**
 * GET /api/admin/werkzeugkiste/ablaeufe/:id/vorschau (PROJ-51) — die Vorschau
 * als HTML. Sie enthält Text aus der KI-Antwort: deshalb ohne Skripte (CSP)
 * und in der Oberfläche nur in einem abgeschotteten iframe (sandbox, srcdoc).
 */
export async function GET(_request: Request, { params }: Kontext) {
  const auth = await requireTeacherOrAdmin()
  if (auth.error) return auth.error
  const zeile = await ladeEigenenAblauf(auth.supabase, (await params).id)
  if (!zeile?.ergebnis) return fehler('Zu diesem Ablauf gibt es noch keine Vorschau.', 404)

  const { data, error } = await createServiceClient()
    .storage.from(WK_BUCKET)
    .download(vorschauPfad(zeile.owner_id, zeile.id))
  if (error || !data) return fehler('Die Vorschau ist nicht mehr vorhanden.', 404)

  return new Response(await data.text(), {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; img-src data:; sandbox",
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'private, no-store',
    },
  })
}
