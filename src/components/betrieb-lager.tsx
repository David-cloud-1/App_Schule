import { cn } from '@/lib/utils'
import { HofRarityFrame, HofRarityLabel } from '@/components/hof-rarity-frame'
import { getBetriebSprite } from '@/lib/betrieb-sprites'
import type { BetriebItem } from '@/lib/betrieb-stand'

/**
 * Lager-Leiste von „Mein Betrieb" (PROJ-34): gekaufte, noch nicht gesetzte
 * Items. Antippen wählt ein Item; danach genügt ein Tipp auf eine freie Kachel.
 */
export function BetriebLager({
  items,
  departmentCode,
  ausgewaehltId,
  onWaehle,
}: {
  items: BetriebItem[]
  departmentCode: string
  ausgewaehltId: string | null
  onWaehle: (id: string) => void
}) {
  if (items.length === 0) return null

  return (
    <ul className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 snap-x" aria-label="Lager">
      {items.map((item) => {
        const sprite = getBetriebSprite(departmentCode, item.icon_key)
        const aktiv = ausgewaehltId === item.id
        return (
          <li key={item.id} className="snap-start shrink-0">
            <button
              type="button"
              onClick={() => onWaehle(item.id)}
              aria-pressed={aktiv}
              aria-label={`${item.name} aus dem Lager wählen`}
              className={cn(
                'flex flex-col items-center gap-1 w-[76px] min-h-[44px] rounded-2xl border p-1.5 transition-all duration-200 active:scale-95',
                aktiv
                  ? 'border-[#FFD700] bg-[#FFD700]/15 scale-105'
                  : 'border-[#4B5563] bg-[#1F2937] hover:bg-[#374151]',
              )}
            >
              <HofRarityFrame rarity={item.rarity} className="rounded-xl w-[60px] h-[52px] bg-[#7fd24f]/20 flex items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={sprite.url} alt="" className="max-h-[48px] max-w-[56px] object-contain" draggable={false} />
              </HofRarityFrame>
              <span className="text-[10px] font-semibold leading-tight text-[#F9FAFB] line-clamp-2 text-center">
                {item.name}
              </span>
              <HofRarityLabel rarity={item.rarity} className="text-[8px] px-1.5 py-0" />
            </button>
          </li>
        )
      })}
    </ul>
  )
}
