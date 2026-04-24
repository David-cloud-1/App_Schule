'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import {
  Bot,
  CheckCheck,
  CheckCircle2,
  RefreshCw,
  XCircle,
  Copy,
  Check,
  Upload,
  Info,
  Zap,
  FileJson,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
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
  class_level: 10 | 11 | 12 | null
  status: 'pending' | 'review_required' | 'accepted' | 'rejected'
  expires_at: string
}

const SUBJECTS = ['BGP', 'KSK', 'STG', 'LOP', 'PUG'] as const
const DIFFICULTIES = ['leicht', 'mittel', 'schwer'] as const
type DraftStatusFilter = 'all' | 'pending' | 'review_required' | 'accepted' | 'rejected'

// ── Prompt that produces the exact bulk-import JSON format ────────────────────
const CLAUDE_PROMPT = `Du bist ein Experte für Prüfungsfragen im Bereich Spedition und Logistik (IHK Bayern).

Analysiere den folgenden Dokumentinhalt und erstelle daraus Multiple-Choice-Prüfungsfragen.

FÄCHER:
- BGP = Betriebliche und gesamtwirtschaftliche Prozesse
- KSK = Kaufmännische Steuerung und Kontrolle
- STG = Speditionelle und transportrelevante Geschäftsprozesse
- LOP = Logistische Leistungsprozesse
- PUG = Politik und Gesellschaft

REGELN:
- Genau 5 Antwortoptionen (A, B, C, D, E), davon exakt eine korrekt
- Fragen auf Prüfungsniveau (nicht zu einfach, nicht zu komplex)
- Schwierigkeit: "leicht" (Grundwissen), "mittel" (Anwendung), "schwer" (Analyse/Transfer)
- Erklärung warum die Antwort korrekt ist (1-2 Sätze)
- Maximal 75 Fragen
- klassenstufe: 10, 11 oder 12 — falls nicht eindeutig aus dem Kontext, weglassen (null)

Antworte AUSSCHLIESSLICH mit diesem JSON (kein Text davor/danach, kein Markdown):
{
  "rows": [
    {
      "question_text": "Frage hier?",
      "antwort_a": "Antwort A",
      "antwort_b": "Antwort B",
      "antwort_c": "Antwort C",
      "antwort_d": "Antwort D",
      "antwort_e": "Antwort E",
      "korrekte_antwort": "A",
      "erklaerung": "Erklärung warum A korrekt ist.",
      "fach_code": "BGP",
      "schwierigkeit": "mittel",
      "klassenstufe": 11
    }
  ]
}

--- DOKUMENT ---
[Hier deinen Text einfügen]
--- ENDE ---`

type ParseState =
  | { status: 'empty' }
  | { status: 'invalid'; reason: string }
  | { status: 'no_rows'; reason: string }
  | { status: 'ready'; count: number; parsed: unknown }

// Extrahiert JSON aus beliebigem Text — auch wenn Claude.ai Text davor/danach schreibt
function extractJson(text: string): unknown {
  const trimmed = text.trim()

  // 1. Direkt parsen (reines JSON)
  try { return JSON.parse(trimmed) } catch { /* weiter */ }

  // 2. Aus Markdown-Codeblock extrahieren: ```json ... ``` oder ``` ... ```
  const codeBlockMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (codeBlockMatch) {
    try { return JSON.parse(codeBlockMatch[1].trim()) } catch { /* weiter */ }
  }

  // 3. Erstes { ... } aus dem Text extrahieren (bei vorangestelltem Begleittext)
  const start = trimmed.indexOf('{')
  const end = trimmed.lastIndexOf('}')
  if (start !== -1 && end > start) {
    try { return JSON.parse(trimmed.slice(start, end + 1)) } catch { /* weiter */ }
  }

  throw new Error('Kein JSON gefunden')
}

