'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Building2, Loader2 } from 'lucide-react'
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
      const res = await fetch('/api/admin/context/department', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ department_id: departmentId }),
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

  if (loading || departments.length <= 1) return null

  return (
    <Select value={current ?? undefined} onValueChange={handleChange} disabled={switching}>
      <SelectTrigger className="h-9 w-[180px] bg-[#111827] border-[#4B5563] text-[#F9FAFB] text-sm">
        <div className="flex items-center gap-2 truncate">
          {switching ? (
            <Loader2 className="w-4 h-4 shrink-0 animate-spin text-[#9CA3AF]" />
          ) : (
            <Building2 className="w-4 h-4 shrink-0 text-[#9CA3AF]" />
          )}
          <SelectValue placeholder="Fachbereich" />
        </div>
      </SelectTrigger>
      <SelectContent className="bg-[#1F2937] border-[#4B5563] text-[#F9FAFB]">
        {departments.map((d) => (
          <SelectItem key={d.id} value={d.id} className="focus:bg-[#111827] focus:text-[#F9FAFB]">
            {d.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
