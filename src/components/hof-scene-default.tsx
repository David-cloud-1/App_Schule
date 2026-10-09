import { HofItemTile, type OwnedHofItem } from '@/components/hof-item-tile'
import { getHofCategories } from '@/lib/hof-icons'

/**
 * Standard-Szene (PROJ-26, Spedition): je Kategorie eine Zone. Eine Zone ohne
 * Items dieser Kategorie wird nicht gerendert, statt als Lücke zu wirken.
 */
export function HofSceneDefault({ items, departmentCode }: { items: OwnedHofItem[]; departmentCode: string }) {
  return (
    <div className="space-y-4">
      {getHofCategories(departmentCode).map((cat) => {
        const zoneItems = items.filter((i) => i.category === cat.value)
        if (zoneItems.length === 0) return null

        return (
          <div key={cat.value} className="bg-[#1F2937] border border-[#4B5563] rounded-2xl p-3">
            <h3 className="text-[10px] font-semibold text-[#6B7280] uppercase tracking-wide mb-2">{cat.label}</h3>
            <div className="flex flex-wrap gap-3">
              {zoneItems.map((item) => (
                <HofItemTile key={item.id} item={item} departmentCode={departmentCode} />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
