import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'

// Radix-Checkboxen messen ihre Größe; jsdom kennt ResizeObserver nicht
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
}

const push = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, replace: vi.fn(), back: vi.fn() }),
  usePathname: () => '/admin/schulrecht',
  useSearchParams: () => new URLSearchParams(),
}))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const ladeThemen = vi.fn()
const sucheFundstellen = vi.fn()
vi.mock('@/lib/schulrecht-api', async (orig) => ({
  ...(await orig<typeof import('@/lib/schulrecht-api')>()),
  ladeThemen: (...a: unknown[]) => ladeThemen(...a),
  sucheFundstellen: (...a: unknown[]) => sucheFundstellen(...a),
  waermeAuf: vi.fn().mockResolvedValue(undefined),
  ladeVorschrift: vi.fn(),
  ladeNorm: vi.fn(),
}))

import { SchulrechtSeite } from './schulrecht-seite'
import { SachverhaltFunde } from './sachverhalt-funde'
import { FALL_START_KEY, type Fund, type Fundstelle, type ThemenAntwort } from '@/lib/schulrecht'

const themen: ThemenAntwort = {
  start: [
    { id: 'handy', label: 'Handy', frage: 'Darf ich einem Schüler das Handy abnehmen?' },
    { id: 'fehlzeiten', label: 'Fehlzeiten', frage: 'Wie gehe ich mit Fehlzeiten um?' },
  ],
  weitere: [{ id: 'foto', label: 'Fotos', frage: 'Darf ich Fotos der Klasse machen?' }],
  quellen: [
    { kuerzel: 'BayEUG', titel: 'Bayerisches Gesetz über das Erziehungs- und Unterrichtswesen', stand: '2026-07-01', rang: 'gesetz', normen: 120 },
    { kuerzel: 'BSO', titel: 'Berufsschulordnung', stand: '2026-07-01', rang: 'verordnung', normen: 40 },
  ],
}

const stelle = (nr: string, extra: Partial<Fundstelle> = {}): Fundstelle => ({
  kuerzel: 'BayEUG',
  nr,
  vorschrift: 'BayEUG',
  titel: `Titel ${nr}`,
  stand: '2026-07-01',
  rang: 'gesetz',
  text: `Wortlaut ${nr}`,
  ...extra,
})

beforeEach(() => {
  vi.clearAllMocks()
  sessionStorage.clear()
  ladeThemen.mockResolvedValue(themen)
})

describe('Seite „Schulrecht“ (PROJ-55)', () => {
  it('zeigt Haftungshinweis, Suchfeld und die Themen-Chips', async () => {
    render(<SchulrechtSeite />)
    expect(screen.getByRole('heading', { name: 'Schulrecht' })).toBeInTheDocument()
    expect(screen.getByText('Keine Rechtsberatung. Im Zweifel Schulleitung oder Rechtsabteilung fragen.')).toBeInTheDocument()
    expect(screen.getByLabelText('Was willst du wissen?')).toBeInTheDocument()
    expect(await screen.findByRole('button', { name: 'Handy' })).toBeInTheDocument()
    expect(screen.getByText('Weitere Themen')).toBeInTheDocument()
  })

  it('füllt beim Klick auf ein Thema die Beispielfrage ein und sucht, erster Treffer aufgeklappt', async () => {
    sucheFundstellen.mockResolvedValue({ fundstellen: [stelle('Art. 56'), stelle('Art. 57', { ungeprueft: true })] })
    render(<SchulrechtSeite />)
    fireEvent.click(await screen.findByRole('button', { name: 'Handy' }))
    expect(screen.getByLabelText('Was willst du wissen?')).toHaveValue('Darf ich einem Schüler das Handy abnehmen?')
    expect(await screen.findByText('2 Fundstellen')).toBeInTheDocument()
    // Alle Quellen gewählt: keine Eingrenzung mitschicken
    expect(sucheFundstellen).toHaveBeenCalledWith('Darf ich einem Schüler das Handy abnehmen?', undefined)
    expect(screen.getByText('Wortlaut Art. 56')).toBeVisible()
    expect(screen.getByText('ungeprüft')).toBeInTheDocument()
  })

  it('grenzt die Quellen ein, wenn eine abgewählt wird', async () => {
    sucheFundstellen.mockResolvedValue({ fundstellen: [stelle('Art. 56')] })
    render(<SchulrechtSeite />)
    fireEvent.click(await screen.findByText('Quellen eingrenzen'))
    fireEvent.click(screen.getByRole('checkbox', { name: /BSO/ }))
    fireEvent.change(screen.getByLabelText('Was willst du wissen?'), { target: { value: 'Wann muss ich Leistungsnachweise ankündigen?' } })
    fireEvent.click(screen.getByRole('button', { name: /Nachschlagen/ }))
    await waitFor(() => expect(sucheFundstellen).toHaveBeenCalledWith('Wann muss ich Leistungsnachweise ankündigen?', ['BayEUG']))
  })

  it('weist bei einem einzelnen Wort auf eine ganze Frage hin und sucht trotzdem', async () => {
    sucheFundstellen.mockResolvedValue({ fundstellen: [stelle('Art. 56')] })
    render(<SchulrechtSeite />)
    await screen.findByRole('button', { name: 'Handy' })
    fireEvent.change(screen.getByLabelText('Was willst du wissen?'), { target: { value: 'Handy' } })
    fireEvent.click(screen.getByRole('button', { name: /Nachschlagen/ }))
    expect(await screen.findByText('Mit einer ganzen Frage findest du genauere Stellen.')).toBeInTheDocument()
  })

  it('zeigt ohne Treffer den Leerzustand mit Themen-Chips', async () => {
    sucheFundstellen.mockResolvedValue({ fundstellen: [] })
    render(<SchulrechtSeite />)
    await screen.findByRole('button', { name: 'Handy' })
    fireEvent.change(screen.getByLabelText('Was willst du wissen?'), { target: { value: 'xyz abc' } })
    fireEvent.click(screen.getByRole('button', { name: /Nachschlagen/ }))
    expect(await screen.findByText('Dazu wurde nichts gefunden. Formuliere die Frage anders oder wähle ein Thema.')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Handy' }).length).toBeGreaterThan(1)
  })

  it('übergibt Frage und Fundstellen an den Aktennotiz-Ablauf, nur im Browser-Tab', async () => {
    sucheFundstellen.mockResolvedValue({ fundstellen: [stelle('Art. 56'), stelle('Art. 58')] })
    render(<SchulrechtSeite />)
    fireEvent.click(await screen.findByRole('button', { name: 'Handy' }))
    fireEvent.click(await screen.findByRole('button', { name: /Aktennotiz zu einem Fall erstellen/ }))
    expect(push).toHaveBeenCalledWith('/admin/schulrecht/fall')
    expect(JSON.parse(sessionStorage.getItem(FALL_START_KEY)!)).toEqual({
      frage: 'Darf ich einem Schüler das Handy abnehmen?',
      fundstellen: [
        { kuerzel: 'BayEUG', nr: 'Art. 56' },
        { kuerzel: 'BayEUG', nr: 'Art. 58' },
      ],
    })
  })

  it('zeigt bei einem Fehler der Suche eine verständliche Meldung mit „Erneut versuchen“', async () => {
    sucheFundstellen.mockRejectedValue(new Error('boom'))
    render(<SchulrechtSeite />)
    fireEvent.click(await screen.findByRole('button', { name: 'Handy' }))
    expect(await screen.findByText('Die Suche hat gerade nicht geklappt.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Erneut versuchen' })).toBeInTheDocument()
  })
})

