'use client'

import { ArrowLeftRight, Loader2, Lock, LockOpen, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { Candidate, Level } from '@/lib/assessment-suggest'

export const LEVEL_LABEL: Record<Level, string> = { leicht: 'Leicht', mittel: 'Mittel', schwer: 'Schwer' }
/** Getönte Pills: höchstens /20, bei Rot höchstens /15 (siehe docs/DESIGN.md) */
const LEVEL_CHIP: Record<Level, string> = {
  leicht: 'bg-ws-green/15 text-ws-green border-ws-green/30',
  mittel: 'bg-ws-blue/15 text-ws-blue border-ws-blue/30',
  schwer: 'bg-ws-red/15 text-ws-red border-ws-red/30',
}

export function LevelChip({ q }: { q: Pick<Candidate, 'level' | 'rated'> }) {
  return (
    <Badge variant="outline" className={`rounded-full px-2.5 py-0.5 text-xs ${LEVEL_CHIP[q.level]}`}>
      {LEVEL_LABEL[q.level]}
      {!q.rated && <span className="sr-only"> (zu wenige Antworten)</span>}
    </Badge>
  )
}

function rateLabel(q: Pick<Candidate, 'rate' | 'attempts'>): string {
  return q.rate === null ? `noch zu wenige Antworten (${q.attempts})` : `${q.rate} % gelöst (${q.attempts} Antworten)`
}

export interface SwapState {
  forId: string
  /** null = lädt noch */
  alternatives: Candidate[] | null
}

interface Props {
  items: Candidate[]
  locked: Set<string>
  swap: SwapState | null
  busy: boolean
  onToggleLock: (id: string) => void
  onRemove: (id: string) => void
  onOpenSwap: (id: string) => void
  onCloseSwap: () => void
  onPickAlternative: (forId: string, alt: Candidate) => void
}

/** Liste der vorgeschlagenen Fragen: fixieren, tauschen, entfernen */
export function AssessmentSuggestPreview({
  items,
  locked,
  swap,
  busy,
  onToggleLock,
  onRemove,
  onOpenSwap,
  onCloseSwap,
  onPickAlternative,
}: Props) {
  return (
    <ul className="space-y-2" aria-label="Vorgeschlagene Fragen">
      {items.map((q) => {
        const isLocked = locked.has(q.id)
        const swapping = swap?.forId === q.id
        return (
          <li key={q.id} className="rounded-xl border border-ws-line bg-ws-bg p-3">
            <div className="flex items-start gap-2">
              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 text-sm text-ws-text" title={q.question_text}>
                  {q.question_text}
                </p>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ws-muted">
                  <LevelChip q={q} />
                  <span className="truncate" title={q.topic ?? undefined}>
                    {q.topic ?? 'Ohne Thema'}
                  </span>
                  <span aria-hidden>·</span>
                  <span>{rateLabel(q)}</span>
                </div>
              </div>
              <div className="flex shrink-0 items-center">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-11 rounded-xl text-ws-muted hover:text-ws-text"
                  aria-label={isLocked ? 'Fixierung lösen' : 'Frage fixieren, bleibt beim Neu-Würfeln erhalten'}
                  aria-pressed={isLocked}
                  title={isLocked ? 'Fixiert' : 'Fixieren'}
                  onClick={() => onToggleLock(q.id)}
                  disabled={busy}
                >
                  {isLocked ? <Lock className="size-5 text-ws-green" /> : <LockOpen className="size-5" />}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-11 rounded-xl text-ws-muted hover:text-ws-text"
                  aria-label="Frage tauschen"
                  title="Tauschen"
                  aria-expanded={swapping}
                  onClick={() => (swapping ? onCloseSwap() : onOpenSwap(q.id))}
                  disabled={busy}
                >
                  <ArrowLeftRight className="size-5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-11 rounded-xl text-ws-muted hover:text-ws-red"
                  aria-label="Frage entfernen"
                  title="Entfernen"
                  onClick={() => onRemove(q.id)}
                  disabled={busy}
                >
                  <X className="size-5" />
                </Button>
              </div>
            </div>

            {swapping && (
              <div className="mt-2 rounded-lg border border-ws-line bg-ws-surface p-2" role="region" aria-label="Tauschkandidaten">
                {swap.alternatives === null ? (
                  <p className="flex items-center gap-2 p-2 text-sm text-ws-muted" aria-busy="true">
                    <Loader2 className="size-4 animate-spin" /> Suche Alternativen…
                  </p>
                ) : swap.alternatives.length === 0 ? (
                  <p className="p-2 text-sm text-ws-muted">
                    Es gibt keine weitere Frage mit gleichem Thema und gleicher Schwierigkeit.
                  </p>
                ) : (
                  <ul className="space-y-1">
                    {swap.alternatives.map((alt) => (
                      <li key={alt.id} className="flex items-center gap-2">
                        <p className="line-clamp-2 min-w-0 flex-1 text-sm text-ws-text" title={alt.question_text}>
                          {alt.question_text}
                          <span className="ml-2 text-xs text-ws-muted">{rateLabel(alt)}</span>
                        </p>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="min-h-11 shrink-0 rounded-xl border-ws-line"
                          onClick={() => onPickAlternative(q.id, alt)}
                        >
                          Nehmen
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </li>
        )
      })}
    </ul>
  )
}
