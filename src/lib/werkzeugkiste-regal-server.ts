import { z } from 'zod'
import { findeWerkzeug } from '@/lib/werkzeugkiste'
import {
  MAX_PERSONEN,
  NOTIZ_MAX,
  REGAL_SEITE,
  SUCHE_MAX,
  type FreigabePerson,
  type FreigabeStand,
  type MaterialRegal,
  type RegalKarte,
  type RegalStufe,
} from '@/lib/werkzeugkiste-regal'
import { fehler } from '@/lib/werkzeugkiste-server'

/**
 * Server-Seite des Regals (PROJ-53): Eingabeprüfung, Umwandlung der Zeilen
 * aus den Datenbankfunktionen und die Abbildung ihrer Fehler. Nur in
 * API-Routen verwenden. Wer was sehen darf, entscheidet allein die Datenbank
 * (regal_darf_sehen); hier steht keine zweite Sichtbarkeitsregel.
 */

const KEINE_STEUERZEICHEN = /^[^\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]*$/

export const freigabeSchema = z.object({
  stufe: z.enum(['fachbereich', 'alle', 'ausgewaehlte'], { message: 'Bitte wähle, wer das Material sehen darf.' }),
  fachId: z.string().uuid().nullable().optional(),
  notiz: z
    .string()
    .trim()
    .max(NOTIZ_MAX, `Die Notiz ist zu lang (höchstens ${NOTIZ_MAX} Zeichen).`)
    .regex(KEINE_STEUERZEICHEN, 'Die Notiz enthält ungültige Zeichen.')
    .optional(),
  bereiche: z.array(z.string().uuid()).max(50).optional(),
  personen: z
    .array(z.string().uuid())
    .max(MAX_PERSONEN, `Du kannst höchstens ${MAX_PERSONEN} Personen auswählen. Teile besser mit dem Fachbereich oder allen.`)
    .optional(),
})

export const regalAbfrageSchema = z.object({
  suche: z.string().max(SUCHE_MAX, 'Der Suchbegriff ist zu lang.').default(''),
  fach: z.string().uuid().optional(),
  werkzeug: z
    .string()
    .max(40)
    .refine((id) => !!findeWerkzeug(id), { message: 'Dieses Werkzeug gibt es nicht.' })
    .optional(),
  sortierung: z.enum(['neueste', 'geladen']).default('neueste'),
  seite: z.coerce.number().int().min(1).max(1000).default(1),
})

export interface RegalZeile {
  freigabe_id: string
  titel: string
  werkzeug: string
  format: string | null
  fach_id: string | null
  fach_name: string | null
  notiz: string | null
  besitzer_name: string
  von_mir: boolean
  mit_mir_geteilt: boolean
  hat_datei: boolean
  geladen: number | string
  geteilt_am: string
  gesamt: number | string
}

export function zeileZuKarte(z: RegalZeile): RegalKarte {
  return {
    id: z.freigabe_id,
    titel: z.titel,
    werkzeug: z.werkzeug,
    format: z.format,
    fachId: z.fach_id,
    fachName: z.fach_name,
    notiz: z.notiz,
    besitzerName: z.besitzer_name,
    vonMir: !!z.von_mir,
    mitMirGeteilt: !!z.mit_mir_geteilt,
    hatDatei: !!z.hat_datei,
    geladen: Number(z.geladen) || 0,
    geteiltAm: z.geteilt_am,
  }
}

export const REGAL_LIMIT = REGAL_SEITE

/** Zeile aus regal_freigabe_lesen (JSON) in den Stand für den Dialog */
export function lesenZuStand(roh: unknown): FreigabeStand | null {
  if (!roh || typeof roh !== 'object') return null
  const r = roh as Record<string, unknown>
  const stufe = r.stufe
  if (stufe !== 'fachbereich' && stufe !== 'alle' && stufe !== 'ausgewaehlte') return null
  const liste = <T,>(w: unknown): T[] => (Array.isArray(w) ? (w as T[]) : [])
  return {
    stufe: stufe as RegalStufe,
    fachId: typeof r.fachId === 'string' ? r.fachId : null,
    notiz: typeof r.notiz === 'string' ? r.notiz : null,
    bereiche: liste<{ id: string; name: string }>(r.bereiche).map((b) => ({ id: b.id, name: b.name })),
    personen: liste<FreigabePerson>(r.personen).map((p) => ({ id: p.id, name: p.name, aktiv: !!p.aktiv })),
    entnommenAm: typeof r.entnommenAm === 'string' ? r.entnommenAm : null,
    entnommenGrund: typeof r.entnommenGrund === 'string' ? r.entnommenGrund : null,
  }
}

/** Zeile aus der Freigaben-Abfrage der eigenen Materialien (mit Zählern der Unter-Tabellen) */
export interface RegalVermerkZeile {
  ablauf_id: string
  stufe: RegalStufe
  entnommen_am: string | null
  regal_freigabe_personen?: { count: number }[] | null
  regal_freigabe_bereiche?: { count: number }[] | null
}

export function vermerkZuRegal(z: RegalVermerkZeile): MaterialRegal {
  return {
    stufe: z.stufe,
    personen: z.regal_freigabe_personen?.[0]?.count ?? 0,
    bereiche: z.regal_freigabe_bereiche?.[0]?.count ?? 0,
    entnommen: !!z.entnommen_am,
  }
}

/**
 * Fehler einer Datenbankfunktion auf eine Antwort abbilden. P0001 sind
 * Sätze für die Lehrkraft (Eingabefehler, gesperrt); „nicht gefunden“ und
 * „nicht erlaubt“ sehen von außen gleich aus (404), damit niemand Material
 * erraten kann.
 */
export function fehlerAusFunktion(error: { code?: string; message?: string } | null | undefined) {
  if (error?.code === 'P0001' && error.message) return fehler(error.message, 409)
  if (error?.code === 'P0002' || error?.code === '42501') return fehler('Dieses Material gibt es nicht mehr.', 404)
  return fehler('Das hat gerade nicht geklappt. Bitte versuche es erneut.', 500)
}
