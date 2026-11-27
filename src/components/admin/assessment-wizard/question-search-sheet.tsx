'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Check, Loader2, Plus, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { AdminSegmented } from '@/components/admin/admin-segmented'
import { AdminEmptyState, AdminErrorState } from '@/components/admin/admin-states'
import { MultiPick } from '@/components/admin/assessment-suggest-dialog'
import { LevelChip } from '@/components/admin/assessment-suggest-preview'
import { hitToCandidate } from '@/lib/assessment-draft'
import { SEARCH_PAGE_SIZE, type Facets, type QuestionSearchResult, type SearchHit } from '@/lib/assessment-question-search'
import type { Candidate, Level } from '@/lib/assessment-suggest'
import { useIsMobile } from '@/hooks/use-mobile'

const ENDPOINT = '/api/admin/assessments/questions/search'

const LEVEL_FILTER = [
  { value: 'alle', label: 'Alle' },
  { value: 'leicht', label: 'Leicht' },
  { value: 'mittel', label: 'Mittel' },
  { value: 'schwer', label: 'Schwer' },
] as const

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  departmentId: string
  facets: Facets | null
  /** Bereits gewählte Fragen: sie sind markiert und lassen sich hier wieder abwählen */
  chosenIds: Set<string>
  onAdd: (q: Candidate) => void
  onRemove: (id: string) => void
  /** Anzahl der gewählten Fragen, bleibt in der Kopfzeile sichtbar */
  chosenCount: number
}

/**
 * Seitenleiste „Frage suchen“ (PROJ-133, Schritt 2): Suchfeld und Filter, höchstens
 * 25 Treffer je Anfrage, „Weitere anzeigen“ lädt nach. Kein „Alle wählen“.
 */
