import { getLevelFromXp, getLevelColor } from '@/lib/xp-utils'
import { cn } from '@/lib/utils'

interface XpLevelBadgeProps {
  totalXp: number
  /** Override level directly (useful when level is already computed). */
  level?: number
  className?: string
}

export function XpLevelBadge({ totalXp, level: levelProp, className }: XpLevelBadgeProps) {
  const level = levelProp ?? getLevelFromXp(totalXp)
  const colorClass = getLevelColor(level)

  return (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded-full border px-2.5 py-0.5',
        'text-xs font-bold leading-none',
        colorClass,
        className,
      )}
    >
      Lvl {level}
    </span>
  )
}
