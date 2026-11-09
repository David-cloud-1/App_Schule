'use client'

import { Fragment, useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { CheckCircle2, ChevronDown, ChevronRight, ExternalLink, Flag, Loader2, UserCheck } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AdminEmptyState, AdminErrorState, AdminLoadingState } from '@/components/admin/admin-states'
import { useOptionalAdminRole } from '@/components/admin/admin-role-provider'
import { questionSearchLink } from '@/lib/difficulty'
import {
  REPORT_REASONS,
  REPORT_REASON_LABEL,
  REPORT_REASON_SHORT,
  REPORT_RESPONSE_MAX,
  REPORT_RESPONSE_TEMPLATES,
  REPORT_REWARD_COINS,
  REPORT_STATUS_LABEL,
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
}

interface Detail {
  id: string
  reason: ReportReason
  note: string | null
  chosen_option_text: string | null
  status: ReportStatus
  created_at: string
  response_text: string | null
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

/**
 * Inbox der gemeldeten Fragen (PROJ-73): gebündelt je Frage, mit Übernehmen,
 * Abschließen und Sammel-Schließen. Belohnung und Rückmeldung an die Melder
 * löst die Datenbank beim Abschließen aus.
 */
export function QuestionReportsInbox() {
  const role = useOptionalAdminRole()
  const departments = role?.scope?.departments ?? []

  const [tab, setTab] = useState<TabValue>('offen')
  const [reason, setReason] = useState<'alle' | ReportReason>('alle')
  const [department, setDepartment] = useState<string>('alle')
  const [page, setPage] = useState(1)
  const [data, setData] = useState<ListResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)