describe('Personenbezüge prüfen (PROJ-55, E3)', () => {
  const sachverhalt = 'Max Müller aus der 10b fehlte.'
  const funde: Fund[] = [
    { id: 0, art: 'vorname', text: 'Max Müller', start: 0, ende: 10, vorschlag: 'Schüler A' },
    { id: 1, art: 'klasse', text: '10b', start: sachverhalt.indexOf('10b'), ende: sachverhalt.indexOf('10b') + 3, vorschlag: 'Klasse X' },
  ]

  function zeige(setEntscheidung = vi.fn(), entscheidungen = {}, bestaetigt = false, setBestaetigt = vi.fn()) {
    render(
      <SachverhaltFunde
        sachverhalt={sachverhalt}
        funde={funde}
        entscheidungen={entscheidungen}
        setEntscheidung={setEntscheidung}
        bestaetigt={bestaetigt}
        setBestaetigt={setBestaetigt}
      />,
    )
    return { setEntscheidung, setBestaetigt }
  }

  it('listet jeden Fund mit Vorschlag und zeigt die Vorschau des Textes', () => {
    zeige()
    expect(screen.getByText('Max Müller')).toBeInTheDocument()
    expect(screen.getByLabelText('Ersatz für Max Müller')).toHaveValue('Schüler A')
    expect(screen.getByLabelText('Ersatz für 10b')).toHaveValue('Klasse X')
    expect(screen.getByText('Schüler A aus der Klasse X fehlte.')).toBeInTheDocument()
    expect(screen.queryByText(/Der Sachverhalt enthält Namen/)).not.toBeInTheDocument()
  })

  it('meldet Ablehnen und Ändern an den Ablauf', () => {
    const { setEntscheidung } = zeige()
    fireEvent.click(screen.getAllByRole('checkbox', { name: 'Ersetzen durch' })[0])
    expect(setEntscheidung).toHaveBeenCalledWith(0, { art: 'ablehnen' })
    fireEvent.change(screen.getByLabelText('Ersatz für 10b'), { target: { value: 'Klasse Q' } })
    expect(setEntscheidung).toHaveBeenCalledWith(1, { art: 'aendern', text: 'Klasse Q' })
  })

  it('warnt, wenn alle Vorschläge abgelehnt sind, und verlangt eine ausdrückliche Bestätigung', () => {
    const { setBestaetigt } = zeige(vi.fn(), { 0: { art: 'ablehnen' }, 1: { art: 'ablehnen' } })
    expect(screen.getByText('Der Sachverhalt enthält Namen. Er wird an eine externe KI weitergegeben.')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('checkbox', { name: /Ich weiß das/ }))
    expect(setBestaetigt).toHaveBeenCalledWith(true)
  })

  it('sagt ohne Funde, dass nicht alles automatisch gefunden wird', () => {
    render(
      <SachverhaltFunde sachverhalt="Ein Fehltag." funde={[]} entscheidungen={{}} setEntscheidung={vi.fn()} bestaetigt={false} setBestaetigt={vi.fn()} />,
    )
    expect(screen.getByText(/Es wurden keine Namen erkannt\. Das heißt nicht, dass keine drinstehen/)).toBeInTheDocument()
    expect(screen.getByText('Ein Fehltag.')).toBeInTheDocument()
  })
})
