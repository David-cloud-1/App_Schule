import { cn } from '@/lib/utils'
import { hofRarityLabel, type HofRarity } from '@/lib/hof-rarity'

/**
 * Seltenheits-Rahmen (PROJ-32) um die Illustration eines Hof-Items — eine
 * einzige Stelle für Shop-Kachel und beide Hof-Szenen, damit sie garantiert
 * gleich aussehen. Standard bleibt unverändert (keine zusätzlichen Klassen).
 *
 * Der Rahmen nutzt nur `ring`/`box-shadow` und ändert damit kein Layout.
 * Epische Items bekommen zusätzlich einen einmaligen Schimmer (globals.css),
 * der bei "Bewegung reduzieren" entfällt.
 */
const FRAME: Record<HofRarity, string> = {
  standard: '',
  selten: 'ring-2 ring-[#1CB0F6]/70 shadow-[0_0_10px_rgba(28,176,246,0.35)]',
  episch: 'ring-2 ring-[#FFD700] shadow-[0_0_14px_rgba(255,215,0,0.55)] relative overflow-hidden hof-shimmer',
}

export function HofRarityFrame({
  rarity = 'standard',
  className,
  children,
}: {
  rarity?: HofRarity
  className?: string
  children: React.ReactNode
}) {
  return (
    <div data-rarity={rarity} className={cn(FRAME[rarity], className)}>
      {children}
    </div>
  )
}

const LABEL: Record<Exclude<HofRarity, 'standard'>, string> = {
  selten: 'text-[#1CB0F6] bg-[#1CB0F6]/10',
  episch: 'text-[#FFD700] bg-[#FFD700]/10',
}

/** Textlabel „Selten"/„Episch" — damit die Stufe nie nur über Farbe erkennbar ist. Für Standard: nichts. */
export function HofRarityLabel({ rarity = 'standard', className }: { rarity?: HofRarity; className?: string }) {
  if (rarity === 'standard') return null
  return (
    <span
      className={cn(
        'text-[9px] uppercase tracking-wide font-semibold rounded-full px-2 py-0.5',
        LABEL[rarity],
        className,
      )}
    >
      {hofRarityLabel(rarity)}
    </span>
  )
}
