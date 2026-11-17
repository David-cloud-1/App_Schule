import type { SupabaseClient } from '@supabase/supabase-js'
import type { NextResponse } from 'next/server'
import { z } from 'zod'
import { kernWerkzeug, istEditierbar, nieVeroeffentlicht, type Struktur } from '@/lib/werkzeugkiste-editor'
import { aktuelleStruktur, editierbar, editorZeileOderFehler, ladeEditorZeile, NICHT_EDITIERBAR } from '@/lib/werkzeugkiste-editor-server'
import { fehler, kern, kernFehlerAntwort } from '@/lib/werkzeugkiste-server'
import { UEBERNAHME_MAX_BLOECKE, UEBERNAHME_MAX_THEMEN, type QuelleRef } from '@/lib/werkzeugkiste-uebernahme'

/**
 * Server-Seite von „Aus Material übernehmen“ (PROJ-108). Der Browser nennt nur Quelle und Nummern;
 * die Inhalte liest immer der Server, und nur, wenn die Lehrkraft die Quelle sehen darf:
 *  - eigen: das Material gehört der Lehrkraft (Entwurf, sonst veröffentlichte Fassung, wie im Editor)
 *  - regal: die Datenbankfunktion `regal_anpassen_quelle` entscheidet, nie der Entwurf des Urhebers
 */

export const quelleSchema = z.object({ art: z.enum(['eigen', 'regal']), id: z.string().uuid() }).strict()

const nummer = z.number().int().min(0).max(UEBERNAHME_MAX_BLOECKE * 5)
export const auswahlSchema = z
  .object({
    themen: z.array(nummer).max(UEBERNAHME_MAX_THEMEN),
    bloecke: z.array(z.object({ thema: nummer, block: nummer }).strict()).max(UEBERNAHME_MAX_BLOECKE),
    fragen: z.array(nummer).max(UEBERNAHME_MAX_BLOECKE),
  })
  .strict()

export const NUR_EIGENE_ZIELE = 'Du kannst nur dein eigenes Material ändern.'
export const NICHT_GEFUNDEN = 'Dieses Material gibt es nicht mehr oder du darfst es nicht sehen.'
export const KEINE_SEITE = 'Dieses Material ist keine Interaktive Seite. Nur solche Materialien lassen sich hier übernehmen.'

/** Eine geladene, freigegebene Quelle */
export interface GeladeneQuelle {
  ref: QuelleRef
  /** Material, aus dem die Bilder stammen */
  ablauf: { id: string; owner_id: string }
  titel: string
  werkzeug: string
  einstellungen: Record<string, unknown>
  struktur: Struktur
  /** Regal-Material anderer: Bilder nur aus dem Bilder-Auszug lesen */
  nurAuszug: boolean
  herkunft?: string
}

interface RegalQuelle {
  ablauf_id: string
  owner_id: string
  titel: string
  werkzeug: string
  antwort: string | null
  einstellungen: Record<string, string> | null
  ergebnis: Record<string, unknown> | null
  besitzer_name: string
  von_mir: boolean
}

type Geladen = { quelle: GeladeneQuelle; antwort?: undefined } | { quelle?: undefined; antwort: NextResponse }

export async function ladeQuelle(supabase: SupabaseClient, nutzerId: string, ref: QuelleRef): Promise<Geladen> {
  if (ref.art === 'eigen') {
    const zeile = await ladeEditorZeile(supabase, ref.id)
    if (!zeile || zeile.owner_id !== nutzerId) return { antwort: fehler(NICHT_GEFUNDEN, 404) }
    if (!editierbar(zeile)) return { antwort: fehler(KEINE_SEITE, 400, NICHT_EDITIERBAR) }
    if (!zeile.entwurf && !zeile.antwort && !nieVeroeffentlicht(zeile)) return { antwort: fehler('Zu diesem Material gibt es keine Inhalte.', 400) }
    try {
      const struktur = await aktuelleStruktur(zeile)
      return {
        quelle: {
          ref,
          ablauf: { id: zeile.id, owner_id: zeile.owner_id },
          titel: zeile.titel ?? (typeof zeile.ergebnis?.titel === 'string' ? zeile.ergebnis.titel : 'Material'),
          werkzeug: zeile.werkzeug,
          einstellungen: zeile.einstellungen ?? {},
          struktur,
          nurAuszug: false,
        },
      }
    } catch (e) {
      return { antwort: kernFehlerAntwort(e) }
    }
  }

  // Regal: Die Datenbank prüft die Sichtbarkeit (sonst keine Zeile, auch für Unbekanntes)
  const { data, error } = await supabase.rpc('regal_anpassen_quelle', { p_freigabe_id: ref.id })
  if (error) return { antwort: fehler('Das hat gerade nicht geklappt. Bitte versuche es erneut.', 500) }
  const r = (Array.isArray(data) ? data[0] : null) as RegalQuelle | null
  if (!r) return { antwort: fehler(NICHT_GEFUNDEN, 404) }
  const format = (r.ergebnis?.format as string | undefined) ?? r.einstellungen?.format ?? null
  if (!r.antwort || !istEditierbar({ werkzeug: r.werkzeug, status: 'fertig', format })) return { antwort: fehler(KEINE_SEITE, 400) }
  try {
    const { struktur } = await kern<{ struktur: Struktur }>('/api/editor/struktur', {
      antwort: r.antwort,
      werkzeug: kernWerkzeug(r.werkzeug),
      einstellungen: r.einstellungen ?? {},
    })
    return {
      quelle: {
        ref,
        ablauf: { id: r.ablauf_id, owner_id: r.owner_id },
        titel: r.titel,
        werkzeug: r.werkzeug,
        einstellungen: r.einstellungen ?? {},
        struktur,
        nurAuszug: !r.von_mir,
        herkunft: r.von_mir ? undefined : `${r.titel}, ${r.besitzer_name}`.slice(0, 200),
      },
    }
  } catch (e) {
    return { antwort: kernFehlerAntwort(e) }
  }
}

/** Das Ziel der Übernahme: ein eigenes Material, das der Baukasten bearbeiten kann */
export async function zielOderFehler(supabase: SupabaseClient, nutzerId: string, id: string) {
  const { zeile, antwort } = await editorZeileOderFehler(supabase, id)
  if (!zeile) return { antwort }
  if (zeile.owner_id !== nutzerId) return { antwort: fehler(NUR_EIGENE_ZIELE, 403) }
  return { zeile }
}
