import { getLevelFromXp, getXpWithinLevel, getXpCostOfLevel, getProgressPercent, MAX_LEVEL } from '@/lib/xp-utils'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'

interface XpProgressBarProps {
  totalXp: number
  className?: string
  showLabel?: boolean
}

export function XpProgressBar({ totalXp, className, showLabel = true }: XpProgressBarProps) {
  const level = getLevelFromXp(totalXp)
  const percent = getProgressPercent(totalXp)

  const withinLevel = getXpWithinLevel(totalXp)
  const cost = getXpCostOfLevel(level)
  const atMax = level >= MAX_LEVEL

  return (
    <div className={cn('w-full', className)}>
      <Progress
        value={percent}
        className="h-2 bg-[#374151] rounded-full [&>div]:bg-[#58CC02] [&>div]:transition-all [&>div]:duration-700"
      />
      {showLabel && (
        <p className="text-xs text-[#9CA3AF] mt-1 text-right">
          {atMax ? 'Max Level' : `${withinLevel} / ${cost} XP`}
        </p>
      )}
    </div>
  )
}
