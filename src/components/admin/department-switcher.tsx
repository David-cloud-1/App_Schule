'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Building2, Loader2 } from 'lucide-react'
import { useDepartment } from '@/components/department-provider'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

type DepartmentOption = { id: string; name: string; code: string }

/**
 * Bereichs-Umschalter (PROJ-24) — nur für Super-Admin sichtbar. Wählt den
 * Fachbereich, in dem der Super-Admin gerade arbeitet (Fragen sieht,
 * importiert, Shop-Artikel pflegt, …). Setzt das Cookie über
 * POST /api/admin/context/department und lädt danach neu, damit alle
 * Admin-Seiten ihre Daten für den neu gewählten Bereich frisch laden.
 */
export function DepartmentSwitcher() {
  const { name: departmentName } = useDepartment()
  const [departments, setDepartments] = useState<DepartmentOption[]>([])
  const [current, setCurrent] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [switching, setSwitching] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await fetch('/api/admin/departments')
        if (!res.ok) return
        const json = await res.json()
        if (cancelled) return
        const depts: DepartmentOption[] = (json.departments ?? []).map(
          (d: { id: string; name: string; code: string }) => ({
            id: d.id,
            name: d.name,
            code: d.code,
          })
        )
        setDepartments(depts)
        // Bereich der aktuell sichtbaren Admin-Daten ermitteln: das
        // Fachbereich-Einstellungen-Endpoint liefert den effektiven
        // (Cookie- oder Standard-)Bereich des Super-Admins.
        const settingsRes = await fetch('/api/admin/department-settings')
        if (settingsRes.ok) {
          const settings = await settingsRes.json()
          if (!cancelled) setCurrent(settings.id)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  async function handleChange(departmentId: string) {
    if (departmentId === current) return
    setSwitching(true)
    try {
      const res = await fetch('/api/admin/context/bereich', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bereich: departmentId }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(data?.error ?? 'Bereich konnte nicht gewechselt werden.')
        setSwitching(false)
        return
      }
      // Volles Neuladen: viele Admin-Seiten halten eigenen Client-State und
      // fragen bei Mount neu ab — am zuverlässigsten für den Bereichswechsel.
      window.location.reload()
    } catch (err) {
      console.error(err)
      toast.error('Netzwerkfehler')
      setSwitching(false)
    }
  }

  // Bei nur einem Bereich (oder beim Laden) steht der Bereich als ruhige, nicht klickbare Anzeige da
  if (loading || departments.length <= 1) {
    return departmentName ? (
      <div className={boxClass}>
        <Building2 className="size-5 shrink-0 text-ws-muted" aria-hidden />
        <span className="grid min-w-0 leading-tight group-data-[collapsible=icon]:hidden">
          <span className="text-xs text-ws-muted">Bereich</span>
          <span className="truncate font-semibold text-ws-text" title={departmentName}>
            {departmentName}
          </span>
        </span>
      </div>
    ) : null
  }

  return (
    <Select value={current ?? undefined} onValueChange={handleChange} disabled={switching}>
      <SelectTrigger
        aria-label="Bereich wechseln"
        className="h-auto min-h-11 w-full justify-between rounded-xl border-ws-line bg-ws-surface px-3 py-2 text-left text-ws-text focus:ring-ws-green group-data-[collapsible=icon]:size-11 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:[&>svg:last-child]:hidden"
      >
        <span className="flex min-w-0 items-center gap-3">
          {switching ? (
            <Loader2 className="size-5 shrink-0 animate-spin text-ws-muted" aria-hidden />
          ) : (
            <Building2 className="size-5 shrink-0 text-ws-muted" aria-hidden />
          )}
          <span className="grid min-w-0 leading-tight group-data-[collapsible=icon]:hidden">
            <span className="text-xs text-ws-muted">Bereich</span>
            <span className="truncate font-semibold">
              <SelectValue placeholder="Fachbereich" />
            </span>
          </span>
        </span>
      </SelectTrigger>
      <SelectContent className="border-ws-line bg-ws-surface text-ws-text">
        {departments.map((d) => (
          <SelectItem key={d.id} value={d.id} className="focus:bg-ws-raised focus:text-ws-text">
            {d.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

const boxClass =
  'flex min-h-11 items-center gap-3 rounded-xl border border-ws-line bg-ws-surface px-3 py-2 group-data-[collapsible=icon]:size-11 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0'
