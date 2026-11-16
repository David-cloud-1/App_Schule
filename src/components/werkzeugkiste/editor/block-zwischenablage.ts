import { ZWISCHENABLAGE_MAX_BLOECKE } from '@/lib/werkzeugkiste-bloecke'
import { istBekannterTyp, type Block } from '@/lib/werkzeugkiste-editor'

/**
 * Zwischenablage des Baukastens (PROJ-102): kopierte Blöcke im Browser-Speicher, damit sie
 * zwischen Tabs und nach dem Neuladen da sind. Sie gehört einer Person (Kontowechsel am
 * gemeinsamen Rechner leert sie) und verfällt nach 7 Tagen. Kein Server, keine Datenbank.
 * Ohne Browser-Speicher (privates Fenster) hält sie nur bis zum Neuladen der Seite.
 */

const SCHLUESSEL = 'wk-baukasten-zwischenablage'
export const ZWISCHENABLAGE_TAGE = 7
/** Etwa 1 MB Text; mehr ist kein sinnvoller Auszug mehr */
export const ZWISCHENABLAGE_MAX_ZEICHEN = 1_000_000

export interface Zwischenablage {
  /** Material, aus dem kopiert wurde */
  material: string
  nutzer: string
  am: number
  bloecke: Block[]
}

export type KopierErgebnis = 'ok' | 'zu-viele' | 'zu-gross'

let imSpeicher: Zwischenablage | null = null

function istBlock(b: unknown): b is Block {
  return !!b && typeof b === 'object' && !Array.isArray(b) && typeof (b as { type?: unknown }).type === 'string'
}

/** Prüft Form und Alter; alles andere gilt als „nichts in der Zwischenablage“ */
export function pruefeZwischenablage(roh: unknown, nutzer: string, jetzt = Date.now()): Zwischenablage | null {
  if (!roh || typeof roh !== 'object') return null
  const z = roh as Record<string, unknown>
  if (typeof z.material !== 'string' || typeof z.nutzer !== 'string' || typeof z.am !== 'number') return null
  if (z.nutzer !== nutzer) return null
  if (jetzt - z.am > ZWISCHENABLAGE_TAGE * 86_400_000 || z.am > jetzt + 60_000) return null
  if (!Array.isArray(z.bloecke) || z.bloecke.length === 0 || z.bloecke.length > ZWISCHENABLAGE_MAX_BLOECKE) return null
  if (!z.bloecke.every(istBlock)) return null
  return { material: z.material, nutzer: z.nutzer, am: z.am, bloecke: z.bloecke as Block[] }
}

export function kopiereBloecke(bloecke: Block[], material: string, nutzer: string, jetzt = Date.now()): KopierErgebnis {
  if (bloecke.length > ZWISCHENABLAGE_MAX_BLOECKE) return 'zu-viele'
  const eintrag: Zwischenablage = { material, nutzer, am: jetzt, bloecke }
  const text = JSON.stringify(eintrag)
  if (text.length > ZWISCHENABLAGE_MAX_ZEICHEN) return 'zu-gross'
  imSpeicher = eintrag
  try {
    window.localStorage.setItem(SCHLUESSEL, text)
  } catch {
    // Nur diese Sitzung: Der Speicher fehlt oder ist voll
  }
  return 'ok'
}

export function liesZwischenablage(nutzer: string, jetzt = Date.now()): Zwischenablage | null {
  try {
    const text = window.localStorage.getItem(SCHLUESSEL)
    if (text) {
      const z = pruefeZwischenablage(JSON.parse(text), nutzer, jetzt)
      if (z) return z
      // Fremde oder alte Einträge nicht liegen lassen
      window.localStorage.removeItem(SCHLUESSEL)
      imSpeicher = null
      return null
    }
  } catch {
    // Speicher gesperrt oder kaputter Eintrag: der Wert im Arbeitsspeicher gilt
  }
  return imSpeicher ? pruefeZwischenablage(imSpeicher, nutzer, jetzt) : null
}

export function leereZwischenablage() {
  imSpeicher = null
  try {
    window.localStorage.removeItem(SCHLUESSEL)
  } catch {
    // egal
  }
}

/** Blöcke mit einem Typ, den das Material kennt – gleiche Regel wie beim Einsetzen */
export const kenntTyp = (b: Block) => istBekannterTyp(b.type)
