'use client'

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
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
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { AdminSegmented } from '@/components/admin/admin-segmented'
import { QuestionFields, EMPTY_FIELDS, LETTERS, type QuestionFieldValues } from '@/components/admin/question-fields'
import {
  FachThemaSelect,
  isNoTopicValue,
  noTopicValue,
  subjectOfNoTopic,
  useTopicOptions,
  type TopicOption,
} from '@/components/admin/fach-thema-select'
import { useClassLevelOptions } from '@/components/department-provider'
import { showVersionConflict } from '@/components/admin/content-meta'

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
  /** Vorbelegung beim Anlegen (PROJ-85: „Neue Frage“ im gewählten Fach/Thema) */
  defaults?: QuestionDefaults
  /** „Duplizieren“ (PROJ-131): Werte dieser Frage, gespeichert wird eine neue */
  template?: AdminQuestion | null
}

/** Vorbelegung einer neuen Frage; wirkt nur, wenn keine Frage bearbeitet wird. */
export interface QuestionDefaults {
  subjectId?: string
  topicId?: string | null
  classLevel?: 10 | 11 | 12 | null
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
  /** Beschriftung des linken Knopfes („Abbrechen“; im Dialog „Fragen hinzufügen“: „Zurück“) */
  cancelLabel?: string
  /** Kein eigener Erfolgs-Toast (der Aufrufer meldet das Gesamtergebnis) */
  quietSuccess?: boolean
  onCancel?: () => void
  /** Meldet, ob das Formular gegenüber dem Ausgangsstand verändert ist */
  onDirtyChange?: (dirty: boolean) => void
  defaults?: QuestionDefaults
  template?: AdminQuestion | null
  /** Schon geladene Themen (der Dialog „Fragen hinzufügen“ lädt sie einmal für alle Wege) */
  topicData?: ReturnType<typeof useTopicOptions>
}

type FormState = QuestionFieldValues & {
  /** Themen-ID, `none:<Fach-ID>` (nur beim Bearbeiten einer Frage ohne Thema) oder leer */
  topic_value: string
  subject_id: string
  class_level: '' | '10' | '11' | '12'
  is_active: boolean
}

const EMPTY: FormState = {
  ...EMPTY_FIELDS,
  topic_value: '',
  subject_id: '',
  class_level: '',
  is_active: true,
}

const AUTO_LEVEL_HINT = (level: string) => `Stufe ${level}, aus dem Thema`

