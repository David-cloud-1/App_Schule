'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { AlertTriangle, CheckCircle2, ChevronDown, Loader2, UserCheck } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
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
import { AdminErrorState } from '@/components/admin/admin-states'
import {
  QuestionFormBody,
  type AdminQuestion,
  type AdminSubject,
  type QuestionFormHandle,
} from '@/components/admin/question-form-modal'
import {
  REPORT_REASON_LABEL,
  REPORT_RESPONSE_MAX,
  REPORT_RESPONSE_TEMPLATES,
  REPORT_REWARD_COINS,
  REPORT_STATUS_LABEL,
  type ReportReason,
  type ReportStatus,
} from '@/lib/question-reports'

interface ReportDetail {
  id: string
  reason: ReportReason
  note: string | null
  chosen_option_text: string | null
  status: ReportStatus
  created_at: string
  response_text: string | null
}

type Phase = 'loading' | 'ready' | 'error'
type CloseResult = 'korrigiert' | 'nicht_uebernommen' | 'entfaellt'
type Pending = null | { kind: 'discard'; run: () => void } | { kind: 'entfaellt' }

const OUTLINE =
  'min-h-11 rounded-xl border-ws-line bg-transparent text-ws-text hover:bg-ws-raised hover:text-ws-text'

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

interface Props {
  /** Frage, deren Meldungen geprüft werden; null = Dialog geschlossen */
  questionId: string | null
  /** Fortschritt im Durchlauf, z. B. 3 von 12 */
  position: { index: number; total: number } | null
  /** Reiter außerhalb von „Offen“: nur ansehen */
  readOnly: boolean
  /** Hinweis, wenn eine Kollegin oder ein Kollege die Meldung gerade prüft */
  claimedByOther: string | null
  /** Meldung wurde abgeschlossen: Inbox neu laden und zur nächsten springen */
  onClosed: () => void
  /** Dialog verlassen (Später, Escape, Schließen) */
  onExit: () => void
}

/**
 * Prüf-Dialog der Meldungs-Inbox (PROJ-82): Meldung, Frage, Bearbeiten und
 * Abschluss an einer Stelle. Speichern und Abschließen laufen in fester
 * Reihenfolge — wird nicht gespeichert, wird auch nie als „korrigiert“
 * geschlossen.
 */
