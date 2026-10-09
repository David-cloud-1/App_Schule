import { HofItemTile, type OwnedHofItem } from '@/components/hof-item-tile'
import { getHofCategories, type HofCategory } from '@/lib/hof-icons'

/**
 * Tourismus-Szene „Mein Büro" (PROJ-31): eine zusammenhängende Reise-Szene mit
 * Himmel, Wolken, Skyline und Landebahn als Inline-SVG-Hintergrund. Die Zonen
 * liegen darüber und sind – wie in der Standard-Szene – fest an die Kategorie
 * gebunden (keine freie Positionierung). Leere Zonen werden nicht gerendert.
 *
 * Reihenfolge von oben nach unten: Hotels im Hintergrund, Verkehrsmittel auf
 * dem Vorfeld, Reiseausstattung davor, Trophäen auf dem Regal im Reisebüro.
 */

const ZONE_ORDER: HofCategory[] = ['gebaeude_deko', 'fahrzeuge', 'ladung_ausstattung', 'abzeichen_trophaeen']

const ZONE_STYLE: Record<HofCategory, string> = {
  gebaeude_deko: 'bg-[#FFD700]/10 border border-[#FFD700]/20',
  fahrzeuge: 'bg-[#111827]/70 border-y-2 border-dashed border-[#F9FAFB]/25',
  ladung_ausstattung: 'bg-[#1CB0F6]/10 border border-[#1CB0F6]/20',
  abzeichen_trophaeen: 'bg-[#2B1D12]/80 border-b-4 border-[#B45309]',
}

function Backdrop() {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      className="absolute inset-0 w-full h-full"
      viewBox="0 0 320 420"
      preserveAspectRatio="xMidYMax slice"
    >
      <circle cx={268} cy={44} r={20} fill="#FFD700" opacity={0.85} />
      <g fill="#F9FAFB" opacity={0.14}>
        <ellipse cx={70} cy={50} rx={34} ry={10} />
        <ellipse cx={92} cy={43} rx={22} ry={9} />
        <ellipse cx={200} cy={86} rx={30} ry={8} />
        <ellipse cx={218} cy={80} rx={18} ry={7} />
      </g>
      <g fill="#0B1220" opacity={0.7}>
        <rect x={0} y={330} width={30} height={90} />
        <rect x={34} y={300} width={24} height={120} />
        <rect x={62} y={338} width={34} height={82} />
        <rect x={236} y={312} width={28} height={108} />
        <rect x={268} y={340} width={52} height={80} />
      </g>
      <rect x={0} y={392} width={320} height={28} fill="#0B1220" opacity={0.6} />
      <g stroke="#F9FAFB" strokeWidth={2} strokeDasharray="14 12" opacity={0.25}>
        <line x1={0} y1={406} x2={320} y2={406} />
      </g>
    </svg>
  )
}

export function HofSceneTourismus({ items, departmentCode }: { items: OwnedHofItem[]; departmentCode: string }) {
  const labels = getHofCategories(departmentCode)

  return (
    <div className="relative overflow-hidden rounded-2xl border border-[#4B5563] bg-gradient-to-b from-[#0F2742] via-[#173553] to-[#1F2937]">
      <Backdrop />
      <div className="relative space-y-3 p-3">
        {ZONE_ORDER.map((category) => {
          const zoneItems = items.filter((i) => i.category === category)
          if (zoneItems.length === 0) return null

          return (
            <div key={category} className={`rounded-xl p-3 ${ZONE_STYLE[category]}`}>
              <h3 className="text-[10px] font-semibold text-[#F9FAFB]/70 uppercase tracking-wide mb-2">
                {labels.find((c) => c.value === category)?.label}
              </h3>
              <div className="flex flex-wrap gap-3">
                {zoneItems.map((item) => (
                  <HofItemTile key={item.id} item={item} departmentCode={departmentCode} />
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
