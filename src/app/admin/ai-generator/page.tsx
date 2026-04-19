'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import {
  Bot,
  CheckCheck,
  RefreshCw,
  XCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AiGeneratorUploadZone,
  type GenerationJob,
} from '@/components/admin/ai-generator-upload-zone'
import { AiGeneratorJobCard } from '@/components/admin/ai-generator-job-card'
import { AiGeneratorDraftCard } from '@/components/admin/ai-generator-draft-card'
import { AiGeneratorDraftEditModal } from '@/components/admin/ai-generator-draft-edit-modal'
import { createClient } from '@/lib/supabase-browser'

export type DraftQuestion = {
  id: string
  job_id: string
  question_text: string
  options: string[]
  correct_index: number
  explanation: string | null
  subject_code: string | null
  difficulty: 'leicht' | 'mittel' | 'schwer' | null
  status: 'pending' | 'review_required' | 'accepted' | 'rejected'
  expires_at: string
}

const SUBJECTS = ['BGP', 'KSK', 'STG', 'LOP'] as const
const DIFFICULTIES = ['leicht', 'mittel', 'schwer'] as const
type DraftStatusFilter = 'all' | 'pending' | 'review_required' | 'accepted' | 'rejected'

export default function AiGeneratorPage() {
  const [jobs, setJobs] = useState<GenerationJob[]>([])
  const [drafts, setDrafts] = useState<DraftQuestion[]>([])
  const [jobsLoading, setJobsLoading] = useState(true)
  const [draftsLoading, setDraftsLoading] = useState(false)
  const [editingDraft, setEditingDraft] = useState<DraftQuestion | null>(null)
  const [statusFilter, setStatusFilter] = useState<DraftStatusFilter>('pending')
  const [subjectFilter, setSubjectFilter] = useState('all')
  const [jobFilter, setJobFilter] = useState('all')
  const [bulkSubject, setBulkSubject] = useState('_none')
  const [bulkDifficulty, setBulkDifficulty] = useState('_none')
  const [bulkLoading, setBulkLoading] = useState<'accept' | 'reject' | null>(null)
  const supabase = useRef(createClient())

  const fetchJobs = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/ai-generate/jobs')
      if (!res.ok) return
      const json = await res.json()
      setJobs(json.jobs ?? [])
    } catch {
      // network error
    } finally {
      setJobsLoading(false)
    }
  }, [])

  const fetchDrafts = useCallback(async () => {
    setDraftsLoading(true)
    try {
      const params = new URLSearchParams()
      if (statusFilter !== 'all') params.set('status', statusFilter)
      if (subjectFilter !== 'all') params.set('subject', subjectFilter)
      if (jobFilter !== 'all') params.set('job_id', jobFilter)
      const res = await fetch(`/api/admin/ai-generate/drafts?${params}`)
      if (!res.ok) return
      const json = await res.json()
      setDrafts(json.drafts ?? [])
    } catch {
      // network error
    } finally {
      setDraftsLoading(false)
    }
  }, [statusFilter, subjectFilter, jobFilter])

  useEffect(() => { fetchJobs() }, [fetchJobs])
  useEffect(() => { fetchDrafts() }, [fetchDrafts])

  // Supabase Realtime: live job status updates
  useEffect(() => {
    const sb = supabase.current
    const channel = sb
      .channel('admin-generation-jobs')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'generation_jobs' },
        (payload) => {
          const updated = payload.new as GenerationJob
          setJobs((prev) => {
            const exists = prev.find((j) => j.id === updated.id)
            if (!exists) return [updated, ...prev]
            return prev.map((j) => (j.id === updated.id ? updated : j))
          })
          if (updated.status === 'completed') fetchDrafts()
        }
      )
      .subscribe()
    return () => { sb.removeChannel(channel) }
  }, [fetchDrafts])

  function handleUploadComplete(job: GenerationJob) {
    setJobs((prev) => [job, ...prev])
    toast.success(`"${job.filename}" wird verarbeitet…`)
  }

  async function handleRetry(jobId: string) {
    try {
      const res = await fetch(`/api/admin/ai-generate/jobs/${jobId}/retry`, { method: 'POST' })
      if (!res.ok) { toast.error('Neuversuch fehlgeschlagen'); return }
      const json = await res.json()
      setJobs((prev) => prev.map((j) => (j.id === jobId ? json.job : j)))
      toast.success('Verarbeitung wird erneut gestartet…')
    } catch { toast.error('Netzwerkfehler') }
  }

  async function handleAcceptDraft(id: string) {
    try {
      const res = await fetch(`/api/admin/ai-generate/drafts/${id}/accept`, { method: 'POST' })
      if (!res.ok) { toast.error('Akzeptieren fehlgeschlagen'); return }
      toast.success('Frage aktiviert und im Quiz verfügbar')
      fetchDrafts()
    } catch { toast.error('Netzwerkfehler') }
  }

  async function handleRejectDraft(id: string) {
    try {
      const res = await fetch(`/api/admin/ai-generate/drafts/${id}/reject`, { method: 'POST' })
      if (!res.ok) { toast.error('Ablehnen fehlgeschlagen'); return }
      toast.success('Entwurf abgelehnt')
      fetchDrafts()
    } catch { toast.error('Netzwerkfehler') }
  }

  async function handleEditSave(draft: DraftQuestion, data: Partial<DraftQuestion>) {
    try {
      const res = await fetch(`/api/admin/ai-generate/drafts/${draft.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) { toast.error('Speichern fehlgeschlagen'); return }
      toast.success('Entwurf aktualisiert')
      setEditingDraft(null)
      fetchDrafts()
    } catch { toast.error('Netzwerkfehler') }
  }

  async function handleBulkAccept() {
    const ids = drafts
      .filter((d) => d.status === 'pending')
      .map((d) => d.id)
    if (ids.length === 0) { toast.info('Keine akzeptierbaren Entwürfe im aktuellen Filter'); return }
    setBulkLoading('accept')
    try {
      const body: Record<string, unknown> = { ids }
      if (bulkSubject !== '_none') body.subject_code = bulkSubject
      if (bulkDifficulty !== '_none') body.difficulty = bulkDifficulty
      const res = await fetch('/api/admin/ai-generate/drafts/bulk-accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) { toast.error('Massenakzeptanz fehlgeschlagen'); return }
      toast.success(`${ids.length} Fragen aktiviert`)
      fetchDrafts()
    } catch { toast.error('Netzwerkfehler') } finally { setBulkLoading(null) }
  }

  async function handleBulkReject() {
    const ids = drafts
      .filter((d) => d.status === 'pending' || d.status === 'review_required')
      .map((d) => d.id)
    if (ids.length === 0) { toast.info('Keine Entwürfe zum Ablehnen im aktuellen Filter'); return }
    setBulkLoading('reject')
    try {
      const res = await fetch('/api/admin/ai-generate/drafts/bulk-reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      })
      if (!res.ok) { toast.error('Ablehnen fehlgeschlagen'); return }
      toast.success(`${ids.length} Entwürfe abgelehnt`)
      fetchDrafts()
    } catch { toast.error('Netzwerkfehler') } finally { setBulkLoading(null) }
  }

  const completedJobs = jobs.filter((j) => j.status === 'completed')
  const pendingDraftCount = drafts.filter(
    (d) => d.status === 'pending' || d.status === 'review_required'
  ).length

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-[#F9FAFB] tracking-tight flex items-center gap-2">
          <Bot className="w-6 h-6 text-[#1CB0F6]" />
          KI-Generator
        </h1>
        <p className="text-sm text-[#9CA3AF] mt-1">
          PDFs und DOCX-Dokumente hochladen – die KI generiert automatisch Multiple-Choice-Fragen daraus.
        </p>
      </div>

      {/* Upload zone */}
      <AiGeneratorUploadZone onUploadComplete={handleUploadComplete} />

      {/* Jobs section */}
      <section>
        <h2 className="text-lg font-semibold text-[#F9FAFB] mb-3">Verarbeitungs-Jobs</h2>
        {jobsLoading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => <Skeleton key={i} className="h-16 rounded-2xl" />)}
          </div>
        ) : jobs.length === 0 ? (
          <p className="text-sm text-[#9CA3AF] py-4 text-center">
            Noch keine Dokumente hochgeladen. Lade oben eine Datei hoch, um zu starten.
          </p>
        ) : (
          <div className="space-y-3">
            {jobs.map((job) => (
              <AiGeneratorJobCard key={job.id} job={job} onRetry={handleRetry} />
            ))}
          </div>
        )}
      </section>

      {/* Drafts section — always shown after jobs have been loaded */}
      {(completedJobs.length > 0 || drafts.length > 0) && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-[#F9FAFB]">
              Entwurfs-Fragen prüfen
              {pendingDraftCount > 0 && (
                <span className="ml-2 text-sm font-normal text-[#FF9600]">
                  ({pendingDraftCount} ausstehend)
                </span>
              )}
            </h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchDrafts}
              disabled={draftsLoading}
              className="text-[#9CA3AF] hover:text-[#F9FAFB]"
            >
              <RefreshCw className={`w-4 h-4 ${draftsLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>

          {/* Filter bar */}
          <div className="flex flex-wrap gap-3 mb-4">
            <Select
              value={statusFilter}
              onValueChange={(v) => setStatusFilter(v as DraftStatusFilter)}
            >
              <SelectTrigger className="w-[190px] bg-[#1F2937] border-[#4B5563] text-[#F9FAFB]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="bg-[#1F2937] border-[#4B5563] text-[#F9FAFB]">
                <SelectItem value="all">Alle Status</SelectItem>
                <SelectItem value="pending">Ausstehend</SelectItem>
                <SelectItem value="review_required">Überprüfung nötig</SelectItem>
                <SelectItem value="accepted">Akzeptiert</SelectItem>
                <SelectItem value="rejected">Abgelehnt</SelectItem>
              </SelectContent>
            </Select>

            <Select value={subjectFilter} onValueChange={setSubjectFilter}>
              <SelectTrigger className="w-[160px] bg-[#1F2937] border-[#4B5563] text-[#F9FAFB]">
                <SelectValue placeholder="Fach" />
              </SelectTrigger>
              <SelectContent className="bg-[#1F2937] border-[#4B5563] text-[#F9FAFB]">
                <SelectItem value="all">Alle Fächer</SelectItem>
                {SUBJECTS.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={jobFilter} onValueChange={setJobFilter}>
              <SelectTrigger className="w-[210px] bg-[#1F2937] border-[#4B5563] text-[#F9FAFB]">
                <SelectValue placeholder="Datei / Job" />
              </SelectTrigger>
              <SelectContent className="bg-[#1F2937] border-[#4B5563] text-[#F9FAFB]">
                <SelectItem value="all">Alle Dateien</SelectItem>
                {completedJobs.map((j) => (
                  <SelectItem key={j.id} value={j.id}>
                    {j.filename.length > 32 ? `${j.filename.slice(0, 32)}…` : j.filename}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Bulk controls */}
          <div className="flex flex-wrap items-center gap-3 p-4 bg-[#1F2937] border border-[#4B5563] rounded-2xl mb-5">
            <span className="text-sm font-semibold text-[#9CA3AF] whitespace-nowrap">
              Massenaktionen:
            </span>
            <Select value={bulkSubject} onValueChange={setBulkSubject}>
              <SelectTrigger className="w-[145px] bg-[#111827] border-[#4B5563] text-[#F9FAFB]">
                <SelectValue placeholder="Fach setzen" />
              </SelectTrigger>
              <SelectContent className="bg-[#1F2937] border-[#4B5563] text-[#F9FAFB]">
                <SelectItem value="_none">Kein Fach</SelectItem>
                {SUBJECTS.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={bulkDifficulty} onValueChange={setBulkDifficulty}>
              <SelectTrigger className="w-[155px] bg-[#111827] border-[#4B5563] text-[#F9FAFB]">
                <SelectValue placeholder="Schwierigkeit" />
              </SelectTrigger>
              <SelectContent className="bg-[#1F2937] border-[#4B5563] text-[#F9FAFB]">
                <SelectItem value="_none">Keine</SelectItem>
                {DIFFICULTIES.map((d) => (
                  <SelectItem key={d} value={d}>
                    {d.charAt(0).toUpperCase() + d.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex gap-2 ml-auto">
              <Button
                variant="outline"
                onClick={handleBulkReject}
                disabled={bulkLoading !== null}
                className="rounded-xl border-[#FF4B4B] text-[#FF4B4B] hover:bg-[#FF4B4B]/10"
              >
                {bulkLoading === 'reject' ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <XCircle className="w-4 h-4 mr-2" />
                )}
                Alle ablehnen
              </Button>
              <Button
                onClick={handleBulkAccept}
                disabled={bulkLoading !== null}
                className="bg-[#58CC02] hover:bg-[#4CAD02] text-white rounded-xl"
              >
                {bulkLoading === 'accept' ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <CheckCheck className="w-4 h-4 mr-2" />
                )}
                Alle akzeptieren
              </Button>
            </div>
          </div>

          {/* Draft cards */}
          {draftsLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-56 rounded-2xl" />)}
            </div>
          ) : drafts.length === 0 ? (
            <div className="text-center py-14 text-[#9CA3AF]">
              Keine Entwürfe für den gewählten Filter.
            </div>
          ) : (
            <div className="space-y-4">
              {drafts.map((draft) => (
                <AiGeneratorDraftCard
                  key={draft.id}
                  draft={draft}
                  onAccept={handleAcceptDraft}
                  onReject={handleRejectDraft}
                  onEdit={setEditingDraft}
                />
              ))}
            </div>
          )}
        </section>
      )}

      <AiGeneratorDraftEditModal
        draft={editingDraft}
        onClose={() => setEditingDraft(null)}
        onSave={handleEditSave}
      />
    </div>
  )
}
