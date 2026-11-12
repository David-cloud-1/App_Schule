import { z } from 'zod'
import type { SupabaseClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { KernFehler } from '@/lib/werkzeugkiste-server'
import {
  ANTWORT_MAX_ZEICHEN,
  FRAGE_MAX_ZEICHEN,
  SACHVERHALT_MAX_ZEICHEN,
  type Fall,
  type FallPruefung,
  type FallSchritt,
  type FundstellenVerweis,
} from '@/lib/schulrecht'

/**
 * Server-Seite von „Schulrecht“ (PROJ-55): Eingabeprüfung, Tabellenzeile ↔ Fall
 * und der Binär-Aufruf für die Word-Datei. Nur in API-Routen verwenden.
 *
 * Datenschutz (E4): Fragen, Sachverhalte und Antworten werden hier weder
 * protokolliert noch in Fehlermeldungen übernommen.
 */

export const FALL_TABELLE = 'schulrecht_faelle'
export const FALL_LAUFZEIT_MS = 24 * 60 * 60 * 1000
/** Gegen Missbrauch: so viele Fälle darf eine Lehrkraft gleichzeitig haben */
export const MAX_OFFENE_FAELLE = 20

// ── Eingaben ──────────────────────────────────────────────────────────────

const kuerzel = z.string().trim().min(1).max(20)

export const sucheSchema = z
  .object({
    frage: z.string().trim().min(1, 'Bitte gib eine Frage ein.').max(FRAGE_MAX_ZEICHEN, `Die Frage ist zu lang (höchstens ${FRAGE_MAX_ZEICHEN} Zeichen).`),
    quellen: z.array(kuerzel).max(20).optional(),
  })
  .strict()

export const erkennenSchema = z
  .object({
    sachverhalt: z.string().trim().min(1, 'Der Sachverhalt darf nicht leer sein.').max(SACHVERHALT_MAX_ZEICHEN, `Der Sachverhalt ist zu lang (höchstens ${SACHVERHALT_MAX_ZEICHEN} Zeichen).`),
  })
  .strict()

export const verweisSchema = z.object({ kuerzel, nr: z.string().trim().min(1).max(30) }).strict()

export const neuerFallSchema = z
  .object({
    sachverhalt: erkennenSchema.shape.sachverhalt,
    fundstellen: z.array(verweisSchema).max(30, 'Es sind zu viele Fundstellen.'),
    alleAbgelehnt: z.boolean(),
  })
  .strict()

export const fragePromptSchema = z
  .object({
    frage: sucheSchema.shape.frage,
    fundstellen: z.array(verweisSchema).min(1, 'Es fehlen die Fundstellen.').max(15, 'Es sind zu viele Fundstellen.'),
  })
  .strict()

export const fallAenderungSchema = z.object({ schritt: z.number().int().min(1).max(3) }).strict()

export const fallAntwortSchema = z
  .object({
    antwort: z.string().max(ANTWORT_MAX_ZEICHEN, `Die Antwort ist zu lang (höchstens ${ANTWORT_MAX_ZEICHEN.toLocaleString('de-DE')} Zeichen).`),
  })
  .strict()

export const kuerzelParam = z.string().trim().regex(/^[A-Za-z0-9ÄÖÜäöüß-]{1,20}$/, 'Diese Rechtsquelle gibt es nicht.')
export const nrParam = z.string().trim().min(1, 'Diese Stelle gibt es nicht.').max(30, 'Diese Stelle gibt es nicht.')

// ── Tabellenzeile ↔ Fall ──────────────────────────────────────────────────

export interface FallZeile {
  id: string
  owner_id: string
  schritt: number
  sachverhalt: string
  fundstellen: unknown
  alle_abgelehnt: boolean
  prompt: string | null
  antwort: string | null
  pruefung: unknown
  laeuft_ab_am: string
}

export const FALL_SPALTEN = 'id, owner_id, schritt, sachverhalt, fundstellen, alle_abgelehnt, prompt, antwort, pruefung, laeuft_ab_am'

function verweise(roh: unknown): FundstellenVerweis[] {
  if (!Array.isArray(roh)) return []
  return roh
    .filter((v): v is Record<string, unknown> => !!v && typeof v === 'object')
    .map((v) => ({ kuerzel: String(v.kuerzel ?? ''), nr: String(v.nr ?? '') }))
    .filter((v) => v.kuerzel && v.nr)
}

function pruefung(roh: unknown): FallPruefung | null {
  if (!roh || typeof roh !== 'object') return null
  const p = roh as Record<string, unknown>
  return {
    lesbar: p.lesbar !== false,
    fehler: typeof p.fehler === 'string' ? p.fehler : null,
    befunde: Array.isArray(p.befunde)
      ? p.befunde.filter((b): b is { text: string } => !!b && typeof (b as { text?: unknown }).text === 'string').map((b) => ({ text: b.text }))
      : [],
  }
}

export function zeileZuFall(z: FallZeile): Fall {
  return {
    id: z.id,
    schritt: Math.min(3, Math.max(1, z.schritt)) as FallSchritt,
    sachverhalt: z.sachverhalt,
    fundstellen: verweise(z.fundstellen),
    prompt: z.prompt,
    antwort: z.antwort ?? '',
    pruefung: pruefung(z.pruefung),
    laeuftAb: z.laeuft_ab_am,
  }
}

/** Zeitstempel für jede Änderung: zuletzt bearbeitet + läuft 24 Stunden später ab */
export function frischStempel(jetzt = new Date()) {
  return { updated_at: jetzt.toISOString(), laeuft_ab_am: new Date(jetzt.getTime() + FALL_LAUFZEIT_MS).toISOString() }
}

/** Eigenen Fall lesen (Zeilenregel: nur eigene, nur mit Lehrer-Rolle, abgelaufene unsichtbar) */
export async function ladeEigenenFall(supabase: SupabaseClient, id: string): Promise<FallZeile | null> {
  if (!z.string().uuid().safeParse(id).success) return null
  const { data } = await supabase.from(FALL_TABELLE).select(FALL_SPALTEN).eq('id', id).maybeSingle()
  return (data as FallZeile | null) ?? null
}

export async function aktualisiereFall(
  supabase: SupabaseClient,
  id: string,
  felder: Record<string, unknown>,
): Promise<FallZeile | null> {
  const { data, error } = await supabase
    .from(FALL_TABELLE)
    .update({ ...felder, ...frischStempel() })
    .eq('id', id)
    .select(FALL_SPALTEN)
    .maybeSingle()
  if (error) return null
  return (data as FallZeile | null) ?? null
}

export const FALL_FEHLT = 'Diesen Fall gibt es nicht mehr. Fälle werden nach 24 Stunden gelöscht.'

/** Antworten mit persönlichem Inhalt dürfen nie zwischengespeichert werden */
export function ohneZwischenspeicher<T extends NextResponse>(res: T): T {
  res.headers.set('Cache-Control', 'no-store')
  return res
}

/** Öffentliche Rechtstexte ohne Nutzereingaben: dürfen im Browser eine Stunde gemerkt werden */
export function merkbar<T extends NextResponse>(res: T): T {
  res.headers.set('Cache-Control', 'private, max-age=3600')
  return res
}

// ── Kern: Word-Datei ──────────────────────────────────────────────────────

/** Auftrag an den Kern, der eine Datei (Word) statt JSON zurückgibt. Nichts wird abgelegt. */
export async function kernDatei(pfad: string, body: unknown, zeitMs = 60_000): Promise<{ blob: ArrayBuffer; dateiname: string; typ: string }> {
  const nichtErreichbar = 'Die Werkzeugkiste ist gerade nicht erreichbar. Bitte versuche es gleich noch einmal.'
  const basis = process.env.WERKZEUGKISTE_KERN_URL
  const secret = process.env.WERKZEUGKISTE_KERN_SECRET
  if (!basis || !secret) throw new KernFehler(nichtErreichbar, 503)
  let res: Response
  try {
    res = await fetch(`${basis.replace(/\/$/, '')}${pfad}`, {
      method: 'POST',
      headers: { 'X-Kern-Secret': secret, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(zeitMs),
      cache: 'no-store',
    })
  } catch {
    throw new KernFehler(nichtErreichbar, 504)
  }
  if (!res.ok) {
    const daten = (await res.json().catch(() => null)) as { error?: string; hint?: string } | null
    if (res.status === 401 || !daten?.error) throw new KernFehler(nichtErreichbar, 502)
    throw new KernFehler(daten.error, res.status >= 500 ? 502 : 400, daten.hint || undefined)
  }
  const kopf = res.headers.get('Content-Disposition') ?? ''
  const dateiname = /filename="?([^";]+)"?/i.exec(kopf)?.[1] ?? 'Aktennotiz.docx'
  return {
    blob: await res.arrayBuffer(),
    dateiname,
    typ: res.headers.get('Content-Type') ?? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  }
}

