'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Store } from 'lucide-react'
import { useDepartment } from '@/components/department-provider'
import type { OwnedHofItem } from '@/components/hof-item-tile'
import { HofSceneDefault } from '@/components/hof-scene-default'
import { HofSceneTourismus } from '@/components/hof-scene-tourismus'
import { hofCategoryLabel } from '@/lib/hof-icons'
import { hofRarityLabel } from '@/lib/hof-rarity'

interface ShopItemsResponse {
  owned_items: OwnedHofItem[]
}

/**
 * Hof-Szene (PROJ-26/PROJ-31): gruppiert gekaufte Items automatisch nach
 * Kategorie in feste Zonen — keine vom Nutzer gespeicherte Position. Welche
 * Szene gezeigt wird, hängt vom Fachbereich ab (Tourismus: eigene Szene,
 * sonst die Standard-Szene). Leere Zonen werden nicht gerendert.
 *
 * Reuses GET /api/shop/items (PROJ-20), whose `owned_items` lists every
 * purchase — including items deactivated since, which the shop list itself
 * no longer shows.
 */
export function HofGallery() {
  const { hofName, hofShortName, code: departmentCode } = useDepartment()
  const [items, setItems] = useState<OwnedHofItem[] | null>(null)
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
                {item.category && ` — ${hofCategoryLabel(item.category, departmentCode)}`}
                {item.rarity && item.rarity !== 'standard' && ` — ${hofRarityLabel(item.rarity)}`}
              </li>
            ))}
          </ul>

          <div aria-hidden="true">
            {departmentCode === 'TOUR' ? (
              <HofSceneTourismus items={items} departmentCode={departmentCode} />
            ) : (
              <HofSceneDefault items={items} departmentCode={departmentCode} />
            )}
          </div>
        </div>
      )}
    </div>
  )
}
