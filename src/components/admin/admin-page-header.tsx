'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { useOptionalAdminRole } from '@/components/admin/admin-role-provider'
import { AdminScopeBar, type ScopeBarMode } from '@/components/admin/admin-scope-bar'
import { useOptionalWorkspace } from '@/components/admin/workspace-provider'
import { adminNavMatch } from '@/lib/admin-nav'

/**
 * Welche Bereichsleiste gehört auf diese Seite? Inhalts-Seiten (Gruppe
 * „Inhalte“) und Listen mit Schülerdaten bzw. Nachweisen (nur die Liste,
 * nicht ihre Detailseiten). Sonst keine.
 */
function scopeBarModeFor(pathname: string): ScopeBarMode | null {
  const path = pathname.replace(/\/+$/, '')
  if (path === '/admin/users' || path === '/admin/audit-log') return 'people'
  if (path === '/admin/leistungsnachweise') return 'assessments'
  return adminNavMatch(path)?.group.id === 'inhalte' ? 'content' : null
}

/**
 * Einheitlicher Seitenkopf im Lehrkräfte-Bereich (PROJ-45): Titel, optional
 * ein Satz Beschreibung, rechts höchstens eine hervorgehobene Hauptaktion
 * (weitere Aktionen als ruhige Buttons daneben).
 *
 * `breadcrumb` setzt auf Detailseiten das letzte Glied der Brotkrumen
 * (z. B. den Titel des Nachweises) — sonst nicht angeben.
 *
 * Auf den Inhalts-Seiten (Gruppe „Inhalte“), bei Nutzern, Leistungsnachweisen
 * und im Änderungsprotokoll steht unter dem Titel automatisch die Bereichsleiste (PROJ-70, löst die Umfangszeile aus PROJ-49 ab).
 */
export function AdminPageHeader({
  title,
  description,
  actions,
  breadcrumb,
  children,
}: {
  title: React.ReactNode
  description?: React.ReactNode
  actions?: React.ReactNode
  breadcrumb?: string | null
  /** Zusätzliche Zeile unter der Beschreibung, z. B. Kennzahlen oder Status-Badges */
  children?: React.ReactNode
}) {
  const workspace = useOptionalWorkspace()
  const setDetailCrumb = workspace?.setDetailCrumb
  const pathname = usePathname()
  const scopeMode = useOptionalAdminRole() ? scopeBarModeFor(pathname ?? '') : null

  useEffect(() => {
    if (!setDetailCrumb || breadcrumb === undefined) return
    setDetailCrumb(breadcrumb)
    return () => setDetailCrumb(null)
  }, [breadcrumb, setDetailCrumb])

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <h1 className="break-words text-2xl font-bold tracking-tight text-ws-text">{title}</h1>
        {description && <p className="mt-1 max-w-prose text-sm text-ws-muted">{description}</p>}
        {scopeMode && (
          <div className="mt-1">
            <AdminScopeBar mode={scopeMode} />
          </div>
        )}
        {children && <div className="mt-3">{children}</div>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2 print:hidden">{actions}</div>}
    </div>
  )
}
