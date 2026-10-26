'use client'

import { useEffect, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { MAX_CLASS_NAME_LENGTH } from '@/lib/assessment-category'

/** PROJ-39: Ablage-Felder eines Leistungsnachweises (alles optional außer dem vorbelegten Schuljahr) */
export type CategoryValue = {
  schoolYear: string
  className: string
  /** null = ohne Fach */
  subjectId: string | null
}

export type SubjectOption = { id: string; name: string; code: string }

const NO_SUBJECT = 'none'

/** Fächer des Bereichs für die Auswahl; bei Fehler leer (die Ablage bleibt dann ohne Fach nutzbar) */
export function useAssessmentSubjects(): SubjectOption[] {
  const [subjects, setSubjects] = useState<SubjectOption[]>([])
  useEffect(() => {
    let cancelled = false
    fetch('/api/admin/subjects')
      .then((res) => (res.ok ? res.json() : { subjects: [] }))
      .then((json) => {
        if (!cancelled) setSubjects((json.subjects ?? []).map((s: SubjectOption) => ({ id: s.id, name: s.name, code: s.code })))
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])
  return subjects
}

interface Props {
  idPrefix: string
  value: CategoryValue
  onChange: (value: CategoryValue) => void
  subjects: SubjectOption[]
  /** Bereits verwendete Klassen als Vorschlag */
  classSuggestions: string[]
  /** Wählbare Schuljahre */
  schoolYears: string[]
  disabled?: boolean
}

export function AssessmentCategoryFields({ idPrefix, value, onChange, subjects, classSuggestions, schoolYears, disabled }: Props) {
  const triggerClass = 'h-11 bg-ws-bg border-ws-line text-ws-text'
  const listId = `${idPrefix}-klassen`
  // Das gespeicherte Schuljahr muss immer wählbar sein
  const years = schoolYears.includes(value.schoolYear) ? schoolYears : [value.schoolYear, ...schoolYears]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-schuljahr`}>Schuljahr</Label>
        <Select value={value.schoolYear} onValueChange={(v) => onChange({ ...value, schoolYear: v })} disabled={disabled}>
          <SelectTrigger id={`${idPrefix}-schuljahr`} className={triggerClass}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-ws-surface border-ws-line text-ws-text">
            {years.map((y) => (
              <SelectItem key={y} value={y}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-klasse`}>Klasse <span className="font-normal text-ws-faint">— optional</span></Label>
        <Input
          id={`${idPrefix}-klasse`}
          list={listId}
          value={value.className}
          onChange={(e) => onChange({ ...value, className: e.target.value })}
          maxLength={MAX_CLASS_NAME_LENGTH}
          placeholder="z. B. SP11a"
          autoComplete="off"
          disabled={disabled}
          className="h-11 bg-ws-bg border-ws-line text-ws-text"
        />
        <datalist id={listId}>
          {classSuggestions.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-fach`}>Fach <span className="font-normal text-ws-faint">— optional</span></Label>
        <Select
          value={value.subjectId ?? NO_SUBJECT}
          onValueChange={(v) => onChange({ ...value, subjectId: v === NO_SUBJECT ? null : v })}
          disabled={disabled}
        >
          <SelectTrigger id={`${idPrefix}-fach`} className={triggerClass}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-ws-surface border-ws-line text-ws-text">
            <SelectItem value={NO_SUBJECT}>Ohne Fach</SelectItem>
            {subjects.map((s) => (
              <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
