'use client'

import { useId, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronDown, ExternalLink, LayoutDashboard, type LucideIcon } from 'lucide-react'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
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
import { useForumNavCounts } from '@/components/admin/use-forum-nav-counts'
import { formatForumBadge } from '@/lib/forum'
import {
  ADMIN_HOME_HREF,
  type AdminNavItem,
  LEHRERZIMMER_HREF,
  adminNavGroupHint,
  adminNavGroupsFor,
  adminNavLabel,
  ADMIN_MAIN_NAV_HREFS,
  isAdminNavActive,
} from '@/lib/admin-nav'

/**
 * Navigation des Lehrkräfte-Bereichs (PROJ-40/45) — dieselbe Liste in der
 * Seitenleiste (Desktop, einklappbar) und in der Schublade (Handy).
 *
 * Oben stehen nur die wenigen Seiten, die man täglich braucht. Alles andere
 * liegt unter „Weitere Seiten“ und „Verwaltung“ und ist eingeklappt — es sei
 * denn, die aktuelle Seite liegt darin. Eingeklappt (nur Icons) zeigt die
 * Leiste alles und jedes Icon seinen Namen als Tooltip.
 */
export function AdminNav({ onNavigate }: { onNavigate?: () => void }) {
  const { hofShortName } = useDepartment()
  const { role } = useAdminRole()
  const { isMobile, setOpenMobile } = useSidebar()
  const pathname = usePathname()
  const groups = adminNavGroupsFor(role)
  // PROJ-63: Hinweise fürs Lehrerzimmer; wird bei jedem Seitenwechsel neu geholt
  const forumCounts = useForumNavCounts(pathname)

  const allItems = groups.flatMap((g) => g.items)
  const mainItems = ADMIN_MAIN_NAV_HREFS.map((href) => allItems.find((i) => i.href === href)).filter(
    (i): i is AdminNavItem => !!i,
  )
  const isMain = (item: AdminNavItem) => ADMIN_MAIN_NAV_HREFS.includes(item.href)
  const moreGroups = groups
    .filter((g) => g.id !== 'verwaltung')
    .map((g) => ({ ...g, items: g.items.filter((i) => !isMain(i)) }))
    .filter((g) => g.items.length > 0)
  const adminGroup = groups.find((g) => g.id === 'verwaltung')

  function handleNavigate() {
    if (isMobile) setOpenMobile(false)
    onNavigate?.()
  }

  function renderLink(item: AdminNavItem) {
    return (
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
    )
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
          {mainItems.map(renderLink)}
        </SidebarMenu>
      </SidebarGroup>

      {moreGroups.length > 0 && (
        <NavFold id="weitere" label="Weitere Seiten" items={moreGroups.flatMap((g) => g.items)} pathname={pathname}>
          {moreGroups.map((group) => (
            <NavSubGroup key={group.id} id={group.id} label={group.id === 'inhalte' ? 'Inhalte' : undefined} hint={adminNavGroupHint(group, role)}>
              {group.items.map(renderLink)}
            </NavSubGroup>
          ))}
        </NavFold>
      )}

      {adminGroup && (
        <NavFold id="verwaltung" label="Verwaltung" items={adminGroup.items} pathname={pathname}>
          <NavSubGroup id="verwaltung" label="Verwaltung" hidden>
            {adminGroup.items.map(renderLink)}
          </NavSubGroup>
        </NavFold>
      )}
    </nav>
  )
}

/** Einklappbarer Block; offen, wenn die aktuelle Seite darin liegt, und immer offen, solange die Leiste nur Icons zeigt. */
function NavFold({
  id,
  label,
  items,
  pathname,
  children,
}: {
  id: string
  label: string
  items: AdminNavItem[]
  pathname: string
  children: React.ReactNode
}) {
  const { state, isMobile } = useSidebar()
  const iconOnly = state === 'collapsed' && !isMobile
  const containsActive = items.some((i) => !i.external && isAdminNavActive(pathname, i.href))
  // Eigene Wahl gilt nur für die aktuelle Seite; nach einem Seitenwechsel öffnet der Block, wenn die Seite darin liegt
  const [manual, setManual] = useState<{ pathname: string; open: boolean } | null>(null)
  const open = manual && manual.pathname === pathname ? manual.open : containsActive
  const triggerId = useId()

  return (
    <Collapsible open={open || iconOnly} onOpenChange={(next) => setManual({ pathname, open: next })} className="group/fold">
      <SidebarGroup className="pt-0">
        {!iconOnly && (
          <CollapsibleTrigger
            id={triggerId}
            data-testid={`nav-fold-${id}`}
            className="flex h-11 w-full items-center justify-between rounded-xl px-3 text-sm font-semibold text-ws-muted transition-colors duration-200 hover:bg-ws-raised hover:text-ws-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ws-green lg:h-9"
          >
            {label}
            <ChevronDown
              className="size-4 transition-transform duration-200 group-data-[state=open]/fold:rotate-180"
              aria-hidden
            />
          </CollapsibleTrigger>
        )}
        <CollapsibleContent>{children}</CollapsibleContent>
      </SidebarGroup>
    </Collapsible>
  )
}

function NavSubGroup({
  id,
  label,
  hint,
  hidden,
  children,
}: {
  id: string
  label?: string
  hint?: string | null
  /** Titel nur für Screenreader (Block trägt ihn schon als Knopf) */
  hidden?: boolean
  children: React.ReactNode
}) {
  const labelId = `${useId()}-${id}`
  return (
    <SidebarGroupContent className="mt-1">
      {label && (
        <SidebarGroupLabel className={hidden ? 'sr-only' : 'text-xs font-semibold uppercase tracking-wider text-ws-faint'}>
          <span id={labelId}>{label}</span>
          {hint && !hidden && (
            <span aria-hidden className="ml-1 font-normal normal-case tracking-normal">
              · {hint}
            </span>
          )}
        </SidebarGroupLabel>
      )}
      <SidebarMenu aria-labelledby={label ? labelId : undefined}>{children}</SidebarMenu>
    </SidebarGroupContent>
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
