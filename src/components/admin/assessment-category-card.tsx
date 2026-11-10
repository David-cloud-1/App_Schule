'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Loader2, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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

/** PROJ-39/84: Ablage eines Nachweises als ruhige Zeile; Ändern im Dialog — in jedem Status, ohne Wirkung auf die Prüfung */
export function AssessmentCategoryCard({ assessmentId, schoolYear, schoolClass, subjectId, subjects, classSuggestions, onSaved }: Props) {
  const initial: CategoryValue = { schoolYear, className: schoolClass ?? '', subjectId }
  const [value, setValue] = useState<CategoryValue>(initial)
  // Zuletzt gespeicherter Stand: Vergleichsbasis für „geändert?“, damit der Knopf nach dem
  // Speichern auch dann ruht, wenn der Server die Schreibweise der Klasse vereinheitlicht hat
  const [base, setBase] = useState<CategoryValue>(initial)
  const [saving, setSaving] = useState(false)
  const [open, setOpen] = useState(false)

  const dirty =
    value.schoolYear !== base.schoolYear ||
    value.className.trim() !== base.className ||
    value.subjectId !== base.subjectId

  function openDialog() {
    setValue(base)
    setOpen(true)
  }

  const subjectName = subjects.find((s) => s.id === base.subjectId)?.name
  const summary = [
    base.schoolYear,
    base.className || 'Keine Klasse',
    base.subjectId ? (subjectName ?? 'Fach') : 'Kein Fach',
  ].join(' · ')

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
      setOpen(false)
      onSaved()
    } catch (err) {
      console.error(err)
      toast.error('Netzwerkfehler')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div className="flex items-center justify-between gap-3 rounded-2xl border border-ws-line bg-ws-surface py-1 pl-4 pr-2">
        <p className="min-w-0 truncate text-sm text-ws-text" title={summary}>
          <span className="mr-2 text-xs uppercase tracking-wide text-ws-muted">Ablage</span>
          {summary}
        </p>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={openDialog}
          aria-label="Ablage ändern"
          title="Ablage ändern"
          className="size-11 shrink-0 rounded-xl text-ws-muted hover:text-ws-text"
        >
          <Pencil className="size-4" />
        </Button>
      </div>

      <Dialog open={open} onOpenChange={(o) => !saving && setOpen(o)}>
        <DialogContent className="max-w-xl border-ws-line bg-ws-surface text-ws-text">
          <DialogHeader>
            <DialogTitle>Ablage ändern</DialogTitle>
            <DialogDescription className="text-ws-muted">
              Nur zum Sortieren und Wiederfinden — ändert nichts am Zugang oder an der Prüfung.
            </DialogDescription>
          </DialogHeader>
          <AssessmentCategoryFields
            idPrefix="ablage"
            value={value}
            onChange={setValue}
            subjects={subjects}
            classSuggestions={classSuggestions}
            schoolYears={schoolYearChoices([], schoolYearFor(new Date()))}
            disabled={saving}
          />
          <DialogFooter className="gap-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={saving}>
              Abbrechen
            </Button>
            <Button
              onClick={save}
              disabled={!dirty || saving}
              className="h-11 rounded-xl bg-ws-green text-ws-on-accent hover:bg-ws-green-hover"
            >
              {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
              Speichern
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
