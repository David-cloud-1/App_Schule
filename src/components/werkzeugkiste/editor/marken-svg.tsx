import {
  MARKEN_FARBWERTE,
  MARKEN_STAERKE_WERT,
  hatZweiPunkte,
  type Marke,
} from '@/lib/werkzeugkiste-bild-block'

/**
 * Die Markierungen eines Bildes als Vektorgrafik (PROJ-106). Gleiche Geometrie wie im Kern
 * (`bildmarken.zeichne`): 1000 Einheiten Breite, die Höhe folgt dem Seitenverhältnis des Bildes.
 * Der Editor nutzt dieses Bild zum Zeichnen und Verschieben, die veröffentlichte Seite bekommt ihr SVG vom Kern.
 */
export const MARKEN_BREITE = 1000

export function markenHoehe(bildBreite: number, bildHoehe: number): number {
  return bildBreite > 0 && bildHoehe > 0 ? (MARKEN_BREITE * bildHoehe) / bildBreite : (MARKEN_BREITE * 3) / 4
}

function pfeilspitze(x1: number, y1: number, x2: number, y2: number, dicke: number): string {
  const laenge = Math.hypot(x2 - x1, y2 - y1)
  if (laenge < 1) return ''
  const ux = (x2 - x1) / laenge
  const uy = (y2 - y1) / laenge
  const kopf = Math.min(laenge * 0.6, dicke * 3.2 + 14)
  const breite = kopf * 0.55
  const bx = x2 - ux * kopf
  const by = y2 - uy * kopf
  return `${x2},${y2} ${bx - uy * breite},${by + ux * breite} ${bx + uy * breite},${by - ux * breite}`
}

export function MarkenSvg({
  marken,
  bildBreite,
  bildHoehe,
  auswahl = -1,
  ausgeblendeteZeigen = false,
}: {
  marken: Marke[]
  bildBreite: number
  bildHoehe: number
  /** Index der gewählten Markierung (bekommt einen Auswahlrahmen) */
  auswahl?: number
  ausgeblendeteZeigen?: boolean
}) {
  const hoehe = markenHoehe(bildBreite, bildHoehe)
  const px = (x: number) => (x * MARKEN_BREITE) / 100
  const py = (y: number) => (y * hoehe) / 100
  let nummer = 0
  return (
    <svg viewBox={`0 0 ${MARKEN_BREITE} ${hoehe}`} preserveAspectRatio="none" className="absolute inset-0 size-full" aria-hidden focusable={false}>
      {marken.map((m, i) => {
        if (m.aus && !ausgeblendeteZeigen) return null
        const f = MARKEN_FARBWERTE[m.farbe]
        const d = MARKEN_STAERKE_WERT[m.staerke]
        const x1 = px(m.x)
        const y1 = py(m.y)
        const x2 = hatZweiPunkte(m.art) ? px(m.x2 ?? m.x) : x1
        const y2 = hatZweiPunkte(m.art) ? py(m.y2 ?? m.y) : y1
        const ax = Math.min(x1, x2)
        const ay = Math.min(y1, y2)
        const w = Math.max(Math.abs(x2 - x1), 2)
        const h = Math.max(Math.abs(y2 - y1), 2)
        const gewaehlt = i === auswahl
        let inhalt: React.ReactNode = null
        let rahmen: { x: number; y: number; w: number; h: number } = { x: ax, y: ay, w, h }
        if (m.art === 'pfeil' || m.art === 'linie') {
          inhalt = (
            <>
              <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#111" strokeWidth={d + 5} strokeLinecap="round" opacity={0.55} />
              <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={f.fuellung} strokeWidth={d} strokeLinecap="round" />
              {m.art === 'pfeil' && <polygon points={pfeilspitze(x1, y1, x2, y2, d)} fill={f.fuellung} stroke="#111" strokeWidth={2} strokeOpacity={0.55} strokeLinejoin="round" />}
            </>
          )
        } else if (m.art === 'rechteck') {
          inhalt = (
            <>
              <rect x={ax} y={ay} width={w} height={h} fill="none" stroke="#111" strokeWidth={d + 5} rx={3} opacity={0.55} />
              <rect x={ax} y={ay} width={w} height={h} fill="none" stroke={f.fuellung} strokeWidth={d} rx={3} />
            </>
          )
        } else if (m.art === 'kreis') {
          inhalt = (
            <>
              <ellipse cx={ax + w / 2} cy={ay + h / 2} rx={w / 2} ry={h / 2} fill="none" stroke="#111" strokeWidth={d + 5} opacity={0.55} />
              <ellipse cx={ax + w / 2} cy={ay + h / 2} rx={w / 2} ry={h / 2} fill="none" stroke={f.fuellung} strokeWidth={d} />
            </>
          )
        } else if (m.art === 'marker') {
          inhalt = <rect x={ax} y={ay} width={w} height={h} fill={f.fuellung} fillOpacity={0.38} rx={4} />
        } else if (m.art === 'nummer') {
          if (!m.aus) nummer++
          inhalt = (
            <>
              <circle cx={x1} cy={y1} r={24} fill={f.fuellung} stroke="#111" strokeWidth={3} strokeOpacity={0.7} />
              <text x={x1} y={y1 + 11} textAnchor="middle" fontSize={30} fontWeight={700} fontFamily="system-ui,sans-serif" fill={f.schrift}>
                {m.aus ? '' : nummer}
              </text>
            </>
          )
          rahmen = { x: x1 - 24, y: y1 - 24, w: 48, h: 48 }
        } else if (m.art === 'text' && m.text) {
          const breite = Math.min(m.text.length * 17 + 26, MARKEN_BREITE - x1 < 60 ? 60 : MARKEN_BREITE - x1)
          inhalt = (
            <>
              <rect x={x1} y={y1} width={breite} height={44} rx={8} fill="#fff" fillOpacity={0.92} stroke={f.fuellung} strokeWidth={4} />
              <text x={x1 + 13} y={y1 + 31} fontSize={28} fontWeight={600} fontFamily="system-ui,sans-serif" fill="#111" textLength={Math.max(breite - 26, 10)} lengthAdjust="spacingAndGlyphs">
                {m.text}
              </text>
            </>
          )
          rahmen = { x: x1, y: y1, w: breite, h: 44 }
        } else if (m.art === 'text') {
          // Ein leeres Textfeld zeigt im Editor einen Platzhalter, damit man es wiederfindet
          inhalt = <rect x={x1} y={y1} width={160} height={44} rx={8} fill="#fff" fillOpacity={0.6} stroke={f.fuellung} strokeWidth={3} strokeDasharray="8 6" />
          rahmen = { x: x1, y: y1, w: 160, h: 44 }
        }
        return (
          <g key={i} data-marke={i} opacity={m.aus ? 0.35 : 1}>
            {inhalt}
            {gewaehlt && (
              <rect x={rahmen.x - 8} y={rahmen.y - 8} width={rahmen.w + 16} height={rahmen.h + 16} fill="none" stroke="#2563eb" strokeWidth={4} strokeDasharray="12 8" rx={6} />
            )}
          </g>
        )
      })}
    </svg>
  )
}
