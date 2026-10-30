/**
 * Überarbeiten (PROJ-52, Paket 2): Tippfehler direkt im Antworttext ersetzen.
 * Reiner Text-Ersatz in der Oberfläche, ohne KI, wie in der alten Werkzeugkiste.
 */

/** Ersetzt jede Fundstelle von `suche` (Groß-/Kleinschreibung zählt) durch `neu`. */
export function ersetzeText(text: string, suche: string, neu: string): { text: string; anzahl: number } {
  if (!suche) return { text, anzahl: 0 }
  const teile = text.split(suche)
  const anzahl = teile.length - 1
  return anzahl === 0 ? { text, anzahl: 0 } : { text: teile.join(neu), anzahl }
}

/** Anzahl der Fundstellen, ohne etwas zu ändern (für die Anzeige vor dem Ersetzen) */
export function zaehleTreffer(text: string, suche: string): number {
  return suche ? text.split(suche).length - 1 : 0
}

export function treffersatz(anzahl: number): string {
  return anzahl === 1 ? '1 Stelle ersetzt.' : `${anzahl} Stellen ersetzt.`
}
