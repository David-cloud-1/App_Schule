'use client'

import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'
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
import { useClassLevelOptions } from '@/components/department-provider'
import { showVersionConflict } from '@/components/admin/content-meta'
import { useNeedsTargetDepartment } from '@/components/admin/target-department-field'

export type AdminSubject = {
  id: string
  code: string
  name: string
  /** Bereich des Fachs: in „Alle Bereiche“ gibt es gleiche Kürzel in mehreren Bereichen (PROJ-70) */
  department_name?: string | null
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
  /** PROJ-38: nur in Leistungsnachweisen nutzbar, bis der Admin sie freigibt */
  assessment_only?: boolean
  /** PROJ-46: private Nachweis-Frage einer Lehrkraft — nur für den Super-Admin sichtbar, nie freigebbar */
  is_private?: boolean
  owner_id?: string | null
  class_level?: number | null
  topic_id?: string | null
  /** Zählnummer beim Öffnen (Konflikt-Schutz, PROJ-70) */
  version_number?: number
  answer_options: AdminAnswerOption[]
  question_subjects: { subjects: { id: string; code: string; name: string } | null }[]
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  question?: AdminQuestion | null
  subjects: AdminSubject[]
  onSuccess: () => void
  /** Öffnet den Verlauf aus dem Konflikt-Hinweis */
  onOpenHistory?: (question: AdminQuestion) => void
}

/** Ergebnis von `save()` am Formular-Körper (PROJ-82). */
export type QuestionSaveResult = 'ok' | 'invalid' | 'conflict' | 'error'

/** Zugriff auf den Formular-Körper von außen (Prüf-Dialog der Meldungs-Inbox, PROJ-82). */
export interface QuestionFormHandle {
  save: () => Promise<QuestionSaveResult>
}

interface BodyProps {
  /** Formular mit den Werten der Frage befüllen (beim Dialog: solange er offen ist) */
  active: boolean
  question?: AdminQuestion | null
  subjects: AdminSubject[]
  /** Nach erfolgreichem Speichern über die Knöpfe des Formulars */
  onSaved: (opts: { andNew: boolean }) => void
  /** Jemand anderes hat zwischenzeitlich gespeichert (Konflikt-Hinweis wurde gezeigt) */
  onConflict?: () => void
  onOpenHistory?: (question: AdminQuestion) => void
  /** Knöpfe am Formularende ausblenden (Prüf-Dialog hat eine eigene Leiste) */
  hideFooter?: boolean
  /** Kein eigener Erfolgs-Toast (der Aufrufer meldet das Gesamtergebnis) */
  quietSuccess?: boolean
  onCancel?: () => void
  /** Meldet, ob das Formular gegenüber dem Ausgangsstand verändert ist */
  onDirtyChange?: (dirty: boolean) => void
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
  onOpenHistory,
}: Props) {
  const isEdit = Boolean(question)
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-ws-surface border-ws-line text-ws-text max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-ws-text">
            {isEdit ? 'Frage bearbeiten' : 'Neue Frage erstellen'}
          </DialogTitle>
          <DialogDescription className="text-ws-muted">
            {isEdit
              ? 'Bestehende Frage anpassen. Antworten werden vollständig ersetzt.'
              : 'Lege eine neue Frage an — Multiple Choice oder Freitext.'}
          </DialogDescription>
        </DialogHeader>
        <QuestionFormBody
          active={open}
          question={question}
          subjects={subjects}
          onOpenHistory={onOpenHistory}
          onCancel={() => onOpenChange(false)}
          onSaved={({ andNew }) => {
            onSuccess()
            if (!andNew) onOpenChange(false)
          }}
          onConflict={() => {
            onSuccess()
            onOpenChange(false)
          }}
        />
      </DialogContent>
    </Dialog>
  )
}

/**
 * Das Fragenformular ohne Dialog-Hülle. Wird im Frage-Dialog der Fragenliste
 * und im Prüf-Dialog der Meldungs-Inbox (PROJ-82) verwendet, damit beide
 * dieselben Felder, Prüfungen und denselben Konflikt-Schutz haben.
 */
