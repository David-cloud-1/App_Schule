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

export type EditableQuestion = { id: string; isPrivate: boolean }

interface Props {
  /** null = Dialog geschlossen */
  question: EditableQuestion | null
  /** false = nur ansehen (z. B. Pool-Frage ohne Bereichs-Admin-Rechte) */
  editable: boolean
  onOpenChange: (open: boolean) => void
  /** Nach erfolgreichem Speichern (z. B. um die Auswahl-Liste neu zu laden) */
  onSaved: () => void
}

/**
 * Frage ansehen bzw. bearbeiten — eigene private Nachweis-Frage (immer
 * editierbar) oder Bereichs-Pool-Frage (nur mit Bereichs-Admin-Rechten,
 * PROJ-49). Pool-Fragen behalten immer genau 5 Optionen (wie in der
 * Fragenverwaltung), private Fragen erlauben 2–5.
 */
export function EditQuestionDialog({ question, editable, onOpenChange, onSaved }: Props) {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [questionText, setQuestionText] = useState('')
  const [difficulty, setDifficulty] = useState<Difficulty>('mittel')
  const [explanation, setExplanation] = useState('')
  const [classLevel, setClassLevel] = useState(NO_CLASS)
  const [options, setOptions] = useState<{ text: string; is_correct: boolean }[]>([])
  const [error, setError] = useState<string | null>(null)

  const apiBase = question?.isPrivate ? '/api/admin/assessments/questions' : '/api/admin/questions'
  const allowOptionCountChange = question?.isPrivate === true

  useEffect(() => {
    if (!question) return
    let cancelled = false
    setLoading(true)
    setError(null)
    fetch(`${apiBase}/${question.id}`)
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
    // apiBase hängt nur von question ab
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [question])

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
    if (!allowOptionCountChange && options.length !== 5) return 'Pool-Fragen benötigen genau 5 Antwortoptionen.'
    if (options.some((o) => !o.text.trim())) return 'Keine Antwortoption darf leer sein.'
    if (options.filter((o) => o.is_correct).length !== 1) return 'Genau eine Antwort muss richtig sein.'
    return null
  }

  async function handleSave() {
    if (!question) return
    const validationError = validate()
    if (validationError) {
      setError(validationError)
      return
    }
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`${apiBase}/${question.id}`, {
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

  const title = editable ? (question?.isPrivate ? 'Eigene Frage bearbeiten' : 'Pool-Frage bearbeiten') : 'Frage ansehen'
  const description = editable
    ? question?.isPrivate
      ? 'Diese Frage ist nur für dich sichtbar und bleibt es auch nach dem Speichern.'
      : 'Diese Änderung wirkt sich auf die Frage im Bereichs-Pool aus — auch im Quiz, in der Blitzrunde und in anderen Nachweisen.'
    : 'Nur Bereichs-Admins dieses Fachbereichs können Pool-Fragen bearbeiten.'

  return (
    <Dialog open={question !== null} onOpenChange={(o) => !saving && onOpenChange(o)}>
      <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto border-ws-line bg-ws-surface text-ws-text">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="text-ws-muted">{description}</DialogDescription>
        </DialogHeader>

        {loading ? (
          <p className="py-6 text-center text-sm text-ws-muted">Wird geladen…</p>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="eq-text">Fragetext</Label>
              <Textarea
                id="eq-text"
                value={questionText}
                onChange={(e) => setQuestionText(e.target.value)}
                rows={3}
                maxLength={1000}
                disabled={!editable}
                className="rounded-xl border-ws-line bg-ws-bg text-ws-text"
              />
            </div>

            <div className="space-y-2">
              <Label>Antwortoptionen <span className="font-normal text-ws-faint">— die markierte ist richtig</span></Label>
              <RadioGroup
                value={String(options.findIndex((o) => o.is_correct))}
                onValueChange={(v) => editable && setCorrect(Number(v))}
              >
                <div className="space-y-2">
                  {options.map((o, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <RadioGroupItem value={String(i)} id={`eq-opt-${i}`} aria-label={`Option ${i + 1} ist richtig`} disabled={!editable} />
                      <Input
                        value={o.text}
                        onChange={(e) => updateOption(i, e.target.value)}
                        maxLength={500}
                        placeholder={`Option ${i + 1}`}
                        disabled={!editable}
                        className="h-11 flex-1 rounded-xl border-ws-line bg-ws-bg text-ws-text"
                      />
                      {editable && allowOptionCountChange && options.length > 2 && (
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
              {editable && allowOptionCountChange && options.length < 5 && (
                <Button type="button" variant="outline" size="sm" onClick={addOption} className="min-h-11 rounded-xl border-ws-line text-ws-muted">
                  <Plus size={14} className="mr-1.5" />
                  Option hinzufügen
                </Button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="eq-difficulty">Schwierigkeit</Label>
                <Select value={difficulty} onValueChange={(v) => editable && setDifficulty(v as Difficulty)} disabled={!editable}>
                  <SelectTrigger id="eq-difficulty" className="h-11 rounded-xl border-ws-line bg-ws-bg text-ws-text">
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
                <Label htmlFor="eq-class">Klassenstufe</Label>
                <Select value={classLevel} onValueChange={(v) => editable && setClassLevel(v)} disabled={!editable}>
                  <SelectTrigger id="eq-class" className="h-11 rounded-xl border-ws-line bg-ws-bg text-ws-text">
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
              <Label htmlFor="eq-explanation">Erklärung <span className="font-normal text-ws-faint">— optional</span></Label>
              <Textarea
                id="eq-explanation"
                value={explanation}
                onChange={(e) => setExplanation(e.target.value)}
                rows={2}
                maxLength={2000}
                disabled={!editable}
                className="rounded-xl border-ws-line bg-ws-bg text-ws-text"
              />
            </div>

            {error && <p className="text-sm text-ws-red">{error}</p>}
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>
            {editable ? 'Abbrechen' : 'Schließen'}
          </Button>
          {editable && (
            <Button
              type="button"
              onClick={handleSave}
              disabled={loading || saving}
              className="rounded-xl bg-ws-green hover:bg-ws-green-hover text-ws-on-accent"
            >
              {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
              Speichern
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
