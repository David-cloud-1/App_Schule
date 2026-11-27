'use client'

import { Dices, FileUp, Loader2, Search } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { shortageText } from '@/components/admin/assessment-suggest-dialog'
import { AssessmentSuggestPreview, type SwapState } from '@/components/admin/assessment-suggest-preview'
import { reviewState } from '@/lib/assessment-draft'
import { LEVELS, summarize, type Candidate, type Level, type Shortage } from '@/lib/assessment-suggest'

const PLURAL: Record<Level, string> = { leicht: 'leichte', mittel: 'mittlere', schwer: 'schwere' }

export interface SuggestMeta {
  shortages: Shortage[]
  emptyTopics: string[]
  poolSize: number
  hiddenByRecent: number
  statsAvailable: boolean
}

interface Props {
  items: Candidate[]
  locked: Set<string>
  swap: SwapState | null
  busy: boolean
  /** Wurde ein Vorschlag erstellt (sonst „Leer beginnen“)? Steuert die Hinweise */
  suggested: boolean
  meta: SuggestMeta | null
  /** Gewählte Fragen, die der Server abgelehnt hat (mit Hinweis markiert) */
  rejectedIds: Set<string>
  onToggleLock: (id: string) => void
  onRemove: (id: string) => void
  onOpenSwap: (id: string) => void
  onCloseSwap: () => void
  onPickAlternative: (forId: string, alt: Candidate) => void
  onReorder: (ids: string[]) => void
  onReroll: () => void
  onOpenSearch: () => void
  canReroll: boolean
}

/** Schritt 2 „Prüfen“ (PROJ-133): Vorschlag ansehen, tauschen, verschieben, eigene Fragen ergänzen */
export function WizardStepReview({
  items,
  locked,
  swap,
  busy,
  suggested,
  meta,
  rejectedIds,
  onToggleLock,
  onRemove,
  onOpenSwap,
  onCloseSwap,
  onPickAlternative,
  onReorder,
  onReroll,
  onOpenSearch,
  canReroll,
}: Props) {
  const summary = summarize(items)
  const state = reviewState(items.length)
  const rejected = items.filter((q) => rejectedIds.has(q.id))

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-ws-text" role="status">
          {items.length} {items.length === 1 ? 'Frage' : 'Fragen'}
          {items.length > 0 && <span className="ml-2 text-sm font-normal text-ws-muted">· etwa {summary.minutes} Min.</span>}
        </h2>
        <div className="flex flex-wrap gap-2">
          {suggested && (
            <Button type="button" variant="outline" className="min-h-11 rounded-xl border-ws-line" onClick={onReroll} disabled={busy || !canReroll}>
              {busy ? <Loader2 className="mr-2 size-4 animate-spin" aria-hidden /> : <Dices className="mr-2 size-4" aria-hidden />}
              Neu würfeln
            </Button>
          )}
          <Button type="button" variant="outline" className="min-h-11 rounded-xl border-ws-line" onClick={onOpenSearch} disabled={busy}>
            <Search className="mr-2 size-4" aria-hidden />
            Frage suchen
          </Button>
        </div>
      </div>

      {items.length > 0 && (
        <div className="rounded-xl bg-ws-surface p-3 text-sm">
          <p className="text-ws-muted">{LEVELS.map((l) => `${summary.perLevel[l]} ${PLURAL[l]}`).join(' · ')}</p>
          <p className="mt-1 text-xs text-ws-muted">{summary.perTopic.map((t) => `${t.topic}: ${t.count}`).join(' · ')}</p>
        </div>
      )}

      {rejected.length > 0 && (
        <p className="rounded-xl border border-ws-red/30 bg-ws-red/15 p-3 text-sm text-ws-red" role="alert">
          {rejected.length === 1 ? 'Diese Frage ist nicht mehr zulässig' : `${rejected.length} Fragen sind nicht mehr zulässig`} und
          {rejected.length === 1 ? ' ist' : ' sind'} unten markiert. Entferne {rejected.length === 1 ? 'sie' : 'sie'} oder tausche {rejected.length === 1 ? 'sie' : 'sie'}.
        </p>
      )}

      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-ws-line bg-ws-surface/50 p-6 text-center">
          <p className="text-sm text-ws-text">
            {suggested && meta?.poolSize === 0
              ? 'Zu diesen Angaben gibt es keine passenden Fragen.'
              : suggested
                ? 'Der Vorschlag ist leer. Es fehlen Fragen in den gewünschten Schwierigkeitsstufen.'
                : 'Noch keine Frage gewählt. Suche Fragen oder gehe zurück und lass dir einen Vorschlag machen.'}
          </p>
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            <Button type="button" className="min-h-11 rounded-xl bg-ws-green text-ws-on-accent hover:bg-ws-green-hover" onClick={onOpenSearch}>
              <Search className="mr-2 size-4" aria-hidden />
              Frage suchen
            </Button>
            <Button asChild variant="outline" className="min-h-11 rounded-xl border-ws-line">
              <Link href="/admin/inhalte">
                <FileUp className="mr-2 size-4" aria-hidden />
                Fragen hinzufügen
              </Link>
            </Button>
          </div>
        </div>
      ) : (
        <AssessmentSuggestPreview
          items={items}
          locked={locked}
          swap={swap}
          busy={busy}
          onToggleLock={onToggleLock}
          onRemove={onRemove}
          onOpenSwap={onOpenSwap}
          onCloseSwap={onCloseSwap}
          onPickAlternative={onPickAlternative}
          onReorder={onReorder}
        />
      )}

      {suggested && meta && (meta.shortages.length > 0 || meta.emptyTopics.length > 0 || !meta.statsAvailable || summary.unrated > 0) && (
        <ul className="space-y-1 rounded-xl border border-ws-orange/30 bg-ws-orange/15 p-3 text-sm text-ws-orange" aria-label="Hinweise">
          {meta.shortages.length > 0 && <li>{shortageText(meta.shortages, meta.statsAvailable)}</li>}
          {meta.shortages.length > 0 && meta.hiddenByRecent > 0 && (
            <li>
              {`${meta.hiddenByRecent} passende ${meta.hiddenByRecent === 1 ? 'Frage steht' : 'Fragen stehen'} in deinen letzten Nachweisen. Stelle in Schritt 1 unter „Weitere Einstellungen“ um, wenn du sie zulassen möchtest.`}
            </li>
          )}
          {meta.emptyTopics.map((t) => <li key={t}>Zum Thema „{t}“ gibt es keine passenden Fragen.</li>)}
          {!meta.statsAvailable && <li>Die Lösungsquoten sind gerade nicht verfügbar. Alle Fragen gelten als mittel.</li>}
          {meta.statsAvailable && summary.unrated > 0 && (
            <li>
              {summary.unrated} {summary.unrated === 1 ? 'Frage hat' : 'Fragen haben'} noch zu wenige Antworten (unter 20) und {summary.unrated === 1 ? 'gilt' : 'gelten'} als mittel.
            </li>
          )}
        </ul>
      )}

      {state.hint && (
        <p className={`text-sm ${state.canContinue ? 'text-ws-orange' : 'text-ws-muted'}`} role="status">{state.hint}</p>
      )}
    </div>
  )
}
