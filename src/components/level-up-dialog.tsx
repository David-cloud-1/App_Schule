'use client'

import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { XpLevelBadge } from '@/components/xp-level-badge'
import { getLevelColor } from '@/lib/xp-utils'
import { Zap } from 'lucide-react'
import { cn } from '@/lib/utils'

interface LevelUpDialogProps {
  open: boolean
  onClose: () => void
  newLevel: number
  /** Total XP after this session. */
  totalXp: number
}

export function LevelUpDialog({ open, onClose, newLevel, totalXp }: LevelUpDialogProps) {
  const colorClass = getLevelColor(newLevel)

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="bg-[#1F2937] border-[#4B5563] rounded-2xl max-w-xs mx-auto text-center px-6 py-8 [&>button]:text-[#9CA3AF]">
        {/* Glow ring */}
        <div className="flex justify-center mb-4">
          <div
            className={cn(
              'w-20 h-20 rounded-full flex items-center justify-center',
              'border-4 animate-pulse',
              colorClass,
            )}
          >
            <Zap size={36} className={cn(colorClass.split(' ')[0])} />
          </div>
        </div>

        <h2 className="text-2xl font-bold text-[#F9FAFB] mb-1">Level Up!</h2>
        <p className="text-[#9CA3AF] text-sm mb-4">Du hast ein neues Level erreicht!</p>

        <div className="flex justify-center mb-6">
          <XpLevelBadge totalXp={totalXp} level={newLevel} className="text-base px-4 py-1.5" />
        </div>

        <p className="text-xs text-[#9CA3AF] mb-6">{totalXp} XP gesamt</p>

        <Button
          onClick={onClose}
          className="w-full rounded-2xl bg-[#58CC02] hover:bg-[#4CAD02] text-white font-bold py-5 transition-all duration-200 active:scale-95"
        >
          Weiter so! 💪
        </Button>
      </DialogContent>
    </Dialog>
  )
}
