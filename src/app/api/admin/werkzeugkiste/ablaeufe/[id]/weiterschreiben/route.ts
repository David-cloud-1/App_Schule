import { NextResponse } from 'next/server'
import { requireTeacherOrAdmin } from '@/app/api/admin/_lib/auth'
import { createServiceClient } from '@/lib/supabase-server'
import { hatTeilWeg } from '@/lib/werkzeugkiste'
import {
  aktualisiere,
  einlesungPfad,
  fehler,
  kern,
  kernFehlerAntwort,
  ladeEigenenAblauf,
  leseAdresse,
  zeileZuAblauf,
} from '@/lib/werkzeugkiste-server'
import { teilKapitel } from '@/lib/werkzeugkiste-teile-server'

export const maxDuration = 90

type Kontext = { params: Promise<{ id: string }> }

/**
 * POST /api/admin/werkzeugkiste/ablaeufe/:id/weiterschreiben (PROJ-69) — für eine Antwort ohne
 * Teile (kurzes Skript), die trotzdem mittendrin abgebrochen ist. Der Kern behält die
 * vollständigen Kapitel, die Antwort des Ablaufs wird darauf gekürzt, und die Lehrkraft
 * bekommt den Weiterschreib-Prompt (nennt der KI die fertigen Kapitel). Die Antwort darauf
 * kommt über …/fortsetzung und wird hinten angehängt.
 *
 * Nur für Antworten, die die Prüfung als abgeschnitten gemeldet hat: Eine vollständige
 * Antwort würde dabei ihr Abschlusskapitel verlieren.
 */
export async function POST(_request: Request, { params }: Kontext) {
  const auth = await requireTeacherOrAdmin()
  if (auth.error) return auth.error
  const zeile = await ladeEigenenAblauf(auth.supabase, (await params).id)
  if (!zeile) return fehler('Diesen Ablauf gibt es nicht mehr.', 404)
  if (zeile.teile) return fehler('Dieser Ablauf ist in Teile geteilt. Schreibe den Teil weiter, der abgeschnitten ist.', 400)
  if (zeile.status === 'fertig') return fehler('Dieses Material ist fertig.', 400)
  if (!hatTeilWeg(zeile.werkzeug)) return fehler('Für dieses Werkzeug gibt es kein Weiterschreiben.', 400)
  if (!zeile.antwort || !zeile.pruefung?.abgeschnitten) return fehler('Diese Antwort ist vollständig, es gibt nichts weiterzuschreiben.', 400)

  const service = createServiceClient()
  const einlesung = await leseAdresse(service, einlesungPfad(zeile.owner_id, zeile.id))
  if (!einlesung) return fehler('Das eingelesene Skript fehlt. Bitte lade es erneut hoch.', 400)
  const ablauf = zeileZuAblauf(zeile)
  const runde = zeile.pruefung.abgeschnitten.runde + 1

  try {
    const gerettet = await kern<{ antwort: string; kapitel: number }>('/api/retten', { antwort: zeile.antwort })
    const liste = await kern<{ kapitel: string[] }>('/api/kapitel-liste', { antwort: gerettet.antwort })
    const kapitel = teilKapitel(liste.kapitel ?? [])
    const r = await kern<{ prompt: string }>('/api/prompt', {
      einlesung: { url: einlesung },
      werkzeug: ablauf.werkzeug,
      einstellungen: ablauf.einstellungen,
      auswahl: ablauf.auswahl,
      teil: { nr: 1, von: 1, fertig: kapitel },
    })
    const neu = await aktualisiere(auth.supabase, zeile.id, {
      antwort: gerettet.antwort,
      pruefung: {
        lesbar: true,
        fehler: null,
        befunde: [],
        korrekturen: 0,
        nachbesserungsPrompt: null,
        abgeschnitten: { kapitel, rettbar: true, runde },
      },
    })
    if (!neu) return fehler('Die gekürzte Antwort konnte nicht gespeichert werden.', 500)
    return NextResponse.json({
      ablauf: zeileZuAblauf(neu),
      prompt: r.prompt,
      kapitel,
      runde,
      // Ab dem zweiten Mal: ein kleinerer Abschnitt in Schritt 1 hilft mehr als noch eine Runde
      tippKleiner: runde >= 2,
    })
  } catch (e) {
    return kernFehlerAntwort(e)
  }
}
