'use client'

import { Building2 } from 'lucide-react'
import { useOptionalAdminRole } from '@/components/admin/admin-role-provider'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

/**
 * Zielbereich beim Anlegen (PROJ-70): zeigt gut sichtbar „Wird angelegt in: …“.
 * Zeigt die Bereichsleiste genau einen Bereich, steht er fest da. In „Alle
 * Bereiche“ ist die Auswahl ein Pflichtfeld ohne Vorauswahl, damit nichts
 * versehentlich im falschen Bereich landet. `value` ist die gewählte
 * Bereichs-ID (oder leer); in einem festen Bereich ist sie nicht nötig, der
 * Server nimmt dann den Bereich der Leiste.
 */
export function TargetDepartmentField({
  value,
  onChange,
  error,
  detail,
}: {
  value: string
  onChange: (id: string) => void
  error?: string
  /** Zusatz hinter dem Bereich, z. B. das Fach-Kürzel („Spedition · STG“) */
  detail?: string
}) {
  const scope = useOptionalAdminRole()?.scope
  if (!scope) return null

  const fixed = scope.current ? scope.departments.find((d) => d.id === scope.current) : null
  if (fixed) {
    return (
      <p className="flex items-center gap-2 rounded-xl border border-ws-line bg-ws-bg px-3 py-2 text-sm text-ws-muted">
        <Building2 className="size-4 shrink-0" aria-hidden />
        <span>
          Wird angelegt in:{' '}
          <strong className="font-semibold text-ws-text">
            {fixed.name}
            {detail ? ` · ${detail}` : ''}
          </strong>
        </span>
      </p>
    )
  }

  return (
    <div className="space-y-2">
      <Label htmlFor="target-department">Wird angelegt in (Pflicht)</Label>
      <Select value={value || undefined} onValueChange={onChange}>
        <SelectTrigger
          id="target-department"
          aria-invalid={!!error}
          className="min-h-11 rounded-xl border-ws-line bg-ws-bg text-ws-text focus:ring-ws-green"
        >
          <SelectValue placeholder="Bereich wählen" />
        </SelectTrigger>
        <SelectContent className="border-ws-line bg-ws-surface text-ws-text">
          {scope.departments.map((d) => (
            <SelectItem key={d.id} value={d.id} className="focus:bg-ws-raised focus:text-ws-text">
              {d.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error && <p className="text-xs text-ws-red">{error}</p>}
    </div>
  )
}

/** Ob in der aktuellen Ansicht ein Zielbereich gewählt werden muss („Alle Bereiche“) */
export function useNeedsTargetDepartment(): boolean {
  const scope = useOptionalAdminRole()?.scope
  return !!scope && scope.current === null
}
