'use client'

import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { GradingScaleEditor, IHK_DEFAULT_SCALE, validateGradingScale, type GradeBoundary } from './grading-scale-editor'
import { useExamParts } from '@/components/department-provider'
import { examPartLabel } from '@/lib/exam-parts'
import { AssessmentQuestionSelector } from './assessment-question-selector'
import type { PickerQuestion } from './question-picker'

type ExamSetOption = {
  id: string
  name: string
  part: number
  question_ids: string[]
  duration_minutes: number | null
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  sets: ExamSetOption[]
  preselectedSetId?: string | null
  onSuccess: (assessmentId: string) => void
}

function defaultWindow() {
  const now = new Date()
  const opens = new Date(now.getTime() + 5 * 60_000)
  const closes = new Date(now.getTime() + 2 * 60 * 60_000)
  const toLocal = (d: Date) => {
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
  }
  return { opensAt: toLocal(opens), closesAt: toLocal(closes) }
}

const NO_START = 'none'
const MIN_QUESTIONS = 5

export function CreateAssessmentModal({ open, onOpenChange, sets, preselectedSetId, onSuccess }: Props) {
  const examParts = useExamParts()
  const [part, setPart] = useState<number | null>(null)
  const [startSetId, setStartSetId] = useState<string>(NO_START)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [skippedFromSet, setSkippedFromSet] = useState(0)
  const [title, setTitle] = useState('')
  const [opensAt, setOpensAt] = useState('')
  const [closesAt, setClosesAt] = useState('')
  const [durationMinutes, setDurationMinutes] = useState('90')
  const [scale, setScale] = useState<GradeBoundary[]>(IHK_DEFAULT_SCALE)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)

  // Fragen-IDs des zuletzt geladenen Teils und eine noch ausstehende Set-Vorauswahl:
  // Set-Fragen werden erst nach dem Laden gegen die wählbaren Fragen abgeglichen
  // (offene und deaktivierte Fragen fallen heraus).
  const loadedRef = useRef<{ part: number; ids: Set<string> } | null>(null)
  const pendingSetRef = useRef<string[] | null>(null)

  function applySetQuestions(questionIds: string[], forPart: number) {
    if (loadedRef.current?.part === forPart) {
      const ids = loadedRef.current.ids
      const kept = questionIds.filter((id) => ids.has(id))
      setSelectedIds(new Set(kept))
      setSkippedFromSet(questionIds.length - kept.length)
      pendingSetRef.current = null
    } else {
      pendingSetRef.current = questionIds
      setSelectedIds(new Set())
      setSkippedFromSet(0)
    }
  }

  // Aktuell gewählter Teil, synchron nachgeführt: eine verspätete Ladeantwort
  // eines früheren Teils darf Vorauswahl und Abgleich nicht mehr beeinflussen.
  const partRef = useRef<number | null>(null)

  function handleLoaded(questions: PickerQuestion[], loadedPart: number) {
    if (loadedPart !== partRef.current) return
    loadedRef.current = { part: loadedPart, ids: new Set(questions.map((q) => q.id)) }
    if (pendingSetRef.current) applySetQuestions(pendingSetRef.current, loadedPart)
  }

  useEffect(() => {
    if (!open) {
      // Beim nächsten Öffnen soll nicht kurz der alte Teil geladen werden
      partRef.current = null
      setPart(null)
      return
    }
    loadedRef.current = null
    pendingSetRef.current = null
    setSkippedFromSet(0)
    const preset = sets.find((s) => s.id === preselectedSetId)
    if (preset) {
      partRef.current = preset.part
      setPart(preset.part)
      setStartSetId(preset.id)
      setTitle(`${preset.name} – Leistungsnachweis`)
      setDurationMinutes(String(preset.duration_minutes ?? 90))
      pendingSetRef.current = preset.question_ids
      setSelectedIds(new Set())
    } else {
      partRef.current = examParts[0]?.partNumber ?? null
      setPart(partRef.current)
      setStartSetId(NO_START)
      setTitle('')
      setDurationMinutes('90')
      setSelectedIds(new Set())
    }
    const { opensAt, closesAt } = defaultWindow()
    setOpensAt(opensAt)
    setClosesAt(closesAt)
    setScale(IHK_DEFAULT_SCALE)
    setErrors({})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, preselectedSetId, sets])

  function handlePartChange(value: string) {
    const next = Number(value)
    partRef.current = next
    setPart(next)
    setStartSetId(NO_START)
    setSelectedIds(new Set())
    setSkippedFromSet(0)
    pendingSetRef.current = null
    loadedRef.current = null
  }

  function handleStartSetChange(value: string) {
    setStartSetId(value)
    if (value === NO_START) {
      setSelectedIds(new Set())
      setSkippedFromSet(0)
      return
    }
    const set = sets.find((s) => s.id === value)
    if (!set) return
    if (!title.trim()) setTitle(`${set.name} – Leistungsnachweis`)
    if (set.duration_minutes) setDurationMinutes(String(set.duration_minutes))
    applySetQuestions(set.question_ids, set.part)
  }

  const setsOfPart = sets.filter((s) => s.part === part)

  function validate(): boolean {
    const e: Record<string, string> = {}
    if (part === null) e.part = 'Bitte einen Teil wählen.'
    if (selectedIds.size < MIN_QUESTIONS) e.questions = `Mindestens ${MIN_QUESTIONS} Fragen auswählen.`
    if (!title.trim()) e.title = 'Titel ist Pflicht.'
    if (!opensAt) e.opensAt = 'Startzeit fehlt.'
    if (!closesAt) e.closesAt = 'Endzeit fehlt.'
    if (opensAt && closesAt && new Date(closesAt) <= new Date(opensAt)) {
      e.closesAt = 'Ende muss nach dem Start liegen.'
    }
    const dur = Number(durationMinutes)
    if (!Number.isInteger(dur) || dur < 5 || dur > 600) e.durationMinutes = 'Dauer zwischen 5 und 600 Minuten.'
    const scaleError = validateGradingScale(scale)
    if (scaleError) e.scale = scaleError
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault()
    if (!validate()) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/admin/assessments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          part,
          questionIds: [...selectedIds],
          title: title.trim(),
          opensAt: new Date(opensAt).toISOString(),
          closesAt: new Date(closesAt).toISOString(),
          durationMinutes: Number(durationMinutes),
          gradingScale: scale,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(data?.error ?? 'Erstellen fehlgeschlagen')
        return
      }
      toast.success('Leistungsnachweis angelegt')
      onSuccess(data.id)
      onOpenChange(false)
    } catch (err) {
      console.error(err)
      toast.error('Netzwerkfehler')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#1F2937] border-[#4B5563] text-[#F9FAFB] max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Neuer Leistungsnachweis</DialogTitle>
          <DialogDescription className="text-[#9CA3AF]">
            Ein einmaliger, benoteter Durchlauf mit selbst zusammengestellten Fragen — mit eigenem Beitrittscode.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="part">Prüfungsteil</Label>
            <Select value={part === null ? undefined : String(part)} onValueChange={handlePartChange}>
              <SelectTrigger id="part" className="bg-[#111827] border-[#4B5563] text-[#F9FAFB]">
                <SelectValue placeholder="Teil wählen" />
              </SelectTrigger>
              <SelectContent className="bg-[#1F2937] border-[#4B5563] text-[#F9FAFB]">
                {examParts.map((p) => (
                  <SelectItem key={p.id} value={String(p.partNumber)}>
                    {examPartLabel(p)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.part && <p className="text-xs text-[#FF4B4B]">{errors.part}</p>}
          </div>

          {setsOfPart.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="startSet">Startauswahl aus Prüfungsset <span className="font-normal text-[#6B7280]">— optional</span></Label>
              <Select value={startSetId} onValueChange={handleStartSetChange}>
                <SelectTrigger id="startSet" className="bg-[#111827] border-[#4B5563] text-[#F9FAFB]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1F2937] border-[#4B5563] text-[#F9FAFB]">
                  <SelectItem value={NO_START}>Ohne Startauswahl</SelectItem>
                  {setsOfPart.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} ({s.question_ids.length} Fragen)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-[#6B7280]">
                Die Fragen werden kopiert und sind danach unabhängig vom Set.
              </p>
              {skippedFromSet > 0 && (
                <p className="text-xs text-[#FF9600]">
                  {skippedFromSet} Fragen aus dem Set wurden übersprungen (offene oder deaktivierte Fragen).
                </p>
              )}
            </div>
          )}

          {part !== null && (
            <div className="space-y-2">
              <Label>Fragen</Label>
              <AssessmentQuestionSelector
                key={part}
                part={part}
                selectedIds={selectedIds}
                onChange={setSelectedIds}
                onLoaded={handleLoaded}
              />
              {errors.questions && <p className="text-xs text-[#FF4B4B]">{errors.questions}</p>}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="title">Titel</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="bg-[#111827] border-[#4B5563] text-[#F9FAFB]"
              placeholder="z. B. LN 2 – Verkehrsträger Straße"
              maxLength={100}
            />
            {errors.title && <p className="text-xs text-[#FF4B4B]">{errors.title}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="opensAt">Beitritt ab</Label>
              <Input
                id="opensAt"
                type="datetime-local"
                value={opensAt}
                onChange={(e) => setOpensAt(e.target.value)}
                className="bg-[#111827] border-[#4B5563] text-[#F9FAFB]"
              />
              {errors.opensAt && <p className="text-xs text-[#FF4B4B]">{errors.opensAt}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="closesAt">Beitritt bis</Label>
              <Input
                id="closesAt"
                type="datetime-local"
                value={closesAt}
                onChange={(e) => setClosesAt(e.target.value)}
                className="bg-[#111827] border-[#4B5563] text-[#F9FAFB]"
              />
              {errors.closesAt && <p className="text-xs text-[#FF4B4B]">{errors.closesAt}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="duration">Bearbeitungszeit je Teilnehmer (Minuten)</Label>
            <Input
              id="duration"
              type="number"
              min={5}
              max={600}
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(e.target.value)}
              className="bg-[#111827] border-[#4B5563] text-[#F9FAFB] w-32"
            />
            {errors.durationMinutes && <p className="text-xs text-[#FF4B4B]">{errors.durationMinutes}</p>}
            <p className="text-xs text-[#6B7280]">
              Zählt ab dem individuellen Start — ein späterer Beitritt verkürzt die Zeit nicht.
            </p>
          </div>

          <GradingScaleEditor scale={scale} onChange={setScale} error={errors.scale} />

          <DialogFooter className="gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting}>
              Abbrechen
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="bg-[#58CC02] hover:bg-[#4CAD02] text-white rounded-xl"
            >
              {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Als Entwurf anlegen
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
