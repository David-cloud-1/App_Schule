import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { CreateAccountDialog } from './create-account-dialog'
import { AdminRoleProvider } from '@/components/admin/admin-role-provider'

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))
// Der Druck selbst (Portal, window.print) wird in access-slips.test.tsx geprüft
vi.mock('@/components/admin/access-slips', () => ({
  AccessSlipsPrint: ({ accounts }: { accounts: { name: string }[] }) => (
    <div data-testid="zettel">{accounts.map((a) => a.name).join(',')}</div>
  ),
}))

const DEPARTMENTS = [
  { id: 'd1', name: 'Spedition', code: 'SPED' },
  { id: 'd2', name: 'Tourismus', code: 'TOUR' },
]

function setup(current: string | null = 'd1') {
  const onCreated = vi.fn()
  const onOpenChange = vi.fn()
  render(
    <AdminRoleProvider value={{ role: 'admin', isSuperAdmin: true, scope: { current, departments: DEPARTMENTS } }}>
      <CreateAccountDialog open onOpenChange={onOpenChange} onCreated={onCreated} />
    </AdminRoleProvider>,
  )
  return { onCreated, onOpenChange }
}

const submit = () => screen.getByRole('button', { name: 'Konto anlegen' })

function fill(name: string, email: string) {
  fireEvent.change(screen.getByLabelText('Anzeigename'), { target: { value: name } })
  fireEvent.change(screen.getByLabelText('E-Mail'), { target: { value: email } })
}

describe('Konto einzeln anlegen (PROJ-62)', () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
    // Das Häkchen (Radix) misst seine Größe; jsdom kennt ResizeObserver nicht
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    )
  })

  it('lässt „Konto anlegen“ erst zu, wenn Name, gültige E-Mail und Bereich da sind', () => {
    setup()
    expect(submit()).toBeDisabled()
    fill('Anna Azubi', 'keine-mail')
    expect(submit()).toBeDisabled()
    expect(screen.getByText('Bitte eine gültige E-Mail-Adresse eintragen.')).toBeInTheDocument()
    fill('Anna Azubi', 'anna@example.de')
    expect(submit()).toBeEnabled()
  })

  it('schlägt ein Passwort vor und verlangt mindestens 8 Zeichen', () => {
    setup()
    const password = screen.getByLabelText('Start-Passwort') as HTMLInputElement
    expect(password.value.length).toBeGreaterThanOrEqual(8)
    fill('Anna Azubi', 'anna@example.de')
    fireEvent.change(password, { target: { value: 'kurz' } })
    expect(submit()).toBeDisabled()
    expect(screen.getByText('Mindestens 8 Zeichen.')).toBeInTheDocument()
  })

  it('wählt den Bereich vor, in dem der Super-Admin gerade arbeitet', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({ account: { name: 'Anna Azubi', email: 'anna@example.de', password: 'Hafen-Kran-Birke-47', role: 'student', departmentName: 'Tourismus' } }),
    }))
    vi.stubGlobal('fetch', fetchMock)
    setup('d2')
    fill('  Anna Azubi ', ' anna@example.de ')
    fireEvent.click(submit())
    await screen.findByText('Konto angelegt')
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('/api/admin/users/create')
    expect(JSON.parse(init.body as string)).toMatchObject({
      name: 'Anna Azubi',
      email: 'anna@example.de',
      role: 'student',
      departmentId: 'd2',
    })
  })

  it('zeigt danach die Zugangsdaten einmalig und meldet das Anlegen an die Liste', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => ({ account: { name: 'Anna Azubi', email: 'anna@example.de', password: 'Hafen-Kran-Birke-47', role: 'student', departmentName: 'Spedition' } }),
      })),
    )
    const { onCreated } = setup()
    fill('Anna Azubi', 'anna@example.de')
    fireEvent.click(submit())
    expect(await screen.findByLabelText('Start-Passwort', { selector: 'output' })).toHaveTextContent('Hafen-Kran-Birke-47')
    expect(screen.getByText(/später nicht mehr abrufbar/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Kopieren/ })).toBeInTheDocument()
    expect(onCreated).toHaveBeenCalledTimes(1)
  })

  it('„Zettel drucken“ öffnet die Druckansicht mit dem neuen Konto', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => ({ account: { name: 'Anna Azubi', email: 'anna@example.de', password: 'Hafen-Kran-Birke-47', role: 'student', departmentName: 'Spedition' } }),
      })),
    )
    setup()
    fill('Anna Azubi', 'anna@example.de')
    fireEvent.click(submit())
    fireEvent.click(await screen.findByRole('button', { name: /Zettel drucken/ }))
    expect(screen.getByTestId('zettel')).toHaveTextContent('Anna Azubi')
  })

  it('zeigt die Meldung des Servers und bleibt im Formular (z. B. Konto existiert schon)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: false,
        json: async () => ({ error: 'Konto existiert schon – Passwort ggf. über „Passwort neu vergeben“ setzen.' }),
      })),
    )
    const { onCreated } = setup()
    fill('Anna Azubi', 'anna@example.de')
    fireEvent.click(submit())
    expect(await screen.findByRole('alert')).toHaveTextContent('Konto existiert schon')
    expect(onCreated).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Erneut versuchen' })).toBeEnabled()
  })

  it('Super-Admin als Rolle braucht eine ausdrückliche Bestätigung', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({ account: { name: 'Bert Boss', email: 'bert@example.de', password: 'Hafen-Kran-Birke-47', role: 'admin', departmentName: 'Spedition' } }),
    }))
    vi.stubGlobal('fetch', fetchMock)
    setup()
    fill('Bert Boss', 'bert@example.de')
    fireEvent.click(screen.getByRole('radio', { name: 'Super-Admin' }))
    expect(submit()).toBeDisabled()
    fireEvent.click(screen.getByRole('checkbox', { name: /alle Rechte des Super-Admins/ }))
    expect(submit()).toBeEnabled()
    fireEvent.click(submit())
    await waitFor(() => expect(fetchMock).toHaveBeenCalled())
  })

  it('der Wechsel der Rolle nimmt die Bestätigung zurück', () => {
    setup()
    fill('Bert Boss', 'bert@example.de')
    fireEvent.click(screen.getByRole('radio', { name: 'Super-Admin' }))
    fireEvent.click(screen.getByRole('checkbox', { name: /alle Rechte des Super-Admins/ }))
    fireEvent.click(screen.getByRole('radio', { name: 'Lehrkraft' }))
    fireEvent.click(screen.getByRole('radio', { name: 'Super-Admin' }))
    expect(screen.getByRole('checkbox', { name: /alle Rechte des Super-Admins/ })).not.toBeChecked()
    expect(submit()).toBeDisabled()
  })
})
