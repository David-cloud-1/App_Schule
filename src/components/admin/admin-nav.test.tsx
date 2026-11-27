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
  extra: { role?: TeacherRole; showTeacherWelcome?: boolean} = {},
) {
  const role = extra.role ?? (isSuperAdmin ? 'admin' : 'department_admin')
  return renderInWorkspace(ui, {
    role,
    showTeacherWelcome: extra.showTeacherWelcome,
  })
}

/** Klappt „Verwaltung“ auf (standardmäßig zu) */
function openFolds() {
  for (const id of ['verwaltung']) {
    const trigger = screen.queryByTestId(`nav-fold-${id}`)
    if (trigger && trigger.getAttribute('aria-expanded') === 'false') fireEvent.click(trigger)
  }
}

const HAUPT_OBEN = ['Start', 'Leistungsnachweisemit Note', 'Übungsprüfungenohne Note']
const LERNINHALTE = ['Lerninhalte']
const HAUPT_UNTEN = ['Werkzeugkiste', 'Abwesenheiten', 'Nachschlagen', 'Lehrerzimmer']
const VERWALTUNG = ['Nutzer', 'Einstellungen des Bereichs', 'Shop-Gegenstände', 'Änderungsprotokoll']
const linkTexts = () => screen.getAllByRole('link').map((a) => a.textContent)

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

describe('AdminNav (PROJ-40/130)', () => {
  beforeEach(() => window.sessionStorage.clear())

  it('zeigt alle Hauptpunkte, „Lerninhalte“ als einen Punkt und „Verwaltung“ zugeklappt (PROJ-131)', () => {
    wrap(<AdminNav />, false)
    expect(linkTexts()).toEqual([...HAUPT_OBEN, ...LERNINHALTE, ...HAUPT_UNTEN])
    expect(screen.getByRole('link', { name: 'Lerninhalte' })).toHaveAttribute('href', '/admin/inhalte')
    expect(screen.queryByTestId('nav-fold-lerninhalte')).not.toBeInTheDocument()
    expect(screen.getByTestId('nav-fold-verwaltung')).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByText('Weitere Seiten')).not.toBeInTheDocument()
  })

  it('zeigt nach dem Aufklappen die Unterpunkte in der richtigen Reihenfolge', () => {
    wrap(<AdminNav />, false)
    openFolds()
    expect(linkTexts()).toEqual([...HAUPT_OBEN, ...LERNINHALTE, ...HAUPT_UNTEN, ...VERWALTUNG])
    for (const name of ['Verwaltung']) {
      expect(screen.getByRole('list', { name })).toBeInTheDocument()
    }
    // Gruppentitel sind keine Überschriften (sonst stünden sie vor der h1 jeder Seite)
    expect(screen.queryAllByRole('heading')).toHaveLength(0)
  })

  it('merkt sich das Aufklappen, auch wenn das Menü neu aufgebaut wird', () => {
    const first = wrap(<AdminNav />, false)
    fireEvent.click(screen.getByTestId('nav-fold-verwaltung'))
    first.unmount()
    wrap(<AdminNav />, false)
    expect(screen.getByTestId('nav-fold-verwaltung')).toHaveAttribute('aria-expanded', 'true')
  })

  it('klappt den Block auf, in dem die aktuelle Seite liegt, und lässt ihn zuklappen', () => {
    mockPath = '/admin/audit-log'
    wrap(<AdminNav />, false)
    const trigger = screen.getByTestId('nav-fold-verwaltung')
    expect(trigger).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('link', { name: 'Änderungsprotokoll' })).toHaveAttribute('aria-current', 'page')
    fireEvent.click(trigger)
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    mockPath = '/admin'
  })

  it('zeigt die Zusätze nur dem Super-Admin und kennzeichnet sie', () => {
    const { unmount } = wrap(<AdminNav />, false)
    openFolds()
    expect(screen.queryByRole('link', { name: /Bereiche anlegen/ })).not.toBeInTheDocument()
    expect(screen.queryByText('Super-Admin')).not.toBeInTheDocument()
    unmount()
    window.sessionStorage.clear()
    wrap(<AdminNav />, true)
    openFolds()
    expect(screen.getByRole('link', { name: /Bereiche anlegen/ })).toHaveTextContent('Super-Admin')
    // PROJ-131: „Fragen aus Material“ steht nicht mehr im Menü
    expect(screen.queryByRole('link', { name: 'Fragen aus Material' })).not.toBeInTheDocument()
  })

  it('hält „Nachschlagen“ auf den Unterseiten aktiv', () => {
    mockPath = '/admin/checklisten'
    wrap(<AdminNav />, false)
    expect(screen.getByRole('link', { name: 'Nachschlagen' })).toHaveAttribute('aria-current', 'page')
    mockPath = '/admin'
  })

  it('markiert den aktiven Eintrag auch auf Unterseiten mit aria-current', () => {
    mockPath = '/admin/leistungsnachweise/abc'
    wrap(<AdminNav />, false)
    openFolds()
    expect(screen.getByRole('link', { name: /Leistungsnachweise/ })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: 'Lerninhalte' })).not.toHaveAttribute('aria-current')
    expect(screen.getByRole('link', { name: 'Start' })).not.toHaveAttribute('aria-current')
    mockPath = '/admin'
  })

  it('meldet die Auswahl eines Eintrags (schließt das Handy-Menü)', () => {
    const onNavigate = vi.fn()
    wrap(<AdminNav onNavigate={onNavigate} />, false)
    openFolds()
    fireEvent.click(screen.getByRole('link', { name: 'Lerninhalte' }))
    expect(onNavigate).toHaveBeenCalledTimes(1)
  })
})

