/**
 * Gemeinsame Teile des Aufgabenwerks (PROJ-114): was jedes Muster vom Rahmen bekommt.
 * Läuft nur in der Vorschau-Seite (und in jsdom-Tests).
 */

export type Eintrag = Record<string, unknown>
export type Block = { type: string } & Eintrag

/** Was ein Muster zum Zeichnen und Ändern braucht */
export interface Werk {
  /** Aktueller Stand (nur lesen; ändern über `tippe`/`tue`) */
  readonly block: Block
  readonly ziel: HTMLElement
  /** Tippen: wird nach kurzer Pause gemeldet, eine Verlaufs-Gruppe je Feld */
  tippe(neu: Block, gruppe: string): void
  /** Aktion: sofort gemeldet; `fokus` = Schlüssel (`data-aw-fokus`) des Elements, das danach den Fokus bekommt */
  tue(neu: Block, gruppe: string, fokus?: string): void
  zeichne(): void
  /** Fokus beim nächsten Zeichnen setzen */
  fokus(schluessel: string): void
  ansage(text: string): void
  /** Kurzer Hinweis an einer Liste (Mindest-/Höchstzahl); verschwindet bei der nächsten Aktion */
  hinweis: { wo: string; text: string } | null
  /** Zustand der Oberfläche je Teil (offene Einträge, Ziehen, Fenster …) – gehört nur der Seite */
  zustand: Record<string, unknown>
  /** Läuft nach jedem Zeichnen (für Teile, die ihr DOM selbst führen) */
  nachher(f: () => void): void
}

/** Pause nach dem Tippen, bis die Änderung an die App geht (ms) */
export const TIPP_PAUSE_MS = 600

export const s = (v: unknown) => (typeof v === 'string' ? v : v == null ? '' : String(v))
export const liste = (v: unknown): Eintrag[] =>
  Array.isArray(v) ? v.map((x) => (x && typeof x === 'object' ? { ...(x as Eintrag) } : { text: s(x) })) : []

/** Mehrere Zeilen aus Word & Co.: Aufzählungszeichen weg, leere Zeilen weg */
export function zeilenAusEinfuegen(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((z) => z.replace(/^\s*(?:[-–•*·▪◦]|\d+[.)]|[a-z][.)])\s+/i, '').trim())
    .filter(Boolean)
}

/** Textfeld wächst mit seinem Inhalt */
export function wachse(el: HTMLTextAreaElement | null) {
  if (!el) return
  el.style.height = 'auto'
  if (el.scrollHeight > 0) el.style.height = `${el.scrollHeight}px`
}

/** Sekunden als m:ss („90“ → „1:30“); Unsinn ergibt leeren Text */
export function alsZeit(sek: unknown): string {
  const n = Number(sek)
  if (sek === '' || sek == null || !Number.isFinite(n) || n < 0) return ''
  return `${Math.floor(n / 60)}:${String(Math.floor(n % 60)).padStart(2, '0')}`
}

/** „1:30“ oder „90“ ergibt Sekunden; alles andere ergibt null */
export function ausZeit(text: string): number | null {
  const t = text.trim()
  const m = /^(\d{1,3}):([0-5]?\d)$/.exec(t)
  if (m) return Number(m[1]) * 60 + Number(m[2])
  return /^\d{1,5}$/.test(t) ? Number(t) : null
}
