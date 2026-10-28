import { NextResponse } from 'next/server'
import { z } from 'zod'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  dateiEndung,
  findeWerkzeug,
  pruefeSkriptDatei,
  type Ablauf,
  type AblaufAuswahl,
  type AblaufEinstellungen,
  type AblaufSchritt,
} from '@/lib/werkzeugkiste'

/**
 * Server-Seite der Werkzeugkiste (PROJ-51): Aufruf des Python-Kerns, Pfade im
 * Speicherbereich, Eingabeprüfung und die Umwandlung einer Tabellenzeile in
 * den `Ablauf`, den die Oberfläche kennt. Nur in API-Routen verwenden.
 */

export const WK_BUCKET = 'werkzeugkiste'
export const ABLAUF_TABELLE = 'werkzeug_ablaeufe'
export const LAUFZEIT_TAGE = 7
/** Gegen Missbrauch: so viele Abläufe darf eine Lehrkraft gleichzeitig haben */
export const MAX_OFFENE_ABLAEUFE = 50
/** Gültigkeit kurzlebiger Adressen für Browser und Kern */
export const ADRESSE_SEKUNDEN = 120

// ── Speicherpfade ─────────────────────────────────────────────────────────

export function ablaufOrdner(ownerId: string, id: string) {
  return `${ownerId}/${id}`
}

export function skriptPfad(ownerId: string, id: string, dateiname: string) {
  return `${ablaufOrdner(ownerId, id)}/skript.${dateiEndung(dateiname) || 'bin'}`
}

export const einlesungPfad = (ownerId: string, id: string) => `${ablaufOrdner(ownerId, id)}/einlesung.zip`
export const ausgabePfad = (ownerId: string, id: string) => `${ablaufOrdner(ownerId, id)}/ausgabe`
export const vorschauPfad = (ownerId: string, id: string) => `${ablaufOrdner(ownerId, id)}/vorschau.html`

// ── Eingaben ──────────────────────────────────────────────────────────────

const schluessel = z.string().max(40)

export const einstellungenSchema = z.object({
  format: schluessel,
  niveau: schluessel,
  bildungsgang: schluessel,
  lernfeld: schluessel,
  umfang: schluessel,
})

export const auswahlSchema = z.object({
  seiten: z.string().max(200),
  abschnitte: z.array(z.number().int().min(1).max(10_000)).max(1000),
})

const freigeschaltet = z.string().refine((id) => !!findeWerkzeug(id)?.aktiv, {
  message: 'Dieses Werkzeug ist noch nicht freigeschaltet.',
})

export const neuerAblaufSchema = z.object({
  werkzeug: freigeschaltet,
  datei: z
    .object({
      name: z.string().min(1).max(255),
      groesse: z.number().int().min(1).max(50 * 1024 * 1024),
      typ: z.string().max(200),
    })
    .superRefine((d, ctx) => {
      const problem = pruefeSkriptDatei({ name: d.name, size: d.groesse })
      if (problem) ctx.addIssue({ code: 'custom', message: problem })
    }),
})

export const ablaufAenderungSchema = z
  .object({
    werkzeug: freigeschaltet.optional(),
    einstellungen: einstellungenSchema.optional(),
    auswahl: auswahlSchema.optional(),
    schritt: z.number().int().min(1).max(5).optional(),
  })
  .strict()

export const antwortSchema = z.object({ antwort: z.string().min(1).max(2_000_000) })

/** Erste Fehlermeldung einer Zod-Prüfung als verständlicher 400 */
export function ungueltig(error: z.ZodError) {
  return fehler(error.issues[0]?.message ?? 'Ungültige Eingabe.', 400)
}

export function fehler(meldung: string, status: number, hinweis?: string) {
  return NextResponse.json(hinweis ? { error: meldung, hint: hinweis } : { error: meldung }, { status })
}

// ── Tabellenzeile ↔ Ablauf ────────────────────────────────────────────────

