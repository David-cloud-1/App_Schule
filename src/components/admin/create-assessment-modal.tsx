'use client'

import { useEffect, useRef, useState } from 'react'
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { GradingScaleEditor, IHK_DEFAULT_SCALE, validateGradingScale, type GradeBoundary } from './grading-scale-editor'
import { useExamPartLabel } from '@/components/department-provider'
import { AssessmentQuestionSelector } from './assessment-question-selector'
import { AssessmentCategoryFields, type CategoryValue, type SubjectOption } from './assessment-category-fields'
import { schoolYearFor } from '@/lib/assessment-category'
import { schoolYearChoices } from '@/lib/assessment-filter'
import type { PickerQuestion } from './question-picker'
import {
  DEFAULT_FOCUS_FORM,
  FocusSettingsFields,
  focusFormToPayload,
  validateFocusForm,
  type FocusFormValue,
} from './focus-settings-fields'

type ExamSetOption = {
  id: string
  name: string
  part: number
  question_ids: string[]
  duration_minutes: number | null
}

type DepartmentOption = { id: string; name: string; code: string }

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  sets: ExamSetOption[]
  classSuggestions: string[]
  usedSchoolYears: string[]
  preselectedSetId?: string | null
  onSuccess: (assessmentId: string) => void
}

function defaultWindow() {
  const now = new Date()
  const opens = new Date(now.getTime() + 5 * 60_000)
  const closes = new Date(now.getTime() + 2 * 60 * 60_000)
  const toLocal = (d: Date) => {
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
  }
  return { opensAt: toLocal(opens), closesAt: toLocal(closes) }
}

const NO_START = 'none'
const MIN_QUESTIONS = 5

