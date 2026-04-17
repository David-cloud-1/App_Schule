'use client'

import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import type { BadgeDefinition } from '@/lib/badges'

interface BadgeUnlockModalProps {
  open: boolean
  onClose: () => void
  badge: BadgeDefinition
}

export function BadgeUnlockModal({ open, onClose, badge }: BadgeUnlockModalProps) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="bg-[#1F2937] border-[#4B5563] rounded-2xl max-w-xs mx-auto text-center px-6 py-8 [&>button]:text-[#9CA3AF]">
        {/* Glow ring with animated badge icon */}
        <div className="flex justify-center mb-4">
          <div className="w-24 h-24 rounded-full flex items-center justify-center bg-[#FFD700]/15 border-4 border-[#FFD700]/40 animate-pulse">
            <span className="text-4xl" role="img" aria-label={badge.name}>
              {badge.icon}
            </span>
          </div>
        </div>

        <div className="mb-1">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#FFD700]">
            Badge freigeschaltet!
          </span>
        </div>

        <h2 className="text-2xl font-bold text-[#F9FAFB] mb-2">{badge.name}</h2>
        <p className="text-[#9CA3AF] text-sm leading-relaxed mb-6">{badge.description}</p>

        <Button
          onClick={onClose}
          className="w-full rounded-2xl bg-[#FFD700] hover:bg-[#e6c200] text-[#111827] font-bold py-5 transition-all duration-200 active:scale-95"
        >
          Weiter 🎉
        </Button>
      </DialogContent>
    </Dialog>
  )
}
