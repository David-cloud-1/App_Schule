'use client'

import { Coins, Loader2, Scissors } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { JokerState } from '@/lib/quiz-round'
import { cn } from '@/lib/utils'

interface JokerButtonProps {
  state: JokerState
  price: number
  pending: boolean
  onUse: () => void
}

const NOTE: Partial<Record<JokerState, string>> = {
  used: 'Joker eingesetzt',
  too_poor: 'Zu wenig Münzen',
  limit: 'Höchstens 2 Joker pro Runde',
}

/** Joker „Zwei weg“ gegen Frachtmünzen (PROJ-129). */
export function JokerButton({ state, price, pending, onUse }: JokerButtonProps) {
  if (state === 'hidden') return null
  const disabled = state !== 'available' || pending
  const note = NOTE[state]

  return (
    <div className="flex items-center justify-end gap-2">
      {note && <span className="text-xs text-[#9CA3AF]">{note}</span>}
      <Button
        type="button"
        variant="outline"
        onClick={onUse}
        disabled={disabled}
        aria-label={`Joker: zwei falsche Antworten streichen, kostet ${price} Münzen`}
        className={cn(
          'min-h-11 rounded-2xl border-2 border-[#FFD700]/50 bg-transparent text-[#FFD700] font-semibold gap-1.5',
          'hover:bg-[#FFD700]/10 hover:text-[#FFD700] active:scale-95 transition-all duration-200',
          'disabled:opacity-50',
        )}
      >
        {pending ? <Loader2 className="size-4 animate-spin" /> : <Scissors className="size-4" aria-hidden="true" />}
        Zwei weg
        <span className="inline-flex items-center gap-0.5 tabular-nums">
          · {price}
          <Coins className="size-4" aria-hidden="true" />
        </span>
      </Button>
    </div>
  )
}
