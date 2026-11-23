'use client'

import { cn } from '@/lib/utils'

interface FeedbackFlashProps {
  /** null = kein Flash. Ein neuer `flashKey` startet den Flash neu. */
  tone: 'correct' | 'wrong' | null
  flashKey: number
  /** 'screen' = ganzer Bildschirm (Quiz), 'edge' = schmaler Rand (Blitzrunde) */
  variant?: 'screen' | 'edge'
}

/** Grüner/roter Flash für 500 ms (DESIGN.md: Richtig/Falsch-Feedback). */
export function FeedbackFlash({ tone, flashKey, variant = 'screen' }: FeedbackFlashProps) {
  if (!tone) return null
  // Klassen ausgeschrieben, damit Tailwind sie findet
  const cls =
    variant === 'screen'
      ? tone === 'correct'
        ? 'inset-0 bg-[#58CC02]/20'
        : 'inset-0 bg-[#FF4B4B]/20'
      : tone === 'correct'
        ? 'inset-x-0 top-0 h-1.5 bg-[#58CC02]'
        : 'inset-x-0 top-0 h-1.5 bg-[#FF4B4B]'
  return (
    <div
      key={flashKey}
      aria-hidden="true"
      data-testid="feedback-flash"
      data-tone={tone}
      className={cn('quiz-flash pointer-events-none fixed z-40', cls)}
    />
  )
}
