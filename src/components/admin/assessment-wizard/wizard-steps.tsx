'use client'

import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { WizardStep } from '@/lib/assessment-draft'
import { BEGRIFFE } from '@/lib/begriffe'

export const STEP_LABELS: Record<WizardStep, string> = {
  1: BEGRIFFE.schrittWas,
  2: BEGRIFFE.schrittPruefen,
  3: BEGRIFFE.schrittWann,
}

/**
 * Schrittleiste (PROJ-133): „1 Was? · 2 Prüfen · 3 Wann und für wen?“.
 * Der aktuelle Schritt ist hervorgehoben, erledigte lassen sich anklicken,
 * spätere sind gesperrt, bis man sie mit „Weiter“ erreicht hat.
 */
export function WizardSteps({
  current,
  reached,
  onGo,
}: {
  current: WizardStep
  reached: WizardStep
  onGo: (step: WizardStep) => void
}) {
  const steps: WizardStep[] = [1, 2, 3]
  return (
    <nav aria-label="Schritte" className="print:hidden">
      <ol className="flex gap-2 overflow-x-auto">
        {steps.map((s) => {
          const isCurrent = s === current
          const done = s < reached || (s < current)
          const enabled = s <= reached
          return (
            <li key={s} className="min-w-0 flex-1">
              <button
                type="button"
                disabled={!enabled}
                aria-current={isCurrent ? 'step' : undefined}
                onClick={() => onGo(s)}
                className={cn(
                  'flex min-h-11 w-full items-center gap-2 rounded-xl border px-3 text-left text-sm transition-colors duration-200',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ws-green',
                  isCurrent
                    ? 'border-ws-green/40 bg-ws-green/15 font-semibold text-ws-green'
                    : enabled
                      ? 'border-ws-line bg-ws-surface text-ws-text hover:bg-ws-raised'
                      : 'cursor-not-allowed border-ws-line bg-ws-surface text-ws-faint',
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    'flex size-6 shrink-0 items-center justify-center rounded-full border text-xs',
                    isCurrent ? 'border-ws-green/50' : 'border-ws-line',
                  )}
                >
                  {done && !isCurrent ? <Check className="size-3.5" /> : s}
                </span>
                <span className="truncate" title={STEP_LABELS[s]}>
                  <span className="sr-only">Schritt {s}:</span>{' '}
                  {STEP_LABELS[s]}
                </span>
              </button>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
