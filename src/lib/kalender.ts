import { z } from 'zod'

/**
 * Abwesenheitskalender (PROJ-120) — gemeinsame Werte, Typen und
 * Eingabe-Regeln für Schnittstellen und Oberfläche. Die Grenzen entsprechen
 * den Prüfungen in den Datenbank-Funktionen abw_* (dort sind sie die letzte
 * Instanz).
 */

export const KALENDER_ABTEILUNGEN = [
  { id: 'spedition', name: 'Spedition', kurz: 'SPED' },
  { id: 'touristik', name: 'Touristik', kurz: 'TOUR' },
  { id: 'verkehrsservice', name: 'Verkehrsservice', kurz: 'VS' },
  { id: 'kep', name: 'KEP', kurz: 'KEP' },
  { id: 'bik-bvj', name: 'BIK/BVJ', kurz: 'BIK/BVJ' },
] as const

export type AbteilungId = (typeof KALENDER_ABTEILUNGEN)[number]['id']
export const ABTEILUNG_IDS = KALENDER_ABTEILUNGEN.map((a) => a.id) as [AbteilungId, ...AbteilungId[]]

export const VERTRETUNG_STATUS = ['offen', 'eingetragen', 'nicht_noetig'] as const
export type VertretungStatus = (typeof VERTRETUNG_STATUS)[number]

export const VERTRETUNG_LABEL: Record<VertretungStatus, string> = {
  offen: 'Vertretung offen',
  eingetragen: 'Vertretung organisiert',
  nicht_noetig: 'Keine Vertretung nötig',
}

export const ART_FARBEN = ['green', 'blue', 'orange', 'gold', 'red', 'faint'] as const
export type ArtFarbe = (typeof ART_FARBEN)[number]

export const ART_ICONS = [
  'graduation-cap',
  'footprints',
  'briefcase',
  'clipboard-check',
  'bus',
  'calendar-x',
  'calendar',
  'users',
  'map-pin',
  'plane',
  'book-open',
  'school',
  'presentation',
  'building',
] as const
export type ArtIcon = (typeof ART_ICONS)[number]

export const KALENDER_LIMITS = {
  textMax: 300,
  maxTage: 365,
  listeSeite: 50,
  zeitraumMaxTage: 62,
  artNameMin: 2,
  artNameMax: 60,
} as const

/** Ein Eintrag, wie ihn abw_liste / abw_eintrag liefert. */
export interface Abwesenheit {
  id: string
  person_id: string | null
  person_name: string
  erstellt_von: string | null
  erstellt_von_name: string
  art_id: string
  art_name: string
  art_farbe: ArtFarbe
  art_icon: ArtIcon
  datum_von: string
  datum_bis: string
  ganztaegig: boolean
  zeit_von: string | null
  zeit_bis: string | null
  alle_abteilungen: boolean
  abteilungen: AbteilungId[]
  freitext: string | null
  notiz: string | null
  vertretung_status: VertretungStatus
  vertretung_von_name: string | null
  vertretung_am: string | null
  geaendert_nach_vertretung: boolean
  version: number
  created_at: string
  updated_at: string
  darf_bearbeiten: boolean
  updated_by_name?: string | null
}

export interface AbwesenheitsArt {
  id: string
  name: string
  farbe: ArtFarbe
  icon: ArtIcon
  sort_order: number
  aktiv: boolean
  fest: boolean
  mit_freitext: boolean
  anzahl: number
}

export interface KalenderHinweis {
  id: string
  abwesenheit_id: string
  anlass: 'eingetragen' | 'geaendert' | 'geloescht' | 'vertretung'
  text: string
  ausgeloest_von_name: string
  created_at: string
}

export interface KalenderIch {
  id: string
  ist_planer: boolean
  ist_super_admin: boolean
}

// ── Fehler der Datenbank-Funktionen → HTTP ────────────────────────────────

export function kalenderErrorStatus(code: string | undefined | null): number | null {
  switch (code) {
    case 'ABW01':
      return 429
    case 'ABW02':
      return 404
    case 'ABW03':
      return 403
    case 'ABW04':
      return 400
    case 'ABW06':
      return 409
    default:
      return null
  }
}

// ── Eingabe-Regeln ────────────────────────────────────────────────────────

const uuid = z.string().uuid('Ungültige Kennung.')
const DATUM = /^\d{4}-\d{2}-\d{2}$/
const ZEIT = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/

/** Echtes Kalenderdatum im Format JJJJ-MM-TT (kein 31.02.). */
export function isIsoDate(value: string): boolean {
  if (!DATUM.test(value)) return false
  const [y, m, d] = value.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d
}

const datum = z.string().refine(isIsoDate, 'Bitte ein gültiges Datum angeben.')
const zeit = z.string().regex(ZEIT, 'Bitte eine gültige Uhrzeit angeben.')

/** Tage zwischen zwei ISO-Daten (bis − von). */
export function tageZwischen(von: string, bis: string): number {
  const [y1, m1, d1] = von.split('-').map(Number)
  const [y2, m2, d2] = bis.split('-').map(Number)
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86_400_000)
}

const optText = z
  .string()
  .max(KALENDER_LIMITS.textMax, `Höchstens ${KALENDER_LIMITS.textMax} Zeichen.`)
  .nullish()
  .transform((v) => (v && v.trim() ? v.trim() : null))

