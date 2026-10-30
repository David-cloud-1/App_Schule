import { NextResponse } from 'next/server'
import { z } from 'zod'
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
import { aktualisiereSpeicher, titelNachBauen } from '@/lib/werkzeugkiste-materialien-server'

export const maxDuration = 120

type Kontext = { params: Promise<{ id: string }> }

/** Zwei-Tabs-Regel (PROJ-52): `stand` = Änderungszeitpunkt, den die Oberfläche gesehen hat */
const bauSchema = z.object({ stand: z.string().max(64).optional(), ersetzen: z.boolean().optional() }).strict()

/**
 * POST /api/admin/werkzeugkiste/ablaeufe/:id/bauen (PROJ-51) — der Kern baut
 * aus der geprüften Antwort und den Bildern der Einlesung die Datei und die
 * Vorschau und legt beide im Speicher ab.
 */
export async function POST(request: Request, { params }: Kontext) {
  const auth = await requireTeacherOrAdmin()
  if (auth.error) return auth.error
  const zeile = await ladeEigenenAblauf(auth.supabase, (await params).id)
  if (!zeile) return fehler('Diesen Ablauf gibt es nicht mehr.', 404)
  if (!zeile.antwort || !zeile.pruefung) return fehler('Füge zuerst die Antwort der KI ein.', 400)
  if (!zeile.pruefung.lesbar) return fehler('Die Antwort ist unvollständig und lässt sich nicht verarbeiten.', 400)

  // Ein fertiges Material wurde inzwischen woanders geändert? Dann erst nachfragen (zuletzt erstellte Fassung gewinnt).
  const roh = await request.json().catch(() => null)
  const bau = bauSchema.safeParse(roh ?? {})
  if (!bau.success) return fehler('Die Anfrage ist ungültig.', 400)
  if (zeile.status === 'fertig' && bau.data.stand && !bau.data.ersetzen && bau.data.stand !== zeile.updated_at) {
    return fehler('Dieses Material wurde inzwischen geändert (zum Beispiel in einem anderen Fenster).', 409, 'Trotzdem ersetzen?')
  }

  try {
    const service = createServiceClient()
    const ergebnis = await kernBauen(service, zeile, zeile.antwort)
    // Fertig = Material (PROJ-52): Titel setzen, der Ablauftermin entfällt (Trigger in der Datenbank)
    const titel = titelNachBauen(zeile, ergebnis)
    const neu = await aktualisiere(auth.supabase, zeile.id, { ergebnis, status: 'fertig', schritt: 5, ...(titel ? { titel } : {}) })
    if (!neu) return fehler('Das Ergebnis konnte nicht gespeichert werden.', 500)
    await aktualisiereSpeicher(service, zeile.owner_id, zeile.id)
    return NextResponse.json({ ablauf: zeileZuAblauf(neu) })
  } catch (e) {
    return kernFehlerAntwort(e)
  }
}
