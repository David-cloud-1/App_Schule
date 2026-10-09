import type { ReactNode } from 'react'
import type { HofCategory } from '@/lib/hof-icons'
import { ITEM_SIZE, SCENE_WIDTH as W } from '@/lib/hof-scene-layout'

/**
 * Motive der Hof-Illustration (PROJ-33). Jede Zone zeichnet ihren Hintergrund
 * in lokalen Koordinaten (0,0 bis Breite x Höhe der Zone); die Items liegen
 * darüber. Alles ist Inline-SVG in der Palette aus docs/DESIGN.md.
 *
 * Neuer Fachbereich ohne eigenes Motiv: `getSceneTheme` fällt auf das
 * Spedition-Motiv zurück — neutral genug, damit nichts kaputt aussieht.
 */

export interface ZoneTheme {
  backdrop: (h: number, idPrefix: string, rowTops: number[]) => ReactNode
  /** Regalbrett unter jeder Reihe zeichnen (Trophäen). */
  shelf?: boolean
}

export interface SceneTheme {
  zones: Record<HofCategory, ZoneTheme>
}

const SHELF_WOOD = '#B45309'

// ── Gemeinsam: Regal-Wand ────────────────────────────────────────────────────

function wall(h: number, base: string, accent: string): ReactNode {
  return (
    <>
      <rect x={0} y={0} width={W} height={h} fill={base} />
      <g stroke={accent} strokeWidth={1} opacity={0.12}>
        {Array.from({ length: 12 }, (_, i) => (
          <line key={i} x1={i * 32 + 8} y1={0} x2={i * 32 + 8} y2={h} />
        ))}
      </g>
    </>
  )
}

// ── Spedition ────────────────────────────────────────────────────────────────

const SPED: SceneTheme = {
  zones: {
    gebaeude_deko: {
      backdrop: (h, id, rows) => (
        <>
          <defs>
            <linearGradient id={`${id}-sky`} x1={0} y1={0} x2={0} y2={1}>
              <stop offset="0" stopColor="#16324F" />
              <stop offset="1" stopColor="#2A5078" />
            </linearGradient>
          </defs>
          <rect x={0} y={0} width={W} height={h} fill={`url(#${id}-sky)`} />
          <circle cx={318} cy={24} r={13} fill="#FFD700" opacity={0.9} />
          <g fill="#F9FAFB" opacity={0.15}>
            <ellipse cx={58} cy={22} rx={30} ry={8} />
            <ellipse cx={78} cy={16} rx={20} ry={8} />
            <ellipse cx={190} cy={34} rx={26} ry={7} />
          </g>
          {/* Lagerhalle mit Rolltoren als Kulisse, steht auf dem Hofboden */}
          <g opacity={0.85}>
            <rect x={14} y={30} width={196} height={rows[0] + ITEM_SIZE - 10 - 30} fill="#1B2A3E" />
            <polygon points={`14,30 112,14 210,30`} fill="#243750" />
            {[30, 78, 126].map((dx) => (
              <g key={dx}>
                <rect x={dx} y={rows[0] + ITEM_SIZE - 10 - 32} width={34} height={32} rx={2} fill="#0F1B2D" />
                <line x1={dx} y1={rows[0] + ITEM_SIZE - 10 - 21} x2={dx + 34} y2={rows[0] + ITEM_SIZE - 10 - 21} stroke="#2A3F5B" strokeWidth={1} />
              </g>
            ))}
          </g>
          {/* Hofboden unter allen Reihen, mit Zaunlinie an der Oberkante */}
          <rect x={0} y={rows[0] + ITEM_SIZE - 10} width={W} height={h - (rows[0] + ITEM_SIZE - 10)} fill="#374151" />
          <rect x={0} y={rows[0] + ITEM_SIZE - 10} width={W} height={3} fill="#4B5563" />
          <g stroke="#9CA3AF" strokeWidth={1} opacity={0.3}>
            {Array.from({ length: 36 }, (_, i) => (
              <line key={i} x1={i * 10 + 4} y1={rows[0] + ITEM_SIZE - 22} x2={i * 10 + 4} y2={rows[0] + ITEM_SIZE - 10} />
            ))}
            <line x1={0} y1={rows[0] + ITEM_SIZE - 17} x2={W} y2={rows[0] + ITEM_SIZE - 17} />
          </g>
        </>
      ),
    },
    fahrzeuge: {
      backdrop: (h, _id, rows) => (
        <>
          <rect x={0} y={0} width={W} height={h} fill="#2B3340" />
          <rect x={0} y={0} width={W} height={5} fill="#4B5563" />
          <g stroke="#F9FAFB" strokeWidth={2} strokeDasharray="14 10" opacity={0.22}>
            {rows.map((top, i) => <line key={i} x1={0} y1={top + ITEM_SIZE + 22} x2={W} y2={top + ITEM_SIZE + 22} />)}
          </g>
        </>
      ),
    },
    ladung_ausstattung: {
      backdrop: (h, id) => (
        <>
          <defs>
            <pattern id={`${id}-haz`} width={16} height={8} patternUnits="userSpaceOnUse" patternTransform="skewX(-30)">
              <rect width={8} height={8} fill="#FFD700" />
              <rect x={8} width={8} height={8} fill="#111827" />
            </pattern>
          </defs>
          <rect x={0} y={0} width={W} height={h} fill="#34404F" />
          <rect x={0} y={0} width={W} height={7} fill={`url(#${id}-haz)`} opacity={0.85} />
          <g stroke="#9CA3AF" strokeWidth={1} opacity={0.14}>
            {Array.from({ length: 6 }, (_, i) => (
              <line key={i} x1={i * 72} y1={7} x2={i * 72} y2={h} />
            ))}
          </g>
        </>
      ),
    },
    abzeichen_trophaeen: {
      shelf: true,
      backdrop: (h) => wall(h, '#2B1D12', '#B45309'),
    },
  },
}