export function CreateAssessmentModal({ open, onOpenChange, sets, classSuggestions, usedSchoolYears, preselectedSetId, onSuccess }: Props) {
  const partLabel = useExamPartLabel()

  // PROJ-46: Zielbereich — Schritt 0
  const [departments, setDepartments] = useState<DepartmentOption[]>([])
  const [departmentsLoading, setDepartmentsLoading] = useState(true)
  const [departmentId, setDepartmentId] = useState('')
  const [suggestedDepartmentId, setSuggestedDepartmentId] = useState<string | null>(null)

  // Ablage-Felder (PROJ-39) kommen jetzt vom Zielbereich, nicht vom Arbeitsbereich
  const [categorySubjects, setCategorySubjects] = useState<SubjectOption[]>([])
  const [categoryClasses, setCategoryClasses] = useState<string[]>([])

  const [startSetId, setStartSetId] = useState<string>(NO_START)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [skippedFromSet, setSkippedFromSet] = useState(0)
  const [title, setTitle] = useState('')
  const [opensAt, setOpensAt] = useState('')
  const [closesAt, setClosesAt] = useState('')
  const [durationMinutes, setDurationMinutes] = useState('90')
  const [scale, setScale] = useState<GradeBoundary[]>(IHK_DEFAULT_SCALE)
  const [focus, setFocus] = useState<FocusFormValue>(DEFAULT_FOCUS_FORM)
  const [category, setCategory] = useState<CategoryValue>({ schoolYear: schoolYearFor(new Date()), className: '', subjectId: null })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)

  // Startauswahl aus der Prüfungssimulation gibt es nur für den eigenen
  // Arbeitsbereich — die geladenen Sets gehören zu diesem, nicht zum
  // (ggf. fremden) Zielbereich.
  const ownDepartment = departmentId !== '' && departmentId === suggestedDepartmentId
  const visibleSets = ownDepartment ? sets : []

  // IDs der wählbaren Fragen und eine noch ausstehende Set-Vorauswahl: Set-Fragen
  // werden erst nach dem Laden gegen die wählbaren Fragen abgeglichen (offene
  // und deaktivierte Fragen fallen heraus).
  const loadedIdsRef = useRef<Set<string> | null>(null)
  const pendingSetRef = useRef<string[] | null>(null)

  function applySetQuestions(questionIds: string[]) {
    if (loadedIdsRef.current) {
      const ids = loadedIdsRef.current
      const kept = questionIds.filter((id) => ids.has(id))
      setSelectedIds(new Set(kept))
      setSkippedFromSet(questionIds.length - kept.length)
      pendingSetRef.current = null
    } else {
      pendingSetRef.current = questionIds
      setSelectedIds(new Set())
      setSkippedFromSet(0)
    }
  }

  function handleLoaded(questions: PickerQuestion[]) {
    loadedIdsRef.current = new Set(questions.map((q) => q.id))
    if (pendingSetRef.current) applySetQuestions(pendingSetRef.current)
  }

  useEffect(() => {
    if (!open) return
    loadedIdsRef.current = null
    pendingSetRef.current = null
    setSkippedFromSet(0)
    setSelectedIds(new Set())
    setStartSetId(NO_START)
    setTitle('')
    setDurationMinutes('90')
    setDepartmentId('')
    setCategorySubjects([])
    setCategoryClasses([])
    const { opensAt, closesAt } = defaultWindow()
    setOpensAt(opensAt)
    setClosesAt(closesAt)
    setScale(IHK_DEFAULT_SCALE)
    setFocus(DEFAULT_FOCUS_FORM)
    setCategory({ schoolYear: schoolYearFor(new Date()), className: '', subjectId: null })
    setErrors({})

    setDepartmentsLoading(true)
    fetch('/api/admin/assessments/departments')
      .then((res) => (res.ok ? res.json() : { departments: [], suggestedDepartmentId: null }))
      .then((data) => {
        const list: DepartmentOption[] = data.departments ?? []
        setDepartments(list)
        setSuggestedDepartmentId(data.suggestedDepartmentId ?? null)
        // Nur ein aktiver Bereich: egal welche Rolle, direkt vorbelegen.
        // Sonst: Bereichs-Admin/Super-Admin bekommen ihren Arbeitsbereich
        // vorausgewählt, eine Lehrkraft ohne Fachbereich bleibt leer (E1).
        if (list.length === 1) setDepartmentId(list[0].id)
        else if (data.suggestedDepartmentId) setDepartmentId(data.suggestedDepartmentId)
      })
      .catch(() => setDepartments([]))
      .finally(() => setDepartmentsLoading(false))
  }, [open])

  // Ablage-Optionen (Fächer/Klassen) des gewählten Zielbereichs nachladen
  useEffect(() => {
    if (!departmentId) {
      setCategorySubjects([])
      setCategoryClasses([])
      return
    }
    let cancelled = false
    fetch(`/api/admin/assessments/category-options?departmentId=${departmentId}`)
      .then((res) => (res.ok ? res.json() : { subjects: [], classes: [] }))
      .then((data) => {
        if (cancelled) return
        setCategorySubjects(data.subjects ?? [])
        setCategoryClasses(data.classes ?? [])
      })
      .catch(() => {
        if (!cancelled) {
          setCategorySubjects([])
          setCategoryClasses([])
        }
      })
    return () => {
      cancelled = true
    }
  }, [departmentId])

  // Nach dem ersten Laden der Bereiche die Set-Vorauswahl übernehmen (sofern
  // der eigene Arbeitsbereich gewählt wurde)
  useEffect(() => {
    if (!open || departmentsLoading) return
    const preset = sets.find((s) => s.id === preselectedSetId)
    if (preset && ownDepartment) {
      setStartSetId(preset.id)
      if (!title.trim()) setTitle(`${preset.name} – Leistungsnachweis`)
      setDurationMinutes(String(preset.duration_minutes ?? 90))
      pendingSetRef.current = preset.question_ids
    }
    // nur einmal nach dem Laden der Bereiche auswerten
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, departmentsLoading])

  function handleDepartmentChange(value: string) {
    if (value === departmentId) return
    setDepartmentId(value)
    // Fragenauswahl gehört zum alten Bereich — ohne Entwurf, der schon existiert,
    // ist "alles neu wählen" hier einfacher als ein Übernahme-Versuch.
    setSelectedIds(new Set())
    setSkippedFromSet(0)
    setStartSetId(NO_START)
    loadedIdsRef.current = null
    pendingSetRef.current = null
  }

  function handleStartSetChange(value: string) {
    setStartSetId(value)
    if (value === NO_START) {
      setSelectedIds(new Set())
      setSkippedFromSet(0)
      return
    }
    const set = sets.find((s) => s.id === value)
    if (!set) return
    if (!title.trim()) setTitle(`${set.name} – Leistungsnachweis`)
    if (set.duration_minutes) setDurationMinutes(String(set.duration_minutes))
    applySetQuestions(set.question_ids)
  }

  function validate(): boolean {
    const e: Record<string, string> = {}
    if (!departmentId) e.departmentId = 'Zielbereich wählen.'
    if (selectedIds.size < MIN_QUESTIONS) e.questions = `Mindestens ${MIN_QUESTIONS} Fragen auswählen.`
    if (!title.trim()) e.title = 'Titel ist Pflicht.'
    if (!opensAt) e.opensAt = 'Startzeit fehlt.'
    if (!closesAt) e.closesAt = 'Endzeit fehlt.'
    if (opensAt && closesAt && new Date(closesAt) <= new Date(opensAt)) {
      e.closesAt = 'Ende muss nach dem Start liegen.'
    }
    const dur = Number(durationMinutes)
    if (!Number.isInteger(dur) || dur < 5 || dur > 600) e.durationMinutes = 'Dauer zwischen 5 und 600 Minuten.'
    const scaleError = validateGradingScale(scale)
    if (scaleError) e.scale = scaleError
    const focusError = validateFocusForm(focus)
    if (focusError) e.focus = focusError
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault()
    if (!validate()) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/admin/assessments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          departmentId,
          questionIds: [...selectedIds],
          title: title.trim(),
          opensAt: new Date(opensAt).toISOString(),
          closesAt: new Date(closesAt).toISOString(),
          durationMinutes: Number(durationMinutes),
          gradingScale: scale,
          ...focusFormToPayload(focus),
          schoolYear: category.schoolYear,
          className: category.className.trim() || null,
          subjectId: category.subjectId,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(data?.error ?? 'Erstellen fehlgeschlagen')
        return
      }
      toast.success('Leistungsnachweis angelegt')
      onSuccess(data.id)
      onOpenChange(false)
    } catch (err) {
      console.error(err)
      toast.error('Netzwerkfehler')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-ws-surface border-ws-line text-ws-text max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Neuer Leistungsnachweis</DialogTitle>
          <DialogDescription className="text-ws-muted">
            Ein einmaliger, benoteter Durchlauf mit selbst zusammengestellten Fragen — mit eigenem Beitrittscode.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="zielbereich">Zielbereich</Label>
            <Select value={departmentId} onValueChange={handleDepartmentChange} disabled={departmentsLoading}>
              <SelectTrigger id="zielbereich" className="bg-ws-bg border-ws-line text-ws-text">
                <SelectValue placeholder={departmentsLoading ? 'Wird geladen…' : 'Bitte wählen…'} />
              </SelectTrigger>
              <SelectContent className="bg-ws-surface border-ws-line text-ws-text">
                {departments.map((d) => (
                  <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-ws-faint">
              Bestimmt den Fragenpool und wer per Code beitreten kann. Nach dem Öffnen nicht mehr änderbar.
            </p>
            {errors.departmentId && <p className="text-xs text-ws-red">{errors.departmentId}</p>}
          </div>

          {departmentId && (
            <>
              {visibleSets.length > 0 && (
                <div className="space-y-2">
                  <Label htmlFor="startSet">Startauswahl aus Prüfungssimulation <span className="font-normal text-ws-faint">— optional</span></Label>
                  <Select value={startSetId} onValueChange={handleStartSetChange}>
                    <SelectTrigger id="startSet" className="bg-ws-bg border-ws-line text-ws-text">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-ws-surface border-ws-line text-ws-text">
                      <SelectItem value={NO_START}>Ohne Startauswahl</SelectItem>
                      {visibleSets.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name} — {partLabel(s.part)} ({s.question_ids.length} Fragen)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-ws-faint">
                    Die Fragen werden kopiert und sind danach unabhängig vom Set.
                  </p>
                  {skippedFromSet > 0 && (
                    <p className="text-xs text-ws-orange">
                      {skippedFromSet} Fragen aus dem Set wurden übersprungen (offene oder deaktivierte Fragen).
                    </p>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <Label>Fragen</Label>
                <AssessmentQuestionSelector
                  departmentId={departmentId}
                  selectedIds={selectedIds}
                  onChange={setSelectedIds}
                  onLoaded={handleLoaded}
                />
                {errors.questions && <p className="text-xs text-ws-red">{errors.questions}</p>}
              </div>
            </>
          )}

          <div className="space-y-2">
            <Label htmlFor="title">Titel</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="bg-ws-bg border-ws-line text-ws-text"
              placeholder="z. B. LN 2 – Verkehrsträger Straße"
              maxLength={100}
            />
            {errors.title && <p className="text-xs text-ws-red">{errors.title}</p>}
          </div>

          <div className="space-y-2">
            <Label>Ablage <span className="font-normal text-ws-faint">— nur zum Sortieren, ändert nichts am Zugang</span></Label>
            <AssessmentCategoryFields
              idPrefix="neu"
              value={category}
              onChange={setCategory}
              subjects={categorySubjects}
              classSuggestions={categoryClasses.length > 0 ? categoryClasses : classSuggestions}
              schoolYears={schoolYearChoices(usedSchoolYears, schoolYearFor(new Date()))}
              disabled={submitting}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="opensAt">Beitritt ab</Label>
              <Input
                id="opensAt"
                type="datetime-local"
                value={opensAt}
                onChange={(e) => setOpensAt(e.target.value)}
                className="bg-ws-bg border-ws-line text-ws-text"
              />
              {errors.opensAt && <p className="text-xs text-ws-red">{errors.opensAt}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="closesAt">Beitritt bis</Label>
              <Input
                id="closesAt"
                type="datetime-local"
                value={closesAt}
                onChange={(e) => setClosesAt(e.target.value)}
                className="bg-ws-bg border-ws-line text-ws-text"
              />
              {errors.closesAt && <p className="text-xs text-ws-red">{errors.closesAt}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="duration">Bearbeitungszeit je Teilnehmer (Minuten)</Label>
            <Input
              id="duration"
              type="number"
              min={5}
              max={600}
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(e.target.value)}
              className="bg-ws-bg border-ws-line text-ws-text w-32"
            />
            {errors.durationMinutes && <p className="text-xs text-ws-red">{errors.durationMinutes}</p>}
            <p className="text-xs text-ws-faint">
              Zählt ab dem individuellen Start — ein späterer Beitritt verkürzt die Zeit nicht.
            </p>
          </div>

          <GradingScaleEditor scale={scale} onChange={setScale} error={errors.scale} />

          <FocusSettingsFields value={focus} onChange={setFocus} error={errors.focus} />

          <DialogFooter className="gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting}>
              Abbrechen
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="bg-ws-green hover:bg-ws-green-hover text-ws-on-accent rounded-xl"
            >
              {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Als Entwurf anlegen
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