export const QuestionFormBody = forwardRef<QuestionFormHandle, BodyProps>(function QuestionFormBody(
  { active: open, question, subjects, onSaved, onConflict, onOpenHistory, hideFooter, quietSuccess, onCancel, onDirtyChange },
  ref
) {
  const classLevelOptions = useClassLevelOptions()
  const inAllScopes = useNeedsTargetDepartment()
  const [form, setForm] = useState<FormState>(EMPTY)
  const [submitting, setSubmitting] = useState(false)
  const saveAndNewRef = useRef(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [topics, setTopics] = useState<AdminTopic[]>([])
  const [loadingTopics, setLoadingTopics] = useState(false)

  const isEdit = Boolean(question)
  const initialRef = useRef<string>('')

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
      const seeded: FormState = {
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
      }
      initialRef.current = JSON.stringify(seeded)
      setForm(seeded)
      loadTopicsForSubjects(subjectIds)
    } else {
      initialRef.current = JSON.stringify(EMPTY)
      setForm(EMPTY)
      setTopics([])
    }
    setErrors({})
  }, [open, question, loadTopicsForSubjects])

  const remaining = useMemo(() => 1000 - form.question_text.length, [form.question_text])

  useEffect(() => {
    onDirtyChange?.(open && JSON.stringify(form) !== initialRef.current)
  }, [form, open, onDirtyChange])

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

  async function save(): Promise<QuestionSaveResult> {
    if (!validate()) return 'invalid'
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
      if (isEdit && question?.version_number) payload.expected_version = question.version_number
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        if (showVersionConflict(res, data, onOpenHistory && question ? () => onOpenHistory(question) : undefined)) {
          onConflict?.()
          return 'conflict'
        }
        toast.error(data?.error ?? 'Speichern fehlgeschlagen')
        return 'error'
      }
      if (!quietSuccess) toast.success(isEdit ? 'Frage aktualisiert' : 'Frage erstellt')
      return 'ok'
    } catch (err) {
      console.error(err)
      toast.error('Netzwerkfehler')
      return 'error'
    } finally {
      setSubmitting(false)
    }
  }

  useImperativeHandle(ref, () => ({ save }))

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault()
    const result = await save()
    if (result !== 'ok') return
    const andNew = saveAndNewRef.current
    onSaved({ andNew })
    if (andNew) {
      saveAndNewRef.current = false
      setForm(EMPTY)
      initialRef.current = JSON.stringify(EMPTY)
      setTopics([])
      setErrors({})
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
                      ? 'bg-ws-green/20 border-ws-green text-ws-green'
                      : 'border-ws-line text-ws-muted hover:text-ws-text'
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
                  remaining < 0 ? 'text-ws-red' : 'text-ws-muted'
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
              className="bg-ws-bg border-ws-line text-ws-text"
              maxLength={1000}
            />
            {errors.question_text && (
              <p className="text-xs text-ws-red">{errors.question_text}</p>
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
                          className="border-ws-line"
                        />
                        <Label
                          htmlFor={`ans-${letter}`}
                          className="w-6 text-center text-sm font-semibold text-ws-green"
                        >
                          {letter}
                        </Label>
                        <Input
                          value={form[key]}
                          onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                          placeholder={`Antwort ${letter}`}
                          className="flex-1 bg-ws-bg border-ws-line text-ws-text"
                        />
                      </div>
                      {errors[errorKey] && (
                        <p className="text-xs text-ws-red pl-12">{errors[errorKey]}</p>
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
                className="bg-ws-bg border-ws-line text-ws-text"
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
              className="bg-ws-bg border-ws-line text-ws-text"
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
                <SelectTrigger className="bg-ws-bg border-ws-line text-ws-text">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-ws-surface border-ws-line text-ws-text">
                  <SelectItem value="leicht">Leicht</SelectItem>
                  <SelectItem value="mittel">Mittel</SelectItem>
                  <SelectItem value="schwer">Schwer</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>
                Klassenstufe <span className="text-ws-red">*</span>
              </Label>
              <Select
                value={form.class_level}
                onValueChange={(v) =>
                  setForm({ ...form, class_level: v as FormState['class_level'] })
                }
              >
                <SelectTrigger className="bg-ws-bg border-ws-line text-ws-text">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-ws-surface border-ws-line text-ws-text">
                  <SelectItem value="_all">Alle Klassen</SelectItem>
                  {classLevelOptions.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Fächer</Label>
              <div className="flex flex-wrap gap-2 p-3 bg-ws-bg border border-ws-line rounded-xl">
                {subjects.length === 0 ? (
                  <span className="text-xs text-ws-muted">Keine Fächer verfügbar.</span>
                ) : (
                  subjects.map((s) => {
                    const checked = form.subject_ids.includes(s.id)
                    return (
                      <label
                        key={s.id}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-full border cursor-pointer text-sm transition-colors ${
                          checked
                            ? 'bg-ws-green/20 border-ws-green text-ws-text'
                            : 'border-ws-line text-ws-muted hover:text-ws-text'
                        }`}
                      >
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(c) => toggleSubject(s.id, c === true)}
                          className="border-ws-line"
                        />
                        <span className="font-semibold">{s.code}</span>
                        {inAllScopes && s.department_name && (
                          <span className="text-xs text-ws-muted">{s.department_name}</span>
                        )}
                      </label>
                    )
                  })
                )}
              </div>
              {inAllScopes && (
                <p className="text-xs text-ws-muted">Das Fach bestimmt, in welchem Bereich die Frage liegt.</p>
              )}
              {errors.subject_ids && (
                <p className="text-xs text-ws-red">{errors.subject_ids}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Thema (optional)</Label>
              <Select
                value={form.topic_id}
                onValueChange={(v) => setForm({ ...form, topic_id: v })}
                disabled={form.subject_ids.length === 0}
              >
                <SelectTrigger className="bg-ws-bg border-ws-line text-ws-text">
                  {loadingTopics ? (
                    <span className="text-ws-muted text-sm">Laden…</span>
                  ) : (
                    <SelectValue placeholder="Kein Thema" />
                  )}
                </SelectTrigger>
                <SelectContent className="bg-ws-surface border-ws-line text-ws-text">
                  <SelectItem value="_none">Kein Thema</SelectItem>
                  {topics.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.subject_ids.length === 0 && (
                <p className="text-xs text-ws-muted">Erst ein Fach auswählen.</p>
              )}
            </div>
          </div>

          {!hideFooter && (
          <DialogFooter className="gap-2 pt-2 flex-wrap">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onCancel?.()}
              disabled={submitting}
            >
              Abbrechen
            </Button>
            {!isEdit && (
              <Button
                type="submit"
                disabled={submitting}
                variant="outline"
                onClick={() => { saveAndNewRef.current = true }}
                className="rounded-xl border-ws-line text-ws-text hover:bg-ws-raised"
              >
                {submitting && saveAndNewRef.current && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Speichern & Neue
              </Button>
            )}
            <Button
              type="submit"
              disabled={submitting}
              onClick={() => { saveAndNewRef.current = false }}
              className="bg-ws-green hover:bg-ws-green-hover text-ws-on-accent rounded-xl"
            >
              {submitting && !saveAndNewRef.current && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isEdit ? 'Speichern' : 'Erstellen'}
            </Button>
          </DialogFooter>
          )}
        </form>
  )
})
