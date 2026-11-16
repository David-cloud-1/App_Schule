import { randomBytes } from 'node:crypto'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireTeacherOrAdmin } from '@/app/api/admin/_lib/auth'
import { createServiceClient } from '@/lib/supabase-server'
import { aktualisiereSpeicher, speicherPruefen } from '@/lib/werkzeugkiste-materialien-server'
import { WK_BUCKET, fehler, kern, kernFehlerAntwort, schreibAdresse, ungueltig } from '@/lib/werkzeugkiste-server'
import { bildQuelle, editorZeileOderFehler, ladeEditorZeile } from '@/lib/werkzeugkiste-editor-server'
import { eigeneDateien, eigenerPfad } from '@/lib/werkzeugkiste-bilder-server'
import {
  EIGENE_MAX_ANZAHL,
  EINGEBETTET_SCHAETZUNG_BYTES,
  SEITE_GRENZE_BYTES,
  ZU_VIELE_BILDER,
  bildArt,
  eigeneDatei,
  eigeneVorschauDatei,
  istEigenerPfad,
} from '@/lib/werkzeugkiste-bilder'

export const maxDuration = 60

type Kontext = { params: Promise<{ id: string }> }

const BILD_NAME = /^images\/[A-Za-z0-9_][A-Za-z0-9_.-]{0,120}$/

const eingabeSchema = z
  .object({
    von: z.string().uuid(),
    pfade: z
      .array(z.string().max(160).regex(BILD_NAME).refine((p) => !p.split('/').includes('..')))
      .min(1)
      .max(40),
    seitenGroesse: z.number().int().min(0).max(50_000_000),
  })
  .strict()

const ZU_GROSS = 'Die Seite wäre mit diesen Bildern zu groß zum Veröffentlichen (8 MB). Es wurde nichts eingefügt. Lass Bilder weg oder teile das Material auf.'
const NUR_EIGENE = 'Du kannst Blöcke nur zwischen deinen eigenen Materialien übertragen.'

interface Gelesen {
  pfad: string
  bytes: Uint8Array
  art: 'png' | 'jpg'
  /** Vorschau (JPEG), wenn sie schon vorliegt; sonst legt der Kern sie an */
  vorschau?: Uint8Array
}

function ausDataAdresse(data: string): Uint8Array | null {
  const m = /^data:image\/(?:png|jpeg);base64,([A-Za-z0-9+/=]+)$/.exec(data)
  return m ? new Uint8Array(Buffer.from(m[1], 'base64')) : null
}

/**
 * POST …/ablaeufe/:id/editor/bilder/uebernehmen (PROJ-102) — Bilder aus einem anderen **eigenen**
 * Material in dieses Material übernehmen (Einfügen aus der Zwischenablage). Das Ziel bekommt eine
 * eigene Kopie unter neuem Namen. Bevor etwas geschrieben wird, prüft der Server Anzahl und
 * Seitengröße: Reicht der Platz nicht, wird nichts kopiert. Namen kommen nie als Pfad nach oben
 * in den Speicher; den Zielnamen vergibt immer der Server.
 *   → 200 {zuordnung: {alter Name: neuer Name}, fehlend: [Namen ohne Bild]}
 */
