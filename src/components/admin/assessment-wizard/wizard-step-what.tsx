'use client'

import { ChevronDown, Loader2, PencilLine, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AdminSegmented } from '@/components/admin/admin-segmented'
import { MultiPick } from '@/components/admin/assessment-suggest-dialog'
import { LEVEL_LABEL } from '@/components/admin/assessment-suggest-preview'
import { LEVELS, MAX_COUNT, MIN_COUNT, MIX_PRESETS, mixSum, type Level } from '@/lib/assessment-suggest'
import { mixFor, type PresetKey, type WhatErrors, type WhatValues } from '@/lib/assessment-draft'
import type { Facets } from '@/lib/assessment-question-search'
import { BEGRIFFE } from '@/lib/begriffe'

const INPUT = 'min-h-11 rounded-xl border-ws-line bg-ws-bg text-ws-text'
const TRIGGER = 'bg-ws-bg border-ws-line text-ws-text rounded-xl min-h-11'
const CONTENT = 'bg-ws-surface border-ws-line text-ws-text'

const MIX_OPTIONS = [
  { value: 'ausgewogen', label: 'Ausgewogen' },
  { value: 'leichter', label: 'Eher leicht' },
  { value: 'schwerer', label: 'Eher schwer' },
  { value: 'eigen', label: 'Eigene Verteilung' },
] as const satisfies readonly { value: PresetKey; label: string }[]

const STUFE_OPTIONS = [
  { value: 'all', label: 'Alle' },
  { value: '10', label: '10' },
  { value: '11', label: '11' },
  { value: '12', label: '12' },
] as const

export interface DepartmentChoice {
  id: string
  name: string
}

interface Props {
  values: WhatValues
  onChange: (next: WhatValues) => void
  errors: WhatErrors
  facets: Facets | null
  facetsLoading: boolean
  facetsFailed: boolean
  onRetryFacets: () => void
  /** Bereich: bei einem Bereich als Text, sonst Auswahl (Super-Admin bei „Alle Bereiche“) */
  departments: DepartmentChoice[]
  departmentId: string
  onDepartmentChange: (id: string) => void
  departmentError: string | null
  busy: boolean
  onSuggest: () => void
  onStartEmpty: () => void
}

