'use client'

import Link from 'next/link'
import { ChevronRight, ExternalLink } from 'lucide-react'
import { useAdminRole } from '@/components/admin/admin-role-provider'
import { useDepartment } from '@/components/department-provider'
import { adminNavGroupsFor, adminNavLabel } from '@/lib/admin-nav'
import { TeacherWelcomeDialog } from '@/components/admin/teacher-welcome-dialog'

/**
 * Startseite des Lehrkräfte-Bereichs (PROJ-40/44): große Kacheln für die
 * Hauptaufgaben, gefiltert nach Rolle. Keine Datenabfrage — die Kacheln stammen
 * aus der Navigations-Liste.
 */
export function AdminHome() {
  const { role, displayName, showTeacherWelcome } = useAdminRole()
  const { hofShortName } = useDepartment()
  const tiles = adminNavGroupsFor(role).flatMap((group) => group.items.filter((item) => item.tile))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#F9FAFB] tracking-tight truncate">
          {displayName ? `Hallo, ${displayName}` : 'Hallo'}
        </h1>
        <p className="text-sm text-[#9CA3AF] mt-1">Was möchtest du heute tun?</p>
      </div>

      <ul className="grid gap-4 sm:grid-cols-2">
        {tiles.map((item) => (
          <li key={item.href}>
            <TileLink
              href={item.href}
              external={item.external}
              className="group flex min-h-24 items-center gap-4 rounded-2xl border border-[#4B5563] bg-[#1F2937] p-5 shadow-lg transition-all duration-200 hover:border-[#58CC02] hover:bg-[#374151] active:scale-95"
            >
              <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-[#58CC02]/15 text-[#58CC02]">
                <item.icon className="size-6" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-lg font-semibold text-[#F9FAFB]">
                  {adminNavLabel(item, hofShortName)}
                </span>
                <span className="block text-sm text-[#9CA3AF]">{item.description}</span>
              </span>
              {item.external ? (
                <ExternalLink className="size-5 shrink-0 text-[#9CA3AF]" aria-label="öffnet in neuem Tab" />
              ) : (
                <ChevronRight className="size-5 shrink-0 text-[#9CA3AF] transition-transform duration-200 group-hover:translate-x-1" />
              )}
            </TileLink>
          </li>
        ))}
      </ul>

      {role === 'teacher' && (
        <p className="text-sm text-[#9CA3AF]">Weitere Werkzeuge für Lehrkräfte, etwa Leistungsnachweise, folgen bald.</p>
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
