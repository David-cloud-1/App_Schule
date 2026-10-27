'use client'

import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { FILTER_ALL, FILTER_NONE, classFilterValue, classFromFilter, type AssessmentFilters } from '@/lib/assessment-filter'
import { cn } from '@/lib/utils'

const STATUS_CHIPS: { value: string; label: string }[] = [
  { value: FILTER_ALL, label: 'Alle' },
  { value: 'draft', label: 'Entwurf' },
  { value: 'open', label: 'Offen' },
  { value: 'closed', label: 'Geschlossen' },
]

interface Props {
  filters: AssessmentFilters
  onChange: (filters: AssessmentFilters) => void
  schoolYears: string[]
  classes: string[]
  subjects: { id: string; name: string }[]
  hasUnassignedClass: boolean
  hasUnassignedSubject: boolean
  /** PROJ-46: nur anzeigen, wenn es mehr als einen Zielbereich gibt */
  departments?: { id: string; name: string }[]
  /** PROJ-46: nur für den Super-Admin befüllt */
  creators?: { id: string; name: string }[]
}

/** PROJ-39/46: Filterleiste über der Nachweis-Tabelle */
export function AssessmentFilterBar({
  filters,
  onChange,
  schoolYears,
  classes,
  subjects,
  hasUnassignedClass,
  hasUnassignedSubject,
  departments = [],
  creators = [],
}: Props) {
  const triggerClass = 'h-11 bg-ws-surface border-ws-line text-ws-text w-full'
  const contentClass = 'bg-ws-surface border-ws-line text-ws-text'
  // Ein Wert aus der Adresszeile, den es nicht (mehr) gibt, bleibt sichtbar und wählbar
  const years = filters.schoolYear === FILTER_ALL || schoolYears.includes(filters.schoolYear) ? schoolYears : [filters.schoolYear, ...schoolYears]
  const selectedClass = classFromFilter(filters.className)
  const classList = [FILTER_ALL, FILTER_NONE].includes(filters.className) || classes.includes(selectedClass) ? classes : [selectedClass, ...classes]

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-ws-muted" aria-hidden />
          <Input
            type="search"
            value={filters.query}
            onChange={(e) => onChange({ ...filters, query: e.target.value })}
            placeholder="Titel oder Code suchen"
            aria-label="Nachweise nach Titel oder Code suchen"
            className="h-11 pl-9 bg-ws-surface border-ws-line text-ws-text"
          />
        </div>

        <Select value={filters.schoolYear} onValueChange={(v) => onChange({ ...filters, schoolYear: v })}>
          <SelectTrigger className={triggerClass} aria-label="Schuljahr">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className={contentClass}>
            <SelectItem value={FILTER_ALL}>Alle Schuljahre</SelectItem>
            {years.map((y) => (
              <SelectItem key={y} value={y}>Schuljahr {y}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filters.className} onValueChange={(v) => onChange({ ...filters, className: v })}>
          <SelectTrigger className={triggerClass} aria-label="Klasse">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className={contentClass}>
            <SelectItem value={FILTER_ALL}>Alle Klassen</SelectItem>
            {hasUnassignedClass && <SelectItem value={FILTER_NONE}>Ohne Klasse</SelectItem>}
            {classList.map((c) => (
              <SelectItem key={c} value={classFilterValue(c)}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filters.subjectId} onValueChange={(v) => onChange({ ...filters, subjectId: v })}>
          <SelectTrigger className={triggerClass} aria-label="Fach">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className={contentClass}>
            <SelectItem value={FILTER_ALL}>Alle Fächer</SelectItem>
            {hasUnassignedSubject && <SelectItem value={FILTER_NONE}>Ohne Fach</SelectItem>}
            {subjects.map((s) => (
              <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {departments.length > 1 && (
          <Select value={filters.departmentId} onValueChange={(v) => onChange({ ...filters, departmentId: v })}>
            <SelectTrigger className={triggerClass} aria-label="Zielbereich">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className={contentClass}>
              <SelectItem value={FILTER_ALL}>Alle Zielbereiche</SelectItem>
              {departments.map((d) => (
                <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {creators.length > 0 && (
          <Select value={filters.createdBy} onValueChange={(v) => onChange({ ...filters, createdBy: v })}>
            <SelectTrigger className={triggerClass} aria-label="Erstellt von">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className={contentClass}>
              <SelectItem value={FILTER_ALL}>Alle Erstellerinnen</SelectItem>
              {creators.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Status filtern">
        {STATUS_CHIPS.map((chip) => {
          const active = filters.status === chip.value
          return (
            <Button
              key={chip.value}
              type="button"
              variant="outline"
              size="sm"
              aria-pressed={active}
              onClick={() => onChange({ ...filters, status: chip.value })}
              className={cn(
                'h-11 rounded-full px-4 border-ws-line transition-all duration-200',
                active ? 'bg-ws-green/20 border-ws-green text-ws-green hover:bg-ws-green/20 hover:text-ws-green' : 'bg-transparent text-ws-muted hover:text-ws-text',
              )}
            >
              {chip.label}
            </Button>
          )
        })}
      </div>
    </div>
  )
}
