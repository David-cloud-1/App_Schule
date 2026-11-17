import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { KatalogDialog } from './katalog-dialog'
import { katalogZeile, waehleImKatalog, zeigeImKatalog } from './katalog-test-hilfe'
import { KatalogSkizze, SKIZZEN_TYPEN } from './katalog-skizzen'
import { FORMULARE, KapiteltestFormular } from './editor-formulare'
import { alsZeit, ausZeit, feldName } from './editor-formulare-katalog'
import { KATALOG, beispielBlock } from '@/lib/werkzeugkiste-katalog'
import { TYP_NAMEN, type Block } from '@/lib/werkzeugkiste-editor'

vi.stubGlobal(
  'ResizeObserver',
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
)
Element.prototype.hasPointerCapture = () => false
Element.prototype.scrollIntoView = () => {}

const letzter = (fn: ReturnType<typeof vi.fn>) => fn.mock.calls.at(-1)!

function katalog(props: Partial<Parameters<typeof KatalogDialog>[0]> = {}) {
  const onWaehle = vi.fn()
  const onOpenChange = vi.fn()
  render(<KatalogDialog offen onOpenChange={onOpenChange} onWaehle={onWaehle} {...props} />)
  return { onWaehle, onOpenChange }
}

beforeEach(() => window.localStorage.clear())
afterEach(() => window.localStorage.clear())

const zeilen = () => [...document.querySelectorAll<HTMLElement>('[data-katalog-zeile]')]
const zeilenIds = () => zeilen().map((z) => z.getAttribute('data-katalog-zeile'))