  const [expanded, setExpanded] = useState<string | null>(null)
  const [details, setDetails] = useState<Record<string, Detail[] | 'error' | 'loading'>>({})
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const [closing, setClosing] = useState<Group | null>(null)
  const [bulkOpen, setBulkOpen] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setFailed(false)
    try {
      const params = new URLSearchParams({ status: tab, page: String(page) })
      if (reason !== 'alle') params.set('reason', reason)
      if (department !== 'alle') params.set('department', department)
      const res = await fetch(`/api/admin/question-reports?${params}`, { cache: 'no-store' })
      if (!res.ok) throw new Error('load')
      setData((await res.json()) as ListResponse)
    } catch {
      setFailed(true)
    } finally {
      setLoading(false)
    }
  }, [tab, reason, department, page])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    setSelected(new Set())
    setExpanded(null)
  }, [tab, reason, department, page])

  async function loadDetails(questionId: string) {
    setDetails((d) => ({ ...d, [questionId]: 'loading' }))
    try {
      const res = await fetch(`/api/admin/question-reports/${questionId}`, { cache: 'no-store' })
      if (!res.ok) throw new Error('details')
      const body = (await res.json()) as { items: Detail[] }
      setDetails((d) => ({ ...d, [questionId]: body.items }))
    } catch {
      setDetails((d) => ({ ...d, [questionId]: 'error' }))
    }
  }

  function toggleExpand(g: Group) {
    if (!g.question_id) return
    const id = g.question_id
    if (expanded === id) {
      setExpanded(null)
      return
    }
    setExpanded(id)
    if (!details[id] || details[id] === 'error') void loadDetails(id)
  }

  async function claim(g: Group) {
    if (!g.question_id) return
    const res = await fetch(`/api/admin/question-reports/${g.question_id}/claim`, { method: 'POST' })
    if (!res.ok) {
      toast.error('Das hat nicht geklappt. Bitte versuche es erneut.')
      return
    }
    void load()
  }

  const items = useMemo(() => data?.items ?? [], [data])
  const rowKey = (g: Group) => `${g.question_id ?? 'weg'}:${g.status}`
  const selectable = useMemo(() => items.filter((g) => g.question_id && g.status !== 'korrigiert'), [items])
  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1
  const isOpenTab = tab === 'offen'

  function claimedByOther(g: Group): boolean {
    if (!g.claimed_at || g.claimed_by_me || g.status !== 'in_pruefung') return false
    return Date.now() - new Date(g.claimed_at).getTime() < CLAIM_HINT_HOURS * 3_600_000
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <Tabs
          value={tab}
          onValueChange={(v) => {
            setTab(v as TabValue)
            setPage(1)
          }}
        >
          <TabsList className="h-auto flex-wrap bg-ws-raised">
            <TabsTrigger value="offen" className="min-h-11">Offen</TabsTrigger>
            <TabsTrigger value="korrigiert" className="min-h-11">Korrigiert</TabsTrigger>
            <TabsTrigger value="nicht_uebernommen" className="min-h-11">Nicht übernommen</TabsTrigger>
            <TabsTrigger value="entfaellt" className="min-h-11">Frage entfällt</TabsTrigger>
          </TabsList>
        </Tabs>

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
          {departments.length > 1 && (
            <Select
              value={department}
              onValueChange={(v) => {
                setDepartment(v)
                setPage(1)
              }}
            >
              <SelectTrigger className="min-h-11 w-full sm:w-48" aria-label="Fachbereich filtern">
                <SelectValue placeholder="Fachbereich" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="alle">Alle Fachbereiche</SelectItem>
                {departments.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
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
          title={isOpenTab ? 'Alles erledigt' : 'Hier ist nichts'}
          description={
            isOpenTab
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
                <TableHead className="text-ws-muted">Frage</TableHead>
                <TableHead className="text-ws-muted">Meldungen</TableHead>
                <TableHead className="text-ws-muted">Gründe</TableHead>
                <TableHead className="text-ws-muted">Seit</TableHead>
                <TableHead className="text-ws-muted text-right">Aktionen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((g) => {
                const key = rowKey(g)
                const id = g.question_id
                const isOpen = id !== null && expanded === id
                const detail = id ? details[id] : undefined
                const other = claimedByOther(g)
                return (
                  <Fragment key={key}>
                    <TableRow className="border-ws-line">
                      {isOpenTab && (
                        <TableCell>
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
                      <TableCell className="max-w-md">
                        <button
                          type="button"
                          onClick={() => toggleExpand(g)}
                          disabled={!id}
                          aria-expanded={isOpen}
                          className="flex min-h-11 w-full items-start gap-2 text-left"
                        >
                          {isOpen ? (
                            <ChevronDown className="mt-0.5 size-4 shrink-0 text-ws-muted" />
                          ) : (
                            <ChevronRight className="mt-0.5 size-4 shrink-0 text-ws-muted" />
                          )}
                          <span className="line-clamp-2 text-sm font-medium text-ws-text" title={g.question_text}>
                            {g.question_text}
                          </span>
                        </button>
                        <div className="ml-6 flex flex-wrap gap-1.5">
                          {g.status === 'in_pruefung' && (
                            <Badge className="border-ws-blue/30 bg-ws-blue/15 text-ws-blue">
                              <UserCheck className="mr-1 size-3" />
                              {g.claimed_by_me ? 'Du prüfst' : `${g.handled_by_name ?? 'Jemand'} prüft`}
                            </Badge>
                          )}
                          {g.changed_since_report && g.status !== 'korrigiert' && (
                            <Badge className="border-ws-orange/30 bg-ws-orange/15 text-ws-orange">
                              Seit der Meldung geändert
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm tabular-nums text-ws-text">{g.report_count}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1.5">
                          {g.reasons.map((r) => (
                            <Badge key={r} variant="outline" className="border-ws-line text-ws-muted">
                              {REPORT_REASON_SHORT[r]}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm text-ws-muted">{formatDate(g.oldest_at)}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap justify-end gap-2">
                          {id && (
                            <Button
                              asChild
                              variant="outline"
                              className="min-h-11 rounded-xl border-ws-line bg-transparent text-ws-text hover:bg-ws-raised hover:text-ws-text"
                              onClick={() => g.status === 'offen' && void claim(g)}
                            >
                              <Link href={questionSearchLink(g.question_text)}>
                                <ExternalLink className="mr-1.5 size-4" />
                                Frage öffnen
                              </Link>
                            </Button>
                          )}
                          {isOpenTab && id && (
                            <Button
                              onClick={() => setClosing(g)}
                              className="min-h-11 rounded-xl bg-ws-green text-ws-on-accent hover:bg-ws-green-hover"
                            >
                              Abschließen
                            </Button>
                          )}
                        </div>
                        {other && (
                          <p className="mt-1 text-right text-xs text-ws-muted">
                            Wird gerade von {g.handled_by_name ?? 'einer Kollegin oder einem Kollegen'} geprüft.
                          </p>
                        )}
                      </TableCell>
                    </TableRow>

                    {isOpen && (
                      <TableRow className="border-ws-line bg-ws-bg/50">
                        <TableCell colSpan={isOpenTab ? 6 : 5}>
                          {detail === 'loading' || !detail ? (
                            <Loader2 className="size-5 animate-spin text-ws-muted" aria-label="Wird geladen" />
                          ) : detail === 'error' ? (
                            <AdminErrorState message="Die Einzelmeldungen konnten nicht geladen werden." onRetry={() => id && void loadDetails(id)} />
                          ) : (
                            <ul className="space-y-2">
                              {detail.map((d) => (
                                <li key={d.id} className="rounded-xl border border-ws-line bg-ws-surface p-3 text-sm">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <Badge variant="outline" className="border-ws-line text-ws-muted">
                                      {REPORT_REASON_LABEL[d.reason]}
                                    </Badge>
                                    <span className="text-xs text-ws-faint">
                                      {formatDate(d.created_at)} · {REPORT_STATUS_LABEL[d.status]}
                                    </span>
                                  </div>
                                  {d.note && <p className="mt-2 whitespace-pre-wrap text-ws-text">{d.note}</p>}
                                  {d.chosen_option_text && (
                                    <p className="mt-1 text-xs text-ws-muted">Gewählte Antwort: {d.chosen_option_text}</p>
                                  )}
                                  {d.response_text && (
                                    <p className="mt-1 text-xs text-ws-muted">Rückmeldung: {d.response_text}</p>
                                  )}
                                </li>
                              ))}
                            </ul>
                          )}
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
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

      <CloseDialog
        group={closing}
        onClose={() => setClosing(null)}
        onDone={() => {
          setClosing(null)
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
          void load()
        }}
      />
    </div>
  )
}

function CloseDialog({
  group,
  onClose,
  onDone,
}: {
  group: Group | null
  onClose: () => void
  onDone: () => void
}) {
  const [result, setResult] = useState<'korrigiert' | 'nicht_uebernommen'>('korrigiert')
  const [response, setResponse] = useState('')
  const [silent, setSilent] = useState(false)
  const [sending, setSending] = useState(false)

  useEffect(() => {
    if (group) {
      setResult(group.changed_since_report ? 'korrigiert' : 'nicht_uebernommen')
      setResponse('')
      setSilent(false)
    }
  }, [group])

  async function submit() {
    if (!group?.question_id) return
    setSending(true)
    try {
      const res = await fetch(`/api/admin/question-reports/${group.question_id}/close`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ result, response: response.trim() || undefined, silent }),
      })
      const body = (await res.json().catch(() => null)) as { error?: string; closed?: number; rewarded?: number } | null
      if (!res.ok) {
        toast.error(body?.error ?? 'Das hat nicht geklappt. Bitte versuche es erneut.')
        return
      }
      toast.success(
        body?.closed
          ? `${body.closed} Meldung${body.closed === 1 ? '' : 'en'} abgeschlossen${body.rewarded ? `, ${body.rewarded} belohnt` : ''}.`
          : 'Es gab nichts mehr abzuschließen.',
      )
      onDone()
    } catch {
      toast.error('Keine Verbindung. Bitte versuche es erneut.')
    } finally {
      setSending(false)
    }
  }

  return (
    <Dialog open={!!group} onOpenChange={(open) => !open && !sending && onClose()}>
      <DialogContent className="max-w-lg border-ws-line bg-ws-surface text-ws-text">
        <DialogHeader>
          <DialogTitle>Meldung abschließen</DialogTitle>
          <DialogDescription className="line-clamp-3 text-ws-muted" title={group?.question_text}>
            {group?.question_text}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Ergebnis">
            {(
              [
                ['korrigiert', 'Korrigiert', `Frage wurde geändert. Melder erhalten ${REPORT_REWARD_COINS} Frachtmünzen.`],
                ['nicht_uebernommen', 'Nicht übernommen', 'Frage bleibt, wie sie ist. Keine Belohnung.'],
              ] as const
            ).map(([value, label, hint]) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={result === value}
                onClick={() => setResult(value)}
                className={`min-h-11 rounded-xl border p-3 text-left transition-colors duration-200 ${
                  result === value ? 'border-ws-green bg-ws-green/15' : 'border-ws-line hover:bg-ws-raised'
                }`}
              >
                <span className="block text-sm font-semibold">{label}</span>
                <span className="block text-xs text-ws-muted">{hint}</span>
              </button>
            ))}
          </div>

          {group?.changed_since_report ? null : result === 'korrigiert' ? (
            <p className="rounded-xl border border-ws-orange/30 bg-ws-orange/15 p-3 text-sm text-ws-orange">
              Seit der Meldung wurde die Frage nicht geändert. Wähle „Korrigiert“ nur, wenn du sie angepasst hast.
            </p>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="report-response">Kurze Rückmeldung an die Melder (optional)</Label>
            <Textarea
              id="report-response"
              value={response}
              onChange={(e) => setResponse(e.target.value.slice(0, REPORT_RESPONSE_MAX))}
              rows={2}
              maxLength={REPORT_RESPONSE_MAX}
              className="border-ws-line bg-ws-bg text-ws-text"
            />
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap gap-1.5">
                {result === 'nicht_uebernommen' &&
                  REPORT_RESPONSE_TEMPLATES.map((t) => (
                    <Button
                      key={t}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setResponse(t)}
                      className="min-h-11 rounded-xl border-ws-line bg-transparent text-xs text-ws-text hover:bg-ws-raised hover:text-ws-text"
                    >
                      {t}
                    </Button>
                  ))}
              </div>
              <span className="text-xs text-ws-faint">
                {response.length} / {REPORT_RESPONSE_MAX}
              </span>
            </div>
          </div>

          <div className="flex min-h-11 items-center gap-3">
            <Switch id="report-silent" checked={silent} onCheckedChange={setSilent} />
            <Label htmlFor="report-silent" className="text-sm">
              Still schließen (keine Rückmeldung, keine Belohnung)
            </Label>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={sending}
            className="min-h-11 rounded-xl border-ws-line bg-transparent text-ws-text hover:bg-ws-raised hover:text-ws-text"
          >
            Abbrechen
          </Button>
          <Button
            onClick={submit}
            disabled={sending}
            className="min-h-11 rounded-xl bg-ws-green text-ws-on-accent hover:bg-ws-green-hover"
          >
            {sending && <Loader2 className="mr-2 size-4 animate-spin" />}
            Abschließen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
