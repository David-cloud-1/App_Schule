'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Store } from 'lucide-react'
import { useDepartment } from '@/components/department-provider'
import { HofItemIcon } from '@/components/hof-item-icon'
import { HOF_CATEGORIES, type HofCategory } from '@/lib/hof-icons'

interface OwnedItem {
  id: string
  name: string
  description: string
  category: HofCategory | ''
  icon_key: string
  icon?: string | null
}

interface ShopItemsResponse {
  owned_items: OwnedItem[]
}

/**
 * Hof-Szene (PROJ-26): gruppiert gekaufte Items automatisch nach Kategorie
 * in feste Zonen — keine vom Nutzer gespeicherte Position. Eine Zone ohne
 * Items dieser Kategorie wird nicht gerendert, statt als Lücke zu wirken.
 *
 * Reuses GET /api/shop/items (PROJ-20), whose `owned_items` lists every
 * purchase — including items deactivated since, which the shop list itself
 * no longer shows.
 */
export function HofGallery() {
  const { hofName, hofShortName, code: departmentCode } = useDepartment()
  const [items, setItems] = useState<OwnedItem[] | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetch('/api/shop/items')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load Hof items')
        return res.json()
      })
      .then((data: ShopItemsResponse) => {
        if (!cancelled) setItems(data.owned_items ?? [])
      })
      .catch((err) => {
        console.error('[HofGallery]', err)
        if (!cancelled) setFailed(true)
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (failed) return null

  return (
    <div>
      <h2 className="text-xs font-semibold text-[#9CA3AF] uppercase tracking-wide mb-3">
        Mein {hofShortName}
      </h2>

      {items === null ? (
        <p className="text-sm text-[#6B7280] text-center py-4">Lädt…</p>
      ) : items.length === 0 ? (
        <div className="text-center py-4">
          <Store className="w-8 h-8 text-[#4B5563] mx-auto mb-2" />
          <p className="text-sm text-[#6B7280] mb-2">
            Noch nichts für deinen {hofShortName} gekauft.
          </p>
          <Link href="/shop" className="text-xs text-[#FFD700] underline underline-offset-2">
            Zum {hofName}
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Versteckte Text-Alternative für Screen-Reader — dieselbe Information wie die Szene unten. */}
          <ul className="sr-only">
            {items.map((item) => (
              <li key={item.id}>
                {item.name}
                {item.category && ` — ${HOF_CATEGORIES.find((c) => c.value === item.category)?.label}`}
              </li>
            ))}
          </ul>

          <div aria-hidden="true" className="space-y-4">
            {HOF_CATEGORIES.map((cat) => {
              const zoneItems = items.filter((i) => i.category === cat.value)
              if (zoneItems.length === 0) return null

              return (
                <div
                  key={cat.value}
                  className="bg-[#1F2937] border border-[#4B5563] rounded-2xl p-3"
                >
                  <h3 className="text-[10px] font-semibold text-[#6B7280] uppercase tracking-wide mb-2">
                    {cat.label}
                  </h3>
                  <div className="flex flex-wrap gap-3">
                    {zoneItems.map((item) => (
                      <div
                        key={item.id}
                        className="w-16 flex flex-col items-center text-center gap-1"
                        title={item.name}
                      >
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
                        <p className="text-[10px] font-semibold leading-tight text-[#F9FAFB] line-clamp-2">
                          {item.name}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
