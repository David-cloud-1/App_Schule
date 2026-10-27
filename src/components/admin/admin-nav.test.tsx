import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
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

function wrap(
  ui: ReactNode,
  isSuperAdmin: boolean,
  extra: { role?: TeacherRole; showTeacherWelcome?: boolean; hasSubjectAssignments?: boolean } = {},
) {
  const role = extra.role ?? (isSuperAdmin ? 'admin' : 'department_admin')
  return renderInWorkspace(ui, {
    role,
    showTeacherWelcome: extra.showTeacherWelcome,
    hasSubjectAssignments: extra.hasSubjectAssignments,
  })
}

function stubAssessments(assessments: unknown[]) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockImplementation((url: string) =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(url.startsWith('/api/admin/assessments') ? { assessments } : { subjects: [] }),
      }),
    ),
  )
}

describe('AdminNav (PROJ-40)', () => {
  it('zeigt die drei Gruppen mit ihren Einträgen', () => {
    wrap(<AdminNav />, false)
    for (const name of ['Unterricht', 'Inhalte', 'Verwaltung']) {
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
  afterEach(() => vi.unstubAllGlobals())

  it('begrüßt mit Namen und bietet Schnellaktionen statt einer Kopie der Navigation', async () => {
    stubAssessments([])
    wrap(<AdminHome />, false)
    expect(screen.getByRole('heading', { name: 'Hallo, Frau Muster' })).toBeInTheDocument()
    expect(await screen.findByText('Gerade läuft kein Leistungsnachweis.')).toBeInTheDocument()
    const hrefs = screen.getAllByRole('link').map((a) => a.getAttribute('href'))
    expect(hrefs).toEqual([
      '/admin/leistungsnachweise?neu=1',
      '/admin/questions',
      '/admin/ai-generator',
      '/admin/users',
      'https://divadl-werkzeugkiste.hf.space',
    ])
  })

  it('zeigt laufende Leistungsnachweise mit Live-Stand, Entwürfe und geschlossene nicht', async () => {
    stubAssessments([
      { id: 'a1', title: 'Frachtrecht', status: 'open', accessCode: 'ABC-123', className: '11a', participantCount: 5, submittedCount: 2 },
      { id: 'a2', title: 'Entwurf', status: 'draft', accessCode: 'X', className: null, participantCount: 0, submittedCount: 0 },
      { id: 'a3', title: 'Alt', status: 'closed', accessCode: 'Y', className: null, participantCount: 9, submittedCount: 9 },
    ])
    wrap(<AdminHome />, false)
    const link = await screen.findByRole('link', { name: /Frachtrecht/ })
    expect(link).toHaveAttribute('href', '/admin/leistungsnachweise/a1')
    expect(link).toHaveTextContent('11a · Code ABC-123')
    expect(link).toHaveTextContent('3 schreiben')
    expect(link).toHaveTextContent('2 abgegeben')
    expect(screen.queryByRole('link', { name: /Entwurf|Alt/ })).not.toBeInTheDocument()
  })

  it('öffnet die Werkzeugkiste in neuem Tab', () => {
    stubAssessments([])
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
      'Werkzeugkiste',
      'Fragen',
      'Fächer',
      'Themen',
      'Prüfungssimulation',
      'Meine Fächer',
      'Papierkorb',
    ])
    expect(screen.getByRole('list', { name: 'Inhalte' })).toBeInTheDocument()
    expect(screen.getByRole('list', { name: 'Verwaltung' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Nutzer' })).not.toBeInTheDocument()
  })

  it('zeigt einer Lehrkraft ohne Fach statt leerer Inhalts-Seiten den Weg zu „Meine Fächer“', async () => {
    stubAssessments([])
    const { unmount } = wrap(<AdminNav />, false, { role: 'teacher', hasSubjectAssignments: false })
    expect(screen.getAllByRole('link').map((a) => a.textContent)).toEqual([
      'Übersicht',
      'Leistungsnachweise',
      'Werkzeugkiste',
      'Meine Fächer',
    ])
    unmount()
    wrap(<AdminHome />, false, { role: 'teacher', hasSubjectAssignments: false })
    expect(screen.getByRole('link', { name: /Trag deine Fächer ein/ })).toHaveAttribute('href', '/admin/my-subjects')
    expect(screen.queryByText(/folgen bald/)).not.toBeInTheDocument()
    vi.unstubAllGlobals()
  })

  it('zeigt einer Lehrkraft mit Fach Nachweis-, Fragen- und Werkzeugkiste-Aktion ohne Fach-Hinweis', async () => {
    stubAssessments([])
    wrap(<AdminHome />, false, { role: 'teacher' })
    await screen.findByText('Gerade läuft kein Leistungsnachweis.')
    expect(screen.getAllByRole('link').map((a) => a.getAttribute('href'))).toEqual([
      '/admin/leistungsnachweise?neu=1',
      '/admin/questions',
      'https://divadl-werkzeugkiste.hf.space',
    ])
    expect(screen.queryByText(/Trag deine Fächer ein/)).not.toBeInTheDocument()
    vi.unstubAllGlobals()
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
