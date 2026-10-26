'use client'

import { useEffect } from 'react'
import { useOptionalWorkspace } from '@/components/admin/workspace-provider'

/**
 * Einheitlicher Seitenkopf im Lehrkräfte-Bereich (PROJ-45): Titel, optional
 * ein Satz Beschreibung, rechts höchstens eine hervorgehobene Hauptaktion
 * (weitere Aktionen als ruhige Buttons daneben).
 *
 * `breadcrumb` setzt auf Detailseiten das letzte Glied der Brotkrumen
 * (z. B. den Titel des Nachweises) — sonst nicht angeben.
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
        {children && <div className="mt-3">{children}</div>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2 print:hidden">{actions}</div>}
    </div>
  )
}
