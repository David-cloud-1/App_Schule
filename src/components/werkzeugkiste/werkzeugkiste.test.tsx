import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { WerkzeugUebersicht } from './werkzeug-uebersicht'
import { SchrittAntwort } from './schritt-antwort'
import { SchrittEinstellungen } from './schritt-einstellungen'
import { SchrittFertig } from './schritt-fertig'
import { feldStandards } from '@/lib/werkzeugkiste'
import type { AblaufPruefung } from '@/lib/werkzeugkiste'

describe('Werkzeug-Übersicht (PROJ-51)', () => {
  it('zeigt vier Gruppen, die freigeschalteten Werkzeuge als Link, den Rest als „kommt bald“', () => {
    render(<WerkzeugUebersicht />)
    expect(screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)).toEqual([
      'Selbstlernen',
      'Üben & Wiederholen',
      'Unterricht & Prüfung',
      'Zum Hören',
    ])
    const links = screen.getAllByRole('link')
    expect(links.map((l) => l.getAttribute('href'))).toEqual(
      ['skript', 'kreativ', 'differenzierung', 'arbeitsblatt', 'lernsituation'].map((w) => `/admin/werkzeugkiste/neu?werkzeug=${w}`),
    )
    expect(screen.getAllByText('kommt bald')).toHaveLength(7)
  })
})

describe('Prüfergebnis in Schritt 4 (PROJ-51)', () => {
  const basis: AblaufPruefung = { lesbar: true, fehler: null, befunde: [], korrekturen: 0, nachbesserungsPrompt: null }
  const zeige = (pruefung: AblaufPruefung | null, extra: Partial<Parameters<typeof SchrittAntwort>[0]> = {}) =>
    render(
      <SchrittAntwort antwort="title: x" setAntwort={vi.fn()} pruefung={pruefung} prueftGerade={false} pruefFehler={null} erneutPruefen={vi.fn()} {...extra} />,
    )

  it('meldet eine fehlerfreie Antwort grün, mit automatisch korrigierten Kleinigkeiten', () => {
    zeige({ ...basis, korrekturen: 3 })
    expect(screen.getByText('Alles in Ordnung')).toBeInTheDocument()
    expect(screen.getByText('3 Kleinigkeiten wurden automatisch korrigiert.')).toBeInTheDocument()
  })

  it('zeigt Befunde als Liste, sagt dass trotzdem gebaut wird, und bietet den Nachbesserungs-Prompt', () => {
    zeige({ ...basis, befunde: [{ text: 'Kapitel 3: Abbildung fehlt' }, { text: 'Kapitel 5: Frage ohne Lösung' }], nachbesserungsPrompt: 'Bitte korrigiere …' })
    expect(screen.getByText('2 Hinweise – die Datei wird trotzdem gebaut')).toBeInTheDocument()
    expect(screen.getAllByRole('listitem')).toHaveLength(2)
    expect(screen.getByRole('button', { name: /Nachbesserungs-Prompt kopieren/ })).toBeInTheDocument()
  })

  it('bietet bei einem Fehler der Prüfstelle „Erneut versuchen“ an (BUG-4)', () => {
    const erneut = vi.fn()
    zeige(null, { pruefFehler: 'Die Prüfung hat gerade nicht geklappt.', erneutPruefen: erneut })
    fireEvent.click(screen.getByRole('button', { name: 'Erneut versuchen' }))
    expect(erneut).toHaveBeenCalledTimes(1)
  })

  it('erklärt eine unlesbare Antwort in einem Satz', () => {
    zeige({ ...basis, lesbar: false, fehler: 'Die Antwort ist unvollständig.' })
    expect(screen.getByText('Die Antwort ist unvollständig.')).toBeInTheDocument()
  })

  it('zeigt während der Prüfung nur den Hinweis „Wird geprüft“', () => {
    zeige(null, { prueftGerade: true })
    expect(screen.getByRole('status')).toHaveTextContent('Wird geprüft')
  })
})

describe('Schritt 2 aus der Werkzeugbeschreibung (PROJ-54)', () => {
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
        einstellungen={{ format: 'word', niveau: 'mittel', bildungsgang: 'auto', lernfeld: '', umfang: '', ...feldStandards(werkzeugId), ...extra }}
        optionen={optionen}
        optionenFehler={false}
        setWerkzeug={vi.fn()}
        setEinstellungen={setEinstellungen}
      />,
    )
    return setEinstellungen
  }

  it('Arbeitsblatt: Formatkarten und Anzahl direkt, Bearbeitungszeit unter „Mehr Optionen“', () => {
    zeige('arbeitsblatt')
    expect(screen.getByText('ZIP mit Arbeitsblatt und Lösungsblatt')).toBeInTheDocument()
    expect(screen.getByLabelText(/Anzahl Aufgaben/)).toHaveValue(12)
    expect(screen.getByText(/Mehr Optionen/)).toBeInTheDocument()
    expect(screen.getByText(/Bearbeitungszeit, Bildungsgang, Lernfeld/)).toBeInTheDocument()
  })

  it('Differenzierung: begrenzt die Stufen auf vier und lässt eine stehen', () => {
    const set = zeige('differenzierung', { stufen: 'leichte_sprache,leicht,mittel,schwer' })
    expect(screen.getByLabelText('Leichte Sprache')).toBeChecked()
    // Vier gewählt: ein fünftes gibt es bei Lernniveau nicht; das Abwählen funktioniert
    fireEvent.click(screen.getByLabelText('schwer'))
    expect(set).toHaveBeenCalledWith(expect.objectContaining({ stufen: 'leichte_sprache,leicht,mittel' }))
    expect(screen.queryByText(/Mehr Optionen/)).not.toBeInTheDocument()
  })

  it('Differenzierung: die letzte Stufe lässt sich nicht abwählen', () => {
    zeige('differenzierung', { stufen: 'mittel' })
    expect(screen.getByLabelText('mittel')).toBeDisabled()
  })

  it('Zahlenfeld holt ungültige Werte auf den erlaubten Bereich zurück', () => {
    const set = zeige('arbeitsblatt', { anzahl: '99' })
    fireEvent.blur(screen.getByLabelText(/Anzahl Aufgaben/))
    expect(set).toHaveBeenCalledWith(expect.objectContaining({ anzahl: '60' }))
  })
})

describe('Schritt 5 bei mehrteiligen Ergebnissen (PROJ-54)', () => {
  const ergebnis = { titel: 'Haftung', dateiname: 'Haftung.zip', format: 'word', kapitel: 1, aufgaben: 12 }
  it('nennt den Inhalt eines ZIP', () => {
    render(<SchrittFertig ablaufId="a1" ergebnis={{ ...ergebnis, enthaelt: ['Arbeitsblatt', 'Lösungsblatt'] }} />)
    expect(screen.getByText('Darin: Arbeitsblatt · Lösungsblatt')).toBeInTheDocument()
  })
  it('blendet die Vorschau aus, wenn es keine gibt', () => {
    render(<SchrittFertig ablaufId="a1" ergebnis={{ ...ergebnis, hatVorschau: false }} />)
    expect(screen.queryByRole('button', { name: /Vorschau/ })).not.toBeInTheDocument()
  })
})
