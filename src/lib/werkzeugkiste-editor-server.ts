import { z } from 'zod'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  ABLAUF_SPALTEN,
  ABLAUF_TABELLE,
  WK_BUCKET,
  ablaufOrdner,
  auszugPfad,
  dateiVorhanden,
  einlesungPfad,
  fehler,
  kern,
  leseAdresse,
  type AblaufZeile,
} from '@/lib/werkzeugkiste-server'
import {
  ENTWURF_MAX_ZEICHEN,
  istEditierbar,
  type EditorBefund,
  type Stelle,
  type Struktur,
} from '@/lib/werkzeugkiste-editor'

/**
 * Server-Seite des Baukasten-Editors (PROJ-89). Der Entwurf liegt am Material
 * (`entwurf`, `entwurf_am`, `entwurf_pruefung`), seine Vorschau als eigene Datei
 * `entwurf.html` neben der veröffentlichten Datei `ausgabe`. Download, Link und
 * Regal lesen nur `ausgabe` und sehen den Entwurf deshalb nie (E3).
 */

export const EDITOR_SPALTEN = `${ABLAUF_SPALTEN}, entwurf, entwurf_am, entwurf_pruefung`

export interface EditorZeile extends AblaufZeile {
  entwurf: Struktur | null
  entwurf_am: string | null
  entwurf_pruefung: { befunde: EditorBefund[] } | null
}

export const entwurfVorschauPfad = (ownerId: string, id: string) => `${ablaufOrdner(ownerId, id)}/entwurf.html`

/** Höchstgröße einer veröffentlichten Seite (wie seite.MAX_SEITE_BYTES im Kern) */
export const SEITE_MAX_BYTES = 8_000_000

export const NICHT_EDITIERBAR = 'Dieses Material lässt sich im Baukasten nicht bearbeiten.'
export const ANDERES_FENSTER = 'Dieses Material wurde in einem anderen Fenster geändert.'

// ── Eingaben ──────────────────────────────────────────────────────────────

const blockSchema = z.object({ type: z.string().max(60) }).passthrough()
const themaSchema = z.object({ title: z.string().max(500).optional(), elements: z.array(blockSchema).max(1000) }).passthrough()

export const strukturSchema = z
  .object({
    cover: z.record(z.string(), z.unknown()),
    chapters: z.array(themaSchema).max(300),
    final_chapter: z.record(z.string(), z.unknown()).optional(),
  })
  .passthrough()
  .refine((s) => JSON.stringify(s).length <= ENTWURF_MAX_ZEICHEN, {
    message: 'Der Entwurf ist zu groß geworden. Teile das Material auf.',
  })

/** `stand` = zuletzt gesehener Entwurfs-Zeitpunkt; null = der Browser kennt noch keinen Entwurf */
export const speichernSchema = z.object({ struktur: strukturSchema, stand: z.string().max(64).nullable() }).strict()

export const standSchema = z.object({ stand: z.string().max(64).nullable() }).strict()

export const rohfassungSchema = z.union([
  z.object({ richtung: z.literal('lesen'), text: z.string().max(200_000) }).strict(),
  z.object({ richtung: z.literal('schreiben'), block: blockSchema }).strict(),
])

// ── Material laden ────────────────────────────────────────────────────────

export async function ladeEditorZeile(supabase: SupabaseClient, id: string): Promise<EditorZeile | null> {
  if (!z.string().uuid().safeParse(id).success) return null
  const { data } = await supabase.from(ABLAUF_TABELLE).select(EDITOR_SPALTEN).eq('id', id).maybeSingle()
  return (data as EditorZeile | null) ?? null
}

export function editierbar(zeile: AblaufZeile): boolean {
  return istEditierbar({
    werkzeug: zeile.werkzeug,
    status: zeile.status,
    format: zeile.ergebnis?.format ?? zeile.einstellungen?.format ?? null,
  })
}

