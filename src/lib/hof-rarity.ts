/**
 * Seltenheitsstufen für Hof-Items (PROJ-32) — rein visuell, ohne Einfluss auf
 * XP, Münzen, Kauf-Ablauf oder Ranglisten.
 *
 * Die wirksame Stufe wird nie gespeichert, sondern aus dem *aktuellen* Preis
 * abgeleitet, außer ein Admin hat sie manuell gesetzt (`rarity_override`).
 * Preisänderungen wirken dadurch automatisch; der eingefrorene Kaufpreis
 * (`price_paid`, PROJ-20) spielt keine Rolle.
 */

export type HofRarity = 'standard' | 'selten' | 'episch'

export const HOF_RARITIES: { value: HofRarity; label: string }[] = [
  { value: 'standard', label: 'Standard' },
  { value: 'selten', label: 'Selten' },
  { value: 'episch', label: 'Episch' },
]

/** Einzige Stelle für die Schwellen: ab diesem Preis (inklusive) gilt die Stufe. */
export const RARITY_THRESHOLDS = { selten: 100, episch: 250 } as const

export function isHofRarity(value: unknown): value is HofRarity {
  return HOF_RARITIES.some((r) => r.value === value)
}

export function deriveRarity(price: number): HofRarity {
  if (price >= RARITY_THRESHOLDS.episch) return 'episch'
  if (price >= RARITY_THRESHOLDS.selten) return 'selten'
  return 'standard'
}

/** Admin-Wert hat Vorrang; ein unbekannter oder leerer Wert fällt auf den Preis zurück. */
export function getEffectiveRarity(price: number, override?: string | null): HofRarity {
  return isHofRarity(override) ? override : deriveRarity(price)
}

export function hofRarityLabel(rarity: HofRarity): string {
  return HOF_RARITIES.find((r) => r.value === rarity)?.label ?? rarity
}
