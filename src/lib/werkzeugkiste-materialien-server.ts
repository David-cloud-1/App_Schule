import type { NextResponse } from 'next/server'
import { z } from 'zod'
import type { SupabaseClient } from '@supabase/supabase-js'
import { findeWerkzeug, type AblaufErgebnis, type AblaufSchritt } from '@/lib/werkzeugkiste'
import {
  SEITENGROESSE,
  SPEICHER_GRENZE_BYTES,
  TITEL_MAX,
  type MaterialZeile,
} from '@/lib/werkzeugkiste-materialien'
import {
  ABLAUF_TABELLE,
  WK_BUCKET,
  ablaufOrdner,
  fehler,
  type AblaufZeile,
} from '@/lib/werkzeugkiste-server'

/**
 * Server-Seite von „Meine Materialien“ (PROJ-52, Paket 1): Abfrage der Liste,
 * Speichergrenze, Größenzähler und das 12-Monats-Aufräumen der Skripte.
 * Nur in API-Routen und im Zeitplan verwenden.
 */

/** Skripte (und ihre Einlesung) werden 12 Monate nach dem Hochladen entfernt */
export const SKRIPT_MONATE = 12

// ── Liste ─────────────────────────────────────────────────────────────────

export const listenAbfrageSchema = z.object({
  suche: z.string().max(100, 'Der Suchbegriff ist zu lang.').default(''),
  werkzeug: z
    .string()
    .max(40)
    .refine((id) => !!findeWerkzeug(id), { message: 'Dieses Werkzeug gibt es nicht.' })
    .optional(),
  seite: z.coerce.number().int().min(1).max(1000).default(1),
  je: z.coerce.number().int().min(1).max(SEITENGROESSE).default(SEITENGROESSE),
})

/**
 * Schmale Listenzeilen: nie Prompt oder Antwort, vom Ergebnis nur die paar
 * Felder, die die Liste zeigt (Pfade im JSON statt der ganzen Spalte).
 */
export const LISTEN_SPALTEN = [
  'id',
  'werkzeug',
  'status',
  'schritt',
  'titel',
  'datei_name',
  'hat_antwort',
  'skript_entfernt_am',
  'created_at',
  'updated_at',
  'laeuft_ab_am',
  'video_url:kennzahlen->>videoUrl',
  'ergebnis_titel:ergebnis->>titel',
  'ergebnis_format:ergebnis->>format',
  'ergebnis_vorschau:ergebnis->>hatVorschau',
  // Erster Text-Block (LearningApps): nur der Titel, um „keine Datei, nur Texte“ zu erkennen
  'ergebnis_text:ergebnis->texte->0->>titel',
].join(', ')

export interface ListenZeile {
  id: string
  werkzeug: string
  status: 'laeuft' | 'fertig'
  schritt: number
  titel: string | null
  datei_name: string | null
  hat_antwort: boolean | null
  skript_entfernt_am: string | null
  created_at: string
  updated_at: string
  laeuft_ab_am: string | null
  video_url: string | null
  ergebnis_titel: string | null
  ergebnis_format: string | null
  ergebnis_vorschau: string | null
  ergebnis_text: string | null
}

/**
 * Suchbegriff für den Filter von PostgREST: Zeichen, die dort Trennzeichen
 * sind oder als Platzhalter wirken, werden zu Leerzeichen.
 */
