'use client'

import { BADGE_DEFINITIONS } from '@/lib/badges'
import { cn } from '@/lib/utils'

export interface UnlockedBadge {
  badge_id: string
  unlocked_at: string
}

interface BadgeGalleryProps {
  unlockedBadges: UnlockedBadge[]
}

function formatDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export function BadgeGallery({ unlockedBadges }: BadgeGalleryProps) {
  const unlockedMap = new Map(unlockedBadges.map((b) => [b.badge_id, b.unlocked_at]))

  return (
    <div>
      <h2 className="text-xs font-semibold text-[#9CA3AF] uppercase tracking-wide mb-3">
        Achievements
      </h2>

      {unlockedBadges.length === 0 && (
        <p className="text-sm text-[#6B7280] text-center py-4">
          Schließ deine erste Session ab, um Badges zu verdienen!
        </p>
      )}

      <div className="grid grid-cols-3 gap-3">
        {BADGE_DEFINITIONS.map((badge) => {
          const unlockedAt = unlockedMap.get(badge.id)
          const isUnlocked = !!unlockedAt

          return (
            <div
              key={badge.id}
              className={cn(
                'bg-[#1F2937] border rounded-2xl p-3 flex flex-col items-center text-center gap-1.5',
                isUnlocked ? 'border-[#FFD700]/30' : 'border-[#374151]',
              )}
            >
              {/* Icon */}
              <div className="relative">
                <span
                  className={cn('text-3xl', !isUnlocked && 'grayscale opacity-30')}
                  role="img"
                  aria-label={badge.name}
                >
                  {badge.icon}
                </span>
                {!isUnlocked && (
                  <span className="absolute -bottom-1 -right-1 text-[11px]" aria-hidden="true">🔒</span>
                )}
              </div>

              {/* Name */}
              <p
                className={cn(
                  'text-xs font-semibold leading-tight',
                  isUnlocked ? 'text-[#F9FAFB]' : 'text-[#6B7280]',
                )}
              >
                {badge.name}
              </p>

              {/* Unlock date or condition */}
              {isUnlocked ? (
                <p className="text-[11px] text-[#FFD700]">{formatDate(unlockedAt)}</p>
              ) : (
                <p className="text-[11px] text-[#6B7280] leading-tight">{badge.description}</p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
