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

const button = (name: RegExp) => screen.queryByRole('button', { name })

describe('Nutzerverwaltung – Knöpfe je Rolle (PROJ-44, QA BUG-3/5a)', () => {
  beforeEach(() => vi.unstubAllGlobals())

  it('Bereichs-Admin: sperren und verschieben nur bei Azubis, bei Lehrer-Konten gesperrt bzw. ausgeblendet', async () => {
    await setup('department_admin')
    expect(button(/Anna Azubi sperren/)).toBeEnabled()
    expect(button(/Anna Azubi in anderen Fachbereich/)).toBeInTheDocument()

    for (const name of ['Petra Lehrkraft', 'Bernd Bereich']) {
      expect(button(new RegExp(`${name} sperren`))).toBeDisabled()
      expect(button(new RegExp(`${name} in anderen Fachbereich`))).not.toBeInTheDocument()
    }
  })

  it('Super-Admin: kann Lehrkraft und Bereichs-Admin verschieben und sperren (BUG-3)', async () => {
    await setup('admin')
    for (const name of ['Anna Azubi', 'Petra Lehrkraft', 'Bernd Bereich']) {
      expect(button(new RegExp(`${name} sperren`))).toBeEnabled()
      expect(button(new RegExp(`${name} in anderen Fachbereich`))).toBeInTheDocument()
    }
  })

  it('Super-Admin: sich selbst weder sperren noch verschieben', async () => {
    await setup('admin')
    expect(button(/Ich Selbst sperren/)).toBeDisabled()
    expect(button(/Ich Selbst in anderen Fachbereich/)).not.toBeInTheDocument()
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

const rowNames = () =>
  screen
    .getAllByRole('row')
    .slice(1)
    .map((r) => within(r).getAllByRole('cell')[0]?.textContent?.replace(/(Super-Admin|Lehrkraft|Bereichs-Admin)$/, '').trim())

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

  it('Bereichs-Admin: Knopf nur bei Azubis', async () => {
    await setup('department_admin')
    expect(button(/Passwort für Anna Azubi neu vergeben/)).toBeInTheDocument()
    expect(button(/Passwort für Petra Lehrkraft neu vergeben/)).not.toBeInTheDocument()
    expect(button(/Passwort für Bernd Bereich neu vergeben/)).not.toBeInTheDocument()
  })

  it('Super-Admin: Knopf bei allen außer sich selbst', async () => {
    await setup('admin')
    for (const name of ['Anna Azubi', 'Petra Lehrkraft', 'Bernd Bereich']) {
      expect(button(new RegExp(`Passwort für ${name} neu vergeben`))).toBeInTheDocument()
    }
    expect(button(/Passwort für Ich Selbst neu vergeben/)).not.toBeInTheDocument()
  })

  it('Dialog: Vorschlag, zu kurz gesperrt, nach dem Setzen gut lesbar angezeigt', async () => {
    await setup('admin')
    fireEvent.click(button(/Passwort für Anna Azubi neu vergeben/)!)
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
    fireEvent.click(button(/Passwort für Anna Azubi neu vergeben/)!)
    const input = (await screen.findByLabelText('Neues Passwort')) as HTMLInputElement
    fireEvent.change(input, { target: { value: 'Mein-Test-Passwort-22' } })
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, json: async () => ({ error: 'Zu viele Passwörter' }) })))
    fireEvent.click(screen.getByRole('button', { name: 'Passwort setzen' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Zu viele Passwörter')
    expect(input.value).toBe('Mein-Test-Passwort-22')
    expect(screen.getByRole('button', { name: 'Erneut versuchen' })).toBeEnabled()
  })
})
