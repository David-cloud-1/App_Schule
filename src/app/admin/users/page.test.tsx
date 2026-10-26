import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import AdminUsersPage from './page'
import { AdminRoleProvider } from '@/components/admin/admin-role-provider'
import type { TeacherRole } from '@/lib/roles'

vi.mock('@/lib/supabase-browser', () => ({
  createClient: () => ({ auth: { getUser: async () => ({ data: { user: { id: 'self-id' } } }) } }),
}))
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))

const USERS = [
  { id: 'self-id', display_name: 'Ich Selbst', email: 'ich@example.de', role: 'admin', department_id: 'd1', total_xp: 0, current_streak: 0, last_session_date: null, banned: false },
  { id: 's1', display_name: 'Anna Azubi', email: 'anna@example.de', role: 'student', department_id: 'd1', total_xp: 10, current_streak: 1, last_session_date: null, banned: false },
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

  it('zeigt den letzten Login nur bei Lehrer-Rollen', async () => {
    await setup('admin')
    const row = (name: string) => screen.getByText(name).closest('tr') as HTMLElement
    await waitFor(() => expect(row('Petra Lehrkraft')).toHaveTextContent('20.10.2026'))
    expect(row('Anna Azubi')).not.toHaveTextContent('20.10.2026')
  })

  it('zeigt den Schalter „Alle Bereiche“ nur dem Super-Admin', async () => {
    await setup('department_admin')
    expect(screen.queryByLabelText('Alle Bereiche')).not.toBeInTheDocument()
  })
})
