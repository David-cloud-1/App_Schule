'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { schoolYearFor } from '@/lib/assessment-category'
import { classOptions, schoolYearChoices } from '@/lib/assessment-filter'
import { AssessmentCategoryFields, useAssessmentSubjects, type CategoryValue } from './assessment-category-fields'

interface Props {
  assessmentId: string
  schoolYear: string
  schoolClass: string | null
  subjectId: string | null
  onSaved: () => void
}

/** PROJ-39: Ablage eines Nachweises ändern — in jedem Status, ohne Wirkung auf die Prüfung */
export function AssessmentCategoryCard({ assessmentId, schoolYear, schoolClass, subjectId, onSaved }: Props) {
  const initial: CategoryValue = { schoolYear, className: schoolClass ?? '', subjectId }
  const [value, setValue] = useState<CategoryValue>(initial)
  const [saving, setSaving] = useState(false)
  const [classSuggestions, setClassSuggestions] = useState<string[]>([])
  const [usedYears, setUsedYears] = useState<string[]>([])
  const subjects = useAssessmentSubjects()

  // Vorschläge aus den vorhandenen Nachweisen des Bereichs; ohne sie bleibt die freie Eingabe möglich
  useEffect(() => {
    let cancelled = false
    fetch('/api/admin/assessments')
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (cancelled || !json) return
        const list = (json.assessments ?? []) as { className: string | null; schoolYear: string }[]
        setClassSuggestions(classOptions(list))
        setUsedYears(list.map((a) => a.schoolYear))
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  const dirty =
    value.schoolYear !== initial.schoolYear ||
    value.className.trim() !== initial.className ||
    value.subjectId !== initial.subjectId

  async function save() {
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/assessments/${assessmentId}/category`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schoolYear: value.schoolYear,
          className: value.className.trim() || null,
          subjectId: value.subjectId,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(data?.error ?? 'Speichern fehlgeschlagen')
        return
      }
      toast.success('Ablage gespeichert')
      onSaved()
    } catch (err) {
      console.error(err)
      toast.error('Netzwerkfehler')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-[#1F2937] border border-[#4B5563] rounded-2xl p-4 space-y-3">
      <div>
        <h2 className="text-base font-semibold text-[#F9FAFB]">Ablage</h2>
        <p className="text-xs text-[#9CA3AF]">Nur zum Sortieren und Wiederfinden — ändert nichts am Zugang oder an der Prüfung.</p>
      </div>
      <AssessmentCategoryFields
        idPrefix="ablage"
        value={value}
        onChange={setValue}
        subjects={subjects}
        classSuggestions={classSuggestions}
        schoolYears={schoolYearChoices(usedYears, schoolYearFor(new Date()))}
        disabled={saving}
      />
      <div className="flex justify-end">
        <Button
          onClick={save}
          disabled={!dirty || saving}
          className="h-11 rounded-xl bg-[#58CC02] hover:bg-[#4CAD02] text-white"
        >
          {saving && <Loader2 className="size-4 mr-2 animate-spin" />}
          Ablage speichern
        </Button>
      </div>
    </div>
  )
}
