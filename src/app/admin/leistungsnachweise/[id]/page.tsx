'use client'

import { Fragment, use, useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { QRCodeSVG } from 'qrcode.react'
import {
  AlertTriangle,
  ArrowLeft,
  Copy,
  Download,
  ListChecks,
  Loader2,
  Lock,
  PlayCircle,
  Printer,
  Trash2,
  Unlock,
  Users,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Checkbox } from '@/components/ui/checkbox'
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
import { listHref } from '@/lib/assessment-list-memory'
import { AssessmentCategoryCard } from '@/components/admin/assessment-category-card'
import { EditAssessmentQuestionsDialog } from '@/components/admin/edit-assessment-questions-dialog'
import { FocusCell, FocusDetailPanel, FocusDraftSettings } from '@/components/admin/focus-detail'
import type { ParticipantFocus } from '@/lib/focus-tracking'
import { cn } from '@/lib/utils'
import { AdminPageHeader } from '@/components/admin/admin-page-header'
import { AdminErrorState } from '@/components/admin/admin-states'

type AssessmentStatus = 'draft' | 'open' | 'closed'

type AssessmentDetail = {
  id: string
  title: string
  examSetName: string | null
  part: number
  status: AssessmentStatus
  accessCode: string
  joinUrl: string
  opensAt: string
  closesAt: string
  durationMinutes: number
  gradingScale: { grade: number; minPercent: number }[]
  resultsReleasedAt: string | null
  /** PROJ-30 */
  focusTracking: boolean
  focusAutoSubmitAfter: number | null
  createdAt: string
  /** PROJ-39 */
  schoolYear: string
  className: string | null
  subjectId: string | null
  /** Auswahl für die Ablage, aus dem Bereich des Nachweises */
  categoryOptions: { subjects: { id: string; name: string; code: string }[]; classes: string[] }
  questionCount: number
  /** Entwurfs-Fragenliste (nur im Status Entwurf) */
  draftQuestionIds?: string[]
  live: { joined: number; inProgress: number; submitted: number }
}

type Participant = {
  sessionId: string
  name: string
  points: number
  totalPoints: number
  percent: number
  grade: number | null
  durationMinutes: number | null
  submittedAt: string | null
  excluded: boolean
  status: 'in_progress' | 'completed'
  /** PROJ-30: null, wenn der Nachweis das Verlassen nicht protokolliert */
  focus: ParticipantFocus | null
}

type QuestionStat = {
  id: string
  text: string
  correctCount: number
  totalCount: number
  options: { id: string; text: string; isCorrect: boolean; selectedCount: number }[]
}

type ResultsResponse = {
  focusTracking: boolean
  participants: Participant[]
  gradeDistribution: { counts: Record<string, number>; average: number | null; passRate: number | null }
  questions: QuestionStat[]
}

const STATUS_LABELS: Record<AssessmentStatus, string> = { draft: 'Entwurf', open: 'Offen', closed: 'Geschlossen' }

async function fetchDetail(id: string): Promise<AssessmentDetail | null> {
  try {
    const res = await fetch(`/api/admin/assessments/${id}`)
    if (!res.ok) return null
    return (await res.json()) as AssessmentDetail
  } catch {
    return null
  }
}

async function fetchResults(id: string): Promise<ResultsResponse | null> {
  try {
    const res = await fetch(`/api/admin/assessments/${id}/results`)
    if (!res.ok) return null
    return (await res.json()) as ResultsResponse
  } catch {
    return null
  }
}

export default function AssessmentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [editQuestionsOpen, setEditQuestionsOpen] = useState(false)
  const [detail, setDetail] = useState<AssessmentDetail | null>(null)
  const [results, setResults] = useState<ResultsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const [actionPending, setActionPending] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [confirmRelease, setConfirmRelease] = useState(false)
  const [expandedFocus, setExpandedFocus] = useState<string | null>(null)

  const load = useCallback(async () => {
    const [d, r] = await Promise.all([fetchDetail(id), fetchResults(id)])
    if (!d) {
      setFailed(true)
      setLoading(false)
      return
    }
    setDetail(d)
    setResults(r)
    setFailed(false)
    setLoading(false)
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  // Live-Kachel während der Nachweis offen ist regelmäßig aktualisieren.
  useEffect(() => {
    if (detail?.status !== 'open') return
    const interval = setInterval(load, 8000)
    return () => clearInterval(interval)
  }, [detail?.status, load])

  async function runAction(action: 'open' | 'close' | 'release_results') {
    setActionPending(true)
    try {
      const res = await fetch(`/api/admin/assessments/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(data?.error ?? 'Aktion fehlgeschlagen')
        return
      }
      toast.success(
        action === 'open'
          ? data?.removedCount > 0
            ? `Nachweis geöffnet – ${data.removedCount} deaktivierte oder gelöschte Fragen entfernt`
            : 'Nachweis geöffnet'
          : action === 'close' ? 'Beitritt geschlossen' : 'Ergebnisse freigegeben',
      )
      load()
    } catch (err) {
      console.error(err)
      toast.error('Netzwerkfehler')
    } finally {
      setActionPending(false)
    }
  }

  async function handleDelete() {
    setActionPending(true)
    try {
      const res = await fetch(`/api/admin/assessments/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        toast.error(data?.error ?? 'Löschen fehlgeschlagen')
        return
      }
      toast.success('Leistungsnachweis gelöscht')
      router.push(listHref())
    } catch (err) {
      console.error(err)
      toast.error('Netzwerkfehler')
    } finally {
      setActionPending(false)
    }
  }

  async function toggleExcluded(sessionId: string, excluded: boolean) {
    try {
      const res = await fetch(`/api/admin/assessments/${id}/participants/${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ excluded }),
      })
      if (!res.ok) {
        toast.error('Konnte nicht geändert werden')
        return
      }
      load()
    } catch (err) {
      console.error(err)
      toast.error('Netzwerkfehler')
    }
  }

  function copyLink() {
    if (!detail) return
    navigator.clipboard.writeText(detail.joinUrl).then(
      () => toast.success('Link kopiert'),
      () => toast.error('Kopieren fehlgeschlagen'),
    )
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    )
  }

  if (failed || !detail) {
    return <AdminErrorState message="Der Leistungsnachweis konnte gerade nicht geladen werden." onRetry={load} />
  }

  const activeParticipants = (results?.participants ?? []).filter((p) => !p.excluded)
  const hasSubmissions = (results?.participants ?? []).some((p) => p.status === 'completed')
  const gradeCounts = results?.gradeDistribution.counts ?? {}
  const showFocus = Boolean(results?.focusTracking)
  const conspicuousCount = (results?.participants ?? []).filter((p) => p.focus?.conspicuous).length
  const maxGradeCount = Math.max(1, ...Object.values(gradeCounts).map((n) => Number(n) || 0))

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Link
          href={listHref()}
          className="inline-flex min-h-11 items-center gap-1.5 text-sm text-ws-muted hover:text-ws-text lg:hidden"
        >
          <ArrowLeft size={16} />
          Leistungsnachweise
        </Link>
        <AdminPageHeader
          title={detail.title}
          breadcrumb={detail.title}
          description={`${detail.examSetName ? `${detail.examSetName} · ` : ''}${detail.questionCount} Fragen · ${detail.durationMinutes} Min.`}
          actions={
            <>
              {detail.status === 'draft' && (
                <>
                  <Button
                    onClick={() => runAction('open')}
                    disabled={actionPending}
                    className="rounded-xl bg-ws-green hover:bg-ws-green-hover text-ws-on-accent"
                  >
                    <Unlock size={14} className="mr-1.5" />
                    Öffnen
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setEditQuestionsOpen(true)}
                    disabled={actionPending}
                    className="rounded-xl border-ws-line text-ws-muted hover:text-ws-text"
                  >
                    <ListChecks size={14} className="mr-1.5" />
                    Fragen bearbeiten
                  </Button>
                </>
              )}
              {detail.status === 'open' && (
                <Button
                  variant="outline"
                  onClick={() => runAction('close')}
                  disabled={actionPending}
                  className="rounded-xl border-ws-orange/50 text-ws-orange hover:bg-ws-orange/10"
                >
                  <Lock size={14} className="mr-1.5" />
                  Beitritt schließen
                </Button>
              )}
              {detail.status === 'closed' && !detail.resultsReleasedAt && (
                <Button
                  onClick={() => setConfirmRelease(true)}
                  disabled={actionPending || activeParticipants.length === 0}
                  className="rounded-xl bg-ws-blue hover:bg-ws-blue-hover text-ws-on-accent"
                >
                  <PlayCircle size={14} className="mr-1.5" />
                  Ergebnisse freigeben
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() => setConfirmDelete(true)}
                disabled={actionPending}
                className="rounded-xl border-ws-red/30 text-ws-red hover:bg-ws-red/10"
              >
                <Trash2 size={14} className="mr-1.5" />
                Löschen
              </Button>
            </>
          }
        >
          <div className="flex flex-wrap items-center gap-2">
            <Badge className={cn(
              'text-xs border-0',
              detail.status === 'draft' && 'bg-ws-line/40 text-ws-muted',
              detail.status === 'open' && 'bg-ws-green/20 text-ws-green',
              detail.status === 'closed' && 'bg-ws-orange/20 text-ws-orange',
            )}>
              {STATUS_LABELS[detail.status]}
            </Badge>
            {detail.resultsReleasedAt && (
              <Badge className="bg-ws-green/20 text-ws-green border-0">
                Ergebnisse freigegeben · {new Date(detail.resultsReleasedAt).toLocaleString('de-DE')}
              </Badge>
            )}
          </div>
        </AdminPageHeader>
      </div>

      {/* Code / Link / QR */}
      <div className="bg-ws-surface border border-ws-line rounded-2xl p-5 flex flex-col sm:flex-row items-center gap-5">
        <div className="bg-white p-2 rounded-xl flex-shrink-0">
          <QRCodeSVG value={detail.joinUrl} size={112} />
        </div>
        <div className="flex-1 text-center sm:text-left space-y-2">
          <p className="text-xs text-ws-muted uppercase tracking-wide">Beitrittscode</p>
          <p className="text-3xl font-mono font-bold text-ws-text tracking-widest">{detail.accessCode}</p>
          <Button variant="outline" size="sm" onClick={copyLink} className="rounded-xl border-ws-line text-ws-muted hover:text-ws-text">
            <Copy size={14} className="mr-1.5" />
            Link kopieren
          </Button>
        </div>
      </div>

      {/* Live-Kachel */}
      <div className="bg-ws-surface border border-ws-line rounded-2xl p-4 flex items-center justify-around text-center">
        <div>
          <p className="text-xl font-bold text-ws-text">{detail.live.joined}</p>
          <p className="text-xs text-ws-muted">Beigetreten</p>
        </div>
        <div>
          <p className="text-xl font-bold text-ws-blue">{detail.live.inProgress}</p>
          <p className="text-xs text-ws-muted">Schreiben</p>
        </div>
        <div>
          <p className="text-xl font-bold text-ws-green">{detail.live.submitted}</p>
          <p className="text-xs text-ws-muted">Abgegeben</p>
        </div>
      </div>

      {/* PROJ-39: Ablage — in jedem Status änderbar */}
      <AssessmentCategoryCard
        key={`${detail.schoolYear}|${detail.className}|${detail.subjectId}`}
        assessmentId={id}
        schoolYear={detail.schoolYear}
        schoolClass={detail.className}
        subjectId={detail.subjectId}
        subjects={detail.categoryOptions?.subjects ?? []}
        classSuggestions={detail.categoryOptions?.classes ?? []}
        onSaved={load}
      />

      {/* PROJ-30: Fokus-Verlust-Protokoll — im Entwurf einstellbar, danach nur als Hinweis */}
      {detail.status === 'draft' ? (
        <div className="bg-ws-surface border border-ws-line rounded-2xl p-4">
          <FocusDraftSettings
            key={`${detail.focusTracking}-${detail.focusAutoSubmitAfter}`}
            assessmentId={id}
            focusTracking={detail.focusTracking}
            focusAutoSubmitAfter={detail.focusAutoSubmitAfter}
            onSaved={load}
          />
        </div>
      ) : (
        <p className="text-xs text-ws-muted">
          Verlassen der Prüfung:{' '}
          <span className="text-ws-text">
            {detail.focusTracking
              ? detail.focusAutoSubmitAfter != null
                ? `wird protokolliert, automatische Abgabe ab ${detail.focusAutoSubmitAfter} Wechseln`
                : 'wird protokolliert (keine automatische Abgabe)'
              : 'wird nicht protokolliert'}
          </span>
        </p>
      )}

      {/* Auswertung */}
      <Tabs defaultValue="participants">
        <TabsList className="bg-ws-surface border border-ws-line">
          <TabsTrigger value="participants" className="data-[state=active]:bg-ws-raised data-[state=active]:text-ws-text text-ws-muted">
            Teilnehmer
          </TabsTrigger>
          <TabsTrigger value="grades" className="data-[state=active]:bg-ws-raised data-[state=active]:text-ws-text text-ws-muted">
            Notenspiegel
          </TabsTrigger>
          <TabsTrigger value="questions" className="data-[state=active]:bg-ws-raised data-[state=active]:text-ws-text text-ws-muted">
            Fragenanalyse
          </TabsTrigger>
        </TabsList>

        <TabsContent value="participants" className="mt-4">
          <div className="flex flex-wrap justify-end gap-2 mb-2">
            <Link href={`/admin/leistungsnachweise/${id}/druck/klasse`}>
              <Button variant="outline" size="sm" disabled={!hasSubmissions} className="rounded-xl border-ws-line text-ws-muted hover:text-ws-text">
                <Printer size={14} className="mr-1.5" />
                Klassenauswertung drucken
              </Button>
            </Link>
            <Link href={`/admin/leistungsnachweise/${id}/druck/einzeln`}>
              <Button variant="outline" size="sm" disabled={!hasSubmissions} className="rounded-xl border-ws-line text-ws-muted hover:text-ws-text">
                <Printer size={14} className="mr-1.5" />
                Alle Einzelauswertungen
              </Button>
            </Link>
            <a href={`/api/admin/assessments/${id}/export`} download>
              <Button variant="outline" size="sm" className="rounded-xl border-ws-line text-ws-muted hover:text-ws-text">
                <Download size={14} className="mr-1.5" />
                CSV-Export
              </Button>
            </a>
          </div>
          {showFocus && conspicuousCount > 0 && (
            <div role="status" className="mb-3 flex items-start gap-3 rounded-2xl border border-ws-orange/30 bg-ws-orange/5 p-4">
              <AlertTriangle size={18} className="text-ws-orange flex-shrink-0 mt-0.5" aria-hidden="true" />
              <p className="text-sm text-ws-text">
                {conspicuousCount === 1
                  ? '1 Teilnehmer hat die Prüfung verlassen.'
                  : `${conspicuousCount} Teilnehmer haben die Prüfung verlassen.`}{' '}
                <span className="text-ws-muted">Details in der Spalte „Fokus". Ein Eintrag beweist kein Nachschlagen.</span>
              </p>
            </div>
          )}
          <div className="ws-table-scroll ws-table-sticky border border-ws-line rounded-2xl overflow-hidden bg-ws-surface overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-ws-bg hover:bg-ws-bg border-ws-line">
                  <TableHead className="text-ws-muted">Name</TableHead>
                  <TableHead className="text-ws-muted">Punkte</TableHead>
                  <TableHead className="text-ws-muted">%</TableHead>
                  <TableHead className="text-ws-muted">Note</TableHead>
                  <TableHead className="text-ws-muted">Dauer</TableHead>
                  <TableHead className="text-ws-muted">Abgegeben</TableHead>
                  {showFocus && <TableHead className="text-ws-muted">Fokus</TableHead>}
                  <TableHead className="text-ws-muted">Zählt</TableHead>
                  <TableHead className="text-ws-muted"><span className="sr-only">Drucken</span></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!results || results.participants.length === 0 ? (
                  <TableRow className="border-ws-line">
                    <TableCell colSpan={showFocus ? 9 : 8} className="text-center text-ws-muted py-10 flex flex-col items-center gap-2">
                      <Users size={28} className="text-ws-raised" />
                      Noch niemand beigetreten.
                    </TableCell>
                  </TableRow>
                ) : (
                  results.participants.map((p) => (
                    <Fragment key={p.sessionId}>
                    <TableRow className={cn('border-ws-line', p.excluded && 'opacity-50')}>
                      <TableCell className="text-ws-text font-medium">{p.name}</TableCell>
                      <TableCell className="text-ws-text">{p.points}/{p.totalPoints}</TableCell>
                      <TableCell className="text-ws-text">{p.percent}%</TableCell>
                      <TableCell className="text-ws-text font-bold">{p.grade ?? '—'}</TableCell>
                      <TableCell className="text-ws-muted">{p.durationMinutes != null ? `${p.durationMinutes} Min.` : '—'}</TableCell>
                      <TableCell className="text-ws-muted text-xs">
                        {p.submittedAt ? new Date(p.submittedAt).toLocaleString('de-DE') : 'Schreibt noch'}
                      </TableCell>
                      {showFocus && (
                        <TableCell>
                          <FocusCell
                            focus={p.focus}
                            expanded={expandedFocus === p.sessionId}
                            onToggle={() => setExpandedFocus((cur) => (cur === p.sessionId ? null : p.sessionId))}
                          />
                        </TableCell>
                      )}
                      <TableCell>
                        <Checkbox
                          checked={!p.excluded}
                          onCheckedChange={(v) => toggleExcluded(p.sessionId, !v)}
                          aria-label="Zählt in der Wertung"
                        />
                      </TableCell>
                      <TableCell>
                        {p.status === 'completed' ? (
                          <Link
                            href={`/admin/leistungsnachweise/${id}/druck/einzeln?sessionId=${p.sessionId}`}
                            aria-label={`Einzelauswertung von ${p.name} drucken`}
                            className="inline-flex items-center justify-center size-9 rounded-lg text-ws-muted hover:text-ws-text hover:bg-ws-raised"
                          >
                            <Printer size={16} />
                          </Link>
                        ) : null}
                      </TableCell>
                    </TableRow>
                    {showFocus && expandedFocus === p.sessionId && (
                      <TableRow className="border-ws-line bg-ws-bg/60 hover:bg-ws-bg/60">
                        <TableCell colSpan={9} className="py-3">
                          <FocusDetailPanel assessmentId={id} sessionId={p.sessionId} />
                        </TableCell>
                      </TableRow>
                    )}
                    </Fragment>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="grades" className="mt-4">
          <div className="flex justify-end mb-2">
            <Link href={`/admin/leistungsnachweise/${id}/druck/klasse`}>
              <Button variant="outline" size="sm" disabled={!hasSubmissions} className="rounded-xl border-ws-line text-ws-muted hover:text-ws-text">
                <Printer size={14} className="mr-1.5" />
                Klassenauswertung drucken
              </Button>
            </Link>
          </div>
          <div className="bg-ws-surface border border-ws-line rounded-2xl p-5 space-y-4">
            {!results || activeParticipants.length === 0 ? (
              <p className="text-center text-ws-muted py-8">Noch keine gewerteten Teilnahmen.</p>
            ) : (
              <>
                <div className="flex items-center justify-around text-center pb-2 border-b border-ws-line">
                  <div>
                    <p className="text-2xl font-bold text-ws-text">{results.gradeDistribution.average?.toFixed(1) ?? '—'}</p>
                    <p className="text-xs text-ws-muted">Ø-Note</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-ws-green">
                      {results.gradeDistribution.passRate != null ? `${Math.round(results.gradeDistribution.passRate)}%` : '—'}
                    </p>
                    <p className="text-xs text-ws-muted">Bestehensquote</p>
                  </div>
                </div>
                <div className="space-y-2">
                  {[1, 2, 3, 4, 5, 6].map((grade) => {
                    const count = Number(gradeCounts[String(grade)] ?? 0)
                    return (
                      <div key={grade} className="flex items-center gap-3">
                        <span className="w-4 text-sm font-bold text-ws-text">{grade}</span>
                        <div className="flex-1 h-5 bg-ws-bg rounded-full overflow-hidden">
                          <div
                            className="h-full bg-ws-blue rounded-full transition-all duration-300"
                            style={{ width: `${(count / maxGradeCount) * 100}%` }}
                          />
                        </div>
                        <span className="w-6 text-xs text-ws-muted text-right">{count}</span>
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </div>
        </TabsContent>

        <TabsContent value="questions" className="mt-4">
          <div className="space-y-3">
            {!results || results.questions.length === 0 ? (
              <div className="bg-ws-surface border border-ws-line rounded-2xl p-8 text-center text-ws-muted">
                Noch keine Abgaben zur Auswertung.
              </div>
            ) : (
              [...results.questions]
                .sort((a, b) => (a.correctCount / a.totalCount || 0) - (b.correctCount / b.totalCount || 0))
                .map((q) => {
                  const pct = q.totalCount > 0 ? Math.round((q.correctCount / q.totalCount) * 100) : 0
                  return (
                    <div key={q.id} className="bg-ws-surface border border-ws-line rounded-2xl p-4">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <p className="text-sm text-ws-text leading-snug flex-1">{q.text}</p>
                        <span className={cn(
                          'text-sm font-bold flex-shrink-0',
                          pct >= 70 ? 'text-ws-green' : pct >= 40 ? 'text-ws-orange' : 'text-ws-red',
                        )}>
                          {pct}%
                        </span>
                      </div>
                      <div className="space-y-1">
                        {q.options.map((opt) => (
                          <div key={opt.id} className="flex items-center gap-2 text-xs">
                            <span className={cn('flex-1', opt.isCorrect ? 'text-ws-green' : 'text-ws-muted')}>
                              {opt.isCorrect ? '✓ ' : '  '}{opt.text}
                            </span>
                            <span className="text-ws-faint">{opt.selectedCount}×</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })
            )}
          </div>
        </TabsContent>
      </Tabs>

      {detail.status === 'draft' && (
        <EditAssessmentQuestionsDialog
          open={editQuestionsOpen}
          onOpenChange={setEditQuestionsOpen}
          assessmentId={detail.id}
          initialQuestionIds={detail.draftQuestionIds ?? []}
          onSaved={load}
        />
      )}

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent className="bg-ws-surface border-ws-line text-ws-text">
          <AlertDialogHeader>
            <AlertDialogTitle>Leistungsnachweis löschen?</AlertDialogTitle>
            <AlertDialogDescription className="text-ws-muted">
              {detail.live.joined > 0
                ? `Der Leistungsnachweis wird endgültig gelöscht – samt ${detail.live.joined} Teilnehmer-Versuch${detail.live.joined === 1 ? '' : 'en'} und allen Ergebnissen. Das lässt sich nicht rückgängig machen.`
                : 'Der Leistungsnachweis wird endgültig gelöscht.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-ws-raised border-ws-line text-ws-text hover:bg-ws-line">
              Abbrechen
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-ws-red hover:bg-ws-red-hover text-ws-on-accent">
              {actionPending ? <Loader2 size={14} className="animate-spin" /> : 'Löschen'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmRelease} onOpenChange={setConfirmRelease}>
        <AlertDialogContent className="bg-ws-surface border-ws-line text-ws-text">
          <AlertDialogHeader>
            <AlertDialogTitle>Ergebnisse freigeben?</AlertDialogTitle>
            <AlertDialogDescription className="text-ws-muted">
              Alle {activeParticipants.length} Teilnehmer sehen ab sofort ihre Note und die Auflösung. Das gilt für alle
              gemeinsam und lässt sich nicht zurücknehmen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-ws-raised border-ws-line text-ws-text hover:bg-ws-line">
              Abbrechen
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => runAction('release_results')}
              className="bg-ws-blue hover:bg-ws-blue-hover text-ws-on-accent"
            >
              Jetzt freigeben
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
