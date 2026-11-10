'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { AlertTriangle, CheckCircle2, Flag, Loader2, MessageSquare, Pencil } from 'lucide-react'
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
  REPORT_DETAIL_LIMIT,
  REPORT_IDS_MAX,
  REPORT_REASON_LABEL,
  REPORT_RESPONSE_MAX,
  REPORT_RESPONSE_TEMPLATES,
  REPORT_REWARD_COINS,
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
  /** Schritt 1 ansehen, Schritt 2 korrigieren */
  const [mode, setMode] = useState<'view' | 'edit'>('view')
  const [responseOpen, setResponseOpen] = useState(false)

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
    setMode('view')
    setResponseOpen(false)
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
          // Nur die gesehenen Meldungen schließen; ist die Liste gekappt, alle offenen (QA PROJ-82 B10)
          report_ids:
            openReportIds.length > 0 && reports.length < REPORT_DETAIL_LIMIT && openReportIds.length <= REPORT_IDS_MAX
              ? openReportIds
              : undefined,
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

  /** Was der Azubi im „Heute“-Screen liest (Texte wie in my-question-reports) */
  const azubiPreview =
    mode === 'edit'
      ? `Danke, deine Meldung hat die Frage verbessert.${trimmed ? ` ${trimmed}` : ''}`
      : `Geprüft, keine Änderung.${trimmed ? ` ${trimmed}` : ''}`

  /** Schritt wechseln. Die Ergänzung passt nur zu einem Schritt (Textbausteine = „keine Änderung“) und wird geleert. */
  function switchMode(next: 'view' | 'edit') {
    setMode(next)
    setResponse('')
    setDirty(false)
  }

  function backToView() {
    if (dirty && !savedPending) {
      setPending({ kind: 'discard', run: () => switchMode('view') })
      return
    }
    switchMode('view')
  }

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => !o && requestExit()}>
        <DialogContent className="flex max-h-[92vh] w-[calc(100%-1rem)] max-w-3xl flex-col gap-0 border-ws-line bg-ws-surface p-0 text-ws-text sm:max-w-3xl">
          <DialogHeader className="border-b border-ws-line px-4 py-3 text-left sm:px-6">
            <div className="flex flex-wrap items-center gap-2 pr-8">
              <DialogTitle className="text-lg">
                {readOnly ? 'Meldung ansehen' : mode === 'edit' ? 'Frage korrigieren' : 'Meldung prüfen'}
              </DialogTitle>
              {position && position.total > 1 && !readOnly && (
                <Badge variant="outline" className="border-ws-line text-ws-muted">
                  {position.index + 1} von {position.total}
                </Badge>
              )}
            </div>
            <DialogDescription className="sr-only">
              Meldung lesen, Frage bei Bedarf korrigieren und die Meldung abschließen.
            </DialogDescription>
            {claimedByOther && (
              <p className="rounded-xl border border-ws-orange/30 bg-ws-orange/15 px-3 py-2 text-sm text-ws-orange">
                Wird gerade von {claimedByOther} geprüft.
              </p>
            )}
          </DialogHeader>

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:px-6">
            {phase === 'loading' && (
              <div className="flex h-40 items-center justify-center">
                <Loader2 className="size-6 animate-spin text-ws-muted" aria-label="Wird geladen" />
              </div>
            )}
            {phase === 'error' && (
              <AdminErrorState message="Die Meldung konnte nicht geladen werden." onRetry={reload} />
            )}

            {phase === 'ready' && (
              <>
                {/* Was gemeldet wurde */}
                <section aria-label="Meldungen" className="space-y-2">
                  {reports.map((d) => (
                    <div key={d.id} className="rounded-xl border border-ws-orange/30 bg-ws-orange/15 p-3 text-sm">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <Flag className="size-4 shrink-0 text-ws-orange" aria-hidden />
                        <span className="font-semibold text-ws-orange">{REPORT_REASON_LABEL[d.reason]}</span>
                        <span className="text-xs text-ws-muted">{formatDate(d.created_at)}</span>
                      </div>
                      {d.note && <p className="mt-1.5 whitespace-pre-wrap text-ws-text">„{d.note}“</p>}
                      {mode === 'edit' && d.chosen_option_text && (
                        <p className="mt-1 text-xs text-ws-muted">Gewählt: {d.chosen_option_text}</p>
                      )}
                      {readOnly && d.response_text && (
                        <p className="mt-1 text-xs text-ws-muted">Rückmeldung: {d.response_text}</p>
                      )}
                    </div>
                  ))}
                </section>

                {questionNote && (
                  <p className="rounded-xl border border-ws-line bg-ws-bg p-3 text-sm text-ws-muted">{questionNote}</p>
                )}

                {/* Schritt 1: Frage ansehen */}
                {question && mode === 'view' && (
                  <section aria-label="Frage" className="space-y-2">
                    <p className="font-semibold leading-relaxed text-ws-text">{question.question_text}</p>
                    <ul className="space-y-1.5">
                      {question.answer_options.map((o, i) => {
                        const chosen = chosenTexts.has(o.option_text)
                        return (
                          <li
                            key={o.id ?? i}
                            className={`flex items-start gap-3 rounded-xl border px-3 py-2.5 text-sm ${
                              o.is_correct
                                ? 'border-ws-green/30 bg-ws-green/15 text-ws-green'
                                : chosen
                                  ? 'border-ws-orange/30 text-ws-text'
                                  : 'border-ws-line text-ws-text'
                            }`}
                          >
                            <span className="w-4 font-semibold">{String.fromCharCode(65 + i)}</span>
                            <span className="flex-1">{o.option_text}</span>
                            {o.is_correct && (
                              <span className="flex shrink-0 items-center gap-1 text-xs font-semibold">
                                <CheckCircle2 className="size-4" aria-hidden />
                                Richtig
                              </span>
                            )}
                            {chosen && !o.is_correct && (
                              <span className="flex shrink-0 items-center gap-1 text-xs font-semibold text-ws-orange">
                                <Flag className="size-3.5" aria-hidden />
                                Gewählt
                              </span>
                            )}
                          </li>
                        )
                      })}
                    </ul>
                    {question.explanation && (
                      <p className="rounded-xl bg-ws-bg p-3 text-sm text-ws-muted">
                        <span className="font-semibold text-ws-text">Erklärung: </span>
                        {question.explanation}
                      </p>
                    )}
                  </section>
                )}

                {/* Schritt 2: Frage korrigieren */}
                {canEdit && mode === 'edit' && (
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
                )}
              </>
            )}
          </div>

          {!readOnly && phase === 'ready' && (
            <div className="space-y-3 border-t border-ws-line px-4 py-3 sm:px-6">
              {savedPending && (
                <div
                  role="alert"
                  className="flex items-start gap-2 rounded-xl border border-ws-orange/30 bg-ws-orange/15 p-3 text-sm text-ws-orange"
                >
                  <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                  Die Frage ist gespeichert, die Meldung ist aber noch offen. Schließe sie jetzt ab.
                </div>
              )}

              {/* Was der Azubi liest – als Einzeiler, aufklappbar */}
              <div className="text-sm">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <MessageSquare className="size-4 shrink-0 text-ws-muted" aria-hidden />
                  <span className="text-ws-muted">Azubi liest:</span>
                  <span className="min-w-0 flex-1 truncate text-ws-text" title={silent ? undefined : azubiPreview}>
                    {silent ? 'nichts (still geschlossen)' : `„${azubiPreview}“`}
                    {!silent && mode === 'edit' && (
                      <span className="text-ws-gold"> + {REPORT_REWARD_COINS} Frachtmünzen</span>
                    )}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setResponseOpen((o) => !o)}
                    aria-expanded={responseOpen}
                    className="min-h-11 rounded-xl px-2 text-ws-blue hover:bg-ws-raised hover:text-ws-blue"
                  >
                    {responseOpen ? 'Fertig' : 'Ergänzen'}
                  </Button>
                </div>
                {responseOpen && (
                  <div className="mt-2 space-y-2">
                    <Textarea
                      id="review-response"
                      aria-label="Ergänzung an die Melder"
                      placeholder="Optional: kurzer Satz an die Melder"
                      value={response}
                      onChange={(e) => setResponse(e.target.value.slice(0, REPORT_RESPONSE_MAX))}
                      rows={2}
                      maxLength={REPORT_RESPONSE_MAX}
                      disabled={silent}
                      className="border-ws-line bg-ws-bg text-ws-text"
                    />
                    <div className="flex flex-wrap items-center gap-2">
                      {mode === 'view' &&
                        REPORT_RESPONSE_TEMPLATES.map((t) => (
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
                          Still schließen (keine Nachricht, keine Belohnung)
                        </Label>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {mode === 'view' ? (
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setPending({ kind: 'entfaellt' })}
                    disabled={busy}
                    className="min-h-11 rounded-xl px-3 text-ws-muted hover:bg-ws-raised hover:text-ws-text"
                  >
                    Frage entfällt …
                  </Button>
                  <div className="flex flex-1 flex-wrap justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => void closeAsCorrect()}
                      disabled={busy}
                      className={`${OUTLINE} flex-1 sm:flex-none`}
                    >
                      {busy && <Loader2 className="mr-2 size-4 animate-spin" />}
                      Frage ist korrekt
                    </Button>
                    {canEdit && (
                      <Button
                        type="button"
                        onClick={() => switchMode('edit')}
                        disabled={busy}
                        className="min-h-11 flex-1 rounded-xl bg-ws-green text-ws-on-accent hover:bg-ws-green-hover sm:flex-none"
                      >
                        <Pencil className="mr-2 size-4" />
                        Frage korrigieren
                      </Button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap items-center justify-end gap-2">
                  {!savedPending && (
                    <Button type="button" variant="outline" onClick={backToView} disabled={busy} className={OUTLINE}>
                      Zurück
                    </Button>
                  )}
                  <Button
                    type="button"
                    onClick={() => void saveAndClose()}
                    disabled={busy || (!dirty && !savedPending)}
                    title={!dirty && !savedPending ? 'Ändere zuerst die Frage.' : undefined}
                    className="min-h-11 flex-1 rounded-xl bg-ws-green text-ws-on-accent hover:bg-ws-green-hover sm:flex-none"
                  >
                    {busy && <Loader2 className="mr-2 size-4 animate-spin" />}
                    {savedPending ? 'Abschließen wiederholen' : 'Speichern & abschließen'}
                  </Button>
                </div>
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
