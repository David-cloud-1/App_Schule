'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ChevronRight, Store } from 'lucide-react'
import { useDepartment } from '@/components/department-provider'
import { BetriebWelt } from '@/components/betrieb-welt'
import { HofGallery } from '@/components/hof-gallery'
import { betriebSpriteSchluessel } from '@/lib/betrieb-sprites'
import { hofRarityLabel } from '@/lib/hof-rarity'
import type { BetriebStand } from '@/lib/betrieb-stand'

/**
 * Profil-Karte „Mein Betrieb“ (PROJ-34): kleine, nicht bedienbare Vorschau der
 * Welt mit Link zur eigenen Seite. Bereiche ohne Aufbau-Welt (bis PROJ-35:
 * Tourismus) zeigen weiter die bisherige Hof-Galerie.
 */
export function BetriebVorschau() {
  const { hofName, hofShortName, code: departmentCode } = useDepartment()
  const hatBetrieb = betriebSpriteSchluessel(departmentCode).length > 0
  const [stand, setStand] = useState<BetriebStand | null>(null)
  const [fehler, setFehler] = useState(false)

  useEffect(() => {
    if (!hatBetrieb) return
    let abgebrochen = false
    fetch('/api/betrieb')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load Betrieb')
        return res.json()
      })
      .then((data: BetriebStand) => {
        if (!abgebrochen) setStand(data)
      })
      .catch((err) => {
        console.error('[BetriebVorschau]', err)
        if (!abgebrochen) setFehler(true)
      })
    return () => {
      abgebrochen = true
    }
  }, [hatBetrieb])

  if (!hatBetrieb) return <HofGallery />
  if (fehler) return null

  const titel = `Mein ${hofShortName}`

  return (
    <div>
      <h2 className="text-xs font-semibold text-[#9CA3AF] uppercase tracking-wide mb-3">{titel}</h2>

      {stand === null ? (
        <p className="text-sm text-[#6B7280] text-center py-4">Lädt…</p>
      ) : stand.items.length === 0 ? (
        <div className="text-center py-4">
          <Store className="w-8 h-8 text-[#4B5563] mx-auto mb-2" />
          <p className="text-sm text-[#6B7280] mb-2">Noch nichts für deinen {hofShortName} gekauft.</p>
          <Link href="/shop" className="text-xs text-[#FFD700] underline underline-offset-2">
            Zum {hofName}
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Text-Alternative für Screenreader – dieselbe Information wie die Vorschau */}
          <ul className="sr-only">
            {stand.items.map((i) => (
              <li key={i.id}>
                {i.name} – {i.x === null ? 'im Lager' : 'steht im Betrieb'}
                {i.rarity !== 'standard' && ` – ${hofRarityLabel(i.rarity)}`}
              </li>
            ))}
          </ul>

          <Link href="/betrieb" aria-label={`${titel} öffnen`} className="block overflow-hidden rounded-2xl border border-[#4B5563] bg-[#7fd24f]">
            <BetriebWelt
              departmentCode={departmentCode}
              seite={stand.seite}
              items={stand.items
                .filter((i) => i.x !== null && i.y !== null)
                .map((i) => ({ id: i.id, name: i.name, iconKey: i.icon_key, x: i.x!, y: i.y!, rarity: i.rarity }))}
              ariaLabel={`Vorschau von ${titel}`}
              className="block w-full h-auto pointer-events-none"
            />
          </Link>

          <Link
            href="/betrieb"
            className="flex items-center justify-between min-h-[44px] rounded-xl bg-[#111827] border border-[#4B5563] px-4 text-sm font-semibold text-[#F9FAFB] hover:bg-[#374151] transition-colors"
          >
            <span>
              {stand.items.filter((i) => i.x !== null).length} von {stand.items.length} gesetzt
              {stand.items.some((i) => i.x === null) && ' – Items warten im Lager'}
            </span>
            <ChevronRight className="w-4 h-4 text-[#9CA3AF]" />
          </Link>
        </div>
      )}
    </div>
  )
}
