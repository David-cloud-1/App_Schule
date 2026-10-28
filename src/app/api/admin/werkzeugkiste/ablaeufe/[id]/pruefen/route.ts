import { NextResponse } from 'next/server'
import { requireTeacherOrAdmin } from '@/app/api/admin/_lib/auth'
import { createServiceClient } from '@/lib/supabase-server'
import type { AblaufPruefung } from '@/lib/werkzeugkiste'
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
  if (!zeile.kennzahlen || !zeile.prompt) return fehler('Erstelle zuerst den Prompt.', 400)

  const einlesung = await leseAdresse(createServiceClient(), einlesungPfad(zeile.owner_id, zeile.id))
  if (!einlesung) return fehler('Das eingelesene Skript fehlt. Bitte lade es erneut hoch.', 400)

  const ablauf = zeileZuAblauf(zeile)
  try {
    const pruefung = await kern<AblaufPruefung>('/api/pruefen', {
      antwort: parsed.data.antwort,
      werkzeug: ablauf.werkzeug,
      einstellungen: ablauf.einstellungen,
      auswahl: ablauf.auswahl,
      einlesung: { url: einlesung },
    })
    const neu = await aktualisiere(auth.supabase, zeile.id, {
      antwort: parsed.data.antwort,
      pruefung: {
        lesbar: !!pruefung.lesbar,
        fehler: pruefung.fehler ?? null,
        befunde: (pruefung.befunde ?? []).map((b) => ({ text: String(b.text) })),
        korrekturen: Number(pruefung.korrekturen) || 0,
        nachbesserungsPrompt: pruefung.nachbesserungsPrompt ?? null,
      },
      schritt: Math.max(zeile.schritt, 4),
    })
    if (!neu) return fehler('Die Prüfung konnte nicht gespeichert werden.', 500)
    return NextResponse.json({ ablauf: zeileZuAblauf(neu) })
  } catch (e) {
    return kernFehlerAntwort(e)
  }
}
