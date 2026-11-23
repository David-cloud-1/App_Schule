'use client'

import { useEffect, useRef, useState } from 'react'
import { Check, Loader2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { swipeDecision } from '@/lib/quiz-round'
import { cn } from '@/lib/utils'

interface TrueFalseCardProps {
  proposalText: string
  onAnswer: (saysTrue: boolean) => void
  /** Antwort ist unterwegs zum Server */
  pending: boolean
  /** Was der Spieler gesagt hat (null = noch nichts) */
  saidTrue: boolean | null
  /** Ergebnis vom Server; null = noch offen */
  result: { correct: boolean; proposalWasCorrect: boolean } | null
  /** ←/→ als Tastatur-Bedienung aktiv (aus, solange ein Dialog offen ist) */
  keyboard?: boolean
}

/**
 * Mit `key` je Frage einbinden, damit der Wischweg bei jeder Karte neu beginnt.
 *
 * Variante „Richtig/Falsch“ (PROJ-129): eine vorgeschlagene Antwort, der
 * Spieler sagt „Stimmt“ oder „Stimmt nicht“. Wischen ist eine Zugabe, die
 * Knöpfe (≥ 44 px) und die Pfeiltasten gehen immer.
 */
export function TrueFalseCard({ proposalText, onAnswer, pending, saidTrue, result, keyboard = true }: TrueFalseCardProps) {
  const locked = pending || result !== null || saidTrue !== null
  const [dx, setDx] = useState(0)
  const startX = useRef<number | null>(null)

  useEffect(() => {
    if (!keyboard || locked) return
    function onKey(e: KeyboardEvent) {
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return
      const target = e.target as HTMLElement | null
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return
      if (e.key === 'ArrowRight') {
        e.preventDefault()
        onAnswer(true)
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        onAnswer(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [keyboard, locked, onAnswer])

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (locked) return
    startX.current = e.clientX
    e.currentTarget.setPointerCapture?.(e.pointerId)
  }
  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (startX.current === null) return
    setDx(e.clientX - startX.current)
  }
  function onPointerEnd() {
    if (startX.current === null) return
    const decision = swipeDecision(dx)
    startX.current = null
    setDx(0)
    if (decision !== null && !locked) onAnswer(decision)
  }

  const leaning = swipeDecision(dx, 30)
  let cardCls = 'border-[#4B5563]'
  if (result) {
    cardCls = result.proposalWasCorrect ? 'border-[#58CC02] bg-[#58CC02]/10' : 'border-[#FF4B4B] bg-[#FF4B4B]/10'
  } else if (leaning === true) {
    cardCls = 'border-[#58CC02]/70'
  } else if (leaning === false) {
    cardCls = 'border-[#FF4B4B]/70'
  }

  return (
    <div className="flex flex-col gap-4">
      <div
        data-testid="tf-proposal"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
        // Wischen folgt dem Finger – nur hier ein Inline-Transform
        style={dx !== 0 ? { transform: `translateX(${dx}px) rotate(${dx / 30}deg)` } : undefined}
        className={cn(
          'relative select-none touch-pan-y rounded-2xl border-2 bg-[#1F2937] px-5 py-8 min-h-32',
          'flex items-center justify-center text-center shadow-lg',
          dx === 0 && 'transition-all duration-200',
          result && (result.correct ? 'quiz-pop' : 'quiz-shake'),
          cardCls,
        )}
      >
        <span className="sr-only">Vorgeschlagene Antwort: </span>
        <p className="text-lg font-semibold leading-relaxed text-[#F9FAFB]">{proposalText}</p>
        {result && (
          <span
            className={cn(
              'absolute top-2 right-3 text-xs font-bold uppercase tracking-wide',
              result.proposalWasCorrect ? 'text-[#58CC02]' : 'text-[#FF4B4B]',
            )}
          >
            {result.proposalWasCorrect ? 'stimmt' : 'stimmt nicht'}
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Button
          type="button"
          onClick={() => onAnswer(false)}
          disabled={locked}
          aria-pressed={saidTrue === false}
          aria-keyshortcuts="ArrowLeft"
          className={cn(
            'min-h-14 rounded-2xl border-2 text-base font-bold gap-2 transition-all duration-200 active:scale-95',
            'bg-[#FF4B4B]/10 border-[#FF4B4B] text-[#FF4B4B] hover:bg-[#FF4B4B]/20',
            'disabled:opacity-100',
            locked && saidTrue !== false && 'opacity-40',
          )}
        >
          {pending && saidTrue === false ? <Loader2 className="size-5 animate-spin" /> : <X className="size-5" aria-hidden="true" />}
          Stimmt nicht
        </Button>
        <Button
          type="button"
          onClick={() => onAnswer(true)}
          disabled={locked}
          aria-pressed={saidTrue === true}
          aria-keyshortcuts="ArrowRight"
          className={cn(
            'min-h-14 rounded-2xl border-2 text-base font-bold gap-2 transition-all duration-200 active:scale-95',
            'bg-[#58CC02]/10 border-[#58CC02] text-[#58CC02] hover:bg-[#58CC02]/20',
            'disabled:opacity-100',
            locked && saidTrue !== true && 'opacity-40',
          )}
        >
          {pending && saidTrue === true ? <Loader2 className="size-5 animate-spin" /> : <Check className="size-5" aria-hidden="true" />}
          Stimmt
        </Button>
      </div>
    </div>
  )
}
