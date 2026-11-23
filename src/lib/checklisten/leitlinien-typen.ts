import type { Block } from './setzer'

/** Ein gesetztes Original, wie es die Seite an den Browser gibt (PROJ-122). Reiner Typ, ohne die Sammlung zu laden. */
export interface OriginalAnsicht {
  schluessel: string
  titel: string
  bereich: string
  stand: string | null
  /** Weicht die Leitlinie in Schulrecht vom Stand der Liste ab? (Prüfsumme) */
  geaendert: boolean
  bloecke: Block[]
}

/** Schritt oder Hinweis → Stelle im Original */
export type AnkerKarte = Record<string, { quelle: string; block: string }>
