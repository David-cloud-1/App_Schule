import { ABLAUF_SCHRITTE, WERKZEUGE, eingabeArt, type AblaufSchritt } from '@/lib/werkzeugkiste'

/**
 * „Meine Materialien“ (PROJ-52, Paket 1) — Typen und reine Hilfsfunktionen.
 *
 * Ein Material ist ein fertiger Ablauf, ein Entwurf ein eingelesener, aber
 * noch nicht fertiger. Beide stehen in derselben Tabelle (werkzeug_ablaeufe);
 * die Liste bekommt vom Server nur schmale Zeilen, nie Prompt oder Antwort.
 */

export const SEITENGROESSE = 50
/** Obergrenze je Lehrkraft (Spec: Vorschlag 2 GB) */
export const SPEICHER_GRENZE_BYTES = 2 * 1024 * 1024 * 1024
/** Ab diesem Anteil erscheint der Hinweis „Speicher fast voll“ */
export const SPEICHER_HINWEIS_AB = 0.9
export const TITEL_MAX = 120

export const HINWEIS_SKRIPT_ENTFERNT = 'Skript wurde nach 12 Monaten entfernt'
export const HINWEIS_VIDEO_WERKZEUG = 'Video-Fragen brauchen ein eigenes Transkript'

export interface MaterialZeile {
  id: string
  art: 'entwurf' | 'material'
  werkzeug: string
  /** Material: Titel (änderbar) · Entwurf: Name des Skripts */
  titel: string
  /** Name des hochgeladenen Skripts, falls es eines gibt */
  skriptName: string | null
  /** Format-Schlüssel des Ergebnisses, z. B. „h5p“ · nur bei Material */
  format: string | null
  /** Weitester erreichter Schritt (bei Entwürfen: „bei Schritt 3 · Prompt“) */
  schritt: AblaufSchritt
  /** false = es gibt keine Datei, nur Texte zum Kopieren (LearningApps) */
  hatDatei: boolean
  hatVorschau: boolean
  /** Es gibt eine gespeicherte KI-Antwort zum Herunterladen */
  hatAntwort: boolean
  /** Das Skript wurde nach 12 Monaten entfernt (Überarbeiten und anderes Werkzeug gehen nicht mehr) */
  skriptEntfernt: boolean
  erstelltAm: string
  aktualisiertAm: string
  /** Nur Entwürfe: wann der Entwurf gelöscht wird */
  laeuftAbAm: string | null
}

export interface MaterialSpeicher {
  genutztBytes: number
  grenzeBytes: number
}

export interface MaterialListe {
  eintraege: MaterialZeile[]
  /** Treffer insgesamt (mit Suche und Filter) */
  gesamt: number
  hatMehr: boolean
  speicher: MaterialSpeicher
}

export interface MaterialAbfrage {
  suche: string
  /** Werkzeug-Schlüssel; leer = alle */
  werkzeug: string
  /** Ab 1 */
  seite: number
}

// ── Anzeige ────────────────────────────────────────────────────────────────

const TAG_MS = 24 * 60 * 60 * 1000

/** Ganze Kalendertage (Ortszeit) von `von` bis `bis` */
function kalenderTage(von: Date, bis: Date): number {
  const a = new Date(von.getFullYear(), von.getMonth(), von.getDate()).getTime()
  const b = new Date(bis.getFullYear(), bis.getMonth(), bis.getDate()).getTime()
  return Math.round((b - a) / TAG_MS)
}

/** „heute“, „gestern“, „vor 3 Tagen“ (bis 6 Tage), sonst das Datum */
export function relativesDatum(iso: string, jetzt: Date = new Date()): string {
  const datum = new Date(iso)
  if (Number.isNaN(datum.getTime())) return ''
  const tage = kalenderTage(datum, jetzt)
  if (tage <= 0) return 'heute'
  if (tage === 1) return 'gestern'
  if (tage < 7) return `vor ${tage} Tagen`
  return datum.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

/** „bei Schritt 3 · Prompt“ — wo ein Entwurf aufgehört hat */
export function entwurfStand(schritt: AblaufSchritt): string {
  const s = ABLAUF_SCHRITTE.find((x) => x.nr === schritt)
  return s ? `bei Schritt ${s.nr} · ${s.label}` : ''
}

/** Ab Tag 6 weist der Entwurf auf die baldige Löschung hin, vorher nichts */
export function loeschHinweis(laeuftAbAm: string | null, jetzt: Date = new Date()): string | null {
  if (!laeuftAbAm) return null
  const frist = new Date(laeuftAbAm)
  if (Number.isNaN(frist.getTime())) return null
  const tage = kalenderTage(jetzt, frist)
  if (tage <= 0) return 'wird heute gelöscht'
  if (tage === 1) return 'wird morgen gelöscht'
  return null
}

/** Name des Formats für die Zeile unter dem Titel; unbekannte Schlüssel in Großbuchstaben */
export function formatName(format: string | null): string | null {
  if (!format) return null
  for (const w of WERKZEUGE) {
    const f = w.formate.find((x) => x.id === format)
    if (f) return f.label
  }
  return format.toUpperCase()
}

export function werkzeugName(id: string): string {
  return WERKZEUGE.find((w) => w.id === id)?.name ?? id
}

/** Zeile unter dem Titel: „Format · aus Skriptname“ (Entwürfe: nur der Stand) */
export function untertitel(z: Pick<MaterialZeile, 'format' | 'skriptName' | 'art'>): string {
  if (z.art === 'entwurf') return ''
  return [formatName(z.format), z.skriptName ? `aus ${z.skriptName}` : null].filter(Boolean).join(' · ')
}

// ── Was geht noch? ─────────────────────────────────────────────────────────

export interface AktionErlaubnis {
  erlaubt: boolean
  /** Warum nicht — steht unter dem ausgegrauten Menüpunkt */
  grund?: string
}

/** „Überarbeiten“ braucht die Einlesung (Bilder des Skripts) */
export function ueberarbeitenErlaubt(z: Pick<MaterialZeile, 'skriptEntfernt'>): AktionErlaubnis {
  return z.skriptEntfernt ? { erlaubt: false, grund: HINWEIS_SKRIPT_ENTFERNT } : { erlaubt: true }
}

/** „Anderes Werkzeug“ braucht das Skript; Video-Fragen haben ein Transkript statt eines Skripts */
export function anderesWerkzeugErlaubt(z: Pick<MaterialZeile, 'skriptEntfernt' | 'werkzeug'>): AktionErlaubnis {
  if (z.skriptEntfernt) return { erlaubt: false, grund: HINWEIS_SKRIPT_ENTFERNT }
  if (eingabeArt(z.werkzeug) === 'video') return { erlaubt: false, grund: HINWEIS_VIDEO_WERKZEUG }
  return { erlaubt: true }
}

// ── Speicher ───────────────────────────────────────────────────────────────

export function speicherStand(s: MaterialSpeicher): { anteil: number; prozent: number; hinweis: boolean; voll: boolean } {
  const anteil = s.grenzeBytes > 0 ? s.genutztBytes / s.grenzeBytes : 0
  return {
    anteil,
    prozent: Math.min(100, Math.round(anteil * 100)),
    hinweis: anteil >= SPEICHER_HINWEIS_AB,
    voll: anteil >= 1,
  }
}

export function formatiereSpeicher(bytes: number): string {
  const gb = bytes / (1024 * 1024 * 1024)
  if (gb >= 1) return `${gb.toFixed(1).replace('.', ',')} GB`
  return `${Math.max(0, Math.round(bytes / (1024 * 1024)))} MB`
}
