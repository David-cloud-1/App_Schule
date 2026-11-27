'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { toast } from 'sonner'
import { Building2, Loader2 } from 'lucide-react'
import { useAdminRole } from '@/components/admin/admin-role-provider'
import { useDepartment } from '@/components/department-provider'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const ALL = 'alle'

/**
 * Seiten, die auch bei „Alle Bereiche“ genau einen Bereich zeigen: Beim
 * Super-Admin ist das der zuletzt gewählte einzelne Bereich (Server: Cookie
 * `admin_department_id`). Lehrkräfte und Bereichs-Admins sehen bei „Alle
 * Bereiche“ dort alle Azubis bzw. werden gebeten, einen Bereich zu wählen.
 */
const SUPER_ADMIN_SINGLE_PATHS = ['/admin/users', '/admin/department-settings', '/admin/shop-items']

export function singleDepartmentPage(pathname: string): boolean {
  return SUPER_ADMIN_SINGLE_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))
}

const boxClass =
  'flex min-h-11 w-full items-center gap-3 rounded-xl border border-ws-line bg-ws-surface px-3 py-2 text-left text-ws-text group-data-[collapsible=icon]:size-11 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0'

/**
 * Der eine Bereichs-Umschalter (PROJ-130) oben in Seitenleiste und Schublade.
 * Er ersetzt den Super-Admin-Umschalter (PROJ-24) und die Leiste „Du siehst …“
 * unter den Seitentiteln (PROJ-70). Er speichert über denselben Weg wie
 * vorher und lädt danach neu, damit alle Seiten frisch laden.
 */
export function BereichsUmschalter() {
  const { scope, isSuperAdmin } = useAdminRole()
  const { name: ownName } = useDepartment()
  const pathname = usePathname() ?? ''
  const [switching, setSwitching] = useState(false)

  const departments = scope?.departments ?? []
  const current = scope?.current ?? null
  const currentName = current ? (departments.find((d) => d.id === current)?.name ?? ownName) : 'Alle Bereiche'

  // Hinweis, wenn die Seite trotz „Alle Bereiche“ nur einen Bereich zeigt
  const workingName =
    isSuperAdmin && current === null && scope?.workingDepartmentId && singleDepartmentPage(pathname)
      ? departments.find((d) => d.id === scope.workingDepartmentId)?.name
      : undefined

  async function handleChange(value: string) {
    if (value === (current ?? ALL)) return
    setSwitching(true)
    try {
      const res = await fetch('/api/admin/context/bereich', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bereich: value }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        toast.error(data?.error ?? 'Der Bereich konnte nicht gewechselt werden.')
        setSwitching(false)
        return
      }
      // „Lerninhalte“ (PROJ-131): Fach und Thema gehören zum alten Bereich, der Reiter bleibt
      const url = new URL(window.location.href)
      if (url.pathname === '/admin/inhalte' && (url.searchParams.has('fach') || url.searchParams.has('thema'))) {
        url.searchParams.delete('fach')
        url.searchParams.delete('thema')
        window.history.replaceState(null, '', url.pathname + url.search)
      }
      // Seiten halten eigenen Zustand und laden beim Öffnen neu: volles Neuladen ist am zuverlässigsten
      window.location.reload()
    } catch {
      toast.error('Netzwerkfehler. Bitte versuche es erneut.')
      setSwitching(false)
    }
  }

  const label = (
    <span className="grid min-w-0 leading-tight group-data-[collapsible=icon]:hidden">
      <span className="text-xs text-ws-muted">Bereich</span>
      <span className="truncate font-semibold" title={currentName}>
        {currentName}
      </span>
    </span>
  )

  // Nur ein Bereich: ruhige Anzeige ohne Auswahl
  if (departments.length <= 1) {
    if (!ownName && departments.length === 0) return null
    return (
      <div className={boxClass} title={`Bereich: ${departments[0]?.name ?? ownName}`}>
        <Building2 className="size-5 shrink-0 text-ws-muted" aria-hidden />
        <span className="grid min-w-0 leading-tight group-data-[collapsible=icon]:hidden">
          <span className="text-xs text-ws-muted">Bereich</span>
          <span className="truncate font-semibold">{departments[0]?.name ?? ownName}</span>
        </span>
      </div>
    )
  }

  return (
    <div className="space-y-1.5">
      <Select value={current ?? ALL} onValueChange={handleChange} disabled={switching}>
        <SelectTrigger
          aria-label={`Bereich: ${currentName}. Bereich wechseln`}
          title={`Bereich: ${currentName}`}
          className={`${boxClass} h-auto justify-between focus:ring-ws-green group-data-[collapsible=icon]:[&>svg:last-child]:hidden`}
        >
          <span className="flex min-w-0 items-center gap-3">
            {switching ? (
              <Loader2 className="size-5 shrink-0 animate-spin text-ws-muted" aria-hidden />
            ) : (
              <Building2 className="size-5 shrink-0 text-ws-muted" aria-hidden />
            )}
            {label}
          </span>
          <span className="sr-only">
            <SelectValue />
          </span>
        </SelectTrigger>
        <SelectContent className="border-ws-line bg-ws-surface text-ws-text">
          {departments.map((d) => (
            <SelectItem key={d.id} value={d.id} className="min-h-11 focus:bg-ws-raised focus:text-ws-text">
              {d.name}
            </SelectItem>
          ))}
          <SelectItem value={ALL} className="min-h-11 focus:bg-ws-raised focus:text-ws-text">
            Alle Bereiche
          </SelectItem>
        </SelectContent>
      </Select>
      {workingName && (
        <p className="px-1 text-xs text-ws-muted group-data-[collapsible=icon]:hidden">
          Auf dieser Seite: <strong className="font-semibold text-ws-text">{workingName}</strong>
        </p>
      )}
    </div>
  )
}
