import { requireTeacherOrAdmin } from '@/app/api/admin/_lib/auth'
import { fehler, ladeEigenenAblauf } from '@/lib/werkzeugkiste-server'
import { kuerzeTitel } from '@/lib/werkzeugkiste-materialien-server'

type Kontext = { params: Promise<{ id: string }> }

/** Dateiname aus dem Titel: Umlaute bleiben, alles Unsichere wird zum Unterstrich */
function dateiname(titel: string): string {
  const sauber = titel.replace(/[^\p{L}\p{N} ._-]+/gu, '_').replace(/\s+/g, '_').replace(/_+/g, '_').replace(/^[._]+|[._]+$/g, '')
  return `${sauber.slice(0, 80) || 'KI-Antwort'}.yaml`
}

/**
 * GET /api/admin/werkzeugkiste/ablaeufe/:id/antwort (PROJ-52) — die
 * gespeicherte KI-Antwort als .yaml-Datei, für Fortgeschrittene. Nur die
 * eigene (RLS); als Anhang ausgeliefert, nie als Seite.
 */
export async function GET(_request: Request, { params }: Kontext) {
  const auth = await requireTeacherOrAdmin()
  if (auth.error) return auth.error
  const zeile = await ladeEigenenAblauf(auth.supabase, (await params).id)
  if (!zeile?.antwort) return fehler('Zu diesem Material gibt es keine gespeicherte Antwort.', 404)

  const name = dateiname(kuerzeTitel(zeile.titel ?? zeile.ergebnis?.titel ?? zeile.datei_name ?? ''))
  return new Response(zeile.antwort, {
    headers: {
      'Content-Type': 'text/yaml; charset=utf-8',
      'Content-Disposition': `attachment; filename="${name.replace(/[^\x20-\x7e]/g, '_')}"; filename*=UTF-8''${encodeURIComponent(name)}`,
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'private, no-store',
    },
  })
}
