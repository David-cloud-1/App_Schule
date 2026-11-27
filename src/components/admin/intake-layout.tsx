'use client'

import type { ReactNode } from 'react'
import { Check } from 'lucide-react'
import { DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

/**
 * Gerüst des Dialogs „Fragen hinzufügen“ (PROJ-132): Kopf mit Titel und
 * Schrittleiste, ein Inhalt, der für sich scrollt, und eine feste Fußzeile mit
 * „Zurück“ und der Hauptaktion. Am Handy ist der Dialog ein Vollbild; die
 * Fußzeile bleibt dabei immer sichtbar.
 */
export function IntakeSteps({ steps, current }: { steps: readonly string[]; current: number }) {
  return (
    <ol className="flex w-full items-start gap-2" aria-label="Schritte">
      {steps.map((label, i) => {
        const done = i < current
        const active = i === current
        return (
          <li key={label} className="flex min-w-0 flex-1 flex-col items-center gap-1 text-center" aria-current={active ? 'step' : undefined}>
            <span
              className={cn(
                'flex size-7 items-center justify-center rounded-full border text-xs font-semibold',
                done && 'border-ws-green bg-ws-green text-ws-on-accent',
                active && 'border-ws-green bg-ws-green/15 text-ws-green',
                !done && !active && 'border-ws-line text-ws-muted',
              )}
            >
              {done ? <Check className="size-4" aria-hidden /> : i + 1}
            </span>
            <span className={cn('text-xs leading-tight', active ? 'font-semibold text-ws-text' : 'text-ws-muted')}>{label}</span>
          </li>
        )
      })}
    </ol>
  )
}

export function IntakeLayout({
  title,
  description,
  steps,
  current = 0,
  children,
  footer,
}: {
  title: string
  description?: string
  steps?: readonly string[]
  current?: number
  children: ReactNode
  footer?: ReactNode
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <DialogHeader className="space-y-3 px-4 pb-3 pt-5 sm:px-6">
        <div className="space-y-1.5 pr-8">
          <DialogTitle className="text-xl font-bold tracking-tight text-ws-text">{title}</DialogTitle>
          {description ? (
            <DialogDescription className="max-w-prose text-ws-muted">{description}</DialogDescription>
          ) : (
            <DialogDescription className="sr-only">{title}</DialogDescription>
          )}
        </div>
        {steps && <IntakeSteps steps={steps} current={current} />}
      </DialogHeader>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 sm:px-6">{children}</div>
      {footer && (
        <div className="flex flex-col-reverse gap-2 border-t border-ws-line bg-ws-surface px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          {footer}
        </div>
      )}
    </div>
  )
}
