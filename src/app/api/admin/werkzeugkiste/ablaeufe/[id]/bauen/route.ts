import { NextResponse } from 'next/server'
import { requireTeacherOrAdmin } from '@/app/api/admin/_lib/auth'
import { createServiceClient } from '@/lib/supabase-server'
import type { AblaufErgebnis } from '@/lib/werkzeugkiste'
import {
  aktualisiere,
  ausgabePfad,
  einlesungPfad,
  fehler,
  kern,
  kernFehlerAntwort,
  ladeEigenenAblauf,
  leseAdresse,
  schreibAdresse,
  vorschauPfad,
  zeileZuAblauf,
} from '@/lib/werkzeugkiste-server'

export const maxDuration = 120

type Kontext = { params: Promise<{ id: string }> }

/**
 * POST /api/admin/werkzeugkiste/ablaeufe/:id/bauen (PROJ-51) — der Kern baut
 * aus der geprüften Antwort und den Bildern der Einlesung die Datei und die
 * Vorschau und legt beide im Speicher ab.
 */
export async function POST(_request: Request, { params }: Kontext) {
  const auth = await requireTeacherOrAdmin()
  if (auth.error) return auth.error
  const zeile = await ladeEigenenAblauf(auth.supabase, (await params).id)
  if (!zeile) return fehler('Diesen Ablauf gibt es nicht mehr.', 404)
  if (!zeile.antwort || !zeile.pruefung) return fehler('Füge zuerst die Antwort der KI ein.', 400)
  if (!zeile.pruefung.lesbar) return fehler('Die Antwort ist unvollständig und lässt sich nicht verarbeiten.', 400)

  const service = createServiceClient()
  const [einlesung, dateiZiel, vorschauZiel] = await Promise.all([
    leseAdresse(service, einlesungPfad(zeile.owner_id, zeile.id)),
    schreibAdresse(service, ausgabePfad(zeile.owner_id, zeile.id)),
    schreibAdresse(service, vorschauPfad(zeile.owner_id, zeile.id)),
  ])
  if (!einlesung) return fehler('Das eingelesene Skript fehlt. Bitte lade es erneut hoch.', 400)
  if (!dateiZiel || !vorschauZiel) return fehler('Das Ablegen der Datei konnte nicht vorbereitet werden.', 502)

  const ablauf = zeileZuAblauf(zeile)
  try {
    const r = await kern<AblaufErgebnis>('/api/bauen', {
      antwort: zeile.antwort,
      werkzeug: ablauf.werkzeug,
      einstellungen: ablauf.einstellungen,
      einlesung: { url: einlesung },
      datei_ziel: dateiZiel,
      vorschau_ziel: vorschauZiel,
    })
    const ergebnis: AblaufErgebnis = {
      titel: String(r.titel),
      dateiname: String(r.dateiname),
      format: String(r.format),
      kapitel: Number(r.kapitel) || 0,
      aufgaben: Number(r.aufgaben) || 0,
    }
    const neu = await aktualisiere(auth.supabase, zeile.id, { ergebnis, status: 'fertig', schritt: 5 })
    if (!neu) return fehler('Das Ergebnis konnte nicht gespeichert werden.', 500)
    return NextResponse.json({ ablauf: zeileZuAblauf(neu) })
  } catch (e) {
    return kernFehlerAntwort(e)
  }
}
