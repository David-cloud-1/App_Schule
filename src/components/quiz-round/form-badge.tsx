'use client'

import { Hand, ThumbsUp, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useFirstTimeHint } from '@/hooks/use-first-time-hint'
import { FORM_HINT, FORM_LABEL, hintStorageKey, type QuizRoundForm } from '@/lib/quiz-round'
import { cn } from '@/lib/utils'

interface FormBadgeProps {
  form: Exclude<QuizRoundForm, 'classic'>
  className?: string
}

/**
 * Kleines Etikett („Wischfrage“, „Rauswerfen“) und beim ersten Mal ein Satz
 * zur Bedienung (PROJ-129).
 */
export function FormBadge({ form, className }: FormBadgeProps) {
  const [showHint, dismissHint] = useFirstTimeHint(hintStorageKey(form))
  const Icon = form === 'true_false' ? ThumbsUp : Hand

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <Badge
        className={cn(
          'self-start rounded-full px-3 py-1 gap-1.5 text-xs font-semibold border',
          form === 'true_false'
            ? 'bg-[#1CB0F6]/15 text-[#1CB0F6] border-[#1CB0F6]/40'
            : 'bg-[#FF9600]/15 text-[#FF9600] border-[#FF9600]/40',
        )}
      >
        <Icon className="size-3.5" aria-hidden="true" />
        {FORM_LABEL[form]}
      </Badge>
      {showHint && (
        <div
          role="note"
          className="flex items-start gap-2 rounded-xl border border-[#4B5563] bg-[#111827] px-3 py-2 text-sm text-[#9CA3AF] leading-relaxed"
        >
          <p className="flex-1">{FORM_HINT[form]}</p>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={dismissHint}
            aria-label="Hinweis schließen"
            className="size-11 -my-2 -mr-2 shrink-0 text-[#9CA3AF] hover:text-[#F9FAFB] hover:bg-[#374151]"
          >
            <X className="size-4" />
          </Button>
        </div>
      )}
    </div>
  )
}
