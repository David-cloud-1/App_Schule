'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { CheckCircle2, Eye, Flag, Loader2, UserCheck } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AdminTabs, AdminTabsList, AdminTabsTrigger } from '@/components/admin/admin-tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
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
import { QuestionReportReviewDialog } from '@/components/admin/question-report-review-dialog'
import {
  REPORT_REASONS,
  REPORT_REASON_LABEL,
  REPORT_REASON_SHORT,
  REPORT_RESPONSE_TEMPLATES,
  type ReportReason,
  type ReportStatus,
} from '@/lib/question-reports'

type TabValue = 'offen' | 'korrigiert' | 'nicht_uebernommen' | 'entfaellt'

interface Group {
  question_id: string | null
  status: ReportStatus
  question_text: string
  department_id: string | null
  report_count: number
  reasons: ReportReason[]
  oldest_at: string
  newest_at: string
  handled_by_name: string | null
  claimed_at: string | null
  claimed_by_me: boolean
  changed_since_report: boolean
  in_trash?: boolean
}

interface ListResponse {
  items: Group[]
  total: number
  page: number
  pageSize: number
}

const CLAIM_HINT_HOURS = 24

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

/** Einschränkung auf das im Baum gewählte Fach bzw. Thema (PROJ-131) */
export type ListRestriction = {
  subjectId: string
  /** Thema-ID oder `ohne`; fehlt = das ganze Fach */
  topicId?: string
  /** z. B. „LOP › Lagerlogistik“ */
  label: string
}

/**
 * Inbox der gemeldeten Fragen (PROJ-73): gebündelt je Frage, mit Übernehmen,
 * Abschließen und Sammel-Schließen. Belohnung und Rückmeldung an die Melder
 * löst die Datenbank beim Abschließen aus. Seit PROJ-131 Reiter „Gemeldet“
 * auf „Lerninhalte“; Fach und Thema wählt der Baum.
 */
