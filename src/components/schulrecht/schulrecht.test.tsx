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
const holeFragePrompt = vi.fn()
const ladeNorm = vi.fn()
vi.mock('@/lib/schulrecht-api', async (orig) => ({
  ...(await orig<typeof import('@/lib/schulrecht-api')>()),
  ladeThemen: (...a: unknown[]) => ladeThemen(...a),
  sucheFundstellen: (...a: unknown[]) => sucheFundstellen(...a),
  holeFragePrompt: (...a: unknown[]) => holeFragePrompt(...a),
  waermeAuf: vi.fn().mockResolvedValue(undefined),
  ladeVorschrift: vi.fn(),
  ladeNorm: (...a: unknown[]) => ladeNorm(...a),
}))

import { toast } from 'sonner'
import { SchulrechtSeite } from './schulrecht-seite'
import { SachverhaltFunde } from './sachverhalt-funde'
import { TrefferKarte } from './treffer-karte'
import { BEISPIEL_FRAGEN, FALL_START_KEY, type Fund, type Fundstelle, type ThemenAntwort } from '@/lib/schulrecht'

const themen: ThemenAntwort = {
  start: [],
  weitere: [],
  quellen: [
    { kuerzel: 'BayEUG', titel: 'Bayerisches Gesetz über das Erziehungs- und Unterrichtswesen', stand: '2026-07-01', rang: 'gesetz', normen: 120 },
    { kuerzel: 'BSO', titel: 'Berufsschulordnung', stand: '2026-07-01', rang: 'verordnung', normen: 40 },
  ],
}

const stelle = (nr: string, extra: Partial<Fundstelle> = {}): Fundstelle => ({
  kuerzel: 'BayEUG',
  nr,
  vorschrift: 'Bayerisches Gesetz über das Erziehungs- und Unterrichtswesen',
  titel: `Titel ${nr}`,
  stand: '2026-07-01',
  rang: 'gesetz',
  text: `Wortlaut ${nr}`,
  ...extra,
})

/** Treffer im Format ab PROJ-88: Kurzfassung, Absätze, passender Absatz, Einordnung */
const handy = stelle('Art. 56', {
  titel: 'Rechte und Pflichten',
  kurzfassung: 'Handys dürfen nur genutzt werden, wenn die Aufsicht es erlaubt.',
  sicher: true,
  passend: 2,
  text: '(1) Erster Absatz.\n\n(5) Die Verwendung von digitalen Endgeräten ist nur zulässig, siehe Art. 86 Abs. 1.',
  absaetze: [
    { i: 1, text: '(1) Erster Absatz.', kernaussage: 'Grundsatz', markiert: [], verweise: [] },
    {
      i: 2,
      text: '(5) Die Verwendung von digitalen Endgeräten ist nur zulässig, siehe Art. 86 Abs. 1.',
      kernaussage: 'Handyregel',
      markiert: ['Endgeräten'],
      verweise: [{ start: 68, ende: 82, kuerzel: 'BayEUG', nr: 'Art. 86' }],
    },
  ],
})

function frageStellen(text: string) {
  fireEvent.change(screen.getByLabelText('Was willst du wissen?'), { target: { value: text } })
  fireEvent.click(screen.getByRole('button', { name: /Nachschlagen/ }))
}

beforeEach(() => {
  vi.clearAllMocks()
  sessionStorage.clear()
  ladeThemen.mockResolvedValue(themen)
})

