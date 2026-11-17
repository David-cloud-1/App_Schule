/**
 * Bedien-Wörter des Baukastens (PROJ-117): welche Knöpfe die Textleiste hat, in welcher
 * Reihenfolge und mit welchen Wörtern. Das Schreibwerk in der Vorschau und der Text-Editor in
 * der Formular-Schublade bauen ihre Leiste aus DIESER Liste; ändert man hier ein Wort, ändert
 * es sich an beiden Stellen. Reine Texte, kein Browser, damit sie in die Pakete passt.
 */

export type TextKnopfId = 'fett' | 'kursiv' | 'h2' | 'h3' | 'liste' | 'nummer' | 'link'

export interface TextKnopf {
  id: TextKnopfId
  /** Was auf dem Knopf steht */
  kurz: string
  /** Hinweistext und Name für Screenreader */
  lang: string
}

/** Die Knöpfe der Textleiste in fester Reihenfolge (danach folgen Box-Wahl und Box-Aktion) */
export const TEXT_KNOEPFE: readonly TextKnopf[] = [
  { id: 'fett', kurz: 'F', lang: 'Fett' },
  { id: 'kursiv', kurz: 'K', lang: 'Kursiv' },
  { id: 'h2', kurz: 'H2', lang: 'Kapitelüberschrift' },
  { id: 'h3', kurz: 'H3', lang: 'Unterabschnitt' },
  { id: 'liste', kurz: '• Liste', lang: 'Aufzählung' },
  { id: 'nummer', kurz: '1. Liste', lang: 'Nummerierte Liste' },
  { id: 'link', kurz: 'Link', lang: 'Link (Strg/⌘ + K)' },
]

/** Wahlfeld „Box …“ (Box einfügen oder Art ändern) */
export const BOX_WAHL = { kurz: 'Box …', lang: 'Box einfügen oder Art ändern' } as const

/** Wahlfeld „Diese Box …“ mit seinen Aktionen */
export const BOX_AKTION = {
  kurz: 'Diese Box …',
  lang: 'Aktion für die Box',
  aktionen: [
    { id: 'darunter', text: 'Neue Box darunter' },
    { id: 'aufloesen', text: 'Box auflösen (Text bleibt)' },
    { id: 'loeschen', text: 'Box löschen' },
  ],
} as const

export const FERTIG = { kurz: 'Fertig', lang: 'Fertig – Schreiben beenden (Esc)' } as const

/** Beschriftung der Leiste für Screenreader */
export const LEISTE_NAME = 'Textgestaltung'

/** Löschen eines geschützten (unveränderlichen) Teils, in der Schublade */
export const GESCHUETZT_LOESCHEN = 'Geschützten Teil löschen'
