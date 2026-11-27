'use client'

import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { SCHRITTE, type AblaufInfo } from '@/lib/nachweis-ablauf'

/**
 * PROJ-134: Schrittleiste „Entwurf · Offen · Geschlossen · Freigegeben“ mit einem
 * Satz, was jetzt gilt und zu tun ist. Der aktuelle Schritt ist hervorgehoben,
 * erledigte sind abgehakt, spätere blass.
 */
export function NachweisSchrittleiste({
  info,
  autoClosedText,
}: {
  info: AblaufInfo
  /** „Automatisch geschlossen (Beitritt abgelaufen) · Do, 28.11., 23:59“ */
  autoClosedText?: string | null
}) {
  return (
    <section aria-label="Ablauf des Nachweises" className="space-y-3 rounded-2xl border border-ws-line bg-ws-surface p-4">
      <ol className="flex items-center gap-1 overflow-x-auto sm:gap-2">
        {SCHRITTE.map((schritt, index) => {
          const done = index < info.stepIndex || (info.step === 'freigegeben' && index === info.stepIndex)
          const current = index === info.stepIndex && info.step !== 'freigegeben'
          return (
            <li key={schritt.key} className="flex shrink-0 items-center gap-1 sm:gap-2" aria-current={current ? 'step' : undefined}>
              <span
                className={cn(
                  'flex min-h-9 items-center gap-1.5 rounded-full border px-3 text-sm',
                  current && 'border-ws-green bg-ws-green font-semibold text-ws-on-accent',
                  done && 'border-ws-green/30 bg-ws-green/15 text-ws-green',
                  !current && !done && 'border-ws-line text-ws-faint',
                )}
              >
                {done ? <Check className="size-4" aria-hidden /> : <span className="tabular-nums" aria-hidden>{index + 1}</span>}
                <span>{schritt.label}</span>
                {done && <span className="sr-only">(erledigt)</span>}
                {current && <span className="sr-only">(aktueller Schritt)</span>}
              </span>
              {index < SCHRITTE.length - 1 && <span className="h-px w-3 bg-ws-line sm:w-6" aria-hidden />}
            </li>
          )
        })}
      </ol>
      <p className="text-sm text-ws-text">{info.sentence}</p>
      {info.joinEndedNote && (
        <p className="text-sm text-ws-orange" role="status">{info.joinEndedNote}</p>
      )}
      {autoClosedText && <p className="text-xs text-ws-muted">{autoClosedText}</p>}
    </section>
  )
}