describe('AdminNav je Rolle (PROJ-130)', () => {
  beforeEach(() => window.sessionStorage.clear())

  it('zeigt einer Lehrkraft dasselbe Menü wie dem Bereichs-Admin, ohne „Meine Fächer“', () => {
    wrap(<AdminNav />, false, { role: 'teacher' })
    openFolds()
    expect(linkTexts()).toEqual([...HAUPT_OBEN, ...LERNINHALTE, ...HAUPT_UNTEN, ...VERWALTUNG])
    expect(screen.queryByRole('link', { name: 'Meine Fächer' })).not.toBeInTheDocument()
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
      '/admin/inhalte',
      '/admin/users',
      '/admin/werkzeugkiste',
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

  it('öffnet die Werkzeugkiste im selben Tab als Seite der App (PROJ-51)', () => {
    stubAssessments([])
    wrap(<AdminHome />, false)
    const link = screen.getByRole('link', { name: /Werkzeugkiste/ })
    expect(link).toHaveAttribute('href', '/admin/werkzeugkiste')
    expect(link).not.toHaveAttribute('target')
  })
})

describe('Lehrkräfte-Bereich für die Rolle „Lehrkraft“ (PROJ-44)', () => {
  beforeEach(() => resetTeacherWelcomeForTests())

  it('zeigt auf der Startseite keinen Hinweis, Fächer einzutragen (PROJ-70: Inhalte stehen allen offen)', () => {
    stubAssessments([])
    wrap(<AdminHome />, false, { role: 'teacher' })
    expect(screen.queryByRole('link', { name: /Trag deine Fächer ein/ })).not.toBeInTheDocument()
    expect(screen.queryByText(/folgen bald/)).not.toBeInTheDocument()
    vi.unstubAllGlobals()
  })

  it('zeigt einer Lehrkraft mit Fach Nachweis-, Fragen- und Werkzeugkiste-Aktion ohne Fach-Hinweis', async () => {
    stubAssessments([])
    wrap(<AdminHome />, false, { role: 'teacher' })
    await screen.findByText('Gerade läuft kein Leistungsnachweis.')
    expect(screen.getAllByRole('link').map((a) => a.getAttribute('href'))).toEqual([
      '/admin/leistungsnachweise?neu=1',
      '/admin/inhalte',
      '/admin/users',
      '/admin/werkzeugkiste',
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
