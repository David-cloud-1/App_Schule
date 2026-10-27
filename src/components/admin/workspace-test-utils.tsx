import { vi } from 'vitest'
import { act, render } from '@testing-library/react'
import type { ReactNode } from 'react'
import { AdminRoleProvider } from './admin-role-provider'
import { WorkspaceProvider } from './workspace-provider'
import { DepartmentProvider } from '@/components/department-provider'
import { SidebarProvider } from '@/components/ui/sidebar'
import type { DepartmentBranding } from '@/lib/departments'
import type { TeacherRole } from '@/lib/roles'
import type { WorkspaceTheme } from '@/lib/workspace-theme'

/**
 * Test-Helfer für den Lehrkräfte-Rahmen (PROJ-45): matchMedia-Attrappe für
 * Handy/Desktop und ein Render mit allen Providern.
 */

let listeners: Array<() => void> = []

/** Setzt die Fensterbreite für useIsMobile (1024 px = Umschaltpunkt) */
export function mockViewport(width: number) {
  listeners = []
  Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: width })
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: query.includes('max-width') ? width < 1024 : width >= 1024,
    media: query,
    addEventListener: (_: string, l: () => void) => listeners.push(l),
    removeEventListener: (_: string, l: () => void) => {
      listeners = listeners.filter((x) => x !== l)
    },
  }))
}

/** Simuliert das Ändern der Fensterbreite */
export function resizeViewport(width: number) {
  act(() => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: width })
    listeners.forEach((l) => l())
  })
}

export const testDepartment = { hofShortName: 'Hof', name: 'Spedition' } as DepartmentBranding

export function renderInWorkspace(
  ui: ReactNode,
  {
    role = 'department_admin',
    theme = 'dark',
    withSidebar = true,
    showTeacherWelcome,
    hasSubjectAssignments,
  }: {
    role?: TeacherRole
    theme?: WorkspaceTheme
    withSidebar?: boolean
    showTeacherWelcome?: boolean
    hasSubjectAssignments?: boolean
  } = {},
) {
  const content = withSidebar ? <SidebarProvider>{ui}</SidebarProvider> : ui
  return render(
    <DepartmentProvider value={{ department: testDepartment, examParts: [] }}>
      <AdminRoleProvider
        value={{
          role,
          isSuperAdmin: role === 'admin',
          displayName: 'Frau Muster',
          email: 'muster@schule.de',
          showTeacherWelcome,
          hasSubjectAssignments,
        }}
      >
        <WorkspaceProvider initialTheme={theme}>{content}</WorkspaceProvider>
      </AdminRoleProvider>
    </DepartmentProvider>,
  )
}
