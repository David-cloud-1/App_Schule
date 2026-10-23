'use client'

import { useId } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ExternalLink, LayoutDashboard } from 'lucide-react'
import { useDepartment } from '@/components/department-provider'
import { useAdminRole } from '@/components/admin/admin-role-provider'
import {
  ADMIN_HOME_HREF,
  adminNavGroupsFor,
  adminNavLabel,
  isAdminNavActive,
} from '@/lib/admin-nav'

/**
 * Gruppierte Navigation des Admin-Bereichs (PROJ-40) — dieselbe Liste in der
 * Seitenleiste (Desktop) und im Menü (Handy). `onNavigate` schließt das Menü.
 */
export function AdminNav({ onNavigate }: { onNavigate?: () => void }) {
  const { hofShortName } = useDepartment()
  const { isSuperAdmin } = useAdminRole()
  const pathname = usePathname()
  const idPrefix = useId()
  const groups = adminNavGroupsFor(isSuperAdmin)

  return (
    <nav aria-label="Admin Bereiche" className="space-y-6">
      <ul>
        <li>
          <NavLink
            href={ADMIN_HOME_HREF}
            active={isAdminNavActive(pathname, ADMIN_HOME_HREF)}
            onNavigate={onNavigate}
          >
            <LayoutDashboard className="size-5 shrink-0" />
            Übersicht
          </NavLink>
        </li>
      </ul>
      {groups.map((group) => (
        <div key={group.id}>
          <p
            id={`${idPrefix}-${group.id}`}
            className="px-3 mb-1 text-xs font-semibold uppercase tracking-wider text-[#9CA3AF]"
          >
            {group.label}
          </p>
          <ul className="space-y-1" aria-labelledby={`${idPrefix}-${group.id}`}>
            {group.items.map((item) => (
              <li key={item.href}>
                <NavLink
                  href={item.href}
                  external={item.external}
                  active={!item.external && isAdminNavActive(pathname, item.href)}
                  onNavigate={onNavigate}
                >
                  <item.icon className="size-5 shrink-0" />
                  {adminNavLabel(item, hofShortName)}
                  {item.external && <ExternalLink className="size-4 shrink-0 ml-auto" aria-label="öffnet in neuem Tab" />}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  )
}

function NavLink({
  href,
  active,
  external,
  onNavigate,
  children,
}: {
  href: string
  active: boolean
  external?: boolean
  onNavigate?: () => void
  children: React.ReactNode
}) {
  const className = `flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold transition-all duration-200 ${
    active
      ? 'bg-[#58CC02]/15 text-[#58CC02]'
      : 'text-[#9CA3AF] hover:bg-[#374151] hover:text-[#F9FAFB]'
  }`
  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" onClick={onNavigate} className={className}>
        {children}
      </a>
    )
  }
  return (
    <Link
      href={href}
      onClick={onNavigate}
      aria-current={active ? 'page' : undefined}
      className={className}
    >
      {children}
    </Link>
  )
}