export function QuestionFormModal({
  open,
  onOpenChange,
  question,
  subjects,
  onSuccess,
  onOpenHistory,
  defaults,
  template,
}: Props) {
  const isEdit = Boolean(question)
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-ws-surface border-ws-line text-ws-text max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-ws-text">
            {isEdit ? 'Frage bearbeiten' : template ? 'Frage duplizieren' : 'Frage schreiben'}
          </DialogTitle>
          <DialogDescription className="text-ws-muted">
            {isEdit
              ? 'Ändere, was nicht mehr stimmt.'
              : template
                ? 'Passe die Kopie an. Die ursprüngliche Frage bleibt unverändert.'
                : 'Schreibe eine Frage mit Antworten oder als Freitext.'}
          </DialogDescription>
        </DialogHeader>
        <QuestionFormBody
          active={open}
          question={question}
          subjects={subjects}
          defaults={defaults}
          template={template}
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
 * Das Fragenformular ohne Dialog-Hülle. Wird im Frage-Dialog der Fragenliste,
 * im Weg „Selbst schreiben“ von „Fragen hinzufügen“ (PROJ-132) und im
 * Prüf-Dialog der Meldungs-Inbox (PROJ-82) verwendet, damit alle dieselben
 * Felder, Prüfungen und denselben Konflikt-Schutz haben.
 */
export const QuestionFormBody = forwardRef<QuestionFormHandle, BodyProps>(function QuestionFormBody(
  { active: open, question, onSaved, onConflict, onOpenHistory, hideFooter, cancelLabel = 'Abbrechen', quietSuccess, onCancel, onDirtyChange, defaults, template, topicData },
  ref
) {
  const classLevelOptions = useClassLevelOptions()
  const ownTopics = useTopicOptions(open && !topicData)
  const { options: topicOptions, loading: loadingTopics, failed: topicsFailed, reload } = topicData ?? ownTopics
  const [form, setForm] = useState<FormState>(EMPTY)
  const [submitting, setSubmitting] = useState(false)
  const saveAndNewRef = useRef(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [changeLevel, setChangeLevel] = useState(false)

  const isEdit = Boolean(question)
  const initialRef = useRef<string>('')
  const originalSubjectIds = (question?.question_subjects ?? [])
    .map((qs) => qs.subjects?.id)
    .filter((id): id is string => Boolean(id))
  const defaultTopicId = defaults?.topicId ?? null
  const defaultClassLevel = defaults?.classLevel ?? null
  // Eine bestehende Frage ohne Thema oder Stufe darf ohne beides gespeichert werden (nur neue Fragen brauchen sie)
  const legacyNoTopic = isEdit && !question?.topic_id
  const legacyNoLevel = isEdit && !question?.class_level

  // Seed form state when opening / switching question
  useEffect(() => {
    if (!open) return
    const source = question ?? template
    if (source) {
      const ordered = [...source.answer_options].sort((a, b) => a.display_order - b.display_order)
      const [a, b, c, d, e] = [0, 1, 2, 3, 4].map((i) => ordered[i]?.option_text ?? '')
      const correctIdx = ordered.findIndex((o) => o.is_correct)
      const subjectId = source.question_subjects.map((qs) => qs.subjects?.id).find((id): id is string => Boolean(id)) ?? ''
      const seeded: FormState = {
        question_text: source.question_text,
        type: source.type ?? 'multiple_choice',
        sample_answer: source.sample_answer ?? '',
        answer_a: a,
        answer_b: b,
        answer_c: c,
        answer_d: d,
        answer_e: e,
        correct_letter: correctIdx >= 0 ? LETTERS[correctIdx] : '',
        explanation: source.explanation ?? '',
        difficulty: source.difficulty,
        subject_id: subjectId,
        topic_value: source.topic_id ?? (question && subjectId ? noTopicValue(subjectId) : ''),
        class_level: source.class_level ? (String(source.class_level) as FormState['class_level']) : '',
        is_active: template ? true : (source.is_active ?? true),
      }
      initialRef.current = JSON.stringify(seeded)
      setForm(seeded)
    } else {
      const seeded: FormState = {
        ...EMPTY,
        subject_id: defaults?.subjectId ?? '',
        topic_value: defaultTopicId ?? '',
        class_level: defaultClassLevel ? (String(defaultClassLevel) as FormState['class_level']) : '',
      }
      initialRef.current = JSON.stringify(seeded)
      setForm(seeded)
    }
    setErrors({})
    setChangeLevel(false)
  }, [open, question, template, defaults?.subjectId, defaultTopicId, defaultClassLevel])

  const selectedTopic: TopicOption | null = topicOptions.find((t) => t.id === form.topic_value) ?? null

  // Das Thema bestimmt die Stufe, wenn es nur Fragen einer Stufe hat (Themen haben selbst keine Stufe)
  useEffect(() => {
    if (!open || !selectedTopic) return
    if (form.subject_id !== selectedTopic.subjectId) setForm((f) => ({ ...f, subject_id: selectedTopic.subjectId }))
    if (selectedTopic.classLevels.length === 1 && form.class_level === '' && !legacyNoLevel) {
      setForm((f) => ({ ...f, class_level: String(selectedTopic.classLevels[0]) as FormState['class_level'] }))
      initialRef.current = initialRef.current ? JSON.stringify({ ...JSON.parse(initialRef.current), class_level: String(selectedTopic.classLevels[0]) }) : initialRef.current
    }
  }, [open, selectedTopic, form.subject_id, form.class_level, legacyNoLevel])

  useEffect(() => {
    onDirtyChange?.(open && JSON.stringify(form) !== initialRef.current)
  }, [form, open, onDirtyChange])

  function pickTopic(value: string, option: TopicOption | null) {
    setForm((f) => {
      const next: FormState = { ...f, topic_value: value }
      if (option) {
        next.subject_id = option.subjectId
        if (option.classLevels.length === 1) next.class_level = String(option.classLevels[0]) as FormState['class_level']
        else if (f.class_level !== '' && option.classLevels.length > 0 && !option.classLevels.includes(Number(f.class_level))) next.class_level = ''
      } else if (isNoTopicValue(value)) {
        next.subject_id = subjectOfNoTopic(value)
      }
      return next
    })
    setChangeLevel(false)
  }

  function validate(): boolean {
    const e: Record<string, string> = {}
    if (!form.question_text.trim()) e.question_text = 'Bitte schreibe den Fragetext.'
    if (form.question_text.length > 1000) e.question_text = 'Der Fragetext ist zu lang (höchstens 1000 Zeichen).'
    if (form.type === 'multiple_choice') {
      for (const letter of LETTERS) {
        const key = `answer_${letter.toLowerCase()}` as 'answer_a'
        if (!form[key].trim()) e[key] = `Bitte schreibe Antwort ${letter}.`
      }
      if (form.correct_letter === '') e.correct_letter = 'Bitte wähle die richtige Antwort.'
    }
    const noTopicOk = legacyNoTopic && isNoTopicValue(form.topic_value)
    if (!noTopicOk && (form.topic_value === '' || isNoTopicValue(form.topic_value))) {
      e.topic = 'Bitte wähle ein Thema. So finden Azubis die Frage im richtigen Lernpfad.'
    }
    if (classLevelOptions.length > 0 && form.class_level === '' && !legacyNoLevel) e.class_level = 'Bitte wähle eine Stufe.'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function save(): Promise<QuestionSaveResult> {
    if (!validate()) return 'invalid'
    setSubmitting(true)

    // Eine bestehende Frage behält ihre Fächer, solange das gewählte Fach dazugehört
    const subjectIds = isEdit && originalSubjectIds.includes(form.subject_id) ? originalSubjectIds : [form.subject_id]
    const payload: Record<string, unknown> = {
      question_text: form.question_text.trim(),
      difficulty: form.difficulty,
      explanation: form.explanation.trim() ? form.explanation.trim() : null,
      type: form.type,
      sample_answer: form.type === 'open' && form.sample_answer.trim() ? form.sample_answer.trim() : null,
      subject_ids: subjectIds,
      class_level: form.class_level === '' ? null : Number(form.class_level),
      topic_id: isNoTopicValue(form.topic_value) ? null : form.topic_value,
    }
    if (!isEdit || form.is_active !== (question?.is_active ?? true)) payload.is_active = form.is_active

    if (form.type === 'multiple_choice') {
      payload.answers = LETTERS.map((letter) => ({
        text: form[`answer_${letter.toLowerCase()}` as 'answer_a'].trim(),
        is_correct: form.correct_letter === letter,
      }))
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
        toast.error(data?.error ?? 'Die Frage konnte nicht gespeichert werden.')
        return 'error'
      }
      if (!quietSuccess) toast.success('Frage gespeichert')
      return 'ok'
    } catch (err) {
      console.error(err)
      toast.error('Keine Verbindung. Bitte versuche es noch einmal.')
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
      // Thema und Stufe bleiben für die nächste Frage stehen
      const next: FormState = { ...EMPTY, topic_value: form.topic_value, subject_id: form.subject_id, class_level: form.class_level }
      setForm(next)
      initialRef.current = JSON.stringify(next)
      setErrors({})
    }
  }

  const levelHint =
    selectedTopic && selectedTopic.classLevels.length === 1 && form.class_level === String(selectedTopic.classLevels[0])
      ? AUTO_LEVEL_HINT(form.class_level)
      : null
  const showLevelChoice = classLevelOptions.length > 0 && (levelHint === null || changeLevel)

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <FachThemaSelect
        value={form.topic_value}
        onChange={pickTopic}
        options={topicOptions}
        loading={loadingTopics}
        failed={topicsFailed}
        onRetry={reload}
        error={errors.topic}
        noTopicFor={legacyNoTopic && form.subject_id ? { subjectId: form.subject_id, subjectCode: '' } : null}
      />

      {classLevelOptions.length > 0 && (
        <div className="space-y-2">
          {levelHint && !changeLevel && (
            <p className="flex flex-wrap items-center gap-2 text-sm text-ws-muted">
              {levelHint}
              <button type="button" onClick={() => setChangeLevel(true)} className="min-h-11 px-1 text-ws-blue underline underline-offset-2">
                Ändern
              </button>
            </p>
          )}
          {showLevelChoice && (
            <>
              <Label>
                Stufe {!legacyNoLevel && <span className="text-ws-red" aria-hidden>*</span>}
              </Label>
              <div>
                <AdminSegmented
                  value={form.class_level === '' ? ('' as FormState['class_level']) : form.class_level}
                  onChange={(v) => setForm((f) => ({ ...f, class_level: v as FormState['class_level'] }))}
                  options={classLevelOptions as { value: FormState['class_level']; label: string }[]}
                  ariaLabel="Stufe"
                />
              </div>
            </>
          )}
          {errors.class_level && <p className="text-xs text-ws-red">{errors.class_level}</p>}
        </div>
      )}

      <QuestionFields values={form} onChange={(patch) => setForm((f) => ({ ...f, ...patch }))} errors={errors} />

      <div className="flex min-h-11 items-center justify-between gap-3 rounded-xl border border-ws-line bg-ws-bg px-3">
        <Label htmlFor="question-active" className="cursor-pointer py-3 text-sm">
          Für Azubis sichtbar
          <span className="block text-xs font-normal text-ws-muted">Ausgeschaltet bleibt die Frage versteckt.</span>
        </Label>
        <Switch id="question-active" checked={form.is_active} onCheckedChange={(checked) => setForm((f) => ({ ...f, is_active: checked }))} />
      </div>

      {!hideFooter && (
        <DialogFooter className="flex-wrap gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={() => onCancel?.()} disabled={submitting} className="min-h-11">
            {cancelLabel}
          </Button>
          {!isEdit && (
            <Button
              type="submit"
              disabled={submitting}
              variant="outline"
              onClick={() => { saveAndNewRef.current = true }}
              className="min-h-11 rounded-xl border-ws-line text-ws-text hover:bg-ws-raised"
            >
              {submitting && saveAndNewRef.current && <Loader2 className="mr-2 size-4 animate-spin" />}
              Speichern und nächste Frage
            </Button>
          )}
          <Button
            type="submit"
            disabled={submitting}
            onClick={() => { saveAndNewRef.current = false }}
            className="min-h-11 rounded-xl bg-ws-green text-ws-on-accent hover:bg-ws-green-hover"
          >
            {submitting && !saveAndNewRef.current && <Loader2 className="mr-2 size-4 animate-spin" />}
            Speichern
          </Button>
        </DialogFooter>
      )}
    </form>
  )
})
