import { NextResponse } from 'next/server'
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
  dateiVorhanden,
  einlesungPfad,
  erzeugeAuszug,
  fehler,
  kern,
  kernFehlerAntwort,
  ladeEigenenAblauf,
  leseAdresse,
  loescheDateien,
  schreibAdresse,
  skriptPfad,
  vorschauPfad,
  type AblaufZeile,
} from '@/lib/werkzeugkiste-server'
import { SEITE_MAX_BYTES } from '@/lib/werkzeugkiste-editor-server'
import { baukastenWeg, type Struktur } from '@/lib/werkzeugkiste-editor'

export const maxDuration = 120

type Kontext = { params: Promise<{ id: string }> }

const ENDE = ' (Seite)'

/**
 * POST …/ablaeufe/:id/als-seite (PROJ-89, E12) — ein H5P-Material als neue
 * Interaktive Seite kopieren, um es im Baukasten zu bearbeiten. Beide Formate
 * nutzen dieselbe Kapitel-Struktur, deshalb braucht es keine neue KI-Antwort.
 * Das H5P-Original bleibt unverändert.
 *
 * Reihenfolge: erst prüfen, ob der Kern die Antwort als Kapitel-Struktur liest
 * (sonst wird gar nichts angelegt), dann Material anlegen, Einlesung bzw.
 * Bilder-Auszug und Skript kopieren, als Seite bauen. Scheitert etwas, wird
 * die halbe Kopie wieder entfernt.
 */
export async function POST(_request: Request, { params }: Kontext) {
  const auth = await requireTeacherOrAdmin()
  if (auth.error) return auth.error
  const quelle = await ladeEigenenAblauf(auth.supabase, (await params).id)
  if (!quelle) return fehler('Dieses Material gibt es nicht mehr.', 404)
  const weg = baukastenWeg({
    werkzeug: quelle.werkzeug,
    status: quelle.status,
    format: quelle.ergebnis?.format ?? quelle.einstellungen?.format ?? null,
    hatAntwort: !!quelle.antwort,
  })
  if (weg !== 'als-seite' || !quelle.antwort) {
    return fehler('Nur fertige H5P-Materialien lassen sich als Interaktive Seite kopieren.', 400)
  }

  const voll = await speicherPruefen(auth.supabase)
  if (voll) return voll

  const einstellungen = { ...(quelle.einstellungen ?? {}), format: 'seite' }
  let struktur: Struktur
  try {
    struktur = (
      await kern<{ struktur: Struktur }>('/api/editor/struktur', {
        antwort: quelle.antwort,
        werkzeug: quelle.werkzeug,
        einstellungen,
      })
    ).struktur
  } catch (e) {
    return kernFehlerAntwort(e)
  }

  const service = createServiceClient()
  const neueId = crypto.randomUUID()
  const jetzt = new Date().toISOString()
  const titelAlt = quelle.titel ?? quelle.ergebnis?.titel ?? 'Material'
  const titel = `${titelAlt.slice(0, TITEL_MAX - ENDE.length)}${ENDE}`

  // Skript-Zeitpunkte und Herkunft setzt nur der Server (Trigger) – deshalb mit dem Service-Schlüssel.
  // Besitzer ist die anfragende Lehrkraft.
  const { data: eingefuegt, error: einfuegeFehler } = await service
    .from(ABLAUF_TABELLE)
    .insert({
      id: neueId,
      owner_id: auth.user.id,
      werkzeug: quelle.werkzeug,
      status: 'fertig',
      schritt: 5,
      titel,
      datei_name: quelle.datei_name,
      datei_groesse: quelle.datei_groesse,
      kennzahlen: quelle.kennzahlen,
      gliederung: quelle.gliederung ?? [],
      auswahl: quelle.auswahl ?? { seiten: '', abschnitte: [] },
      einstellungen,
      antwort: quelle.antwort,
      pruefung: quelle.pruefung,
      ergebnis: { ...(quelle.ergebnis ?? {}), format: 'seite', fertigAm: jetzt },
      ...(quelle.herkunft_name ? { herkunft_name: quelle.herkunft_name, herkunft_am: jetzt } : {}),
      ...(quelle.skript_hochgeladen_am ? { skript_hochgeladen_am: quelle.skript_hochgeladen_am } : {}),
      ...(quelle.skript_entfernt_am ? { skript_entfernt_am: quelle.skript_entfernt_am } : {}),
    })
    .select(ABLAUF_SPALTEN)
    .single()
  if (einfuegeFehler || !eingefuegt) return fehler('Die Kopie konnte nicht angelegt werden.', 500)
  const neu = eingefuegt as AblaufZeile

  const abbrechen = async () => {
    await loescheDateien(service, neu.owner_id, neueId).catch(() => {})
    await service.from(ABLAUF_TABELLE).delete().eq('id', neueId)
  }

  try {
    // Bilder: Einlesung, ohne Skript der Bilder-Auszug (beides im Format der Einlesung)
    const speicher = service.storage.from(WK_BUCKET)
    const einlesungAlt = einlesungPfad(quelle.owner_id, quelle.id)
    const auszugAlt = auszugPfad(quelle.owner_id, quelle.id)
    const bildquelle = (await dateiVorhanden(service, einlesungAlt)) ? einlesungAlt : (await dateiVorhanden(service, auszugAlt)) ? auszugAlt : null
    if (bildquelle) await speicher.copy(bildquelle, einlesungPfad(neu.owner_id, neueId))
    if (quelle.datei_name && !quelle.skript_entfernt_am) {
      await speicher.copy(skriptPfad(quelle.owner_id, quelle.id, quelle.datei_name), skriptPfad(neu.owner_id, neueId, quelle.datei_name))
    }

    const [einlesung, dateiZiel, vorschauZiel] = await Promise.all([
      bildquelle ? leseAdresse(service, einlesungPfad(neu.owner_id, neueId)) : Promise.resolve(null),
      schreibAdresse(service, ausgabePfad(neu.owner_id, neueId)),
      schreibAdresse(service, vorschauPfad(neu.owner_id, neueId)),
    ])
    if (!dateiZiel || !vorschauZiel) throw new Error('kein Ziel')
    const bau = await kern<{ titel: string; dateiname: string; kapitel: number; aufgaben: number }>('/api/editor/bauen', {
      struktur,
      werkzeug: quelle.werkzeug,
      einstellungen,
      ...(einlesung ? { einlesung: { url: einlesung } } : {}),
      datei_ziel: dateiZiel,
      vorschau_ziel: vorschauZiel,
      marken: false,
      hoechstens: SEITE_MAX_BYTES,
    })
    await service
      .from(ABLAUF_TABELLE)
      .update({
        ergebnis: {
          ...(quelle.ergebnis ?? {}),
          titel: String(bau.titel),
          dateiname: String(bau.dateiname),
          format: 'seite',
          kapitel: Number(bau.kapitel) || 0,
          aufgaben: Number(bau.aufgaben) || 0,
          fertigAm: jetzt,
        },
      })
      .eq('id', neueId)
    if (bildquelle) await erzeugeAuszug(service, neu.owner_id, neueId, quelle.antwort)
    await aktualisiereSpeicher(service, neu.owner_id, neueId)
  } catch (e) {
    await abbrechen()
    if (e instanceof Error && e.message === 'kein Ziel') return fehler('Das Ablegen der Datei konnte nicht vorbereitet werden.', 502)
    return kernFehlerAntwort(e)
  }

  return NextResponse.json({ id: neueId }, { status: 201, headers: { 'Cache-Control': 'no-store' } })
}
