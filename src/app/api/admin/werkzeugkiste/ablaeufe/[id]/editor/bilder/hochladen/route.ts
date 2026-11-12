import { randomBytes } from 'node:crypto'
import { NextResponse } from 'next/server'
import { requireTeacherOrAdmin } from '@/app/api/admin/_lib/auth'
import { createServiceClient } from '@/lib/supabase-server'
import { aktualisiereSpeicher, speicherPruefen } from '@/lib/werkzeugkiste-materialien-server'
import { WK_BUCKET, fehler, kern, kernFehlerAntwort, schreibAdresse } from '@/lib/werkzeugkiste-server'
import { editorZeileOderFehler } from '@/lib/werkzeugkiste-editor-server'
import { eigeneDateien, eigenerPfad } from '@/lib/werkzeugkiste-bilder-server'
import {
  EIGENE_MAX_ANZAHL,
  EIGEN_MAX_BYTES,
  FORMAT_FEHLER,
  ZU_VIELE_BILDER,
  bildArt,
  eigeneVorschauDatei,
} from '@/lib/werkzeugkiste-bilder'

export const maxDuration = 60

type Kontext = { params: Promise<{ id: string }> }

const ZU_GROSS = 'Das Bild ist nach dem Verkleinern noch zu groß. Bitte wähle ein kleineres oder schneide es zu.'
/** Was der Kern nach dem Neukodieren höchstens liefern darf (er darf etwas größer werden als der Eingang) */
const ERGEBNIS_MAX_BYTES = 3_000_000

/**
 * POST …/ablaeufe/:id/editor/bilder/hochladen (PROJ-92) — legt ein vom Browser
 * vorbereitetes (zugeschnittenes, verkleinertes) Bild im Ordner des Materials ab.
 * Der Körper ist das Bild selbst (PNG oder JPEG, höchstens 2,5 MB). Der Server
 * vertraut dem Browser nicht: Er erkennt das Format am Dateikopf, vergibt den
 * Namen selbst, und der Kern kodiert das Bild neu (entfernt Metadaten und Anhänge,
 * begrenzt die Pixelzahl). Zurück kommt der Name für den Bild-Block.
 *   → 201 {bild: {pfad, vorschau, breite, hoehe}}
 */
export async function POST(request: Request, { params }: Kontext) {
  const auth = await requireTeacherOrAdmin()
  if (auth.error) return auth.error
  const { zeile, antwort } = await editorZeileOderFehler(auth.supabase, (await params).id)
  if (!zeile) return antwort

  const angekuendigt = Number(request.headers.get('content-length') ?? 0)
  if (angekuendigt > EIGEN_MAX_BYTES + 1000) return fehler(ZU_GROSS, 413)
  const bytes = new Uint8Array(await request.arrayBuffer().catch(() => new ArrayBuffer(0)))
  if (bytes.length === 0) return fehler('Es wurde kein Bild gesendet.', 400)
  if (bytes.length > EIGEN_MAX_BYTES) return fehler(ZU_GROSS, 413)
  const art = bildArt(bytes)
  if (!art) return fehler(FORMAT_FEHLER, 415)

  const gesperrt = await speicherPruefen(auth.supabase)
  if (gesperrt) return gesperrt

  const service = createServiceClient()
  try {
    if ((await eigeneDateien(service, zeile)).length >= EIGENE_MAX_ANZAHL) return fehler(ZU_VIELE_BILDER, 409)

    // Name vergibt immer der Server (nie ein Pfad aus dem Browser)
    const kennung = randomBytes(8).toString('hex')
    const datei = `eigen_${kennung}.${art}`
    const pfad = eigenerPfad(zeile.owner_id, zeile.id, datei)
    const ziel = await schreibAdresse(service, pfad)
    if (!ziel) return fehler('Das Ablegen des Bildes konnte nicht vorbereitet werden.', 502)

    let r: { vorschau: string; breite: number; hoehe: number; bytes: number }
    try {
      r = await kern('/api/editor/bild-ablegen', { bild: Buffer.from(bytes).toString('base64'), format: art, ziel })
    } catch (e) {
      await service.storage.from(WK_BUCKET).remove([pfad])
      throw e
    }
    const speicher = service.storage.from(WK_BUCKET)
    const vorschau = /^data:image\/jpeg;base64,([A-Za-z0-9+/=]+)$/.exec(String(r.vorschau))
    if (!vorschau || Number(r.bytes) > ERGEBNIS_MAX_BYTES) {
      await speicher.remove([pfad])
      return fehler(Number(r.bytes) > ERGEBNIS_MAX_BYTES ? ZU_GROSS : 'Das Bild konnte nicht verarbeitet werden.', 422)
    }
    const hoch = await speicher.upload(
      eigenerPfad(zeile.owner_id, zeile.id, eigeneVorschauDatei(datei)),
      Buffer.from(vorschau[1], 'base64'),
      { contentType: 'image/jpeg', upsert: true },
    )
    if (hoch.error) {
      await speicher.remove([pfad])
      return fehler('Das Bild konnte nicht abgelegt werden. Bitte versuche es erneut.', 502)
    }
    await aktualisiereSpeicher(service, zeile.owner_id, zeile.id)
    return NextResponse.json(
      { bild: { pfad: `images/${datei}`, vorschau: r.vorschau, breite: Number(r.breite) || 0, hoehe: Number(r.hoehe) || 0 } },
      { status: 201 },
    )
  } catch (e) {
    return kernFehlerAntwort(e)
  }
}
