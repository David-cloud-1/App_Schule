'use client'

import { useId } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ExternalLink, LayoutDashboard, type LucideIcon } from 'lucide-react'
import { useDepartment } from '@/components/department-provider'
import { useAdminRole } from '@/components/admin/admin-role-provider'
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar'
import {
  ADMIN_HOME_HREF,
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
  const { isMobile, setOpenMobile } = useSidebar()
  const pathname = usePathname()
  const idPrefix = useId()
  const groups = adminNavGroupsFor(role)

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
            id={`${idPrefix}-${group.id}`}
            className="text-xs font-semibold uppercase tracking-wider text-ws-faint"
          >
            {group.label}
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
  onNavigate,
}: {
  href: string
  label: string
  icon: LucideIcon
  active: boolean
  external?: boolean
  onNavigate: () => void
}) {
  const content = (
    <>
      <Icon className="!size-5" />
      <span>{label}</span>
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