describe('Seite „Schulrecht“ (PROJ-55, überarbeitet in PROJ-88)', () => {
  it('zeigt Suchfeld, drei Beispielfragen, Haftungs- und Quellenhinweis – keine Themen-Chips mehr', async () => {
    render(<SchulrechtSeite />)
    expect(screen.getByRole('heading', { name: 'Schulrecht' })).toBeInTheDocument()
    expect(screen.getByText('Keine Rechtsberatung. Im Zweifel Schulleitung oder Rechtsabteilung fragen.')).toBeInTheDocument()
    expect(screen.getByText(/Nicht enthalten sind Verwaltungsvorschriften/)).toBeInTheDocument()
    expect(screen.getByLabelText('Was willst du wissen?').tagName).toBe('TEXTAREA')
    for (const b of BEISPIEL_FRAGEN) expect(screen.getByRole('button', { name: b })).toBeInTheDocument()
    expect(screen.queryByText('Weitere Themen')).not.toBeInTheDocument()
    expect(await screen.findByText('Quellen eingrenzen')).toBeInTheDocument()
  })

  it('Beispielfrage füllt das Feld und sucht; Treffer zeigt Kurzfassung, passenden Absatz und „passt sicher“', async () => {
    sucheFundstellen.mockResolvedValue({ fundstellen: [handy, stelle('Art. 57', { sicher: false, ungeprueft: true })] })
    render(<SchulrechtSeite />)
    await screen.findByText('Quellen eingrenzen')
    fireEvent.click(screen.getByRole('button', { name: BEISPIEL_FRAGEN[0] }))
    expect(screen.getByLabelText('Was willst du wissen?')).toHaveValue(BEISPIEL_FRAGEN[0])
    expect(await screen.findByText('2 passende Stellen')).toBeInTheDocument()
    // Alle Quellen gewählt: keine Eingrenzung mitschicken
    expect(sucheFundstellen).toHaveBeenCalledWith(BEISPIEL_FRAGEN[0], undefined)
    expect(screen.getByText('Handys dürfen nur genutzt werden, wenn die Aufsicht es erlaubt.')).toBeInTheDocument()
    expect(screen.getByText('Zusammenfassung – maßgeblich ist der Gesetzestext.')).toBeInTheDocument()
    expect(screen.getByText('passt sicher')).toBeInTheDocument()
    expect(screen.getByText('Vorschlag')).toBeInTheDocument()
    // Passender Absatz sichtbar, Suchwort markiert, übriger Absatz eingeklappt
    expect(screen.getByText('Endgeräten').tagName).toBe('MARK')
    expect(screen.queryByText('(1) Erster Absatz.')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /1 weiterer Absatz anzeigen/ }))
    expect(screen.getByText('(1) Erster Absatz.')).toBeInTheDocument()
  })

  it('Enter sucht, Umschalt+Enter nicht', async () => {
    sucheFundstellen.mockResolvedValue({ fundstellen: [handy] })
    render(<SchulrechtSeite />)
    const feld = screen.getByLabelText('Was willst du wissen?')
    fireEvent.change(feld, { target: { value: 'Ein Schüler fehlt. Was nun?' } })
    fireEvent.keyDown(feld, { key: 'Enter', shiftKey: true })
    expect(sucheFundstellen).not.toHaveBeenCalled()
    fireEvent.keyDown(feld, { key: 'Enter' })
    await waitFor(() => expect(sucheFundstellen).toHaveBeenCalledWith('Ein Schüler fehlt. Was nun?', undefined))
  })

  it('zeigt erst 5 Treffer und auf Wunsch die übrigen, nach Rechtsquelle gruppiert', async () => {
    const viele = Array.from({ length: 7 }, (_, i) => stelle(`Art. ${i + 1}`, { kuerzel: i % 2 ? 'BSO' : 'BayEUG', vorschrift: i % 2 ? 'Berufsschulordnung' : 'BayEUG lang' }))
    sucheFundstellen.mockResolvedValue({ fundstellen: viele })
    render(<SchulrechtSeite />)
    frageStellen('Wie lange vorher muss ich eine Schulaufgabe ankündigen?')
    expect(await screen.findByText('5 passende Stellen')).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Berufsschulordnung' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Weitere Treffer anzeigen \(2\)/ }))
    expect(screen.getByText('7 passende Stellen')).toBeInTheDocument()
  })

  it('grenzt die Quellen ein, wenn eine abgewählt wird', async () => {
    sucheFundstellen.mockResolvedValue({ fundstellen: [stelle('Art. 56')] })
    render(<SchulrechtSeite />)
    fireEvent.click(await screen.findByText('Quellen eingrenzen'))
    fireEvent.click(screen.getByRole('checkbox', { name: /BSO/ }))
    frageStellen('Wann muss ich Leistungsnachweise ankündigen?')
    await waitFor(() => expect(sucheFundstellen).toHaveBeenCalledWith('Wann muss ich Leistungsnachweise ankündigen?', ['BayEUG']))
  })

  it('weist bei einem einzelnen Wort auf eine ganze Frage hin und sucht trotzdem', async () => {
    sucheFundstellen.mockResolvedValue({ fundstellen: [stelle('Art. 56')] })
    render(<SchulrechtSeite />)
    frageStellen('Handy')
    expect(await screen.findByText('Mit einer ganzen Frage findest du genauere Stellen.')).toBeInTheDocument()
  })

  it('zeigt ohne Treffer einen ehrlichen Leerzustand mit Beispielfragen', async () => {
    sucheFundstellen.mockResolvedValue({ fundstellen: [] })
    render(<SchulrechtSeite />)
    frageStellen('xyz abc')
    expect(await screen.findByText(/Dazu wurde nichts gefunden\./)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: BEISPIEL_FRAGEN[1] })).toBeInTheDocument()
  })

  it('„Mit meiner KI beantworten“ kopiert den Prompt aus Frage und gezeigten Stellen, mit Hinweis „keine Namen“', async () => {
    const schreibe = vi.fn().mockResolvedValue(undefined)
    Object.assign(navigator, { clipboard: { writeText: schreibe } })
    sucheFundstellen.mockResolvedValue({ fundstellen: [handy] })
    holeFragePrompt.mockResolvedValue({ prompt: 'PROMPT' })
    render(<SchulrechtSeite />)
    frageStellen('Darf ich das Handy einsammeln?')
    expect(await screen.findByText('Die Frage geht an deine eigene KI. Schreibe keine Namen hinein.')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Prompt kopieren/ }))
    await waitFor(() => expect(schreibe).toHaveBeenCalledWith('PROMPT'))
    expect(holeFragePrompt).toHaveBeenCalledWith('Darf ich das Handy einsammeln?', [{ kuerzel: 'BayEUG', nr: 'Art. 56' }])
    expect(toast.success).toHaveBeenCalled()
  })

  it('übergibt Frage und Fundstellen an den Aktennotiz-Ablauf, nur im Browser-Tab', async () => {
    sucheFundstellen.mockResolvedValue({ fundstellen: [stelle('Art. 56'), stelle('Art. 58')] })
    render(<SchulrechtSeite />)
    frageStellen('Darf ich einem Schüler das Handy abnehmen?')
    fireEvent.click(await screen.findByRole('button', { name: /Aktennotiz erstellen/ }))
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
    frageStellen('Darf ich einem Schüler das Handy abnehmen?')
    expect(await screen.findByText('Die Suche hat gerade nicht geklappt.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Erneut versuchen' })).toBeInTheDocument()
  })
})

