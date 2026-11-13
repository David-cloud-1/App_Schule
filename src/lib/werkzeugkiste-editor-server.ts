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
  grundgeruest,
  istEditierbar,
  kernWerkzeug,
  nieVeroeffentlicht,
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
/** Zwischendateien beim Veröffentlichen: erst nach erfolgreichem Speichern ersetzen sie `ausgabe` und `vorschau.html` */
export const neueAusgabePfad = (ownerId: string, id: string) => `${ablaufOrdner(ownerId, id)}/ausgabe-neu`
export const neueVorschauPfad = (ownerId: string, id: string) => `${ablaufOrdner(ownerId, id)}/vorschau-neu.html`

/**
 * Gleicher Entwurfs-Stand? Als Zeitpunkt verglichen, nicht als Text: Die Datenbank
 * liefert `…+00:00`, `toISOString()` schreibt `…Z` (QA BUG-1).
 */
export function gleicherStand(a: string | null | undefined, b: string | null | undefined): boolean {
  if (a == null || b == null) return a == null && b == null
  const x = Date.parse(a)
  const y = Date.parse(b)
  return Number.isFinite(x) && x === y
}

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
  // PROJ-94: Eine eigene Seite ohne Entwurf und ohne Fassung beginnt wieder beim Grundgerüst
  if (!zeile.antwort && nieVeroeffentlicht(zeile)) return grundgeruest(titelVon(zeile))
  if (!zeile.antwort) throw new Error('keine Antwort')
  const r = await kern<{ struktur: Struktur }>('/api/editor/struktur', {
    antwort: zeile.antwort,
    werkzeug: kernWerkzeug(zeile.werkzeug),
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

/**
 * Fehlende Bilder aus dem Bau (Kern: `fehlende_bilder`) als Hinweise am Block –
 * die Gliederung zeigt sie so wie die Befunde der Prüfstelle (QA BUG-5).
 */
export function bildBefunde(roh: unknown): EditorBefund[] {
  const liste = (roh as { fehlende_bilder?: unknown[] } | null)?.fehlende_bilder
  if (!Array.isArray(liste)) return []
  return liste.slice(0, 100).flatMap((b) => {
    const o = (b ?? {}) as Record<string, unknown>
    if (typeof o.kapitel !== 'number' || typeof o.element !== 'number') return []
    const pfad = String(o.pfad ?? '').split('/').pop()?.slice(0, 200) || 'ohne Pfad'
    return [{ text: `Bild fehlt: ${pfad}`, schwere: 'mittel' as const, stellen: [{ kapitel: o.kapitel, element: o.element }] }]
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

// ── Eigene Seite (PROJ-94) ────────────────────────────────────────────────

export const ERST_VEROEFFENTLICHEN = 'Erst veröffentlichen.'

/**
 * Download, öffentlicher Link und Regal lesen nur die veröffentlichte Datei.
 * Eine eigene Seite, die noch nie veröffentlicht wurde, hat keine – dann 409
 * mit einem Satz, den die Oberfläche zeigen kann.
 */
export function erstVeroeffentlichen(zeile: { werkzeug: string; antwort?: string | null; ergebnis?: unknown }) {
  if (!nieVeroeffentlicht(zeile)) return null
  return fehler(ERST_VEROEFFENTLICHEN, 409, 'Veröffentliche die Seite im Baukasten, dann geht es hier weiter.')
}
