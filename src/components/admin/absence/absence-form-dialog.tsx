'use client'

import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Check, ChevronsUpDown, Loader2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import {
  DEPARTMENTS,
  ABSENCE_API,
  NOTE_MAX,
  formatRange,
  isIsoDate,
  validateAbsenceForm,
  type Absence,
  type AbsenceFormErrors,
  type AbsenceFormValues,
  type AbsenceType,
  type TeacherOption,
} from '@/lib/absence'
import { cn } from '@/lib/utils'

interface OverlapHit {
  id: string
  typeName: string
  dateFrom: string
  dateTo: string
}

const fieldClass =
  'min-h-11 rounded-xl border-ws-line bg-ws-bg text-ws-text focus-visible:ring-2 focus-visible:ring-ws-green'

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null
  return (
    <p id={id} role="alert" className="mt-1 text-sm text-ws-red">
      {message}
    </p>
  )
}

/**
 * Formular „Abwesenheit eintragen / bearbeiten“ (PROJ-120). Fehlertexte stehen
 * am Feld. Eine Überschneidung mit einem Eintrag derselben Person warnt nur,
 * Speichern bleibt möglich. `externalChange` zeigt oben den Hinweis, wenn jemand
 * anderes den Eintrag währenddessen geändert hat (Eingaben bleiben erhalten).
 */
