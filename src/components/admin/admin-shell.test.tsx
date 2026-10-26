import { describe, it, expect, vi, beforeEach } from 'vitest'
import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { AdminShell } from './admin-shell'
import { AdminRoleProvider } from './admin-role-provider'
import { DepartmentProvider } from '@/components/department-provider'
import type { DepartmentBranding } from '@/lib/departments'

vi.mock('next/navigation', () => ({ usePathname: () => '/admin' }))
vi.mock('@/components/admin/department-switcher', () => ({
  DepartmentSwitcher: () => <div data-testid="department-switcher" />,
}))
vi.mock('@/components/app-brand', () => ({
  BrandIcon: () => <span />,
  BrandName: () => <>SpediLern</>,
}))

const department = { hofShortName: 'Hof' } as DepartmentBranding

// matchMedia-Attrappe: `triggerDesktop()` simuliert das Vergrößern auf ≥ 1024 px
let mediaListeners: Array<(e: MediaQueryListEvent) => void> = []
function triggerDesktop() {
  act(() => mediaListeners.forEach((l) => l({ matches: true } as MediaQueryListEvent)))
}

beforeEach(() => {
  mediaListeners = []
  window.matchMedia = vi.fn().mockImplementation(() => ({
    matches: false,
    addEventListener: (_: string, l: (e: MediaQueryListEvent) => void) => mediaListeners.push(l),
    removeEventListener: (_: string, l: (e: MediaQueryListEvent) => void) => {
      mediaListeners = mediaListeners.filter((x) => x !== l)
    },
  }))
})

function setup(isSuperAdmin: boolean) {
  return render(
    <DepartmentProvider value={{ department, examParts: [] }}>
      <AdminRoleProvider value={{ role: isSuperAdmin ? 'admin' : 'department_admin', isSuperAdmin }}>
        <AdminShell displayName="Frau Muster" isSuperAdmin={isSuperAdmin}>
          <p>Seiteninhalt</p>
        </AdminShell>
      </AdminRoleProvider>
    </DepartmentProvider>,
  )
}

describe('AdminShell (PROJ-40)', () => {
  it('zeigt den Seiteninhalt und die Navigation in der Seitenleiste', () => {
    setup(false)
    expect(screen.getByText('Seiteninhalt')).toBeInTheDocument()
    expect(screen.getAllByRole('navigation', { name: 'Lehrkräfte-Bereich' })).toHaveLength(1)
  })

  it('öffnet das Menü per Button und schließt es nach Auswahl eines Eintrags', () => {
    setup(false)
    fireEvent.click(screen.getByRole('button', { name: 'Menü öffnen' }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(within(screen.getByRole('dialog')).getByRole('navigation', { name: 'Lehrkräfte-Bereich' })).toBeInTheDocument()

    const menuLinks = screen.getByRole('dialog').querySelectorAll('a')
    const fragen = Array.from(menuLinks).find((a) => a.textContent === 'Fragen')!
    fireEvent.click(fragen)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('schließt ein offenes Menü, sobald das Fenster auf Desktop-Breite wächst', () => {
    setup(false)
    fireEvent.click(screen.getByRole('button', { name: 'Menü öffnen' }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    triggerDesktop()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('zeigt den Bereichs-Umschalter nur Super-Admins', () => {
    const { unmount } = setup(false)
    expect(screen.queryByTestId('department-switcher')).not.toBeInTheDocument()
    unmount()
    setup(true)
    expect(screen.getByTestId('department-switcher')).toBeInTheDocument()
  })

  it('bietet in der Kopfzeile den Wechsel „Zur Lern-App“ (PROJ-44)', () => {
    setup(false)
    expect(screen.getByRole('link', { name: 'Zur Lern-App' })).toHaveAttribute('href', '/')
  })
})
