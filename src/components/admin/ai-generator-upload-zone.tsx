'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { FileText, Loader2, Upload, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useClassLevelOptions } from '@/components/department-provider'

export type GenerationJob = {
  id: string
  filename: string
  file_size: number
  status: 'uploading' | 'processing' | 'completed' | 'error'
  questions_generated: number | null
  error_message: string | null
  created_at: string
  subject_code: string | null
  topic_id: string | null
}

type Subject = { id: string; code: string; name: string }
type Topic = { id: string; name: string }

const MAX_SIZE_BYTES = 50 * 1024 * 1024
const ACCEPTED_MIME = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]

interface Props {
  onUploadComplete: (job: GenerationJob) => void
}

type PendingFile = { file: File; error?: string }

export function AiGeneratorUploadZone({ onUploadComplete }: Props) {
  const classLevelOptions = useClassLevelOptions()
  const [pending, setPending] = useState<PendingFile[]>([])
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [classLevel, setClassLevel] = useState<string>('all')

  const [subjects, setSubjects] = useState<Subject[]>([])
  const [subjectCode, setSubjectCode] = useState<string>('all')
  const [topics, setTopics] = useState<Topic[]>([])
  const [topicId, setTopicId] = useState<string>('all')
  const [loadingTopics, setLoadingTopics] = useState(false)

  const inputRef = useRef<HTMLInputElement>(null)

  // Load subjects on mount
  useEffect(() => {
    fetch('/api/admin/subjects')
      .then((r) => r.json())
      .then((data) => setSubjects(data.subjects ?? []))
      .catch(() => {})
  }, [])

  // Load topics when subject changes
  useEffect(() => {
    setTopicId('all')
    setTopics([])
    if (subjectCode === 'all') return
    const subject = subjects.find((s) => s.code === subjectCode)
    if (!subject) return
    setLoadingTopics(true)
    fetch(`/api/admin/topics?subject_id=${subject.id}`)
      .then((r) => r.json())
      .then((data) => setTopics(data.topics ?? []))
      .catch(() => {})
      .finally(() => setLoadingTopics(false))
  }, [subjectCode, subjects])

  function addFiles(files: FileList | File[]) {
    const arr = Array.from(files)
    const validated: PendingFile[] = arr.map((f) => {
      if (!ACCEPTED_MIME.includes(f.type)) return { file: f, error: 'Nur PDF und DOCX erlaubt' }
      if (f.size > MAX_SIZE_BYTES) return { file: f, error: 'Datei zu groß (max. 50 MB)' }
      return { file: f }
    })
    setPending((prev) => {
      const existing = new Set(prev.map((p) => p.file.name))
      return [...prev, ...validated.filter((v) => !existing.has(v.file.name))]
    })
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    addFiles(e.dataTransfer.files)
  }, [])

  function formatSize(bytes: number) {
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  async function handleUpload() {
    const valid = pending.filter((p) => !p.error)
    if (valid.length === 0) { toast.error('Keine gültigen Dateien ausgewählt'); return }
    setUploading(true)
    for (const { file } of valid) {
      try {
        const form = new FormData()
        form.append('file', file)
        if (classLevel !== 'all') form.append('class_level', classLevel)
        if (subjectCode !== 'all') form.append('subject_code', subjectCode)
        if (topicId !== 'all') form.append('topic_id', topicId)
        const res = await fetch('/api/admin/ai-generate/upload', { method: 'POST', body: form })
        const json = await res.json()
        if (!res.ok) { toast.error(`"${file.name}": ${json.error ?? 'Upload fehlgeschlagen'}`); continue }
        onUploadComplete(json.job as GenerationJob)
      } catch {
        toast.error(`"${file.name}": Netzwerkfehler`)
      }
    }
    setUploading(false)
    setPending([])
  }

  const selectedSubject = subjects.find((s) => s.code === subjectCode)

  return (
    <div className="space-y-4">
      {/* Metadata selectors */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Klassenstufe */}
        <div className="space-y-1.5">
          <Label className="text-ws-text text-sm">Klassenstufe</Label>
          <Select value={classLevel} onValueChange={setClassLevel}>
            <SelectTrigger className="bg-ws-bg border-ws-line text-ws-text">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-ws-surface border-ws-line text-ws-text">
              <SelectItem value="all">Alle Klassenstufen</SelectItem>
              {classLevelOptions.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Fach */}
        <div className="space-y-1.5">
          <Label className="text-ws-text text-sm">Fach</Label>
          <Select value={subjectCode} onValueChange={setSubjectCode}>
            <SelectTrigger className="bg-ws-bg border-ws-line text-ws-text">
              <SelectValue placeholder="Fach wählen…" />
            </SelectTrigger>
            <SelectContent className="bg-ws-surface border-ws-line text-ws-text">
              <SelectItem value="all">Alle Fächer</SelectItem>
              {subjects.map((s) => (
                <SelectItem key={s.id} value={s.code}>{s.code} – {s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Thema */}
        <div className="space-y-1.5">
          <Label className="text-ws-text text-sm">
            Thema
            {subjectCode !== 'all' && loadingTopics && (
              <Loader2 className="inline w-3 h-3 ml-1 animate-spin text-ws-muted" />
            )}
          </Label>
          <Select
            value={topicId}
            onValueChange={setTopicId}
            disabled={subjectCode === 'all' || loadingTopics}
          >
            <SelectTrigger className="bg-ws-bg border-ws-line text-ws-text disabled:opacity-50">
              <SelectValue placeholder={subjectCode === 'all' ? 'Erst Fach wählen' : 'Thema wählen…'} />
            </SelectTrigger>
            <SelectContent className="bg-ws-surface border-ws-line text-ws-text">
              <SelectItem value="all">Kein Thema</SelectItem>
              {topics.map((t) => (
                <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Context hint */}
      {(subjectCode !== 'all' || topicId !== 'all') && (
        <p className="text-xs text-ws-muted">
          Claude generiert Fragen gezielt für{' '}
          {selectedSubject ? <span className="text-ws-blue">{selectedSubject.code}</span> : null}
          {topicId !== 'all' && topics.length > 0 && (
            <> · <span className="text-ws-blue">{topics.find((t) => t.id === topicId)?.name}</span></>
          )}
          {' '}— alle Entwürfe kommen direkt mit diesen Werten importiert.
        </p>
      )}
      {subjectCode === 'all' && (
        <p className="text-xs text-ws-muted">
          Fach und Thema werden auf alle generierten Entwürfe angewendet — im Entwurfs-Editor nachträglich änderbar.
        </p>
      )}

      {/* Drop zone */}
      <div
        className={`border-2 border-dashed rounded-2xl p-10 text-center transition-colors cursor-pointer select-none ${
          dragOver
            ? 'border-ws-green bg-ws-green/5'
            : 'border-ws-line hover:border-ws-muted bg-ws-surface'
        }`}
        onDrop={onDrop}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onClick={() => inputRef.current?.click()}
        role="button"
        aria-label="Datei hochladen"
      >
        <Upload className="w-10 h-10 text-ws-muted mx-auto mb-3" />
        <p className="text-ws-text font-semibold">PDF oder DOCX hier ablegen</p>
        <p className="text-sm text-ws-muted mt-1">
          oder klicken zum Auswählen · mehrere Dateien möglich · max. 50 MB pro Datei
        </p>
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          multiple
          onChange={(e) => e.target.files && addFiles(e.target.files)}
        />
      </div>

      {pending.length > 0 && (
        <div className="space-y-2">
          {pending.map(({ file, error }) => (
            <div
              key={file.name}
              className={`flex items-center gap-3 p-3 rounded-xl border ${
                error ? 'border-ws-red bg-ws-red/5' : 'border-ws-line bg-ws-surface'
              }`}
            >
              <FileText className={`w-5 h-5 flex-shrink-0 ${error ? 'text-ws-red' : 'text-ws-blue'}`} />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-ws-text truncate">{file.name}</p>
                {error ? (
                  <p className="text-xs text-ws-red">{error}</p>
                ) : (
                  <p className="text-xs text-ws-muted">{formatSize(file.size)}</p>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => { e.stopPropagation(); setPending((p) => p.filter((x) => x.file.name !== file.name)) }}
                className="text-ws-muted hover:text-ws-red flex-shrink-0"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ))}

          <div className="flex justify-end">
            <Button
              onClick={handleUpload}
              disabled={uploading || pending.every((p) => p.error)}
              className="bg-ws-green hover:bg-ws-green-hover text-ws-on-accent rounded-xl"
            >
              {uploading ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Wird hochgeladen…</>
              ) : (
                <><Upload className="w-4 h-4 mr-2" />{pending.filter((p) => !p.error).length} Datei(en) hochladen</>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