export function QuestionReportReviewDialog({ questionId, position, readOnly, claimedByOther, onClosed, onExit }: Props) {
  const formRef = useRef<QuestionFormHandle>(null)
  const [phase, setPhase] = useState<Phase>('loading')
  const [reports, setReports] = useState<ReportDetail[]>([])
  const [question, setQuestion] = useState<AdminQuestion | null>(null)
  const [questionNote, setQuestionNote] = useState<string | null>(null)
  const [subjects, setSubjects] = useState<AdminSubject[]>([])
  const [reloadKey, setReloadKey] = useState(0)

  const [dirty, setDirty] = useState(false)
  const [response, setResponse] = useState('')
  const [silent, setSilent] = useState(false)
  const [busy, setBusy] = useState(false)
  /** Frage ist gespeichert, der Abschluss steht noch aus (Abschluss war fehlgeschlagen) */
  const [savedPending, setSavedPending] = useState(false)
  const [pending, setPending] = useState<Pending>(null)

  const open = questionId !== null
  const openReportIds = useMemo(
    () => reports.filter((r) => r.status === 'offen' || r.status === 'in_pruefung').map((r) => r.id),
    [reports],
  )

  // Fächer einmal laden (das Formular braucht sie)
  useEffect(() => {
    if (!open || subjects.length > 0) return
    let cancelled = false
    void (async () => {
      try {
        const res = await fetch('/api/admin/subjects')
        if (!res.ok) return
        const json = (await res.json()) as { subjects?: AdminSubject[] }
        if (!cancelled) {
          setSubjects(
            (json.subjects ?? []).map((s) => ({
              id: s.id,
              code: s.code,
              name: s.name,
              department_name: s.department_name ?? null,
            })),
          )
        }
      } catch {
        /* das Formular zeigt dann „Keine Fächer verfügbar“ */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [open, subjects.length])

  // Meldungen und Frage laden, Meldung übernehmen
  useEffect(() => {
    if (!questionId) return
    let cancelled = false
    setPhase('loading')
    setQuestion(null)
    setQuestionNote(null)
    setReports([])
    setDirty(false)
    setResponse('')
    setSilent(false)
    setSavedPending(false)
    void (async () => {
      try {
        const [detailsRes, reviewRes] = await Promise.all([
          fetch(`/api/admin/question-reports/${questionId}`, { cache: 'no-store' }),
          fetch(`/api/admin/question-reports/${questionId}/review`, { cache: 'no-store' }),
        ])
        if (!detailsRes.ok) throw new Error('details')
        const details = (await detailsRes.json()) as { items: ReportDetail[] }
        if (cancelled) return
        setReports(details.items)
        if (reviewRes.ok) {
          const body = (await reviewRes.json()) as { question: AdminQuestion }
          setQuestion(body.question)
        } else if (reviewRes.status === 404) {
          setQuestionNote('Diese Frage gibt es nicht mehr.')
        } else if (reviewRes.status === 403) {
          setQuestionNote('Du darfst diese Frage nicht bearbeiten.')
        } else {
          throw new Error('review')
        }
        setPhase('ready')
        if (!readOnly) void fetch(`/api/admin/question-reports/${questionId}/claim`, { method: 'POST' })
      } catch {
        if (!cancelled) setPhase('error')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [questionId, readOnly, reloadKey])

  const reload = useCallback(() => setReloadKey((k) => k + 1), [])

  const chosenTexts = useMemo(
    () => new Set(reports.map((r) => r.chosen_option_text).filter((t): t is string => !!t)),
    [reports],
  )

  const canEdit = !readOnly && question !== null
  const trimmed = response.trim()

  function requestExit() {
    if (busy) return
    if (dirty && !savedPending && !readOnly) {
      setPending({ kind: 'discard', run: onExit })
      return
    }
    onExit()
  }

  /** Abschluss-Aufruf; true bei Erfolg. Fehler werden hier gemeldet. */
  async function closeReports(result: CloseResult): Promise<boolean> {
    if (!questionId) return false
    try {
      const res = await fetch(`/api/admin/question-reports/${questionId}/close`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          result,
          response: trimmed || undefined,
          silent,
          report_ids: openReportIds.length > 0 ? openReportIds : undefined,
        }),
      })
      const body = (await res.json().catch(() => null)) as { error?: string; closed?: number; rewarded?: number } | null
      if (!res.ok) {
        toast.error(body?.error ?? 'Das hat nicht geklappt. Bitte versuche es erneut.')
        return false
      }
      if (!body?.closed) {
        toast.info('Diese Meldung war schon abgeschlossen.')
      } else {
        toast.success(
          `${body.closed} Meldung${body.closed === 1 ? '' : 'en'} abgeschlossen${body.rewarded ? `, ${body.rewarded} belohnt` : ''}.`,
        )
      }
      return true
    } catch {
      toast.error('Keine Verbindung. Bitte versuche es erneut.')
      return false
    }
  }

  async function saveAndClose() {
    if (busy || !canEdit) return
    setBusy(true)
    try {
      if (!savedPending) {
        const saved = await formRef.current?.save()
        if (saved !== 'ok') return // nichts wurde gespeichert: Meldung bleibt offen, Fehler ist bereits gemeldet
        setSavedPending(true)
      }
      if (await closeReports('korrigiert')) onClosed()
    } finally {
      setBusy(false)
    }
  }

  async function closeAsCorrect() {
    if (busy) return
    setBusy(true)
    try {
      if (await closeReports('nicht_uebernommen')) onClosed()
    } finally {
      setBusy(false)
    }
  }

  async function closeAsGone() {
    if (busy || !questionId) return
    setBusy(true)
    try {
      if (question) {
        const res = await fetch(`/api/admin/questions/${questionId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ is_active: false }),
        })
        if (!res.ok) {
          const body = (await res.json().catch(() => null)) as { error?: string } | null
          toast.error(body?.error ?? 'Die Frage konnte nicht deaktiviert werden.')
          return
        }
      }
      if (await closeReports('entfaellt')) onClosed()
    } finally {
      setBusy(false)
    }
  }

  function onCorrectClick() {
    if (dirty && !savedPending) setPending({ kind: 'discard', run: () => void closeAsCorrect() })
    else void closeAsCorrect()
  }

  const correctNeedsText = !silent && trimmed.length === 0

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => !o && requestExit()}>
        <DialogContent className="flex h-[92vh] w-[calc(100%-1rem)] max-w-6xl flex-col gap-0 border-ws-line bg-ws-surface p-0 text-ws-text sm:max-w-6xl">
          <DialogHeader className="border-b border-ws-line px-4 py-3 text-left sm:px-6">
            <div className="flex flex-wrap items-center gap-2 pr-8">
              <DialogTitle className="text-lg">{readOnly ? 'Meldung ansehen' : 'Meldung prüfen'}</DialogTitle>
              {position && position.total > 1 && !readOnly && (
                <Badge variant="outline" className="border-ws-line text-ws-muted">
                  {position.index + 1} von {position.total}
                </Badge>
              )}
              {!readOnly && !claimedByOther && (
                <Badge className="border-ws-blue/30 bg-ws-blue/15 text-ws-blue">
                  <UserCheck className="mr-1 size-3" />
                  Du prüfst
                </Badge>
              )}
            </div>
            <DialogDescription className="text-ws-muted">
              Lies die Meldung, ändere die Frage bei Bedarf und schließe alles hier ab.
            </DialogDescription>
            {claimedByOther && (
              <p className="rounded-xl border border-ws-orange/30 bg-ws-orange/15 px-3 py-2 text-sm text-ws-orange">
                Wird gerade von {claimedByOther} geprüft.
              </p>
            )}
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6">
            {phase === 'loading' && (
              <div className="flex h-40 items-center justify-center">
                <Loader2 className="size-6 animate-spin text-ws-muted" aria-label="Wird geladen" />
              </div>
            )}
            {phase === 'error' && (
              <AdminErrorState message="Die Meldung konnte nicht geladen werden." onRetry={reload} />
            )}
            {phase === 'ready' && (
              <div className="grid gap-6 lg:grid-cols-2">
                <div className="space-y-4">
                  <section aria-label="Meldungen" className="space-y-2">
                    <h3 className="text-sm font-semibold text-ws-muted">
                      Meldung{reports.length === 1 ? '' : 'en'} ({reports.length})
                    </h3>
                    <ul className="space-y-2">
                      {reports.map((d) => (
                        <li key={d.id} className="rounded-xl border border-ws-line bg-ws-bg p-3 text-sm">
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
                  </section>

                  {question && (
                    <details className="group rounded-xl border border-ws-line bg-ws-bg" open>
                      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between px-3 text-sm font-semibold text-ws-muted">
                        Frage mit Antworten
                        <ChevronDown className="size-4 transition-transform duration-200 group-open:rotate-180" />
                      </summary>
                      <div className="space-y-2 border-t border-ws-line p-3 text-sm">
                        <p className="font-medium text-ws-text">{question.question_text}</p>
                        <ul className="space-y-1.5">
                          {question.answer_options.map((o, i) => (
                            <li
                              key={o.id ?? i}
                              className={`flex items-start gap-2 rounded-lg border px-3 py-2 ${
                                o.is_correct ? 'border-ws-green/30 bg-ws-green/15 text-ws-green' : 'border-ws-line text-ws-text'
                              }`}
                            >
                              <span className="font-semibold">{String.fromCharCode(65 + i)}</span>
                              <span className="flex-1">{o.option_text}</span>
                              {o.is_correct && <CheckCircle2 className="size-4 shrink-0" aria-label="Richtig" />}
                              {chosenTexts.has(o.option_text) && (
                                <Badge variant="outline" className="border-ws-orange/30 text-ws-orange">
                                  Vom Melder gewählt
                                </Badge>
                              )}
                            </li>
                          ))}
                        </ul>
                        {question.explanation && (
                          <p className="rounded-lg bg-ws-surface p-3 text-xs text-ws-muted">
                            <span className="font-semibold">Erklärung: </span>
                            {question.explanation}
                          </p>
                        )}
                      </div>
                    </details>
                  )}
                  {questionNote && (
                    <p className="rounded-xl border border-ws-orange/30 bg-ws-orange/15 p-3 text-sm text-ws-orange">
                      {questionNote}
                    </p>
                  )}
                </div>

                <div>
                  {canEdit ? (
                    <QuestionFormBody
                      ref={formRef}
                      active
                      question={question}
                      subjects={subjects}
                      hideFooter
                      quietSuccess
                      onSaved={() => {}}
                      onConflict={reload}
                      onDirtyChange={setDirty}
                    />
                  ) : (
                    <p className="text-sm text-ws-muted">
                      {readOnly
                        ? 'In dieser Ansicht lässt sich nichts mehr ändern.'
                        : 'Die Frage kann hier nicht bearbeitet werden.'}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {!readOnly && phase === 'ready' && (
            <div className="space-y-3 border-t border-ws-line bg-ws-surface px-4 py-3 sm:px-6">
              {savedPending && (
                <div
                  role="alert"
                  className="flex items-start gap-2 rounded-xl border border-ws-orange/30 bg-ws-orange/15 p-3 text-sm text-ws-orange"
                >
                  <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                  Die Frage ist gespeichert, die Meldung ist aber noch offen. Schließe sie jetzt ab.
                </div>
              )}
              <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-end">
                <div className="space-y-2">
                  <Label htmlFor="review-response" className="text-xs text-ws-muted">
                    Kurze Rückmeldung an die Melder ({trimmed.length} / {REPORT_RESPONSE_MAX})
                  </Label>
                  <Textarea
                    id="review-response"
                    value={response}
                    onChange={(e) => setResponse(e.target.value.slice(0, REPORT_RESPONSE_MAX))}
                    rows={2}
                    maxLength={REPORT_RESPONSE_MAX}
                    disabled={silent}
                    className="border-ws-line bg-ws-bg text-ws-text"
                  />
                  <div className="flex flex-wrap items-center gap-2">
                    {REPORT_RESPONSE_TEMPLATES.map((t) => (
                      <Button
                        key={t}
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={silent}
                        onClick={() => setResponse(t)}
                        className={`${OUTLINE} text-xs`}
                      >
                        {t}
                      </Button>
                    ))}
                    <div className="flex min-h-11 items-center gap-2">
                      <Switch id="review-silent" checked={silent} onCheckedChange={setSilent} />
                      <Label htmlFor="review-silent" className="text-xs">
                        Still schließen (keine Rückmeldung, keine Belohnung)
                      </Label>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 lg:justify-end">
                  <Button type="button" variant="outline" onClick={requestExit} disabled={busy} className={OUTLINE}>
                    Später
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setPending({ kind: 'entfaellt' })}
                    disabled={busy}
                    className={OUTLINE}
                  >
                    Frage entfällt
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onCorrectClick}
                    disabled={busy || correctNeedsText}
                    title={correctNeedsText ? 'Bitte kurz begründen oder still schließen.' : undefined}
                    className={OUTLINE}
                  >
                    Frage ist korrekt
                  </Button>
                  {canEdit && (
                    <Button
                      type="button"
                      onClick={() => void saveAndClose()}
                      disabled={busy || (!dirty && !savedPending)}
                      title={!dirty && !savedPending ? 'Noch nichts geändert.' : undefined}
                      className="min-h-11 rounded-xl bg-ws-green text-ws-on-accent hover:bg-ws-green-hover"
                    >
                      {busy && <Loader2 className="mr-2 size-4 animate-spin" />}
                      {savedPending ? 'Abschließen wiederholen' : 'Speichern & als korrigiert abschließen'}
                    </Button>
                  )}
                </div>
              </div>
              {canEdit && !dirty && !savedPending && (
                <p className="text-xs text-ws-faint">
                  Noch nichts geändert. Ohne Änderung schließt du mit „Frage ist korrekt“.
                  {` Bei „Korrigiert“ erhalten die Melder ${REPORT_REWARD_COINS} Frachtmünzen.`}
                </p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={pending?.kind === 'discard'} onOpenChange={(o) => !o && setPending(null)}>
        <AlertDialogContent className="border-ws-line bg-ws-surface text-ws-text">
          <AlertDialogHeader>
            <AlertDialogTitle>Änderungen verwerfen?</AlertDialogTitle>
            <AlertDialogDescription className="text-ws-muted">
              Du hast die Frage geändert, aber nicht gespeichert. Diese Änderungen gehen verloren.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="min-h-11 rounded-xl">Weiter bearbeiten</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const p = pending
                setPending(null)
                if (p?.kind === 'discard') p.run()
              }}
              className="min-h-11 rounded-xl bg-ws-red text-ws-on-accent hover:bg-ws-red-hover"
            >
              Verwerfen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={pending?.kind === 'entfaellt'} onOpenChange={(o) => !o && setPending(null)}>
        <AlertDialogContent className="border-ws-line bg-ws-surface text-ws-text">
          <AlertDialogHeader>
            <AlertDialogTitle>Frage entfällt?</AlertDialogTitle>
            <AlertDialogDescription className="text-ws-muted">
              {question
                ? 'Die Frage wird deaktiviert und taucht bei Azubis nicht mehr auf. Du kannst sie später wieder aktivieren. Die Meldung wird ohne Belohnung geschlossen.'
                : 'Die Meldung wird ohne Belohnung geschlossen.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="min-h-11 rounded-xl">Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setPending(null)
                void closeAsGone()
              }}
              className="min-h-11 rounded-xl bg-ws-green text-ws-on-accent hover:bg-ws-green-hover"
            >
              Frage deaktivieren und schließen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
