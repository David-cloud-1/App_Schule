'use client'

import { CheckCircle2, Heart, Loader2, ShieldCheck, Trash2 } from 'lucide-react'
import { ELIMINATE_HEARTS, type RoundOption } from '@/lib/quiz-round'
import { cn } from '@/lib/utils'

interface EliminateOptionsProps {
  options: RoundOption[]
  /** Erfolgreich weggestrichene (falsche) Optionen */
  eliminatedIds: string[]
  /** Angetippt, aber richtig → Herz verloren, Option bleibt */
  keptIds: string[]
  heartsLeft: number
  /** Option, deren Prüfung gerade läuft */
  pendingId: string | null
  /** Lösung, sobald die Frage entschieden ist */
  correctOptionId: string | null
  /** Zuletzt angetippt (für Schütteln bei Herzverlust) */
  lastHeartLostId?: string | null
  onTap: (optionId: string) => void
}

export function Hearts({ left, total = ELIMINATE_HEARTS }: { left: number; total?: number }) {
  return (
    <div className="flex items-center gap-1" role="img" aria-label={`${left} von ${total} Herzen übrig`}>
      {Array.from({ length: total }, (_, i) => (
        <Heart
          key={i}
          className={cn('size-5 transition-all duration-200', i < left ? 'fill-[#FF4B4B] text-[#FF4B4B]' : 'text-[#4B5563]')}
          aria-hidden="true"
        />
      ))}
    </div>
  )
}

/**
 * Variante „Rauswerfen“ (PROJ-129): alle falschen Optionen wegtippen, bis die
 * richtige übrig bleibt. Jedes Antippen prüft der Server.
 */
export function EliminateOptions({
  options,
  eliminatedIds,
  keptIds,
  heartsLeft,
  pendingId,
  correctOptionId,
  lastHeartLostId,
  onTap,
}: EliminateOptionsProps) {
  const resolved = correctOptionId !== null

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-[#9CA3AF]">Tippe die falschen Antworten weg.</p>
        <Hearts left={heartsLeft} />
      </div>
      <ul className="flex flex-col gap-3" aria-label="Antwortmöglichkeiten zum Rauswerfen">
        {options.map((option) => {
          const eliminated = eliminatedIds.includes(option.id)
          const kept = keptIds.includes(option.id)
          const pending = pendingId === option.id
          const isCorrect = resolved && option.id === correctOptionId
          const disabled = resolved || eliminated || kept || pendingId !== null

          let cls = 'bg-[#1F2937] border-[#4B5563] text-[#F9FAFB] hover:bg-[#374151] hover:border-[#FF9600]'
          if (isCorrect) cls = 'bg-[#58CC02]/10 border-[#58CC02] text-[#58CC02] quiz-pop'
          else if (eliminated) cls = 'bg-[#111827] border-[#374151] text-[#6B7280] line-through opacity-50'
          else if (kept) cls = 'bg-[#FF4B4B]/10 border-[#FF4B4B] text-[#F9FAFB]'
          else if (resolved) cls = 'bg-[#1F2937] border-[#374151] text-[#6B7280] opacity-60'
          else if (pending) cls = 'bg-[#FF9600]/10 border-[#FF9600] text-[#F9FAFB]'

          let label = `${option.option_text} – rauswerfen`
          if (eliminated) label = `${option.option_text} – rausgeworfen`
          else if (kept) label = `${option.option_text} – die ist richtig, bleibt drin`

          return (
            <li key={option.id}>
              <button
                type="button"
                onClick={() => onTap(option.id)}
                disabled={disabled}
                aria-label={label}
                className={cn(
                  'w-full text-left px-4 py-4 rounded-2xl border-2 font-medium text-sm',
                  'transition-all duration-200 min-h-[52px] disabled:cursor-default',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF9600]',
                  cls,
                  lastHeartLostId === option.id && 'quiz-shake',
                  !disabled && 'cursor-pointer active:scale-[0.98]',
                )}
              >
                <span className="flex items-center gap-3">
                  <span className="flex-1">{option.option_text}</span>
                  {pending && <Loader2 size={18} className="animate-spin text-[#FF9600] shrink-0" aria-hidden="true" />}
                  {eliminated && <Trash2 size={16} className="shrink-0" aria-hidden="true" />}
                  {kept && !isCorrect && <ShieldCheck size={18} className="text-[#FF4B4B] shrink-0" aria-hidden="true" />}
                  {isCorrect && <CheckCircle2 size={18} className="text-[#58CC02] shrink-0" aria-hidden="true" />}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
