import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { fireEvent, screen } from '@testing-library/react'
import { BereichsUmschalter } from './bereichs-umschalter'
import { AdminPageHeader } from './admin-page-header'
import { AdminHome } from './admin-home'
import { TargetDepartmentField } from './target-department-field'
import { mockViewport, renderInWorkspace } from './workspace-test-utils'
import type { AdminRoleContextValue } from './admin-role-provider'

let mockPath = '/admin/questions'
vi.mock('next/navigation', () => ({ usePathname: () => mockPath }))

const zwei = [
  { id: 'd1', name: 'Spedition', code: 'SPED' },
  { id: 'd2', name: 'Tourismus', code: 'TOUR' },
]
const scope = (current: string | null, extra: Partial<NonNullable<AdminRoleContextValue['scope']>> = {}) => ({
  current,
  departments: zwei,
  ...extra,
})

beforeEach(() => {
  mockViewport(1280)
  mockPath = '/admin/questions'
  // Radix-Select braucht diese Browser-Funktionen
  Element.prototype.scrollIntoView = vi.fn()
  Element.prototype.hasPointerCapture = vi.fn(() => false)
  Element.prototype.releasePointerCapture = vi.fn()
})
afterEach(() => vi.unstubAllGlobals())

describe('Bereichs-Umschalter (PROJ-130)', () => {
  it.each(['teacher', 'department_admin', 'admin'] as const)('lässt die Rolle %s wählen, sobald es zwei Bereiche gibt', (role) => {
    renderInWorkspace(<BereichsUmschalter />, { role, scope: scope('d2') })
    expect(screen.getByRole('combobox', { name: /Bereich: Tourismus/ })).toBeInTheDocument()
  })

  it('nennt „Alle Bereiche“, wenn kein einzelner gewählt ist', () => {
    renderInWorkspace(<BereichsUmschalter />, { role: 'teacher', scope: scope(null) })
    expect(screen.getByRole('combobox', { name: /Bereich: Alle Bereiche/ })).toBeInTheDocument()
  })

  it('zeigt bei nur einem Bereich eine ruhige Anzeige ohne Auswahl', () => {
    renderInWorkspace(<BereichsUmschalter />, { scope: { current: 'd1', departments: [zwei[0]] } })
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
    expect(screen.getByText('Spedition')).toBeInTheDocument()
  })

  it('speichert die Wahl und lädt neu', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({}) })
    vi.stubGlobal('fetch', fetchMock)
    const reload = vi.fn()
    vi.stubGlobal('location', { ...window.location, reload })
    renderInWorkspace(<BereichsUmschalter />, { role: 'teacher', scope: scope('d1') })
    fireEvent.click(screen.getByRole('combobox'))
    fireEvent.click(await screen.findByRole('option', { name: 'Alle Bereiche' }))
    expect(fetchMock).toHaveBeenCalledWith('/api/admin/context/bereich', expect.objectContaining({ body: JSON.stringify({ bereich: 'alle' }) }))
    await vi.waitFor(() => expect(reload).toHaveBeenCalled())
  })

  it('nennt dem Super-Admin bei „Alle Bereiche“ den Bereich der Seiten, die nur einen zeigen', () => {
    mockPath = '/admin/shop-items'
    renderInWorkspace(<BereichsUmschalter />, { role: 'admin', scope: scope(null, { workingDepartmentId: 'd2' }) })
    expect(screen.getByText('Auf dieser Seite:', { exact: false })).toHaveTextContent('Auf dieser Seite: Tourismus')
  })

  it('zeigt diesen Hinweis nicht auf anderen Seiten und nicht für Lehrkräfte', () => {
    const { unmount } = renderInWorkspace(<BereichsUmschalter />, { role: 'admin', scope: scope(null, { workingDepartmentId: 'd2' }) })
    expect(screen.queryByText(/Auf dieser Seite/)).not.toBeInTheDocument()
    unmount()
    mockPath = '/admin/users'
    renderInWorkspace(<BereichsUmschalter />, { role: 'teacher', scope: scope(null, { workingDepartmentId: 'd2' }) })
    expect(screen.queryByText(/Auf dieser Seite/)).not.toBeInTheDocument()
  })
})

describe('Kein zweiter Bereich auf den Seiten (PROJ-130)', () => {
  it.each(['/admin/questions', '/admin/users', '/admin/leistungsnachweise', '/admin/gemeldete-fragen'])(
    'zeigt auf %s keine Leiste „Du siehst“ und keinen eigenen Umschalter',
    (path) => {
      mockPath = path
      renderInWorkspace(<AdminPageHeader title="Seite" />, { role: 'admin', scope: scope(null) })
      expect(screen.queryByText(/Du siehst/)).not.toBeInTheDocument()
      expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
    },
  )

  it('Anlegen-Dialoge übernehmen einen gewählten Bereich als ruhige Zeile', () => {
    renderInWorkspace(<TargetDepartmentField value="" onChange={() => {}} />, { scope: scope('d2') })
    expect(screen.getByText('Bereich:', { exact: false })).toHaveTextContent('Bereich: Tourismus')
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
  })

  it('Anlegen-Dialoge verlangen bei „Alle Bereiche“ den Bereich als Pflichtfeld ohne Vorauswahl', () => {
    renderInWorkspace(<TargetDepartmentField value="" onChange={() => {}} />, { scope: scope(null) })
    expect(screen.getByRole('combobox', { name: 'Bereich (Pflicht)' })).toHaveTextContent('Bereich wählen')
    expect(screen.queryByText(/Zielbereich|Wird angelegt in/)).not.toBeInTheDocument()
  })
})

describe('Hinweis nach gesperrter Seite (PROJ-49)', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ assessments: [], subjects: [] }) }))
  })

  it('erklärt der Lehrkraft, wer die Seite verwaltet', () => {
    renderInWorkspace(<AdminHome blocked />, { role: 'teacher' })
    expect(screen.getByText('Das verwaltet der Super-Admin.', { exact: false })).toBeInTheDocument()
  })

  it('zeigt ohne Umleitung keinen Hinweis', () => {
    renderInWorkspace(<AdminHome />, { role: 'teacher' })
    expect(screen.queryByText('Das verwaltet der Super-Admin.', { exact: false })).not.toBeInTheDocument()
  })
})
