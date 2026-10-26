'use client'

import Link from 'next/link'
import { ChevronRight, ExternalLink } from 'lucide-react'
import { useAdminRole } from '@/components/admin/admin-role-provider'
import { useDepartment } from '@/components/department-provider'
import { adminNavGroupsFor, adminNavLabel } from '@/lib/admin-nav'
import { TeacherWelcomeDialog } from '@/components/admin/teacher-welcome-dialog'
import { AdminPageHeader } from '@/components/admin/admin-page-header'
import { useIsApplePlatform } from '@/hooks/use-is-apple-platform'

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
