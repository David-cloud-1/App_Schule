import { NextResponse } from 'next/server'
import { requireTeacherOrAdmin } from '@/app/api/admin/_lib/auth'
import { createServiceClient } from '@/lib/supabase-server'
import { aktualisiereSpeicher } from '@/lib/werkzeugkiste-materialien-server'
import { ABLAUF_TABELLE, fehler, kernFehlerAntwort, ungueltig } from '@/lib/werkzeugkiste-server'
import {
  ANDERES_FENSTER,
  aktuelleStruktur,
  editorZeileOderFehler,
  geteiltStatus,
  gleicherStand,
  loescheEntwurfVorschau,
  speichernSchema,
  titelVon,
} from '@/lib/werkzeugkiste-editor-server'
import { grundgeruest, nieVeroeffentlicht, type EditorDaten } from '@/lib/werkzeugkiste-editor'

export const maxDuration = 60

type Kontext = { params: Promise<{ id: string }> }

/**
 * GET …/ablaeufe/:id/editor (PROJ-89) — öffnet ein Material im Baukasten:
 * der gespeicherte Entwurf oder, wenn es keinen gibt, die veröffentlichte
 * Antwort, die der Kern in die Struktur übersetzt.
 */
export async function GET(_request: Request, { params }: Kontext) {
  const auth = await requireTeacherOrAdmin()
  if (auth.error) return auth.error
  const { zeile, antwort } = await editorZeileOderFehler(auth.supabase, (await params).id)
  if (!zeile) return antwort
  if (!zeile.entwurf && !zeile.antwort && !nieVeroeffentlicht(zeile)) return fehler('Zu diesem Material gibt es keine Inhalte zum Bearbeiten.', 400)
  try {
    const [struktur, geteilt] = await Promise.all([aktuelleStruktur(zeile), geteiltStatus(auth.supabase, zeile.id)])
    const daten: EditorDaten = {
      id: zeile.id,
      titel: titelVon(zeile),
      werkzeug: zeile.werkzeug,
      struktur,
      stand: zeile.entwurf ? zeile.entwurf_am : null,
      befunde: zeile.entwurf ? (zeile.entwurf_pruefung?.befunde ?? null) : null,
      ...geteilt,
      ...(nieVeroeffentlicht(zeile) ? { nieVeroeffentlicht: true } : {}),
    }
    return NextResponse.json(daten)
  } catch (e) {
    return kernFehlerAntwort(e)
  }
}

/**
 * PUT …/ablaeufe/:id/editor (PROJ-89) — speichert den ganzen Entwurf
 * (automatisch, E10). Zwei-Tabs-Regel: Nur wer den zuletzt gespeicherten Stand
 * kennt, darf schreiben; sonst 409 und nichts wird überschrieben.
 */
export async function PUT(request: Request, { params }: Kontext) {
  const auth = await requireTeacherOrAdmin()
  if (auth.error) return auth.error
  const eingabe = speichernSchema.safeParse(await request.json().catch(() => null))
  if (!eingabe.success) return ungueltig(eingabe.error)
  const { zeile, antwort } = await editorZeileOderFehler(auth.supabase, (await params).id)
  if (!zeile) return antwort

  const bekannt = zeile.entwurf ? zeile.entwurf_am : null
  if (!gleicherStand(eingabe.data.stand, bekannt)) return fehler(ANDERES_FENSTER, 409, 'Neu laden')

  const jetzt = new Date().toISOString()
  let abfrage = auth.supabase
    .from(ABLAUF_TABELLE)
    .update({ entwurf: eingabe.data.struktur, entwurf_am: jetzt, updated_at: jetzt })
    .eq('id', zeile.id)
  abfrage = bekannt ? abfrage.eq('entwurf_am', bekannt) : abfrage.is('entwurf_am', null)
  const { data, error } = await abfrage.select('id, entwurf_am').maybeSingle()
  if (error) return fehler('Der Entwurf konnte nicht gespeichert werden.', 500)
  if (!data) return fehler(ANDERES_FENSTER, 409, 'Neu laden')
  // Den Stand so zurückgeben, wie ihn die Datenbank schreibt (QA BUG-1)
  return NextResponse.json({ stand: (data as { entwurf_am?: string | null }).entwurf_am ?? jetzt })
}

/**
 * DELETE …/ablaeufe/:id/editor (PROJ-89) — „Entwurf verwerfen“ (E11): zurück
 * auf die veröffentlichte Fassung. Entwurf, seine Prüfung und Vorschau verschwinden.
 *
 * PROJ-94: Eine eigene Seite, die noch nie veröffentlicht wurde, hat keine
 * Fassung, auf die man zurückkann. Dort wird der Entwurf durch ein frisches
 * Grundgerüst mit dem aktuellen Titel (und Untertitel) ersetzt.
 */
export async function DELETE(_request: Request, { params }: Kontext) {
  const auth = await requireTeacherOrAdmin()
  if (auth.error) return auth.error
  const { zeile, antwort } = await editorZeileOderFehler(auth.supabase, (await params).id)
  if (!zeile) return antwort
  if (nieVeroeffentlicht(zeile)) {
    const jetzt = new Date().toISOString()
    const untertitel = typeof zeile.entwurf?.cover?.subtitle === 'string' ? zeile.entwurf.cover.subtitle : null
    const { data, error: neuFehler } = await auth.supabase
      .from(ABLAUF_TABELLE)
      .update({
        entwurf: grundgeruest(titelVon(zeile), untertitel),
        entwurf_am: jetzt,
        entwurf_pruefung: null,
        updated_at: jetzt,
      })
      .eq('id', zeile.id)
      .select('entwurf_am')
      .maybeSingle()
    if (neuFehler || !data) return fehler('Die Seite konnte nicht zurückgesetzt werden.', 500)
    const service = createServiceClient()
    await loescheEntwurfVorschau(service, zeile)
    return NextResponse.json({ ok: true })
  }
  const { error } = await auth.supabase
    .from(ABLAUF_TABELLE)
    .update({ entwurf: null, entwurf_am: null, entwurf_pruefung: null, updated_at: new Date().toISOString() })
    .eq('id', zeile.id)
  if (error) return fehler('Der Entwurf konnte nicht verworfen werden.', 500)
  const service = createServiceClient()
  await loescheEntwurfVorschau(service, zeile)
  await aktualisiereSpeicher(service, zeile.owner_id, zeile.id)
  return NextResponse.json({ ok: true })
}
