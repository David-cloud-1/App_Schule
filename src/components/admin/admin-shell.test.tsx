import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { AdminShell } from './admin-shell'
import { AdminRoleProvider } from './admin-role-provider'
import { mockViewport, testDepartment } from './workspace-test-utils'
import { DepartmentProvider } from '@/components/department-provider'
import type { TeacherRole } from '@/lib/roles'
import type { WorkspaceTheme } from '@/lib/workspace-theme'

const push = vi.fn()
vi.mock('next/navigation', () => ({ usePathname: () => '/admin', useRouter: () => ({ push }) }))
vi.mock('@/components/admin/department-switcher', () => ({
  DepartmentSwitcher: () => <div data-testid="department-switcher" />,
}))
vi.mock('@/lib/supabase-browser', () => ({ createClient: () => ({ auth: { signOut: vi.fn() } }) }))

beforeEach(() => {
  document.cookie = 'ws_theme=; max-age=0; path=/'
  document.cookie = 'sidebar_state=; max-age=0; path=/'
  Element.prototype.scrollIntoView = vi.fn()
  // cmdk misst seine Liste — jsdom kennt keinen ResizeObserver
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver
  push.mockReset()
})

function setup({
  role = 'department_admin',
  width = 1280,
  theme = 'dark',
  sidebarOpen = true,
}: { role?: TeacherRole; width?: number; theme?: WorkspaceTheme; sidebarOpen?: boolean } = {}) {
  mockViewport(width)
  return render(
    <DepartmentProvider value={{ department: testDepartment, examParts: [] }}>
      <AdminRoleProvider
        value={{ role, isSuperAdmin: role === 'admin', displayName: 'Frau Muster', email: 'muster@schule.de' }}
      >
        <AdminShell initialTheme={theme} sidebarOpen={sidebarOpen}>
          <p>Seiteninhalt</p>
        </AdminShell>
      </AdminRoleProvider>
    </DepartmentProvider>,
  )
}

function root(container: HTMLElement) {
  return container.querySelector('.ws-root') as HTMLElement
}

function openAccountMenu() {
  const trigger = screen.getAllByRole('button', { name: /Konto-Menü/ })[0]
  fireEvent.keyDown(trigger, { key: 'Enter' })
  return screen.getByRole('menu')
}

describe('AdminShell – Grundgerüst (PROJ-45)', () => {
  it('zeigt Inhalt, Navigation und einen Link „Zum Inhalt springen“', () => {
    setup()
    expect(screen.getByText('Seiteninhalt')).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'Lehrkräfte-Bereich' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Zum Inhalt springen' })).toHaveAttribute('href', '#ws-main')
    expect(document.getElementById('ws-main')).toContainElement(screen.getByText('Seiteninhalt'))
  })

  it('übernimmt die Darstellung aus dem Cookie des Servers', () => {
    const { container } = setup({ theme: 'light' })
    expect(root(container)).toHaveAttribute('data-ws-theme', 'light')
  })

  it('startet die Seitenleiste eingeklappt, wenn das so gemerkt ist', () => {
    const { container } = setup({ sidebarOpen: false })
    expect(container.querySelector('[data-state="collapsed"]')).toBeInTheDocument()
  })

  it('klappt die Seitenleiste per Button ein und merkt sich das', () => {
    const { container } = setup()
    expect(container.querySelector('[data-state="expanded"]')).toBeInTheDocument()
    fireEvent.click(within(screen.getByRole('banner')).getByRole('button', { name: 'Seitenleiste ein- oder ausklappen' }))
    expect(container.querySelector('[data-state="collapsed"]')).toBeInTheDocument()
    expect(document.cookie).toContain('sidebar_state=false')
  })

  it('zeigt den Bereichs-Umschalter nur Super-Admins', () => {
    const { unmount } = setup()
    expect(screen.queryByTestId('department-switcher')).not.toBeInTheDocument()
    unmount()
    setup({ role: 'admin' })
    expect(screen.getByTestId('department-switcher')).toBeInTheDocument()
  })
})

