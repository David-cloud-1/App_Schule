import { describe, it, expect, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { AdminNav } from './admin-nav'
import { AdminHome } from './admin-home'
import { AdminRoleProvider } from './admin-role-provider'
import { DepartmentProvider } from '@/components/department-provider'
import type { DepartmentBranding } from '@/lib/departments'

let mockPath = '/admin'
vi.mock('next/navigation', () => ({ usePathname: () => mockPath }))

const department = { hofShortName: 'Hof' } as DepartmentBranding

function wrap(ui: ReactNode, isSuperAdmin: boolean) {
  return render(
    <DepartmentProvider value={{ department, examParts: [] }}>
      <AdminRoleProvider
        value={{ role: isSuperAdmin ? 'admin' : 'department_admin', isSuperAdmin, displayName: 'Frau Muster' }}
      >
        {ui}
      </AdminRoleProvider>
    </DepartmentProvider>,
  )
}

describe('AdminNav (PROJ-40)', () => {
  it('zeigt die drei Gruppen mit ihren Einträgen', () => {
    wrap(<AdminNav />, false)
    for (const name of ['Unterricht', 'Inhalte', 'Einstellungen']) {
      expect(screen.getByRole('list', { name })).toBeInTheDocument()
    }
    // Gruppentitel sind keine Überschriften (sonst stünden sie vor der h1 jeder Seite)
    expect(screen.queryAllByRole('heading')).toHaveLength(0)
    expect(screen.getByRole('link', { name: 'Übersicht' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Hof-Items' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Änderungsprotokoll' })).toBeInTheDocument()
  })

  it('blendet „Fachbereiche“ für Fachbereichs-Admins aus, für Super-Admins nicht', () => {
    const { unmount } = wrap(<AdminNav />, false)
    expect(screen.queryByRole('link', { name: 'Fachbereiche' })).not.toBeInTheDocument()
    unmount()
    wrap(<AdminNav />, true)
    expect(screen.getByRole('link', { name: 'Fachbereiche' })).toBeInTheDocument()
  })

  it('markiert den aktiven Eintrag auch auf Unterseiten mit aria-current', () => {
    mockPath = '/admin/leistungsnachweise/abc'
    wrap(<AdminNav />, false)
    expect(screen.getByRole('link', { name: 'Leistungsnachweise' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: 'Fragen' })).not.toHaveAttribute('aria-current')
    expect(screen.getByRole('link', { name: 'Übersicht' })).not.toHaveAttribute('aria-current')
    mockPath = '/admin'
  })

  it('meldet die Auswahl eines Eintrags (schließt das Handy-Menü)', () => {
    const onNavigate = vi.fn()
    wrap(<AdminNav onNavigate={onNavigate} />, false)
    fireEvent.click(screen.getByRole('link', { name: 'Fragen' }))
    expect(onNavigate).toHaveBeenCalledTimes(1)
  })
})

describe('AdminHome (PROJ-40)', () => {
  it('begrüßt mit Namen und zeigt die vier Haupt-Kacheln', () => {
    wrap(<AdminHome />, false)
    expect(screen.getByRole('heading', { name: 'Hallo, Frau Muster' })).toBeInTheDocument()
    const hrefs = screen.getAllByRole('link').map((a) => a.getAttribute('href'))
    expect(hrefs).toEqual([
      '/admin/leistungsnachweise',
      '/admin/questions',
      '/admin/users',
      '/admin/ai-generator',
    ])
  })
})
