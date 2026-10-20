'use client'

import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { AlertTriangle, ArrowLeft, Check, ClipboardCopy, FileUp, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { assessQuestionQuality, MIN_MATERIAL_CHARS } from '@/lib/assessment-import'
import { buildFixPrompt, type FlaggedRow, type ImportRow } from '@/lib/question-import'
import type { PickerQuestion } from './question-picker'

type Step = 'material' | 'prompt' | 'answer' | 'preview' | 'importing'

/** Antwort von /api/admin/assessments/questions/preview */
interface PreviewItem {
  question_text: string
  options: string[]
  correct_index: number | null
  explanation: string | null
  fach_code: string
  fach_defaulted: boolean
  difficulty: 'leicht' | 'mittel' | 'schwer'
  class_level: number | null
  needs_review: boolean
  errors: string[]
  duplicate: boolean
}

const LETTERS = ['A', 'B', 'C', 'D', 'E'] as const
const STEP_LABEL: Record<Exclude<Step, 'importing'>, string> = {
  material: '1 von 4 · Material',
  prompt: '2 von 4 · Prompt kopieren',
  answer: '3 von 4 · Antwort einfügen',
  preview: '4 von 4 · Vorschau',
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  onImported: (questions: PickerQuestion[]) => void
}

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

/**
 * PROJ-38: Fragen für einen Nachweis aus Aufgaben- und Lösungsblatt erzeugen —
 * ohne KI-Schlüssel. Die App baut den Prompt, der Ausbilder lässt ihn in einem
 * kostenlosen KI-Chat beantworten und fügt die Antwort hier wieder ein.
 */
export function AssessmentImportDialog({ open, onOpenChange, onImported }: Props) {
  const [step, setStep] = useState<Step>('material')
  const [task, setTask] = useState('')
  const [solution, setSolution] = useState('')
  const [reading, setReading] = useState<'task' | 'solution' | null>(null)
  const [prompt, setPrompt] = useState('')
  const [tooLong, setTooLong] = useState(false)
  const [targetGroup, setTargetGroup] = useState('')
  const [copied, setCopied] = useState(false)
  const [answer, setAnswer] = useState('')
  const [items, setItems] = useState<PreviewItem[]>([])
  const [skipped, setSkipped] = useState<string[]>([])
  const [included, setIncluded] = useState<Set<number>>(new Set())
  const [confirmed, setConfirmed] = useState<Set<number>>(new Set())
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const taskFileRef = useRef<HTMLInputElement>(null)
  const solutionFileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    setStep('material')
    setTask('')
    setSolution('')
    setPrompt('')
    setAnswer('')
    setItems([])
    setSkipped([])
    setIncluded(new Set())
    setConfirmed(new Set())
    setError(null)
    setCopied(false)
  }, [open])

  async function readFile(kind: 'task' | 'solution', file: File) {
    setError(null)
    setReading(kind)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/admin/assessments/questions/material', { method: 'POST', body: fd })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data?.error ?? 'Datei konnte nicht gelesen werden.')
        return
      }
      if (kind === 'task') setTask(data.text)
      else setSolution(data.text)
    } catch {
      setError('Netzwerkfehler beim Auslesen der Datei.')
    } finally {
      setReading(null)
    }
  }

  async function buildPrompt() {
    setError(null)
    setBusy(true)
    try {
      const res = await fetch('/api/admin/assessments/questions/prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task, solution: solution.trim() || null }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data?.error ?? 'Prompt konnte nicht erstellt werden.')
        return
      }
      setPrompt(data.prompt)
      setTooLong(!!data.tooLong)
      setTargetGroup(data.targetGroup ?? '')
      setCopied(false)
      setStep('prompt')
    } catch {
      setError('Netzwerkfehler.')
    } finally {
      setBusy(false)
    }
  }

  async function copy(text: string) {
    const ok = await copyToClipboard(text)
    if (ok) {
      setCopied(true)
      toast.success('In die Zwischenablage kopiert')
    } else {
      toast.error('Kopieren nicht möglich – bitte den Text im Feld markieren und manuell kopieren.')
    }
  }

  async function checkAnswer() {
    setError(null)
    setBusy(true)
    try {
      const res = await fetch('/api/admin/assessments/questions/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answer }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data?.error ?? 'Antwort konnte nicht geprüft werden.')
        return
      }
      const list: PreviewItem[] = data.items ?? []
      setItems(list)
      setSkipped(data.skipped ?? [])
      // Vorauswahl: nur Fragen ohne Fehler, ohne Duplikat und mit gesichertem Schlüssel
      setIncluded(new Set(list.map((q, i) => (q.errors.length === 0 && !q.duplicate && !q.needs_review ? i : -1)).filter((i) => i >= 0)))
      setConfirmed(new Set())
      setStep('preview')
    } catch {
      setError('Netzwerkfehler.')
    } finally {
      setBusy(false)
    }
  }

  function setCorrect(i: number, index: number) {
    setItems((prev) => prev.map((q, j) => (j === i ? { ...q, correct_index: index } : q)))
    setConfirmed((prev) => new Set(prev).add(i))
  }

  function toggle(i: number, on: boolean) {
    setIncluded((prev) => {
      const next = new Set(prev)
      if (on) next.add(i)
      else next.delete(i)
      return next
    })
  }

  // Torwächter läuft nach jeder Änderung der richtigen Antwort neu (rein im Browser, ohne KI)
  const quality = items.map((q) => assessQuestionQuality(q))
  const importable = (i: number) => {
    const q = items[i]
    return (
      q.errors.length === 0 &&
      !q.duplicate &&
      q.correct_index !== null &&
      (!q.needs_review || confirmed.has(i)) &&
      quality[i].blockers.length === 0
    )
  }
  const selected = [...included].filter(importable).sort((a, b) => a - b)

  function fixPrompt(): string {
    const flagged: FlaggedRow[] = items
      .map((q, index) => ({ q, index }))
      .filter(({ index }) => quality[index].blockers.length > 0)
      .map(({ q, index }) => ({
        index,
        blockers: quality[index].blockers,
        row: {
          question_text: q.question_text,
          antwort_a: q.options[0] ?? '', antwort_b: q.options[1] ?? '', antwort_c: q.options[2] ?? '',
          antwort_d: q.options[3] ?? '', antwort_e: q.options[4] ?? '',
          korrekte_antwort: LETTERS[q.correct_index ?? 0],
          erklaerung: q.explanation,
          fach_code: q.fach_code,
          schwierigkeit: q.difficulty,
          klassenstufe: q.class_level,
        } satisfies ImportRow,
      }))
    return buildFixPrompt(flagged, targetGroup)
  }
  const blockedCount = quality.filter((r) => r.blockers.length > 0).length

  async function importSelected() {
    setStep('importing')
    setError(null)
    try {
      const res = await fetch('/api/admin/assessments/questions/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assessmentOnly: true,
          questions: selected.map((i) => {
            const q = items[i]
            return {
              question_text: q.question_text,
              options: q.options,
              correct_index: q.correct_index,
              fach_code: q.fach_code,
              explanation: q.explanation,
              difficulty: q.difficulty,
              class_level: q.class_level,
            }
          }),
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setStep('preview')
        setError(data?.error ?? 'Import fehlgeschlagen.')
        return
      }
      onImported(data.questions ?? [])
      toast.success(`${(data.questions ?? []).length} Fragen importiert und ausgewählt – nur für Nachweise nutzbar`)
      onOpenChange(false)
    } catch {
      setStep('preview')
      setError('Netzwerkfehler beim Import.')
    }
  }

  const locked = busy || step === 'importing'
  const taskReady = task.trim().length >= MIN_MATERIAL_CHARS

  return (
    <Dialog open={open} onOpenChange={(o) => !locked && onOpenChange(o)}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto border-[#4B5563] bg-[#1F2937] text-[#F9FAFB]">
        <DialogHeader>
          <DialogTitle>Fragen aus Aufgabenblatt erzeugen</DialogTitle>
          <DialogDescription className="text-[#9CA3AF]">
            Kostenlos mit einem KI-Chat deiner Wahl (z. B. ChatGPT, Gemini, Claude). Die Fragen sind danach nur für Nachweise
            nutzbar, bis du sie in der Fragenverwaltung für den Übungsbetrieb freigibst.
            {step !== 'importing' && <span className="mt-1 block font-medium text-[#1CB0F6]">{STEP_LABEL[step]}</span>}
          </DialogDescription>
        </DialogHeader>

        {step === 'material' && (
          <div className="space-y-5">
            {(['task', 'solution'] as const).map((kind) => {
              const isTask = kind === 'task'
              const value = isTask ? task : solution
              const setValue = isTask ? setTask : setSolution
              const ref = isTask ? taskFileRef : solutionFileRef
              return (
                <div key={kind} className="space-y-2">
                  <Label className="text-sm font-semibold text-[#F9FAFB]">
                    {isTask ? 'Aufgabenblatt' : 'Lösungsblatt (optional, empfohlen)'}
                  </Label>
                  <input
                    ref={ref}
                    type="file"
                    accept=".pdf,.doc,.docx"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0]
                      e.target.value = ''
                      if (f) readFile(kind, f)
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    disabled={reading !== null}
                    onClick={() => ref.current?.click()}
                    className="min-h-11 w-full justify-start rounded-xl border-[#4B5563] text-[#F9FAFB]"
                  >
                    {reading === kind ? <Loader2 size={16} className="mr-2 animate-spin" /> : <FileUp size={16} className="mr-2 shrink-0" />}
                    {reading === kind ? 'Wird gelesen…' : 'PDF oder Word wählen (max. 4 MB)'}
                  </Button>
                  <Textarea
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    rows={isTask ? 7 : 5}
                    placeholder="…oder Text hier einfügen. Erkannter Text kann vor dem nächsten Schritt korrigiert werden."
                    className="rounded-xl border-[#4B5563] bg-[#111827] text-sm text-[#F9FAFB]"
                  />
                </div>
              )
            })}
          </div>
        )}

        {step === 'prompt' && (
          <div className="space-y-3">
            <ol className="list-decimal space-y-1 pl-5 text-sm text-[#9CA3AF]">
              <li>Prompt kopieren.</li>
              <li>In einen KI-Chat einfügen und abschicken.</li>
              <li>Die Antwort der KI (das JSON) kopieren und im nächsten Schritt einfügen.</li>
            </ol>
            {tooLong && (
              <Alert className="border-[#FF9600]/50 bg-[#FF9600]/10">
                <AlertTriangle className="size-4 text-[#FF9600]" />
                <AlertDescription className="text-[#FF9600]">
                  Der Prompt ist sehr lang und passt vielleicht nicht in einen kostenlosen Chat. Besser das Material in Teilen importieren
                  (z. B. nur einige Aufgaben je Durchgang).
                </AlertDescription>
              </Alert>
            )}
            <Textarea readOnly value={prompt} rows={8} className="rounded-xl border-[#4B5563] bg-[#111827] font-mono text-xs text-[#F9FAFB]" />
            <Button
              type="button"
              onClick={() => copy(prompt)}
              className="min-h-11 w-full rounded-xl bg-[#58CC02] text-white hover:bg-[#4CAD02]"
            >
              {copied ? <Check size={16} className="mr-2" /> : <ClipboardCopy size={16} className="mr-2" />}
              {copied ? 'Kopiert' : 'Prompt kopieren'}
            </Button>
          </div>
        )}

        {step === 'answer' && (
          <div className="space-y-2">
            <Label htmlFor="ai-answer" className="text-sm font-semibold">Antwort der KI</Label>
            <Textarea
              id="ai-answer"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              rows={12}
              placeholder='{ "rows": [ … ] } – Text vor/nach dem JSON oder ```-Blöcke sind okay.'
              className="rounded-xl border-[#4B5563] bg-[#111827] font-mono text-xs text-[#F9FAFB]"
            />
          </div>
        )}

        {(step === 'preview' || step === 'importing') && (
          <div className="space-y-3">
            <p className="text-sm text-[#9CA3AF]">
              {items.length} Fragen erkannt, {selected.length} importierbar ausgewählt.
            </p>
            {skipped.length > 0 && (
              <Alert className="border-[#1CB0F6]/40 bg-[#1CB0F6]/10">
                <AlertDescription className="text-[#1CB0F6]">
                  Nicht umgewandelt: {skipped.join(' · ')}
                </AlertDescription>
              </Alert>
            )}
            {blockedCount > 0 && (
              <Alert className="border-[#FF9600]/50 bg-[#FF9600]/10">
                <AlertTriangle className="size-4 text-[#FF9600]" />
                <AlertDescription className="flex flex-col gap-2 text-[#FF9600]">
                  {blockedCount} Fragen haben Qualitätsmängel und lassen sich so nicht importieren. Du kannst die KI bitten, sie zu überarbeiten.
                  <Button type="button" size="sm" variant="outline" onClick={() => copy(fixPrompt())} className="min-h-11 w-fit rounded-xl border-[#FF9600] text-[#FF9600]">
                    <ClipboardCopy size={14} className="mr-1.5" />
                    Korrektur-Prompt kopieren
                  </Button>
                </AlertDescription>
              </Alert>
            )}
            <div className="max-h-96 space-y-3 overflow-y-auto rounded-xl bg-[#111827] p-3">
              {items.map((q, i) => {
                const blockers = quality[i].blockers
                const warnings = quality[i].warnings
                const unsure = q.needs_review && !confirmed.has(i)
                const canInclude = q.errors.length === 0 && !q.duplicate
                return (
                  <div key={i} className="space-y-2 border-b border-[#374151] pb-3 last:border-0 last:pb-0">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={included.has(i) && importable(i)}
                        disabled={!importable(i)}
                        onCheckedChange={(v) => toggle(i, v === true)}
                        aria-label={`Frage ${i + 1} importieren`}
                        className="mt-1 size-5"
                      />
                      <div className="min-w-0 flex-1 space-y-1.5">
                        <p className="text-sm leading-snug text-[#F9FAFB]">{q.question_text || '(kein Fragetext)'}</p>
                        <div className="flex flex-wrap gap-1.5">
                          <Badge variant="outline" className="border-[#4B5563] text-[#9CA3AF]">
                            {q.fach_code}{q.fach_defaulted ? ' (Standardfach)' : ''}
                          </Badge>
                          {q.duplicate && <Badge variant="outline" className="border-[#FF9600] text-[#FF9600]">Duplikat</Badge>}
                          {unsure && <Badge variant="outline" className="border-[#FF9600] text-[#FF9600]">Antwort ungeprüft</Badge>}
                          {q.errors.map((e) => (
                            <Badge key={e} variant="outline" className="border-[#FF4B4B] text-[#FF4B4B]">{e}</Badge>
                          ))}
                          {blockers.map((b) => (
                            <Badge key={b.code} variant="outline" className="border-[#FF4B4B] text-[#FF4B4B]">{b.message}</Badge>
                          ))}
                          {warnings.map((w) => (
                            <Badge key={w.code} variant="outline" className="border-[#4B5563] text-[#9CA3AF]">{w.message}</Badge>
                          ))}
                        </div>
                        {canInclude && q.options.length >= 2 && (
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                            <Select
                              value={q.correct_index === null ? undefined : String(q.correct_index)}
                              onValueChange={(v) => setCorrect(i, Number(v))}
                            >
                              <SelectTrigger
                                aria-label={`Richtige Antwort für Frage ${i + 1}`}
                                className={`min-h-11 rounded-xl bg-[#1F2937] text-[#F9FAFB] ${unsure ? 'border-[#FF9600]' : 'border-[#4B5563]'}`}
                              >
                                <SelectValue placeholder="Richtige Antwort wählen…" />
                              </SelectTrigger>
                              <SelectContent className="border-[#4B5563] bg-[#1F2937] text-[#F9FAFB]">
                                {q.options.map((o, j) => (
                                  <SelectItem key={j} value={String(j)}>
                                    {LETTERS[j]}: {o.slice(0, 90)}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {unsure && q.correct_index !== null && (
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => setCorrect(i, q.correct_index!)}
                                className="min-h-11 shrink-0 rounded-xl border-[#58CC02] text-[#58CC02]"
                              >
                                <Check size={14} className="mr-1" /> Bestätigen
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {error && <p className="text-sm text-[#FF4B4B]">{error}</p>}

        <DialogFooter className="gap-2">
          {step === 'material' && (
            <>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Abbrechen</Button>
              <Button
                type="button"
                onClick={buildPrompt}
                disabled={busy || reading !== null || !taskReady}
                className="min-h-11 rounded-xl bg-[#58CC02] text-white hover:bg-[#4CAD02]"
              >
                {busy && <Loader2 className="mr-2 size-4 animate-spin" />}
                Prompt erstellen
              </Button>
            </>
          )}
          {step === 'prompt' && (
            <>
              <Button type="button" variant="ghost" onClick={() => setStep('material')}><ArrowLeft size={16} className="mr-1" />Zurück</Button>
              <Button type="button" onClick={() => setStep('answer')} className="min-h-11 rounded-xl bg-[#58CC02] text-white hover:bg-[#4CAD02]">
                Weiter: Antwort einfügen
              </Button>
            </>
          )}
          {step === 'answer' && (
            <>
              <Button type="button" variant="ghost" onClick={() => setStep('prompt')}><ArrowLeft size={16} className="mr-1" />Zurück</Button>
              <Button
                type="button"
                onClick={checkAnswer}
                disabled={busy || answer.trim().length < 2}
                className="min-h-11 rounded-xl bg-[#58CC02] text-white hover:bg-[#4CAD02]"
              >
                {busy && <Loader2 className="mr-2 size-4 animate-spin" />}
                Prüfen
              </Button>
            </>
          )}
          {(step === 'preview' || step === 'importing') && (
            <>
              <Button type="button" variant="ghost" onClick={() => setStep('answer')} disabled={step === 'importing'}><ArrowLeft size={16} className="mr-1" />Zurück</Button>
              <Button
                type="button"
                onClick={importSelected}
                disabled={step === 'importing' || selected.length === 0}
                className="min-h-11 rounded-xl bg-[#58CC02] text-white hover:bg-[#4CAD02]"
              >
                {step === 'importing' && <Loader2 className="mr-2 size-4 animate-spin" />}
                {selected.length} Fragen importieren
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
