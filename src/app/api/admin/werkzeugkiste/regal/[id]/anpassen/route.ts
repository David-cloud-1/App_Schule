import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireTeacherOrAdmin } from '@/app/api/admin/_lib/auth'
import { createServiceClient } from '@/lib/supabase-server'
import { TITEL_MAX } from '@/lib/werkzeugkiste-materialien'
import { aktualisiereSpeicher, speicherPruefen } from '@/lib/werkzeugkiste-materialien-server'
import {
  ABLAUF_SPALTEN,
  ABLAUF_TABELLE,
  WK_BUCKET,
  ausgabePfad,
  auszugPfad,
  einlesungPfad,
  fehler,
  loescheDateien,
  vorschauPfad,
  zeileZuAblauf,
  type AblaufZeile,
} from '@/lib/werkzeugkiste-server'

export const maxDuration = 120

type Kontext = { params: Promise<{ id: string }> }

const NICHT_GEFUNDEN = 'Dieses Material gibt es nicht mehr oder du darfst es nicht sehen.'
const KOPIE_ENDE = ' (Kopie)'

interface Quelle {
  ablauf_id: string
  owner_id: string
  titel: string
  werkzeug: string
  antwort: string | null
  einstellungen: Record<string, string> | null
  pruefung: unknown
  ergebnis: Record<string, unknown> | null
  besitzer_name: string
  von_mir: boolean
  auszug_am: string | null
}

/**
 * POST /api/admin/werkzeugkiste/regal/:id/anpassen (PROJ-53, Paket 2) — legt eine
 * **Kopie** des Regal-Materials in „Meine Materialien“ der anfragenden Lehrkraft an
 * und öffnet sie bei Schritt 4. Das Original bleibt unverändert.
 *
 * Die Kopie bekommt Antwort, Einstellungen, Prüfbericht, fertige Datei und
 * Vorschau — und statt der Einlesung nur den Bilder-Auszug (Bilder, die im
 * Material vorkommen). Skript, Skripttext und Einlesung des Originals gehen nie
 * mit (E2). Die Sichtbarkeit prüft die Datenbank (regal_anpassen_quelle).
 */
export async function POST(_request: Request, { params }: Kontext) {
  const auth = await requireTeacherOrAdmin()
  if (auth.error) return auth.error

  const id = (await params).id
  if (!z.string().uuid().safeParse(id).success) return fehler(NICHT_GEFUNDEN, 404)

  const { data, error } = await auth.supabase.rpc('regal_anpassen_quelle', { p_freigabe_id: id })
  if (error) return fehler('Das hat gerade nicht geklappt. Bitte versuche es erneut.', 500)
  const quelle = (Array.isArray(data) ? data[0] : null) as Quelle | null
  if (!quelle) return fehler(NICHT_GEFUNDEN, 404)

  if (quelle.von_mir) return fehler('Das ist dein eigenes Material. Du kannst es unter „Meine Materialien“ überarbeiten.', 409)
  if (!quelle.antwort || !quelle.pruefung || !quelle.ergebnis || !quelle.auszug_am) {
    return fehler('Dieses Material lässt sich leider nicht anpassen. Du kannst es herunterladen.', 409)
  }

  // Wie bei einem neuen Ablauf: Die Speichergrenze zählt am Anfang, nie mittendrin
  const voll = await speicherPruefen(auth.supabase)
  if (voll) return voll

  const jetzt = new Date().toISOString()
  const neueId = crypto.randomUUID()
  const titel = `${quelle.titel.slice(0, TITEL_MAX - KOPIE_ENDE.length)}${KOPIE_ENDE}`
  const service = createServiceClient()

  // Herkunft und „kein Skript“ setzt nur der Server (Trigger); deshalb mit dem Service-Schlüssel.
  // Der Besitzer ist die anfragende Lehrkraft, sonst nichts.
  const { data: eingefuegt, error: einfuegeFehler } = await service
    .from(ABLAUF_TABELLE)
    .insert({
      id: neueId,
      owner_id: auth.user.id,
      werkzeug: quelle.werkzeug,
      status: 'fertig',
      schritt: 5,
      titel,
      kennzahlen: { seiten: 0, loesungen: 0, bilder: 0, tabellen: 0 },
      einstellungen: quelle.einstellungen ?? {},
      antwort: quelle.antwort,
      pruefung: quelle.pruefung,
      ergebnis: { ...quelle.ergebnis, fertigAm: jetzt },
      herkunft_name: quelle.besitzer_name.slice(0, 120),
      herkunft_am: jetzt,
      // Kein Skript, deshalb nichts für das 12-Monats-Aufräumen
      skript_entfernt_am: jetzt,
    })
    .select(ABLAUF_SPALTEN)
    .single()
  if (einfuegeFehler || !eingefuegt) return fehler('Die Kopie konnte nicht angelegt werden.', 500)
  const neu = eingefuegt as AblaufZeile

  const abbrechen = async () => {
    await loescheDateien(service, auth.user.id, neueId).catch(() => {})
    await service.from(ABLAUF_TABELLE).delete().eq('id', neueId)
  }

  // Der Bilder-Auszug wird die „Einlesung“ der Kopie, so baut der Kern sie ohne Änderung neu
  const speicher = service.storage.from(WK_BUCKET)
  const auszug = await speicher.copy(auszugPfad(quelle.owner_id, quelle.ablauf_id), einlesungPfad(auth.user.id, neueId))
  const datei = auszug.error ? null : await speicher.copy(ausgabePfad(quelle.owner_id, quelle.ablauf_id), ausgabePfad(auth.user.id, neueId))
  if (auszug.error || !datei || datei.error) {
    await abbrechen()
    return fehler('Das Material konnte nicht übernommen werden, weil eine Datei fehlt. Bitte die Besitzerin oder den Besitzer, es neu zu erstellen.', 502)
  }
  // Die Vorschau ist nur eine Zugabe
  if (quelle.ergebnis.hatVorschau !== false) {
    await speicher.copy(vorschauPfad(quelle.owner_id, quelle.ablauf_id), vorschauPfad(auth.user.id, neueId)).catch(() => {})
  }
  await aktualisiereSpeicher(service, auth.user.id, neueId)

  return NextResponse.json({ ablauf: zeileZuAblauf(neu) }, { status: 201, headers: { 'Cache-Control': 'no-store' } })
}
