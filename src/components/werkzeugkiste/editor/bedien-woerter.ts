/**
 * Bedien-Wörter des Baukastens (PROJ-117, PROJ-118): EINZIGE Quelle für alle Beschriftungen der
 * Bearbeiten-Leiste, der Block-Leiste und der Textknöpfe in der Schublade. Schreibwerk, Aufgabenwerk,
 * Vorschau-Skript und Text-Editor bauen ihre Knöpfe aus diesen Listen; ändert man hier ein Wort,
 * ändert es sich überall. Reine Texte, kein Browser, damit sie in die Pakete passt.
 *
 * PROJ-118: Auf jedem Knopf steht ein ganzes Wort (keine Kürzel wie „F“, „H2“, „Box …“).
 */

export type TextKnopfId = 'fett' | 'kursiv' | 'h2' | 'h3' | 'liste' | 'nummer' | 'link'

export interface TextKnopf {
  id: TextKnopfId
  /** Was auf dem Knopf steht (ganzes Wort) */
  text: string
  /** Hinweistext und Name für Screenreader */
  lang: string
}

/** Die Textknöpfe in fester Reihenfolge (danach folgt die Kasten-Auswahl) */
export const TEXT_KNOEPFE: readonly TextKnopf[] = [
  { id: 'fett', text: 'Fett', lang: 'Fett (Strg/⌘ + B)' },
  { id: 'kursiv', text: 'Kursiv', lang: 'Kursiv (Strg/⌘ + I)' },
  { id: 'h2', text: 'Überschrift', lang: 'Überschrift' },
  { id: 'h3', text: 'Unterüberschrift', lang: 'Unterüberschrift' },
  { id: 'liste', text: 'Aufzählung', lang: 'Aufzählung mit Punkten' },
  { id: 'nummer', text: 'Nummerierung', lang: 'Nummerierte Liste' },
  { id: 'link', text: 'Link', lang: 'Link einfügen (Strg/⌘ + K)' },
]

/**
 * Kästen (Merke, Tipp, Achtung …). Außerhalb eines Kastens gibt es nur „Kasten einfügen …“,
 * in einem Kasten nur „Kasten ändern …“ (Art ändern, neuer Kasten darunter, entfernen, löschen).
 */
export const KASTEN = {
  einfuegen: { text: 'Kasten einfügen …', lang: 'Kasten einfügen (Merke, Tipp, Achtung …)' },
  aendern: { text: 'Kasten ändern …', lang: 'Diesen Kasten ändern' },
  /** Überschrift der Arten im Menü „Kasten ändern …“ */
  artGruppe: 'Art ändern in',
  /** Überschrift der Aktionen im Menü „Kasten ändern …“ */
  aktionGruppe: 'Kasten',
  aktionen: [
    { id: 'darunter', text: 'Neuer Kasten darunter' },
    { id: 'aufloesen', text: 'Kasten entfernen (Text bleibt)' },
    { id: 'loeschen', text: 'Kasten löschen' },
  ],
  /** Nur in der Schublade: zwei Spalten nebeneinander */
  vergleich: 'Vergleich (zwei Spalten)',
} as const

export const FERTIG = { text: 'Fertig', lang: 'Fertig – Bearbeiten beenden (Esc)' } as const

/** Die eine Bearbeiten-Leiste (PROJ-118), gleich für Lehrtext, Aufgabe, Thema, Deckblatt … */
export const ELEMENT_LEISTE = {
  /** Name der Leiste für Screenreader: „Lehrtext bearbeiten“ */
  name: (element: string) => `${element} bearbeiten`,
  html: { text: 'Als HTML bearbeiten', lang: 'Diesen Text in der Schublade als HTML bearbeiten' },
  darunter: { text: 'Darunter einfügen', lang: 'Element darunter einfügen' },
  duplizieren: { text: 'Duplizieren', lang: 'Element duplizieren' },
  loeschen: { text: 'Löschen', lang: 'Element löschen' },
  mehr: { text: 'Mehr …', lang: 'Weitere Möglichkeiten' },
  typ: 'Aufgabentyp ändern …',
  quelltext: 'Quelltext bearbeiten',
  /** Einzeilige Texte (Thema, Deckblatt, Bildunterschrift) */
  enterHinweis: 'Enter = Fertig',
} as const

/** Block-Leiste beim bloßen Anklicken: gleiche Wörter und Reihenfolge für jede Elementart */
export const BLOCK_LEISTE = {
  bearbeiten: { text: 'Bearbeiten', lang: 'Bearbeiten' },
  darunter: { text: 'Darunter einfügen', lang: 'Element darunter einfügen' },
  duplizieren: { text: 'Duplizieren', lang: 'Element duplizieren' },
  mehr: { lang: 'Weitere Aktionen' },
  loeschen: { text: 'Löschen', lang: 'Element löschen' },
} as const

/** Beschriftung der Textknöpfe in der Schublade für Screenreader */
export const LEISTE_NAME = 'Textgestaltung'

/** Löschen eines geschützten (unveränderlichen) Teils, in der Schublade */
export const GESCHUETZT_LOESCHEN = 'Geschützten Teil löschen'

/** PROJ-116: Lösungen in der Vorschau (nur im Modus „Bearbeiten“) */
export const LOESUNGEN_SICHTBAR = {
  /** Hinweis in der Kopfzeile der Vorschau */
  hinweis: 'Lösungen sichtbar – nur in „Bearbeiten“',
  /** Erklärung beim Darüberfahren */
  erklaerung: 'In „Bearbeiten“ zeigt die Seite, was als richtig eingestellt ist. In „Ausprobieren“, im Download, im Link für Azubis und im Druck sieht niemand diese Kennzeichen.',
  /** Lesbare Zusätze für die Kennzeichen (Screenreader sehen sie als Teil des Textes) */
  richtig: 'Lösung',
  passtNirgends: 'passt nirgends',
} as const
