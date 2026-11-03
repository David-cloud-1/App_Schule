import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { UserDetailView } from './user-detail-view'
import { AdminRoleProvider } from '@/components/admin/admin-role-provider'

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))
const push = vi.fn()
vi.mock('next/navigation', () => ({ usePathname: () => '/admin/users/u1', useRouter: () => ({ push }) }))

const USER_ID = 'u1'
const OWN_ID = 'admin-1'

const OVERVIEW = {
  id: USER_ID,
  displayName: 'Anna Azubi',
  pseudonym: null,
  email: 'anna@example.de',
  emailConfirmed: false,
  role: 'student',
  departmentId: 'd1',
  departmentName: 'Spedition',
  banned: false,
  registeredAt: '2026-09-01T00:00:00Z',
  lastSignInAt: '2026-11-01T08:00:00Z',
  lastSessionDate: '2026-11-01',
  totalXp: 350,
  level: 3,
  currentStreak: 2,
  longestStreak: 5,
  coins: 12,
  linkedMain: null,
}
const ACTIVITY = Array.from({ length: 30 }, (_, i) => ({
  date: `2026-10-${String(i + 1).padStart(2, '0')}`,
  learned: i % 2 === 0,
}))
const LEARNING = {
  subjects: [
    { subjectId: 's1', name: 'BGP', answered: 10, correct: 6, percent: 60, lastLearnedAt: '2026-10-30T10:00:00Z' },
  ],
  activity: ACTIVITY,
}
const BADGES = { badges: [{ id: 'b1', name: 'Erste Runde', icon: null, unlockedAt: '2026-10-10T00:00:00Z' }] }
const ASSESSMENTS = {
  assessments: [
    {
      sessionId: 'e1',
      assessmentId: 'a1',
      title: 'Klassenarbeit 1',
      date: '2026-10-20T08:00:00Z',
      status: 'completed',
      excluded: false,
      points: 8,
      totalPoints: 10,
      grade: 2,
      focusSwitches: 3,
    },
  ],
}
const LOG = {
  total: 25,
  entries: [
    {
      id: 'l1',
      createdAt: '2026-11-01T10:00:00Z',
      actionType: 'user.rename',
      label: 'Name geändert',
      adminName: 'Admin Alex',
      details: { old: 'Anna', new: 'Anna Azubi' },
    },
  ],
}

type Responses = Partial<
  Record<'overview' | 'learning' | 'badges' | 'assessments' | 'log', { status?: number; body?: unknown }>
>

function mockFetch(
  overrides: Responses = {},
  extra?: (url: string, init?: RequestInit) => { status?: number; body?: unknown } | undefined,
) {
  const defaults: Record<string, unknown> = {
    overview: OVERVIEW,
    learning: LEARNING,
    badges: BADGES,
    assessments: ASSESSMENTS,
    log: LOG,
  }
  const fn = vi.fn(async (url: string, init?: RequestInit) => {
    const custom = extra?.(url, init)
    const match = /\/detail\/(\w+)$/.exec(url)
    const section = match?.[1] as keyof Responses | undefined
    const override = custom ?? (section ? overrides[section] : undefined)
    const status = override?.status ?? 200
    const body = override && 'body' in override ? override.body : section ? defaults[section] : {}
    return { ok: status < 400, status, json: async () => body } as Response
  })
  vi.stubGlobal('fetch', fn)
  return fn
}

function setup(ownId = OWN_ID) {
  render(
    <AdminRoleProvider value={{ role: 'admin', isSuperAdmin: true }}>
      <UserDetailView userId={USER_ID} ownId={ownId} />
    </AdminRoleProvider>,
  )
}

