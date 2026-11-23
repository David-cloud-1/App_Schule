/**
 * Checklisten zu den Handlungsleitlinien (PROJ-122): Typen und reine Logik.
 * Die Listen selbst stehen fest im Code (`listen/*.ts`, E4); gespeichert werden
 * nur Haken und Durchläufe (Datenbank, privat im eigenen Konto).
 */

export const CHECKLISTEN_HREF = '/admin/checklisten'

export function checklisteHref(id: string): string {
  return `${CHECKLISTEN_HREF}/${encodeURIComponent(id)}`
}

/** Für wen eine Liste gilt (E5) */
export type Zielgruppe = 'Lehrkraft' | 'Klassenleitung' | 'Sekretariat' | 'Fachbetreuung' | 'Mentor/in'

/** Eine Leitlinie, zu deren Stand die Liste geschrieben und geprüft wurde */
export interface Quelle {
  /** Schlüssel innerhalb der Liste (für Textanker) */
  schluessel: string
  /** Kennung der Leitlinie in Schulrecht (`leitlinien.json`) */
  leitlinie: string
  /** Prüfsumme des Wortlauts zum Zeitpunkt, als die Liste geprüft wurde */
  pruefsumme: string
  /** Stand der Leitlinie (ISO) oder null, wenn die Leitlinie keinen nennt */
  stand: string | null
  /** Überschriften im Text, die der Setzer als solche setzt (Wortlaut, wörtlich im Text) */
  ueberschriften?: readonly string[]
}

export interface Variante {
  id: string
  label: string
  /** Kein Antrag nötig: statt Schritten steht dieser Hinweis, die Liste endet */
  keinAntrag?: string
}

export interface Schritt {
  /** Feste Kennung, wird nie umnummeriert oder umbenannt (Haken verweisen darauf) */
  id: string
  /** Kurzer Satz, Verb am Anfang */
  text: string
  zusatz?: string
  /** Frist als Text (berechnete Daten folgen in PROJ-126) */
  frist?: string
  /** Frist ist eine Annahme, von der Schulleitung noch zu bestätigen (E10) – gilt in diesen Varianten */
  fristAnnahme?: readonly string[]
  /** In welchen Varianten der Schritt gilt; ohne Angabe in allen */
  varianten?: readonly string[]
  /** Wörtliche Wendung im Original, zu der „Im Original ansehen“ springt */
  anker?: { quelle: string; text: string }
  /** Nicht mehr nötig: bleibt in alten Durchläufen sichtbar, neue zeigen ihn nicht */
  entfallen?: boolean
}

export interface Hinweis {
  id: string
  art: 'warnung' | 'info'
  text: string
  varianten?: readonly string[]
  anker?: { quelle: string; text: string }
}

export interface Checkliste {
  id: string
  titel: string
  beschreibung: string
  fuerWen: readonly Zielgruppe[]
  quellen: readonly Quelle[]
  /** Frage über der Variantenwahl, z. B. „Um welche Art von Reise geht es?“ */
  variantenFrage?: string
  varianten?: readonly Variante[]
  hinweise: readonly Hinweis[]
  schritte: readonly Schritt[]
  /** Folge-Liste, wenn alles erledigt ist */
  weiter?: { id: string; label: string }
  /** Text über den Quellen („Quellen“-Zeile) */
  bemerkung?: string
}

/** Gilt etwas (Schritt, Hinweis) in dieser Variante? */
export function giltInVariante(element: { varianten?: readonly string[] }, variante: string | null): boolean {
  if (!element.varianten || element.varianten.length === 0) return true
  return variante !== null && element.varianten.includes(variante)
}

export function findeVariante(liste: Checkliste, id: string | null): Variante | null {
  if (!id) return null
  return liste.varianten?.find((v) => v.id === id) ?? null
}

/** Braucht die Liste zuerst eine Wahl? (Varianten vorhanden, aber noch keine gewählt) */
export function brauchtVariante(liste: Checkliste, variante: string | null): boolean {
  return !!liste.varianten && liste.varianten.length > 0 && findeVariante(liste, variante) === null
}

/** Schritte, die in dieser Variante angezeigt werden (entfallene nie) */
export function sichtbareSchritte(liste: Checkliste, variante: string | null): Schritt[] {
  if (brauchtVariante(liste, variante)) return []
  if (findeVariante(liste, variante)?.keinAntrag) return []
  return liste.schritte.filter((s) => !s.entfallen && giltInVariante(s, variante))
}

export function sichtbareHinweise(liste: Checkliste, variante: string | null): Hinweis[] {
  if (brauchtVariante(liste, variante)) return []
  return liste.hinweise.filter((h) => giltInVariante(h, variante))
}

export interface Fortschritt {
  erledigt: number
  gesamt: number
  fertig: boolean
}

/** Fortschritt aus Haken und Variante – wird nie gespeichert, sondern berechnet (Tech Design B) */
export function berechneFortschritt(liste: Checkliste, variante: string | null, haken: readonly string[]): Fortschritt {
  const schritte = sichtbareSchritte(liste, variante)
  const gesetzt = new Set(haken)
  const erledigt = schritte.filter((s) => gesetzt.has(s.id)).length
  return { erledigt, gesamt: schritte.length, fertig: schritte.length > 0 && erledigt === schritte.length }
}

/** „3 von 8“ */
export function fortschrittText(f: Fortschritt): string {
  return `${f.erledigt} von ${f.gesamt}`
}

/** Frist-Annahme gilt für diesen Schritt in dieser Variante? */
export function istFristAnnahme(schritt: Schritt, variante: string | null): boolean {
  return !!schritt.frist && !!schritt.fristAnnahme && variante !== null && schritt.fristAnnahme.includes(variante)
}

/** „07.05.2025“ aus „2025-05-07“ */
export function datumDeutsch(iso: string | null | undefined): string | null {
  const m = iso ? /^(\d{4})-(\d{2})-(\d{2})/.exec(iso) : null
  return m ? `${m[3]}.${m[2]}.${m[1]}` : null
}

export function standText(stand: string | null): string {
  const d = datumDeutsch(stand)
  return d ? `Stand ${d}` : 'Ohne Stand-Angabe'
}
