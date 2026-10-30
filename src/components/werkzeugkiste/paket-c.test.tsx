import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { SchrittEinstellungen } from './schritt-einstellungen'
import { SchrittFertig } from './schritt-fertig'
import { feldStandards } from '@/lib/werkzeugkiste'

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

describe('Schritt 2 bei Klassenarbeit und Lernlied (PROJ-54, Paket C)', () => {
  const optionen = {
    niveaus: [{ key: 'mittel', label: 'Mittel (Standard)' }],
    bildungsgaenge: [{ key: 'auto', label: 'Automatisch' }],
    lernfelder: {},
    umfaenge: [],
  }
  const zeige = (werkzeugId: string, extra: Record<string, string> = {}, format = '') => {
    const setEinstellungen = vi.fn()
    render(
      <SchrittEinstellungen
        werkzeugId={werkzeugId}
        einstellungen={{ format, niveau: 'mittel', bildungsgang: 'auto', lernfeld: '', umfang: '', ...feldStandards(werkzeugId), ...extra }}
        optionen={optionen}
        optionenFehler={false}
        setWerkzeug={vi.fn()}
        setEinstellungen={setEinstellungen}
      />,
    )
    return setEinstellungen
  }

  it('Klassenarbeit: Format ZIP oder H5P, Dauer direkt', () => {
    const set = zeige('pruefung', { dauer: '500' }, 'word')
    expect(screen.getByLabelText(/Word-Dokument/)).toBeChecked()
    expect(screen.getByLabelText(/H5P Übungstest/)).not.toBeChecked()
    expect(screen.getByLabelText(/Bearbeitungszeit/)).toHaveValue(500)
    fireEvent.blur(screen.getByLabelText(/Bearbeitungszeit/))
    expect(set).toHaveBeenCalledWith(expect.objectContaining({ dauer: '180' }))
  })

  it('Klassenarbeit: „Notengrenzen“ steht erst beim freien Notenschlüssel in „Mehr Optionen“', () => {
    zeige('pruefung', { noten: 'ihk' }, 'word')
    const mehr = screen.getByText(/Mehr Optionen/)
    expect(mehr).toHaveTextContent('Notenschlüssel')
    expect(mehr).not.toHaveTextContent('Grenzen Note 1–5')
  })

  it('Klassenarbeit: bei freiem Notenschlüssel taucht das Feld für die Grenzen auf', () => {
    zeige('pruefung', { noten: 'frei' }, 'word')
    expect(screen.getByText(/Mehr Optionen/)).toHaveTextContent('Grenzen Note 1–5 (Mindestprozent)')
  })

  it('Lernlied: kein Format, Musikrichtung und Umfang direkt, Tipps vorhanden', () => {
    zeige('lied')
    expect(screen.queryByText('Format')).not.toBeInTheDocument()
    expect(screen.getByText('Musikrichtung')).toBeInTheDocument()
    expect(screen.getByText('Wie viele Lieder')).toBeInTheDocument()
    expect(screen.getByText(/Mehr Optionen/)).toHaveTextContent('Niveau, Bildungsgang')
    expect(screen.getByText('Tipps')).toBeInTheDocument()
  })
})

describe('Schritt 5 bei Klassenarbeit und Lernlied (PROJ-54, Paket C)', () => {
  it('Klassenarbeit: ZIP mit Gesamtpunkten und Inhalt', () => {
    render(
      <SchrittFertig
        ablaufId="a1"
        ergebnis={{
          titel: 'Klassenarbeit: Haftung', dateiname: 'Haftung.zip', format: 'word', kapitel: 0, aufgaben: 40, einheit: 'Punkte',
          enthaelt: ['Schülerblatt', 'Lösungen mit Erwartungshorizont'],
        }}
      />,
    )
    expect(screen.getByText('Haftung.zip · 40 Punkte')).toBeInTheDocument()
    expect(screen.getByText('Darin: Schülerblatt · Lösungen mit Erwartungshorizont')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Herunterladen/ })).toBeInTheDocument()
  })

  it('Lernlied: ein Satz zur Musik-KI und der ZIP-Inhalt', () => {
    render(
      <SchrittFertig
        ablaufId="a1"
        ergebnis={{
          titel: 'Lernlieder', dateiname: 'Lernlieder.zip', format: 'word', kapitel: 0, aufgaben: 3, einheit: 'Lieder',
          enthaelt: ['Liedtexte', 'Karaoke-Blatt', 'Musik-KI-Prompts'],
          hinweis: 'Im ZIP liegt ein fertiger Prompt für eine Musik-KI (z. B. suno.com). Das Karaoke-Blatt funktioniert auch ohne Musik.',
        }}
      />,
    )
    expect(screen.getByText(/suno\.com/)).toBeInTheDocument()
    expect(screen.getByText(/auch ohne Musik/)).toBeInTheDocument()
    expect(screen.getByText('Darin: Liedtexte · Karaoke-Blatt · Musik-KI-Prompts')).toBeInTheDocument()
  })
})
