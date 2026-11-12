import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import AdminUsersPage from './page'
import { AdminRoleProvider } from '@/components/admin/admin-role-provider'
import type { TeacherRole } from '@/lib/roles'

vi.mock('@/lib/supabase-browser', () => ({
  createClient: () => ({ auth: { getUser: async () => ({ data: { user: { id: 'self-id' } } }) } }),
}))
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))

const USERS = [
  { id: 'self-id', display_name: 'Ich Selbst', email: 'ich@example.de', role: 'admin', department_id: 'd1', total_xp: 0, current_streak: 0, last_session_date: null, banned: false },
  { id: 's1', display_name: 'Anna Azubi', email: 'anna@example.de', role: 'student', department_id: 'd1', total_xp: 10, current_streak: 1, last_session_date: '2026-10-03', last_sign_in_at: '2026-10-03T08:00:00Z', banned: false },
  { id: 't1', display_name: 'Petra Lehrkraft', email: 'petra@example.de', role: 'teacher', department_id: 'd1', total_xp: 0, current_streak: 0, last_session_date: null, last_sign_in_at: '2026-10-20T08:00:00Z', banned: false },
  { id: 'a1', display_name: 'Bernd Bereich', email: 'bernd@example.de', role: 'department_admin', department_id: 'd1', total_xp: 0, current_streak: 0, last_session_date: null, banned: false },
]

function setup(role: TeacherRole) {
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ users: USERS }) })))
  render(
    <AdminRoleProvider value={{ role, isSuperAdmin: role === 'admin' }}>
      <AdminUsersPage />
    </AdminRoleProvider>,
  )
  return screen.findByText('Anna Azubi')
}

/** Öffnet das ⋯-Menü der Zeile und liefert die Einträge als Text */
function menuOf(name: string) {
  fireEvent.keyDown(screen.getByRole('button', { name: `Weitere Aktionen: ${name}` }), { key: 'Enter' })
  const entries = screen.getAllByRole('menuitem').map((e) => e.textContent)
  return entries
}
const button = (name: RegExp) => screen.queryByRole('button', { name })
const closeMenu = () => fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Escape' })

describe('Nutzerverwaltung – Zeilenmenü je Rolle (PROJ-44, QA BUG-3/5a)', () => {
  beforeEach(() => vi.unstubAllGlobals())

  it('Bereichs-Admin: sperren und verschieben nur bei Azubis, bei Lehrer-Konten kein Menü', async () => {
    await setup('department_admin')
    expect(menuOf('Anna Azubi')).toEqual(['In anderen Fachbereich verschieben', 'Passwort neu vergeben', 'Sperren'])
    closeMenu()
    for (const name of ['Petra Lehrkraft', 'Bernd Bereich']) {
      expect(screen.queryByRole('button', { name: `Weitere Aktionen: ${name}` })).not.toBeInTheDocument()
    }
  })

  it('Super-Admin: kann Lehrkraft und Bereichs-Admin verschieben und sperren (BUG-3)', async () => {
    await setup('admin')
    for (const name of ['Anna Azubi', 'Petra Lehrkraft', 'Bernd Bereich']) {
      const entries = menuOf(name)
      expect(entries).toContain('In anderen Fachbereich verschieben')
      expect(entries).toContain('Sperren')
      expect(entries).toContain('Konto löschen')
      expect(entries.some((e) => e?.startsWith('Rolle ändern'))).toBe(true)
      closeMenu()
    }
  })

  it('Super-Admin: sich selbst weder sperren noch verschieben', async () => {
    await setup('admin')
    expect(screen.queryByRole('button', { name: 'Weitere Aktionen: Ich Selbst' })).not.toBeInTheDocument()
  })

  it('zeigt den letzten Login bei allen Rollen (PROJ-57, vorher nur Lehrer-Rollen)', async () => {
    await setup('admin')
    const row = (name: string) => screen.getByText(name).closest('tr') as HTMLElement
    await waitFor(() => expect(row('Petra Lehrkraft')).toHaveTextContent('20.10.2026'))
    expect(row('Anna Azubi')).toHaveTextContent('03.10.2026')
  })

  it('zeigt den Schalter „Alle Bereiche“ nur dem Super-Admin', async () => {
    await setup('department_admin')
    expect(screen.queryByLabelText('Alle Bereiche')).not.toBeInTheDocument()
  })
})

