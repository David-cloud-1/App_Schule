import { z } from 'zod'
import type { AblaufPruefung } from '@/lib/werkzeugkiste'
import {
  HILFE_ABWEICHUNGEN,
  HILFE_PROBLEME,
  HILFE_SEITEN,
  type HilfeProblem,
  type HilfeProblemId,
  type HilfeSeite,
  type HilfeVariante,
} from '@/lib/werkzeugkiste-hilfe-texte'

/**
 * PROJ-87: Logik des Assistenten „Schritt für Schritt“ — welche Hilfeseite
 * gilt, ist der Schritt erledigt, welches Problem liegt vor. Die Texte stehen
 * getrennt in `werkzeugkiste-hilfe-texte.ts`. Kein KI-Aufruf.
 */

/**
 * Werkzeuge, deren Hilfeseiten fertig und gegengelesen sind. Alle anderen
 * zeigen keinen Hilfe-Knopf (nie einen leeren Assistenten). Teil 2 ergänzt
 * die übrigen Werkzeuge erst nach Freigabe der Texte.
 */
export const HILFE_WERKZEUGE: readonly string[] = ['skript']

export function hatHilfe(werkzeugId: string | null | undefined): boolean {
  return !!werkzeugId && HILFE_WERKZEUGE.includes(werkzeugId)
}

export const HILFE_VARIANTEN: readonly HilfeVariante[] = ['skript', 'video', 'einstellungen', 'auftrag', 'teile', 'antwort', 'fertig']

/** Zu welchem der fünf Ablauf-Schritte gehört die Variante? */
export const HILFE_SCHRITT_NR: Record<HilfeVariante, 1 | 2 | 3 | 4 | 5> = {
  skript: 1,
  video: 1,
  einstellungen: 2,
  auftrag: 3,
  teile: 3,
  antwort: 4,
  fertig: 5,
}

/** Standardseite plus die Abweichungen dieses Werkzeugs */
export function hilfeSeite(werkzeugId: string, variante: HilfeVariante): HilfeSeite {
  return { ...HILFE_SEITEN[variante], ...(HILFE_ABWEICHUNGEN[werkzeugId]?.[variante] ?? {}) }
}

export function hilfeVariante(schritt: 1 | 2 | 3 | 4 | 5, opt: { video?: boolean; teile?: boolean }): HilfeVariante {
  switch (schritt) {
    case 1:
      return opt.video ? 'video' : 'skript'
    case 2:
      return 'einstellungen'
    case 3:
      return opt.teile ? 'teile' : 'auftrag'
    case 4:
      return 'antwort'
    default:
      return 'fertig'
  }
}

/** Reihenfolge der Hilfeseiten im Ablauf; eine Kopie aus dem Regal beginnt bei der Antwort */
export function hilfeFolge(opt: { video?: boolean; teile?: boolean; kopie?: boolean }): HilfeVariante[] {
  if (opt.kopie) return ['antwort', 'fertig']
  return [opt.video ? 'video' : 'skript', 'einstellungen', opt.teile ? 'teile' : 'auftrag', 'antwort', 'fertig']
}

/** Was der Ablauf schon weiß — daraus liest der Assistent „erledigt“ ab */
export interface HilfeStand {
  eingelesen: boolean
  /** Einstellungen sind gespeichert (Auftrag liegt vor) */
  einstellungenGespeichert: boolean
  auftragKopiert: boolean
  /** Alle Teile haben eine Antwort (nur bei langem Skript) */
  teileFertig: boolean
  antwortGeprueft: boolean
  heruntergeladen: boolean
}

export function istErledigt(variante: HilfeVariante, s: HilfeStand): boolean {
  switch (variante) {
    case 'skript':
    case 'video':
      return s.eingelesen
    case 'einstellungen':
      return s.einstellungenGespeichert
    case 'auftrag':
      return s.auftragKopiert
    case 'teile':
      return s.teileFertig
    case 'antwort':
      return s.antwortGeprueft
    case 'fertig':
      return s.heruntergeladen
  }
}

export interface HilfeProblemEingabe {
  /** Meldung beim Auswählen oder Hochladen der Datei */
  dateiFehler?: string | null
  /** Das Einlesen des Skripts ist gescheitert */
  lesefehler?: boolean
  /** Ergebnis der Kontrolle, nur wenn es zur angezeigten Antwort gehört */
  pruefung?: AblaufPruefung | null
  /** Fehlermeldung einer Aktion oder der Kontrolle */
  aktionsFehler?: string | null
}

/**
 * Ordnet eine Meldung des Ablaufs einem der Problemfälle zu. Gibt es eine
 * Meldung, aber keinen passenden Fall, gilt die allgemeine Hilfe — nie eine
 * leere Karte. Ohne Meldung: kein Problem.
 */
export function erkenneProblem(e: HilfeProblemEingabe): HilfeProblemId | null {
  if (e.dateiFehler) return /größer als|50 MB/i.test(e.dateiFehler) ? 'gross' : 'lesen'
  if (e.lesefehler) return 'lesen'
  const p = e.pruefung
  if (p) {
    if (p.abgeschnitten) return 'unvollstaendig'
    if (!p.lesbar) return /werkzeug|passt nicht|anderes|gehört|aufbau/i.test(p.fehler ?? '') ? 'passt_nicht' : 'kontrolle_fehler'
    if (p.befunde.length > 0 && p.nachbesserungsPrompt) {
      return p.befunde.some((b) => /bild|tabelle|lösung|loesung/i.test(b.text)) ? 'bilder_fehlen' : 'hinweise'
    }
  }
  if (e.aktionsFehler) return /zu lang|zu viel|zu groß|zu gross|zu umfangreich/i.test(e.aktionsFehler) ? 'zu_lang' : 'allgemein'
  return null
}

/** Der Fall; fehlt sein Text, gilt die allgemeine Meldung */
export function hilfeProblem(id: HilfeProblemId): HilfeProblem {
  return HILFE_PROBLEME[id] ?? HILFE_PROBLEME.allgemein
}

// ── Gemerktes Angebot (Antwort der Schnittstelle) ─────────────────────────

export const hilfeAngebotAntwortSchema = z.object({
  werkzeug: z.string(),
  beantwortet: z.boolean(),
  antwort: z.enum(['ja', 'nein']).nullable(),
})

/** Wörter eines Textes (für die Längenregeln) */
export function zaehleWoerter(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length
}

/** Merkzettel für den Wechsel von „Neues Material“ zum Ablauf: Assistent bleibt offen (nur diese Sitzung) */
export const HILFE_UEBERGABE_SCHLUESSEL = 'wk_hilfe_offen'
