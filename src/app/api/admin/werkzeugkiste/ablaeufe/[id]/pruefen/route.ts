import { NextResponse } from 'next/server'
import { requireTeacherOrAdmin } from '@/app/api/admin/_lib/auth'
import { createServiceClient } from '@/lib/supabase-server'
import { hatTeilWeg, type AblaufAbbruch } from '@/lib/werkzeugkiste'
import {
  aktualisiere,
  antwortSchema,
  einlesungPfad,
  fehler,
  kern,
  kernFehlerAntwort,
  ladeEigenenAblauf,
  leseAdresse,
  ungueltig,
  zeileZuAblauf,
} from '@/lib/werkzeugkiste-server'
import { abbruchAusKern, type KernPruefung, type KernTeilPruefung, pruefungAusKern } from '@/lib/werkzeugkiste-teile-server'

export const maxDuration = 60

type Kontext = { params: Promise<{ id: string }> }

/**
 * POST /api/admin/werkzeugkiste/ablaeufe/:id/pruefen (PROJ-51) — Prüfstelle
 * ohne KI. Speichert Antwort und Ergebnis; blockiert nie, nur eine unlesbare
 * Antwort (`lesbar: false`) sperrt in der Oberfläche das Bauen.
 */
export async function POST(request: Request, { params }: Kontext) {
  const auth = await requireTeacherOrAdmin()
  if (auth.error) return auth.error

  const parsed = antwortSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return ungueltig(parsed.error)

  const zeile = await ladeEigenenAblauf(auth.supabase, (await params).id)
  if (!zeile) return fehler('Diesen Ablauf gibt es nicht mehr.', 404)
  // Eine Kopie aus dem Regal hat keinen Prompt (PROJ-53); alle anderen brauchen zuerst den Prompt
  const ausRegal = !!zeile.herkunft_name
  if (!ausRegal && (!zeile.kennzahlen || (!zeile.prompt && !zeile.teile))) return fehler('Erstelle zuerst den Prompt.', 400)

  const einlesung = await leseAdresse(createServiceClient(), einlesungPfad(zeile.owner_id, zeile.id))
  if (!einlesung) return fehler('Das eingelesene Skript fehlt. Bitte lade es erneut hoch.', 400)

  const ablauf = zeileZuAblauf(zeile)
  try {
    const pruefung = await kern<KernPruefung>('/api/pruefen', {
      antwort: parsed.data.antwort,
      werkzeug: ablauf.werkzeug,
      einstellungen: ablauf.einstellungen,
      auswahl: ablauf.auswahl,
      einlesung: { url: einlesung },
    })
    // PROJ-69: Wirkt die Antwort abgeschnitten? (Ganzes Skript und Kreativ, die langen Antworten.)
    // Best effort: Fällt diese Zusatzfrage aus, gilt die Prüfung trotzdem.
    let abgeschnitten: AblaufAbbruch | null = null
    if (hatTeilWeg(ablauf.werkzeug) && !ausRegal) {
      try {
        abgeschnitten = abbruchAusKern(
          await kern<KernTeilPruefung>('/api/teil-pruefen', { antwort: parsed.data.antwort, werkzeug: ablauf.werkzeug }),
          0,
        )
      } catch {
        abgeschnitten = null
      }
    }
    const neu = await aktualisiere(auth.supabase, zeile.id, {
      antwort: parsed.data.antwort,
      pruefung: { ...pruefungAusKern(pruefung, ausRegal), ...(abgeschnitten ? { abgeschnitten } : {}) },
      schritt: Math.max(zeile.schritt, 4),
    })
    if (!neu) return fehler('Die Prüfung konnte nicht gespeichert werden.', 500)
    return NextResponse.json({ ablauf: zeileZuAblauf(neu) })
  } catch (e) {
    return kernFehlerAntwort(e)
  }
}
