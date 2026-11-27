'use client'

import { Fragment, useState, useSyncExternalStore } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronDown, ExternalLink, LayoutDashboard, type LucideIcon } from 'lucide-react'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { useAdminRole } from '@/components/admin/admin-role-provider'
import { SidebarGroup, SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from '@/components/ui/sidebar'
import { useForumNavCounts } from '@/components/admin/use-forum-nav-counts'
import { formatForumBadge } from '@/lib/forum'
import { assessmentNavCount, formatTaskBadge } from '@/lib/teacher-tasks'
import { useTaskCounts } from '@/components/admin/use-task-counts'
import {
  ADMIN_HOME_HREF,
  ADMIN_HOME_LABEL,
  type AdminNavGroup,
  type AdminNavItem,
  LEHRERZIMMER_HREF,
  CONTENT_HREF,
  adminNavGroupsFor,
  isAdminNavActive,
} from '@/lib/admin-nav'

/**
 * Navigation des Lehrkräfte-Bereichs (PROJ-40/45, neu geordnet in PROJ-130) —
 * dieselbe Liste in der Seitenleiste (Desktop, einklappbar) und in der
 * Schublade (Handy).
 *
 * Alle Hauptpunkte sind sichtbar. „Verwaltung“ ist aufklappbar und öffnet sich,
 * wenn die aktuelle Seite darin liegt. Eingeklappt
 * (nur Icons) zeigt die Leiste alles und jedes Icon seinen Namen als Tooltip.
 */
export function AdminNav({ onNavigate }: { onNavigate?: () => void }) {
  const { role } = useAdminRole()
  const { isMobile, setOpenMobile } = useSidebar()
  const pathname = usePathname()
  const groups = adminNavGroupsFor(role)
  // PROJ-63: Hinweise fürs Lehrerzimmer; wird bei jedem Seitenwechsel neu geholt
  const forumCounts = useForumNavCounts(pathname)
  // PROJ-81: offene Aufgaben als Zähler an „Leistungsnachweise“ und „Gemeldete Fragen“
  const { counts: taskCounts } = useTaskCounts(pathname)

  function handleNavigate() {
    if (isMobile) setOpenMobile(false)
    onNavigate?.()
  }

  function countFor(item: AdminNavItem): number | undefined {
    // PROJ-131: die Zahl der Meldungen steht am Menüpunkt „Lerninhalte“ (Reiter „Gemeldet“)
    if (item.href === CONTENT_HREF) return taskCounts.openReports ?? 0
    if (item.href === '/admin/leistungsnachweise') return assessmentNavCount(taskCounts)
    return undefined
  }

  function renderLink(item: AdminNavItem, group: AdminNavGroup) {
    return (
      <SidebarMenuItem key={item.href}>
        <NavLink
          href={item.href}
          label={item.label}
          icon={item.icon}
          external={item.external}
          hint={item.hint}
          tag={group.id === 'verwaltung' && item.superAdminOnly ? 'Super-Admin' : undefined}
          badge={item.href === LEHRERZIMMER_HREF ? forumCounts : undefined}
          count={countFor(item)}
          indented={!!group.collapsible}
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
              label={ADMIN_HOME_LABEL}
              icon={LayoutDashboard}
              active={isAdminNavActive(pathname, ADMIN_HOME_HREF)}
              onNavigate={handleNavigate}
            />
          </SidebarMenuItem>
          {groups.map((group) => {
            if (!group.collapsible) {
              return <Fragment key={group.id}>{group.items.map((item) => renderLink(item, group))}</Fragment>
            }
            return (
              <Fragment key={group.id}>
                {group.id === 'verwaltung' && <li role="separator" className="mx-3 my-2 h-px bg-ws-line" />}
                <NavFold
                  id={group.id}
                  label={group.label}
                  icon={group.collapsible.icon}
                  containsActive={group.items.some((i) => isAdminNavActive(pathname, i.href))}
                  // Zugeklappt darf kein Zähler verschwinden
                  count={group.items.reduce((sum, item) => sum + (countFor(item) ?? 0), 0)}
                  pathname={pathname}
                >
                  {group.items.map((item) => renderLink(item, group))}
                </NavFold>
              </Fragment>
            )
          })}
        </SidebarMenu>
      </SidebarGroup>
    </nav>
  )
}

const subscribeNothing = () => () => {}

const foldKey = (id: string) => `ws_nav_offen_${id}`

function readFold(id: string): boolean {
  try {
    return window.sessionStorage.getItem(foldKey(id)) === '1'
  } catch {
    return false
  }
}

/**
 * Aufklappbarer Menüpunkt mit Unterpunkten. Er ist offen, wenn die aktuelle
 * Seite darin liegt oder man ihn selbst geöffnet hat (gilt für die Sitzung,
 * auch im Handy-Menü), und immer, solange die Leiste nur Icons zeigt.
 */
function NavFold({
  id,
  label,
  icon: Icon,
  containsActive,
  count,
  pathname,
  children,
}: {
  id: string
  label: string
  icon: LucideIcon
  containsActive: boolean
  count: number
  pathname: string
  children: React.ReactNode
}) {
  const { state, isMobile } = useSidebar()
  const iconOnly = state === 'collapsed' && !isMobile
  // Gemerkte Wahl der Sitzung; der Server (und das erste Bild) kennt sie nicht
  const storedOpen = useSyncExternalStore(subscribeNothing, () => readFold(id), () => false)
  const [choice, setChoice] = useState<boolean | null>(null)
  const chosenOpen = choice ?? storedOpen
  // Von Hand zugeklappt, obwohl die aktuelle Seite darin liegt — gilt nur für diese Seite
  const [closedOn, setClosedOn] = useState<string | null>(null)

  const open = containsActive ? closedOn !== pathname : chosenOpen

  function toggle(next: boolean) {
    setChoice(next)
    setClosedOn(next ? null : pathname)
    try {
      window.sessionStorage.setItem(foldKey(id), next ? '1' : '0')
    } catch {
      // Ohne Speicher gilt die Wahl nur, solange das Menü offen ist
    }
  }

  const countText = !open ? formatTaskBadge(count) : null

  return (
    <SidebarMenuItem>
      <Collapsible open={open || iconOnly} onOpenChange={toggle} className="group/fold">
        {!iconOnly && (
          <CollapsibleTrigger asChild>
            <SidebarMenuButton
              data-testid={`nav-fold-${id}`}
              className={`${navButtonClass} ${containsActive && !open ? 'text-ws-text' : ''}`}
            >
              <Icon className="!size-5" />
              <span>{label}</span>
              {countText && (
                <span className={`ml-auto ${countBadgeClass}`} title={`${count} offen`}>
                  <span aria-hidden>{countText}</span>
                  <span className="sr-only">{count} offen</span>
                </span>
              )}
              <ChevronDown
                className={`${countText ? '' : 'ml-auto '}!size-4 transition-transform duration-200 group-data-[state=open]/fold:rotate-180`}
                aria-hidden
              />
            </SidebarMenuButton>
          </CollapsibleTrigger>
        )}
        <CollapsibleContent>
          <SidebarMenu aria-label={label} className="mt-1">
            {children}
          </SidebarMenu>
        </CollapsibleContent>
      </Collapsible>
    </SidebarMenuItem>
  )
}

const navButtonClass =
  'h-11 gap-3 rounded-xl px-3 font-semibold text-ws-muted transition-colors duration-200 hover:bg-ws-raised hover:text-ws-text focus-visible:ring-ws-green data-[active=true]:bg-ws-green/15 data-[active=true]:text-ws-green lg:h-9'

const countBadgeClass =
  'inline-flex h-5 min-w-5 items-center justify-center rounded-full border border-ws-orange/30 bg-ws-orange/15 px-1.5 text-xs font-bold text-ws-orange group-data-[collapsible=icon]:hidden'

function NavLink({
  href,
  label,
  icon: Icon,
  active,
  external,
  badge,
  count,
  hint,
  tag,
  indented,
  onNavigate,
}: {
  href: string
  label: string
  icon: LucideIcon
  active: boolean
  external?: boolean
  /** Zähler am Eintrag (PROJ-63): neue Hinweise grün, offene Meldungen orange */
  badge?: { hints: number; reports: number }
  /** Zähler offener Aufgaben (PROJ-81), orange */
  count?: number
  /** Kurzer Zusatz rechts, z. B. „mit Note“ (PROJ-130) */
  hint?: string
  /** Kennzeichen, z. B. „Super-Admin“ */
  tag?: string
  /** Unterpunkt einer aufklappbaren Gruppe */
  indented?: boolean
  onNavigate: () => void
}) {
  const countText = formatTaskBadge(count)
  const hintsText = badge ? formatForumBadge(badge.hints) : null
  const reportsText = badge ? formatForumBadge(badge.reports) : null
  const content = (
    <>
      <span className="relative flex">
        <Icon className="!size-5" />
        {/* Eingeklappt (nur Icons) zeigt ein Punkt, dass es etwas Neues gibt */}
        {(hintsText || reportsText || countText) && (
          <span
            aria-hidden
            className={`absolute -right-1 -top-1 hidden size-2.5 rounded-full group-data-[collapsible=icon]:block ${hintsText ? 'bg-ws-green' : 'bg-ws-orange'}`}
          />
        )}
      </span>
      {/* Zusatz als zweite Zeile: bleibt auch neben einem Zähler stehen */}
      {hint ? (
        <span className="grid min-w-0 text-left leading-tight group-data-[collapsible=icon]:hidden">
          <span className="truncate">{label}</span>
          <span className="truncate text-xs font-medium text-ws-faint">{hint}</span>
        </span>
      ) : (
        <span>{label}</span>
      )}
      {tag && (
        <span className="ml-auto shrink-0 rounded-full border border-ws-line px-1.5 text-[0.65rem] font-semibold text-ws-faint group-data-[collapsible=icon]:hidden">
          {tag}
        </span>
      )}
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
      {countText && (
        <span className={`ml-auto ${countBadgeClass}`} title={`${count} offen`}>
          <span aria-hidden>{countText}</span>
          <span className="sr-only">{count} offen</span>
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
      className={`${navButtonClass} ${hint ? '!h-auto min-h-11 py-1.5 group-data-[collapsible=icon]:!min-h-0 group-data-[collapsible=icon]:!h-8' : ''} ${indented ? 'pl-6 font-medium group-data-[collapsible=icon]:!pl-2' : ''}`}
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
