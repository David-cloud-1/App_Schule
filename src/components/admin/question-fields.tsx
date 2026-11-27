'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { AdminSegmented } from '@/components/admin/admin-segmented'
import { MAX_EXPLANATION, MAX_OPTION_TEXT, MAX_QUESTION_TEXT, MAX_SAMPLE_ANSWER, type IntakeQuestion } from '@/lib/question-intake'

/**
 * Die Felder einer Frage (PROJ-132): Schwierigkeit, Fragetyp, Fragetext,
 * Antworten bzw. Musterantwort und Erklärung. Das Formular „Frage schreiben /
 * bearbeiten“ und die Karten der Vorschau („Aus Material“, „Aus Tabelle“)
 * zeigen genau dieselben Felder – deshalb liegen sie an einer Stelle.
 */
export type Letter = 'A' | 'B' | 'C' | 'D' | 'E'
export const LETTERS: readonly Letter[] = ['A', 'B', 'C', 'D', 'E']

export interface QuestionFieldValues {
  question_text: string
  type: 'multiple_choice' | 'open'
  sample_answer: string
  answer_a: string
  answer_b: string
  answer_c: string
  answer_d: string
  answer_e: string
  correct_letter: Letter | ''
  explanation: string
  difficulty: 'leicht' | 'mittel' | 'schwer'
}

export const EMPTY_FIELDS: QuestionFieldValues = {
  question_text: '',
  type: 'multiple_choice',
  sample_answer: '',
  answer_a: '',
  answer_b: '',
  answer_c: '',
  answer_d: '',
  answer_e: '',
  correct_letter: '',
  explanation: '',
  difficulty: 'mittel',
}

const ANSWER_KEYS = ['answer_a', 'answer_b', 'answer_c', 'answer_d', 'answer_e'] as const

const DIFFICULTY_OPTIONS = [
  { value: 'leicht', label: 'Leicht' },
  { value: 'mittel', label: 'Mittel' },
  { value: 'schwer', label: 'Schwer' },
] as const

const TYPE_OPTIONS = [
  { value: 'multiple_choice', label: 'Auswahl' },
  { value: 'open', label: 'Freitext' },
] as const

/** Karte der Vorschau → Feldwerte */
export function fieldsFromIntake(q: IntakeQuestion): QuestionFieldValues {
  const [a, b, c, d, e] = [0, 1, 2, 3, 4].map((i) => q.options[i] ?? '')
  return {
    question_text: q.question_text,
    type: q.type,
    sample_answer: q.sample_answer ?? '',
    answer_a: a,
    answer_b: b,
    answer_c: c,
    answer_d: d,
    answer_e: e,
    correct_letter: q.correct_index != null && q.correct_index >= 0 && q.correct_index < 5 ? LETTERS[q.correct_index] : '',
    explanation: q.explanation ?? '',
    difficulty: q.difficulty,
  }
}

/** Feldwerte → Karte der Vorschau (ohne Prüfung; die macht `validateIntakeQuestion`) */
export function intakeFromFields(values: QuestionFieldValues, base: IntakeQuestion): IntakeQuestion {
  const isOpen = values.type === 'open'
  return {
    ...base,
    question_text: values.question_text.trim(),
    type: values.type,
    options: isOpen ? [] : ANSWER_KEYS.map((k) => values[k].trim()),
    correct_index: isOpen || values.correct_letter === '' ? null : LETTERS.indexOf(values.correct_letter),
    sample_answer: isOpen ? values.sample_answer.trim() || null : null,
    explanation: values.explanation.trim() || null,
    difficulty: values.difficulty,
  }
}

