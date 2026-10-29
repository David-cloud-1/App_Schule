import { afterEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { SchrittEinstellungen } from './schritt-einstellungen'
import { SchrittFertig } from './schritt-fertig'
import { feldStandards } from '@/lib/werkzeugkiste'

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

describe('Schritt 2 bei Kahoot, Moodle und LearningApps (PROJ-54, Paket B)', () => {
  const optionen = {
    niveaus: [{ key: 'mittel', label: 'Mittel (Standard)' }],
    bildungsgaenge: [{ key: 'auto', label: 'Automatisch' }],
    lernfelder: {},
    umfaenge: [],
  }
  const zeige = (werkzeugId: string, extra: Record<string, string> = {}) => {
    const setEinstellungen = vi.fn()
    render(
      <SchrittEinstellungen
        werkzeugId={werkzeugId}
        einstellungen={{ format: '', niveau: 'mittel', bildungsgang: 'auto', lernfeld: '', umfang: '', ...feldStandards(werkzeugId), ...extra }}
        optionen={optionen}
        optionenFehler={false}
        setWerkzeug={vi.fn()}
        setEinstellungen={setEinstellungen}
      />,
    )
    return setEinstellungen
  }

  it('Moodle: Fragetypen als Häkchen, der Ordner als Textfeld unter „Mehr Optionen“', () => {
    const set = zeige('moodle')
    expect(screen.getByLabelText('Multiple Choice')).toBeChecked()
    expect(screen.getByLabelText('Wahr/Falsch')).toBeChecked()
    expect(screen.getByLabelText('Kurzantwort')).not.toBeChecked()
    fireEvent.click(screen.getByLabelText('Kurzantwort'))
    expect(set).toHaveBeenCalledWith(expect.objectContaining({ types: 'mc,tf,short' }))
    expect(screen.getByText(/Mehr Optionen/)).toHaveTextContent('Ordner in der Fragensammlung (optional), Bildungsgang, Lernfeld')
  })

  it('Moodle: der letzte Fragetyp lässt sich nicht abwählen', () => {
    zeige('moodle', { types: 'cloze' })
    expect(screen.getByLabelText('Lückentext')).toBeDisabled()
  })

  it('Kahoot: Anzahl direkt mit Höchstwert 30, Zeitlimit unter „Mehr Optionen“', () => {
    const set = zeige('kahoot', { anzahl: '99' })
    expect(screen.getByLabelText(/Anzahl Fragen/)).toHaveValue(99)
    fireEvent.blur(screen.getByLabelText(/Anzahl Fragen/))
    expect(set).toHaveBeenCalledWith(expect.objectContaining({ anzahl: '30' }))
    expect(screen.getByText(/Mehr Optionen/)).toHaveTextContent('Zeitlimit pro Frage')
    expect(screen.queryByText('Format')).not.toBeInTheDocument()
  })

  it('LearningApps: die vier Vorlagen, zwei sind vorgewählt; „Elemente je Übung“ mindestens 4', () => {
    const set = zeige('learningapps', { anzahl: '1' })
    expect(screen.getByLabelText('Paare zuordnen')).toBeChecked()
    expect(screen.getByLabelText('Lückentext')).toBeChecked()
    expect(screen.getByLabelText('Multiple-Choice-Quiz')).not.toBeChecked()
    expect(screen.getByLabelText('Gruppen-Zuordnung')).not.toBeChecked()
    fireEvent.blur(screen.getByLabelText(/Elemente je Übung/))
    expect(set).toHaveBeenCalledWith(expect.objectContaining({ anzahl: '4' }))
  })
})

describe('Schritt 5 bei LearningApps: Text zum Kopieren (PROJ-54, Paket B)', () => {
  const ergebnis = {
    titel: 'Haftung üben',
    dateiname: 'Haftung_ueben.txt',
    format: 'text',
    kapitel: 0,
    aufgaben: 2,
    einheit: 'Übungen',
    texte: [
      { titel: 'Vertragsarten · Paare zuordnen', text: 'APP 1: Vertragsarten\nSpeditionsvertrag → § 453 HGB\n' },
      { titel: 'Wer schuldet was? · Lückentext', text: 'APP 2: Der *Spediteur* besorgt die Versendung.\n' },
    ],
  }

  afterEach(() => vi.restoreAllMocks())

  it('zeigt je Übung einen Text mit eigenem „Kopieren“-Knopf und keinen Download', () => {
    render(<SchrittFertig ablaufId="a1" ergebnis={ergebnis} />)
    expect(screen.getByText('2 Übungen', { exact: false })).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /Kopieren/ })).toHaveLength(2)
    expect(screen.queryByRole('link', { name: /Herunterladen/ })).not.toBeInTheDocument()
    expect(screen.getByText(/Speditionsvertrag → § 453 HGB/)).toBeInTheDocument()
    expect(screen.getByText('Das Ergebnis steht 7 Tage lang bereit.')).toBeInTheDocument()
  })

  it('kopiert genau den Text der gewählten Übung', async () => {
    const schreibe = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: schreibe }, configurable: true })
    render(<SchrittFertig ablaufId="a1" ergebnis={ergebnis} />)
    fireEvent.click(screen.getByRole('button', { name: /Kopieren: Wer schuldet was/ }))
    await waitFor(() => expect(schreibe).toHaveBeenCalledWith(ergebnis.texte[1].text))
    expect(await screen.findByText('Kopiert')).toBeInTheDocument()
  })

  it('bleibt ruhig, wenn die Zwischenablage nicht erlaubt ist', async () => {
    const { toast } = await import('sonner')
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: vi.fn().mockRejectedValue(new Error('nein')) }, configurable: true })
    render(<SchrittFertig ablaufId="a1" ergebnis={ergebnis} />)
    fireEvent.click(screen.getAllByRole('button', { name: /Kopieren/ })[0])
    await waitFor(() => expect(toast.error).toHaveBeenCalled())
    expect(screen.getByText(/Speditionsvertrag/)).toBeInTheDocument()
  })

  it('Kahoot und Moodle bleiben bei „Herunterladen“', () => {
    render(<SchrittFertig ablaufId="a1" ergebnis={{ titel: 'Kahoot-Quiz', dateiname: 'Kahoot_Quiz.xlsx', format: 'xlsx', kapitel: 0, aufgaben: 12, einheit: 'Fragen' }} />)
    expect(screen.getByRole('link', { name: /Herunterladen/ })).toBeInTheDocument()
    expect(screen.getByText('Kahoot_Quiz.xlsx · 12 Fragen')).toBeInTheDocument()
  })
})
