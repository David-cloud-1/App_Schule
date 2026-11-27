'use client'

import { useState } from 'react'
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
 * Bereich beim Anlegen (PROJ-70/130): Ist oben im Menü ein Bereich gewählt,
 * steht er nur als ruhige Zeile „Bereich: …“ da. In „Alle
 * Bereiche“ ist die Auswahl ein Pflichtfeld ohne Vorauswahl, damit nichts
 * versehentlich im falschen Bereich landet. `value` ist die gewählte
 * Bereichs-ID (oder leer). Gespeichert wird immer `departmentId` aus
 * `useTargetDepartment` — auch der feste Bereich geht ausdrücklich an den
 * Server, sonst gälte dort das Cookie zum Zeitpunkt des Speicherns.
 */
export function TargetDepartmentField({
  value,
  onChange,
  error,
  detail,
  fixedId,
}: {
  value: string
  onChange: (id: string) => void
  error?: string
  /** Zusatz hinter dem Bereich, z. B. das Fach-Kürzel („Spedition · STG“) */
  detail?: string
  /** Beim Öffnen festgehaltener Bereich aus `useTargetDepartment` (null = „Alle Bereiche“) */
  fixedId?: string | null
}) {
  const scope = useOptionalAdminRole()?.scope
  if (!scope) return null

  const currentId = fixedId === undefined ? scope.current : fixedId
  const fixed = currentId ? scope.departments.find((d) => d.id === currentId) : null
  if (fixed) {
    return (
      <p className="flex items-center gap-2 rounded-xl border border-ws-line bg-ws-bg px-3 py-2 text-sm text-ws-muted">
        <Building2 className="size-4 shrink-0" aria-hidden />
        <span>
          Bereich:{' '}
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
      <Label htmlFor="target-department">Bereich (Pflicht)</Label>
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

/**
 * Bereich eines Anlegen-Dialogs (PROJ-130): wird beim Öffnen festgehalten.
 * Wechselt jemand währenddessen in einem anderen Tab den Bereich, landet
 * trotzdem alles dort, wo der Dialog es anzeigt. Beim erneuten Öffnen wird neu
 * übernommen und die eigene Wahl geleert. Seiten (statt Dialoge) lassen `open`
 * weg.
 */
export function useTargetDepartment(open = true) {
  const scope = useOptionalAdminRole()?.scope
  const current = scope ? scope.current : undefined
  const [held, setHeld] = useState({ open, current })
  const [chosen, setChosen] = useState('')
  // Anpassung während des Renderns: so gilt der neue Stand schon im ersten Bild
  if (held.open !== open) {
    setHeld({ open, current })
    if (open) setChosen('')
  }
  const fixedId = held.current ?? null
  const needsTarget = !!scope && fixedId === null
  /** Das schickt der Dialog an den Server; null = noch nichts gewählt (oder ohne Umschalter) */
  const departmentId: string | null = fixedId ?? (chosen || null)
  return { fixedId: scope ? fixedId : undefined, needsTarget, chosen, setChosen, departmentId }
}