export interface AblaufZeile {
  id: string
  owner_id: string
  werkzeug: string
  status: 'laeuft' | 'fertig'
  schritt: number
  datei_name: string | null
  datei_groesse: number | null
  kennzahlen: Ablauf['kennzahlen']
  gliederung: Ablauf['gliederung'] | null
  auswahl: AblaufAuswahl | null
  einstellungen: Partial<AblaufEinstellungen> | null
  prompt: string | null
  antwort: string | null
  pruefung: Ablauf['pruefung']
  ergebnis: Ablauf['ergebnis']
  updated_at: string
}

export const ABLAUF_SPALTEN =
  'id, owner_id, werkzeug, status, schritt, datei_name, datei_groesse, kennzahlen, gliederung, auswahl, einstellungen, prompt, antwort, pruefung, ergebnis, updated_at'

export function standardEinstellungen(werkzeugId: string): AblaufEinstellungen {
  return {
    format: findeWerkzeug(werkzeugId)?.formate[0]?.id ?? '',
    niveau: 'mittel',
    bildungsgang: 'auto',
    lernfeld: '',
    umfang: '',
  }
}

/**
 * Vorbelegung eines neuen Ablaufs: Niveau, Bildungsgang und Format aus dem
 * letzten Ablauf der Lehrkraft — das Format nur, wenn das Werkzeug es kennt.
 */
export function vorbelegung(werkzeugId: string, letzte: Partial<AblaufEinstellungen> | null | undefined): AblaufEinstellungen {
  const basis = standardEinstellungen(werkzeugId)
  if (!letzte) return basis
  const formate = findeWerkzeug(werkzeugId)?.formate.map((f) => f.id) ?? []
  return {
    ...basis,
    niveau: letzte.niveau || basis.niveau,
    bildungsgang: letzte.bildungsgang || basis.bildungsgang,
    format: letzte.format && formate.includes(letzte.format) ? letzte.format : basis.format,
  }
}

/** Eingereichte Einstellungen gegen das Werkzeug prüfen: ein unbekanntes Format wird zum Standardformat */
export function einstellungenFuerWechsel(werkzeugId: string, e: AblaufEinstellungen): AblaufEinstellungen {
  const formate = findeWerkzeug(werkzeugId)?.formate.map((f) => f.id) ?? []
  return { ...e, format: formate.includes(e.format) ? e.format : (formate[0] ?? '') }
}

export function zeileZuAblauf(z: AblaufZeile): Ablauf {
  const schritt = Math.min(5, Math.max(1, z.schritt)) as AblaufSchritt
  return {
    id: z.id,
    werkzeug: z.werkzeug,
    schritt,
    status: z.status,
    datei: z.datei_name ? { name: z.datei_name, groesse: z.datei_groesse ?? 0 } : null,
    kennzahlen: z.kennzahlen ?? null,
    gliederung: Array.isArray(z.gliederung) ? z.gliederung : [],
    auswahl: { seiten: z.auswahl?.seiten ?? '', abschnitte: z.auswahl?.abschnitte ?? [] },
    einstellungen: { ...standardEinstellungen(z.werkzeug), ...(z.einstellungen ?? {}) },
    prompt: z.prompt,
    antwort: z.antwort,
    pruefung: z.pruefung ?? null,
    ergebnis: z.ergebnis ?? null,
    aktualisiertAm: z.updated_at,
  }
}

/** Zeitstempel für jede Änderung: zuletzt bearbeitet + läuft 7 Tage später ab */
export function frischStempel(jetzt = new Date()) {
  const ab = new Date(jetzt.getTime() + LAUFZEIT_TAGE * 24 * 60 * 60 * 1000)
  return { updated_at: jetzt.toISOString(), laeuft_ab_am: ab.toISOString() }
}

/** Eigenen Ablauf lesen (RLS: nur eigene, nur mit Lehrer-Rolle) */
export async function ladeEigenenAblauf(supabase: SupabaseClient, id: string): Promise<AblaufZeile | null> {
  if (!z.string().uuid().safeParse(id).success) return null
  const { data } = await supabase.from(ABLAUF_TABELLE).select(ABLAUF_SPALTEN).eq('id', id).maybeSingle()
  return (data as AblaufZeile | null) ?? null
}

