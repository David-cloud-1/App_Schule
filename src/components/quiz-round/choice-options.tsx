'use client'

import { CheckCircle2, Loader2, XCircle } from 'lucide-react'
import type { RoundOption } from '@/lib/quiz-round'
import { cn } from '@/lib/utils'

interface ChoiceOptionsProps {
  options: RoundOption[]
  /** Angetippte Option (auch während der Server prüft) */
  selectedId: string | null
  pending: boolean
  /** Lösung, sobald der Server geantwortet hat */
  correctOptionId: string | null
  /** Vom Joker gestrichene Optionen */
  removedIds?: string[]
  onSelect: (optionId: string) => void
}

/** Klassische Multiple-Choice-Optionen ohne Lösung im Browser (PROJ-129). */
export function ChoiceOptions({
  options,
  selectedId,
  pending,
  correctOptionId,
  removedIds = [],
  onSelect,
}: ChoiceOptionsProps) {
  const resolved = correctOptionId !== null
  const locked = resolved || pending

  return (
    <div className="flex flex-col gap-3" role="group" aria-label="Antwortmöglichkeiten">
      {options.map((option) => {
        const isSelected = selectedId === option.id
        const isRemoved = removedIds.includes(option.id)
        const isCorrect = resolved && option.id === correctOptionId
        const isWrongPick = resolved && isSelected && !isCorrect

        let cls = 'bg-[#1F2937] border-[#4B5563] text-[#F9FAFB] hover:bg-[#374151] hover:border-[#6B7280]'
        if (isRemoved) cls = 'bg-[#1F2937] border-[#374151] text-[#6B7280] line-through opacity-40'
        else if (isCorrect) cls = 'bg-[#58CC02]/10 border-[#58CC02] text-[#58CC02] quiz-pop'
        else if (isWrongPick) cls = 'bg-[#FF4B4B]/10 border-[#FF4B4B] text-[#FF4B4B] quiz-shake'
        else if (resolved) cls = 'bg-[#1F2937] border-[#374151] text-[#6B7280] opacity-50'
        else if (pending && isSelected) cls = 'bg-[#1CB0F6]/10 border-[#1CB0F6] text-[#F9FAFB]'
        else if (pending) cls = 'bg-[#1F2937] border-[#374151] text-[#9CA3AF]'

        return (
          <button
            key={option.id}
            type="button"
            onClick={() => onSelect(option.id)}
            disabled={locked || isRemoved}
            aria-pressed={isSelected}
            aria-label={isRemoved ? `${option.option_text} (vom Joker gestrichen)` : undefined}
            className={cn(
              'w-full text-left px-4 py-4 rounded-2xl border-2 font-medium text-sm',
              'transition-all duration-200 min-h-[52px] disabled:cursor-default',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1CB0F6]',
              cls,
              !locked && !isRemoved && 'cursor-pointer active:scale-[0.98]',
            )}
          >
            <span className="flex items-center gap-3">
              {pending && isSelected && <Loader2 size={18} className="animate-spin text-[#1CB0F6] shrink-0" aria-label="wird geprüft" />}
              {isCorrect && <CheckCircle2 size={18} className="text-[#58CC02] shrink-0" aria-hidden="true" />}
              {isWrongPick && <XCircle size={18} className="text-[#FF4B4B] shrink-0" aria-hidden="true" />}
              <span>{option.option_text}</span>
            </span>
          </button>
        )
      })}
    </div>
  )
}
