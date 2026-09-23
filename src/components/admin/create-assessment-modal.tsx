'use client'

import { useEffect, useState } from 'react'
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

type ExamSetOption = {
  id: string
  name: string
  part: number
  question_ids: string[]
  duration_minutes: number | null
}

const PART_LABELS: Record<number, string> = {
  1: 'Teil 1 – Leistungserstellung',
  2: 'Teil 2 – KSK',
  3: 'Teil 3 – WiSo',
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

export function CreateAssessmentModal({ open, onOpenChange, sets, preselectedSetId, onSuccess }: Props) {
  const [setId, setSetId] = useState<string>('')
  const [title, setTitle] = useState('')
  const [opensAt, setOpensAt] = useState('')
  const [closesAt, setClosesAt] = useState('')
  const [durationMinutes, setDurationMinutes] = useState('90')
  const [scale, setScale] = useState<GradeBoundary[]>(IHK_DEFAULT_SCALE)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open) return
    const initialSetId = preselectedSetId ?? sets[0]?.id ?? ''
    setSetId(initialSetId)
    const set = sets.find((s) => s.id === initialSetId)
    setTitle(set ? `${set.name} – Leistungsnachweis` : '')
    setDurationMinutes(String(set?.duration_minutes ?? 90))
    const { opensAt, closesAt } = defaultWindow()
    setOpensAt(opensAt)
    setClosesAt(closesAt)
    setScale(IHK_DEFAULT_SCALE)
    setErrors({})
  }, [open, preselectedSetId, sets])

  const selectedSet = sets.find((s) => s.id === setId)

  function validate(): boolean {
    const e: Record<string, string> = {}
    if (!setId) e.setId = 'Bitte ein Prüfungsset wählen.'
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
    if (selectedSet && selectedSet.question_ids.length < 5) {
      e.setId = 'Dieses Set hat weniger als 5 Fragen und eignet sich nicht für einen Leistungsnachweis.'
    }
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
          examSetId: setId,
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
      <DialogContent className="bg-[#1F2937] border-[#4B5563] text-[#F9FAFB] max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Neuer Leistungsnachweis</DialogTitle>
          <DialogDescription className="text-[#9CA3AF]">
            Ein einmaliger, benoteter Durchlauf zu einem bestehenden Prüfungsset — mit eigenem Beitrittscode.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="set">Prüfungsset</Label>
            <Select value={setId} onValueChange={setSetId}>
              <SelectTrigger id="set" className="bg-[#111827] border-[#4B5563] text-[#F9FAFB]">
                <SelectValue placeholder="Set wählen" />
              </SelectTrigger>
              <SelectContent className="bg-[#1F2937] border-[#4B5563] text-[#F9FAFB]">
                {sets.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name} — {PART_LABELS[s.part] ?? `Teil ${s.part}`} ({s.question_ids.length} Fragen)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.setId && <p className="text-xs text-[#FF4B4B]">{errors.setId}</p>}
            <p className="text-xs text-[#6B7280]">
              Nur Multiple-Choice-Fragen werden unterstützt — enthält das Set offene Fragen, lehnt das Anlegen ab.
            </p>
          </div>

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
              disabled={submitting || sets.length === 0}
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