/** Schritt 1 „Was?“ (PROJ-133): Angaben für den Vorschlag, oder leer beginnen */
export function WizardStepWhat({
  values,
  onChange,
  errors,
  facets,
  facetsLoading,
  facetsFailed,
  onRetryFacets,
  departments,
  departmentId,
  onDepartmentChange,
  departmentError,
  busy,
  onSuggest,
  onStartEmpty,
}: Props) {
  const set = (patch: Partial<WhatValues>) => onChange({ ...values, ...patch })
  const stufe = values.classLevel === 'all' ? null : Number(values.classLevel)
  const topicOptions = (facets?.topics ?? [])
    .filter((t) => values.subjects.length === 0 || t.subjects.some((c) => values.subjects.includes(c)))
    .filter((t) => stufe === null || t.levels.includes(stufe))
    .map((t) => t.name)
  const mix = mixFor(values)
  const sum = mixSum(mix)

  function setCustomValue(level: Level, value: number) {
    set({ preset: 'eigen', custom: { ...mix, [level]: value } })
  }

  const noDepartment = departmentId === ''

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <Label htmlFor="wizard-department" className="text-sm text-ws-muted">{BEGRIFFE.bereich}</Label>
        {departments.length === 1 ? (
          <p id="wizard-department" className="min-h-11 content-center text-base font-medium text-ws-text">{departments[0].name}</p>
        ) : (
          <Select value={departmentId} onValueChange={onDepartmentChange}>
            <SelectTrigger id="wizard-department" className={`${TRIGGER} sm:max-w-xs`} aria-invalid={!!departmentError}>
              <SelectValue placeholder="Bereich wählen" />
            </SelectTrigger>
            <SelectContent className={CONTENT}>
              {departments.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        {departmentError && <p className="text-sm text-ws-red" role="alert">{departmentError}</p>}
      </div>

      {facetsFailed && !noDepartment ? (
        <div className="rounded-xl border border-ws-line bg-ws-surface p-4 text-sm" role="alert">
          <p className="text-ws-text">Die Fächer und Themen konnten gerade nicht geladen werden.</p>
          <Button type="button" variant="outline" className="mt-2 min-h-11 rounded-xl border-ws-line" onClick={onRetryFacets}>
            Erneut versuchen
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <MultiPick
              label="Fach"
              options={facets?.subjects ?? []}
              value={values.subjects}
              onChange={(subjects) => set({ subjects })}
              emptyText={facetsLoading ? 'Wird geladen …' : noDepartment ? 'Wähle zuerst einen Bereich.' : 'Keine Fächer vorhanden.'}
            />
            {errors.subjects && <p className="mt-1 text-sm text-ws-red" role="alert">{errors.subjects}</p>}
          </div>
          <MultiPick
            label="Thema (optional)"
            options={topicOptions}
            value={values.topics.filter((t) => topicOptions.includes(t))}
            onChange={(topics) => set({ topics })}
            emptyText="Keine Themen zu dieser Auswahl."
          />
          <div className="space-y-1.5">
            <Label className="text-sm text-ws-muted">{BEGRIFFE.stufe}</Label>
            <div>
              <AdminSegmented
                ariaLabel="Stufe"
                value={values.classLevel}
                onChange={(classLevel) => set({ classLevel })}
                options={STUFE_OPTIONS}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="wizard-count" className="text-sm text-ws-muted">Anzahl Fragen ({MIN_COUNT}–{MAX_COUNT})</Label>
            <Input
              id="wizard-count"
              inputMode="numeric"
              value={values.countText}
              onChange={(e) => set({ countText: e.target.value })}
              aria-invalid={!!errors.count}
              className={`${INPUT} sm:max-w-32`}
            />
            {errors.count && <p className="text-sm text-ws-red" role="alert">{errors.count}</p>}
          </div>
        </div>
      )}

      <fieldset className="space-y-2">
        <legend className="mb-1 text-sm text-ws-muted">Schwierigkeit (leicht / mittel / schwer)</legend>
        <AdminSegmented
          ariaLabel="Schwierigkeit"
          value={values.preset}
          onChange={(preset) =>
            set({ preset, ...(preset !== 'eigen' ? { custom: { ...MIX_PRESETS[preset] } } : {}) })
          }
          options={MIX_OPTIONS}
        />
        <p className="text-xs text-ws-muted">
          {values.preset === 'eigen'
            ? 'Lege selbst fest, wie viel Prozent leicht, mittel und schwer sein sollen.'
            : `Verteilung: ${mix.leicht} % leicht · ${mix.mittel} % mittel · ${mix.schwer} % schwer`}
        </p>
        {values.preset === 'eigen' && (
          <div className="space-y-1 rounded-xl bg-ws-surface p-3">
            {LEVELS.map((l) => (
              <div key={l} className="flex min-h-11 items-center gap-3">
                <Label htmlFor={`wizard-mix-${l}`} className="w-16 text-sm">{LEVEL_LABEL[l]}</Label>
                <input
                  id={`wizard-mix-${l}`}
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={mix[l]}
                  onChange={(e) => setCustomValue(l, Number(e.target.value))}
                  className="h-11 min-w-0 flex-1 accent-ws-green"
                />
                <span className="w-12 text-right text-sm tabular-nums">{mix[l]} %</span>
              </div>
            ))}
            <p className={`text-xs ${sum === 100 ? 'text-ws-muted' : 'text-ws-orange'}`} role="status">
              {sum === 100 ? 'Summe: 100 %' : sum < 100 ? `Noch ${100 - sum} % zu verteilen.` : `${sum - 100} % zu viel.`}
            </p>
          </div>
        )}
        {errors.mix && <p className="text-sm text-ws-red" role="alert">{errors.mix}</p>}
      </fieldset>

      <Collapsible>
        <CollapsibleTrigger className="group flex min-h-11 items-center gap-2 text-sm font-medium text-ws-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ws-green">
          <ChevronDown className="size-4 text-ws-muted transition-transform duration-200 group-data-[state=open]:rotate-180" aria-hidden />
          Weitere Einstellungen
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-0.5 pt-1">
          <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm">
            <Checkbox checked={values.exBlocked} onCheckedChange={(c) => set({ exBlocked: c === true })} />
            <span>
              Ausgeschlossene Fragen nicht vorschlagen
              <span className="block text-xs text-ws-muted">Das sind Fragen, die frühere Auswertungen als unbrauchbar für Nachweise markiert haben.</span>
            </span>
          </label>
          <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm">
            <Checkbox checked={values.exReported} onCheckedChange={(c) => set({ exReported: c === true })} />
            Fragen mit offener Meldung nicht vorschlagen
          </label>
          <div className="flex min-h-11 flex-wrap items-center gap-3 text-sm">
            <Label htmlFor="wizard-recent" className="font-normal">Fragen aus meinen letzten Nachweisen:</Label>
            <Select value={values.recent} onValueChange={(v) => set({ recent: v as WhatValues['recent'] })}>
              <SelectTrigger id="wizard-recent" className={`${TRIGGER} w-48`}><SelectValue /></SelectTrigger>
              <SelectContent className={CONTENT}>
                <SelectItem value="0">nicht ausschließen</SelectItem>
                <SelectItem value="1">letzter Nachweis</SelectItem>
                <SelectItem value="3">letzte 3 Nachweise</SelectItem>
                <SelectItem value="5">letzte 5 Nachweise</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CollapsibleContent>
      </Collapsible>

      <div className="flex flex-col gap-2 border-t border-ws-line pt-4 sm:flex-row sm:items-start">
        <div className="flex-1 sm:flex-none">
          <Button
            type="button"
            onClick={onStartEmpty}
            disabled={busy || noDepartment}
            className="min-h-11 w-full rounded-xl bg-ws-green text-ws-on-accent hover:bg-ws-green-hover sm:w-auto"
          >
            <PencilLine className="mr-2 size-4" aria-hidden />
            Selbst erstellen
          </Button>
          <p className="mt-1 text-xs text-ws-muted">Du suchst die Fragen selbst aus.</p>
        </div>
        <div className="flex-1 sm:flex-none">
          <Button
            type="button"
            variant="outline"
            onClick={onSuggest}
            disabled={busy || noDepartment}
            className="min-h-11 w-full rounded-xl border-ws-line sm:w-auto"
          >
            {busy ? <Loader2 className="mr-2 size-4 animate-spin" aria-hidden /> : <Sparkles className="mr-2 size-4" aria-hidden />}
            Vorschlag erstellen
          </Button>
          <p className="mt-1 text-xs text-ws-muted">Nutzt die Angaben oben.</p>
        </div>
      </div>
    </div>
  )
}
