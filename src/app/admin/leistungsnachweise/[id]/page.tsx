'use client'

import { use, useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { QRCodeSVG } from 'qrcode.react'
import {
  ArrowLeft,
  Copy,
  Download,
  Loader2,
  Lock,
  PlayCircle,
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
import { cn } from '@/lib/utils'

type AssessmentStatus = 'draft' | 'open' | 'closed'

type AssessmentDetail = {
  id: string
  title: string
  examSetName: string
  part: number
  status: AssessmentStatus
  accessCode: string
  joinUrl: string
  opensAt: string
  closesAt: string
  durationMinutes: number
  gradingScale: { grade: number; minPercent: number }[]
  resultsReleasedAt: string | null
  createdAt: string
  questionCount: number
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
}

type QuestionStat = {
  id: string
  text: string
  correctCount: number
  totalCount: number
  options: { id: string; text: string; isCorrect: boolean; selectedCount: number }[]
}

type ResultsResponse = {
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
  const [detail, setDetail] = useState<AssessmentDetail | null>(null)
  const [results, setResults] = useState<ResultsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const [actionPending, setActionPending] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [confirmRelease, setConfirmRelease] = useState(false)

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
        action === 'open' ? 'Nachweis geöffnet' : action === 'close' ? 'Beitritt geschlossen' : 'Ergebnisse freigegeben',
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
      toast.success('Entwurf gelöscht')
      router.push('/admin/leistungsnachweise')
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
    return (
      <div className="text-center py-16 bg-[#1F2937] rounded-2xl border border-[#4B5563]">
        <p className="text-[#9CA3AF]">Leistungsnachweis konnte nicht geladen werden.</p>
        <Button variant="outline" size="sm" onClick={load} className="mt-4 rounded-xl border-[#4B5563] text-[#9CA3AF]">
          Erneut versuchen
        </Button>
      </div>
    )
  }

  const activeParticipants = (results?.participants ?? []).filter((p) => !p.excluded)
  const gradeCounts = results?.gradeDistribution.counts ?? {}
  const maxGradeCount = Math.max(1, ...Object.values(gradeCounts).map((n) => Number(n) || 0))

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/leistungsnachweise" className="text-[#9CA3AF] hover:text-[#F9FAFB]">
          <ArrowLeft size={18} />
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-[#F9FAFB]">{detail.title}</h1>
          <p className="text-sm text-[#9CA3AF]">{detail.examSetName} · {detail.questionCount} Fragen · {detail.durationMinutes} Min.</p>
        </div>
        <Badge className={cn(
          'text-xs border-0',
          detail.status === 'draft' && 'bg-[#4B5563]/40 text-[#9CA3AF]',
          detail.status === 'open' && 'bg-[#58CC02]/20 text-[#58CC02]',
          detail.status === 'closed' && 'bg-[#FF9600]/20 text-[#FF9600]',
        )}>
          {STATUS_LABELS[detail.status]}
        </Badge>
      </div>

      {/* Code / Link / QR */}
      <div className="bg-[#1F2937] border border-[#4B5563] rounded-2xl p-5 flex flex-col sm:flex-row items-center gap-5">
        <div className="bg-white p-2 rounded-xl flex-shrink-0">
          <QRCodeSVG value={detail.joinUrl} size={112} />
        </div>
        <div className="flex-1 text-center sm:text-left space-y-2">
          <p className="text-xs text-[#9CA3AF] uppercase tracking-wide">Beitrittscode</p>
          <p className="text-3xl font-mono font-bold text-[#F9FAFB] tracking-widest">{detail.accessCode}</p>
          <Button variant="outline" size="sm" onClick={copyLink} className="rounded-xl border-[#4B5563] text-[#9CA3AF] hover:text-[#F9FAFB]">
            <Copy size={14} className="mr-1.5" />
            Link kopieren
          </Button>
        </div>
      </div>

      {/* Status-Steuerung + Live-Kachel */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-[#1F2937] border border-[#4B5563] rounded-2xl p-4 flex flex-wrap items-center gap-2">
          {detail.status === 'draft' && (
            <>
              <Button
                onClick={() => runAction('open')}
                disabled={actionPending}
                className="rounded-xl bg-[#58CC02] hover:bg-[#4CAD02] text-white"
              >
                <Unlock size={14} className="mr-1.5" />
                Öffnen
              </Button>
              <Button
                variant="outline"
                onClick={() => setConfirmDelete(true)}
                disabled={actionPending}
                className="rounded-xl border-[#FF4B4B]/30 text-[#FF4B4B] hover:bg-[#FF4B4B]/10"
              >
                <Trash2 size={14} className="mr-1.5" />
                Löschen
              </Button>
            </>
          )}
          {detail.status === 'open' && (
            <Button
              variant="outline"
              onClick={() => runAction('close')}
              disabled={actionPending}
              className="rounded-xl border-[#FF9600]/50 text-[#FF9600] hover:bg-[#FF9600]/10"
            >
              <Lock size={14} className="mr-1.5" />
              Beitritt schließen
            </Button>
          )}
          {detail.status === 'closed' && !detail.resultsReleasedAt && (
            <Button
              onClick={() => setConfirmRelease(true)}
              disabled={actionPending || activeParticipants.length === 0}
              className="rounded-xl bg-[#1CB0F6] hover:bg-[#18a0e0] text-white"
            >
              <PlayCircle size={14} className="mr-1.5" />
              Ergebnisse freigeben
            </Button>
          )}
          {detail.resultsReleasedAt && (
            <Badge className="bg-[#58CC02]/20 text-[#58CC02] border-0">
              Ergebnisse freigegeben · {new Date(detail.resultsReleasedAt).toLocaleString('de-DE')}
            </Badge>
          )}
        </div>

        <div className="bg-[#1F2937] border border-[#4B5563] rounded-2xl p-4 flex items-center justify-around text-center">
          <div>
            <p className="text-xl font-bold text-[#F9FAFB]">{detail.live.joined}</p>
            <p className="text-xs text-[#9CA3AF]">Beigetreten</p>
          </div>
          <div>
            <p className="text-xl font-bold text-[#1CB0F6]">{detail.live.inProgress}</p>
            <p className="text-xs text-[#9CA3AF]">Schreiben</p>
          </div>
          <div>
            <p className="text-xl font-bold text-[#58CC02]">{detail.live.submitted}</p>
            <p className="text-xs text-[#9CA3AF]">Abgegeben</p>
          </div>
        </div>
      </div>

      {/* Auswertung */}
      <Tabs defaultValue="participants">
        <TabsList className="bg-[#1F2937] border border-[#4B5563]">
          <TabsTrigger value="participants" className="data-[state=active]:bg-[#374151] data-[state=active]:text-[#F9FAFB] text-[#9CA3AF]">
            Teilnehmer
          </TabsTrigger>
          <TabsTrigger value="grades" className="data-[state=active]:bg-[#374151] data-[state=active]:text-[#F9FAFB] text-[#9CA3AF]">
            Notenspiegel
          </TabsTrigger>
          <TabsTrigger value="questions" className="data-[state=active]:bg-[#374151] data-[state=active]:text-[#F9FAFB] text-[#9CA3AF]">
            Fragenanalyse
          </TabsTrigger>
        </TabsList>

        <TabsContent value="participants" className="mt-4">
          <div className="flex justify-end mb-2">
            <a href={`/api/admin/assessments/${id}/export`} download>
              <Button variant="outline" size="sm" className="rounded-xl border-[#4B5563] text-[#9CA3AF] hover:text-[#F9FAFB]">
                <Download size={14} className="mr-1.5" />
                CSV-Export
              </Button>
            </a>
          </div>
          <div className="border border-[#4B5563] rounded-2xl overflow-hidden bg-[#1F2937] overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-[#111827] hover:bg-[#111827] border-[#4B5563]">
                  <TableHead className="text-[#9CA3AF]">Name</TableHead>
                  <TableHead className="text-[#9CA3AF]">Punkte</TableHead>
                  <TableHead className="text-[#9CA3AF]">%</TableHead>
                  <TableHead className="text-[#9CA3AF]">Note</TableHead>
                  <TableHead className="text-[#9CA3AF]">Dauer</TableHead>
                  <TableHead className="text-[#9CA3AF]">Abgegeben</TableHead>
                  <TableHead className="text-[#9CA3AF]">Zählt</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!results || results.participants.length === 0 ? (
                  <TableRow className="border-[#4B5563]">
                    <TableCell colSpan={7} className="text-center text-[#9CA3AF] py-10 flex flex-col items-center gap-2">
                      <Users size={28} className="text-[#374151]" />
                      Noch niemand beigetreten.
                    </TableCell>
                  </TableRow>
                ) : (
                  results.participants.map((p) => (
                    <TableRow key={p.sessionId} className={cn('border-[#4B5563]', p.excluded && 'opacity-50')}>
                      <TableCell className="text-[#F9FAFB] font-medium">{p.name}</TableCell>
                      <TableCell className="text-[#F9FAFB]">{p.points}/{p.totalPoints}</TableCell>
                      <TableCell className="text-[#F9FAFB]">{p.percent}%</TableCell>
                      <TableCell className="text-[#F9FAFB] font-bold">{p.grade ?? '—'}</TableCell>
                      <TableCell className="text-[#9CA3AF]">{p.durationMinutes != null ? `${p.durationMinutes} Min.` : '—'}</TableCell>
                      <TableCell className="text-[#9CA3AF] text-xs">
                        {p.submittedAt ? new Date(p.submittedAt).toLocaleString('de-DE') : 'Schreibt noch'}
                      </TableCell>
                      <TableCell>
                        <Checkbox
                          checked={!p.excluded}
                          onCheckedChange={(v) => toggleExcluded(p.sessionId, !v)}
                          aria-label="Zählt in der Wertung"
                        />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="grades" className="mt-4">
          <div className="bg-[#1F2937] border border-[#4B5563] rounded-2xl p-5 space-y-4">
            {!results || activeParticipants.length === 0 ? (
              <p className="text-center text-[#9CA3AF] py-8">Noch keine gewerteten Teilnahmen.</p>
            ) : (
              <>
                <div className="flex items-center justify-around text-center pb-2 border-b border-[#4B5563]">
                  <div>
                    <p className="text-2xl font-bold text-[#F9FAFB]">{results.gradeDistribution.average?.toFixed(1) ?? '—'}</p>
                    <p className="text-xs text-[#9CA3AF]">Ø-Note</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-[#58CC02]">
                      {results.gradeDistribution.passRate != null ? `${Math.round(results.gradeDistribution.passRate)}%` : '—'}
                    </p>
                    <p className="text-xs text-[#9CA3AF]">Bestehensquote</p>
                  </div>
                </div>
                <div className="space-y-2">
                  {[1, 2, 3, 4, 5, 6].map((grade) => {
                    const count = Number(gradeCounts[String(grade)] ?? 0)
                    return (
                      <div key={grade} className="flex items-center gap-3">
                        <span className="w-4 text-sm font-bold text-[#F9FAFB]">{grade}</span>
                        <div className="flex-1 h-5 bg-[#111827] rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#1CB0F6] rounded-full transition-all duration-300"
                            style={{ width: `${(count / maxGradeCount) * 100}%` }}
                          />
                        </div>
                        <span className="w-6 text-xs text-[#9CA3AF] text-right">{count}</span>
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
              <div className="bg-[#1F2937] border border-[#4B5563] rounded-2xl p-8 text-center text-[#9CA3AF]">
                Noch keine Abgaben zur Auswertung.
              </div>
            ) : (
              [...results.questions]
                .sort((a, b) => (a.correctCount / a.totalCount || 0) - (b.correctCount / b.totalCount || 0))
                .map((q) => {
                  const pct = q.totalCount > 0 ? Math.round((q.correctCount / q.totalCount) * 100) : 0
                  return (
                    <div key={q.id} className="bg-[#1F2937] border border-[#4B5563] rounded-2xl p-4">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <p className="text-sm text-[#F9FAFB] leading-snug flex-1">{q.text}</p>
                        <span className={cn(
                          'text-sm font-bold flex-shrink-0',
                          pct >= 70 ? 'text-[#58CC02]' : pct >= 40 ? 'text-[#FF9600]' : 'text-[#FF4B4B]',
                        )}>
                          {pct}%
                        </span>
                      </div>
                      <div className="space-y-1">
                        {q.options.map((opt) => (
                          <div key={opt.id} className="flex items-center gap-2 text-xs">
                            <span className={cn('flex-1', opt.isCorrect ? 'text-[#58CC02]' : 'text-[#9CA3AF]')}>
                              {opt.isCorrect ? '✓ ' : '  '}{opt.text}
                            </span>
                            <span className="text-[#6B7280]">{opt.selectedCount}×</span>
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

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent className="bg-[#1F2937] border-[#4B5563] text-[#F9FAFB]">
          <AlertDialogHeader>
            <AlertDialogTitle>Entwurf löschen?</AlertDialogTitle>
            <AlertDialogDescription className="text-[#9CA3AF]">
              Der Leistungsnachweis wird endgültig gelöscht. Das geht nur, solange er noch nicht geöffnet wurde.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-[#374151] border-[#4B5563] text-[#F9FAFB] hover:bg-[#4B5563]">
              Abbrechen
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-[#FF4B4B] hover:bg-[#e04040] text-white">
              {actionPending ? <Loader2 size={14} className="animate-spin" /> : 'Löschen'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmRelease} onOpenChange={setConfirmRelease}>
        <AlertDialogContent className="bg-[#1F2937] border-[#4B5563] text-[#F9FAFB]">
          <AlertDialogHeader>
            <AlertDialogTitle>Ergebnisse freigeben?</AlertDialogTitle>
            <AlertDialogDescription className="text-[#9CA3AF]">
              Alle {activeParticipants.length} Teilnehmer sehen ab sofort ihre Note und die Auflösung. Das gilt für alle
              gemeinsam und lässt sich nicht zurücknehmen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-[#374151] border-[#4B5563] text-[#F9FAFB] hover:bg-[#4B5563]">
              Abbrechen
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => runAction('release_results')}
              className="bg-[#1CB0F6] hover:bg-[#18a0e0] text-white"
            >
              Jetzt freigeben
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
