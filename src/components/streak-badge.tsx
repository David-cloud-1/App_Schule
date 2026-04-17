import { Flame } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StreakBadgeProps {
  streak: number
  /** 'pill' = compact header pill, 'card' = larger display */
  variant?: 'pill' | 'card'
  className?: string
}

export function StreakBadge({ streak, variant = 'pill', className }: StreakBadgeProps) {
  const isActive = streak > 0

  if (variant === 'card') {
    return (
      <div className={cn('flex flex-col items-center', className)}>
        <Flame
          size={24}
          className={cn(
            'mb-1 transition-colors',
            isActive ? 'text-[#FF9600]' : 'text-[#4B5563]',
          )}
        />
        <p className="text-lg font-bold text-[#F9FAFB]">{streak}</p>
        <p className="text-xs text-[#9CA3AF]">Streak</p>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'flex items-center gap-1 bg-[#111827] rounded-full px-3 py-1.5 border',
        isActive ? 'border-[#FF9600]/40' : 'border-[#4B5563]',
        className,
      )}
    >
      <Flame
        size={13}
        className={cn(isActive ? 'text-[#FF9600]' : 'text-[#4B5563]')}
      />
      <span className="text-xs font-bold text-[#F9FAFB]">{streak}</span>
    </div>
  )
}
