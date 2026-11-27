'use client'

import { useState } from 'react'
import { BookmarkPlus, ChevronDown, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { FocusSettingsFields, type FocusFormValue } from '@/components/admin/focus-settings-fields'
import { GradingScaleEditor, type GradeBoundary } from '@/components/admin/grading-scale-editor'
import { GradingScaleTemplatePicker } from '@/components/admin/grading-scale-template-picker'
import { ScaleTemplateDialog } from './scale-template-dialog'
import { MAX_CLASS_NAME_LENGTH } from '@/lib/assessment-category'
import { endOfTodayInSchoolZone, quickDeadline, fromSchoolInputValue, toSchoolInputValue, type DeadlineQuickChoice } from '@/lib/assessment-deadline'
import { schoolYearChoices } from '@/lib/assessment-filter'
import type { WhenErrors, WhenValues } from '@/lib/assessment-draft'

const INPUT = 'min-h-11 rounded-xl border-ws-line bg-ws-bg text-ws-text'
const TRIGGER = 'bg-ws-bg border-ws-line text-ws-text rounded-xl min-h-11'
const CONTENT = 'bg-ws-surface border-ws-line text-ws-text'
const NONE = '__none'
const NEW = '__new'

const QUICK: { key: DeadlineQuickChoice; label: string }[] = [
  { key: 'hour', label: 'In 1 Stunde' },
  { key: 'tonight', label: 'Heute Abend (23:59)' },
  { key: 'week', label: 'In 1 Woche' },
]

/** „Do., 27.11.2026, 23:59 Uhr“ – Datum und Uhrzeit immer ausgeschrieben */
export function formatDeadline(value: string): string | null {
  const d = fromSchoolInputValue(value)
  if (!d) return null
  return (
    d.toLocaleString('de-DE', {
      weekday: 'short',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Europe/Berlin',
    }) + ' Uhr'
  )
}

interface Props {
  values: WhenValues
  onChange: (next: WhenValues) => void
  errors: WhenErrors
  schoolYear: string
  onSchoolYearChange: (value: string) => void
  usedSchoolYears: string[]
  currentSchoolYear: string
  /** Bisher im Bereich benutzte Klassen (schon nach Stufe vorsortiert, wenn möglich) */
  classOptions: string[]
  scale: GradeBoundary[]
  onScaleChange: (scale: GradeBoundary[]) => void
  scaleError?: string
  focus: FocusFormValue
  onFocusChange: (value: FocusFormValue) => void
  focusError?: string
  summary: { subjects: string; topics: string; count: number; minutes: number }
  onEditWhat: () => void
  onEditReview: () => void
  now: () => Date
  disabled: boolean
}

/** Schritt 3 „Wann und für wen?“ (PROJ-133) */
export function WizardStepWhen({
  values,
  onChange,
  errors,
  schoolYear,
  onSchoolYearChange,
  usedSchoolYears,
  currentSchoolYear,
  classOptions,
  scale,
  onScaleChange,
  scaleError,
  focus,
  onFocusChange,
  focusError,
  summary,
  onEditWhat,
  onEditReview,
  now,
  disabled,
}: Props) {
  const set = (patch: Partial<WhenValues>) => onChange({ ...values, ...patch })
  const [templateOpen, setTemplateOpen] = useState(false)
  const [pickerKey, setPickerKey] = useState(0)
  const [createdId, setCreatedId] = useState<string | undefined>(undefined)

  const choice = values.classChoice
  const selectValue =
    choice.kind === 'none' ? NONE : choice.kind === 'unset' ? '' : classOptions.includes(choice.name) ? choice.name : NEW
  const closesText = values.closesAt ? formatDeadline(values.closesAt) : null

  function onClassSelect(v: string) {
    if (v === NONE) set({ classChoice: { kind: 'none' } })
    else if (v === NEW) set({ classChoice: { kind: 'name', name: '' } })
    else set({ classChoice: { kind: 'name', name: v } })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-ws-line bg-ws-surface p-4">
        <div className="min-w-0 text-sm">
          <p className="font-medium text-ws-text">
            {summary.subjects || 'Ohne Fach'}{summary.topics ? ` · ${summary.topics}` : ''}
          </p>
          <p className="mt-0.5 text-ws-muted">
            {summary.count} {summary.count === 1 ? 'Frage' : 'Fragen'} · etwa {summary.minutes} Min.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" className="min-h-11 rounded-xl border-ws-line" onClick={onEditWhat}>
            <Pencil className="mr-1.5 size-4" aria-hidden /> Angaben ändern
          </Button>
          <Button type="button" variant="outline" className="min-h-11 rounded-xl border-ws-line" onClick={onEditReview}>
            <Pencil className="mr-1.5 size-4" aria-hidden /> Fragen ändern
          </Button>
        </div>
      </div>

      <div className="max-w-xl space-y-5">
        <div className="space-y-1.5">
          <Label htmlFor="wizard-title" className="text-base">Titel</Label>
          <Input
            id="wizard-title"
            value={values.title}
            maxLength={100}
            onChange={(e) => set({ title: e.target.value })}
            aria-invalid={!!errors.title}
            className={INPUT}
          />
          {errors.title && <p className="text-sm text-ws-red" role="alert">{errors.title}</p>}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="wizard-class" className="text-base">Klasse</Label>
            <Select value={selectValue} onValueChange={onClassSelect}>
              <SelectTrigger id="wizard-class" className={TRIGGER} aria-invalid={!!errors.className}>
                <SelectValue placeholder="Klasse wählen" />
              </SelectTrigger>
              <SelectContent className={CONTENT}>
                {classOptions.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                <SelectItem value={NEW}>Andere Klasse eingeben …</SelectItem>
                <SelectItem value={NONE}>Keine / gemischt</SelectItem>
              </SelectContent>
            </Select>
            {selectValue === NEW && (
              <Input
                aria-label="Name der Klasse"
                value={choice.kind === 'name' ? choice.name : ''}
                maxLength={MAX_CLASS_NAME_LENGTH}
                onChange={(e) => set({ classChoice: { kind: 'name', name: e.target.value } })}
                placeholder="z. B. SP10C"
                aria-invalid={!!errors.className}
                className={INPUT}
              />
            )}
            {errors.className && <p className="text-sm text-ws-red" role="alert">{errors.className}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="wizard-year" className="text-base">Schuljahr</Label>
            <Select value={schoolYear} onValueChange={onSchoolYearChange}>
              <SelectTrigger id="wizard-year" className={TRIGGER}><SelectValue /></SelectTrigger>
              <SelectContent className={CONTENT}>
                {schoolYearChoices(usedSchoolYears, currentSchoolYear).map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="wizard-closes" className="text-base">Beitritt bis</Label>
          <Input
            id="wizard-closes"
            type="datetime-local"
            value={values.closesAt}
            onChange={(e) => set({ closesAt: e.target.value })}
            aria-invalid={!!errors.closesAt}
            aria-describedby="wizard-closes-hint"
            className={INPUT}
          />
          <div className="flex flex-wrap gap-2" role="group" aria-label="Schnellwahl für Beitritt bis">
            {QUICK.map((rawQ) => {
              // Ab kurz vor 23:59 meint „Heute Abend“ den nächsten Abend – dann steht das auch so da
              const q = rawQ.key === 'tonight' && quickDeadline('tonight', now()).getTime() !== endOfTodayInSchoolZone(now()).getTime()
                ? { ...rawQ, label: 'Morgen Abend (23:59)' }
                : rawQ
              return (
              <Button
                key={q.key}
                type="button"
                variant="outline"
                className="min-h-11 rounded-xl border-ws-line"
                onClick={() => set({ closesAt: toSchoolInputValue(quickDeadline(q.key, now())) })}
              >
                {q.label}
              </Button>
              )
            })}
          </div>
          {closesText && <p className="text-sm font-medium text-ws-text">{closesText}</p>}
          {errors.closesAt && <p className="text-sm text-ws-red" role="alert">{errors.closesAt}</p>}
          <p id="wizard-closes-hint" className="text-sm text-ws-muted">Danach kann niemand mehr beitreten. Wer schon schreibt, darf fertig werden.</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="wizard-opens" className="text-base">Beitritt ab <span className="font-normal text-ws-faint">(optional)</span></Label>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              id="wizard-opens"
              type="datetime-local"
              value={values.opensAt}
              onChange={(e) => set({ opensAt: e.target.value })}
              aria-invalid={!!errors.opensAt}
              className={`${INPUT} sm:max-w-xs`}
            />
            {values.opensAt && (
              <Button type="button" variant="ghost" className="min-h-11" onClick={() => set({ opensAt: '' })}>
                Zurücksetzen
              </Button>
            )}
          </div>
          <p className="text-sm text-ws-muted">{values.opensAt ? (formatDeadline(values.opensAt) ?? '') : 'Leer lassen: Man kann sofort nach dem Öffnen beitreten.'}</p>
          {errors.opensAt && <p className="text-sm text-ws-red" role="alert">{errors.opensAt}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="wizard-duration" className="text-base">Dauer (Minuten)</Label>
          <Input
            id="wizard-duration"
            type="number"
            min={5}
            max={600}
            value={values.durationMinutes}
            onChange={(e) => set({ durationMinutes: e.target.value })}
            aria-invalid={!!errors.durationMinutes}
            className={`${INPUT} w-28`}
          />
          <p className="text-sm text-ws-muted">Zeit zum Bearbeiten, ab dem Moment, in dem jemand startet.</p>
          {errors.durationMinutes && <p className="text-sm text-ws-red" role="alert">{errors.durationMinutes}</p>}
        </div>

        <div className="space-y-2">
          <p className="text-base font-medium text-ws-text">Notenschlüssel</p>
          <GradingScaleTemplatePicker
            key={pickerKey}
            scale={scale}
            onApply={onScaleChange}
            disabled={disabled}
            initialSelectedId={createdId}
          />
          <Button type="button" variant="outline" className="min-h-11 rounded-xl border-ws-line" onClick={() => setTemplateOpen(true)} disabled={disabled}>
            <BookmarkPlus className="mr-1.5 size-4" aria-hidden /> Neue Vorlage anlegen
          </Button>
          {scaleError && <p className="text-sm text-ws-red" role="alert">{scaleError}</p>}
        </div>

        <Collapsible defaultOpen={!!scaleError || !!focusError}>
          <CollapsibleTrigger className="group flex min-h-11 items-center gap-2 text-sm font-medium text-ws-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ws-green">
            <ChevronDown className="size-4 text-ws-muted transition-transform duration-200 group-data-[state=open]:rotate-180" aria-hidden />
            Weitere Einstellungen
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-5 pt-2">
            <div className="space-y-2">
              <p className="text-sm font-medium text-ws-text">Notenschlüssel anpassen</p>
              <GradingScaleEditor scale={scale} onChange={onScaleChange} error={scaleError} />
            </div>
            <FocusSettingsFields value={focus} onChange={onFocusChange} error={focusError} disabled={disabled} />
          </CollapsibleContent>
        </Collapsible>
      </div>

      <ScaleTemplateDialog
        open={templateOpen}
        onOpenChange={setTemplateOpen}
        onCreated={(t) => {
          onScaleChange(t.scale)
          setCreatedId(t.id ?? undefined)
          setPickerKey((k) => k + 1)
        }}
      />
    </div>
  )
}