// ── Tourismus ────────────────────────────────────────────────────────────────

const TOUR: SceneTheme = {
  zones: {
    gebaeude_deko: {
      backdrop: (h, id, rows) => (
        <>
          <defs>
            <linearGradient id={`${id}-sky`} x1={0} y1={0} x2={0} y2={1}>
              <stop offset="0" stopColor="#1B4A7A" />
              <stop offset="0.7" stopColor="#3A7CB0" />
              <stop offset="1" stopColor="#E9A55B" />
            </linearGradient>
          </defs>
          <rect x={0} y={0} width={W} height={h} fill={`url(#${id}-sky)`} />
          <circle cx={46} cy={26} r={14} fill="#FFD700" opacity={0.95} />
          <g fill="#F9FAFB" opacity={0.28}>
            <ellipse cx={170} cy={20} rx={30} ry={8} />
            <ellipse cx={192} cy={14} rx={20} ry={8} />
            <ellipse cx={288} cy={32} rx={26} ry={7} />
          </g>
          {/* Skyline mit Hotels, steht auf dem Strand */}
          <g fill="#14304D" opacity={0.85}>
            {[
              [108, 36, 22],
              [134, 52, 26],
              [164, 32, 20],
              [188, 46, 24],
              [216, 30, 30],
            ].map(([x, ht, w]) => (
              <rect key={x} x={x} y={rows[0] + ITEM_SIZE - 10 - ht} width={w} height={ht} />
            ))}
          </g>
          <g fill="#FFD700" opacity={0.7}>
            <rect x={140} y={rows[0] + ITEM_SIZE - 10 - 44} width={4} height={4} />
            <rect x={148} y={rows[0] + ITEM_SIZE - 10 - 36} width={4} height={4} />
            <rect x={194} y={rows[0] + ITEM_SIZE - 10 - 38} width={4} height={4} />
            <rect x={202} y={rows[0] + ITEM_SIZE - 10 - 28} width={4} height={4} />
          </g>
          {/* Strand unter allen Reihen, Wellen an der Oberkante */}
          <rect x={0} y={rows[0] + ITEM_SIZE - 10} width={W} height={h - (rows[0] + ITEM_SIZE - 10)} fill="#E3B866" />
          <path d={`M0 ${rows[0] + ITEM_SIZE - 10} Q 22 ${rows[0] + ITEM_SIZE - 16} 45 ${rows[0] + ITEM_SIZE - 10} T 90 ${rows[0] + ITEM_SIZE - 10} T 135 ${rows[0] + ITEM_SIZE - 10} T 180 ${rows[0] + ITEM_SIZE - 10} T 225 ${rows[0] + ITEM_SIZE - 10} T 270 ${rows[0] + ITEM_SIZE - 10} T 315 ${rows[0] + ITEM_SIZE - 10} T 360 ${rows[0] + ITEM_SIZE - 10}`} fill="none" stroke="#1CB0F6" strokeWidth={2.5} opacity={0.9} />
        </>
      ),
    },
    fahrzeuge: {
      backdrop: (h, _id, rows) => (
        <>
          <rect x={0} y={0} width={W} height={h} fill="#232C3A" />
          <g fill="#FFD700" opacity={0.85}>
            {Array.from({ length: 12 }, (_, i) => (
              <circle key={i} cx={i * 30 + 15} cy={4} r={2} />
            ))}
          </g>
          <g stroke="#F9FAFB" strokeWidth={3} strokeDasharray="22 14" opacity={0.3}>
            {rows.map((top, i) => <line key={i} x1={0} y1={top + ITEM_SIZE + 22} x2={W} y2={top + ITEM_SIZE + 22} />)}
          </g>
        </>
      ),
    },
    ladung_ausstattung: {
      backdrop: (h) => (
        <>
          <rect x={0} y={0} width={W} height={h} fill="#27384D" />
          <rect x={0} y={0} width={W} height={7} fill="#1CB0F6" opacity={0.7} />
          <g stroke="#9CA3AF" strokeWidth={1} opacity={0.16}>
            {Array.from({ length: 6 }, (_, i) => (
              <line key={`v${i}`} x1={i * 72} y1={7} x2={i * 72} y2={h} />
            ))}
            {Array.from({ length: Math.ceil(h / 41) }, (_, i) => (
              <line key={`h${i}`} x1={0} y1={7 + i * 41} x2={W} y2={7 + i * 41} />
            ))}
          </g>
        </>
      ),
    },
    abzeichen_trophaeen: {
      shelf: true,
      backdrop: (h) => wall(h, '#1D3A3F', '#2DD4BF'),
    },
  },
}

const THEMES: Record<string, SceneTheme> = { SPED, TOUR }

export function getSceneTheme(departmentCode: string): SceneTheme {
  return THEMES[departmentCode] ?? SPED
}

export { SHELF_WOOD }
