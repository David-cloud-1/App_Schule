import { useId } from 'react'
import { SHELF_WOOD, getSceneTheme } from '@/components/hof-scene-themes'
import { getHofCategories, resolveHofIcon } from '@/lib/hof-icons'
import { hofRarityLabel, type HofRarity } from '@/lib/hof-rarity'
import { ITEM_SIZE, SCENE_WIDTH, computeSceneLayout, type OwnedHofItem, type Slot } from '@/lib/hof-scene-layout'

/**
 * Hof-Illustration (PROJ-33): „Mein Hof/Büro" als ein durchgehendes Bild.
 * Himmel, Kulisse, Boden und Regal kommen aus dem Motiv des Fachbereichs
 * (hof-scene-themes.tsx); die gekauften Items stehen auf festen Plätzen in der
 * Zone ihrer Kategorie. Freie Plätze bleiben als gestrichelte Schatten
 * sichtbar. Positionen werden nie gespeichert (hof-scene-layout.ts).
 *
 * Die Szene ist rein dekorativ (aria-hidden); die Textliste mit Name,
 * Kategorie und Seltenheit steht in der Galerie (hof-gallery.tsx).
 */

const RARITY_STYLE: Record<Exclude<HofRarity, 'standard'>, { stroke: string; fill: string; text: string }> = {
  selten: { stroke: '#1CB0F6', fill: 'rgba(28,176,246,0.14)', text: '#7DD3FC' },
  episch: { stroke: '#FFD700', fill: 'rgba(255,215,0,0.16)', text: '#FFD700' },
}

function FreeSlot({ x, y }: Slot) {
  return (
    <rect
      x={x + 2}
      y={y + 2}
      width={ITEM_SIZE - 4}
      height={ITEM_SIZE - 4}
      rx={12}
      fill="rgba(255,255,255,0.03)"
      stroke="#F9FAFB"
      strokeOpacity={0.22}
      strokeWidth={1.5}
      strokeDasharray="4 4"
    />
  )
}

function SceneItem({
  item,
  x,
  y,
  departmentCode,
  clipId,
}: {
  item: OwnedHofItem
  x: number
  y: number
  departmentCode: string
  clipId: string
}) {
  const icon = resolveHofIcon(departmentCode, item.icon_key)
  const rarity = item.rarity ?? 'standard'
  const style = rarity === 'standard' ? null : RARITY_STYLE[rarity]
  const pad = 2

  return (
    <g>
      <title>{item.name}</title>
      <ellipse cx={x + ITEM_SIZE / 2} cy={y + ITEM_SIZE - 1} rx={26} ry={4} fill="#000" opacity={0.3} />
      {style && (
        <>
          <rect
            x={x - 2}
            y={y - 2}
            width={ITEM_SIZE + 4}
            height={ITEM_SIZE + 4}
            rx={14}
            fill={style.fill}
            stroke={style.stroke}
            strokeWidth={2}
            data-rarity={rarity}
          />
          {rarity === 'episch' && (
            <>
              <clipPath id={clipId}>
                <rect x={x - 2} y={y - 2} width={ITEM_SIZE + 4} height={ITEM_SIZE + 4} rx={14} />
              </clipPath>
              <g clipPath={`url(#${clipId})`}>
                <rect
                  className="hof-shimmer-svg"
                  x={x - 2}
                  y={y - 2}
                  width={20}
                  height={ITEM_SIZE + 4}
                  fill="#FFFFFF"
                  opacity={0.4}
                  transform={`skewX(-18)`}
                />
              </g>
            </>
          )}
        </>
      )}
      {icon ? (
        <icon.Svg x={x + pad} y={y + pad} width={ITEM_SIZE - pad * 2} height={ITEM_SIZE - pad * 2} />
      ) : (
        <text
          x={x + ITEM_SIZE / 2}
          y={y + ITEM_SIZE / 2 + 12}
          fontSize={34}
          textAnchor="middle"
        >
          {item.icon || '📦'}
        </text>
      )}
      {style && (
        <>
          {/* dunkles Plättchen, damit das Label auf Sand, Asphalt und Holz gleich gut lesbar ist */}
          <rect x={x + ITEM_SIZE / 2 - 25} y={y + ITEM_SIZE + 6} width={50} height={14} rx={7} fill="#0B1220" opacity={0.78} />
          <text
            x={x + ITEM_SIZE / 2}
            y={y + ITEM_SIZE + 16.2}
            fontSize={9}
            fontWeight={700}
            textAnchor="middle"
            fill={style.text}
            letterSpacing={0.6}
          >
            {hofRarityLabel(rarity).toUpperCase()}
          </text>
        </>
      )}
    </g>
  )
}

export function HofScene({ items, departmentCode }: { items: OwnedHofItem[]; departmentCode: string }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '')
  const theme = getSceneTheme(departmentCode)
  const labels = getHofCategories(departmentCode)
  const layout = computeSceneLayout(items)

  return (
    <div className="overflow-hidden rounded-2xl border border-[#4B5563]">
      <svg
        viewBox={`0 0 ${SCENE_WIDTH} ${layout.height}`}
        className="block w-full h-auto"
        aria-hidden="true"
        focusable="false"
        fontFamily="inherit"
      >
        {layout.zones.map((zone) => {
          const zoneTheme = theme.zones[zone.category]
          const label = labels.find((c) => c.value === zone.category)?.label ?? ''
          const zid = `${uid}${zone.category}`
          return (
            <g key={zone.category} transform={`translate(0 ${zone.y})`}>
              {zoneTheme.backdrop(zone.height, zid, zone.rowTops)}

              {zoneTheme.shelf &&
                zone.rowTops.map((top) => (
                  <g key={top}>
                    <rect x={6} y={top + ITEM_SIZE + 1} width={SCENE_WIDTH - 12} height={7} rx={2} fill={SHELF_WOOD} />
                    <rect x={6} y={top + ITEM_SIZE + 1} width={SCENE_WIDTH - 12} height={2} rx={1} fill="#F9FAFB" opacity={0.25} />
                  </g>
                ))}

              {zone.empty.map((slot, i) => (
                <FreeSlot key={`e${i}`} {...slot} />
              ))}
              {zone.placed.map((p) => (
                <SceneItem
                  key={p.item.id}
                  item={p.item}
                  x={p.x}
                  y={p.y}
                  departmentCode={departmentCode}
                  clipId={`${zid}${p.item.id.replace(/[^a-zA-Z0-9]/g, '')}`}
                />
              ))}

              {/* Zonenbeschriftung auf dunklem Plättchen — lesbar auf jedem Hintergrund */}
              <rect x={8} y={7} width={label.length * 7.4 + 18} height={16} rx={8} fill="#0B1220" opacity={0.72} />
              <text
                x={15}
                y={18.5}
                fontSize={9.5}
                fontWeight={700}
                fill="#F9FAFB"
                letterSpacing={0.5}
              >
                {label.toUpperCase()}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}
