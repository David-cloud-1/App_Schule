// Reine Titel-Logik für Kopien (PROJ-79) — ohne Server-Importe, damit auch Dialoge sie nutzen können.

/** Längster Titel eines Nachweises (Spalte hat CHECK 1–100) */
export const MAX_TITLE_LENGTH = 100

const COPY_SUFFIX = /\s\(Kopie(?: (\d+))?\)$/

/** Titel ohne angehängtes „(Kopie)“ / „(Kopie 3)“ */
export function baseTitle(title: string): string {
  return title.replace(COPY_SUFFIX, '')
}

/**
 * Titel für eine neue Kopie: „<Titel> (Kopie)“, bei Wiederholung „(Kopie 2)“, „(Kopie 3)“ …
 * Wird eine Kopie kopiert, hängt sich nichts doppelt an. `existing` sind die vorhandenen Titel
 * (Groß-/Kleinschreibung egal); zu lange Titel werden vorne gekürzt, der Zusatz bleibt ganz.
 */
export function nextCopyTitle(title: string, existing: string[]): string {
  const base = baseTitle(title.trim())
  const taken = new Set(existing.map((t) => t.toLowerCase()))
  for (let n = 1; ; n++) {
    const suffix = n === 1 ? ' (Kopie)' : ` (Kopie ${n})`
    const room = MAX_TITLE_LENGTH - suffix.length
    const head = base.length > room ? `${base.slice(0, Math.max(1, room - 1)).trimEnd()}…` : base
    const candidate = `${head}${suffix}`
    if (!taken.has(candidate.toLowerCase())) return candidate
    if (n > 500) return candidate
  }
}