export const abwesenheitInputSchema = z
  .object({
    person_id: uuid,
    art_id: uuid,
    datum_von: datum,
    datum_bis: datum,
    ganztaegig: z.boolean().default(true),
    zeit_von: zeit.nullish(),
    zeit_bis: zeit.nullish(),
    alle_abteilungen: z.boolean().default(false),
    abteilungen: z.array(z.enum(ABTEILUNG_IDS, { error: 'Unbekannte Abteilung.' })).max(10).default([]),
    freitext: optText,
    notiz: optText,
  })
  .superRefine((v, ctx) => {
    if (v.datum_bis < v.datum_von) {
      ctx.addIssue({ code: 'custom', path: ['datum_bis'], message: '„Bis“ darf nicht vor „Von“ liegen.' })
    } else if (tageZwischen(v.datum_von, v.datum_bis) > KALENDER_LIMITS.maxTage) {
      ctx.addIssue({ code: 'custom', path: ['datum_bis'], message: 'Ein Eintrag darf höchstens ein Jahr lang sein.' })
    }
    if (!v.ganztaegig) {
      if (!v.zeit_von || !v.zeit_bis) {
        ctx.addIssue({ code: 'custom', path: ['zeit_von'], message: 'Bitte Uhrzeit von und bis angeben.' })
      } else if (v.datum_von === v.datum_bis && v.zeit_bis.slice(0, 5) <= v.zeit_von.slice(0, 5)) {
        ctx.addIssue({ code: 'custom', path: ['zeit_bis'], message: 'Die Uhrzeit „bis“ muss nach „von“ liegen.' })
      }
    }
    if (!v.alle_abteilungen && v.abteilungen.length === 0) {
      ctx.addIssue({
        code: 'custom',
        path: ['abteilungen'],
        message: 'Bitte mindestens eine Abteilung oder „Alle Abteilungen“ wählen.',
      })
    }
  })

export type AbwesenheitInput = z.infer<typeof abwesenheitInputSchema>

export const abwesenheitUpdateSchema = z.intersection(
  abwesenheitInputSchema,
  z.object({ version: z.number().int().positive('Version fehlt.') })
)

export const vertretungSchema = z.object({
  version: z.number().int().positive('Version fehlt.'),
  status: z.enum(VERTRETUNG_STATUS, { error: 'Unbekannter Status.' }),
})

export const listeQuerySchema = z
  .object({
    von: datum,
    bis: datum,
    abteilung: z.enum(ABTEILUNG_IDS).optional(),
    status: z.enum(VERTRETUNG_STATUS).optional(),
    art: uuid.optional(),
    q: z.string().trim().max(100).optional(),
    limit: z.coerce.number().int().min(1).max(500).default(500),
    offset: z.coerce.number().int().min(0).max(100_000).default(0),
  })
  .refine((v) => v.bis >= v.von, { message: '„Bis“ darf nicht vor „Von“ liegen.', path: ['bis'] })
  .refine((v) => tageZwischen(v.von, v.bis) <= KALENDER_LIMITS.zeitraumMaxTage, {
    message: 'Der Zeitraum ist zu lang.',
    path: ['bis'],
  })

export const ueberschneidungQuerySchema = z
  .object({
    person: uuid,
    von: datum,
    bis: datum,
    ausser: uuid.optional(),
  })
  .refine((v) => v.bis >= v.von, { message: '„Bis“ darf nicht vor „Von“ liegen.', path: ['bis'] })

export const artInputSchema = z.object({
  name: z
    .string()
    .trim()
    .min(KALENDER_LIMITS.artNameMin, `Der Name braucht mindestens ${KALENDER_LIMITS.artNameMin} Zeichen.`)
    .max(KALENDER_LIMITS.artNameMax, `Der Name darf höchstens ${KALENDER_LIMITS.artNameMax} Zeichen haben.`),
  farbe: z.enum(ART_FARBEN, { error: 'Bitte eine Farbe wählen.' }),
  icon: z.enum(ART_ICONS, { error: 'Bitte ein Symbol wählen.' }),
  aktiv: z.boolean().default(true),
  mit_freitext: z.boolean().default(false),
})

export const artenSortierungSchema = z.object({
  ids: z.array(uuid).min(1).max(100),
})

export const hinweisGesehenSchema = z.object({
  id: uuid.nullish(),
})

export const planerSchema = z.object({
  wert: z.boolean(),
})

// ── Datum (deutsche Ortszeit) ─────────────────────────────────────────────

/** Heutiges Datum in Deutschland als JJJJ-MM-TT, unabhängig von der Zeitzone des Geräts/Servers. */
export function heuteInBerlin(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Berlin',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now)
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? ''
  return `${get('year')}-${get('month')}-${get('day')}`
}

/** Datum um n Tage verschieben (rein kalendarisch, ohne Zeitzonen-Effekte). */
export function addTage(iso: string, n: number): string {
  const [y, m, d] = iso.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d + n))
  return dt.toISOString().slice(0, 10)
}

/** Zeitraum in deutscher Schreibweise: „24.11.2026“, „24.11.–25.11.2026“. */
export function zeitraumText(von: string, bis: string): string {
  const fmt = (iso: string, mitJahr: boolean) => {
    const [y, m, d] = iso.split('-')
    return mitJahr ? `${d}.${m}.${y}` : `${d}.${m}.`
  }
  if (von === bis) return fmt(von, true)
  if (von.slice(0, 4) === bis.slice(0, 4)) return `${fmt(von, false)}–${fmt(bis, true)}`
  return `${fmt(von, true)}–${fmt(bis, true)}`
}
