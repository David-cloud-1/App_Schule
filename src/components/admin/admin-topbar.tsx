'use client'

import { Fragment } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Gamepad2, Menu, PanelLeft, Search } from 'lucide-react'
import { useAdminRole } from '@/components/admin/admin-role-provider'
import { useWorkspace } from '@/components/admin/workspace-provider'
import { AdminAccountMenu } from '@/components/admin/admin-account-menu'
import { DepartmentSwitcher } from '@/components/admin/department-switcher'
import { useDepartment } from '@/components/department-provider'
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
import { ADMIN_HOME_HREF, adminNavLabel, adminNavMatch } from '@/lib/admin-nav'

interface Crumb {
  label: string
  href?: string
}

/** Brotkrumen aus Pfad + Navigations-Liste; Detailseiten liefern den letzten Teil selbst */
export function adminCrumbs(pathname: string, hofShortName: string, detail: string | null): Crumb[] {
  const crumbs: Crumb[] = [{ label: 'Übersicht', href: ADMIN_HOME_HREF }]
  const match = adminNavMatch(pathname)
  if (!match) return pathname === ADMIN_HOME_HREF ? [{ label: 'Übersicht' }] : crumbs
  const label = adminNavLabel(match.item, hofShortName)
  const isDetail = pathname !== match.item.href
  if (!isDetail) return [...crumbs, { label }]
  return [...crumbs, { label, href: match.item.href }, ...(detail ? [{ label: detail }] : [])]
}

const iconButton =
  'flex size-11 shrink-0 items-center justify-center rounded-xl text-ws-muted transition-all duration-200 hover:bg-ws-raised hover:text-ws-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ws-green active:scale-95'

/**
 * Kopfzeile des Lehrkräfte-Bereichs (PROJ-45).
 * Handy: Menü · Seitentitel · Suche · Konto. Desktop: Einklappen · Brotkrumen · Suchfeld · Bereichs-Umschalter.
 */
export function AdminTopbar() {
  const pathname = usePathname()
  const { isSuperAdmin } = useAdminRole()
  const { hofShortName } = useDepartment()
  const { detailCrumb, setCommandOpen } = useWorkspace()
  const { toggleSidebar, isMobile } = useSidebar()
  const isApple = useIsApplePlatform()
  const mod = isApple ? '⌘' : 'Strg+'
  const crumbs = adminCrumbs(pathname, hofShortName, detailCrumb)
  const pageTitle = crumbs[crumbs.length - 1].label

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
        className="hidden h-10 w-56 shrink-0 items-center gap-2 rounded-xl border border-ws-line bg-ws-surface px-3 text-sm text-ws-faint transition-colors duration-200 hover:border-ws-faint hover:text-ws-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ws-green lg:flex"
      >
        <Search className="size-4" />
        <span className="flex-1 text-left">Suchen …</span>
        <kbd className="rounded-md border border-ws-line bg-ws-raised px-1.5 py-0.5 text-[11px] font-semibold text-ws-muted">
          {isApple ? '⌘K' : 'Strg K'}
        </kbd>
      </button>

      <Link
        href="/"
        aria-label="Zur Lern-App"
        title="Zur Lern-App"
        className="flex h-11 shrink-0 items-center gap-2 rounded-xl border border-ws-green/30 bg-ws-green/15 px-3 text-ws-green transition-all duration-200 hover:bg-ws-green/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ws-green active:scale-95"
      >
        <Gamepad2 className="size-5" />
        <span className="hidden text-sm font-semibold sm:inline">Zur Lern-App</span>
      </Link>

      {isSuperAdmin && (
        <div className="hidden sm:block">
          <DepartmentSwitcher />
        </div>
      )}

      <div className="lg:hidden">
        <AdminAccountMenu variant="avatar" />
      </div>
    </header>
  )
}
