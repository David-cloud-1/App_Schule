import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fireEvent, screen } from '@testing-library/react'
import { AdminTopbar, adminCrumbs, adminPageTitle } from './admin-topbar'
import { AdminPageHeader } from './admin-page-header'
import { AdminEmptyState, AdminErrorState, AdminLoadingState } from './admin-states'
import { mockViewport, renderInWorkspace } from './workspace-test-utils'
import { Inbox } from 'lucide-react'

let mockPath = '/admin/leistungsnachweise/abc'
vi.mock('next/navigation', () => ({ usePathname: () => mockPath }))
vi.mock('@/lib/supabase-browser', () => ({ createClient: () => ({ auth: { signOut: vi.fn() } }) }))

beforeEach(() => {
  mockPath = '/admin/leistungsnachweise/abc'
  mockViewport(1280)
})

describe('adminCrumbs (PROJ-45)', () => {
  const start = { label: 'Start', href: '/admin' }

  it('benennt „Mein Konto“ (PROJ-50), obwohl die Seite nicht in der Seitenleiste steht', () => {
    expect(adminCrumbs('/admin/konto', null)).toEqual([start, { label: 'Mein Konto' }])
    expect(adminCrumbs('/admin/my-subjects', null)).toEqual([
      start,
      { label: 'Mein Konto', href: '/admin/konto' },
      { label: 'Meine Fächer' },
    ])
  })

  it('zeigt auf der Startseite nur „Start“', () => {
    expect(adminCrumbs('/admin', null)).toEqual([{ label: 'Start' }])
  })

  it('nennt die Gruppe vor der Seite (PROJ-130)', () => {
    expect(adminCrumbs('/admin/inhalte', null)).toEqual([start, { label: 'Lerninhalte' }])
    expect(adminCrumbs('/admin/ai-generator', null)).toEqual([
      start,
      { label: 'Lerninhalte', href: '/admin/inhalte' },
      { label: 'Fragen aus Material' },
    ])
    expect(adminCrumbs('/admin/users', null)).toEqual([start, { label: 'Verwaltung' }, { label: 'Nutzer' }])
  })

  it('führt Schulrecht und Checklisten unter „Nachschlagen“ (PROJ-130)', () => {
    expect(adminCrumbs('/admin/schulrecht', null)).toEqual([
      start,
      { label: 'Nachschlagen', href: '/admin/nachschlagen' },
      { label: 'Schulrecht' },
    ])
    expect(adminCrumbs('/admin/nachschlagen', null)).toEqual([start, { label: 'Nachschlagen' }])
  })

  it('hängt auf Detailseiten den Titel der Seite an und verlinkt den Bereich', () => {
    expect(adminCrumbs('/admin/leistungsnachweise/abc', 'Klassenarbeit LF5')).toEqual([
      start,
      { label: 'Leistungsnachweise', href: '/admin/leistungsnachweise' },
      { label: 'Klassenarbeit LF5' },
    ])
  })

  it('zeigt am Handy statt „Übersicht“ den Gruppennamen', () => {
    expect(adminPageTitle(adminCrumbs('/admin/inhalte', null))).toBe('Lerninhalte')
    expect(adminPageTitle(adminCrumbs('/admin/shop-items', null))).toBe('Shop-Gegenstände')
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
    expect(trail).toHaveTextContent('Start')
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
