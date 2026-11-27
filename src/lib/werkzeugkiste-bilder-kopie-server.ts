import { randomBytes } from 'node:crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { NextResponse } from 'next/server'
import { aktualisiereSpeicher } from '@/lib/werkzeugkiste-materialien-server'
import { WK_BUCKET, fehler, kern, kernFehlerAntwort, schreibAdresse, type AblaufZeile } from '@/lib/werkzeugkiste-server'
import { bildQuelle } from '@/lib/werkzeugkiste-editor-server'
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

/**
 * Bilder aus einem Material in ein anderes **eigenes** Material kopieren (PROJ-102, in PROJ-108
 * gemeinsam genutzt). Die Aufrufer prüfen vorher, wer lesen und schreiben darf; diese Funktion
 * kopiert nur: erst lesen, dann Anzahl und Seitengröße prüfen, dann schreiben. Bei einem Fehler
 * wird alles Angelegte wieder entfernt. Den Zielnamen vergibt immer der Server.
 */

/** Was der Kern nach dem Neukodieren höchstens liefern darf (wie beim Hochladen) */
const ERGEBNIS_MAX_BYTES = 3_000_000

export const ZU_GROSS = 'Die Seite wäre mit diesen Bildern zu groß, um die Änderungen zu übernehmen (8 MB). Es wurde nichts eingefügt. Lass Bilder weg oder teile das Material auf.'

type Ablage = Pick<AblaufZeile, 'owner_id' | 'id'>

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

export interface BilderErgebnis {
  zuordnung: Record<string, string>
  fehlend: string[]
}

/** Gibt das Ergebnis zurück oder eine fertige Fehlerantwort (dann wurde nichts geschrieben) */
export async function kopiereBilder(
  service: SupabaseClient,
  quelle: Ablage,
  ziel: Ablage,
  pfade: string[],
  seitenGroesse: number,
  /** Quelle ist fremdes Regal-Material: Bilder nur aus dem Bilder-Auszug lesen, nie aus dem Skript */
  nurAuszug = false,
): Promise<BilderErgebnis | NextResponse> {
  const speicher = service.storage.from(WK_BUCKET)
  const angelegt: string[] = []
  try {
    // 1. Alles lesen, nichts schreiben
    const gelesen: Gelesen[] = []
    const fehlend: string[] = []
    const paket = pfade.filter((p) => !istEigenerPfad(p))
    let einlesung: { url: string } | null = null
    if (paket.length) {
      const q = await bildQuelle(service, quelle, nurAuszug)
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
        const r = await kern<{ vorschau: string; bytes?: number }>('/api/editor/bild-ablegen', {
          bild: Buffer.from(g.bytes).toString('base64'),
          format: g.art,
          ziel: adresse,
        })
        const v = /^data:image\/jpeg;base64,([A-Za-z0-9+/=]+)$/.exec(String(r.vorschau))
        if (!v || Number(r.bytes) > ERGEBNIS_MAX_BYTES) throw new Error('ablegen')
        const b = await speicher.upload(vorschauPfad, Buffer.from(v[1], 'base64'), { contentType: 'image/jpeg', upsert: true })
        if (b.error) throw new Error('ablegen')
      }
      zuordnung[g.pfad] = `images/${datei}`
    }
    await aktualisiereSpeicher(service, ziel.owner_id, ziel.id)
    return { zuordnung, fehlend }
  } catch (e) {
    if (angelegt.length) await speicher.remove(angelegt).catch(() => undefined)
    if (e instanceof Error && e.message === 'ablegen') return fehler('Die Bilder konnten nicht abgelegt werden. Es wurde nichts eingefügt. Bitte versuche es erneut.', 502)
    return kernFehlerAntwort(e)
  }
}
