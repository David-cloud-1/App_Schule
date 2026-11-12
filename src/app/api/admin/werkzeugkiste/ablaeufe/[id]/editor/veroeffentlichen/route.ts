import { NextResponse } from 'next/server'
import { requireTeacherOrAdmin } from '@/app/api/admin/_lib/auth'
import { createServiceClient } from '@/lib/supabase-server'
import { aktualisiereSpeicher } from '@/lib/werkzeugkiste-materialien-server'
import {
  ABLAUF_TABELLE,
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
  loescheEntwurfVorschau,
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

/**
 * POST …/ablaeufe/:id/editor/veroeffentlichen (PROJ-89, E3) — der Entwurf wird
 * zur neuen Fassung:
 *   1. Der Kern baut die Seite (ohne Sprungmarken, höchstens 8 MB) direkt an die
 *      Stelle der veröffentlichten Datei. Link und Regal liefern ab jetzt sie.
 *   2. Der Kern schreibt den Entwurf als YAML; das ersetzt die gespeicherte
 *      Antwort, damit Schritt 4 und „Kapitel neu anfragen“ damit weiterarbeiten.
 *   3. Ergebnis und Prüfbericht werden aktualisiert, Entwurf und Entwurfs-Vorschau entfernt.
 * Scheitert Schritt 1, bleibt alles, wie es war.
 */
export async function POST(request: Request, { params }: Kontext) {
  const auth = await requireTeacherOrAdmin()
  if (auth.error) return auth.error
  const eingabe = standSchema.safeParse(await request.json().catch(() => null))
  if (!eingabe.success) return ungueltig(eingabe.error)
  const { zeile, antwort } = await editorZeileOderFehler(auth.supabase, (await params).id)
  if (!zeile) return antwort
  if (!zeile.entwurf || !zeile.entwurf_am) return fehler('Es gibt keine Änderungen zum Veröffentlichen.', 400)
  if (eingabe.data.stand !== zeile.entwurf_am) return fehler(ANDERES_FENSTER, 409, 'Neu laden')

  try {
    const service = createServiceClient()
    const [quelle, dateiZiel, vorschauZiel] = await Promise.all([
      bildQuelle(service, zeile),
      schreibAdresse(service, ausgabePfad(zeile.owner_id, zeile.id)),
      schreibAdresse(service, vorschauPfad(zeile.owner_id, zeile.id)),
    ])
    if (!dateiZiel || !vorschauZiel) return fehler('Das Ablegen der Datei konnte nicht vorbereitet werden.', 502)
    const gemeinsam = {
      struktur: zeile.entwurf,
      werkzeug: zeile.werkzeug,
      einstellungen: zeile.einstellungen ?? {},
      ...(quelle ? { einlesung: { url: quelle.url } } : {}),
    }
    // Erst bauen: Ist die Seite zu groß oder der Kern nicht erreichbar, ändert sich nichts
    const bau = await kern<BauErgebnis>('/api/editor/bauen', {
      ...gemeinsam,
      datei_ziel: dateiZiel,
      vorschau_ziel: vorschauZiel,
      marken: false,
      hoechstens: SEITE_MAX_BYTES,
    })
    const [yaml, pruefRoh] = await Promise.all([
      kern<{ antwort: string }>('/api/editor/yaml', { struktur: zeile.entwurf }),
      kern<unknown>('/api/editor/pruefen', { ...gemeinsam, auswahl: zeile.auswahl ?? {} }),
    ])
    const befunde = befundeAusKern(pruefRoh)
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
    if (error) return fehler('Die neue Fassung konnte nicht gespeichert werden.', 500)
    // Ein anderes Fenster hat während des Veröffentlichens weitergespeichert: Dessen Entwurf bleibt erhalten
    if (!data) return fehler(ANDERES_FENSTER, 409, 'Neu laden und erneut veröffentlichen')

    await loescheEntwurfVorschau(service, zeile)
    // Bilder-Auszug für das Regal passend zur neuen Fassung (best effort)
    if (quelle) await erzeugeAuszug(service, zeile.owner_id, zeile.id, yaml.antwort, quelle.pfad)
    await aktualisiereSpeicher(service, zeile.owner_id, zeile.id)
    return NextResponse.json({ ergebnis, befunde })
  } catch (e) {
    return kernFehlerAntwort(e)
  }
}
