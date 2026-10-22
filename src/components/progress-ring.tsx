import type { CSSProperties, ReactNode } from 'react'
import { cn } from '@/lib/utils'

const RADIUS = 26
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

interface ProgressRingProps {
  percent: number
  color: string
  /** Inhalt in der Mitte, meist das Fach-Icon */
  children?: ReactNode
  className?: string
}

/**
 * Runder Fortschritt in Fachfarbe (PROJ-42/43). Ein kleiner Rest-Bogen bleibt
 * sichtbar, damit 1 % nicht wie 0 % aussieht.
 */
export function ProgressRing({ percent, color, children, className }: ProgressRingProps) {
  const shown = percent > 0 ? Math.max(Math.min(percent, 100), 3) : 0
  return (
    <span className={cn('relative flex size-16 shrink-0 items-center justify-center', className)}>
      <svg viewBox="0 0 64 64" className="absolute inset-0 -rotate-90" aria-hidden>
        <circle cx="32" cy="32" r={RADIUS} fill="none" stroke="#374151" strokeWidth="6" />
        <circle
          cx="32"
          cy="32"
          r={RADIUS}
          fill="none"
          stroke={color}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={CIRCUMFERENCE * (1 - shown / 100)}
          style={{ '--ring-empty': CIRCUMFERENCE } as CSSProperties}
          className="lern-ring-fill"
        />
      </svg>
      {children}
    </span>
  )
}

/** Dünner Fortschrittsbalken, z. B. pro Thema */
export function ProgressBar({ percent, color, className }: { percent: number; color: string; className?: string }) {
  return (
    <span className={cn('block h-1.5 overflow-hidden rounded-full bg-[#374151]', className)} aria-hidden>
      <span
        className="lern-bar-fill block h-full rounded-full"
        style={{ width: `${Math.min(Math.max(percent, 0), 100)}%`, backgroundColor: color }}
      />
    </span>
  )
}
