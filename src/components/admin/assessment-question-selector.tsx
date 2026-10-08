'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { AlertTriangle, FileUp, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { QuestionPicker, type PickerQuestion } from './question-picker'

type ExtractedQuestion = {
  question_text: string
  options: string[]
  correct_index: number | null
  needs_review: boolean
  fach_code: string | null
}

type ImportStep = 'file' | 'extracting' | 'preview' | 'importing'

const OPTION_LETTERS = ['A', 'B', 'C', 'D', 'E']

interface Props {
  selectedIds: Set<string>
  onChange: (next: Set<string>) => void
  /** Wird nach jedem Laden der Fragenliste aufgerufen (z. B. um übersprungene Set-Fragen zu zählen) */
  onLoaded?: (questions: PickerQuestion[]) => void
}

/**
 * Lädt die wählbaren Fragen eines Prüfungsteils (aktiv, Multiple-Choice, eigener
 * Fachbereich) und zeigt die Fragenauswahl samt Datei-Import.
 */
export function AssessmentQuestionSelector({ selectedIds, onChange, onLoaded }: Props) {
  const [questions, setQuestions] = useState<PickerQuestion[]>([])
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const [importOpen, setImportOpen] = useState(false)

  // Antworten eines früheren Ladevorgangs (Unmount) werden verworfen
  const requestRef = useRef(0)

  const load = useCallback(async () => {
    const requestId = ++requestRef.current
    setLoading(true)
    setFailed(false)
    try {
      const res = await fetch('/api/admin/assessments/questions')
      if (requestId !== requestRef.current) return
      if (!res.ok) {
        setFailed(true)
        return
      }
      const data = await res.json()
      if (requestId !== requestRef.current) return
      const list: PickerQuestion[] = data.questions ?? []
      setQuestions(list)
      onLoaded?.(list)
    } catch {
      if (requestId === requestRef.current) setFailed(true)
    } finally {
      if (requestId === requestRef.current) setLoading(false)
    }
    // onLoaded bewusst nicht als Abhängigkeit: es soll nur einmal laden
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    load()
    // Unmount: laufende Anfrage entwerten
    return () => {
      // Zähler, kein DOM-Knoten: der aktuelle Wert beim Unmount ist gewollt
      // eslint-disable-next-line react-hooks/exhaustive-deps
      requestRef.current++
    }
  }, [load])

  function handleImported(imported: PickerQuestion[]) {
    setQuestions((prev) => [...imported, ...prev])
    const next = new Set(selectedIds)
    imported.forEach((q) => next.add(q.id))
    onChange(next)
  }

  if (loading) {
    return (
      <div className="space-y-2" aria-busy="true">
        <Skeleton className="h-10 w-full rounded-xl" />
        <Skeleton className="h-10 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    )
  }

  if (failed) {
    return (
      <div className="rounded-xl border border-[#4B5563] bg-[#111827] p-4 text-center">
        <p className="text-sm text-[#9CA3AF]">Fragen konnten nicht geladen werden.</p>
        <Button type="button" variant="outline" size="sm" onClick={load} className="mt-3 rounded-xl border-[#4B5563] text-[#9CA3AF]">
          Erneut versuchen
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <QuestionPicker questions={questions} selectedIds={selectedIds} onChange={onChange} />
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setImportOpen(true)}
        className="min-h-11 rounded-xl border-[#4B5563] text-[#9CA3AF] hover:text-[#F9FAFB]"
      >
        <FileUp size={14} className="mr-1.5" />
        Fragen aus Datei importieren
      </Button>
      <ImportDialog open={importOpen} onOpenChange={setImportOpen} onImported={handleImported} />
    </div>
  )
}

function ImportDialog({
  open,
  onOpenChange,
  onImported,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onImported: (questions: PickerQuestion[]) => void
}) {
  const [step, setStep] = useState<ImportStep>('file')
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<ExtractedQuestion[]>([])
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    setStep('file')
    setFile(null)
    setPreview([])
    setError(null)
  }, [open])

  const unresolved = preview.filter((q) => q.correct_index === null).length

  async function handleExtract() {
    if (!file) {
      setError('Bitte eine Datei wählen.')
      return
    }
    setError(null)
    setStep('extracting')
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/admin/exam-sets/extract', { method: 'POST', body: fd })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setStep('file')
        setError(data?.error ?? 'Auslesen fehlgeschlagen.')
        return
      }
      setPreview(data.questions ?? [])
      setStep('preview')
    } catch {
      setStep('file')
      setError('Netzwerkfehler beim Auslesen.')
    }
  }

  async function handleConfirm() {
    if (unresolved > 0) return
    setStep('importing')
    setError(null)
    try {
      const res = await fetch('/api/admin/assessments/questions/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questions: preview }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setStep('preview')
        setError(data?.error ?? 'Import fehlgeschlagen.')
        return
      }
      onImported(data.questions ?? [])
      toast.success(`${(data.questions ?? []).length} Fragen importiert und ausgewählt`)
      onOpenChange(false)
    } catch {
      setStep('preview')
      setError('Netzwerkfehler beim Import.')
    }
  }

  const busy = step === 'extracting' || step === 'importing'

  return (
    <Dialog open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
      <DialogContent className="bg-[#1F2937] border-[#4B5563] text-[#F9FAFB] max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Fragen aus Datei importieren</DialogTitle>
          <DialogDescription className="text-[#9CA3AF]">
            PDF oder Word mit Multiple-Choice-Fragen. Es entsteht kein Prüfungsset — die Fragen werden direkt zur Auswahl hinzugefügt.
            Sie sind danach sofort aktiv und auch im Übungsbetrieb sichtbar (bis der Nachweis geöffnet wird) und bleiben bestehen, wenn du den Nachweis nicht anlegst.
          </DialogDescription>
        </DialogHeader>

        {(step === 'file' || step === 'extracting') && (
          <div className="space-y-3">
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.doc,.docx"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="hidden"
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => fileRef.current?.click()}
              disabled={step === 'extracting'}
              className="min-h-11 w-full justify-start rounded-xl border-[#4B5563] text-[#F9FAFB]"
            >
              <FileUp size={16} className="mr-2 shrink-0" />
              <span className="truncate">{file ? file.name : 'Datei wählen…'}</span>
            </Button>
          </div>
        )}

        {(step === 'preview' || step === 'importing') && (
          <div className="space-y-3">
            <p className="text-sm text-[#9CA3AF]">{preview.length} Fragen erkannt.</p>
            {unresolved > 0 && (
              <Alert className="border-[#FF9600]/50 bg-[#FF9600]/10 text-[#FF9600]">
                <AlertTriangle className="size-4" />
                <AlertDescription className="text-[#FF9600]">
                  Bei {unresolved} Fragen wurde keine richtige Antwort erkannt. Bitte wählen — sonst entsteht ein falscher Lösungsschlüssel in einer Note.
                </AlertDescription>
              </Alert>
            )}
            <div className="max-h-80 space-y-3 overflow-y-auto rounded-xl bg-[#111827] p-3">
              {preview.map((q, i) => (
                <div key={i} className="space-y-1.5 border-b border-[#374151] pb-3 last:border-0 last:pb-0">
                  <p className="text-xs leading-snug text-[#F9FAFB]">{q.question_text}</p>
                  <Select
                    value={q.correct_index === null ? undefined : String(q.correct_index)}
                    onValueChange={(v) =>
                      setPreview((prev) => prev.map((p, j) => (j === i ? { ...p, correct_index: Number(v), needs_review: false } : p)))
                    }
                  >
                    <SelectTrigger
                      aria-label={`Richtige Antwort für Frage ${i + 1}`}
                      className={`rounded-xl bg-[#1F2937] text-[#F9FAFB] ${q.correct_index === null ? 'border-[#FF9600]' : 'border-[#4B5563]'}`}
                    >
                      <SelectValue placeholder="Richtige Antwort wählen…" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1F2937] border-[#4B5563] text-[#F9FAFB]">
                      {q.options.map((o, j) => (
                        <SelectItem key={j} value={String(j)}>
                          {OPTION_LETTERS[j]}: {o.slice(0, 80)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          </div>
        )}

        {error && <p className="text-sm text-[#FF4B4B]">{error}</p>}

        <DialogFooter className="gap-2">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>
            Abbrechen
          </Button>
          {(step === 'file' || step === 'extracting') && (
            <Button
              type="button"
              onClick={handleExtract}
              disabled={busy || !file}
              className="rounded-xl bg-[#58CC02] hover:bg-[#4CAD02] text-white"
            >
              {step === 'extracting' && <Loader2 className="mr-2 size-4 animate-spin" />}
              {step === 'extracting' ? 'Wird ausgelesen…' : 'Auslesen'}
            </Button>
          )}
          {(step === 'preview' || step === 'importing') && (
            <Button
              type="button"
              onClick={handleConfirm}
              disabled={busy || unresolved > 0 || preview.length === 0}
              className="rounded-xl bg-[#58CC02] hover:bg-[#4CAD02] text-white"
            >
              {step === 'importing' && <Loader2 className="mr-2 size-4 animate-spin" />}
              {preview.length} Fragen hinzufügen
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