export async function POST(request: Request, { params }: Kontext) {
  const auth = await requireTeacherOrAdmin()
  if (auth.error) return auth.error
  const eingabe = eingabeSchema.safeParse(await request.json().catch(() => ({})))
  if (!eingabe.success) return ungueltig(eingabe.error)
  const { von, seitenGroesse } = eingabe.data
  const pfade = [...new Set(eingabe.data.pfade)]

  const { zeile: ziel, antwort } = await editorZeileOderFehler(auth.supabase, (await params).id)
  if (!ziel) return antwort
  if (ziel.owner_id !== auth.user.id) return fehler(NUR_EIGENE, 403)
  // Im selben Material zeigen beide Blöcke auf dasselbe Bild: nichts zu kopieren
  if (von === ziel.id) return NextResponse.json({ zuordnung: {}, fehlend: [] })

  const quelle = await ladeEditorZeile(auth.supabase, von)
  // Material inzwischen gelöscht: Die Blöcke kommen ohne Bild (die App weist darauf hin)
  if (!quelle) return NextResponse.json({ zuordnung: {}, fehlend: pfade })
  if (quelle.owner_id !== auth.user.id) return fehler(NUR_EIGENE, 403)

  const gesperrt = await speicherPruefen(auth.supabase)
  if (gesperrt) return gesperrt

  const service = createServiceClient()
  const speicher = service.storage.from(WK_BUCKET)
  const angelegt: string[] = []
  try {
    // 1. Alles lesen, nichts schreiben
    const gelesen: Gelesen[] = []
    const fehlend: string[] = []
    const paket = pfade.filter((p) => !istEigenerPfad(p))
    let einlesung: { url: string } | null = null
    if (paket.length) {
      const q = await bildQuelle(service, quelle)
      einlesung = q ? { url: q.url } : null
    }
    for (const pfad of pfade) {
      if (istEigenerPfad(pfad)) {
        const datei = eigeneDatei(pfad)
        const haupt = await speicher.download(eigenerPfad(quelle.owner_id, quelle.id, datei))
        if (!haupt.data) {
          fehlend.push(pfad)
          continue
        }
        const bytes = new Uint8Array(await haupt.data.arrayBuffer())
        const art = bildArt(bytes)
        if (!art) {
          fehlend.push(pfad)
          continue
        }
        const vor = await speicher.download(eigenerPfad(quelle.owner_id, quelle.id, eigeneVorschauDatei(datei)))
        gelesen.push({ pfad, bytes, art, vorschau: vor.data ? new Uint8Array(await vor.data.arrayBuffer()) : undefined })
      } else {
        if (!einlesung) {
          fehlend.push(pfad)
          continue
        }
        let r: { bild?: string }
        try {
          r = await kern<{ bild?: string }>('/api/editor/bild', { einlesung, pfad })
        } catch {
          fehlend.push(pfad)
          continue
        }
        const bytes = typeof r.bild === 'string' ? ausDataAdresse(r.bild) : null
        const art = bytes ? bildArt(bytes) : null
        if (!bytes || !art) fehlend.push(pfad)
        else gelesen.push({ pfad, bytes, art })
      }
    }

    // 2. Prüfen, bevor etwas geschrieben wird
    const vorhanden = (await eigeneDateien(service, ziel)).length
    if (vorhanden + gelesen.length > EIGENE_MAX_ANZAHL) return fehler(ZU_VIELE_BILDER, 409)
    const dazu = gelesen.reduce((summe, g) => summe + Math.min(Math.ceil(g.bytes.length * 1.34), EINGEBETTET_SCHAETZUNG_BYTES), 0)
    if (seitenGroesse + dazu > SEITE_GRENZE_BYTES) return fehler(ZU_GROSS, 413)

    // 3. Schreiben; bei einem Fehler wird alles Angelegte wieder entfernt
    const zuordnung: Record<string, string> = {}
    for (const g of gelesen) {
      const datei = `eigen_${randomBytes(8).toString('hex')}.${g.art}`
      const pfadNeu = eigenerPfad(ziel.owner_id, ziel.id, datei)
      const vorschauPfad = eigenerPfad(ziel.owner_id, ziel.id, eigeneVorschauDatei(datei))
      angelegt.push(pfadNeu, vorschauPfad)
      if (g.vorschau) {
        const a = await speicher.upload(pfadNeu, Buffer.from(g.bytes), { contentType: g.art === 'png' ? 'image/png' : 'image/jpeg', upsert: true })
        const b = await speicher.upload(vorschauPfad, Buffer.from(g.vorschau), { contentType: 'image/jpeg', upsert: true })
        if (a.error || b.error) throw new Error('ablegen')
      } else {
        // Bild aus dem Skript-Paket: der Kern kodiert neu und legt es ab (wie beim Hochladen)
        const adresse = await schreibAdresse(service, pfadNeu)
        if (!adresse) throw new Error('ablegen')
        const r = await kern<{ vorschau: string }>('/api/editor/bild-ablegen', {
          bild: Buffer.from(g.bytes).toString('base64'),
          format: g.art,
          ziel: adresse,
        })
        const v = /^data:image\/jpeg;base64,([A-Za-z0-9+/=]+)$/.exec(String(r.vorschau))
        if (!v) throw new Error('ablegen')
        const b = await speicher.upload(vorschauPfad, Buffer.from(v[1], 'base64'), { contentType: 'image/jpeg', upsert: true })
        if (b.error) throw new Error('ablegen')
      }
      zuordnung[g.pfad] = `images/${datei}`
    }
    await aktualisiereSpeicher(service, ziel.owner_id, ziel.id)
    return NextResponse.json({ zuordnung, fehlend })
  } catch (e) {
    if (angelegt.length) await speicher.remove(angelegt).catch(() => undefined)
    if (e instanceof Error && e.message === 'ablegen') return fehler('Die Bilder konnten nicht abgelegt werden. Es wurde nichts eingefügt. Bitte versuche es erneut.', 502)
    return kernFehlerAntwort(e)
  }
}