function analyzeInput(value: string): ParseState {
  if (!value.trim()) return { status: 'empty' }
  try {
    const parsed = extractJson(value) as { rows?: unknown[] }
    if (!parsed || typeof parsed !== 'object') {
      return { status: 'invalid', reason: 'Das ist kein JSON-Objekt. Bitte die vollständige Antwort von Claude.ai einfügen.' }
    }
    if (!('rows' in parsed)) {
      return { status: 'no_rows', reason: 'Das JSON hat kein "rows"-Feld. Hast du den Prompt verändert? Bitte unverändert verwenden.' }
    }
    if (!Array.isArray(parsed.rows) || parsed.rows.length === 0) {
      return { status: 'no_rows', reason: 'Das "rows"-Feld ist leer oder kein Array. Claude.ai hat keine Fragen generiert.' }
    }
    return { status: 'ready', count: parsed.rows.length, parsed }
  } catch {
    return {
      status: 'invalid',
      reason: 'Kein gültiges JSON gefunden. Tipp: Die komplette Antwort von Claude.ai einfügen — auch mit dem Begleittext davor ist kein Problem.',
    }
  }
}

// ── Manual Import Section ─────────────────────────────────────────────────────
function ManualImportSection() {
  const [copied, setCopied] = useState(false)
  const [jsonInput, setJsonInput] = useState('')
  const [importing, setImporting] = useState(false)
  const [parseState, setParseState] = useState<ParseState>({ status: 'empty' })

  async function copyPrompt() {
    await navigator.clipboard.writeText(CLAUDE_PROMPT)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleJsonChange(value: string) {
    setJsonInput(value)
    setParseState(analyzeInput(value))
  }

  async function handleImport() {
    if (parseState.status !== 'ready') return

    setImporting(true)
    try {
      const res = await fetch('/api/admin/questions/bulk-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parseState.parsed),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        if (data?.error === 'Invalid payload') {
          // Zod-Fehlerdetails übersetzen
          const fieldErrors: string[] = []
          const details = data?.details?.fieldErrors ?? {}
          if (details['rows']) fieldErrors.push('rows: ' + details['rows'].join(', '))
          const hint = fieldErrors.length > 0
            ? `Formatfehler: ${fieldErrors.join(' · ')}`
            : 'Das JSON-Format stimmt nicht. Hast du den Prompt unverändert verwendet?'
          toast.error(hint)
        } else {
          toast.error(data?.error ?? 'Import fehlgeschlagen')
        }
        return
      }
      toast.success(`Fertig! ${data.imported ?? 0} Fragen importiert${data.skipped > 0 ? ` (${data.skipped} übersprungen)` : ''}.`)
      setJsonInput('')
      setParseState({ status: 'empty' })
    } catch {
      toast.error('Netzwerkfehler — bitte Internetverbindung prüfen.')
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="rounded-2xl border border-[#4B5563] bg-[#1F2937] p-5 space-y-5">
      {/* Step 1 */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[#1CB0F6] text-white text-xs font-bold shrink-0">1</span>
          <p className="text-sm font-semibold text-[#F9FAFB]">
            Prompt kopieren und in{' '}
            <a
              href="https://claude.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#1CB0F6] hover:underline"
            >
              claude.ai
            </a>{' '}
            öffnen
          </p>
        </div>
        <div className="relative">
          <pre className="text-xs text-[#9CA3AF] bg-[#111827] rounded-xl p-4 overflow-auto max-h-48 leading-relaxed whitespace-pre-wrap">
            {CLAUDE_PROMPT}
          </pre>
          <Button
            size="sm"
            variant="ghost"
            onClick={copyPrompt}
            className="absolute top-2 right-2 text-[#9CA3AF] hover:text-[#F9FAFB] bg-[#1F2937]/80"
          >
            {copied ? (
              <Check className="w-4 h-4 text-[#58CC02]" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
            <span className="ml-1 text-xs">{copied ? 'Kopiert!' : 'Kopieren'}</span>
          </Button>
        </div>
        <p className="text-xs text-[#9CA3AF]">
          💡 Ersetze <code className="bg-[#111827] px-1 rounded">[Hier deinen Text einfügen]</code> mit dem Inhalt deines Dokuments (copy-paste aus PDF/Word reicht).
        </p>
      </div>

      {/* Step 2 */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[#1CB0F6] text-white text-xs font-bold shrink-0">2</span>
          <p className="text-sm font-semibold text-[#F9FAFB]">
            Vollständige Antwort von Claude.ai hier einfügen
          </p>
        </div>
        <Textarea
          value={jsonInput}
          onChange={(e) => handleJsonChange(e.target.value)}
          placeholder={'Die komplette Antwort von Claude.ai einfügen — Begleittext und ```json ... ``` werden automatisch ignoriert.\n\nBeispiel:\n{\n  "rows": [\n    { "question_text": "Was ist...", "antwort_a": "...", ... }\n  ]\n}'}
          className="font-mono text-xs bg-[#111827] border-[#4B5563] text-[#F9FAFB] rounded-xl min-h-[140px] placeholder:text-[#4B5563]"
        />

        {/* Zustandsanzeige */}
        {parseState.status === 'ready' && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#58CC02]/10 border border-[#58CC02]/30">
            <CheckCircle2 className="w-4 h-4 text-[#58CC02] shrink-0" />
            <p className="text-xs text-[#58CC02] font-medium">
              {parseState.count} {parseState.count === 1 ? 'Frage' : 'Fragen'} erkannt — bereit zum Import
            </p>
          </div>
        )}
        {(parseState.status === 'invalid' || parseState.status === 'no_rows') && (
          <div className="flex items-start gap-2 px-3 py-2 rounded-xl bg-[#FF4B4B]/10 border border-[#FF4B4B]/30">
            <XCircle className="w-4 h-4 text-[#FF4B4B] shrink-0 mt-0.5" />
            <p className="text-xs text-[#FF4B4B]">{parseState.reason}</p>
          </div>
        )}
      </div>

      {/* Step 3 */}
      <div className="flex items-center gap-2">
        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[#1CB0F6] text-white text-xs font-bold shrink-0">3</span>
        <Button
          onClick={handleImport}
          disabled={importing || parseState.status !== 'ready'}
          className="bg-[#58CC02] hover:bg-[#4CAD02] text-white rounded-xl"
        >
          {importing ? (
            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Upload className="w-4 h-4 mr-2" />
          )}
          {parseState.status === 'ready'
            ? `${parseState.count} Fragen importieren`
            : 'Fragen importieren'}
        </Button>
        <p className="text-xs text-[#9CA3AF]">
          Fragen werden sofort aktiv im Quiz sichtbar.
        </p>
      </div>
    </div>
  )
}

// ── API Auto-Generation Section (collapsible) ─────────────────────────────────
function AutoGenerationSection({
  jobs,
  jobsLoading,
  onUploadComplete,
  onRetry,
}: {
  jobs: GenerationJob[]
  jobsLoading: boolean
  onUploadComplete: (job: GenerationJob) => void
  onRetry: (jobId: string) => Promise<void>
}) {
  const [open, setOpen] = useState(false)

  return (
    <div className="rounded-2xl border border-[#4B5563] bg-[#1F2937] overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between p-5 text-left hover:bg-[#374151] transition-colors"
      >
        <div className="flex items-center gap-3">
          <Zap className="w-5 h-5 text-[#FF9600]" />
          <div>
            <p className="text-sm font-semibold text-[#F9FAFB]">
              Automatische Generierung{' '}
              <Badge className="ml-2 bg-[#FF9600]/20 text-[#FF9600] border-[#FF9600]/30 text-xs">
                Benötigt API-Key
              </Badge>
            </p>
            <p className="text-xs text-[#9CA3AF] mt-0.5">
              PDF/DOCX hochladen → KI generiert Fragen vollautomatisch (Anthropic API erforderlich)
            </p>
          </div>
        </div>
        {open ? (
          <ChevronUp className="w-4 h-4 text-[#9CA3AF] shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-[#9CA3AF] shrink-0" />
        )}
      </button>

      {open && (
        <div className="px-5 pb-5 space-y-5 border-t border-[#4B5563]">
          {/* API Key hint */}
          <div className="flex gap-3 p-4 rounded-xl bg-[#FF9600]/10 border border-[#FF9600]/30 mt-4">
            <Info className="w-4 h-4 text-[#FF9600] shrink-0 mt-0.5" />
            <div className="text-xs text-[#F9FAFB] space-y-1">
              <p className="font-semibold text-[#FF9600]">ANTHROPIC_API_KEY erforderlich</p>
              <p>
                Diese Funktion benötigt einen eigenen API-Key von{' '}
                <a
                  href="https://console.anthropic.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline text-[#1CB0F6]"
                >
                  console.anthropic.com
                </a>
                . Einmalig ~€5 aufladen reicht für alle Dokumente deiner gesamten Ausbildung (~30–40 Dokumente).
              </p>
              <p>
                Key in <code className="bg-[#111827] px-1 rounded">.env.local</code> eintragen:{' '}
                <code className="bg-[#111827] px-1 rounded">ANTHROPIC_API_KEY=sk-ant-...</code>
              </p>
            </div>
          </div>

          <AiGeneratorUploadZone onUploadComplete={onUploadComplete} />

          <section>
            <h3 className="text-base font-semibold text-[#F9FAFB] mb-3">Verarbeitungs-Jobs</h3>
            {jobsLoading ? (
              <div className="space-y-3">
                {[1, 2].map((i) => <Skeleton key={i} className="h-16 rounded-2xl" />)}
              </div>
            ) : jobs.length === 0 ? (
              <p className="text-sm text-[#9CA3AF] py-4 text-center">
                Noch keine Dokumente hochgeladen.
              </p>
            ) : (
              <div className="space-y-3">
                {jobs.map((job) => (
                  <AiGeneratorJobCard key={job.id} job={job} onRetry={onRetry} />
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
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

  useEffect(() => {
    const sb = supabase.current
    const channel = sb
      .channel('admin-generation-jobs')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'generation_jobs' }, (payload) => {
        const updated = payload.new as GenerationJob
        setJobs((prev) => {
          const exists = prev.find((j) => j.id === updated.id)
          if (!exists) return [updated, ...prev]
          return prev.map((j) => (j.id === updated.id ? updated : j))
        })
        if (updated.status === 'completed') fetchDrafts()
      })
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
    const ids = drafts.filter((d) => d.status === 'pending').map((d) => d.id)
    if (ids.length === 0) { toast.info('Keine akzeptierbaren Entwürfe im aktuellen Filter'); return }
    setBulkLoading('accept')
    try {
      const body: Record<string, unknown> = { draft_ids: ids }
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
        body: JSON.stringify({ draft_ids: ids }),
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
          Lernmaterial in Claude.ai einfügen und Fragen automatisch generieren lassen.
        </p>
      </div>

      {/* ── Workflow 1: Manual (Claude.ai) ── */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <FileJson className="w-5 h-5 text-[#58CC02]" />
          <h2 className="text-base font-semibold text-[#F9FAFB]">
            Methode 1: Claude.ai (kostenlos, empfohlen)
          </h2>
          <Badge className="bg-[#58CC02]/20 text-[#58CC02] border-[#58CC02]/30 text-xs">
            Kein API-Key nötig
          </Badge>
        </div>
        <ManualImportSection />
      </section>

      {/* ── Workflow 2: Auto (API) ── */}
      <section className="space-y-3">
        <AutoGenerationSection
          jobs={jobs}
          jobsLoading={jobsLoading}
          onUploadComplete={handleUploadComplete}
          onRetry={handleRetry}
        />
      </section>

      {/* ── Draft review (from auto-generation) ── */}
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

          <div className="flex flex-wrap gap-3 mb-4">
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as DraftStatusFilter)}>
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
                {SUBJECTS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
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
                {SUBJECTS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>

            <Select value={bulkDifficulty} onValueChange={setBulkDifficulty}>
              <SelectTrigger className="w-[155px] bg-[#111827] border-[#4B5563] text-[#F9FAFB]">
                <SelectValue placeholder="Schwierigkeit" />
              </SelectTrigger>
              <SelectContent className="bg-[#1F2937] border-[#4B5563] text-[#F9FAFB]">
                <SelectItem value="_none">Keine</SelectItem>
                {DIFFICULTIES.map((d) => (
                  <SelectItem key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</SelectItem>
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
                {bulkLoading === 'reject' ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <XCircle className="w-4 h-4 mr-2" />}
                Alle ablehnen
              </Button>
              <Button
                onClick={handleBulkAccept}
                disabled={bulkLoading !== null}
                className="bg-[#58CC02] hover:bg-[#4CAD02] text-white rounded-xl"
              >
                {bulkLoading === 'accept' ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <CheckCheck className="w-4 h-4 mr-2" />}
                Alle akzeptieren
              </Button>
            </div>
          </div>

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