export function QuestionSearchSheet({ open, onOpenChange, departmentId, facets, chosenIds, onAdd, onRemove, chosenCount }: Props) {
  const isMobile = useIsMobile()
  const [text, setText] = useState('')
  const [subjects, setSubjects] = useState<string[]>([])
  const [topics, setTopics] = useState<string[]>([])
  const [level, setLevel] = useState<'alle' | Level>('alle')
  const [hits, setHits] = useState<SearchHit[]>([])
  const [total, setTotal] = useState(0)
  const [nextOffset, setNextOffset] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [failed, setFailed] = useState(false)
  const requestId = useRef(0)

  const topicOptions = (facets?.topics ?? [])
    .filter((t) => subjects.length === 0 || t.subjects.some((c) => subjects.includes(c)))
    .map((t) => t.name)

  const run = useCallback(
    async (offset: number) => {
      const id = ++requestId.current
      setLoading(true)
      setFailed(false)
      try {
        const res = await fetch(ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'search',
            departmentId,
            text,
            subjects,
            topics: topics.filter((t) => topicOptions.includes(t)),
            level: level === 'alle' ? null : level,
            offset,
          }),
        })
        if (!res.ok) throw new Error()
        const data = (await res.json()) as QuestionSearchResult
        if (id !== requestId.current) return
        setHits((cur) => (offset === 0 ? data.items : [...cur, ...data.items]))
        setTotal(data.total)
        setNextOffset(data.nextOffset)
      } catch {
        if (id === requestId.current) setFailed(true)
      } finally {
        if (id === requestId.current) setLoading(false)
      }
    },
    // topicOptions ist aus facets und subjects abgeleitet
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [departmentId, text, subjects, topics, level, facets],
  )

  // Suchen beim Öffnen und (kurz verzögert) bei jeder Änderung
  useEffect(() => {
    if (!open) return
    const t = setTimeout(() => void run(0), text ? 300 : 0)
    return () => clearTimeout(t)
  }, [open, run, text])

  const remaining = nextOffset === null ? 0 : total - hits.length

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={isMobile ? 'bottom' : 'right'}
        className="flex w-full flex-col gap-3 border-ws-line bg-ws-surface p-4 text-ws-text data-[side=bottom]:max-h-[90vh] data-[side=right]:sm:max-w-lg"
      >
        <SheetHeader className="text-left">
          <SheetTitle className="text-ws-text">Frage suchen</SheetTitle>
          <SheetDescription className="text-ws-muted">
            Du hast {chosenCount} {chosenCount === 1 ? 'Frage' : 'Fragen'} gewählt. Gewählte Fragen sind markiert.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ws-muted" aria-hidden />
            <Input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Suchwort im Fragetext oder Thema"
              aria-label="Suchwort"
              className="min-h-11 rounded-xl border-ws-line bg-ws-bg pl-9 text-ws-text"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <MultiPick label="Fach" options={facets?.subjects ?? []} value={subjects} onChange={setSubjects} emptyText="Keine Fächer vorhanden." />
            <MultiPick
              label="Thema"
              options={topicOptions}
              value={topics.filter((t) => topicOptions.includes(t))}
              onChange={setTopics}
              emptyText="Keine Themen zu dieser Auswahl."
            />
          </div>
          <AdminSegmented ariaLabel="Schwierigkeit" value={level} onChange={setLevel} options={LEVEL_FILTER} />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto" aria-live="polite">
          {failed ? (
            <AdminErrorState message="Die Suche hat gerade nicht geklappt." onRetry={() => void run(0)} />
          ) : loading && hits.length === 0 ? (
            <p className="flex items-center gap-2 p-3 text-sm text-ws-muted" aria-busy="true">
              <Loader2 className="size-4 animate-spin" aria-hidden /> Suche läuft …
            </p>
          ) : hits.length === 0 ? (
            <AdminEmptyState icon={Search} title="Keine passende Frage" description="Ändere das Suchwort oder die Filter." />
          ) : (
            <>
              <p className="mb-2 text-xs text-ws-muted">{total} {total === 1 ? 'Treffer' : 'Treffer'}</p>
              <ul className="space-y-2">
                {hits.map((h) => {
                  const chosen = chosenIds.has(h.id)
                  return (
                    <li
                      key={h.id}
                      className={`flex items-start gap-2 rounded-xl border p-3 ${chosen ? 'border-ws-green/40 bg-ws-green/15' : 'border-ws-line bg-ws-bg'}`}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-3 text-sm text-ws-text" title={h.question_text}>{h.question_text}</p>
                        <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ws-muted">
                          <LevelChip q={h} />
                          <span className="truncate" title={h.topic ?? undefined}>{h.topic ?? 'Ohne Thema'}</span>
                          {h.isPrivate && <span>· Meine Frage</span>}
                          {h.blocked && <span className="text-ws-orange">· ausgeschlossen</span>}
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant={chosen ? 'outline' : 'default'}
                        className={`min-h-11 shrink-0 rounded-xl ${chosen ? 'border-ws-green/40 text-ws-green' : 'bg-ws-blue text-ws-on-accent hover:bg-ws-blue-hover'}`}
                        aria-pressed={chosen}
                        aria-label={chosen ? 'Gewählt, zum Entfernen tippen' : 'Frage hinzufügen'}
                        onClick={() => (chosen ? onRemove(h.id) : onAdd(hitToCandidate(h)))}
                      >
                        {chosen ? <Check className="mr-1 size-4" aria-hidden /> : <Plus className="mr-1 size-4" aria-hidden />}
                        {chosen ? 'Gewählt' : 'Hinzufügen'}
                      </Button>
                    </li>
                  )
                })}
              </ul>
              {nextOffset !== null && (
                <Button
                  type="button"
                  variant="outline"
                  className="mt-3 min-h-11 w-full rounded-xl border-ws-line"
                  onClick={() => void run(nextOffset)}
                  disabled={loading}
                >
                  {loading && <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />}
                  Weitere {Math.min(SEARCH_PAGE_SIZE, remaining)} anzeigen (noch {remaining})
                </Button>
              )}
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