describe('Treffer-Karte (PROJ-88)', () => {
  it('öffnet einen Verweis im Text über den Rückruf', () => {
    const oeffne = vi.fn()
    render(<TrefferKarte fundstelle={handy} oeffneVerweis={oeffne} />)
    fireEvent.click(screen.getByRole('button', { name: /Art\. 86 Abs\. 1 BayEUG öffnen/ }))
    expect(oeffne).toHaveBeenCalledWith({ start: 68, ende: 82, kuerzel: 'BayEUG', nr: 'Art. 86' })
  })

  it('zeigt beim Durchblättern alle Absätze offen, ohne „passende Stelle“', () => {
    render(<TrefferKarte fundstelle={handy} alleAbsaetze />)
    expect(screen.getByText('(1) Erster Absatz.')).toBeInTheDocument()
    expect(screen.queryByText('Passende Stelle')).not.toBeInTheDocument()
    expect(screen.getByText('Handyregel')).toBeInTheDocument()
  })

  it('funktioniert mit einer alten Antwort ohne Absätze und Kurzfassung', () => {
    render(<TrefferKarte fundstelle={stelle('Art. 1')} />)
    expect(screen.getByText('Wortlaut Art. 1')).toBeInTheDocument()
    expect(screen.queryByText('Zusammenfassung – maßgeblich ist der Gesetzestext.')).not.toBeInTheDocument()
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
