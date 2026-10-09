import { HofItemIcon } from '@/components/hof-item-icon'
import type { HofCategory } from '@/lib/hof-icons'

export interface OwnedHofItem {
  id: string
  name: string
  description: string
  category: HofCategory | ''
  icon_key: string
  icon?: string | null
}

/**
 * Einzelnes gekauftes Item in einer Hof-Szene (PROJ-26/PROJ-31). Eigener
 * Baustein, damit beide Fachbereichs-Szenen dieselbe Kachel nutzen und
 * spätere Erweiterungen (z. B. Effekte, PROJ-32) nur an einer Stelle greifen.
 */
export function HofItemTile({ item, departmentCode }: { item: OwnedHofItem; departmentCode: string }) {
  return (
    <div className="w-16 flex flex-col items-center text-center gap-1" title={item.name}>
      <div className="w-14 h-14 rounded-xl bg-[#111827] border border-[#FFD700]/30 flex items-center justify-center">
        <HofItemIcon
          departmentCode={departmentCode}
          iconKey={item.icon_key}
          legacyIcon={item.icon}
          name={item.name}
          svgClassName="w-9 h-9"
          emojiClassName="text-2xl"
        />
      </div>
      <p className="text-[10px] font-semibold leading-tight text-[#F9FAFB] line-clamp-2">{item.name}</p>
    </div>
  )
}
