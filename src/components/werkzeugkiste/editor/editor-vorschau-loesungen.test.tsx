import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { EditorVorschau } from './editor-vorschau'
import { LOESUNGEN_SICHTBAR } from './bedien-woerter'

/** PROJ-116: Der Hinweis in der Kopfzeile erscheint nur in „Bearbeiten“ und nur, wenn die Seite Lösungen zeigen kann */

const basis = { html: '<body></body>', laedt: false, fehler: null, marke: null, neuLaden: () => {} }

describe('Vorschau-Kopfzeile: Hinweis auf sichtbare Lösungen', () => {
  it('zeigt den Hinweis in „Bearbeiten“, wenn die Seite eine passende Aufgabe hat', () => {
    render(<EditorVorschau {...basis} modus="bearbeiten" aufgaben={{ 'k0-e0': 'fill_blanks' }} />)
    expect(screen.getByTestId('loesungen-hinweis')).toHaveTextContent(LOESUNGEN_SICHTBAR.hinweis)
  })

  it('zeigt ihn nicht in „Ausprobieren“', () => {
    render(<EditorVorschau {...basis} modus="ausprobieren" aufgaben={{ 'k0-e0': 'fill_blanks' }} />)
    expect(screen.queryByTestId('loesungen-hinweis')).toBeNull()
  })

  it('zeigt ihn nicht, wenn es nur Aufgaben ohne Kennzeichnung gibt (Memory, Kreuzworträtsel …)', () => {
    render(<EditorVorschau {...basis} modus="bearbeiten" aufgaben={{ 'k0-e0': 'memory_game', 'k0-e1': 'crossword' }} />)
    expect(screen.queryByTestId('loesungen-hinweis')).toBeNull()
  })

  it('zeigt ihn nicht, solange die Vorschau lädt oder nicht aktuell ist', () => {
    const { rerender } = render(<EditorVorschau {...basis} laedt modus="bearbeiten" aufgaben={{ 'k0-e0': 'mark_words' }} />)
    expect(screen.queryByTestId('loesungen-hinweis')).toBeNull()
    rerender(<EditorVorschau {...basis} fehler="Fehler" modus="bearbeiten" aufgaben={{ 'k0-e0': 'mark_words' }} />)
    expect(screen.queryByTestId('loesungen-hinweis')).toBeNull()
  })
})
