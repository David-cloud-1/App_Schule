/**
 * Regal des Kollegiums (PROJ-53) — Typen und reine Hilfsfunktionen.
 *
 * Geteilt wird ausschließlich das fertige Material. Skript, Einlesung und
 * KI-Antwort sieht nur die Besitzerin oder der Besitzer (E2). Das Regal
 * bekommt vom Server nur schmale Karten, nie diese Felder.
 */

export type RegalStufe = 'fachbereich' | 'alle' | 'ausgewaehlte'
/** „Nur ich“ gibt es als Auswahl, aber nie als gespeicherte Freigabe */
export type SichtbarkeitWahl = 'privat' | RegalStufe

export const NOTIZ_MAX = 200
export const MAX_PERSONEN = 50
export const REGAL_SEITE = 30
export const SUCHE_MAX = 100

export const STUFEN: { id: SichtbarkeitWahl; label: string }[] = [
  { id: 'privat', label: 'Nur ich' },
  { id: 'fachbereich', label: 'Mein Fachbereich' },
  { id: 'alle', label: 'Alle Lehrkräfte' },
  { id: 'ausgewaehlte', label: 'Ausgewählte Kolleginnen und Kollegen' },
]

export const HINWEIS_SKRIPT_PRIVAT = 'Geteilt wird nur das fertige Material. Dein Skript bleibt privat.'
export const HINWEIS_OHNE_FACHBEREICH = 'Trage dich unter Meine Fächer ein'

/** Eine Karte im Regal */
export interface RegalKarte {
  /** Kennung der Freigabe (nicht des Materials) */
  id: string
  titel: string
  werkzeug: string
  format: string | null
  fachId: string | null
  fachName: string | null
  notiz: string | null
  besitzerName: string
  vonMir: boolean
  /** Namentlich mit mir geteilt (Stufe „Ausgewählte“) */
  mitMirGeteilt: boolean
  /** false = nur Texte zum Kopieren, keine Datei */
  hatDatei: boolean
  /** „Anpassen“ ist möglich (nicht das eigene Material, Antwort und Bilder-Auszug sind da) */
  anpassbar: boolean
  geladen: number
  geteiltAm: string
}

export interface RegalFilterwerte {
  faecher: { id: string; name: string }[]
  /** Werkzeug-Schlüssel */
  werkzeuge: string[]
}

export interface RegalListe {
  eintraege: RegalKarte[]
  gesamt: number
  hatMehr: boolean
  /** Nur bei der ersten Seite */
  filter?: RegalFilterwerte
  /** Nur der Super-Admin: Er sieht zusätzlich die Moderationsansicht */
  moderation?: boolean
}

/** Eine Zeile der Moderationsansicht (nur Super-Admin) */
export interface ModerationZeile {
  /** Kennung der Freigabe */
  id: string
  titel: string
  werkzeug: string
  besitzerName: string
  stufe: RegalStufe
  geladen: number
  geteiltAm: string
  entnommenAm: string | null
  entnommenGrund: string | null
}

export interface ModerationListe {
  eintraege: ModerationZeile[]
  gesamt: number
  hatMehr: boolean
}

export const GRUND_MIN = 3
export const GRUND_MAX = 300
export const MODERATION_SEITE = 50

/** „Fachbereich“, „alle“, „5 Personen“ — Stufe in der Moderationstabelle */
export function stufeKurz(stufe: RegalStufe): string {
  return stufe === 'alle' ? 'Alle Lehrkräfte' : stufe === 'fachbereich' ? 'Fachbereich' : 'Ausgewählte'
}

export type RegalSortierung = 'neueste' | 'geladen'

export interface RegalAbfrage {
  suche: string
  /** leer = alle */
  fach: string
  /** leer = alle */
  werkzeug: string
  sortierung: RegalSortierung
  /** Ab 1 */
  seite: number
}

/** Was „Meine Materialien“ zur Freigabe eines Materials zeigt */
export interface MaterialRegal {
  stufe: RegalStufe
  personen: number
  bereiche: number
  entnommen: boolean
}

export interface FreigabeBereich {
  id: string
  name: string
}

export interface FreigabePerson {
  id: string
  name: string
  /** false = hat die Lehrer-Rolle verloren („kein Zugang mehr“) */
  aktiv: boolean
}

/** Stand der eigenen Freigabe für den Teilen-Dialog (leer = „Nur ich“) */
export interface FreigabeStand {
  stufe: RegalStufe
  fachId: string | null
  notiz: string | null
  bereiche: FreigabeBereich[]
  personen: FreigabePerson[]
  entnommenAm: string | null
  entnommenGrund: string | null
}

export interface FreigabeOptionen {
  /** Fachbereiche, in denen ich stehe (Meine Fächer oder Bereichs-Admin) */
  bereiche: FreigabeBereich[]
  /** Eigene Fächer zuerst */
  faecher: { id: string; name: string; eigen: boolean }[]
}

export interface FreigabeEingabe {
  stufe: SichtbarkeitWahl
  fachId: string | null
  notiz: string
  bereiche: string[]
  personen: string[]
}

// ── Anzeige ────────────────────────────────────────────────────────────────

/** Pill in der Spalte „Regal“ von Meine Materialien */
export function regalPill(r: MaterialRegal | null | undefined): { text: string; ton: 'still' | 'gruen' | 'blau' | 'rot' } {
  if (!r) return { text: 'privat', ton: 'still' }
  if (r.entnommen) return { text: 'vom Admin aus dem Regal genommen', ton: 'rot' }
  if (r.stufe === 'alle') return { text: 'alle', ton: 'gruen' }
  if (r.stufe === 'fachbereich') return { text: 'Fachbereich', ton: 'blau' }
  return { text: r.personen === 1 ? '1 Person' : `${r.personen} Personen`, ton: 'blau' }
}

/** Toast nach dem Speichern */
export function teilenToast(stufe: SichtbarkeitWahl, personen = 0): string {
  switch (stufe) {
    case 'privat':
      return 'Aus dem Regal genommen. Nur du siehst das Material.'
    case 'fachbereich':
      return 'Mit deinem Fachbereich geteilt'
    case 'alle':
      return 'Mit allen Lehrkräften geteilt'
    case 'ausgewaehlte':
      return personen === 1 ? 'Mit 1 Person geteilt' : `Mit ${personen} Personen geteilt`
  }
}

/** „1× geladen“, „12× geladen“ */
export function geladenText(n: number): string {
  return `${n}× geladen`
}

/** Dialog-Text je Stufe; bei „Fachbereich“ mit dem Namen des einen Bereichs, wenn es nur einen gibt */
export function stufenText(stufe: SichtbarkeitWahl, bereichName?: string): string {
  switch (stufe) {
    case 'privat':
      return 'Nur du siehst dieses Material.'
    case 'fachbereich':
      return bereichName ? `Alle Lehrkräfte in ${bereichName} sehen es im Regal.` : 'Alle Lehrkräfte in den gewählten Fachbereichen sehen es im Regal.'
    case 'alle':
      return 'Alle Lehrkräfte der Schule sehen es im Regal.'
    case 'ausgewaehlte':
      return 'Nur die Personen, die du auswählst, sehen es im Regal.'
  }
}