describe('Nutzer-Detailseite (PROJ-59)', () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
    push.mockClear()
  })

  it('zeigt alle Abschnitte mit den Daten der Person', async () => {
    mockFetch()
    setup()
    expect(await screen.findByRole('heading', { name: 'Anna Azubi', level: 1 })).toBeInTheDocument()
    expect(screen.getByText('anna@example.de')).toBeInTheDocument()
    expect(screen.getByText('Spedition')).toBeInTheDocument()
    expect(screen.getByText('350')).toBeInTheDocument()
    expect(await screen.findByText('BGP')).toBeInTheDocument()
    expect(screen.getByText('60 %')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'An 15 von 30 Tagen gelernt' })).toBeInTheDocument()
    expect(await screen.findByText('Erste Runde')).toBeInTheDocument()
    expect(await screen.findByRole('link', { name: 'Klassenarbeit 1' })).toHaveAttribute(
      'href',
      '/admin/leistungsnachweise/a1',
    )
    expect(screen.getByText('Note 2')).toBeInTheDocument()
    expect(screen.getByText('3 Fokus-Verluste')).toBeInTheDocument()
    expect(await screen.findByText('Name geändert')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Alle 25 Einträge anzeigen' })).toHaveAttribute(
      'href',
      '/admin/audit-log?person=u1',
    )
  })

  it('ein ausgefallener Abschnitt zeigt einen Fehler, die anderen bleiben nutzbar', async () => {
    mockFetch({ badges: { status: 500, body: { error: 'x' } } })
    setup()
    expect(await screen.findByText('BGP')).toBeInTheDocument()
    expect(await screen.findByText('Dieser Abschnitt konnte gerade nicht geladen werden.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Erneut versuchen' })).toBeInTheDocument()
    expect(screen.getByText('Name geändert')).toBeInTheDocument()
  })

  it('Person ohne Aktivität: kurze Leerzustände statt leerer Tabellen', async () => {
    mockFetch({
      learning: { body: { subjects: [], activity: ACTIVITY.map((d) => ({ ...d, learned: false })) } },
      badges: { body: { badges: [] } },
      assessments: { body: { assessments: [] } },
      log: { body: { total: 0, entries: [] } },
    })
    setup()
    expect(await screen.findByText('Noch nichts gelernt')).toBeInTheDocument()
    expect(await screen.findByText('Noch keine Badges')).toBeInTheDocument()
    expect(await screen.findByText('Keine Leistungsnachweise')).toBeInTheDocument()
    expect(await screen.findByText('Noch keine Änderungen')).toBeInTheDocument()
  })

  it('gelöschtes Konto: „Konto nicht gefunden“ mit Link zurück zur Liste', async () => {
    mockFetch({ overview: { status: 404, body: { error: 'Konto nicht gefunden' } } })
    setup()
    expect(await screen.findByText('Konto nicht gefunden')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Zur Nutzerliste' })).toHaveAttribute('href', '/admin/users')
  })

  it('Zweitaccount: Hinweis mit Link auf das Hauptkonto', async () => {
    mockFetch({ overview: { body: { ...OVERVIEW, linkedMain: { id: 'main-1', name: 'Haupt Konto' } } } })
    setup()
    const link = await screen.findByRole('link', { name: 'Haupt Konto' })
    expect(link).toHaveAttribute('href', '/admin/users/main-1')
    // Für Zweitaccounts gibt es kein Passwort-Vergeben
    expect(screen.queryByRole('button', { name: /Passwort neu vergeben/ })).not.toBeInTheDocument()
  })

  it('eigenes Konto: E-Mail ändern, Bestätigen, Zurücksetzen und Passwort gesperrt, Name ändern erlaubt', async () => {
    mockFetch({ overview: { body: { ...OVERVIEW, id: OWN_ID } } })
    setup(USER_ID)
    await screen.findByRole('heading', { name: 'Anna Azubi', level: 1 })
    expect(screen.getByRole('button', { name: /E-Mail ändern/ })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Als bestätigt markieren' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Fortschritt zurücksetzen' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Konto löschen' })).toBeDisabled()
    expect(screen.queryByRole('button', { name: /Passwort neu vergeben/ })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Name ändern/ })).toBeEnabled()
  })

  it('Name ändern: prüft die Länge, sendet den Namen und lädt neu', async () => {
    const fetchFn = mockFetch({}, (url, init) =>
      url.endsWith('/rename') && init?.method === 'POST' ? { body: { ok: true } } : undefined,
    )
    setup()
    fireEvent.click(await screen.findByRole('button', { name: /Name ändern/ }))
    const input = await screen.findByLabelText('Anzeigename')
    fireEvent.change(input, { target: { value: 'A' } })
    expect(screen.getByRole('button', { name: 'Speichern' })).toBeDisabled()
    fireEvent.change(input, { target: { value: 'Anna Neu' } })
    fireEvent.click(screen.getByRole('button', { name: 'Speichern' }))
    await waitFor(() => {
      const call = fetchFn.mock.calls.find(([url]) => String(url).endsWith('/rename'))
      expect(call).toBeTruthy()
      expect(JSON.parse(String(call![1]!.body))).toEqual({ name: 'Anna Neu' })
    })
  })

  it('E-Mail ändern: zeigt den Fehler „schon vergeben“ im Dialog', async () => {
    mockFetch({}, (url, init) =>
      url.endsWith('/email') && init?.method === 'POST'
        ? { status: 409, body: { error: 'Diese E-Mail gehört schon zu einem anderen Konto.' } }
        : undefined,
    )
    setup()
    fireEvent.click(await screen.findByRole('button', { name: /E-Mail ändern/ }))
    fireEvent.change(await screen.findByLabelText('Neue E-Mail-Adresse'), { target: { value: 'neu@example.de' } })
    fireEvent.click(screen.getByRole('button', { name: 'E-Mail ändern' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Diese E-Mail gehört schon zu einem anderen Konto.')
  })

  it('Zurücksetzen: erst nach dem Eintippen des Namens möglich, erklärt was bleibt', async () => {
    const fetchFn = mockFetch({}, (url, init) =>
      url.endsWith('/reset-progress') && init?.method === 'POST' ? { body: { ok: true } } : undefined,
    )
    setup()
    fireEvent.click(await screen.findByRole('button', { name: 'Fortschritt zurücksetzen' }))
    expect(await screen.findByText(/Leistungsnachweise und ihre Noten/)).toBeInTheDocument()
    const confirm = screen.getByRole('button', { name: 'Zurücksetzen' })
    expect(confirm).toBeDisabled()
    fireEvent.change(screen.getByLabelText(/Zur Bestätigung/), { target: { value: 'anna azubi' } })
    expect(confirm).toBeDisabled()
    fireEvent.change(screen.getByLabelText(/Zur Bestätigung/), { target: { value: 'Anna Azubi' } })
    expect(confirm).toBeEnabled()
    fireEvent.click(confirm)
    await waitFor(() => {
      const call = fetchFn.mock.calls.find(([url]) => String(url).endsWith('/reset-progress'))
      expect(JSON.parse(String(call![1]!.body))).toEqual({ confirmName: 'Anna Azubi' })
    })
  })

  it('Zurücksetzen: Fehler der Schnittstelle bleibt im Dialog sichtbar', async () => {
    mockFetch({}, (url, init) =>
      url.endsWith('/reset-progress') && init?.method === 'POST'
        ? { status: 500, body: { error: 'Das Zurücksetzen wurde unterbrochen. Bitte versuche es noch einmal.' } }
        : undefined,
    )
    setup()
    fireEvent.click(await screen.findByRole('button', { name: 'Fortschritt zurücksetzen' }))
    fireEvent.change(await screen.findByLabelText(/Zur Bestätigung/), { target: { value: 'Anna Azubi' } })
    fireEvent.click(screen.getByRole('button', { name: 'Zurücksetzen' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('noch einmal')
  })
  it('Konto löschen: zeigt Vorschau, aktiv erst mit eingetippter E-Mail, danach zurück zur Liste', async () => {
    const fetchFn = mockFetch({}, (url, init) => {
      if (!url.endsWith('/delete')) return undefined
      if (init?.method === 'POST') return { body: { ok: true } }
      return { body: { email: 'anna@example.de', displayName: 'Anna Azubi', assessments: 2, ownContent: 0 } }
    })
    setup()
    fireEvent.click(await screen.findByRole('button', { name: 'Konto löschen' }))
    expect(await screen.findByText(/2 benotete Leistungsnachweise/)).toBeInTheDocument()
    const confirm = screen.getByRole('button', { name: 'Endgültig löschen' })
    expect(confirm).toBeDisabled()
    fireEvent.change(screen.getByLabelText(/Zur Bestätigung/), { target: { value: 'falsch@example.de' } })
    expect(confirm).toBeDisabled()
    fireEvent.change(screen.getByLabelText(/Zur Bestätigung/), { target: { value: 'Anna@Example.de' } })
    expect(confirm).toBeEnabled()
    fireEvent.click(confirm)
    await waitFor(() => {
      const call = fetchFn.mock.calls.find(([url, init]) => String(url).endsWith('/delete') && init?.method === 'POST')
      expect(JSON.parse(String(call![1]!.body))).toEqual({ confirmEmail: 'Anna@Example.de' })
      expect(push).toHaveBeenCalledWith('/admin/users')
    })
  })

  it('Konto löschen: Fehler bleibt im Dialog, die Seite wechselt nicht', async () => {
    mockFetch({}, (url, init) => {
      if (!url.endsWith('/delete')) return undefined
      if (init?.method === 'POST') return { status: 500, body: { error: 'Löschen fehlgeschlagen – erneut versuchen' } }
      return { body: { email: 'anna@example.de', displayName: 'Anna Azubi', assessments: 0, ownContent: 0 } }
    })
    setup()
    fireEvent.click(await screen.findByRole('button', { name: 'Konto löschen' }))
    fireEvent.change(await screen.findByLabelText(/Zur Bestätigung/), { target: { value: 'anna@example.de' } })
    fireEvent.click(screen.getByRole('button', { name: 'Endgültig löschen' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Löschen fehlgeschlagen – erneut versuchen')
    expect(push).not.toHaveBeenCalled()
  })

  it('Konto löschen: bei einem Super-Admin-Konto gesperrt, mit Hinweis', async () => {
    mockFetch({ overview: { body: { ...OVERVIEW, role: 'admin' } } })
    setup()
    await screen.findByRole('heading', { name: 'Anna Azubi', level: 1 })
    expect(screen.getByRole('button', { name: 'Konto löschen' })).toBeDisabled()
    expect(screen.getByText(/Ändere zuerst die Rolle/)).toBeInTheDocument()
  })
})
