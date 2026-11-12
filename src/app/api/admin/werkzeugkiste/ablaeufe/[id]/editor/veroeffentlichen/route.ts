import { NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { requireTeacherOrAdmin } from '@/app/api/admin/_lib/auth'
import { createServiceClient } from '@/lib/supabase-server'
import { aktualisiereSpeicher } from '@/lib/werkzeugkiste-materialien-server'
import { eigeneFuerBau, loescheUnbenutzteEigene } from '@/lib/werkzeugkiste-bilder-server'
import {
  ABLAUF_TABELLE,
  WK_BUCKET,
  ausgabePfad,
  erzeugeAuszug,
  fehler,
  kern,
  kernFehlerAntwort,
  schreibAdresse,
  ungueltig,
  vorschauPfad,
} from '@/lib/werkzeugkiste-server'
import {
  ANDERES_FENSTER,
  SEITE_MAX_BYTES,
  befundeAusKern,
  bildQuelle,
  editorZeileOderFehler,
  gleicherStand,
  loescheEntwurfVorschau,
  neueAusgabePfad,
  neueVorschauPfad,
  standSchema,
} from '@/lib/werkzeugkiste-editor-server'
import type { AblaufErgebnis, AblaufPruefung } from '@/lib/werkzeugkiste'

export const maxDuration = 120

type Kontext = { params: Promise<{ id: string }> }

interface BauErgebnis {
  titel: string
  dateiname: string
  kapitel: number
  aufgaben: number
}

const NICHT_VEROEFFENTLICHT = 'Das Veröffentlichen hat nicht geklappt. Die bisherige Fassung ist weiter sichtbar.'

/** Zwischendatei an ihre endgültige Stelle kopieren (überschreibt) */
async function ersetze(service: SupabaseClient, von: string, nach: string) {
  const speicher = service.storage.from(WK_BUCKET)
  const { data, error } = await speicher.download(von)
  if (error || !data) throw new Error('Zwischendatei fehlt')
  const { error: hochFehler } = await speicher.upload(nach, data, { upsert: true, contentType: 'text/html' })
  if (hochFehler) throw new Error('Ersetzen fehlgeschlagen')
}

/**
 * POST …/ablaeufe/:id/editor/veroeffentlichen (PROJ-89, E3) — der Entwurf wird
 * zur neuen Fassung. Reihenfolge so, dass Link und Regal nie einen halben Stand sehen:
 *   1. Ohne Nebenwirkung: Der Kern schreibt den Entwurf als YAML und prüft ihn.
 *   2. Der Kern baut die Seite (ohne Sprungmarken, höchstens 8 MB) in Zwischendateien.
 *   3. Das Material wird gespeichert – nur, wenn der Entwurf noch derselbe ist.
 *   4. Erst jetzt ersetzen die Zwischendateien `ausgabe` und `vorschau.html`.
 *      Scheitert das, wird Schritt 3 zurückgenommen.
 * Scheitert etwas vor Schritt 4, bleibt die alte Fassung veröffentlicht und der Entwurf erhalten.
 */
export async function POST(request: Request, { params }: Kontext) {
  const auth = await requireTeacherOrAdmin()
  if (auth.error) return auth.error
  const eingabe = standSchema.safeParse(await request.json().catch(() => null))
  if (!eingabe.success) return ungueltig(eingabe.error)
  const { zeile, antwort } = await editorZeileOderFehler(auth.supabase, (await params).id)
  if (!zeile) return antwort
  if (!zeile.entwurf || !zeile.entwurf_am) return fehler('Es gibt keine Änderungen zum Veröffentlichen.', 400)
  if (!gleicherStand(eingabe.data.stand, zeile.entwurf_am)) return fehler(ANDERES_FENSTER, 409, 'Neu laden')

  const service = createServiceClient()
  const zwischen = {
    ausgabe: neueAusgabePfad(zeile.owner_id, zeile.id),
    vorschau: neueVorschauPfad(zeile.owner_id, zeile.id),
  }
  const aufraeumen = () => service.storage.from(WK_BUCKET).remove([zwischen.ausgabe, zwischen.vorschau])

  let bau: BauErgebnis
  let yaml: { antwort: string }
  let befunde: ReturnType<typeof befundeAusKern>
  let quelle: Awaited<ReturnType<typeof bildQuelle>>
  try {
    const [q, dateiZiel, vorschauZiel] = await Promise.all([
      bildQuelle(service, zeile),
      schreibAdresse(service, zwischen.ausgabe),
      schreibAdresse(service, zwischen.vorschau),
    ])
    quelle = q
    if (!dateiZiel || !vorschauZiel) return fehler('Das Ablegen der Datei konnte nicht vorbereitet werden.', 502)
    const eigene = await eigeneFuerBau(service, zeile, JSON.stringify(zeile.entwurf))
    const gemeinsam = {
      struktur: zeile.entwurf,
      werkzeug: zeile.werkzeug,
      einstellungen: zeile.einstellungen ?? {},
      ...(quelle ? { einlesung: { url: quelle.url } } : {}),
    }
    // 1. Ohne Nebenwirkung
    const [y, pruefRoh] = await Promise.all([
      kern<{ antwort: string }>('/api/editor/yaml', { struktur: zeile.entwurf }),
      kern<unknown>('/api/editor/pruefen', { ...gemeinsam, auswahl: zeile.auswahl ?? {} }),
    ])
    yaml = y
    befunde = befundeAusKern(pruefRoh)
    // 2. In Zwischendateien bauen: Ist die Seite zu groß oder der Kern nicht erreichbar, ändert sich nichts
    bau = await kern<BauErgebnis>('/api/editor/bauen', {
      ...gemeinsam,
      datei_ziel: dateiZiel,
      vorschau_ziel: vorschauZiel,
      marken: false,
      hoechstens: SEITE_MAX_BYTES,
      ...(eigene.length ? { eigene_bilder: eigene } : {}),
    })
  } catch (e) {
    await aufraeumen()
    return kernFehlerAntwort(e)
  }

  // 3. Speichern – nur, solange kein anderes Fenster weitergespeichert hat
  const alt = zeile.ergebnis
  const ergebnis: AblaufErgebnis = {
    ...(alt ?? { format: 'seite' }),
    titel: String(bau.titel),
    dateiname: String(bau.dateiname),
    format: 'seite',
    kapitel: Number(bau.kapitel) || 0,
    aufgaben: Number(bau.aufgaben) || 0,
  }
  const pruefung: AblaufPruefung = {
    lesbar: true,
    fehler: null,
    befunde: befunde.map((b) => ({ text: b.text, schwere: b.schwere })),
    korrekturen: 0,
    nachbesserungsPrompt: null,
  }
  const jetzt = new Date().toISOString()
  const { data, error } = await auth.supabase
    .from(ABLAUF_TABELLE)
    .update({
      antwort: yaml.antwort,
      ergebnis,
      pruefung,
      entwurf: null,
      entwurf_am: null,
      entwurf_pruefung: null,
      updated_at: jetzt,
    })
    .eq('id', zeile.id)
    .eq('entwurf_am', zeile.entwurf_am)
    .select('id')
    .maybeSingle()
  if (error || !data) {
    await aufraeumen()
    if (error) return fehler('Die neue Fassung konnte nicht gespeichert werden.', 500)
    // Ein anderes Fenster hat während des Veröffentlichens weitergespeichert: Dessen Entwurf bleibt erhalten
    return fehler(ANDERES_FENSTER, 409, 'Neu laden und erneut veröffentlichen')
  }

  // 4. Erst jetzt wird die neue Fassung sichtbar
  try {
    await ersetze(service, zwischen.ausgabe, ausgabePfad(zeile.owner_id, zeile.id))
    await ersetze(service, zwischen.vorschau, vorschauPfad(zeile.owner_id, zeile.id)).catch(() => {
      // Die Lehrer-Vorschau ist Nebensache – die veröffentlichte Datei zählt
    })
  } catch {
    // Zurück auf den Stand vor Schritt 3: alte Antwort, Entwurf wieder da
    await auth.supabase
      .from(ABLAUF_TABELLE)
      .update({
        antwort: zeile.antwort,
        ergebnis: zeile.ergebnis,
        pruefung: zeile.pruefung,
        entwurf: zeile.entwurf,
        entwurf_am: zeile.entwurf_am,
        entwurf_pruefung: zeile.entwurf_pruefung,
        updated_at: zeile.updated_at,
      })
      .eq('id', zeile.id)
    await aufraeumen()
    return fehler(NICHT_VEROEFFENTLICHT, 502, 'Bitte versuche es erneut.')
  }

  await Promise.all([aufraeumen(), loescheEntwurfVorschau(service, zeile)])
  // Bilder-Auszug für das Regal passend zur neuen Fassung (best effort)
  // PROJ-92: Auch ohne Skript (nur eigene Bilder) entsteht ein Auszug; danach fliegen unbenutzte eigene Bilder raus
  await erzeugeAuszug(service, zeile.owner_id, zeile.id, yaml.antwort, quelle?.pfad)
  await loescheUnbenutzteEigene(service, zeile, yaml.antwort)
  await aktualisiereSpeicher(service, zeile.owner_id, zeile.id)
  return NextResponse.json({ ergebnis, befunde })
}
