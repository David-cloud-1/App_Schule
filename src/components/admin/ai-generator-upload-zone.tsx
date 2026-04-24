'use client'

import { useCallback, useRef, useState } from 'react'
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

export type GenerationJob = {
  id: string
  filename: string
  file_size: number
  status: 'uploading' | 'processing' | 'completed' | 'error'
  questions_generated: number | null
  error_message: string | null
  created_at: string
}

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
  const [pending, setPending] = useState<PendingFile[]>([])
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [classLevel, setClassLevel] = useState<string>('all')
  const inputRef = useRef<HTMLInputElement>(null)

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
        if (classLevel !== 'all') {
          form.append('class_level', classLevel)
        }
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

  return (
    <div className="space-y-4">
      {/* Class level selector */}
      <div className="space-y-1.5">
        <Label className="text-[#F9FAFB]">
          Klassenstufe <span className="text-[#FF4B4B]">*</span>
        </Label>
        <Select value={classLevel} onValueChange={setClassLevel}>
          <SelectTrigger className="bg-[#111827] border-[#4B5563] text-[#F9FAFB] w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-[#1F2937] border-[#4B5563] text-[#F9FAFB]">
            <SelectItem value="all">Alle Klassenstufen</SelectItem>
            <SelectItem value="10">Klasse 10</SelectItem>
            <SelectItem value="11">Klasse 11</SelectItem>
            <SelectItem value="12">Klasse 12</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-[#9CA3AF]">
          Wird auf alle generierten Entwürfe angewendet — im Entwurfs-Editor nachträglich änderbar.
        </p>
      </div>

      <div
        className={`border-2 border-dashed rounded-2xl p-10 text-center transition-colors cursor-pointer select-none ${
          dragOver
            ? 'border-[#58CC02] bg-[#58CC02]/5'
            : 'border-[#4B5563] hover:border-[#9CA3AF] bg-[#1F2937]'
        }`}
        onDrop={onDrop}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onClick={() => inputRef.current?.click()}
        role="button"
        aria-label="Datei hochladen"
      >
        <Upload className="w-10 h-10 text-[#9CA3AF] mx-auto mb-3" />
        <p className="text-[#F9FAFB] font-semibold">PDF oder DOCX hier ablegen</p>
        <p className="text-sm text-[#9CA3AF] mt-1">
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
                error ? 'border-[#FF4B4B] bg-[#FF4B4B]/5' : 'border-[#4B5563] bg-[#1F2937]'
              }`}
            >
              <FileText className={`w-5 h-5 flex-shrink-0 ${error ? 'text-[#FF4B4B]' : 'text-[#1CB0F6]'}`} />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-[#F9FAFB] truncate">{file.name}</p>
                {error ? (
                  <p className="text-xs text-[#FF4B4B]">{error}</p>
                ) : (
                  <p className="text-xs text-[#9CA3AF]">{formatSize(file.size)}</p>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => { e.stopPropagation(); setPending((p) => p.filter((x) => x.file.name !== file.name)) }}
                className="text-[#9CA3AF] hover:text-[#FF4B4B] flex-shrink-0"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ))}

          <div className="flex justify-end">
            <Button
              onClick={handleUpload}
              disabled={uploading || pending.every((p) => p.error)}
              className="bg-[#58CC02] hover:bg-[#4CAD02] text-white rounded-xl"
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
