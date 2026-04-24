'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
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
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export type AdminSubject = {
  id: string
  code: string
  name: string
}

export type AdminAnswerOption = {
  id?: string
  option_text: string
  is_correct: boolean
  display_order: number
}

export type AdminTopic = {
  id: string
  name: string
  subject_id: string
}

export type AdminQuestion = {
  id: string
  question_text: string
  difficulty: 'leicht' | 'mittel' | 'schwer'
  explanation: string | null
  type?: 'multiple_choice' | 'open'
  sample_answer?: string | null
  is_active: boolean
  class_level?: number | null
  topic_id?: string | null
  answer_options: AdminAnswerOption[]
  question_subjects: { subjects: { id: string; code: string; name: string } | null }[]
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  question?: AdminQuestion | null
  subjects: AdminSubject[]
  onSuccess: () => void
}

type FormState = {
  question_text: string
  type: 'multiple_choice' | 'open'
  sample_answer: string
  answer_a: string
  answer_b: string
  answer_c: string
  answer_d: string
  answer_e: string
  correct_letter: 'A' | 'B' | 'C' | 'D' | 'E'
  explanation: string
  difficulty: 'leicht' | 'mittel' | 'schwer'
  subject_ids: string[]
  class_level: '10' | '11' | '12' | '_all'
  topic_id: string
}

const EMPTY: FormState = {
  question_text: '',
  type: 'multiple_choice',
  sample_answer: '',
  answer_a: '',
  answer_b: '',
  answer_c: '',
  answer_d: '',
  answer_e: '',
  correct_letter: 'A',
  explanation: '',
  difficulty: 'mittel',
  subject_ids: [],
  class_level: '_all',
  topic_id: '_none',
}

