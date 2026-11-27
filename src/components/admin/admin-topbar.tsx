'use client'

import { Fragment } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, PanelLeft, Search } from 'lucide-react'
import { useWorkspace } from '@/components/admin/workspace-provider'
import { AdminAccountMenu } from '@/components/admin/admin-account-menu'
import { useSidebar } from '@/components/ui/sidebar'
import { useIsApplePlatform } from '@/hooks/use-is-apple-platform'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import {
  ADMIN_ACCOUNT_HREF,
  ADMIN_ACCOUNT_LABEL,
  ADMIN_HOME_HREF,
  ADMIN_HOME_LABEL,
  MY_SUBJECTS_HREF,
  MY_SUBJECTS_LABEL,
  adminNavMatch,
} from '@/lib/admin-nav'

interface Crumb {
  label: string
  href?: string
}

/**
 * Brotkrumen aus Pfad + Navigations-Liste; Detailseiten liefern den letzten Teil
 * selbst. Glieder ohne Adresse in der Mitte (Name einer aufklappbaren Gruppe)
 * sind reiner Text.
 */
export function adminCrumbs(pathname: string, detail: string | null): Crumb[] {
  const home: Crumb = { label: ADMIN_HOME_LABEL, href: ADMIN_HOME_HREF }
  if (pathname === ADMIN_HOME_HREF) return [{ label: ADMIN_HOME_LABEL }]
  if (pathname === ADMIN_ACCOUNT_HREF) return [home, { label: ADMIN_ACCOUNT_LABEL }]
  if (pathname === MY_SUBJECTS_HREF) {
    return [home, { label: ADMIN_ACCOUNT_LABEL, href: ADMIN_ACCOUNT_HREF }, { label: MY_SUBJECTS_LABEL }]
  }
  const match = adminNavMatch(pathname)
  if (!match) return [home]
  const page = match.subPage ?? match.item
  const parents: Crumb[] = [
    home,
    ...(match.group.collapsible ? [{ label: match.group.label }] : []),
    ...(match.subPage ? [{ label: match.item.label, href: match.item.href }] : []),
  ]
  if (pathname === page.href) return [...parents, { label: page.label }]
  return [...parents, { label: page.label, href: page.href }, ...(detail ? [{ label: detail }] : [])]
}

/** Titel der Handy-Kopfzeile: „Übersicht“ allein sagt nichts, dort steht der Gruppenname */
export function adminPageTitle(crumbs: Crumb[]): string {
  const last = crumbs[crumbs.length - 1].label
  return last === 'Übersicht' && crumbs.length > 1 ? crumbs[crumbs.length - 2].label : last
}

const iconButton =
  'flex size-11 shrink-0 items-center justify-center rounded-xl text-ws-muted transition-all duration-200 hover:bg-ws-raised hover:text-ws-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ws-green active:scale-95'

/**
 * Kopfzeile des Lehrkräfte-Bereichs (PROJ-45).
 * Handy: Menü · Seitentitel · Suche · Konto. Desktop: Einklappen · Brotkrumen · Suchfeld.
 */
export function AdminTopbar() {
  const pathname = usePathname()
  const { detailCrumb, setCommandOpen } = useWorkspace()
  const { toggleSidebar, isMobile } = useSidebar()
  const isApple = useIsApplePlatform()
  const mod = isApple ? '⌘' : 'Strg+'
  const crumbs = adminCrumbs(pathname, detailCrumb)
  const pageTitle = adminPageTitle(crumbs)

  return (
    <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center gap-2 border-b border-ws-line bg-ws-bg/90 px-2 backdrop-blur supports-[backdrop-filter]:bg-ws-bg/75 sm:px-4 print:hidden">
      <button
        type="button"
        onClick={toggleSidebar}
        aria-label={isMobile ? 'Menü öffnen' : 'Seitenleiste ein- oder ausklappen'}
        title={isMobile ? undefined : `Seitenleiste ein- oder ausklappen (${mod}B)`}
        className={iconButton}
      >
        <Menu className="size-6 lg:hidden" />
        <PanelLeft className="hidden size-5 lg:block" />
      </button>

      {/* Handy: nur der Seitentitel */}
      <p className="min-w-0 flex-1 truncate text-base font-semibold text-ws-text lg:hidden" title={pageTitle}>
        {pageTitle}
      </p>

      {/* Desktop: Brotkrumen */}
      <Breadcrumb className="hidden min-w-0 flex-1 lg:block">
        <BreadcrumbList className="flex-nowrap text-ws-muted">
          {crumbs.map((crumb, i) => (
            <Fragment key={`${crumb.label}-${i}`}>
              {i > 0 && <BreadcrumbSeparator className="text-ws-faint" />}
              <BreadcrumbItem className="min-w-0">
                {crumb.href ? (
                  <BreadcrumbLink asChild className="truncate hover:text-ws-text">
                    <Link href={crumb.href} title={crumb.label}>
                      {crumb.label}
                    </Link>
                  </BreadcrumbLink>
                ) : i < crumbs.length - 1 ? (
                  <span className="truncate" title={crumb.label}>
                    {crumb.label}
                  </span>
                ) : (
                  <BreadcrumbPage className="max-w-[40ch] truncate font-semibold text-ws-text" title={crumb.label}>
                    {crumb.label}
                  </BreadcrumbPage>
                )}
              </BreadcrumbItem>
            </Fragment>
          ))}
        </BreadcrumbList>
      </Breadcrumb>

      <button
        type="button"
        onClick={() => setCommandOpen(true)}
        aria-label="Schnellsuche öffnen"
        aria-keyshortcuts="Meta+K Control+K"
        className={`${iconButton} lg:hidden`}
      >
        <Search className="size-5" />
      </button>
      <button
        type="button"
        onClick={() => setCommandOpen(true)}
        aria-keyshortcuts="Meta+K Control+K"
        title={`Schnellsuche (${mod}K)`}
        className="hidden h-11 w-64 shrink-0 items-center gap-2 rounded-xl border border-ws-line bg-ws-surface px-3 text-ws-muted transition-colors duration-200 hover:border-ws-faint hover:text-ws-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ws-green lg:flex"
      >
        <Search className="size-5" />
        <span className="flex-1 text-left">Suchen</span>
      </button>

      <div className="lg:hidden">
        <AdminAccountMenu variant="avatar" />
      </div>
    </header>
  )
}
