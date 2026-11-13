import { NextResponse } from 'next/server'
import { requireTeacherOrAdmin } from '@/app/api/admin/_lib/auth'
import { createServiceClient } from '@/lib/supabase-server'
import {
  einlesungPfad,
  fehler,
  kern,
  kernFehlerAntwort,
  ladeEigenenAblauf,
  leseAdresse,
  ungueltig,
  zeileZuAblauf, eigeneSeiteSperre,
} from '@/lib/werkzeugkiste-server'
import { teilPromptSchema } from '@/lib/werkzeugkiste-teile-server'

export const maxDuration = 60

type Kontext = { params: Promise<{ id: string; nr: string }> }

/**
 * POST /api/admin/werkzeugkiste/ablaeufe/:id/teile/:nr/prompt (PROJ-69) — der Kern baut den
 * Prompt für genau diesen Teil („Teil 2 von 3“, ab Teil 2 ohne Deckblatt). Mit `weiter: true`
 * entsteht stattdessen der Weiterschreib-Prompt für einen abgeschnittenen Teil: Er nennt der
 * KI die Kapitel, die schon da sind. Der Prompt wird nicht gespeichert, er ergibt sich jederzeit
 * neu aus Skript, Auswahl und Einstellungen.
 */
export async function POST(request: Request, { params }: Kontext) {
  const auth = await requireTeacherOrAdmin()
  if (auth.error) return auth.error
  const parsed = teilPromptSchema.safeParse((await request.json().catch(() => null)) ?? {})
  if (!parsed.success) return ungueltig(parsed.error)

  const { id, nr: nrText } = await params
  const zeile = await ladeEigenenAblauf(auth.supabase, id)
  if (!zeile) return fehler('Diesen Ablauf gibt es nicht mehr.', 404)
  const keinAblauf = eigeneSeiteSperre(zeile)
  if (keinAblauf) return keinAblauf
  if (!zeile.teile) return fehler('Dieser Ablauf ist nicht in Teile geteilt.', 400)
  const teil = zeile.teile.teile.find((t) => t.nr === Number(nrText))
  if (!teil) return fehler('Diesen Teil gibt es nicht.', 404)
  if (parsed.data.weiter && teil.zustand !== 'abgeschnitten') {
    return fehler('Zu diesem Teil gibt es nichts weiterzuschreiben.', 400)
  }

  const einlesung = await leseAdresse(createServiceClient(), einlesungPfad(zeile.owner_id, zeile.id))
  if (!einlesung) return fehler('Das eingelesene Skript fehlt. Bitte lade es erneut hoch.', 400)

  const ablauf = zeileZuAblauf(zeile)
  try {
    const r = await kern<{ prompt: string }>('/api/prompt', {
      einlesung: { url: einlesung },
      werkzeug: ablauf.werkzeug,
      einstellungen: ablauf.einstellungen,
      auswahl: teil.auswahl,
      teil: {
        nr: teil.nr,
        von: zeile.teile.teile.length,
        ...(parsed.data.weiter ? { fertig: teil.kapitel.slice(0, 80) } : {}),
      },
    })
    return NextResponse.json({ prompt: r.prompt, nr: teil.nr, von: zeile.teile.teile.length })
  } catch (e) {
    return kernFehlerAntwort(e)
  }
}
