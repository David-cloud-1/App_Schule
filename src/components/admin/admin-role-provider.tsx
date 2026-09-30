'use client'

import { createContext, useContext } from 'react'

/**
 * Rolle der eingeloggten Admin-Person im Admin-Panel (PROJ-24) — einmal im
 * Admin-Grundlayout auf dem Server geladen und hier bereitgestellt, damit
 * Bildschirme wissen, ob sie Super-Admin-only-Aktionen zeigen dürfen.
 */
export interface AdminRoleContextValue {
  role: 'admin' | 'department_admin'
  isSuperAdmin: boolean
}

const AdminRoleContext = createContext<AdminRoleContextValue | null>(null)

export function AdminRoleProvider({
  value,
  children,
}: {
  value: AdminRoleContextValue
  children: React.ReactNode
}) {
  return <AdminRoleContext.Provider value={value}>{children}</AdminRoleContext.Provider>
}

export function useAdminRole(): AdminRoleContextValue {
  const ctx = useContext(AdminRoleContext)
  if (!ctx) throw new Error('useAdminRole() außerhalb von <AdminRoleProvider>')
  return ctx
}
