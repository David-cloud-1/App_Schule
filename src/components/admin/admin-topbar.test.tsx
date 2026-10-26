import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fireEvent, screen } from '@testing-library/react'
import { AdminTopbar, adminCrumbs } from './admin-topbar'
import { AdminPageHeader } from './admin-page-header'
import { AdminEmptyState, AdminErrorState, AdminLoadingState } from './admin-states'
import { mockViewport, renderInWorkspace } from './workspace-test-utils'
import { Inbox } from 'lucide-react'

let mockPath = '/admin/leistungsnachweise/abc'
vi.mock('next/navigation', () => ({ usePathname: () => mockPath }))
vi.mock('@/components/admin/department-switcher', () => ({ DepartmentSwitcher: () => null }))
vi.mock('@/lib/supabase-browser', () => ({ createClient: () => ({ auth: { signOut: vi.fn() } }) }))

beforeEach(() => {
  mockPath = '/admin/leistungsnachweise/abc'
  mockViewport(1280)
})

describe('adminCrumbs (PROJ-45)', () => {
  it('zeigt auf der Übersicht nur „Übersicht“', () => {
    expect(adminCrumbs('/admin', 'Hof', null)).toEqual([{ label: 'Übersicht' }])
  })

  it('verlinkt auf einer Bereichsseite die Übersicht', () => {
    expect(adminCrumbs('/admin/questions', 'Hof', null)).toEqual([
      { label: 'Übersicht', href: '/admin' },
      { label: 'Fragen' },
    ])
  })

  it('hängt auf Detailseiten den Titel der Seite an und verlinkt den Bereich', () => {
    expect(adminCrumbs('/admin/leistungsnachweise/abc', 'Hof', 'Klassenarbeit LF5')).toEqual([
      { label: 'Übersicht', href: '/admin' },
      { label: 'Leistungsnachweise', href: '/admin/leistungsnachweise' },
      { label: 'Klassenarbeit LF5' },
    ])
  })

  it('nutzt den Namen des Fachbereichs für die Items', () => {
    expect(adminCrumbs('/admin/shop-items', 'Reisebüro', null).at(-1)).toEqual({ label: 'Reisebüro-Items' })
  })
})

describe('AdminTopbar + AdminPageHeader (PROJ-45)', () => {
  it('zeigt den Titel einer Detailseite als letztes, klickbares Brotkrumen-Glied davor', () => {
    renderInWorkspace(
      <>
        <AdminTopbar />
        <AdminPageHeader title="Klassenarbeit LF5" breadcrumb="Klassenarbeit LF5" />
      </>,
    )
    const trail = screen.getByRole('navigation', { name: 'breadcrumb' })
    expect(trail).toHaveTextContent('Übersicht')
    expect(screen.getByRole('link', { name: 'Leistungsnachweise' })).toHaveAttribute('href', '/admin/leistungsnachweise')
    expect(trail).toHaveTextContent('Klassenarbeit LF5')
    expect(screen.getByRole('heading', { level: 1, name: 'Klassenarbeit LF5' })).toBeInTheDocument()
  })

  it('kürzt lange Titel und zeigt den vollen Text beim Überfahren', () => {
    const long = 'Sehr lange Klassenarbeit zum Lernfeld 5 mit ausführlichem Untertitel für die 11b'
    renderInWorkspace(
      <>
        <AdminTopbar />
        <AdminPageHeader title={long} breadcrumb={long} />
      </>,
    )
    expect(screen.getAllByTitle(long).length).toBeGreaterThan(0)
  })

  it('zeigt die Hauptaktion des Seitenkopfs', () => {
    renderInWorkspace(<AdminPageHeader title="Fächer" description="3 Fächer" actions={<button>Neues Fach</button>} />)
    expect(screen.getByText('3 Fächer')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Neues Fach' })).toBeInTheDocument()
  })
})

describe('Zustands-Bausteine (PROJ-45)', () => {
  it('kündigt das Laden für Screenreader an', () => {
    renderInWorkspace(<AdminLoadingState variant="table" label="Fragen werden geladen …" />, { withSidebar: false })
    expect(screen.getByRole('status')).toHaveTextContent('Fragen werden geladen …')
  })

  it('zeigt einen Leerzustand mit Hauptaktion', () => {
    renderInWorkspace(
      <AdminEmptyState icon={Inbox} title="Noch keine Fächer" description="Lege das erste an." action={<button>Neues Fach</button>} />,
      { withSidebar: false },
    )
    expect(screen.getByText('Noch keine Fächer')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Neues Fach' })).toBeInTheDocument()
  })

  it('zeigt Fehler verständlich mit „Erneut versuchen“', () => {
    const retry = vi.fn()
    renderInWorkspace(<AdminErrorState message="Die Fächer konnten gerade nicht geladen werden." onRetry={retry} />, {
      withSidebar: false,
    })
    expect(screen.getByRole('alert')).toHaveTextContent('Die Fächer konnten gerade nicht geladen werden.')
    fireEvent.click(screen.getByRole('button', { name: 'Erneut versuchen' }))
    expect(retry).toHaveBeenCalledTimes(1)
  })
})
