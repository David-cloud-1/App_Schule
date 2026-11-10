'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Ban, CheckCircle2, Loader2, RotateCcw, ShieldAlert } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { AdminEmptyState, AdminErrorState, AdminLoadingState } from '@/components/admin/admin-states'
import { ANALYSIS_REASON_HINT, type AnalysisLight, type ItemAnalysis } from '@/lib/assessment-analysis'
import { cn } from '@/lib/utils'

type Item = ItemAnalysis & { blocked: boolean; deleted?: boolean }

interface AnalysisResponse {
  participants: number
  discriminationAvailable: boolean
  items: Item[]
  status: 'draft' | 'open' | 'closed'
  released: boolean
}

type SortKey = 'light' | 'rate' | 'discrimination' | 'position'

const LIGHT_ORDER: Record<AnalysisLight, number> = { red: 0, yellow: 1, green: 2, none: 3 }

const LIGHT_LABEL: Record<AnalysisLight, string> = {
  red: 'Prüfen',
  yellow: 'Auffällig',
  green: 'Unauffällig',
  none: 'Keine Daten',
}

const LIGHT_STYLE: Record<AnalysisLight, string> = {
  red: 'border-ws-red/30 bg-ws-red/15 text-ws-red',
  yellow: 'border-ws-orange/30 bg-ws-orange/15 text-ws-orange',
  green: 'border-ws-green/30 bg-ws-green/15 text-ws-green',
  none: 'border-ws-line bg-ws-raised text-ws-muted',
}

type Pending =
  | { kind: 'exclude'; item: Item }
  | { kind: 'include'; item: Item }
  | { kind: 'block'; item: Item }
  | { kind: 'unblock'; item: Item }

/**
 * Aufgabenanalyse im Nachweis (PROJ-75): Ampel, Trennschärfe und
 * Antwortverteilung je Frage, dazu „aus der Wertung nehmen“ (nur bis zur
 * Freigabe) und „für Nachweise sperren“.
 */