export function QuestionReportsInbox({
  restriction = null,
  onShowAll,
  onChanged,
}: {
  restriction?: ListRestriction | null
  onShowAll?: () => void
  /** Nach dem Abschließen oder Wiederherstellen: Zahlen an den Reitern neu laden */
  onChanged?: () => void
} = {}) {
  const [tab, setTab] = useState<TabValue>('offen')
  const [reason, setReason] = useState<'alle' | ReportReason>('alle')
  const subject = restriction?.subjectId
  const topic = restriction?.topicId
  const [page, setPage] = useState(1)
  const [data, setData] = useState<ListResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)

  const [selected, setSelected] = useState<Set<string>>(new Set())

  const [review, setReview] = useState<{ queue: string[]; index: number } | null>(null)
  const [bulkOpen, setBulkOpen] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setFailed(false)
    try {
      const params = new URLSearchParams({ status: tab, page: String(page) })
      if (reason !== 'alle') params.set('reason', reason)
      if (subject) params.set('subject', subject)
      if (topic) params.set('topic', topic)
      const res = await fetch(`/api/admin/question-reports?${params}`, { cache: 'no-store' })
      if (!res.ok) throw new Error('load')
      setData((await res.json()) as ListResponse)
    } catch {
      setFailed(true)
    } finally {
      setLoading(false)
    }
  }, [tab, reason, subject, topic, page])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    setSelected(new Set())
  }, [tab, reason, subject, topic, page])

  // Neue Auswahl im Baum: wieder auf Seite 1
  useEffect(() => {
    setPage(1)
  }, [subject, topic])

  /** Prüf-Dialog öffnen (PROJ-82). Im Reiter „Offen“ als Durchlauf über alle offenen Zeilen der Seite. */
  function openReview(g: Group) {
    if (!g.question_id) return
    if (!isOpenTab) {
      setReview({ queue: [g.question_id], index: 0 })
      return
    }
    const queue = items
      .filter((x) => x.question_id && (x.status === 'offen' || x.status === 'in_pruefung'))
      .map((x) => x.question_id as string)
    setReview({ queue, index: Math.max(0, queue.indexOf(g.question_id)) })
  }

  async function restore(questionId: string) {
    try {
      const res = await fetch(`/api/admin/trash/question/${questionId}`, { method: 'POST' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(data?.error ?? 'Wiederherstellen fehlgeschlagen.')
        return
      }
      toast.success('Frage wiederhergestellt.')
      onChanged?.()
      void load()
    } catch {
      toast.error('Netzwerkfehler')
    }
  }

  async function onReviewClosed() {
    const next = review ? review.index + 1 : 0
    await load()
    onChanged?.()
    setReview((r) => (r && next < r.queue.length ? { queue: r.queue, index: next } : null))
  }

  const items = useMemo(() => data?.items ?? [], [data])
  const rowKey = (g: Group) => `${g.question_id ?? 'weg'}:${g.status}`
  const selectable = useMemo(() => items.filter((g) => g.question_id && g.status !== 'korrigiert'), [items])
  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1
  const isOpenTab = tab === 'offen'
  const filtersActive = reason !== 'alle' || !!restriction

  function claimedByOther(g: Group): boolean {
    if (!g.claimed_at || g.claimed_by_me || g.status !== 'in_pruefung') return false
    return Date.now() - new Date(g.claimed_at).getTime() < CLAIM_HINT_HOURS * 3_600_000
  }

  const reviewGroup = review ? items.find((g) => g.question_id === review.queue[review.index]) : undefined
  const reviewClaimedBy =
    reviewGroup && claimedByOther(reviewGroup)
      ? (reviewGroup.handled_by_name ?? 'einer Kollegin oder einem Kollegen')
      : null

  return (
    <div className="space-y-4">
      {restriction && (
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-sm text-ws-text">
            Nur Meldungen zu <span className="font-semibold">{restriction.label}</span>
          </p>
          <Button
            variant="outline"
            onClick={onShowAll}
            className="min-h-11 rounded-xl border-ws-line bg-transparent text-ws-text hover:bg-ws-raised hover:text-ws-text"
          >
            Alle Meldungen zeigen
          </Button>
        </div>
      )}
      <div className="flex flex-col gap-3">
        <AdminTabs
          value={tab}
          onValueChange={(v) => {
            setTab(v as TabValue)
            setPage(1)
          }}
        >
          <AdminTabsList>
            <AdminTabsTrigger value="offen">Zu prüfen</AdminTabsTrigger>
            <AdminTabsTrigger value="korrigiert">Korrigiert</AdminTabsTrigger>
            <AdminTabsTrigger value="nicht_uebernommen">Nicht übernommen</AdminTabsTrigger>
            <AdminTabsTrigger value="entfaellt">Frage entfällt</AdminTabsTrigger>
          </AdminTabsList>
        </AdminTabs>

        <div className="flex flex-wrap gap-2">
          <Select
            value={reason}
            onValueChange={(v) => {
              setReason(v as 'alle' | ReportReason)
              setPage(1)
            }}
          >
            <SelectTrigger className="min-h-11 w-full sm:w-56" aria-label="Grund filtern">
              <SelectValue placeholder="Grund" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="alle">Alle Gründe</SelectItem>
              {REPORT_REASONS.map((r) => (
                <SelectItem key={r} value={r}>
                  {REPORT_REASON_LABEL[r]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {isOpenTab && selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-ws-line bg-ws-surface px-4 py-3">
          <span className="text-sm text-ws-text">{selected.size} ausgewählt</span>
          <Button
            variant="outline"
            onClick={() => setBulkOpen(true)}
            className="min-h-11 rounded-xl border-ws-line bg-transparent text-ws-text hover:bg-ws-raised hover:text-ws-text"
          >
            Als „Nicht übernommen“ schließen
          </Button>
        </div>
      )}

      {loading && !data ? (
        <AdminLoadingState variant="table" rows={5} />
      ) : failed ? (
        <AdminErrorState onRetry={() => void load()} />
      ) : items.length === 0 ? (
        <AdminEmptyState
          icon={isOpenTab ? CheckCircle2 : Flag}
          title={filtersActive ? 'Keine passenden Meldungen' : isOpenTab ? 'Alles erledigt' : 'Hier ist nichts'}
          description={
            filtersActive
              ? 'Zu dieser Auswahl gibt es keine Meldungen. Zeige alle Meldungen oder nimm den Filter heraus.'
              : isOpenTab
                ? 'Keine offenen Meldungen. Azubis melden Fragen direkt nach dem Beantworten.'
                : 'In dieser Ansicht gibt es keine Einträge.'
          }
        />
      ) : (
        <div className="ws-table-scroll rounded-2xl border border-ws-line bg-ws-surface">
          <Table>
            <TableHeader>
              <TableRow className="border-ws-line hover:bg-transparent">
                {isOpenTab && (
                  <TableHead className="w-12">
                    <Checkbox
                      aria-label="Alle auswählen"
                      checked={selectable.length > 0 && selected.size === selectable.length}
                      onCheckedChange={(checked) =>
                        setSelected(checked ? new Set(selectable.map((g) => g.question_id as string)) : new Set())
                      }
                    />
                  </TableHead>
                )}
                <TableHead className="text-ws-muted">Gemeldete Frage</TableHead>
                <TableHead className="w-px text-right text-ws-muted">
                  <span className="sr-only">Aktion</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((g) => {
                const id = g.question_id
                const other = claimedByOther(g)
                return (
                  <TableRow key={rowKey(g)} className="border-ws-line">
                    {isOpenTab && (
                      <TableCell className="align-top">
                        {id && (
                          <Checkbox
                            aria-label="Zeile auswählen"
                            checked={selected.has(id)}
                            onCheckedChange={(checked) =>
                              setSelected((prev) => {
                                const next = new Set(prev)
                                if (checked) next.add(id)
                                else next.delete(id)
                                return next
                              })
                            }
                          />
                        )}
                      </TableCell>
                    )}
                    <TableCell className="max-w-xl whitespace-normal">
                      {g.in_trash && id && (
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <Badge className="border-ws-orange/30 bg-ws-orange/15 text-ws-orange">Frage liegt im Papierkorb</Badge>
                          <Button
                            variant="outline"
                            onClick={() => void restore(id)}
                            className="min-h-11 rounded-xl border-ws-line bg-transparent text-ws-text hover:bg-ws-raised hover:text-ws-text"
                          >
                            Wiederherstellen
                          </Button>
                        </div>
                      )}
                      <p className="line-clamp-2 text-sm font-medium text-ws-text" title={g.question_text}>
                        {g.question_text}
                      </p>
                      {/* Eine ruhige Zeile: Grund, Anzahl, Datum, Bearbeiter */}
                      <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ws-muted">
                        {g.reasons.map((r) => (
                          <Badge key={r} variant="outline" className="border-ws-line text-ws-muted">
                            {REPORT_REASON_SHORT[r]}
                          </Badge>
                        ))}
                        <span>
                          {g.report_count === 1 ? '1 Meldung' : `${g.report_count} Meldungen`} · seit{' '}
                          {formatDate(g.oldest_at)}
                        </span>
                        {other && (
                          <Badge className="border-ws-blue/30 bg-ws-blue/15 text-ws-blue">
                            <UserCheck className="mr-1 size-3" />
                            {g.handled_by_name ?? 'Jemand'} prüft gerade
                          </Badge>
                        )}
                        {g.changed_since_report && g.status !== 'korrigiert' && (
                          <Badge className="border-ws-orange/30 bg-ws-orange/15 text-ws-orange">
                            Seit der Meldung geändert
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right align-top">
                      {id && isOpenTab && (
                        <Button
                          onClick={() => openReview(g)}
                          className="min-h-11 rounded-xl bg-ws-green text-ws-on-accent hover:bg-ws-green-hover"
                        >
                          Prüfen
                        </Button>
                      )}
                      {id && !isOpenTab && (
                        <Button
                          variant="outline"
                          onClick={() => openReview(g)}
                          className="min-h-11 rounded-xl border-ws-line bg-transparent text-ws-text hover:bg-ws-raised hover:text-ws-text"
                        >
                          <Eye className="mr-1.5 size-4" />
                          Ansehen
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {data && totalPages > 1 && (
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            disabled={page <= 1 || loading}
            onClick={() => setPage((p) => p - 1)}
            className="min-h-11 rounded-xl border-ws-line bg-transparent text-ws-text hover:bg-ws-raised hover:text-ws-text"
          >
            Zurück
          </Button>
          <span className="text-sm text-ws-muted">
            Seite {page} von {totalPages}
          </span>
          <Button
            variant="outline"
            disabled={page >= totalPages || loading}
            onClick={() => setPage((p) => p + 1)}
            className="min-h-11 rounded-xl border-ws-line bg-transparent text-ws-text hover:bg-ws-raised hover:text-ws-text"
          >
            Weiter
          </Button>
        </div>
      )}

      <QuestionReportReviewDialog
        questionId={review ? review.queue[review.index] : null}
        position={review ? { index: review.index, total: review.queue.length } : null}
        readOnly={!isOpenTab}
        claimedByOther={reviewClaimedBy}
        onClosed={() => void onReviewClosed()}
        onExit={() => {
          setReview(null)
          void load()
        }}
      />
      <BulkCloseDialog
        open={bulkOpen}
        questionIds={[...selected]}
        onClose={() => setBulkOpen(false)}
        onDone={() => {
          setBulkOpen(false)
          setSelected(new Set())
          onChanged?.()
          void load()
        }}
      />
    </div>
  )
}

function BulkCloseDialog({
  open,
  questionIds,
  onClose,
  onDone,
}: {
  open: boolean
  questionIds: string[]
  onClose: () => void
  onDone: () => void
}) {
  const [sending, setSending] = useState(false)

  async function submit() {
    setSending(true)
    try {
      const res = await fetch('/api/admin/question-reports/bulk-close', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question_ids: questionIds, response: REPORT_RESPONSE_TEMPLATES[2] }),
      })
      const body = (await res.json().catch(() => null)) as { error?: string; closed?: number } | null
      if (!res.ok) {
        toast.error(body?.error ?? 'Das hat nicht geklappt. Bitte versuche es erneut.')
        return
      }
      toast.success(`${body?.closed ?? 0} Meldungen als „Nicht übernommen“ geschlossen.`)
      onDone()
    } catch {
      toast.error('Keine Verbindung. Bitte versuche es erneut.')
    } finally {
      setSending(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={(o) => !o && !sending && onClose()}>
      <AlertDialogContent className="border-ws-line bg-ws-surface text-ws-text">
        <AlertDialogHeader>
          <AlertDialogTitle>{questionIds.length} Fragen als „Nicht übernommen“ schließen?</AlertDialogTitle>
          <AlertDialogDescription className="text-ws-muted">
            Die Melder erhalten die Rückmeldung „{REPORT_RESPONSE_TEMPLATES[2]}“ und keine Belohnung. Das lässt sich nicht
            zurücknehmen.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={sending} className="min-h-11 rounded-xl">
            Abbrechen
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault()
              void submit()
            }}
            disabled={sending}
            className="min-h-11 rounded-xl bg-ws-red text-ws-on-accent hover:bg-ws-red-hover"
          >
            {sending && <Loader2 className="mr-2 size-4 animate-spin" />}
            Schließen
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
