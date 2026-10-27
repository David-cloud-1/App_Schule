import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fireEvent, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { AdminNav } from './admin-nav'
import { AdminHome } from './admin-home'
import { resetTeacherWelcomeForTests } from './teacher-welcome-dialog'
import { mockViewport, renderInWorkspace } from './workspace-test-utils'
import type { TeacherRole } from '@/lib/roles'

let mockPath = '/admin'
vi.mock('next/navigation', () => ({ usePathname: () => mockPath }))

beforeEach(() => mockViewport(1280))

function wrap(ui: ReactNode, isSuperAdmin: boolean, extra: { role?: TeacherRole; showTeacherWelcome?: boolean } = {}) {
  const role = extra.role ?? (isSuperAdmin ? 'admin' : 'department_admin')
  return renderInWorkspace(ui, { role, showTeacherWelcome: extra.showTeacherWelcome })
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
  it('begrüßt mit Namen und zeigt die fünf Haupt-Kacheln', () => {
    wrap(<AdminHome />, false)
    expect(screen.getByRole('heading', { name: 'Hallo, Frau Muster' })).toBeInTheDocument()
    const hrefs = screen.getAllByRole('link').map((a) => a.getAttribute('href'))
    expect(hrefs).toEqual([
      '/admin/leistungsnachweise',
      '/admin/questions',
      '/admin/users',
      'https://divadl-werkzeugkiste.hf.space',
      '/admin/ai-generator',
    ])
  })

  it('öffnet die Werkzeugkiste in neuem Tab', () => {
    wrap(<AdminHome />, false)
    const link = screen.getByRole('link', { name: /Werkzeugkiste/ })
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })
})

describe('Lehrkräfte-Bereich für die Rolle „Lehrkraft“ (PROJ-44)', () => {
  beforeEach(() => resetTeacherWelcomeForTests())

  it('zeigt in der Navigation auch Inhalts-Seiten und Meine Fächer (PROJ-46/48)', () => {
    wrap(<AdminNav />, false, { role: 'teacher' })
    const names = screen.getAllByRole('link').map((a) => a.textContent)
    expect(names).toEqual([
      'Übersicht',
      'Leistungsnachweise',
      'Fragen',
      'Werkzeugkiste',
      'Fächer',
      'Themen',
      'Prüfungssimulation',
      'Meine Fächer',
      'Papierkorb',
    ])
    expect(screen.getByRole('list', { name: 'Inhalte' })).toBeInTheDocument()
    expect(screen.getByRole('list', { name: 'Einstellungen' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Nutzer' })).not.toBeInTheDocument()
  })

  it('zeigt auf der Startseite die Leistungsnachweise-, Fragen-, Werkzeugkiste- und Meine-Fächer-Kachel samt Hinweis auf weitere Werkzeuge (PROJ-46/48)', () => {
    wrap(<AdminHome />, false, { role: 'teacher' })
    expect(screen.getAllByRole('link').map((a) => a.getAttribute('href'))).toEqual([
      '/admin/leistungsnachweise',
      '/admin/questions',
      'https://divadl-werkzeugkiste.hf.space',
      '/admin/my-subjects',
    ])
    expect(screen.getByText(/folgen bald/)).toBeInTheDocument()
  })

  it('zeigt den Willkommens-Hinweis nur, wenn er noch nicht gesehen wurde', () => {
    const { unmount } = wrap(<AdminHome />, false, { role: 'teacher', showTeacherWelcome: false })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    unmount()
    wrap(<AdminHome />, false, { role: 'teacher', showTeacherWelcome: true })
    expect(screen.getByRole('dialog', { name: 'Willkommen im Lehrkräfte-Bereich' })).toBeInTheDocument()
  })

  it('merkt sich das Schließen des Willkommens-Hinweises am Konto', () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true })
    vi.stubGlobal('fetch', fetchMock)
    wrap(<AdminHome />, false, { role: 'teacher', showTeacherWelcome: true })
    fireEvent.click(screen.getByRole('button', { name: 'Später' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledWith('/api/profile/teacher-welcome', { method: 'POST' })
    vi.unstubAllGlobals()
  })

  it('zeigt den Hinweis nach dem Schließen nicht wieder, wenn die Übersicht neu aufgebaut wird (BUG-2)', () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }))
    const first = wrap(<AdminHome />, false, { role: 'teacher', showTeacherWelcome: true })
    fireEvent.click(screen.getByRole('button', { name: 'Später' }))
    first.unmount()
    // z. B. „Zurück“ im Browser oder Klick auf „Übersicht“: der Server-Wert ist noch „nicht gesehen“
    wrap(<AdminHome />, false, { role: 'teacher', showTeacherWelcome: true })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    vi.unstubAllGlobals()
  })

  it('zeigt Bereichs-Admins keinen Willkommens-Hinweis für Lehrkräfte', () => {
    wrap(<AdminHome />, false, { role: 'department_admin', showTeacherWelcome: true })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