// Super-Admin: ganz vorn steht die Checkbox-Spalte (PROJ-61), der Name ist die Zelle danach
const rowNames = () =>
  screen
    .getAllByRole('row')
    .slice(1)
    .map((r) => {
      const cells = within(r).getAllByRole('cell')
      const nameCell = within(cells[0]).queryByRole('checkbox') ? cells[1] : cells[0]
      // Name und E-Mail stehen in einer Zelle: Name = erste Zeile
      const name = nameCell?.firstElementChild?.textContent ?? ''
      return name.replace(/(Super-Admin|Lehrkraft|Bereichs-Admin)$/, '').trim()
    })

describe('Nutzerliste – Sortieren & Inaktiv-Filter (PROJ-57)', () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
    window.history.replaceState(null, '', '/admin/users')
  })

  it('sortiert standardmäßig nach XP absteigend und markiert die Spalte', async () => {
    await setup('admin')
    expect(rowNames()[0]).toBe('Anna Azubi')
    const xp = screen.getByRole('button', { name: /^XP/ }).closest('th')
    expect(xp).toHaveAttribute('aria-sort', 'descending')
  })

  it('Klick auf „Name“ sortiert A→Z, zweiter Klick Z→A, und schreibt die Adresse', async () => {
    await setup('admin')
    fireEvent.click(screen.getByRole('button', { name: /^Name/ }))
    expect(rowNames()).toEqual(['Anna Azubi', 'Bernd Bereich', 'Ich Selbst', 'Petra Lehrkraft'])
    expect(window.location.search).toBe('?sort=name&dir=asc')
    fireEvent.click(screen.getByRole('button', { name: /^Name/ }))
    expect(rowNames()[0]).toBe('Petra Lehrkraft')
    expect(screen.getByRole('button', { name: /^Name/ }).closest('th')).toHaveAttribute('aria-sort', 'descending')
  })

  it('liest Sortierung und Filter aus der Adresse', async () => {
    window.history.replaceState(null, '', '/admin/users?sort=login&dir=desc&aktiv=never')
    setup('admin').catch(() => {})
    // nie eingeloggt: Ich Selbst und Bernd Bereich
    await waitFor(() => expect(rowNames().sort()).toEqual(['Bernd Bereich', 'Ich Selbst']))
    expect(screen.getByRole('button', { name: /^Letzter Login/ }).closest('th')).toHaveAttribute('aria-sort', 'descending')
  })

  it('ausgeblendete Bereich-Sortierung: erster Klick auf XP dreht sichtbar um (QA BUG-57-1)', async () => {
    window.history.replaceState(null, '', '/admin/users?sort=department&dir=asc')
    await setup('admin')
    expect(screen.getByRole('button', { name: /^XP/ }).closest('th')).toHaveAttribute('aria-sort', 'descending')
    fireEvent.click(screen.getByRole('button', { name: /^XP/ }))
    expect(screen.getByRole('button', { name: /^XP/ }).closest('th')).toHaveAttribute('aria-sort', 'ascending')
  })

  it('zeigt bei leerem Filter-Ergebnis „Filter zurücksetzen“', async () => {
    await setup('admin')
    fireEvent.change(screen.getByLabelText('Name oder E-Mail suchen'), { target: { value: 'gibtsnicht' } })
    expect(screen.getByText('Niemand passt zu diesem Filter.')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Filter zurücksetzen' }))
    expect(screen.getByText('Anna Azubi')).toBeInTheDocument()
  })
})

