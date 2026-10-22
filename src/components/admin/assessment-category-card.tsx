'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { schoolYearFor } from '@/lib/assessment-category'
import { schoolYearChoices } from '@/lib/assessment-filter'
import { AssessmentCategoryFields, type CategoryValue, type SubjectOption } from './assessment-category-fields'

interface Props {
  assessmentId: string
  schoolYear: string
  schoolClass: string | null
  subjectId: string | null
  /** Fächer und vorhandene Klassen des Bereichs, zu dem der Nachweis gehört */
  subjects: SubjectOption[]
  classSuggestions: string[]
  onSaved: () => void
}

/** PROJ-39: Ablage eines Nachweises ändern — in jedem Status, ohne Wirkung auf die Prüfung */
export function AssessmentCategoryCard({ assessmentId, schoolYear, schoolClass, subjectId, subjects, classSuggestions, onSaved }: Props) {
  const initial: CategoryValue = { schoolYear, className: schoolClass ?? '', subjectId }
  const [value, setValue] = useState<CategoryValue>(initial)
  // Zuletzt gespeicherter Stand: Vergleichsbasis für „geändert?“, damit der Knopf nach dem
  // Speichern auch dann ruht, wenn der Server die Schreibweise der Klasse vereinheitlicht hat
  const [base, setBase] = useState<CategoryValue>(initial)
  const [saving, setSaving] = useState(false)

  const dirty =
    value.schoolYear !== base.schoolYear ||
    value.className.trim() !== base.className ||
    value.subjectId !== base.subjectId

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
      const saved: CategoryValue = {
        schoolYear: data?.schoolYear ?? value.schoolYear,
        className: data?.className !== undefined ? (data.className ?? '') : value.className.trim(),
        subjectId: data?.subjectId !== undefined ? data.subjectId : value.subjectId,
      }
      setBase(saved)
      setValue(saved)
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
        schoolYears={schoolYearChoices([], schoolYearFor(new Date()))}
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
