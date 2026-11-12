import type { SupabaseClient } from '@supabase/supabase-js'
import {
  WK_BUCKET,
  ablaufOrdner,
  leseAdresse,
  type AblaufZeile,
} from '@/lib/werkzeugkiste-server'
import {
  EIGENE_MAX_ANZAHL,
  eigeneBilderIn,
  eigeneDatei,
  eigeneVorschauDatei,
  istEigenerPfad,
} from '@/lib/werkzeugkiste-bilder'
import type { MaterialBild } from '@/lib/werkzeugkiste-editor'

/** Server-Seite der eigenen Bilder (PROJ-92): Ablage im Ordner des Materials, Listen, Aufräumen */

const HAUPTDATEI = /^eigen_[A-Za-z0-9]{6,32}\.(jpg|png)$/

export const eigenerPfad = (ownerId: string, id: string, datei: string) => `${ablaufOrdner(ownerId, id)}/${datei}`

/** Die hochgeladenen Bilder des Materials (ohne Vorschaudateien), mit dem Zeitpunkt des Hochladens */
async function eigeneMitAlter(service: SupabaseClient, zeile: Pick<AblaufZeile, 'owner_id' | 'id'>) {
  const { data } = await service.storage.from(WK_BUCKET).list(ablaufOrdner(zeile.owner_id, zeile.id), { limit: 300 })
  return (data ?? [])
    .filter((f) => HAUPTDATEI.test(f.name))
    .map((f) => ({ name: f.name, seit: Date.parse((f as { created_at?: string }).created_at ?? '') }))
}

/** Die hochgeladenen Bilder des Materials (ohne Vorschaudateien) */
export async function eigeneDateien(service: SupabaseClient, zeile: Pick<AblaufZeile, 'owner_id' | 'id'>): Promise<string[]> {
  return (await eigeneMitAlter(service, zeile)).map((f) => f.name)
}

/** Frisch hochgeladene Bilder bleiben beim Aufräumen stehen: Sie können gerade in einem anderen Fenster eingesetzt werden */
export const SCHONFRIST_MS = 15 * 60 * 1000

function alsDataAdresse(bytes: ArrayBuffer, typ: string): string {
  return `data:${typ};base64,${Buffer.from(bytes).toString('base64')}`
}

/** Die eigenen Bilder für die Bildauswahl, mit kleinem Vorschaubild; ohne Vorschau fällt ein Bild weg */
export async function eigeneListe(service: SupabaseClient, zeile: Pick<AblaufZeile, 'owner_id' | 'id'>): Promise<MaterialBild[]> {
  const dateien = (await eigeneDateien(service, zeile)).slice(0, EIGENE_MAX_ANZAHL)
  const speicher = service.storage.from(WK_BUCKET)
  const liste = await Promise.all(
    dateien.map(async (datei): Promise<MaterialBild | null> => {
      const { data } = await speicher.download(eigenerPfad(zeile.owner_id, zeile.id, eigeneVorschauDatei(datei)))
      if (!data) return null
      return { pfad: `images/${datei}`, vorschau: alsDataAdresse(await data.arrayBuffer(), 'image/jpeg'), breite: 0, hoehe: 0 }
    }),
  )
  return liste.filter((b): b is MaterialBild => b !== null).sort((a, b) => a.pfad.localeCompare(b.pfad))
}

/** Ein eigenes Bild in voller gespeicherter Größe als data:-Adresse; null, wenn es das Bild nicht gibt */
export async function leseEigenesBild(
  service: SupabaseClient,
  zeile: Pick<AblaufZeile, 'owner_id' | 'id'>,
  pfad: string,
): Promise<string | null> {
  if (!istEigenerPfad(pfad)) return null
  const datei = eigeneDatei(pfad)
  const { data } = await service.storage.from(WK_BUCKET).download(eigenerPfad(zeile.owner_id, zeile.id, datei))
  if (!data) return null
  return alsDataAdresse(await data.arrayBuffer(), datei.endsWith('.png') ? 'image/png' : 'image/jpeg')
}

/**
 * Leseadressen der eigenen Bilder, die der Text (Entwurf als JSON) wirklich benutzt – nur
 * diese gehen an den Kern. Namen, die es nicht (mehr) gibt, fehlen; der Kern meldet sie als „Bild fehlt“.
 */
export async function eigeneFuerBau(
  service: SupabaseClient,
  zeile: Pick<AblaufZeile, 'owner_id' | 'id'>,
  text: string,
): Promise<{ pfad: string; url: string }[]> {
  const benutzt = eigeneBilderIn(text)
  if (!benutzt.length) return []
  const vorhanden = new Set(await eigeneDateien(service, zeile))
  const liste = await Promise.all(
    benutzt
      .filter((p) => vorhanden.has(eigeneDatei(p)))
      .slice(0, 40)
      .map(async (pfad) => {
        const url = await leseAdresse(service, eigenerPfad(zeile.owner_id, zeile.id, eigeneDatei(pfad)))
        return url ? { pfad, url } : null
      }),
  )
  return liste.filter((e): e is { pfad: string; url: string } => e !== null)
}

/**
 * Nach dem Veröffentlichen: eigene Bilder, die in der neuen Fassung nirgends stehen, entfernen
 * (Hauptdatei und Vorschau), außer sie sind jünger als 15 Minuten. Best effort – ein Fehler hier lässt nichts scheitern.
 */
export async function loescheUnbenutzteEigene(
  service: SupabaseClient,
  zeile: Pick<AblaufZeile, 'owner_id' | 'id'>,
  veroeffentlichterText: string,
  jetzt = Date.now(),
): Promise<number> {
  try {
    const benutzt = new Set(eigeneBilderIn(veroeffentlichterText).map(eigeneDatei))
    const weg = (await eigeneMitAlter(service, zeile))
      .filter((f) => !benutzt.has(f.name) && !(jetzt - f.seit < SCHONFRIST_MS))
      .map((f) => f.name)
    if (!weg.length) return 0
    const pfade = weg.flatMap((d) => [d, eigeneVorschauDatei(d)]).map((d) => eigenerPfad(zeile.owner_id, zeile.id, d))
    await service.storage.from(WK_BUCKET).remove(pfade)
    return weg.length
  } catch {
    return 0
  }
}