/** Gemeinsame Vorprüfung aller Editor-Routen: gibt die Zeile oder eine fertige Fehlerantwort zurück */
export async function editorZeileOderFehler(supabase: SupabaseClient, id: string) {
  const zeile = await ladeEditorZeile(supabase, id)
  if (!zeile) return { antwort: fehler('Dieses Material gibt es nicht mehr.', 404) }
  if (!editierbar(zeile)) return { antwort: fehler(NICHT_EDITIERBAR, 400, 'Der Baukasten kennt nur Materialien im Format Interaktive Seite.') }
  return { zeile }
}

export function titelVon(zeile: AblaufZeile): string {
  return zeile.titel ?? zeile.ergebnis?.titel ?? 'Material'
}

// ── Kern ──────────────────────────────────────────────────────────────────

/** Struktur des Entwurfs oder – falls es keinen gibt – der veröffentlichten Antwort */
export async function aktuelleStruktur(zeile: EditorZeile): Promise<Struktur> {
  if (zeile.entwurf) return zeile.entwurf
  if (!zeile.antwort) throw new Error('keine Antwort')
  const r = await kern<{ struktur: Struktur }>('/api/editor/struktur', {
    antwort: zeile.antwort,
    werkzeug: zeile.werkzeug,
    einstellungen: zeile.einstellungen ?? {},
  })
  return r.struktur
}

/**
 * Bildquelle für den Bau: die Einlesung, ohne Skript (nach 12 Monaten entfernt)
 * der Bilder-Auszug (PROJ-53). Bei Regal-Kopien liegt der Auszug schon unter dem
 * Pfad der Einlesung. Fehlt beides, baut der Kern ohne Bilder.
 */
export async function bildQuelle(service: SupabaseClient, zeile: AblaufZeile): Promise<{ pfad: string; url: string } | null> {
  for (const pfad of [einlesungPfad(zeile.owner_id, zeile.id), auszugPfad(zeile.owner_id, zeile.id)]) {
    if (await dateiVorhanden(service, pfad)) {
      const url = await leseAdresse(service, pfad)
      if (url) return { pfad, url }
    }
  }
  return null
}

export function befundeAusKern(roh: unknown): EditorBefund[] {
  const liste = (roh as { befunde?: unknown[] } | null)?.befunde
  if (!Array.isArray(liste)) return []
  return liste.slice(0, 200).map((b) => {
    const o = (b ?? {}) as Record<string, unknown>
    const stellen: Stelle[] = (Array.isArray(o.stellen) ? o.stellen : [])
      .map((s) => s as Record<string, unknown>)
      .map((s): Stelle | null =>
        s.abschluss === true
          ? { abschluss: true }
          : typeof s.kapitel === 'number'
            ? typeof s.element === 'number'
              ? { kapitel: s.kapitel, element: s.element }
              : { kapitel: s.kapitel }
            : null,
      )
      .filter((s): s is Stelle => s !== null)
    return {
      text: String(o.text ?? '').slice(0, 500),
      schwere: o.schwere === 'hoch' ? 'hoch' : 'mittel',
      stellen,
    }
  })
}

/** Vorschau-Datei des Entwurfs entfernen (Verwerfen, Veröffentlichen) */
export async function loescheEntwurfVorschau(service: SupabaseClient, zeile: AblaufZeile) {
  await service.storage.from(WK_BUCKET).remove([entwurfVorschauPfad(zeile.owner_id, zeile.id)])
}

/** Ist das Material öffentlich verlinkt bzw. im Regal? (für den Veröffentlichen-Dialog) */
export async function geteiltStatus(supabase: SupabaseClient, id: string): Promise<{ oeffentlich: boolean; imRegal: boolean }> {
  const [link, regal] = await Promise.all([
    supabase.from('werkzeug_links').select('id').eq('ablauf_id', id).is('abgeschaltet_am', null).maybeSingle(),
    supabase.from('regal_freigaben').select('id').eq('ablauf_id', id).is('entnommen_am', null).maybeSingle(),
  ])
  return { oeffentlich: !!link.data, imRegal: !!regal.data }
}
