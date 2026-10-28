import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { KontoUeberMich } from './konto-ueber-mich'
import { KontoAufgabenKarte } from './konto-aufgaben'
import { KontoBeitragKarte } from './konto-beitrag'
import { KontoAnmeldung } from './konto-anmeldung'
import { KontoFaecher } from './konto-faecher'
import type { KontoAufgaben, KontoBeitrag, KontoHead } from '@/lib/konto-data'

const refresh = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh, replace: vi.fn(), push: vi.fn() }),
  usePathname: () => '/admin/konto',
  useSearchParams: () => new URLSearchParams(),
}))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const head: KontoHead = {
  displayName: 'Max Muster',
  email: 'max@schule.de',
  hasPassword: true,
  kuerzel: null,
  role: 'teacher',
  departmentName: 'Spedition',
}

const fetchMock = vi.fn()
beforeEach(() => {
  vi.clearAllMocks()
  vi.stubGlobal('fetch', fetchMock)
  fetchMock.mockResolvedValue({ ok: true, json: () => Promise.resolve({}) })
})

describe('Karte „Über mich“ (PROJ-50)', () => {
  it('zeigt Rolle, Fachbereich und „Noch keins gesetzt“ ohne Kürzel', () => {
    render(<KontoUeberMich head={head} />)
    expect(screen.getByText('Max Muster')).toBeInTheDocument()
    expect(screen.getByText('Lehrkraft')).toBeInTheDocument()
    expect(screen.getByText('Spedition')).toBeInTheDocument()
    expect(screen.getByText('Noch keins gesetzt')).toBeInTheDocument()
  })

  it('lehnt ein ungültiges Kürzel am Feld ab, ohne zu senden', async () => {
    render(<KontoUeberMich head={head} />)
    fireEvent.click(screen.getByRole('button', { name: 'Kürzel festlegen' }))
    fireEvent.change(screen.getByLabelText('Kürzel'), { target: { value: 'A1' } })
    fireEvent.click(screen.getByRole('button', { name: 'Kürzel speichern' }))
    expect(screen.getByRole('alert')).toHaveTextContent(/Buchstaben/)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('speichert ein gültiges Kürzel groß geschrieben', async () => {
    render(<KontoUeberMich head={head} />)
    fireEvent.click(screen.getByRole('button', { name: 'Kürzel festlegen' }))
    fireEvent.change(screen.getByLabelText('Kürzel'), { target: { value: 'mu' } })
    fireEvent.click(screen.getByRole('button', { name: 'Kürzel speichern' }))
    await waitFor(() => expect(fetchMock).toHaveBeenCalled())
    expect(fetchMock.mock.calls[0][0]).toBe('/api/profile/kuerzel')
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ kuerzel: 'MU' })
    await waitFor(() => expect(refresh).toHaveBeenCalled())
  })
})

