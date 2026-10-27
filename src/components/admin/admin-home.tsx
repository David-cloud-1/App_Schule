'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ChevronRight, ExternalLink } from 'lucide-react'
import { useAdminRole } from '@/components/admin/admin-role-provider'
import { useDepartment } from '@/components/department-provider'
import { adminNavGroupsFor, adminNavLabel } from '@/lib/admin-nav'
import { TeacherWelcomeDialog } from '@/components/admin/teacher-welcome-dialog'
import { AdminPageHeader } from '@/components/admin/admin-page-header'
import { useIsApplePlatform } from '@/hooks/use-is-apple-platform'

type MySubjectTile = {
  id: string
  name: string
  code: string
  department_name: string | null
  active_question_count: number
}

/**
 * „Meine Fächer"-Kacheln auf der Startseite (PROJ-48 AC) — nur für eine
 * Lehrkraft mit Zuständigkeiten. Bereichs-Admin/Super-Admin brauchen das
 * nicht, die sehen ihre Fächer bereits unter „Fächer".
 */
function useMySubjectTiles(enabled: boolean): MySubjectTile[] {
  const [tiles, setTiles] = useState<MySubjectTile[]>([])
  useEffect(() => {
    if (!enabled) return
    fetch('/api/admin/subjects')
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (json?.subjects) setTiles(json.subjects)
      })
      .catch(() => {})
  }, [enabled])
  return tiles
}

/**
 * Startseite des Lehrkräfte-Bereichs (PROJ-40/44): große Kacheln für die
 * Hauptaufgaben, gefiltert nach Rolle. Keine Datenabfrage — die Kacheln stammen
 * aus der Navigations-Liste.
 */
export function AdminHome() {
  const { role, displayName, showTeacherWelcome } = useAdminRole()
  const { hofShortName } = useDepartment()
  const isApple = useIsApplePlatform()
  const tiles = adminNavGroupsFor(role).flatMap((group) => group.items.filter((item) => item.tile))
  const mySubjects = useMySubjectTiles(role === 'teacher')

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={displayName ? `Hallo, ${displayName}` : 'Hallo'}
        description={`Was möchtest du heute tun? Mit ${isApple ? '⌘K' : 'Strg+K'} findest du jede Seite.`}
      />

      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {tiles.map((item) => (
          <li key={item.href}>
            <TileLink
              href={item.href}
              external={item.external}
              className="group flex min-h-24 items-center gap-4 rounded-2xl border border-ws-line bg-ws-surface p-5 shadow-lg transition-all duration-200 hover:border-ws-green hover:bg-ws-raised active:scale-95"
            >
              <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-ws-green/15 text-ws-green">
                <item.icon className="size-6" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-lg font-semibold text-ws-text">
                  {adminNavLabel(item, hofShortName)}
                </span>
                <span className="block text-sm text-ws-muted">{item.description}</span>
              </span>
              {item.external ? (
                <ExternalLink className="size-5 shrink-0 text-ws-muted" aria-label="öffnet in neuem Tab" />
              ) : (
                <ChevronRight className="size-5 shrink-0 text-ws-muted transition-transform duration-200 group-hover:translate-x-1" />
              )}
            </TileLink>
          </li>
        ))}
      </ul>

      {role === 'teacher' && mySubjects.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-ws-faint">Meine Fächer</h2>
          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {mySubjects.map((s) => (
              <li key={s.id}>
                <Link
                  href={`/admin/questions?subject=${encodeURIComponent(s.code)}`}
                  className="group flex items-center justify-between gap-3 rounded-2xl border border-ws-line bg-ws-surface p-4 shadow-lg transition-all duration-200 hover:border-ws-green hover:bg-ws-raised active:scale-95"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm text-ws-muted">{s.department_name ?? ''}</span>
                    <span className="block truncate text-base font-semibold text-ws-text">{s.name}</span>
                  </span>
                  <span className="shrink-0 rounded-full bg-ws-green/15 px-3 py-1 text-xs font-semibold text-ws-green">
                    {s.active_question_count} aktiv
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {role === 'teacher' && (
        <p className="text-sm text-ws-muted">Weitere Werkzeuge für Lehrkräfte, etwa Leistungsnachweise, folgen bald.</p>
      )}

      {role === 'teacher' && showTeacherWelcome && <TeacherWelcomeDialog initialOpen />}
    </div>
  )
}

function TileLink({
  href,
  external,
  className,
  children,
}: {
  href: string
  external?: boolean
  className: string
  children: React.ReactNode
}) {
  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
        {children}
      </a>
    )
  }
  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  )
}
