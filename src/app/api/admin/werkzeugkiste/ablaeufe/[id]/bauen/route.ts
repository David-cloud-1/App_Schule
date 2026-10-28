import { NextResponse } from 'next/server'
import { requireTeacherOrAdmin } from '@/app/api/admin/_lib/auth'
import { createServiceClient } from '@/lib/supabase-server'
import {
  aktualisiere,
  fehler,
  kernBauen,
  kernFehlerAntwort,
  ladeEigenenAblauf,
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

  try {
    const ergebnis = await kernBauen(createServiceClient(), zeile, zeile.antwort)
    const neu = await aktualisiere(auth.supabase, zeile.id, { ergebnis, status: 'fertig', schritt: 5 })
    if (!neu) return fehler('Das Ergebnis konnte nicht gespeichert werden.', 500)
    return NextResponse.json({ ablauf: zeileZuAblauf(neu) })
  } catch (e) {
    return kernFehlerAntwort(e)
  }
}