describe('AdminShell – Handy (PROJ-45)', () => {
  it('öffnet das Menü als Schublade und schließt es nach Auswahl eines Eintrags', () => {
    setup({ width: 390 })
    fireEvent.click(screen.getByRole('button', { name: 'Menü öffnen' }))
    const drawer = screen.getByRole('dialog')
    expect(within(drawer).getByRole('navigation', { name: 'Lehrkräfte-Bereich' })).toBeInTheDocument()
    fireEvent.click(within(drawer).getByRole('link', { name: 'Fragen' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('schließt die Schublade per Wischgeste zur Seite', () => {
    setup({ width: 390 })
    fireEvent.click(screen.getByRole('button', { name: 'Menü öffnen' }))
    const drawer = screen.getByRole('dialog')
    fireEvent.touchStart(drawer, { touches: [{ clientX: 250, clientY: 300 }], changedTouches: [{ clientX: 250, clientY: 300 }] })
    fireEvent.touchEnd(drawer, { touches: [], changedTouches: [{ clientX: 100, clientY: 300 }] })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('zeigt den Seitentitel in der Kopfzeile', () => {
    setup({ width: 390 })
    expect(within(screen.getByRole('banner')).getAllByText('Übersicht').length).toBeGreaterThan(0)
  })
})

describe('Konto-Menü (PROJ-45)', () => {
  it('zeigt Name, E-Mail und Rolle in Klartext mit allen Einträgen', () => {
    setup()
    const menu = openAccountMenu()
    expect(within(menu).getByText('muster@schule.de')).toBeInTheDocument()
    expect(within(menu).getByText('Bereichs-Admin Spedition')).toBeInTheDocument()
    expect(within(menu).getByRole('menuitem', { name: /Profil/ })).toHaveAttribute('href', '/profile')
    expect(within(menu).getByRole('menuitem', { name: /Zur Lern-App/ })).toHaveAttribute('href', '/')
    expect(within(menu).getByRole('menuitem', { name: /Abmelden/ })).toBeInTheDocument()
    expect(within(menu).getAllByRole('menuitemradio').map((i) => i.textContent)).toEqual([
      'Dunkel',
      'Hell',
      'Wie System',
    ])
  })

  it('wechselt die Darstellung sofort und merkt sie im Cookie', () => {
    const { container } = setup()
    const menu = openAccountMenu()
    fireEvent.click(within(menu).getByRole('menuitemradio', { name: 'Hell' }))
    expect(root(container)).toHaveAttribute('data-ws-theme', 'light')
    expect(document.cookie).toContain('ws_theme=light')
  })

  it('nennt Lehrkräfte und Super-Admins mit ihrer Rolle', () => {
    const { unmount } = setup({ role: 'teacher' })
    expect(within(openAccountMenu()).getByText('Lehrkraft')).toBeInTheDocument()
    unmount()
    setup({ role: 'admin' })
    expect(within(openAccountMenu()).getByText('Super-Admin')).toBeInTheDocument()
  })
})

describe('Schnellsuche (PROJ-45)', () => {
  async function openPalette() {
    fireEvent.keyDown(window, { key: 'k', metaKey: true })
    return within(await screen.findByRole('dialog', { name: 'Schnellsuche' }))
  }

  it('öffnet mit ⌘K und zeigt Seiten und Aktionen', async () => {
    setup()
    const palette = await openPalette()
    expect(palette.getByRole('option', { name: /Leistungsnachweise/ })).toBeInTheDocument()
    expect(palette.getByRole('option', { name: /Neuer Leistungsnachweis/ })).toBeInTheDocument()
    expect(palette.getByRole('option', { name: /Werkzeugkiste öffnen/ })).toBeInTheDocument()
    expect(palette.getByRole('option', { name: /Zur Lern-App/ })).toBeInTheDocument()
    expect(palette.getByRole('option', { name: /Darstellung: Hell/ })).toBeInTheDocument()
  })

  it('öffnet auch mit Strg+K und über das Such-Symbol', async () => {
    setup()
    fireEvent.keyDown(window, { key: 'k', ctrlKey: true })
    expect(await screen.findByRole('dialog', { name: 'Schnellsuche' })).toBeInTheDocument()
    fireEvent.keyDown(window, { key: 'k', ctrlKey: true })
    expect(screen.queryByRole('dialog', { name: 'Schnellsuche' })).not.toBeInTheDocument()
    fireEvent.click(screen.getAllByRole('button', { name: /Schnellsuche öffnen|Suchen/ })[0])
    expect(await screen.findByRole('dialog', { name: 'Schnellsuche' })).toBeInTheDocument()
  })

  it('zeigt einer Lehrkraft nur, wofür sie Rechte hat', async () => {
    setup({ role: 'teacher' })
    const palette = await openPalette()
    // PROJ-48: Fragen/Fächer/Themen/Prüfungssimulation/Meine Fächer/Papierkorb
    // sind jetzt auch für Lehrkräfte sichtbar — welche Inhalte sie darin
    // sieht, entscheidet ihre Fach-Zuständigkeit.
    expect(palette.getByRole('option', { name: /^Fragen$/ })).toBeInTheDocument()
    expect(palette.queryByRole('option', { name: /Fachbereiche/ })).not.toBeInTheDocument()
    expect(palette.getByRole('option', { name: /Werkzeugkiste öffnen/ })).toBeInTheDocument()
    // PROJ-46: eigene Leistungsnachweise anlegen und einsehen
    expect(palette.getByRole('option', { name: 'Leistungsnachweise' })).toBeInTheDocument()
    expect(palette.getByRole('option', { name: /Neuer Leistungsnachweis/ })).toBeInTheDocument()
  })

  it('springt per Enter zur gewählten Seite und schließt sich', async () => {
    setup()
    const palette = await openPalette()
    const input = palette.getByRole('combobox')
    fireEvent.change(input, { target: { value: 'Änderungsprotokoll' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(push).toHaveBeenCalledWith('/admin/audit-log')
    expect(screen.queryByRole('dialog', { name: 'Schnellsuche' })).not.toBeInTheDocument()
  })

  it('wechselt über eine Aktion die Darstellung', async () => {
    const { container } = setup()
    const palette = await openPalette()
    fireEvent.click(palette.getByRole('option', { name: /Darstellung: Wie System/ }))
    expect(root(container)).toHaveAttribute('data-ws-theme', 'system')
  })
})