export function AssessmentItemAnalysis({
  assessmentId,
  onChanged,
}: {
  assessmentId: string
  /** Wird nach einer Änderung der Wertung aufgerufen, damit Noten neu geladen werden */
  onChanged?: () => void
}) {
  const [data, setData] = useState<AnalysisResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const [onlyConspicuous, setOnlyConspicuous] = useState(false)
  const [sort, setSort] = useState<SortKey>('light')
  const [pending, setPending] = useState<Pending | null>(null)
  const [working, setWorking] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setFailed(false)
    try {
      const res = await fetch(`/api/admin/assessments/${assessmentId}/analysis`, { cache: 'no-store' })
      if (!res.ok) throw new Error('load')
      setData((await res.json()) as AnalysisResponse)
    } catch {
      setFailed(true)
    } finally {
      setLoading(false)
    }
  }, [assessmentId])

  useEffect(() => {
    void load()
  }, [load])

  const items = useMemo(() => {
    const list = (data?.items ?? []).filter((i) => !onlyConspicuous || i.light === 'red' || i.light === 'yellow')
    return [...list].sort((a, b) => {
      if (sort === 'position') return a.position - b.position
      if (sort === 'rate') return (a.correctRate ?? 101) - (b.correctRate ?? 101)
      if (sort === 'discrimination') return (a.discrimination ?? 2) - (b.discrimination ?? 2)
      return LIGHT_ORDER[a.light] - LIGHT_ORDER[b.light] || a.position - b.position
    })
  }, [data, onlyConspicuous, sort])

  async function confirm() {
    if (!pending) return
    setWorking(true)
    try {
      const { kind, item } = pending
      const res =
        kind === 'exclude' || kind === 'include'
          ? await fetch(`/api/admin/assessments/${assessmentId}/exclude-question`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ question_id: item.id, excluded: kind === 'exclude' }),
            })
          : await fetch(`/api/admin/questions/${item.id}/assessment-block`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ blocked: kind === 'block' }),
            })
      const body = (await res.json().catch(() => null)) as { error?: string } | null
      if (!res.ok) {
        toast.error(body?.error ?? 'Das hat nicht geklappt. Bitte versuche es erneut.')
        return
      }
      toast.success(
        kind === 'exclude'
          ? 'Frage aus der Wertung genommen. Noten wurden neu berechnet.'
          : kind === 'include'
            ? 'Frage wieder in der Wertung. Noten wurden neu berechnet.'
            : kind === 'block'
              ? 'Frage für künftige Nachweise gesperrt.'
              : 'Sperre aufgehoben.',
      )
      setPending(null)
      await load()
      if (kind === 'exclude' || kind === 'include') onChanged?.()
    } catch {
      toast.error('Keine Verbindung. Bitte versuche es erneut.')
    } finally {
      setWorking(false)
    }
  }

  if (loading && !data) return <AdminLoadingState variant="cards" rows={3} />
  if (failed) return <AdminErrorState onRetry={() => void load()} />
  if (!data || data.items.length === 0) {
    return (
      <AdminEmptyState
        icon={CheckCircle2}
        title="Noch keine Abgaben zur Auswertung"
        description="Sobald Teilnehmer abgegeben haben, erscheint hier die Aufgabenanalyse."
      />
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-1">
          <p className="text-sm text-ws-text">
            {data.participants} gewertete {data.participants === 1 ? 'Abgabe' : 'Abgaben'}
            {data.status === 'open' && (
              <Badge className="ml-2 border-ws-orange/30 bg-ws-orange/15 text-ws-orange">Zwischenstand</Badge>
            )}
          </p>
          {!data.discriminationAvailable && (
            <p className="max-w-prose text-xs text-ws-muted">
              Die Trennschärfe wird erst ab 8 gewerteten Abgaben berechnet. Lösungsquote und Antwortverteilung gelten
              schon jetzt.
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex min-h-11 items-center gap-2">
            <Switch id="only-conspicuous" checked={onlyConspicuous} onCheckedChange={setOnlyConspicuous} />
            <Label htmlFor="only-conspicuous" className="text-sm">
              Nur auffällige
            </Label>
          </div>
          <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
            <SelectTrigger className="min-h-11 w-52" aria-label="Sortierung">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="light">Nach Ampel</SelectItem>
              <SelectItem value="rate">Nach Lösungsquote</SelectItem>
              <SelectItem value="discrimination">Nach Trennschärfe</SelectItem>
              <SelectItem value="position">Nach Position</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {items.length === 0 ? (
        <AdminEmptyState icon={CheckCircle2} title="Nichts Auffälliges" description="Alle Fragen sind unauffällig." />
      ) : (
        <ul className="space-y-3">
          {items.map((q) => (
            <li
              key={q.id}
              className={cn('rounded-2xl border border-ws-line bg-ws-surface p-4', q.excluded && 'opacity-80')}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <p className="min-w-0 flex-1 text-sm leading-snug text-ws-text">
                  <span className="mr-2 text-ws-faint">{q.position}.</span>
                  <span title={q.text}>{q.text}</span>
                </p>
                <div className="flex flex-wrap items-center gap-1.5">
                  {q.excluded && (
                    <Badge variant="outline" className="border-ws-line text-ws-muted">
                      Nicht gewertet
                    </Badge>
                  )}
                  {q.blocked && (
                    <Badge variant="outline" className="border-ws-line text-ws-muted">
                      Für Nachweise gesperrt
                    </Badge>
                  )}
                  <Badge className={LIGHT_STYLE[q.light]}>{LIGHT_LABEL[q.light]}</Badge>
                </div>
              </div>

              <dl className="mt-3 grid grid-cols-3 gap-3 text-sm sm:max-w-md">
                <div>
                  <dt className="text-xs text-ws-muted">Lösungsquote</dt>
                  <dd className="font-semibold tabular-nums text-ws-text">
                    {q.correctRate !== null ? `${q.correctRate} %` : '–'}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-ws-muted">Trennschärfe</dt>
                  <dd className="font-semibold tabular-nums text-ws-text">
                    {q.correctRate === 100
                      ? 'alle richtig'
                      : q.discrimination !== null
                        ? q.discrimination.toFixed(2).replace('.', ',')
                        : '–'}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-ws-muted">Nicht beantwortet</dt>
                  <dd className="font-semibold tabular-nums text-ws-text">{q.unanswered}</dd>
                </div>
              </dl>

              {q.reasons.length > 0 && (
                <ul className="mt-3 space-y-1 text-sm text-ws-muted">
                  {q.reasons.map((r) => (
                    <li key={r}>{ANALYSIS_REASON_HINT[r]}</li>
                  ))}
                </ul>
              )}

              <ul className="mt-3 space-y-1.5">
                {q.options.map((o) => (
                  <li key={o.id} className="text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={cn(
                          'min-w-0 flex-1 truncate',
                          o.isCorrect ? 'font-medium text-ws-green' : 'text-ws-muted',
                        )}
                        title={o.text}
                      >
                        {o.isCorrect ? '✓ ' : ''}
                        {o.text}
                      </span>
                      <span className="tabular-nums text-ws-faint">
                        {o.selectedCount}× · {o.percent} %
                      </span>
                    </div>
                    <div className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-ws-raised" aria-hidden>
                      <div
                        className={cn('h-full rounded-full', o.isCorrect ? 'bg-ws-green' : 'bg-ws-muted/60')}
                        style={{ width: `${o.percent}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>

              <div className="mt-4 flex flex-wrap gap-2">
                {q.excluded ? (
                  <Button
                    variant="outline"
                    disabled={data.released}
                    onClick={() => setPending({ kind: 'include', item: q })}
                    className="min-h-11 rounded-xl border-ws-line bg-transparent text-ws-text hover:bg-ws-raised hover:text-ws-text"
                  >
                    <RotateCcw className="mr-1.5 size-4" />
                    Wieder in die Wertung
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    disabled={data.released}
                    title={data.released ? 'Die Ergebnisse sind schon freigegeben.' : undefined}
                    onClick={() => setPending({ kind: 'exclude', item: q })}
                    className="min-h-11 rounded-xl border-ws-line bg-transparent text-ws-text hover:bg-ws-raised hover:text-ws-text"
                  >
                    <Ban className="mr-1.5 size-4" />
                    Aus der Wertung nehmen
                  </Button>
                )}
                {!q.deleted && (
                  <Button
                    variant="outline"
                    onClick={() => setPending({ kind: q.blocked ? 'unblock' : 'block', item: q })}
                    className="min-h-11 rounded-xl border-ws-line bg-transparent text-ws-text hover:bg-ws-raised hover:text-ws-text"
                  >
                    <ShieldAlert className="mr-1.5 size-4" />
                    {q.blocked ? 'Sperre aufheben' : 'Für Nachweise sperren'}
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <AlertDialog open={!!pending} onOpenChange={(open) => !open && !working && setPending(null)}>
        <AlertDialogContent className="border-ws-line bg-ws-surface text-ws-text">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pending?.kind === 'exclude' && 'Frage aus der Wertung nehmen?'}
              {pending?.kind === 'include' && 'Frage wieder werten?'}
              {pending?.kind === 'block' && 'Frage für Nachweise sperren?'}
              {pending?.kind === 'unblock' && 'Sperre aufheben?'}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-ws-muted">
              {pending?.kind === 'exclude' &&
                'Die Frage zählt für alle Teilnehmer dieses Nachweises weder bei den Punkten noch beim Maximum. Prozent und Noten werden neu berechnet, die Antworten bleiben erhalten. Du kannst das bis zur Freigabe der Ergebnisse rückgängig machen.'}
              {pending?.kind === 'include' &&
                'Die Frage zählt wieder für alle Teilnehmer. Prozent und Noten werden neu berechnet.'}
              {pending?.kind === 'block' &&
                'Die Frage bleibt zum Üben erhalten, soll aber in künftigen Nachweisen nicht mehr vorgeschlagen werden. Laufende und frühere Nachweise ändern sich nicht.'}
              {pending?.kind === 'unblock' && 'Die Frage darf wieder in Nachweisen verwendet werden.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={working} className="min-h-11 rounded-xl">
              Abbrechen
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                void confirm()
              }}
              disabled={working}
              className="min-h-11 rounded-xl bg-ws-green text-ws-on-accent hover:bg-ws-green-hover"
            >
              {working && <Loader2 className="mr-2 size-4 animate-spin" />}
              Bestätigen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