export async function aktualisiere(
  supabase: SupabaseClient,
  id: string,
  felder: Record<string, unknown>,
): Promise<AblaufZeile | null> {
  const { data, error } = await supabase
    .from(ABLAUF_TABELLE)
    .update({ ...felder, ...frischStempel() })
    .eq('id', id)
    .select(ABLAUF_SPALTEN)
    .maybeSingle()
  if (error) return null
  return (data as AblaufZeile | null) ?? null
}

// ── Speicher ──────────────────────────────────────────────────────────────

export async function leseAdresse(service: SupabaseClient, pfad: string): Promise<string | null> {
  const { data } = await service.storage.from(WK_BUCKET).createSignedUrl(pfad, ADRESSE_SEKUNDEN)
  return data?.signedUrl ?? null
}

export async function schreibAdresse(service: SupabaseClient, pfad: string) {
  const { data } = await service.storage.from(WK_BUCKET).createSignedUploadUrl(pfad, { upsert: true })
  if (!data?.signedUrl) return null
  return { url: data.signedUrl, method: 'PUT' as const, headers: { 'x-upsert': 'true' } }
}

/** Download-Link mit Dateinamen — einfach kodiert, sonst verdoppelt Supabase die Umlaut-Kodierung */
export async function downloadAdresse(service: SupabaseClient, pfad: string, dateiname: string) {
  const roh = await leseAdresse(service, pfad)
  return roh ? `${roh}&download=${encodeURIComponent(dateiname)}` : null
}

/** Alle Dateien eines Ablaufs entfernen (Ordner <owner>/<id>/) */
export async function loescheDateien(service: SupabaseClient, ownerId: string, id: string) {
  const ordner = ablaufOrdner(ownerId, id)
  const { data } = await service.storage.from(WK_BUCKET).list(ordner, { limit: 100 })
  const pfade = (data ?? []).map((f) => `${ordner}/${f.name}`)
  if (pfade.length) await service.storage.from(WK_BUCKET).remove(pfade)
}

// ── Kern ──────────────────────────────────────────────────────────────────

export class KernFehler extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly hinweis?: string,
  ) {
    super(message)
  }
}

const KERN_NICHT_ERREICHBAR = 'Die Werkzeugkiste ist gerade nicht erreichbar. Bitte versuche es gleich noch einmal.'

/** Auftrag an den Python-Kern; Fehler kommen als KernFehler mit Satz für die Lehrkraft */
export async function kern<T>(pfad: string, body?: unknown, zeitMs = 100_000): Promise<T> {
  const basis = process.env.WERKZEUGKISTE_KERN_URL
  const secret = process.env.WERKZEUGKISTE_KERN_SECRET
  if (!basis || !secret) throw new KernFehler(KERN_NICHT_ERREICHBAR, 503)

  let res: Response
  try {
    res = await fetch(`${basis.replace(/\/$/, '')}${pfad}`, {
      method: body === undefined ? 'GET' : 'POST',
      headers: { 'X-Kern-Secret': secret, ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(zeitMs),
      cache: 'no-store',
    })
  } catch {
    throw new KernFehler(KERN_NICHT_ERREICHBAR, 504)
  }
  const daten = (await res.json().catch(() => null)) as ({ error?: string; hint?: string } & T) | null
  if (!res.ok || !daten) {
    // 401 vom Kern = falsch eingerichtet, nicht die Schuld der Lehrkraft
    if (res.status === 401 || !daten?.error) throw new KernFehler(KERN_NICHT_ERREICHBAR, 502)
    throw new KernFehler(daten.error, res.status >= 500 ? 502 : 400, daten.hint || undefined)
  }
  return daten
}

export function kernFehlerAntwort(e: unknown) {
  if (e instanceof KernFehler) return fehler(e.message, e.status, e.hinweis)
  return fehler('Das hat gerade nicht geklappt. Bitte versuche es erneut.', 500)
}