export function QuestionFields({
  values,
  onChange,
  errors = {},
  idPrefix = 'q',
}: {
  values: QuestionFieldValues
  onChange: (patch: Partial<QuestionFieldValues>) => void
  errors?: Record<string, string>
  /** Nötig, wenn mehrere Karten gleichzeitig offen sind (eindeutige Feld-IDs) */
  idPrefix?: string
}) {
  const remaining = MAX_QUESTION_TEXT - values.question_text.length

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label id={`${idPrefix}-difficulty-label`}>Schwierigkeit</Label>
          <div>
            <AdminSegmented
              value={values.difficulty}
              onChange={(difficulty) => onChange({ difficulty })}
              options={DIFFICULTY_OPTIONS}
              ariaLabel="Schwierigkeit"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label id={`${idPrefix}-type-label`}>Fragetyp</Label>
          <div>
            <AdminSegmented value={values.type} onChange={(type) => onChange({ type })} options={TYPE_OPTIONS} ariaLabel="Fragetyp" />
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-baseline justify-between">
          <Label htmlFor={`${idPrefix}-text`}>Fragetext</Label>
          <span className={`text-xs ${remaining < 0 ? 'text-ws-red' : 'text-ws-muted'}`}>{remaining} Zeichen übrig</span>
        </div>
        <Textarea
          id={`${idPrefix}-text`}
          rows={3}
          value={values.question_text}
          onChange={(e) => onChange({ question_text: e.target.value })}
          className="border-ws-line bg-ws-bg text-ws-text"
          maxLength={MAX_QUESTION_TEXT}
        />
        {errors.question_text && <p className="text-xs text-ws-red">{errors.question_text}</p>}
      </div>

      {values.type === 'multiple_choice' ? (
        <div className="space-y-3">
          <Label>Antworten (eine muss richtig sein)</Label>
          <RadioGroup
            value={values.correct_letter}
            onValueChange={(v) => onChange({ correct_letter: v as Letter })}
            className="space-y-2"
            aria-label="Richtige Antwort"
          >
            {LETTERS.map((letter, i) => {
              const key = ANSWER_KEYS[i]
              return (
                <div key={letter} className="space-y-1">
                  <div className="flex items-center gap-3">
                    <RadioGroupItem value={letter} id={`${idPrefix}-ans-${letter}`} className="size-5 border-ws-line" aria-label={`Antwort ${letter} ist richtig`} />
                    <Label htmlFor={`${idPrefix}-ans-${letter}`} className="w-6 text-center text-sm font-semibold text-ws-green">
                      {letter}
                    </Label>
                    <Input
                      value={values[key]}
                      onChange={(e) => onChange({ [key]: e.target.value })}
                      placeholder={`Antwort ${letter}`}
                      aria-label={`Antwort ${letter}`}
                      maxLength={MAX_OPTION_TEXT}
                      className="min-h-11 flex-1 border-ws-line bg-ws-bg text-ws-text"
                    />
                  </div>
                  {errors[key] && <p className="pl-12 text-xs text-ws-red">{errors[key]}</p>}
                </div>
              )
            })}
          </RadioGroup>
          {errors.correct_letter && <p className="text-xs text-ws-red">{errors.correct_letter}</p>}
        </div>
      ) : (
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-sample`}>Musterantwort</Label>
          <Textarea
            id={`${idPrefix}-sample`}
            rows={4}
            value={values.sample_answer}
            onChange={(e) => onChange({ sample_answer: e.target.value })}
            placeholder="Die erwartete Antwort. Azubis sehen sie nach der Prüfung."
            className="border-ws-line bg-ws-bg text-ws-text"
            maxLength={MAX_SAMPLE_ANSWER}
          />
          {errors.sample_answer && <p className="text-xs text-ws-red">{errors.sample_answer}</p>}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-explanation`}>Erklärung (freiwillig)</Label>
        <Textarea
          id={`${idPrefix}-explanation`}
          rows={2}
          value={values.explanation}
          onChange={(e) => onChange({ explanation: e.target.value })}
          className="border-ws-line bg-ws-bg text-ws-text"
          maxLength={MAX_EXPLANATION}
        />
      </div>
    </div>
  )
}
