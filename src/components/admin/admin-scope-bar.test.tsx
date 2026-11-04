import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import { AdminPageHeader } from './admin-page-header'
import { AdminHome } from './admin-home'
import { mockViewport, renderInWorkspace } from './workspace-test-utils'

let mockPath = '/admin/questions'
vi.mock('next/navigation', () => ({ usePathname: () => mockPath }))

beforeEach(() => {
  mockViewport(1280)
  mockPath = '/admin/questions'
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ assessments: [], subjects: [] }) }))
})

const scope = {
  current: null,
  departments: [
    { id: 'd1', name: 'Spedition', code: 'SPED' },
    { id: 'd2', name: 'Tourismus', code: 'TOUR' },
  ],
}

describe('Bereichsleiste im Seitenkopf (PROJ-70)', () => {
  it('ohne Bereichsdaten bleibt die Textzeile: Lehrkraft sieht alle Bereiche, mit Link zu „Meine Fächer“', () => {
    renderInWorkspace(<AdminPageHeader title="Fragen" />, { role: 'teacher' })
    expect(screen.getByText(/Du siehst alle Bereiche und Fächer/)).toBeInTheDocument()
  })

  it('nennt den Bereich in einfacher Sprache', () => {
    renderInWorkspace(<AdminPageHeader title="Fragen" />, { role: 'teacher', scope })
    expect(screen.getByText(/Du siehst:/)).toBeInTheDocument()
    expect(screen.getByText('alle Bereiche', { selector: 'strong' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Meine Fächer' })).toHaveAttribute('href', '/admin/my-subjects')
  })

  it('zeigt einen gewählten Bereich mit Namen', () => {
    renderInWorkspace(<AdminPageHeader title="Fragen" />, { role: 'department_admin', scope: { ...scope, current: 'd2' } })
    expect(screen.getByText('Tourismus', { selector: 'strong' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Meine Fächer' })).not.toBeInTheDocument()
  })

  it('bietet den Umschalter für jede Lehrer-Rolle, sobald es mehr als einen Bereich gibt', () => {
    renderInWorkspace(<AdminPageHeader title="Fragen" />, { role: 'teacher', scope })
    expect(screen.getByRole('combobox', { name: 'Bereich wechseln' })).toBeInTheDocument()
  })

  it('lässt den Umschalter bei nur einem Bereich weg', () => {
    renderInWorkspace(<AdminPageHeader title="Fragen" />, {
      role: 'teacher',
      scope: { current: 'd1', departments: [scope.departments[0]] },
    })
    expect(screen.queryByRole('combobox', { name: 'Bereich wechseln' })).not.toBeInTheDocument()
  })

  it('zeigt auf Seiten ohne Bereichs-Bezug keine Leiste', () => {
    mockPath = '/admin/department-settings'
    renderInWorkspace(<AdminPageHeader title="Einstellungen" />, { role: 'department_admin', scope })
    expect(screen.queryByText(/Du siehst/)).not.toBeInTheDocument()
  })

  it('zeigt die Leiste auch bei den Leistungsnachweisen, aber nicht auf deren Detailseiten', () => {
    mockPath = '/admin/leistungsnachweise'
    const first = renderInWorkspace(<AdminPageHeader title="Leistungsnachweise" />, { role: 'teacher', scope })
    expect(screen.getByText(/Du siehst:/)).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Bereich wechseln' })).toBeInTheDocument()
    first.unmount()
    mockPath = '/admin/leistungsnachweise/abc'
    renderInWorkspace(<AdminPageHeader title="Test" />, { role: 'teacher', scope })
    expect(screen.queryByText(/Du siehst/)).not.toBeInTheDocument()
  })

  it('zeigt bei Nutzern dem Super-Admin den Umschalter inklusive „Alle Bereiche“', () => {
    mockPath = '/admin/users'
    renderInWorkspace(<AdminPageHeader title="Nutzer" />, { role: 'admin', scope })
    expect(screen.getByText('alle Bereiche', { selector: 'strong' })).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Bereich wechseln' })).toBeInTheDocument()
  })

  it('zeigt bei Nutzern dem Bereichs-Admin den eigenen Bereich fest, ohne Umschalter', () => {
    mockPath = '/admin/users'
    renderInWorkspace(<AdminPageHeader title="Nutzer" />, { role: 'department_admin', scope })
    expect(screen.getByText(/Du siehst:/)).toBeInTheDocument()
    expect(screen.getByText('Spedition', { selector: 'strong' })).toBeInTheDocument()
    expect(screen.queryByRole('combobox', { name: 'Bereich wechseln' })).not.toBeInTheDocument()
  })

  it('zeigt im Änderungsprotokoll dem Super-Admin die Leiste mit Umschalter', () => {
    mockPath = '/admin/audit-log'
    renderInWorkspace(<AdminPageHeader title="Änderungsprotokoll" />, { role: 'admin', scope: { ...scope, current: 'd2' } })
    expect(screen.getByText('Tourismus', { selector: 'strong' })).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Bereich wechseln' })).toBeInTheDocument()
  })
})

describe('Hinweis nach gesperrter Seite (PROJ-49)', () => {
  it('erklärt der Lehrkraft, wer die Seite verwaltet', () => {
    renderInWorkspace(<AdminHome blocked />, { role: 'teacher' })
    expect(screen.getByText('Das verwaltet dein Bereichs-Admin.', { exact: false })).toBeInTheDocument()
  })

  it('zeigt ohne Umleitung keinen Hinweis', () => {
    renderInWorkspace(<AdminHome />, { role: 'teacher' })
    expect(screen.queryByText('Das verwaltet dein Bereichs-Admin.', { exact: false })).not.toBeInTheDocument()
  })
})