describe('Katalog-Fenster (PROJ-90, Liste mit Vorschau aus PROJ-114 Schritt 5)', () => {
  it('zeigt sieben Gruppen und alle 35 Typen in 29 Zeilen (verwandte Typen als Familie)', () => {
    katalog()
    expect(screen.getByRole('heading', { name: 'Element hinzufügen' })).toBeInTheDocument()
    for (const g of ['Lesen & Nachschlagen', 'Abfragen', 'Lücken & Wörter', 'Zuordnen & Ordnen', 'Rechnen', 'Spiele & Rätsel', 'Selbstcheck & Wiederholen']) {
      expect(screen.getByRole('heading', { name: g })).toBeInTheDocument()
    }
    expect(zeilen()).toHaveLength(29)
    const typen = zeilen().flatMap((z) => (z.getAttribute('data-katalog-typen') ?? '').split(' '))
    expect(typen.sort()).toEqual(KATALOG.map((e) => e.typ).sort())
    // „Gut für“ steht einmal: in der Vorschau des gewählten Typs
    expect(screen.getAllByText('Gut für:')).toHaveLength(1)
    expect(screen.queryByText('Zuletzt verwendet')).not.toBeInTheDocument()
  })

  it('setzt den Fokus ins Suchfeld und filtert beim Tippen', () => {
    katalog()
    const suche = screen.getByLabelText('Aufgabentyp suchen')
    expect(suche).toHaveFocus()
    fireEvent.change(suche, { target: { value: 'kreuzwort' } })
    expect(zeilenIds()).toEqual(['crossword'])
    expect(screen.queryByRole('heading', { name: 'Abfragen' })).not.toBeInTheDocument()
  })

  it('findet eine Familie auch über den Namen einer Art', () => {
    katalog()
    fireEvent.change(screen.getByLabelText('Aufgabentyp suchen'), { target: { value: 'wörter ziehen' } })
    expect(zeilenIds()).toEqual(['familie-luecken'])
    expect(document.querySelector('[data-katalog-einfuegen]')).toHaveAttribute('data-katalog-eintrag', 'drag_words')
  })

  it('zeigt ohne Treffer einen Leerzustand mit „Suche löschen“', () => {
    katalog()
    fireEvent.change(screen.getByLabelText('Aufgabentyp suchen'), { target: { value: 'zzzz' } })
    expect(screen.getByText('Kein Aufgabentyp passt zu „zzzz“.')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Suche löschen/ }))
    expect(zeilen()).toHaveLength(29)
  })

  it('Klick zeigt die Erklärung, erst „Einfügen“ fügt ein', () => {
    const { onWaehle } = katalog()
    fireEvent.click(katalogZeile('memory_game')!)
    expect(onWaehle).not.toHaveBeenCalled()
    expect(screen.getByRole('heading', { name: 'Memory' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Einfügen' }))
    expect(onWaehle).toHaveBeenCalledWith('memory_game')
  })

  it('Doppelklick und Enter auf einer Zeile fügen direkt ein', () => {
    const { onWaehle } = katalog()
    fireEvent.doubleClick(katalogZeile('crossword')!)
    expect(onWaehle).toHaveBeenLastCalledWith('crossword')
    fireEvent.keyDown(katalogZeile('reihenfolge')!, { key: 'Enter' })
    expect(onWaehle).toHaveBeenLastCalledWith('reihenfolge')
  })

  it('Familie: die Art wählt den Typ, der eingefügt wird', () => {
    const { onWaehle } = katalog()
    fireEvent.click(katalogZeile('fill_blanks')!)
    expect(screen.getByRole('radio', { name: 'Eintippen' })).toHaveAttribute('data-state', 'on')
    waehleImKatalog('drag_words')
    expect(onWaehle).toHaveBeenLastCalledWith('drag_words')
  })

  it('wandert mit Pfeiltasten durch die Zeilen und wählt dabei aus', () => {
    katalog()
    fireEvent.keyDown(screen.getByLabelText('Aufgabentyp suchen'), { key: 'ArrowDown' })
    expect(document.activeElement?.getAttribute('data-katalog-zeile')).toBe('text')
    fireEvent.keyDown(document.activeElement!, { key: 'ArrowDown' })
    expect(document.activeElement?.getAttribute('data-katalog-zeile')).toBe('familie-bild')
    expect(screen.getByRole('heading', { name: 'Bild' })).toBeInTheDocument()
    fireEvent.keyDown(document.activeElement!, { key: 'End' })
    expect(document.activeElement?.getAttribute('data-katalog-zeile')).toBe('selbsteinschaetzung')
  })

  it('zeigt „Zuletzt verwendet“ oben und blendet es bei der Suche aus', () => {
    window.localStorage.setItem('wk-katalog-zuletzt', JSON.stringify(['fallakte', 'text']))
    katalog()
    const zuletzt = screen.getByRole('heading', { name: 'Zuletzt verwendet' }).parentElement!
    expect([...zuletzt.querySelectorAll('[data-katalog-zeile]')].map((e) => e.getAttribute('data-katalog-zeile'))).toEqual(['fallakte', 'text'])
    // Kennungen bleiben eindeutig, obwohl „Fallakte“ zweimal steht
    const ids = [...document.querySelectorAll('[id^="katalog-"]')].map((e) => e.id)
    expect(new Set(ids).size).toBe(ids.length)
    fireEvent.change(screen.getByLabelText('Aufgabentyp suchen'), { target: { value: 'fall' } })
    expect(screen.queryByText('Zuletzt verwendet')).not.toBeInTheDocument()
  })

  it('lässt Bild-Typen immer wählbar, weil das Bild-Fenster auch Hochladen anbietet (PROJ-92)', () => {
    const { onWaehle } = katalog()
    const knopf = zeigeImKatalog('image')!
    expect(knopf).not.toHaveAttribute('aria-disabled')
    fireEvent.click(knopf)
    expect(onWaehle).toHaveBeenCalledWith('image')
  })

  it('zeigt im Kapiteltest nur die drei erlaubten Typen, einzeln (ohne Familien)', () => {
    katalog({ erlaubt: ['multiple_choice', 'true_false', 'fill_blanks'] })
    expect(screen.getByRole('heading', { name: 'Frage hinzufügen' })).toBeInTheDocument()
    expect(screen.getByText('Im Kapiteltest sind nur diese Fragetypen möglich.')).toBeInTheDocument()
    expect(zeilenIds()).toEqual(['multiple_choice', 'true_false', 'fill_blanks'])
  })

  it('markiert ausgewertete Typen mit einem Haken', () => {
    katalog()
    expect(within(katalogZeile('crossword')!).getByText(', wird ausgewertet')).toBeInTheDocument()
    expect(within(katalogZeile('text')!).queryByText(', wird ausgewertet')).not.toBeInTheDocument()
  })
})

describe('Skizzen', () => {
  it('gibt es für jeden Katalog-Typ', () => {
    expect(SKIZZEN_TYPEN.sort()).toEqual(KATALOG.map((e) => e.typ).sort())
  })

  it('ist Schmuck ohne alt und Bild mit alt', () => {
    const { container } = render(
      <>
        <KatalogSkizze typ="crossword" alt="" />
        <KatalogSkizze typ="crossword" alt="Kreuzworträtsel" />
      </>,
    )
    const [a, b] = container.querySelectorAll('svg')
    expect(a).toHaveAttribute('aria-hidden', 'true')
    expect(b).toHaveAttribute('role', 'img')
    expect(b).toHaveAttribute('aria-label', 'Kreuzworträtsel')
  })
})

describe('Formulare für alle Typen (PROJ-90)', () => {
  it('öffnen jeden Beispielinhalt ohne Fehler', () => {
    for (const typ of Object.keys(TYP_NAMEN).filter((t) => t !== 'text')) {
      const F = FORMULARE[typ]
      const { unmount } = render(<F block={beispielBlock(typ)} onChange={() => {}} />)
      unmount()
    }
  })

  it('behalten unbekannte Felder und den vorhandenen Feldnamen (steps statt schritte)', () => {
    const onChange = vi.fn()
    const block: Block = {
      type: 'rechenweg',
      question: 'Alte Aufgabe',
      steps: [
        { question: 'A?', result: '1' },
        { question: 'B?', result: '2' },
      ],
      neuesFeld: 'bleibt',
    }
    render(<FORMULARE.rechenweg block={block} onChange={onChange} />)
    fireEvent.change(screen.getByLabelText(/Aufgabe mit allen/), { target: { value: 'Neue Aufgabe' } })
    expect(letzter(onChange)[0]).toMatchObject({ question: 'Neue Aufgabe', neuesFeld: 'bleibt' })
    expect(letzter(onChange)[0]).not.toHaveProperty('task')
    fireEvent.change(screen.getByLabelText(/^Schritt 1: Frage/), { target: { value: 'A neu?' } })
    const neu = letzter(onChange)[0]
    expect(neu.steps[0]).toEqual({ question: 'A neu?', result: '1' })
    expect(neu).not.toHaveProperty('schritte')
  })

  it('Zuordnen: Kategorie per Auswahl, nur vorhandene Kategorien', () => {
    const onChange = vi.fn()
    render(<FORMULARE.drag_drop block={beispielBlock('drag_drop')} onChange={onChange} />)
    fireEvent.change(screen.getAllByLabelText(/^Begriff 1/)[0], { target: { value: 'Birne' } })
    expect(letzter(onChange)[0].items[0]).toEqual({ text: 'Birne', category: 'Obst' })
  })

  it('Kopfrechnen speichert ganze Zahlen als Zahl', () => {
    const onChange = vi.fn()
    render(<FORMULARE.arithmetic_quiz block={beispielBlock('arithmetic_quiz')} onChange={onChange} />)
    fireEvent.change(screen.getAllByLabelText(/^Ergebnis/)[0], { target: { value: '21' } })
    expect(letzter(onChange)[0].questions[0].answer).toBe(21)
    fireEvent.change(screen.getAllByLabelText(/^Ergebnis/)[0], { target: { value: '2,5' } })
    expect(letzter(onChange)[0].questions[0].answer).toBe('2,5')
  })

  it('Lernkarten zum Tippen: Antwortliste bleibt Liste', () => {
    const onChange = vi.fn()
    render(<FORMULARE.flashcards block={{ type: 'flashcards', cards: [{ front: 'F', back: ['A', 'B'] }, { front: 'G', back: 'C' }] }} onChange={onChange} />)
    const felder = screen.getAllByLabelText(/^Richtige Antworten/)
    expect(felder[0]).toHaveValue('A / B')
    fireEvent.change(felder[0], { target: { value: 'A / B / D' } })
    expect(letzter(onChange)[0].cards[0].back).toEqual(['A', 'B', 'D'])
  })

  it('Video: Zeitpunkt als mm:ss', () => {
    expect(alsZeit(75)).toBe('1:15')
    expect(alsZeit(undefined)).toBe('')
    expect(ausZeit('1:15')).toBe(75)
    expect(ausZeit('90')).toBe(90)
    expect(ausZeit('abc')).toBe('abc')
  })

  it('Bildzuordnung: Punkte über Prozentfelder, Werte außerhalb werden gemeldet', () => {
    const onChange = vi.fn()
    render(
      <FORMULARE.bildzuordnung
        block={{ type: 'bildzuordnung', path: 'images/a.png', alt: 'x', points: [{ label: 'A', x: 120, y: 10 }] }}
        onChange={onChange}
      />,
    )
    expect(screen.getByText('Dieser Punkt liegt außerhalb des Bildes.')).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Links (%)'), { target: { value: '40' } })
    expect(letzter(onChange)[0].points).toEqual([{ label: 'A', x: 40, y: 10 }])
    expect(letzter(onChange)[0]).not.toHaveProperty('punkte')
  })

  it('feldName nimmt den vorhandenen Namen, sonst den ersten', () => {
    expect(feldName({ steps: [] }, ['schritte', 'steps'])).toBe('steps')
    expect(feldName({}, ['schritte', 'steps'])).toBe('schritte')
    expect(feldName({ schritte: null, steps: [1] }, ['schritte', 'steps'])).toBe('steps')
  })
})

describe('Kapiteltest über den Katalog (E6)', () => {
  it('„Frage hinzufügen“ öffnet den gefilterten Katalog und hängt eine Beispielfrage an', () => {
    const onChange = vi.fn()
    const block = { type: 'question_set', pass_percentage: 70, questions: [beispielBlock('true_false')] }
    render(<KapiteltestFormular block={block} onChange={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: /Frage hinzufügen/ }))
    expect(screen.getByText('Im Kapiteltest sind nur diese Fragetypen möglich.')).toBeInTheDocument()
    waehleImKatalog('fill_blanks')
    const neu = letzter(onChange)[0]
    expect(neu.questions).toHaveLength(2)
    expect(neu.questions[1]).toEqual(beispielBlock('fill_blanks'))
  })

  it('zeigt nicht erlaubte Fragen als „wird übersprungen“', () => {
    render(<KapiteltestFormular block={{ type: 'question_set', questions: [beispielBlock('crossword')] }} onChange={() => {}} />)
    expect(screen.getByText(/Nicht im Kapiteltest möglich – wird übersprungen/)).toBeInTheDocument()
  })
})
