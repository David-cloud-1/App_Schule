import type { Checkliste } from '../liste'
import { dienstreiseBeantragen } from './dienstreise-beantragen'
import { reisekostenAbrechnen } from './reisekosten-abrechnen'

/** Alle Checklisten in der Reihenfolge der Übersicht. Neue Liste = Datei + Eintrag hier + Eintrag in `katalog.ts`. */
export const CHECKLISTEN_LISTEN: readonly Checkliste[] = [dienstreiseBeantragen, reisekostenAbrechnen]

export function findeCheckliste(id: string): Checkliste | null {
  return CHECKLISTEN_LISTEN.find((l) => l.id === id) ?? null
}
