'use client'

import { createContext, useContext } from 'react'
import type { TeacherRole } from '@/lib/roles'

/**
 * Rolle der eingeloggten Person im Lehrkräfte-Bereich (PROJ-24/44) — einmal im
 * Admin-Grundlayout auf dem Server geladen und hier bereitgestellt, damit
 * Bildschirme wissen, welche Einträge und Aktionen sie zeigen dürfen.
 */
export interface AdminRoleContextValue {
  role: TeacherRole
  isSuperAdmin: boolean
  /** Anzeigename bzw. E-Mail für die Begrüßung auf der Startseite (PROJ-40) */
  displayName?: string
  /** E-Mail fürs Konto-Menü (PROJ-45) */
  email?: string
  /** Einmaliger Willkommens-Hinweis für frisch freigeschaltete Lehrkräfte (PROJ-44) */
  showTeacherWelcome?: boolean
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
