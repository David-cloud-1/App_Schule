import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { WerkzeugUebersicht } from './werkzeug-uebersicht'
import { SchrittAntwort } from './schritt-antwort'
import type { AblaufPruefung } from '@/lib/werkzeugkiste'

describe('Werkzeug-Übersicht (PROJ-51)', () => {
  it('zeigt vier Gruppen, nur „Ganzes Skript“ als Link, den Rest als „kommt bald“', () => {
    render(<WerkzeugUebersicht />)
    expect(screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)).toEqual([
      'Selbstlernen',
      'Üben & Wiederholen',
      'Unterricht & Prüfung',
      'Zum Hören',
    ])
    const links = screen.getAllByRole('link')
    expect(links).toHaveLength(1)
    expect(links[0]).toHaveAttribute('href', '/admin/werkzeugkiste/neu?werkzeug=skript')
    expect(screen.getAllByText('kommt bald')).toHaveLength(11)
  })
})

describe('Prüfergebnis in Schritt 4 (PROJ-51)', () => {
  const basis: AblaufPruefung = { lesbar: true, fehler: null, befunde: [], korrekturen: 0, nachbesserungsPrompt: null }
  const zeige = (pruefung: AblaufPruefung | null, extra: Partial<Parameters<typeof SchrittAntwort>[0]> = {}) =>
    render(
      <SchrittAntwort antwort="title: x" setAntwort={vi.fn()} pruefung={pruefung} prueftGerade={false} pruefFehler={null} {...extra} />,
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

  it('erklärt eine unlesbare Antwort in einem Satz', () => {
    zeige({ ...basis, lesbar: false, fehler: 'Die Antwort ist unvollständig.' })
    expect(screen.getByText('Die Antwort ist unvollständig.')).toBeInTheDocument()
  })

  it('zeigt während der Prüfung nur den Hinweis „Wird geprüft“', () => {
    zeige(null, { prueftGerade: true })
    expect(screen.getByRole('status')).toHaveTextContent('Wird geprüft')
  })
})
