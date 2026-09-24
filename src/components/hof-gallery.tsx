'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Store } from 'lucide-react'

interface OwnedItem {
  id: string
  name: string
  description: string
  icon: string
}

interface ShopItemsResponse {
  owned_items: OwnedItem[]
}

/**
 * Reuses GET /api/shop/items (PROJ-20), whose `owned_items` lists every
 * purchase — including items deactivated since, which the shop list itself
 * no longer shows.
 */
export function HofGallery() {
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
        Mein Hof
      </h2>

      {items === null ? (
        <p className="text-sm text-[#6B7280] text-center py-4">Lädt…</p>
      ) : items.length === 0 ? (
        <div className="text-center py-4">
          <Store className="w-8 h-8 text-[#4B5563] mx-auto mb-2" />
          <p className="text-sm text-[#6B7280] mb-2">
            Noch nichts für deinen Hof gekauft.
          </p>
          <Link href="/shop" className="text-xs text-[#FFD700] underline underline-offset-2">
            Zum Speditionshof
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3">
          {items.map((item) => (
            <div
              key={item.id}
              className="bg-[#1F2937] border border-[#FFD700]/30 rounded-2xl p-3 flex flex-col items-center text-center gap-1.5"
            >
              <span className="text-3xl" role="img" aria-label={item.name}>
                {item.icon}
              </span>
              <p className="text-xs font-semibold leading-tight text-[#F9FAFB]">{item.name}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