export function QuestionFormModal({
  open,
  onOpenChange,
  question,
  subjects,
  onSuccess,
}: Props) {
  const [form, setForm] = useState<FormState>(EMPTY)
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [topics, setTopics] = useState<AdminTopic[]>([])
  const [loadingTopics, setLoadingTopics] = useState(false)

  const isEdit = Boolean(question)

  const loadTopicsForSubjects = useCallback(async (subjectIds: string[]) => {
    if (subjectIds.length === 0) { setTopics([]); return }
    setLoadingTopics(true)
    try {
      const params = new URLSearchParams()
      // Load topics for the first selected subject (primary subject)
      params.set('subject_id', subjectIds[0])
      const res = await fetch(`/api/admin/topics?${params}`)
      if (res.ok) {
        const data = await res.json()
        setTopics(data.topics ?? [])
      }
    } finally {
      setLoadingTopics(false)
    }
  }, [])

  // Seed form state when opening / switching question
  useEffect(() => {
    if (!open) return
    if (question) {
      const ordered = [...question.answer_options].sort(
        (a, b) => a.display_order - b.display_order
      )
      const [a, b, c, d, e] = [0, 1, 2, 3, 4].map((i) => ordered[i]?.option_text ?? '')
      const correctIdx = ordered.findIndex((o) => o.is_correct)
      const correct_letter = (['A', 'B', 'C', 'D', 'E'][correctIdx >= 0 ? correctIdx : 0]) as
        | 'A'
        | 'B'
        | 'C'
        | 'D'
        | 'E'
      const subjectIds = question.question_subjects
        .map((qs) => qs.subjects?.id)
        .filter((id): id is string => Boolean(id))
      setForm({
        question_text: question.question_text,
        type: question.type ?? 'multiple_choice',
        sample_answer: question.sample_answer ?? '',
        answer_a: a,
        answer_b: b,
        answer_c: c,
        answer_d: d,
        answer_e: e,
        correct_letter,
        explanation: question.explanation ?? '',
        difficulty: question.difficulty,
        subject_ids: subjectIds,
        class_level: question.class_level ? String(question.class_level) as '10' | '11' | '12' : '_all',
        topic_id: question.topic_id ?? '_none',
      })
      loadTopicsForSubjects(subjectIds)
    } else {
      setForm(EMPTY)
      setTopics([])
    }
    setErrors({})
  }, [open, question, loadTopicsForSubjects])

  const remaining = useMemo(() => 1000 - form.question_text.length, [form.question_text])

  function validate(): boolean {
    const e: Record<string, string> = {}
    if (!form.question_text.trim()) e.question_text = 'Fragetext ist Pflicht.'
    if (form.question_text.length > 1000) e.question_text = 'Max. 1000 Zeichen.'
    if (form.type === 'multiple_choice') {
      if (!form.answer_a.trim()) e.answer_a = 'Antwort A ist Pflicht.'
      if (!form.answer_b.trim()) e.answer_b = 'Antwort B ist Pflicht.'
      if (!form.answer_c.trim()) e.answer_c = 'Antwort C ist Pflicht.'
      if (!form.answer_d.trim()) e.answer_d = 'Antwort D ist Pflicht.'
      if (!form.answer_e.trim()) e.answer_e = 'Antwort E ist Pflicht.'
    }
    if (form.subject_ids.length === 0) e.subject_ids = 'Mindestens ein Fach auswählen.'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault()
    if (!validate()) return
    setSubmitting(true)

    const payload: Record<string, unknown> = {
      question_text: form.question_text.trim(),
      difficulty: form.difficulty,
      explanation: form.explanation.trim() ? form.explanation.trim() : null,
      type: form.type,
      sample_answer: form.sample_answer.trim() ? form.sample_answer.trim() : null,
      subject_ids: form.subject_ids,
      class_level: form.class_level === '_all' ? null : Number(form.class_level),
      topic_id: form.topic_id === '_none' ? null : form.topic_id,
    }

    if (form.type === 'multiple_choice') {
      payload.answers = [
        { text: form.answer_a.trim(), is_correct: form.correct_letter === 'A' },
        { text: form.answer_b.trim(), is_correct: form.correct_letter === 'B' },
        { text: form.answer_c.trim(), is_correct: form.correct_letter === 'C' },
        { text: form.answer_d.trim(), is_correct: form.correct_letter === 'D' },
        { text: form.answer_e.trim(), is_correct: form.correct_letter === 'E' },
      ]
    }

    try {
      const url = isEdit ? `/api/admin/questions/${question!.id}` : '/api/admin/questions'
      const method = isEdit ? 'PATCH' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(data?.error ?? 'Speichern fehlgeschlagen')
        return
      }
      toast.success(isEdit ? 'Frage aktualisiert' : 'Frage erstellt')
      onSuccess()
      onOpenChange(false)
    } catch (err) {
      console.error(err)
      toast.error('Netzwerkfehler')
    } finally {
      setSubmitting(false)
    }
  }

  function toggleSubject(id: string, checked: boolean) {
    setForm((f) => {
      const next = checked
        ? Array.from(new Set([...f.subject_ids, id]))
        : f.subject_ids.filter((sid) => sid !== id)
      loadTopicsForSubjects(next)
      return { ...f, subject_ids: next, topic_id: '_none' }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#1F2937] border-[#4B5563] text-[#F9FAFB] max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-[#F9FAFB]">
            {isEdit ? 'Frage bearbeiten' : 'Neue Frage erstellen'}
          </DialogTitle>
          <DialogDescription className="text-[#9CA3AF]">
            {isEdit
              ? 'Bestehende Frage anpassen. Antworten werden vollständig ersetzt.'
              : 'Lege eine neue Frage an — Multiple Choice oder Freitext.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Question type selector */}
          <div className="space-y-2">
            <Label>Fragetyp</Label>
            <div className="flex gap-3">
              {(['multiple_choice', 'open'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, type: t }))}
                  className={`flex-1 py-2 rounded-xl border text-sm font-medium transition-colors ${
                    form.type === t
                      ? 'bg-[#58CC02]/20 border-[#58CC02] text-[#58CC02]'
                      : 'border-[#4B5563] text-[#9CA3AF] hover:text-[#F9FAFB]'
                  }`}
                >
                  {t === 'multiple_choice' ? 'Multiple Choice' : 'Freitext (Offen)'}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-baseline justify-between">
              <Label htmlFor="question_text">Fragetext</Label>
              <span
                className={`text-xs ${
                  remaining < 0 ? 'text-[#FF4B4B]' : 'text-[#9CA3AF]'
                }`}
              >
                {remaining} Zeichen übrig
              </span>
            </div>
            <Textarea
              id="question_text"
              rows={3}
              value={form.question_text}
              onChange={(e) => setForm({ ...form, question_text: e.target.value })}
              className="bg-[#111827] border-[#4B5563] text-[#F9FAFB]"
              maxLength={1000}
            />
            {errors.question_text && (
              <p className="text-xs text-[#FF4B4B]">{errors.question_text}</p>
            )}
          </div>

          {form.type === 'multiple_choice' && (
            <div className="space-y-3">
              <Label>Antworten (eine muss richtig sein)</Label>
              <RadioGroup
                value={form.correct_letter}
                onValueChange={(v) =>
                  setForm({ ...form, correct_letter: v as 'A' | 'B' | 'C' | 'D' | 'E' })
                }
                className="space-y-2"
              >
                {(['A', 'B', 'C', 'D', 'E'] as const).map((letter) => {
                  const key = (`answer_${letter.toLowerCase()}` as
                    | 'answer_a'
                    | 'answer_b'
                    | 'answer_c'
                    | 'answer_d'
                    | 'answer_e')
                  const errorKey = key
                  return (
                    <div key={letter} className="space-y-1">
                      <div className="flex items-center gap-3">
                        <RadioGroupItem
                          value={letter}
                          id={`ans-${letter}`}
                          className="border-[#4B5563]"
                        />
                        <Label
                          htmlFor={`ans-${letter}`}
                          className="w-6 text-center text-sm font-semibold text-[#58CC02]"
                        >
                          {letter}
                        </Label>
                        <Input
                          value={form[key]}
                          onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                          placeholder={`Antwort ${letter}`}
                          className="flex-1 bg-[#111827] border-[#4B5563] text-[#F9FAFB]"
                        />
                      </div>
                      {errors[errorKey] && (
                        <p className="text-xs text-[#FF4B4B] pl-12">{errors[errorKey]}</p>
                      )}
                    </div>
                  )
                })}
              </RadioGroup>
            </div>
          )}

          {form.type === 'open' && (
            <div className="space-y-2">
              <Label htmlFor="sample_answer">Musterlösung (für Selbstbewertung)</Label>
              <Textarea
                id="sample_answer"
                rows={4}
                value={form.sample_answer}
                onChange={(e) => setForm({ ...form, sample_answer: e.target.value })}
                placeholder="Erwartete Antwort — wird dem Azubi nach der Prüfung gezeigt"
                className="bg-[#111827] border-[#4B5563] text-[#F9FAFB]"
                maxLength={2000}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="explanation">Erklärung (optional)</Label>
            <Textarea
              id="explanation"
              rows={2}
              value={form.explanation}
              onChange={(e) => setForm({ ...form, explanation: e.target.value })}
              className="bg-[#111827] border-[#4B5563] text-[#F9FAFB]"
              maxLength={2000}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Schwierigkeit</Label>
              <Select
                value={form.difficulty}
                onValueChange={(v) =>
                  setForm({ ...form, difficulty: v as 'leicht' | 'mittel' | 'schwer' })
                }
              >
                <SelectTrigger className="bg-[#111827] border-[#4B5563] text-[#F9FAFB]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1F2937] border-[#4B5563] text-[#F9FAFB]">
                  <SelectItem value="leicht">Leicht</SelectItem>
                  <SelectItem value="mittel">Mittel</SelectItem>
                  <SelectItem value="schwer">Schwer</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>
                Klassenstufe <span className="text-[#FF4B4B]">*</span>
              </Label>
              <Select
                value={form.class_level}
                onValueChange={(v) =>
                  setForm({ ...form, class_level: v as FormState['class_level'] })
                }
              >
                <SelectTrigger className="bg-[#111827] border-[#4B5563] text-[#F9FAFB]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1F2937] border-[#4B5563] text-[#F9FAFB]">
                  <SelectItem value="_all">Alle Klassen</SelectItem>
                  <SelectItem value="10">Klasse 10</SelectItem>
                  <SelectItem value="11">Klasse 11</SelectItem>
                  <SelectItem value="12">Klasse 12</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Fächer</Label>
              <div className="flex flex-wrap gap-2 p-3 bg-[#111827] border border-[#4B5563] rounded-xl">
                {subjects.length === 0 ? (
                  <span className="text-xs text-[#9CA3AF]">Keine Fächer verfügbar.</span>
                ) : (
                  subjects.map((s) => {
                    const checked = form.subject_ids.includes(s.id)
                    return (
                      <label
                        key={s.id}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-full border cursor-pointer text-sm transition-colors ${
                          checked
                            ? 'bg-[#58CC02]/20 border-[#58CC02] text-[#F9FAFB]'
                            : 'border-[#4B5563] text-[#9CA3AF] hover:text-[#F9FAFB]'
                        }`}
                      >
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(c) => toggleSubject(s.id, c === true)}
                          className="border-[#4B5563]"
                        />
                        <span className="font-semibold">{s.code}</span>
                      </label>
                    )
                  })
                )}
              </div>
              {errors.subject_ids && (
                <p className="text-xs text-[#FF4B4B]">{errors.subject_ids}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Thema (optional)</Label>
              <Select
                value={form.topic_id}
                onValueChange={(v) => setForm({ ...form, topic_id: v })}
                disabled={form.subject_ids.length === 0}
              >
                <SelectTrigger className="bg-[#111827] border-[#4B5563] text-[#F9FAFB]">
                  {loadingTopics ? (
                    <span className="text-[#9CA3AF] text-sm">Laden…</span>
                  ) : (
                    <SelectValue placeholder="Kein Thema" />
                  )}
                </SelectTrigger>
                <SelectContent className="bg-[#1F2937] border-[#4B5563] text-[#F9FAFB]">
                  <SelectItem value="_none">Kein Thema</SelectItem>
                  {topics.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.subject_ids.length === 0 && (
                <p className="text-xs text-[#9CA3AF]">Erst ein Fach auswählen.</p>
              )}
            </div>
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Abbrechen
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="bg-[#58CC02] hover:bg-[#4CAD02] text-white rounded-xl"
            >
              {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isEdit ? 'Speichern' : 'Erstellen'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
