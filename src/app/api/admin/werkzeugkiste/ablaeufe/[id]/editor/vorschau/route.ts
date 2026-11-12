import { NextResponse } from 'next/server'
import { requireTeacherOrAdmin } from '@/app/api/admin/_lib/auth'
import { createServiceClient } from '@/lib/supabase-server'
import { aktualisiereSpeicher } from '@/lib/werkzeugkiste-materialien-server'
import { ABLAUF_TABELLE, fehler, kern, kernFehlerAntwort, leseAdresse, schreibAdresse } from '@/lib/werkzeugkiste-server'
import {
  aktuelleStruktur,
  befundeAusKern,
  bildQuelle,
  editorZeileOderFehler,
  entwurfVorschauPfad,
} from '@/lib/werkzeugkiste-editor-server'

export const maxDuration = 120

type Kontext = { params: Promise<{ id: string }> }

/**
 * POST …/ablaeufe/:id/editor/vorschau (PROJ-89) — baut die Seite aus dem
 * gespeicherten Entwurf (mit Sprungmarken) und legt sie als `entwurf.html`
 * neben die veröffentlichte Datei. Dazu läuft die Prüfstelle über den Entwurf.
 *
 * Die Seite kommt nicht im Antwortkörper zurück, sondern als kurzlebige
 * Leseadresse: Mit Bildern kann sie größer sein als die 4,5 MB, die eine
 * Antwort auf Vercel höchstens haben darf.
 */
export async function POST(_request: Request, { params }: Kontext) {
  const auth = await requireTeacherOrAdmin()
  if (auth.error) return auth.error
  const { zeile, antwort } = await editorZeileOderFehler(auth.supabase, (await params).id)
  if (!zeile) return antwort
  if (!zeile.entwurf && !zeile.antwort) return fehler('Zu diesem Material gibt es keine Inhalte zum Bearbeiten.', 400)

  try {
    const service = createServiceClient()
    const pfad = entwurfVorschauPfad(zeile.owner_id, zeile.id)
    const [struktur, quelle, ziel] = await Promise.all([
      aktuelleStruktur(zeile),
      bildQuelle(service, zeile),
      schreibAdresse(service, pfad),
    ])
    if (!ziel) return fehler('Die Vorschau konnte nicht vorbereitet werden.', 502)
    const gemeinsam = {
      struktur,
      werkzeug: zeile.werkzeug,
      einstellungen: zeile.einstellungen ?? {},
      ...(quelle ? { einlesung: { url: quelle.url } } : {}),
    }
    const [ergebnis, pruefung] = await Promise.all([
      kern<{ groesse?: number; warnungen?: number }>('/api/editor/bauen', { ...gemeinsam, datei_ziel: ziel, marken: true }),
      kern<unknown>('/api/editor/pruefen', { ...gemeinsam, auswahl: zeile.auswahl ?? {} }),
    ])
    const befunde = befundeAusKern(pruefung)

    // Befunde nur an einen bestehenden Entwurf hängen – und nur, solange er nicht inzwischen weitergespeichert wurde
    if (zeile.entwurf && zeile.entwurf_am) {
      await auth.supabase
        .from(ABLAUF_TABELLE)
        .update({ entwurf_pruefung: { befunde } })
        .eq('id', zeile.id)
        .eq('entwurf_am', zeile.entwurf_am)
    }
    const [adresse] = await Promise.all([leseAdresse(service, pfad), aktualisiereSpeicher(service, zeile.owner_id, zeile.id)])
    if (!adresse) return fehler('Die Vorschau konnte nicht geladen werden.', 502)
    return NextResponse.json({
      adresse,
      befunde,
      groesse: Number(ergebnis.groesse) || 0,
      stand: zeile.entwurf ? zeile.entwurf_am : null,
    })
  } catch (e) {
    return kernFehlerAntwort(e)
  }
}