describe('Karte „Offene Aufgaben“', () => {
  const group = (titles: string[], total = titles.length) => ({ items: titles.map((t, i) => ({ id: `${t}-${i}`, title: t, submissions: 2 })), total })
  const section = (over: Partial<KontoAufgaben>) => ({
    ok: true as const,
    data: { drafts: group([]), running: group([]), unseen: group([]), ...over },
  })

  it('sagt „Alles erledigt“, wenn nichts offen ist, und zeigt keine leeren Gruppen', () => {
    render(<KontoAufgabenKarte section={section({})} />)
    expect(screen.getByText(/Alles erledigt/)).toBeInTheDocument()
    expect(screen.queryByText('Entwürfe')).not.toBeInTheDocument()
  })

  it('zeigt nur Gruppen mit Einträgen, Abgaben bei laufenden und „Alle anzeigen“ ab 6', () => {
    render(<KontoAufgabenKarte section={section({ running: group(['LF5 Test'], 1), drafts: group(['A', 'B', 'C', 'D', 'E'], 8) })} />)
    expect(screen.getByRole('link', { name: /LF5 Test/ })).toHaveAttribute('href', '/admin/leistungsnachweise/LF5 Test-0')
    expect(screen.getByText('2 Abgaben')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Alle 8 anzeigen' })).toHaveAttribute('href', '/admin/leistungsnachweise?status=draft')
    expect(screen.queryByText('Auswertung noch nicht angesehen')).not.toBeInTheDocument()
  })

  it('zeigt bei einem Fehler nur diese Karte als Fehler', () => {
    render(<KontoAufgabenKarte section={{ ok: false }} />)
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })
})

describe('Karte „Mein Beitrag“', () => {
  const data = (over: Partial<KontoBeitrag> = {}): { ok: true; data: KontoBeitrag } => ({
    ok: true,
    data: { questionsCreated: 3, changes: 12, assessments: 1, recent: [], ...over },
  })

  it('nennt den Stichtag der Zählung und die drei Zahlen', () => {
    render(<KontoBeitragKarte section={data()} />)
    expect(screen.getByText(/Gezählt seit 27\.10\.2026/)).toBeInTheDocument()
    expect(screen.getByText('Fragen angelegt').previousSibling).toHaveTextContent('3')
    expect(screen.getByText('Änderungen').previousSibling).toHaveTextContent('12')
  })

  it('führt Gelöschtes in den Papierkorb und macht endgültig Gelöschtes nicht anklickbar', () => {
    const at = new Date().toISOString()
    render(
      <KontoBeitragKarte
        section={data({
          recent: [
            { key: 'question:1', type: 'question', title: 'Was ist CMR?', deleted: true, gone: false, at },
            { key: 'topic:2', type: 'topic', title: 'Incoterms', deleted: true, gone: true, at },
            { key: 'subject:3', type: 'subject', title: 'Zoll', deleted: false, gone: false, at },
          ],
        })}
      />,
    )
    expect(screen.getByRole('link', { name: /Was ist CMR\?/ })).toHaveAttribute('href', '/admin/papierkorb')
    expect(screen.getByRole('link', { name: /Zoll/ })).toHaveAttribute('href', '/admin/subjects')
    expect(screen.queryByRole('link', { name: /Incoterms/ })).not.toBeInTheDocument()
    expect(screen.getAllByText('gelöscht')).toHaveLength(2)
  })

  it('zeigt ohne Aktivität einen Leerzustand', () => {
    render(<KontoBeitragKarte section={data({ changes: 0, assessments: 0, questionsCreated: 0 })} />)
    expect(screen.getByText('Noch nichts bearbeitet')).toBeInTheDocument()
  })
})

describe('Karte „Anmeldung“', () => {
  const emailHead = { email: 'max@schule.de', hasPassword: true }
  const fill = (neu: string, wieder: string, passwort: string) => {
    fireEvent.change(screen.getByLabelText('Neue E-Mail-Adresse'), { target: { value: neu } })
    fireEvent.change(screen.getByLabelText('Neue Adresse wiederholen'), { target: { value: wieder } })
    const pw = screen.getByLabelText('Aktuelles Passwort', { selector: '#konto-email-passwort' })
    fireEvent.change(pw, { target: { value: passwort } })
    fireEvent.click(screen.getByRole('button', { name: 'Adresse ändern' }))
  }

  it('sagt ehrlich, dass die Adresse sofort und ohne Bestätigungs-Mail gilt', () => {
    render(<KontoAnmeldung head={emailHead} />)
    expect(screen.getByText(/gilt sofort für die Anmeldung/)).toBeInTheDocument()
    expect(screen.queryByText(/Bestätigungslink/)).not.toBeInTheDocument()
  })

  it('verlangt zweimal dieselbe Adresse und das Passwort, bevor etwas gesendet wird', () => {
    render(<KontoAnmeldung head={emailHead} />)
    fill('keine-adresse', '', '')
    expect(screen.getAllByRole('alert').map((a) => a.textContent).join(' ')).toMatch(/gültige E-Mail/)
    fill('neu@schule.de', 'anders@schule.de', 'pw')
    expect(screen.getAllByRole('alert').map((a) => a.textContent).join(' ')).toMatch(/nicht gleich/)
    fill('MAX@schule.de', 'MAX@schule.de', 'pw')
    expect(screen.getAllByRole('alert').map((a) => a.textContent).join(' ')).toMatch(/schon deine aktuelle/)
    fill('neu@schule.de', 'neu@schule.de', '')
    expect(screen.getAllByRole('alert').map((a) => a.textContent).join(' ')).toMatch(/aktuelles Passwort/)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('sendet Adresse und Passwort und lädt danach neu', async () => {
    render(<KontoAnmeldung head={emailHead} />)
    fill('Neu@Schule.de', 'neu@schule.de', 'mein-passwort')
    await waitFor(() => expect(fetchMock).toHaveBeenCalled())
    expect(fetchMock.mock.calls[0][0]).toBe('/api/profile/email')
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ email: 'Neu@Schule.de', currentPassword: 'mein-passwort' })
    await waitFor(() => expect(refresh).toHaveBeenCalled())
  })

  it('zeigt „falsches Passwort“ der Server-Antwort am Passwort-Feld', async () => {
    fetchMock.mockResolvedValue({ ok: false, json: () => Promise.resolve({ error: 'Das aktuelle Passwort stimmt nicht.', field: 'currentPassword' }) })
    render(<KontoAnmeldung head={emailHead} />)
    fill('neu@schule.de', 'neu@schule.de', 'falsch')
    expect(await screen.findByText('Das aktuelle Passwort stimmt nicht.')).toBeInTheDocument()
  })

  it('lässt Google-/Apple-Konten die Adresse nicht ändern', () => {
    render(<KontoAnmeldung head={{ email: 'max@gmail.com', hasPassword: false }} />)
    expect(screen.getByText(/Die Adresse kannst du dort ändern/)).toBeInTheDocument()
    expect(screen.queryByLabelText('Neue E-Mail-Adresse')).not.toBeInTheDocument()
  })

  it('verlangt beim Passwortwechsel das aktuelle Passwort und prüft Länge und Wiederholung', async () => {
    render(<KontoAnmeldung head={{ email: 'max@schule.de', hasPassword: true }} />)
    fireEvent.change(screen.getByLabelText('Neues Passwort'), { target: { value: 'kurz' } })
    fireEvent.change(screen.getByLabelText('Neues Passwort wiederholen'), { target: { value: 'anders' } })
    fireEvent.click(screen.getByRole('button', { name: 'Passwort ändern' }))
    const alerts = screen.getAllByRole('alert').map((a) => a.textContent)
    expect(alerts.join(' ')).toMatch(/aktuelles Passwort/)
    expect(alerts.join(' ')).toMatch(/mindestens 8/)
    expect(alerts.join(' ')).toMatch(/nicht gleich/)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('zeigt Google-/Apple-Konten „Passwort festlegen“ ohne Feld für das aktuelle Passwort', () => {
    render(<KontoAnmeldung head={{ email: 'max@schule.de', hasPassword: false }} />)
    expect(screen.getByRole('button', { name: 'Passwort festlegen' })).toBeInTheDocument()
    expect(screen.queryByLabelText('Aktuelles Passwort', { selector: '#konto-pw-alt' })).not.toBeInTheDocument()
  })

  it('zeigt die Server-Meldung am Feld „Aktuelles Passwort“, wenn es falsch ist', async () => {
    fetchMock.mockResolvedValue({ ok: false, json: () => Promise.resolve({ error: 'Das aktuelle Passwort stimmt nicht.', field: 'currentPassword' }) })
    render(<KontoAnmeldung head={{ email: 'max@schule.de', hasPassword: true }} />)
    fireEvent.change(screen.getByLabelText('Aktuelles Passwort', { selector: '#konto-pw-alt' }), { target: { value: 'falsch' } })
    fireEvent.change(screen.getByLabelText('Neues Passwort'), { target: { value: 'neues-passwort' } })
    fireEvent.change(screen.getByLabelText('Neues Passwort wiederholen'), { target: { value: 'neues-passwort' } })
    fireEvent.click(screen.getByRole('button', { name: 'Passwort ändern' }))
    expect(await screen.findByText('Das aktuelle Passwort stimmt nicht.')).toBeInTheDocument()
  })
})

describe('Karte „Meine Fächer“', () => {
  it('sagt Bereichs-Admins, was sie sehen, ohne Eintrag-Formular und ohne Abruf', () => {
    render(<KontoFaecher role="department_admin" departmentName="Spedition" />)
    expect(screen.getByText(/Du siehst den ganzen Bereich Spedition/)).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('zeigt einer Lehrkraft ihre Fächer und lässt sie austragen', async () => {
    fetchMock.mockImplementation((url: string, init?: { method?: string }) => {
      if (init?.method === 'DELETE') return Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            departments: [{ id: 'd1', name: 'Spedition', code: 'SPED' }],
            subjects: [{ id: 's1', name: 'Speditionsrecht', code: 'STG', department_id: 'd1' }],
            assignments: [{ id: 'a1', department_id: 'd1', subject_id: 's1' }],
          }),
      })
    })
    render(<KontoFaecher role="teacher" departmentName="Spedition" />)
    expect(await screen.findByText('Speditionsrecht')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Speditionsrecht austragen' }))
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/admin/my-subjects/a1', { method: 'DELETE' }))
  })
})
