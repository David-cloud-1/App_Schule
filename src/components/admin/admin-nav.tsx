'use client'

import { useId } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ExternalLink, LayoutDashboard, type LucideIcon } from 'lucide-react'
import { useDepartment } from '@/components/department-provider'
import { useAdminRole, useHasSubjects } from '@/components/admin/admin-role-provider'
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar'
import { useForumNavCounts } from '@/components/admin/use-forum-nav-counts'
import { formatForumBadge } from '@/lib/forum'
import {
  ADMIN_HOME_HREF,
  LEHRERZIMMER_HREF,
  adminNavGroupHint,
  adminNavGroupsFor,
  adminNavLabel,
  isAdminNavActive,
} from '@/lib/admin-nav'

/**
 * Gruppierte Navigation des Lehrkräfte-Bereichs (PROJ-40/45) — dieselbe Liste
 * in der Seitenleiste (Desktop, einklappbar) und in der Schublade (Handy).
 * Eingeklappt zeigt jedes Icon seinen Namen als Tooltip.
 */
export function AdminNav({ onNavigate }: { onNavigate?: () => void }) {
  const { hofShortName } = useDepartment()
  const { role } = useAdminRole()
  const hasSubjects = useHasSubjects()
  const { isMobile, setOpenMobile } = useSidebar()
  const pathname = usePathname()
  const idPrefix = useId()
  const groups = adminNavGroupsFor(role, hasSubjects)
  // PROJ-63: Hinweise fürs Lehrerzimmer; wird bei jedem Seitenwechsel neu geholt
  const forumCounts = useForumNavCounts(pathname)

  function handleNavigate() {
    if (isMobile) setOpenMobile(false)
    onNavigate?.()
  }

  return (
    <nav aria-label="Lehrkräfte-Bereich">
      <SidebarGroup>
        <SidebarMenu>
          <SidebarMenuItem>
            <NavLink
              href={ADMIN_HOME_HREF}
              label="Übersicht"
              icon={LayoutDashboard}
              active={isAdminNavActive(pathname, ADMIN_HOME_HREF)}
              onNavigate={handleNavigate}
            />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroup>
      {groups.map((group) => (
        <SidebarGroup key={group.id}>
          <SidebarGroupLabel
            className="text-xs font-semibold uppercase tracking-wider text-ws-faint"
          >
            <span id={`${idPrefix}-${group.id}`}>{group.label}</span>
            {adminNavGroupHint(group, role) && (
              <span aria-hidden className="ml-1 font-normal normal-case tracking-normal">
                · {adminNavGroupHint(group, role)}
              </span>
            )}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu aria-labelledby={`${idPrefix}-${group.id}`}>
              {group.items.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <NavLink
                    href={item.href}
                    label={adminNavLabel(item, hofShortName)}
                    icon={item.icon}
                    external={item.external}
                    badge={item.href === LEHRERZIMMER_HREF ? forumCounts : undefined}
                    active={!item.external && isAdminNavActive(pathname, item.href)}
                    onNavigate={handleNavigate}
                  />
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      ))}
    </nav>
  )
}

function NavLink({
  href,
  label,
  icon: Icon,
  active,
  external,
  badge,
  onNavigate,
}: {
  href: string
  label: string
  icon: LucideIcon
  active: boolean
  external?: boolean
  /** Zähler am Eintrag (PROJ-63): neue Hinweise grün, offene Meldungen orange */
  badge?: { hints: number; reports: number }
  onNavigate: () => void
}) {
  const hintsText = badge ? formatForumBadge(badge.hints) : null
  const reportsText = badge ? formatForumBadge(badge.reports) : null
  const content = (
    <>
      <span className="relative flex">
        <Icon className="!size-5" />
        {/* Eingeklappt (nur Icons) zeigt ein Punkt, dass es etwas Neues gibt */}
        {(hintsText || reportsText) && (
          <span
            aria-hidden
            className={`absolute -right-1 -top-1 hidden size-2.5 rounded-full group-data-[collapsible=icon]:block ${hintsText ? 'bg-ws-green' : 'bg-ws-orange'}`}
          />
        )}
      </span>
      <span>{label}</span>
      {hintsText && (
        <span
          className="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full border border-ws-green/30 bg-ws-green/15 px-1.5 text-xs font-bold text-ws-green group-data-[collapsible=icon]:hidden"
          title={`${badge!.hints} neue Hinweise`}
        >
          <span aria-hidden>{hintsText}</span>
          <span className="sr-only">{badge!.hints} neue Hinweise</span>
        </span>
      )}
      {reportsText && (
        <span
          className={`${hintsText ? '' : 'ml-auto '}inline-flex h-5 min-w-5 items-center justify-center rounded-full border border-ws-orange/30 bg-ws-orange/15 px-1.5 text-xs font-bold text-ws-orange group-data-[collapsible=icon]:hidden`}
          title={`${badge!.reports} offene Meldungen`}
        >
          <span aria-hidden>{reportsText}</span>
          <span className="sr-only">{badge!.reports} offene Meldungen</span>
        </span>
      )}
      {external && (
        <ExternalLink
          className="!size-4 ml-auto group-data-[collapsible=icon]:hidden"
          aria-label="öffnet in neuem Tab"
        />
      )}
    </>
  )

  return (
    <SidebarMenuButton
      asChild
      isActive={active}
      tooltip={label}
      className="h-11 gap-3 rounded-xl px-3 font-semibold text-ws-muted transition-colors duration-200 hover:bg-ws-raised hover:text-ws-text focus-visible:ring-ws-green data-[active=true]:bg-ws-green/15 data-[active=true]:text-ws-green lg:h-9"
    >
      {external ? (
        <a href={href} target="_blank" rel="noopener noreferrer" onClick={onNavigate}>
          {content}
        </a>
      ) : (
        <Link href={href} onClick={onNavigate} aria-current={active ? 'page' : undefined}>
          {content}
        </Link>
      )}
    </SidebarMenuButton>
  )
}
