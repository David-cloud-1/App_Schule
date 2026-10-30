import { NextResponse } from 'next/server'
import { requireTeacherOrAdmin } from '@/app/api/admin/_lib/auth'
import { createServiceClient } from '@/lib/supabase-server'
import { eingabeArt } from '@/lib/werkzeugkiste'
import { HINWEIS_SKRIPT_ENTFERNT } from '@/lib/werkzeugkiste-materialien'
import { aktualisiereSpeicher, speicherPruefen } from '@/lib/werkzeugkiste-materialien-server'
import {
  ABLAUF_SPALTEN,
  ABLAUF_TABELLE,
  MAX_OFFENE_ABLAEUFE,
  WK_BUCKET,
  einlesungPfad,
  fehler,
  frischStempel,
  ladeEigenenAblauf,
  loescheDateien,
  skriptPfad,
  vorbelegung,
  zeileZuAblauf,
  type AblaufZeile,
} from '@/lib/werkzeugkiste-server'

export const maxDuration = 60

type Kontext = { params: Promise<{ id: string }> }

/**
 * POST /api/admin/werkzeugkiste/ablaeufe/:id/kopie (PROJ-52) — „Gleiches
 * Skript, anderes Werkzeug“. Legt einen **neuen** Ablauf an, kopiert Skript
 * und Einlesung im Speicher (ohne Umweg über die App) und öffnet ihn bei
 * Schritt 2. Das Material, von dem er ausgeht, bleibt unberührt.
 */
export async function POST(_request: Request, { params }: Kontext) {
  const auth = await requireTeacherOrAdmin()
  if (auth.error) return auth.error
  const quelle = await ladeEigenenAblauf(auth.supabase, (await params).id)
  if (!quelle) return fehler('Dieses Material gibt es nicht mehr.', 404)

  if (quelle.skript_entfernt_am) return fehler(`${HINWEIS_SKRIPT_ENTFERNT}. Lade das Skript für ein neues Material erneut hoch.`, 409)
  if (eingabeArt(quelle.werkzeug) === 'video') {
    return fehler('Video-Fragen brauchen ein eigenes Transkript. Starte dafür einen neuen Ablauf.', 409)
  }
  if (!quelle.kennzahlen || !quelle.datei_name) return fehler('Dieses Material hat kein eingelesenes Skript.', 409)

  const { count } = await auth.supabase
    .from(ABLAUF_TABELLE)
    .select('id', { count: 'exact', head: true })
    .eq('owner_id', auth.user.id)
    .eq('status', 'laeuft')
  if ((count ?? 0) >= MAX_OFFENE_ABLAEUFE) {
    return fehler('Du hast gerade sehr viele offene Abläufe. Schließe ältere ab oder brich sie ab.', 429)
  }
  const voll = await speicherPruefen(auth.supabase)
  if (voll) return voll

  const einstellungen = vorbelegung(quelle.werkzeug, quelle.einstellungen)
  const { data, error } = await auth.supabase
    .from(ABLAUF_TABELLE)
    .insert({
      owner_id: auth.user.id,
      werkzeug: quelle.werkzeug,
      datei_name: quelle.datei_name,
      datei_groesse: quelle.datei_groesse,
      kennzahlen: quelle.kennzahlen,
      gliederung: quelle.gliederung ?? [],
      auswahl: quelle.auswahl ?? { seiten: '', abschnitte: [] },
      einstellungen,
      schritt: 2,
      ...frischStempel(),
    })
    .select(ABLAUF_SPALTEN)
    .single()
  if (error || !data) return fehler('Der neue Ablauf konnte nicht angelegt werden.', 500)
  const neu = data as AblaufZeile

  const service = createServiceClient()
  const abbrechen = async () => {
    await loescheDateien(service, neu.owner_id, neu.id).catch(() => {})
    await auth.supabase.from(ABLAUF_TABELLE).delete().eq('id', neu.id)
  }

  // Die Einlesung (Text + Bilder) ist Pflicht; das Skript selbst wird gebraucht, wenn neu eingelesen werden soll
  const speicher = service.storage.from(WK_BUCKET)
  const einl = await speicher.copy(einlesungPfad(quelle.owner_id, quelle.id), einlesungPfad(neu.owner_id, neu.id))
  if (einl.error) {
    await abbrechen()
    return fehler('Das Skript konnte nicht kopiert werden. Bitte lade es erneut hoch.', 502)
  }
  await speicher.copy(skriptPfad(quelle.owner_id, quelle.id, quelle.datei_name), skriptPfad(neu.owner_id, neu.id, quelle.datei_name))

  // Die 12-Monats-Uhr läuft vom ersten Hochladen weiter. Der Browser-Schlüssel darf sie nicht setzen
  // (Trigger), deshalb mit dem Service-Schlüssel.
  if (quelle.skript_hochgeladen_am) {
    await service.from(ABLAUF_TABELLE).update({ skript_hochgeladen_am: quelle.skript_hochgeladen_am }).eq('id', neu.id)
  }
  await aktualisiereSpeicher(service, neu.owner_id, neu.id)

  return NextResponse.json({ ablauf: zeileZuAblauf(neu) }, { status: 201 })
}