export function suchbegriff(roh: string): string {
  return roh
    .replace(/[%_\\,()*":;]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function zeileZuMaterial(z: ListenZeile): MaterialZeile {
  const material = z.status === 'fertig'
  const werkzeugName = findeWerkzeug(z.werkzeug)?.name ?? z.werkzeug
  const quelle = z.datei_name ?? z.video_url ?? null
  const titel = material ? (z.titel ?? z.ergebnis_titel ?? quelle ?? werkzeugName) : (quelle ?? werkzeugName)
  return {
    id: z.id,
    art: material ? 'material' : 'entwurf',
    werkzeug: z.werkzeug,
    titel,
    skriptName: z.datei_name,
    format: material ? z.ergebnis_format : null,
    schritt: Math.min(5, Math.max(1, z.schritt)) as AblaufSchritt,
    // Nur Texte zum Kopieren (LearningApps) heißt: kein Download
    hatDatei: material && z.ergebnis_text == null,
    hatVorschau: material && z.ergebnis_vorschau !== 'false',
    hatAntwort: !!z.hat_antwort,
    skriptEntfernt: !!z.skript_entfernt_am,
    erstelltAm: z.created_at,
    aktualisiertAm: z.updated_at,
    laeuftAbAm: material ? null : z.laeuft_ab_am,
  }
}

// ── Titel ─────────────────────────────────────────────────────────────────

export function kuerzeTitel(t: string): string {
  return t.trim().slice(0, TITEL_MAX)
}

/**
 * Titel nach dem Bauen: Beim ersten Mal der Titel aus der KI-Antwort. Hat die
 * Lehrkraft umbenannt, bleibt ihr Titel; hat sie nie umbenannt, folgt er der
 * überarbeiteten Fassung.
 */
export function titelNachBauen(
  zeile: Pick<AblaufZeile, 'titel' | 'ergebnis' | 'datei_name'>,
  ergebnis: Pick<AblaufErgebnis, 'titel'>,
): string | null {
  const neu = kuerzeTitel(ergebnis.titel ?? '') || (zeile.datei_name ? kuerzeTitel(zeile.datei_name) : '') || null
  const bisher = zeile.titel
  const altesErgebnis = zeile.ergebnis?.titel ? kuerzeTitel(zeile.ergebnis.titel) : null
  if (!bisher || bisher === altesErgebnis) return neu
  return bisher
}

// ── Speicher ──────────────────────────────────────────────────────────────

export const SPEICHER_VOLL_SATZ = 'Dein Speicher ist voll. Lösche ältere Materialien oder Entwürfe, dann kannst du weitermachen.'

/**
 * Speichergrenze (2 GB je Lehrkraft) — am **Anfang** prüfen (neuer Ablauf,
 * Kopie), nie nach dem Bauen: Fertige Arbeit wird nie wegen des Speichers
 * abgelehnt. Antwort ≠ null heißt: abbrechen. Fehlt die Abfrage, wird nicht
 * gesperrt (Speicherzähler ist keine Sicherheitsgrenze).
 */
export async function speicherPruefen(supabase: SupabaseClient): Promise<NextResponse | null> {
  const genutzt = await speicherGenutzt(supabase)
  return genutzt !== null && genutzt >= SPEICHER_GRENZE_BYTES ? fehler(SPEICHER_VOLL_SATZ, 409) : null
}

/** Verbrauch der angemeldeten Lehrkraft (die Datenbankfunktion zählt nur eigene Zeilen); null = unbekannt */
export async function speicherGenutzt(supabase: SupabaseClient): Promise<number | null> {
  const { data, error } = await supabase.rpc('wk_speicher_genutzt')
  if (error || data == null) return null
  const n = Number(data)
  return Number.isFinite(n) ? n : null
}

/** Summe der Dateien im Ordner eines Ablaufs */
async function ordnerGroesse(service: SupabaseClient, ownerId: string, id: string): Promise<number> {
  const { data } = await service.storage.from(WK_BUCKET).list(ablaufOrdner(ownerId, id), { limit: 100 })
  return (data ?? []).reduce((summe, f) => summe + Number((f as { metadata?: { size?: number } }).metadata?.size ?? 0), 0)
}

/**
 * Speichergröße der Zeile an die Dateien im Ordner anpassen. Best effort: Ein
 * Fehler hier darf nie eine fertige Arbeit scheitern lassen. Der Zähler ist
 * für Browser-Schlüssel gesperrt (Trigger), deshalb mit dem Service-Schlüssel.
 */
export async function aktualisiereSpeicher(service: SupabaseClient, ownerId: string, id: string): Promise<void> {
  try {
    const bytes = await ordnerGroesse(service, ownerId, id)
    await service.from(ABLAUF_TABELLE).update({ speicher_bytes: bytes }).eq('id', id)
  } catch {
    // Der nächste Schritt zählt neu
  }
}

// ── 12-Monats-Aufräumen ───────────────────────────────────────────────────

/** Grenze: alles, was vor diesem Zeitpunkt hochgeladen wurde, verliert sein Skript */
export function skriptGrenze(jetzt = new Date()): Date {
  const g = new Date(jetzt)
  g.setMonth(g.getMonth() - SKRIPT_MONATE)
  return g
}

/** Skriptdatei und Einlesung (Text + Bilder) bleiben nicht länger; Ergebnis, Antwort und Vorschau bleiben */
export function istSkriptDatei(name: string): boolean {
  return name.startsWith('skript.') || name === 'einlesung.zip'
}

/**
 * Entfernt Skript und Einlesung fertiger Materialien, deren Hochladen mehr als
 * 12 Monate her ist, und merkt sich das in der Zeile. Gibt die Zahl der
 * bearbeiteten Materialien zurück. Ein einzelner Fehler hält den Rest nicht auf.
 */
export async function entferneAlteSkripte(service: SupabaseClient, jetzt = new Date(), jeLauf = 200): Promise<number> {
  const { data } = await service
    .from(ABLAUF_TABELLE)
    .select('id, owner_id')
    .eq('status', 'fertig')
    .is('skript_entfernt_am', null)
    .lt('skript_hochgeladen_am', skriptGrenze(jetzt).toISOString())
    .order('skript_hochgeladen_am', { ascending: true })
    .limit(jeLauf)

  let entfernt = 0
  for (const a of (data ?? []) as { id: string; owner_id: string }[]) {
    try {
      const ordner = ablaufOrdner(a.owner_id, a.id)
      const { data: dateien } = await service.storage.from(WK_BUCKET).list(ordner, { limit: 100 })
      const pfade = (dateien ?? []).filter((f) => istSkriptDatei(f.name)).map((f) => `${ordner}/${f.name}`)
      if (pfade.length) {
        const { error } = await service.storage.from(WK_BUCKET).remove(pfade)
        if (error) continue
      }
      // Nur den Vermerk setzen: weder „zuletzt bearbeitet“ noch sonst etwas anfassen
      const { error } = await service.from(ABLAUF_TABELLE).update({ skript_entfernt_am: jetzt.toISOString() }).eq('id', a.id)
      if (error) continue
      await aktualisiereSpeicher(service, a.owner_id, a.id)
      entfernt++
    } catch {
      // bleibt bis zum nächsten Lauf stehen
    }
  }
  return entfernt
}
