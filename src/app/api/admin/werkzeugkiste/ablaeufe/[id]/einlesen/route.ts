import { NextResponse } from 'next/server'
import { requireTeacherOrAdmin } from '@/app/api/admin/_lib/auth'
import { createServiceClient } from '@/lib/supabase-server'
import type { Ablauf } from '@/lib/werkzeugkiste'
import {
  aktualisiere,
  einlesungPfad,
  fehler,
  kern,
  kernFehlerAntwort,
  ladeEigenenAblauf,
  leseAdresse,
  schreibAdresse,
  skriptPfad,
  zeileZuAblauf,
} from '@/lib/werkzeugkiste-server'

export const maxDuration = 120

type Kontext = { params: Promise<{ id: string }> }

/**
 * POST /api/admin/werkzeugkiste/ablaeufe/:id/einlesen (PROJ-51) — nach dem
 * Hochladen: Der Kern holt das Skript aus dem Speicher, liest es und legt die
 * Einlesung (Text + Bilder) daneben ab. Zurück kommen nur die Kennzahlen.
 */
export async function POST(_request: Request, { params }: Kontext) {
  const auth = await requireTeacherOrAdmin()
  if (auth.error) return auth.error
  const zeile = await ladeEigenenAblauf(auth.supabase, (await params).id)
  if (!zeile) return fehler('Diesen Ablauf gibt es nicht mehr.', 404)
  if (!zeile.datei_name) return fehler('Zu diesem Ablauf gehört kein Skript.', 400)

  const service = createServiceClient()
  const [skript, ziel] = await Promise.all([
    leseAdresse(service, skriptPfad(zeile.owner_id, zeile.id, zeile.datei_name)),
    schreibAdresse(service, einlesungPfad(zeile.owner_id, zeile.id)),
  ])
  if (!skript || !ziel) return fehler('Das Skript wurde nicht vollständig hochgeladen. Bitte lade es erneut hoch.', 400)

  try {
    const r = await kern<{ kennzahlen: NonNullable<Ablauf['kennzahlen']>; gliederung: Ablauf['gliederung'] }>(
      '/api/einlesen',
      { skript: { url: skript }, dateiname: zeile.datei_name, einlesung_ziel: ziel },
    )
    // Neu eingelesen: alles, was auf dem alten Stand aufbaute, verfällt
    const neu = await aktualisiere(auth.supabase, zeile.id, {
      kennzahlen: r.kennzahlen,
      gliederung: r.gliederung ?? [],
      auswahl: { seiten: '', abschnitte: [] },
      prompt: null,
      antwort: null,
      pruefung: null,
      ergebnis: null,
      status: 'laeuft',
      schritt: 1,
    })
    if (!neu) return fehler('Das Ergebnis konnte nicht gespeichert werden.', 500)
    return NextResponse.json({ ablauf: zeileZuAblauf(neu) })
  } catch (e) {
    return kernFehlerAntwort(e)
  }
}
