'use client'

import { useEffect, useState } from 'react'
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

type Difficulty = 'leicht' | 'mittel' | 'schwer'
const NO_CLASS = 'none'

interface Props {
  /** null = Dialog geschlossen */
  questionId: string | null
  onOpenChange: (open: boolean) => void
  /** Nach erfolgreichem Speichern (z. B. um die Auswahl-Liste neu zu laden) */
  onSaved: () => void
}

/**
 * PROJ-46 (E6): eine eigene private Nachweis-Frage bearbeiten. Lädt die
 * vollen Angaben (inkl. Optionen) erst beim Öffnen, weil die Auswahl-Liste
 * selbst nur die schlanken Picker-Felder kennt.
 */
export function EditPrivateQuestionDialog({ questionId, onOpenChange, onSaved }: Props) {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [questionText, setQuestionText] = useState('')
  const [difficulty, setDifficulty] = useState<Difficulty>('mittel')
  const [explanation, setExplanation] = useState('')
  const [classLevel, setClassLevel] = useState(NO_CLASS)
  const [options, setOptions] = useState<{ text: string; is_correct: boolean }[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!questionId) return
    let cancelled = false
    setLoading(true)
    setError(null)
    fetch(`/api/admin/assessments/questions/${questionId}`)
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((data) => {
        if (cancelled) return
        setQuestionText(data.questionText ?? '')
        setDifficulty(data.difficulty ?? 'mittel')
        setExplanation(data.explanation ?? '')
        setClassLevel(data.classLevel != null ? String(data.classLevel) : NO_CLASS)
        setOptions((data.answers ?? []).map((a: { text: string; is_correct: boolean }) => ({ text: a.text, is_correct: a.is_correct })))
      })
      .catch(() => {
        if (!cancelled) setError('Frage konnte nicht geladen werden.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [questionId])

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

  async function handleSave() {
    const validationError = validate()
    if (validationError) {
      setError(validationError)
      return
    }
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/assessments/questions/${questionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question_text: questionText.trim(),
          difficulty,
          explanation: explanation.trim() || null,
          class_level: classLevel === NO_CLASS ? null : Number(classLevel),
          answers: options.map((o) => ({ text: o.text.trim(), is_correct: o.is_correct })),
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data?.error ?? 'Speichern fehlgeschlagen.')
        return
      }
      toast.success('Frage gespeichert')
      onSaved()
      onOpenChange(false)
    } catch {
      setError('Netzwerkfehler.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={questionId !== null} onOpenChange={(o) => !saving && onOpenChange(o)}>
      <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto border-ws-line bg-ws-surface text-ws-text">
        <DialogHeader>
          <DialogTitle>Eigene Frage bearbeiten</DialogTitle>
          <DialogDescription className="text-ws-muted">
            Diese Frage ist nur für dich sichtbar und bleibt es auch nach dem Speichern.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <p className="py-6 text-center text-sm text-ws-muted">Wird geladen…</p>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="epq-text">Fragetext</Label>
              <Textarea
                id="epq-text"
                value={questionText}
                onChange={(e) => setQuestionText(e.target.value)}
                rows={3}
                maxLength={1000}
                className="rounded-xl border-ws-line bg-ws-bg text-ws-text"
              />
            </div>

            <div className="space-y-2">
              <Label>Antwortoptionen <span className="font-normal text-ws-faint">— die markierte ist richtig</span></Label>
              <RadioGroup value={String(options.findIndex((o) => o.is_correct))} onValueChange={(v) => setCorrect(Number(v))}>
                <div className="space-y-2">
                  {options.map((o, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <RadioGroupItem value={String(i)} id={`epq-opt-${i}`} aria-label={`Option ${i + 1} ist richtig`} />
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
                <Label htmlFor="epq-difficulty">Schwierigkeit</Label>
                <Select value={difficulty} onValueChange={(v) => setDifficulty(v as Difficulty)}>
                  <SelectTrigger id="epq-difficulty" className="h-11 rounded-xl border-ws-line bg-ws-bg text-ws-text">
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
                <Label htmlFor="epq-class">Klassenstufe</Label>
                <Select value={classLevel} onValueChange={setClassLevel}>
                  <SelectTrigger id="epq-class" className="h-11 rounded-xl border-ws-line bg-ws-bg text-ws-text">
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
              <Label htmlFor="epq-explanation">Erklärung <span className="font-normal text-ws-faint">— optional</span></Label>
              <Textarea
                id="epq-explanation"
                value={explanation}
                onChange={(e) => setExplanation(e.target.value)}
                rows={2}
                maxLength={2000}
                className="rounded-xl border-ws-line bg-ws-bg text-ws-text"
              />
            </div>

            {error && <p className="text-sm text-ws-red">{error}</p>}
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>
            Abbrechen
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={loading || saving}
            className="rounded-xl bg-ws-green hover:bg-ws-green-hover text-ws-on-accent"
          >
            {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
            Speichern
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
