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
  ungueltig,
  zeileZuAblauf,
} from '@/lib/werkzeugkiste-server'
import {
  fortsetzungSchema,
  type KernPruefung,
  type KernTeilPruefung,
  pruefungAusKern,
  teilKapitel,
} from '@/lib/werkzeugkiste-teile-server'

export const maxDuration = 90

type Kontext = { params: Promise<{ id: string }> }

const GESAMT_MAX = 2_000_000

/**
 * POST /api/admin/werkzeugkiste/ablaeufe/:id/fortsetzung (PROJ-69) — die Antwort der KI auf den
 * Weiterschreib-Prompt (Ablauf ohne Teile). Sie wird hinten an die gekürzte Antwort gehängt und
 * die Gesamtantwort sofort geprüft. Ist auch sie abgeschnitten, bleiben ihre vollständigen
 * Kapitel erhalten, und die Lehrkraft holt den Rest in einer weiteren Runde nach.
 */
export async function POST(request: Request, { params }: Kontext) {
  const auth = await requireTeacherOrAdmin()
  if (auth.error) return auth.error
  const parsed = fortsetzungSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return ungueltig(parsed.error)

  const zeile = await ladeEigenenAblauf(auth.supabase, (await params).id)
  if (!zeile) return fehler('Diesen Ablauf gibt es nicht mehr.', 404)
  if (zeile.teile) return fehler('Dieser Ablauf ist in Teile geteilt. Füge die Antwort beim Teil ein.', 400)
  if (zeile.status === 'fertig') return fehler('Dieses Material ist fertig.', 400)
  const stand = zeile.pruefung?.abgeschnitten
  if (!hatTeilWeg(zeile.werkzeug) || !zeile.antwort || !stand) {
    return fehler('Es gibt nichts weiterzuschreiben.', 400)
  }

  const service = createServiceClient()
  const einlesung = await leseAdresse(service, einlesungPfad(zeile.owner_id, zeile.id))
  if (!einlesung) return fehler('Das eingelesene Skript fehlt. Bitte lade es erneut hoch.', 400)
  const ablauf = zeileZuAblauf(zeile)

  try {
    const check = await kern<KernTeilPruefung>('/api/teil-pruefen', { antwort: parsed.data.antwort, werkzeug: ablauf.werkzeug })
    const brauchbar = check.gerettet ?? (check.vollstaendig && check.lesbar ? parsed.data.antwort : null)
    if (!brauchbar) {
      return NextResponse.json({
        uebernommen: false,
        fehler: 'Aus dieser Antwort ließ sich kein vollständiges Kapitel übernehmen. Frage den Rest noch einmal an.',
      })
    }
    const z = await kern<{ antwort: string }>('/api/zusammenfuegen', { antworten: [zeile.antwort, brauchbar], werkzeug: ablauf.werkzeug })
    if (!z.antwort || z.antwort.length > GESAMT_MAX) return fehler('Die zusammengefügte Antwort ist zu lang.', 400)

    const p = await kern<KernPruefung>('/api/pruefen', {
      antwort: z.antwort,
      werkzeug: ablauf.werkzeug,
      einstellungen: ablauf.einstellungen,
      auswahl: ablauf.auswahl,
      einlesung: { url: einlesung },
    })
    const kapitel = teilKapitel([...stand.kapitel, ...check.kapitel])
    const neu = await aktualisiere(auth.supabase, zeile.id, {
      antwort: z.antwort,
      pruefung: {
        ...pruefungAusKern(p),
        ...(check.vollstaendig ? {} : { abgeschnitten: { kapitel, rettbar: true, runde: stand.runde } }),
      },
      schritt: Math.max(zeile.schritt, 4),
    })
    if (!neu) return fehler('Die Antwort konnte nicht gespeichert werden.', 500)
    return NextResponse.json({ uebernommen: true, ablauf: zeileZuAblauf(neu), tippKleiner: !check.vollstaendig })
  } catch (e) {
    return kernFehlerAntwort(e)
  }
}
