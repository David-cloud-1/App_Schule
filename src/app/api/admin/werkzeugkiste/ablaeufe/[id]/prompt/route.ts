import { NextResponse } from 'next/server'
import { requireTeacherOrAdmin } from '@/app/api/admin/_lib/auth'
import { createServiceClient } from '@/lib/supabase-server'
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

export const maxDuration = 60

type Kontext = { params: Promise<{ id: string }> }

/**
 * POST /api/admin/werkzeugkiste/ablaeufe/:id/prompt (PROJ-51) — der Kern baut
 * den Prompt aus Einlesung, Auswahl und Einstellungen, zeichengenau wie die
 * alte Werkzeugkiste. `hinweis` meldet z. B. eine unlesbare Seitenangabe.
 */
export async function POST(_request: Request, { params }: Kontext) {
  const auth = await requireTeacherOrAdmin()
  if (auth.error) return auth.error
  const zeile = await ladeEigenenAblauf(auth.supabase, (await params).id)
  if (!zeile) return fehler('Diesen Ablauf gibt es nicht mehr.', 404)
  if (!zeile.kennzahlen) return fehler('Das Skript ist noch nicht eingelesen.', 400)

  const einlesung = await leseAdresse(createServiceClient(), einlesungPfad(zeile.owner_id, zeile.id))
  if (!einlesung) return fehler('Das eingelesene Skript fehlt. Bitte lade es erneut hoch.', 400)

  const ablauf = zeileZuAblauf(zeile)
  try {
    const r = await kern<{ prompt: string; hinweis?: string; warnung?: string }>('/api/prompt', {
      einlesung: { url: einlesung },
      werkzeug: ablauf.werkzeug,
      einstellungen: ablauf.einstellungen,
      auswahl: ablauf.auswahl,
    })
    const neu = await aktualisiere(auth.supabase, zeile.id, {
      prompt: r.prompt,
      schritt: Math.max(zeile.schritt, 3),
    })
    if (!neu) return fehler('Der Prompt konnte nicht gespeichert werden.', 500)
    return NextResponse.json({ ablauf: zeileZuAblauf(neu), hinweis: [r.hinweis, r.warnung].filter(Boolean).join(' ') || null })
  } catch (e) {
    return kernFehlerAntwort(e)
  }
}