export function AbsenceFormDialog({
  open,
  onOpenChange,
  initial,
  editing,
  types,
  teachers,
  externalChange,
  onReload,
  onSubmit,
  onShowExisting,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  initial: AbsenceFormValues
  /** Gesetzt = Bearbeiten, sonst Neuanlage */
  editing: Absence | null
  types: AbsenceType[]
  teachers: TeacherOption[]
  externalChange: string | null
  onReload: () => void
  onSubmit: (values: AbsenceFormValues, personIds: string[]) => Promise<{ ok: true } | { ok: false; message: string; remaining?: string[] }>
  onShowExisting: (id: string) => void
}) {
  const [values, setValues] = useState<AbsenceFormValues>(initial)
  const [errors, setErrors] = useState<AbsenceFormErrors>({})
  const [saving, setSaving] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const [personOpen, setPersonOpen] = useState(false)
  // Neuanlage: beliebig viele Personen, je Person entsteht ein eigener Eintrag
  const [personIds, setPersonIds] = useState<string[]>(initial.personId ? [initial.personId] : [])

  // Inaktive Arten sind nur wählbar, wenn der bearbeitete Eintrag sie schon hat
  const selectableTypes = useMemo(
    () => types.filter((t) => t.active || t.id === editing?.typeId),
    [types, editing],
  )
  const selectedType = types.find((t) => t.id === values.typeId)
  const person = teachers.find((t) => t.id === values.personId)
  const [overlapping, setOverlapping] = useState<OverlapHit[]>([])

  // Überschneidungen derselben Person fragt der Server ab (nicht nur der sichtbare Monat)
  const personId = !editing && personIds.length !== 1 ? '' : (editing ? values.personId : personIds[0])
  const { dateFrom, dateTo } = values
  const editingId = editing?.id
  useEffect(() => {
    if (!personId || !isIsoDate(dateFrom) || !isIsoDate(dateTo) || dateTo < dateFrom) {
      setOverlapping([])
      return
    }
    const controller = new AbortController()
    const timer = window.setTimeout(async () => {
      try {
        const params = new URLSearchParams({ person: personId, von: dateFrom, bis: dateTo })
        if (editingId) params.set('ausser', editingId)
        const res = await fetch(`${ABSENCE_API}/ueberschneidungen?${params}`, { cache: 'no-store', signal: controller.signal })
        if (!res.ok) return setOverlapping([])
        const body = (await res.json()) as { items: { id: string; art_name: string; datum_von: string; datum_bis: string }[] }
        setOverlapping(body.items.map((i) => ({ id: i.id, typeName: i.art_name, dateFrom: i.datum_von, dateTo: i.datum_bis })))
      } catch {
        /* Warnung ist nur ein Hinweis: ohne Antwort bleibt sie weg */
      }
    }, 300)
    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [personId, dateFrom, dateTo, editingId])

  function set<K extends keyof AbsenceFormValues>(key: K, value: AbsenceFormValues[K]) {
    setValues((v) => ({ ...v, [key]: value }))
    setErrors((e) => ({ ...e, [key]: undefined }))
  }

  function toggleDepartment(code: AbsenceFormValues['departments'][number], on: boolean) {
    set('departments', on ? [...values.departments, code] : values.departments.filter((c) => c !== code))
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const found = validateAbsenceForm({ ...values, personId: editing ? values.personId : (personIds[0] ?? '') })
    setErrors(found)
    if (Object.keys(found).length > 0) return
    setSaving(true)
    setServerError(null)
    try {
      const result = await onSubmit({
        ...values,
        personId: editing ? values.personId : (personIds[0] ?? ''),
        // „Alle“ ersetzt die Einzelauswahl; Freitext nur bei Arten mit Freitext
        departments: values.allDepartments ? [] : values.departments,
        freeText: selectedType?.hasFreeText ? values.freeText.trim() : '',
        note: values.note.trim(),
      }, editing ? [values.personId] : personIds)
      if (!result.ok) {
        setServerError(result.message)
        // Schon gespeicherte Personen nicht noch einmal eintragen
        if (result.remaining) setPersonIds(result.remaining)
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto border-ws-line bg-ws-surface text-ws-text sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{editing ? 'Abwesenheit bearbeiten' : 'Abwesenheit eintragen'}</DialogTitle>
          <DialogDescription className="text-ws-muted">
            Alle Lehrkräfte sehen, was du einträgst. Die Vertretungsplanung sieht, wo noch eine Vertretung fehlt.
          </DialogDescription>
        </DialogHeader>

        {externalChange && (
          <div role="status" className="flex flex-wrap items-center gap-2 rounded-xl border border-ws-orange/30 bg-ws-orange/15 px-3 py-2 text-sm text-ws-orange">
            <AlertTriangle className="size-4 shrink-0" aria-hidden />
            <span className="flex-1">{externalChange}</span>
            <Button type="button" variant="outline" size="sm" className="min-h-11 rounded-xl" onClick={onReload}>
              Neu laden
            </Button>
          </div>
        )}

        <form onSubmit={submit} className="space-y-5" noValidate>
          {editing ? (
          <div>
            <Label htmlFor="abs-person" className="text-ws-text">Person</Label>
            <Popover open={personOpen} onOpenChange={setPersonOpen}>
              <PopoverTrigger asChild>
                <Button
                  id="abs-person"
                  type="button"
                  variant="outline"
                  role="combobox"
                  aria-expanded={personOpen}
                  aria-invalid={!!errors.personId}
                  className={cn(fieldClass, 'mt-1.5 w-full justify-between font-normal')}
                >
                  <span className="truncate">{person?.name ?? 'Person wählen …'}</span>
                  <ChevronsUpDown className="size-4 shrink-0 text-ws-muted" aria-hidden />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                  className="w-[var(--radix-popover-trigger-width)] border-ws-line bg-ws-surface p-0"
                  onWheel={(e) => e.stopPropagation()}
                  onTouchMove={(e) => e.stopPropagation()}
                >
                <Command>
                  <CommandInput placeholder="Name suchen …" />
                  <CommandList className="max-h-64 touch-pan-y overscroll-contain">
                    <CommandEmpty>Niemand gefunden.</CommandEmpty>
                    {teachers.map((t) => (
                      <CommandItem
                        key={t.id}
                        value={t.name}
                        onSelect={() => {
                          set('personId', t.id)
                          setPersonOpen(false)
                        }}
                        className="min-h-11"
                      >
                        <Check className={cn('mr-2 size-4', t.id === values.personId ? 'opacity-100' : 'opacity-0')} aria-hidden />
                        {t.name}
                      </CommandItem>
                    ))}
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            <FieldError id="abs-person-err" message={errors.personId} />
          </div>

          ) : (
            <div>
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="abs-person" className="text-ws-text">Personen</Label>
                <div className="flex gap-1 text-sm">
                  <Button type="button" variant="ghost" size="sm" className="min-h-11 rounded-xl px-2" onClick={() => setPersonIds(teachers.map((t) => t.id))}>
                    Alle auswählen
                  </Button>
                  {personIds.length > 0 && (
                    <Button type="button" variant="ghost" size="sm" className="min-h-11 rounded-xl px-2" onClick={() => setPersonIds([])}>
                      Leeren
                    </Button>
                  )}
                </div>
              </div>
              <Popover open={personOpen} onOpenChange={setPersonOpen}>
                <PopoverTrigger asChild>
                  <Button
                    id="abs-person"
                    type="button"
                    variant="outline"
                    role="combobox"
                    aria-expanded={personOpen}
                    aria-invalid={!!errors.personId}
                    className={cn(fieldClass, 'mt-1.5 w-full justify-between font-normal')}
                  >
                    <span className="truncate">
                      {personIds.length === 0
                        ? 'Personen wählen …'
                        : personIds.length === teachers.length && teachers.length > 1
                          ? `Alle ${teachers.length} Lehrkräfte`
                          : `${personIds.length} ausgewählt`}
                    </span>
                    <ChevronsUpDown className="size-4 shrink-0 text-ws-muted" aria-hidden />
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-[var(--radix-popover-trigger-width)] border-ws-line bg-ws-surface p-0"
                  onWheel={(e) => e.stopPropagation()}
                  onTouchMove={(e) => e.stopPropagation()}
                >
                  <Command>
                    <CommandInput placeholder="Name suchen …" />
                    <CommandList className="max-h-64 touch-pan-y overscroll-contain">
                      <CommandEmpty>Niemand gefunden.</CommandEmpty>
                      {teachers.map((t) => {
                        const on = personIds.includes(t.id)
                        return (
                          <CommandItem
                            key={t.id}
                            value={t.name}
                            onSelect={() => {
                              setPersonIds((ids) => (on ? ids.filter((i) => i !== t.id) : [...ids, t.id]))
                              setErrors((e) => ({ ...e, personId: undefined }))
                            }}
                            className="min-h-11"
                          >
                            <Check className={cn('mr-2 size-4', on ? 'opacity-100' : 'opacity-0')} aria-hidden />
                            {t.name}
                          </CommandItem>
                        )
                      })}
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              {personIds.length > 0 && (
                <ul className="mt-2 flex flex-wrap gap-1.5" aria-label="Ausgewählte Personen">
                  {personIds.map((id) => {
                    const t = teachers.find((x) => x.id === id)
                    if (!t) return null
                    return (
                      <li key={id} className="flex items-center gap-1 rounded-full border border-ws-line bg-ws-raised py-0.5 pl-3 pr-1 text-sm text-ws-text">
                        <span className="max-w-40 truncate">{t.name}</span>
                        <button
                          type="button"
                          aria-label={`${t.name} entfernen`}
                          onClick={() => setPersonIds((ids) => ids.filter((i) => i !== id))}
                          className="flex size-8 items-center justify-center rounded-full text-ws-muted hover:text-ws-text"
                        >
                          <X className="size-4" aria-hidden />
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
              <FieldError id="abs-person-err" message={errors.personId} />
            </div>
          )}

          <div>
            <Label htmlFor="abs-type" className="text-ws-text">Art</Label>
            <Select value={values.typeId} onValueChange={(v) => set('typeId', v)}>
              <SelectTrigger id="abs-type" aria-invalid={!!errors.typeId} className={cn(fieldClass, 'mt-1.5')}>
                <SelectValue placeholder="Art wählen …" />
              </SelectTrigger>
              <SelectContent>
                {selectableTypes.map((t) => (
                  <SelectItem key={t.id} value={t.id} className="min-h-11">
                    {t.name}
                    {!t.active && ' (nicht mehr wählbar)'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError id="abs-type-err" message={errors.typeId} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="abs-from" className="text-ws-text">Von</Label>
              <Input
                id="abs-from"
                type="date"
                value={values.dateFrom}
                onChange={(e) => {
                  const next = e.target.value
                  // Ende nachziehen, solange es nicht schon bewusst später liegt
                  setValues((v) => ({ ...v, dateFrom: next, dateTo: v.dateTo < next ? next : v.dateTo }))
                  setErrors((er) => ({ ...er, dateFrom: undefined, dateTo: undefined }))
                }}
                aria-invalid={!!errors.dateFrom}
                className={cn(fieldClass, 'mt-1.5')}
              />
              <FieldError id="abs-from-err" message={errors.dateFrom} />
            </div>
            <div>
              <Label htmlFor="abs-to" className="text-ws-text">Bis</Label>
              <Input
                id="abs-to"
                type="date"
                value={values.dateTo}
                min={values.dateFrom}
                onChange={(e) => set('dateTo', e.target.value)}
                aria-invalid={!!errors.dateTo}
                className={cn(fieldClass, 'mt-1.5')}
              />
              <FieldError id="abs-to-err" message={errors.dateTo} />
            </div>
          </div>

          <div className="flex min-h-11 items-center justify-between gap-3 rounded-xl border border-ws-line px-3">
            <Label htmlFor="abs-allday" className="flex-1 cursor-pointer py-3 text-ws-text">Ganztägig</Label>
            <Switch id="abs-allday" checked={values.allDay} onCheckedChange={(on) => set('allDay', on)} />
          </div>

          {!values.allDay && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="abs-tfrom" className="text-ws-text">Uhrzeit von</Label>
                <Input id="abs-tfrom" type="time" value={values.timeFrom} onChange={(e) => set('timeFrom', e.target.value)} aria-invalid={!!errors.timeFrom} className={cn(fieldClass, 'mt-1.5')} />
                <FieldError id="abs-tfrom-err" message={errors.timeFrom} />
              </div>
              <div>
                <Label htmlFor="abs-tto" className="text-ws-text">Uhrzeit bis</Label>
                <Input id="abs-tto" type="time" value={values.timeTo} onChange={(e) => set('timeTo', e.target.value)} aria-invalid={!!errors.timeTo} className={cn(fieldClass, 'mt-1.5')} />
                <FieldError id="abs-tto-err" message={errors.timeTo} />
              </div>
            </div>
          )}

          <fieldset>
            <legend className="text-sm font-medium text-ws-text">Abteilungen</legend>
            <div className="mt-1.5 space-y-1">
              <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl px-2 hover:bg-ws-raised">
                <Checkbox checked={values.allDepartments} onCheckedChange={(on) => set('allDepartments', on === true)} />
                <span className="text-sm text-ws-text">Alle Abteilungen</span>
              </label>
              {!values.allDepartments &&
                DEPARTMENTS.map((d) => (
                  <label key={d.code} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl px-2 hover:bg-ws-raised">
                    <Checkbox checked={values.departments.includes(d.code)} onCheckedChange={(on) => toggleDepartment(d.code, on === true)} />
                    <span className="text-sm text-ws-text">{d.name}</span>
                  </label>
                ))}
            </div>
            <FieldError id="abs-dep-err" message={errors.departments} />
          </fieldset>

          {selectedType?.hasFreeText && (
            <div>
              <Label htmlFor="abs-free" className="text-ws-text">Freitext (optional)</Label>
              <Textarea
                id="abs-free"
                value={values.freeText}
                maxLength={NOTE_MAX}
                onChange={(e) => set('freeText', e.target.value)}
                aria-describedby="abs-free-hint"
                className={cn(fieldClass, 'mt-1.5 min-h-24')}
              />
              <p id="abs-free-hint" className="mt-1 text-xs text-ws-muted">
                Für alle Lehrkräfte sichtbar. Einen Grund musst du nicht nennen.
              </p>
              <FieldError id="abs-free-err" message={errors.freeText} />
            </div>
          )}

          <div>
            <Label htmlFor="abs-note" className="text-ws-text">Notiz (optional)</Label>
            <Textarea id="abs-note" value={values.note} maxLength={NOTE_MAX} onChange={(e) => set('note', e.target.value)} className={cn(fieldClass, 'mt-1.5 min-h-20')} />
            <p className="mt-1 text-xs text-ws-muted">{values.note.length} / {NOTE_MAX} Zeichen</p>
            <FieldError id="abs-note-err" message={errors.note} />
          </div>

          {overlapping.length > 0 && (
            <div role="status" className="rounded-xl border border-ws-orange/30 bg-ws-orange/15 px-3 py-2 text-sm text-ws-orange">
              <p className="flex items-center gap-2 font-medium">
                <AlertTriangle className="size-4 shrink-0" aria-hidden />
                Für diese Person gibt es in dem Zeitraum schon einen Eintrag. Du kannst trotzdem speichern.
              </p>
              <ul className="mt-1 space-y-0.5">
                {overlapping.map((a) => (
                  <li key={a.id}>
                    <button type="button" onClick={() => onShowExisting(a.id)} className="min-h-11 text-left underline underline-offset-2">
                      {a.typeName}, {formatRange({ dateFrom: a.dateFrom, dateTo: a.dateTo, allDay: true, timeFrom: null, timeTo: null })}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {serverError && (
            <p role="alert" className="rounded-xl border border-ws-red/30 bg-ws-red/15 px-3 py-2 text-sm text-ws-red">
              {serverError}
            </p>
          )}

          <DialogFooter className="gap-2 sm:gap-2">
            <Button type="button" variant="outline" className="min-h-11 rounded-xl" onClick={() => onOpenChange(false)}>
              Abbrechen
            </Button>
            <Button type="submit" disabled={saving} className="min-h-11 rounded-xl bg-ws-green text-ws-on-accent hover:bg-ws-green-hover">
              {saving && <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />}
              {editing ? 'Speichern' : personIds.length > 1 ? `Für ${personIds.length} Personen eintragen` : 'Eintragen'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
