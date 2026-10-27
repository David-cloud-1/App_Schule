'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Loader2, Plus, X } from 'lucide-react'
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
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { PickerQuestion } from './question-picker'

type Difficulty = 'leicht' | 'mittel' | 'schwer'
const NO_CLASS = 'none'

function emptyOptions() {
  return [
    { text: '', is_correct: true },
    { text: '', is_correct: false },
    { text: '', is_correct: false },
    { text: '', is_correct: false },
  ]
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Zielbereich des Nachweises (PROJ-46) — entscheidet Pool vs. privat wie beim Datei-Import */
  departmentId: string
  onCreated: (question: PickerQuestion) => void
}

/**
 * Eine einzelne eigene Frage von Hand anlegen (PROJ-49) — nutzt dieselbe
 * Anlage-Schnittstelle wie der Datei-Import, nur mit genau einer Frage.
 * Landet je nach Rechten am Zielbereich im Bereichs-Pool (Bereichs-/Super-Admin)
 * oder als eigene private Nachweis-Frage (Lehrkraft, fremder Bereich).
 */
export function CreateQuestionDialog({ open, onOpenChange, departmentId, onCreated }: Props) {
  const [questionText, setQuestionText] = useState('')
  const [difficulty, setDifficulty] = useState<Difficulty>('mittel')
  const [explanation, setExplanation] = useState('')
  const [classLevel, setClassLevel] = useState(NO_CLASS)
  const [options, setOptions] = useState(emptyOptions())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function reset() {
    setQuestionText('')
    setDifficulty('mittel')
    setExplanation('')
    setClassLevel(NO_CLASS)
    setOptions(emptyOptions())
    setError(null)
  }

  function updateOption(i: number, text: string) {
    setOptions((prev) => prev.map((o, j) => (j === i ? { ...o, text } : o)))
  }
  function setCorrect(i: number) {
    setOptions((prev) => prev.map((o, j) => ({ ...o, is_correct: j === i })))
  }
  function removeOption(i: number) {
    setOptions((prev) => prev.filter((_, j) => j !== i))
  }
  function addOption() {
    setOptions((prev) => (prev.length >= 5 ? prev : [...prev, { text: '', is_correct: false }]))
  }

  function validate(): string | null {
    if (!questionText.trim()) return 'Fragetext fehlt.'
    if (options.length < 2) return 'Mindestens 2 Antwortoptionen.'
    if (options.some((o) => !o.text.trim())) return 'Keine Antwortoption darf leer sein.'
    if (options.filter((o) => o.is_correct).length !== 1) return 'Genau eine Antwort muss richtig sein.'
    return null
  }

  async function handleCreate() {
    const validationError = validate()
    if (validationError) {
      setError(validationError)
      return
    }
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/assessments/questions/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          departmentId,
          questions: [
            {
              question_text: questionText.trim(),
              options: options.map((o) => o.text.trim()),
              correct_index: options.findIndex((o) => o.is_correct),
              difficulty,
              class_level: classLevel === NO_CLASS ? null : Number(classLevel),
              explanation: explanation.trim() || null,
            },
          ],
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data?.error ?? 'Frage konnte nicht angelegt werden.')
        return
      }
      const created = (data.questions ?? [])[0] as PickerQuestion | undefined
      if (!created) {
        setError('Frage konnte nicht angelegt werden.')
        return
      }
      toast.success('Frage angelegt')
      onCreated(created)
      reset()
      onOpenChange(false)
    } catch {
      setError('Netzwerkfehler.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!saving) { onOpenChange(o); if (!o) reset() } }}>
      <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto border-ws-line bg-ws-surface text-ws-text">
        <DialogHeader>
          <DialogTitle>Neue Frage erstellen</DialogTitle>
          <DialogDescription className="text-ws-muted">
            Wird sofort zur Auswahl hinzugefügt und je nach Rechten im Bereichs-Pool oder als eigene Frage angelegt.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cq-text">Fragetext</Label>
            <Textarea
              id="cq-text"
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              rows={3}
              maxLength={1000}
              placeholder="Wie lautet die Frage?"
              className="rounded-xl border-ws-line bg-ws-bg text-ws-text"
            />
          </div>

          <div className="space-y-2">
            <Label>Antwortoptionen <span className="font-normal text-ws-faint">— die markierte ist richtig</span></Label>
            <RadioGroup value={String(options.findIndex((o) => o.is_correct))} onValueChange={(v) => setCorrect(Number(v))}>
              <div className="space-y-2">
                {options.map((o, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <RadioGroupItem value={String(i)} id={`cq-opt-${i}`} aria-label={`Option ${i + 1} ist richtig`} />
                    <Input
                      value={o.text}
                      onChange={(e) => updateOption(i, e.target.value)}
                      maxLength={500}
                      placeholder={`Option ${i + 1}`}
                      className="h-11 flex-1 rounded-xl border-ws-line bg-ws-bg text-ws-text"
                    />
                    {options.length > 2 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeOption(i)}
                        aria-label={`Option ${i + 1} entfernen`}
                        className="size-9 text-ws-muted hover:text-ws-red"
                      >
                        <X size={14} />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </RadioGroup>
            {options.length < 5 && (
              <Button type="button" variant="outline" size="sm" onClick={addOption} className="min-h-11 rounded-xl border-ws-line text-ws-muted">
                <Plus size={14} className="mr-1.5" />
                Option hinzufügen
              </Button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="cq-difficulty">Schwierigkeit</Label>
              <Select value={difficulty} onValueChange={(v) => setDifficulty(v as Difficulty)}>
                <SelectTrigger id="cq-difficulty" className="h-11 rounded-xl border-ws-line bg-ws-bg text-ws-text">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-ws-line bg-ws-surface text-ws-text">
                  <SelectItem value="leicht">Leicht</SelectItem>
                  <SelectItem value="mittel">Mittel</SelectItem>
                  <SelectItem value="schwer">Schwer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="cq-class">Klassenstufe</Label>
              <Select value={classLevel} onValueChange={setClassLevel}>
                <SelectTrigger id="cq-class" className="h-11 rounded-xl border-ws-line bg-ws-bg text-ws-text">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-ws-line bg-ws-surface text-ws-text">
                  <SelectItem value={NO_CLASS}>Ohne Klassenstufe</SelectItem>
                  <SelectItem value="10">Klasse 10</SelectItem>
                  <SelectItem value="11">Klasse 11</SelectItem>
                  <SelectItem value="12">Klasse 12</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cq-explanation">Erklärung <span className="font-normal text-ws-faint">— optional</span></Label>
            <Textarea
              id="cq-explanation"
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              rows={2}
              maxLength={2000}
              className="rounded-xl border-ws-line bg-ws-bg text-ws-text"
            />
          </div>

          {error && <p className="text-sm text-ws-red">{error}</p>}
        </div>

        <DialogFooter className="gap-2">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>
            Abbrechen
          </Button>
          <Button
            type="button"
            onClick={handleCreate}
            disabled={saving}
            className="rounded-xl bg-ws-green hover:bg-ws-green-hover text-ws-on-accent"
          >
            {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
            Anlegen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
