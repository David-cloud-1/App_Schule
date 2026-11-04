'use client'

import { useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Building2, Loader2 } from 'lucide-react'
import { useAdminRole } from '@/components/admin/admin-role-provider'
import { useDepartment } from '@/components/department-provider'
import { contentScopeText } from '@/lib/roles'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const ALL = 'alle'

/**
 * Bereichsleiste unter dem Titel der Inhalts-Seiten (PROJ-70): sagt in einfacher
 * Sprache, welchen Bereich die Liste zeigt („Du siehst: Spedition“), und ist
 * zugleich der Umschalter. Sie ersetzt die Umfangszeile aus PROJ-49. Der Wechsel
 * wird im Cookie gemerkt und gilt für alle Inhalts-Seiten.
 */
export type ScopeBarMode = 'content' | 'people' | 'assessments'

/**
 * `mode`: 'content' (Inhalts-Seiten) und 'assessments' (Leistungsnachweise)
 * lassen jede Lehrer-Rolle wechseln. 'people' (Nutzer, Änderungsprotokoll,
 * Schülerdaten) zeigt allen außer dem Super-Admin ihren eigenen Bereich fest,
 * ohne Umschalter (Schülerdaten bleiben im eigenen Bereich).
 */
export function AdminScopeBar({ mode = 'content' }: { mode?: ScopeBarMode }) {
  const { role, scope, isSuperAdmin } = useAdminRole()
  const { name: departmentName } = useDepartment()
  const [switching, setSwitching] = useState(false)

  // Ohne Bereichsdaten (Einzelseiten, Tests) bleibt die ruhige Textzeile
  if (!scope && mode !== 'content') return null
  if (!scope) {
    return <p className="text-sm text-ws-muted">{contentScopeText(role, departmentName)}</p>
  }

  const { current, departments } = scope
  const fixedOwn = mode === 'people' && !isSuperAdmin
  const currentName = current ? (departments.find((d) => d.id === current)?.name ?? departmentName) : null
  const canSwitch = departments.length > 1 && !fixedOwn

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
        toast.error(data?.error ?? 'Bereich konnte nicht gewechselt werden.')
        setSwitching(false)
        return
      }
      // Seiten halten eigenen Zustand und laden beim Öffnen neu: volles Neuladen ist am zuverlässigsten
      window.location.reload()
    } catch {
      toast.error('Netzwerkfehler. Bitte versuche es erneut.')
      setSwitching(false)
    }
  }

  return (
    <div
      role="group"
      aria-label="Bereich"
      className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-ws-muted"
    >
      <span className="flex items-center gap-2">
        <Building2 className="size-4 shrink-0" aria-hidden />
        <span>
          Du siehst:{' '}
          <strong className="font-semibold text-ws-text">
            {fixedOwn ? departmentName : (currentName ?? 'alle Bereiche')}
          </strong>
        </span>
      </span>
      {canSwitch && (
        <Select value={current ?? ALL} onValueChange={handleChange} disabled={switching}>
          <SelectTrigger
            aria-label="Bereich wechseln"
            className="h-auto min-h-11 w-auto gap-2 rounded-xl border-ws-line bg-ws-surface px-3 py-2 text-sm text-ws-text focus:ring-ws-green"
          >
            {switching && <Loader2 className="size-4 animate-spin" aria-hidden />}
            <SelectValue placeholder="Bereich wechseln" />
          </SelectTrigger>
          <SelectContent className="border-ws-line bg-ws-surface text-ws-text">
            <SelectItem value={ALL} className="focus:bg-ws-raised focus:text-ws-text">
              Alle Bereiche
            </SelectItem>
            {departments.map((d) => (
              <SelectItem key={d.id} value={d.id} className="focus:bg-ws-raised focus:text-ws-text">
                {d.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      {role === 'teacher' && mode === 'content' && (
        <Link
          href="/admin/my-subjects"
          className="font-semibold text-ws-blue hover:underline focus-visible:ring-2 focus-visible:ring-ws-green"
        >
          Meine Fächer
        </Link>
      )}
    </div>
  )
}