describe('Nutzerliste – Passwort neu vergeben (PROJ-58)', () => {
  beforeEach(() => vi.unstubAllGlobals())

  it('Bereichs-Admin: Eintrag nur bei Azubis', async () => {
    await setup('department_admin')
    expect(menuOf('Anna Azubi')).toContain('Passwort neu vergeben')
    closeMenu()
    expect(screen.queryByRole('button', { name: 'Weitere Aktionen: Petra Lehrkraft' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Weitere Aktionen: Bernd Bereich' })).not.toBeInTheDocument()
  })

  it('Super-Admin: Eintrag bei allen außer sich selbst', async () => {
    await setup('admin')
    for (const name of ['Anna Azubi', 'Petra Lehrkraft', 'Bernd Bereich']) {
      expect(menuOf(name)).toContain('Passwort neu vergeben')
      closeMenu()
    }
    expect(screen.queryByRole('button', { name: 'Weitere Aktionen: Ich Selbst' })).not.toBeInTheDocument()
  })

  it('Dialog: Vorschlag, zu kurz gesperrt, nach dem Setzen gut lesbar angezeigt', async () => {
    await setup('admin')
    fireEvent.keyDown(screen.getByRole('button', { name: 'Weitere Aktionen: Anna Azubi' }), { key: 'Enter' })
    fireEvent.click(screen.getByRole('menuitem', { name: 'Passwort neu vergeben' }))
    const input = (await screen.findByLabelText('Neues Passwort')) as HTMLInputElement
    expect(input.value).toMatch(/^[A-Za-z]+-[A-Za-z]+-[A-Za-z]+-[2-9]{2}$/)

    fireEvent.change(input, { target: { value: 'kurz' } })
    expect(screen.getByRole('button', { name: 'Passwort setzen' })).toBeDisabled()
    expect(screen.getByText('Mindestens 8 Zeichen.')).toBeInTheDocument()

    fireEvent.change(input, { target: { value: 'Mein-Test-Passwort-22' } })
    const fetchMock = vi.fn(async () => ({ ok: true, json: async () => ({ ok: true }) }))
    vi.stubGlobal('fetch', fetchMock)
    fireEvent.click(screen.getByRole('button', { name: 'Passwort setzen' }))

    expect(await screen.findByText('Passwort gesetzt')).toBeInTheDocument()
    expect(screen.getByLabelText('Neues Passwort')).toHaveTextContent('Mein-Test-Passwort-22')
    expect(fetchMock).toHaveBeenCalledWith('/api/admin/users/s1/password', expect.objectContaining({ method: 'POST' }))
  })

  it('Dialog: Fehler der Schnittstelle bleibt sichtbar, Eingabe bleibt erhalten', async () => {
    await setup('admin')
    fireEvent.keyDown(screen.getByRole('button', { name: 'Weitere Aktionen: Anna Azubi' }), { key: 'Enter' })
    fireEvent.click(screen.getByRole('menuitem', { name: 'Passwort neu vergeben' }))
    const input = (await screen.findByLabelText('Neues Passwort')) as HTMLInputElement
    fireEvent.change(input, { target: { value: 'Mein-Test-Passwort-22' } })
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, json: async () => ({ error: 'Zu viele Passwörter' }) })))
    fireEvent.click(screen.getByRole('button', { name: 'Passwort setzen' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Zu viele Passwörter')
    expect(input.value).toBe('Mein-Test-Passwort-22')
    expect(screen.getByRole('button', { name: 'Erneut versuchen' })).toBeEnabled()
  })
})

describe('Nutzerliste – Link zur Detailseite (PROJ-59)', () => {
  beforeEach(() => vi.unstubAllGlobals())

  it('Super-Admin: der Name ist ein Link auf die Detailseite', async () => {
    await setup('admin')
    expect(screen.getByRole('link', { name: 'Anna Azubi' })).toHaveAttribute('href', '/admin/users/s1')
  })

  it('Bereichs-Admin: kein Link, nur der Name', async () => {
    await setup('department_admin')
    expect(screen.queryByRole('link', { name: 'Anna Azubi' })).not.toBeInTheDocument()
    expect(screen.getByText('Anna Azubi')).toBeInTheDocument()
  })
})

describe('Nutzerliste – Mehrfachauswahl & Export (PROJ-61)', () => {
  const BULK_URL = '/api/admin/users/bulk'
  let calls: { url: string; body: unknown }[]
  let exportLogOk = true
  let createObjectURL: ReturnType<typeof vi.fn>

  function mockFetch(bulkResults?: (ids: string[]) => unknown[]) {
    calls = []
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, init?: { body?: string }) => {
        const body = init?.body ? JSON.parse(init.body) : undefined
        calls.push({ url, body })
        if (url.startsWith('/api/admin/users?') || url === '/api/admin/users') return { ok: true, json: async () => ({ users: USERS }) }
        if (url === '/api/admin/departments') return { ok: true, json: async () => ({ departments: [{ id: 'd2', name: 'Tourismus' }] }) }
        if (url === '/api/admin/users/export-log') {
          return { ok: exportLogOk, json: async () => (exportLogOk ? { ok: true } : { error: 'Der Export konnte nicht protokolliert werden.' }) }
        }
        if (url === BULK_URL) {
          const ids = body.ids as string[]
          const results = bulkResults ? bulkResults(ids) : ids.map((id) => ({ id, status: 'done' }))
          return { ok: true, json: async () => ({ results }) }
        }
        return { ok: true, json: async () => ({}) }
      }),
    )
  }

  async function setupAs(role: TeacherRole) {
    mockFetch()
    render(
      <AdminRoleProvider value={{ role, isSuperAdmin: role === 'admin' }}>
        <AdminUsersPage />
      </AdminRoleProvider>,
    )
    await screen.findByText('Anna Azubi')
  }

  const rowCheckbox = (name: string) => screen.getByRole('checkbox', { name: `${name} auswählen` })
  const headCheckbox = () => screen.getByRole('checkbox', { name: 'Alle sichtbaren Nutzer auswählen' })

  beforeEach(async () => {
    vi.unstubAllGlobals()
    exportLogOk = true
    window.history.replaceState(null, '', '/admin/users')
    createObjectURL = vi.fn(() => 'blob:test')
    Object.assign(URL, { createObjectURL, revokeObjectURL: vi.fn() })
    const { toast } = await import('sonner')
    vi.mocked(toast.success).mockClear()
    vi.mocked(toast.error).mockClear()
  })

  it('Bereichs-Admin sieht weder Checkboxen noch Export', async () => {
    await setupAs('department_admin')
    expect(screen.queryAllByRole('checkbox')).toHaveLength(0)
    expect(button(/Exportieren/)).not.toBeInTheDocument()
  })

  it('Super-Admin: Checkbox je Zeile, das eigene Konto ist nicht wählbar, erste Spalte steht nicht fest', async () => {
    await setupAs('admin')
    expect(rowCheckbox('Anna Azubi')).toBeEnabled()
    expect(rowCheckbox('Ich Selbst')).toBeDisabled()
    expect(document.querySelector('.ws-table-sticky')).toBeNull()
  })

  it('Kopf-Checkbox wählt alle sichtbaren (ohne das eigene Konto) an und ab, bei Teilauswahl „gemischt“', async () => {
    await setupAs('admin')
    fireEvent.click(rowCheckbox('Anna Azubi'))
    expect(headCheckbox()).toHaveAttribute('aria-checked', 'mixed')
    expect(screen.getByText('1 ausgewählt')).toBeInTheDocument()

    fireEvent.click(headCheckbox())
    expect(headCheckbox()).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByText('3 ausgewählt')).toBeInTheDocument()

    fireEvent.click(headCheckbox())
    expect(screen.queryByText(/ausgewählt$/)).not.toBeInTheDocument()
  })

  it('Auswahl bleibt bei neuem Filter erhalten, die Leiste zählt nur Sichtbares', async () => {
    await setupAs('admin')
    fireEvent.click(headCheckbox())
    fireEvent.change(screen.getByLabelText('Name oder E-Mail suchen'), { target: { value: 'anna' } })
    expect(screen.getByText('1 ausgewählt')).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Name oder E-Mail suchen'), { target: { value: '' } })
    expect(screen.getByText('3 ausgewählt')).toBeInTheDocument()
  })

  it('„Auswahl aufheben“ leert die Auswahl', async () => {
    await setupAs('admin')
    fireEvent.click(headCheckbox())
    fireEvent.click(screen.getByRole('button', { name: /Auswahl aufheben/ }))
    expect(screen.queryByText(/ausgewählt$/)).not.toBeInTheDocument()
  })

  it('Sperren: fragt mit Anzahl und Namen nach, schickt nur die Ids der Auswahl und meldet das Ergebnis', async () => {
    const { toast } = await import('sonner')
    await setupAs('admin')
    fireEvent.click(rowCheckbox('Anna Azubi'))
    fireEvent.click(rowCheckbox('Petra Lehrkraft'))
    fireEvent.click(within(screen.getByRole('region', { name: 'Aktionen für die Auswahl' })).getByRole('button', { name: /Sperren/ }))

    const dialog = await screen.findByRole('alertdialog')
    expect(dialog).toHaveTextContent('2 Konten werden gesperrt: Anna Azubi, Petra Lehrkraft')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Sperren' }))

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('2 gesperrt'))
    const bulkCall = calls.find((c) => c.url === BULK_URL)
    expect(bulkCall?.body).toEqual({ action: 'ban', ids: ['s1', 't1'] })
    // erledigte Personen sind abgewählt
    await waitFor(() => expect(screen.queryByText(/ausgewählt$/)).not.toBeInTheDocument())
  })

  it('Sperren lässt schon gesperrte Personen aus', async () => {
    mockFetch()
    USERS[1].banned = true
    try {
      render(
        <AdminRoleProvider value={{ role: 'admin', isSuperAdmin: true }}>
          <AdminUsersPage />
        </AdminRoleProvider>,
      )
      await screen.findByText('Anna Azubi')
      fireEvent.click(rowCheckbox('Anna Azubi'))
      fireEvent.click(rowCheckbox('Petra Lehrkraft'))
      fireEvent.click(within(screen.getByRole('region', { name: 'Aktionen für die Auswahl' })).getByRole('button', { name: /^Sperren/ }))
      const dialog = await screen.findByRole('alertdialog')
      expect(dialog).toHaveTextContent('1 Konto wird gesperrt: Petra Lehrkraft')
      expect(dialog).toHaveTextContent('1 ist schon gesperrt und wird ausgelassen.')
    } finally {
      USERS[1].banned = false
    }
  })

  it('Teilergebnis: übersprungene und fehlgeschlagene Konten bleiben markiert, Toast nennt die Zahlen', async () => {
    const { toast } = await import('sonner')
    mockFetch((ids) => [
      { id: ids[0], status: 'done' },
      { id: ids[1], status: 'skipped', reason: 'super_admin' },
      { id: ids[2], status: 'failed' },
    ])
    render(
      <AdminRoleProvider value={{ role: 'admin', isSuperAdmin: true }}>
        <AdminUsersPage />
      </AdminRoleProvider>,
    )
    await screen.findByText('Anna Azubi')
    fireEvent.click(headCheckbox())
    fireEvent.click(within(screen.getByRole('region', { name: 'Aktionen für die Auswahl' })).getByRole('button', { name: /Sperren/ }))
    fireEvent.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Sperren' }))

    await waitFor(() => expect(toast.error).toHaveBeenCalled())
    expect(vi.mocked(toast.error).mock.calls[0][0]).toBe('1 von 3 gesperrt, 1 übersprungen, 1 fehlgeschlagen')
    expect(await screen.findByText('2 ausgewählt')).toBeInTheDocument()
  })

  it('Bereich ändern: ohne Ziel-Bereich kein Start, Auswahlfeld für den Ziel-Bereich', async () => {
    await setupAs('admin')
    fireEvent.click(rowCheckbox('Anna Azubi'))
    fireEvent.click(within(screen.getByRole('region', { name: 'Aktionen für die Auswahl' })).getByRole('button', { name: /Bereich ändern/ }))
    const dialog = await screen.findByRole('alertdialog')
    expect(within(dialog).getByRole('button', { name: 'Bereich ändern' })).toBeDisabled()
    expect(within(dialog).getByRole('combobox', { name: 'Ziel-Bereich' })).toBeInTheDocument()
  })

  it('Große Auswahl wird in Teilen zu je 100 geschickt', async () => {
    const many = Array.from({ length: 230 }, (_, i) => ({
      id: `m${i}`, display_name: `Person ${i}`, email: `p${i}@example.de`, role: 'student', department_id: 'd1',
      total_xp: i, current_streak: 0, last_session_date: null, banned: false,
    }))
    calls = []
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, init?: { body?: string }) => {
        const body = init?.body ? JSON.parse(init.body) : undefined
        calls.push({ url, body })
        if (url.startsWith('/api/admin/users')) {
          if (url === BULK_URL) return { ok: true, json: async () => ({ results: body.ids.map((id: string) => ({ id, status: 'done' })) }) }
          return { ok: true, json: async () => ({ users: many }) }
        }
        return { ok: true, json: async () => ({}) }
      }),
    )
    render(
      <AdminRoleProvider value={{ role: 'admin', isSuperAdmin: true }}>
        <AdminUsersPage />
      </AdminRoleProvider>,
    )
    await screen.findByText('Person 229')
    fireEvent.click(headCheckbox())
    fireEvent.click(within(screen.getByRole('region', { name: 'Aktionen für die Auswahl' })).getByRole('button', { name: /Sperren/ }))
    const dialog = await screen.findByRole('alertdialog')
    expect(dialog).toHaveTextContent('230 Konten werden gesperrt')
    expect(dialog).toHaveTextContent('und 225 weitere')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Sperren' }))
    const { toast } = await import('sonner')
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('230 gesperrt'))
    expect(calls.filter((c) => c.url === BULK_URL).map((c) => (c.body as { ids: string[] }).ids.length)).toEqual([100, 100, 30])
  })

  it('Export ohne Auswahl: protokolliert zuerst, lädt dann alle sichtbaren Zeilen herunter', async () => {
    const { toast } = await import('sonner')
    await setupAs('admin')
    fireEvent.click(screen.getByRole('button', { name: /Exportieren/ }))
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('4 Zeilen exportiert'))
    const log = calls.find((c) => c.url === '/api/admin/users/export-log')
    expect(log?.body).toEqual({
      count: 4, selection_only: false, scope: 'department', role: 'all', activity: 'all', sort: 'xp', dir: 'desc', has_search: false,
    })
    expect(createObjectURL).toHaveBeenCalledTimes(1)
    const blob = createObjectURL.mock.calls[0][0] as Blob
    expect(blob.type).toBe('text/csv;charset=utf-8')
  })

  it('Export ohne Protokoll: kein Download, Fehlermeldung', async () => {
    const { toast } = await import('sonner')
    exportLogOk = false
    await setupAs('admin')
    fireEvent.click(screen.getByRole('button', { name: /Exportieren/ }))
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Der Export konnte nicht protokolliert werden.'))
    expect(createObjectURL).not.toHaveBeenCalled()
  })

  it('Export ist bei leerer Liste deaktiviert', async () => {
    await setupAs('admin')
    fireEvent.change(screen.getByLabelText('Name oder E-Mail suchen'), { target: { value: 'gibtsnicht' } })
    expect(screen.getByRole('button', { name: /Exportieren/ })).toBeDisabled()
  })

  it('Export mit Auswahl: Menü bietet „Nur Auswahl“ und „Alle sichtbaren“ an', async () => {
    await setupAs('admin')
    fireEvent.click(rowCheckbox('Anna Azubi'))
    const trigger = screen.getAllByRole('button', { name: /Exportieren/ })[0]
    fireEvent.pointerDown(trigger, { button: 0, ctrlKey: false, pointerType: 'mouse' })
    expect(await screen.findByRole('menuitem', { name: 'Nur Auswahl (1)' })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: 'Alle sichtbaren (4)' })).toBeInTheDocument()
  })
})
