import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { SchrittEinstellungen } from './schritt-einstellungen'
import { VideoEingabe, VideoErgebnis } from './schritt-video'
import { feldStandards, type Ablauf } from '@/lib/werkzeugkiste'

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const ersetzen = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: ersetzen, push: vi.fn() }) }))
const legeVideoAblaufAn = vi.fn().mockResolvedValue({ ablauf: { id: 'abc' } })
vi.mock('@/lib/werkzeugkiste-api', async (orig) => ({
  ...(await orig<typeof import('@/lib/werkzeugkiste-api')>()),
  legeVideoAblaufAn: (...a: unknown[]) => legeVideoAblaufAn(...a),
}))

const optionen = {
  niveaus: [{ key: 'mittel', label: 'Mittel (Standard)' }],
  bildungsgaenge: [{ key: 'auto', label: 'Automatisch' }],
  lernfelder: {},
  umfaenge: [],
}

function Huelle() {
  const [url, setUrl] = useState('')
  const [t, setT] = useState('')
  return <VideoEingabe url={url} setUrl={setUrl} transkript={t} setTranskript={setT} />
}

describe('Schritt 1 bei Video-Fragen (PROJ-54, Paket D)', () => {
  it('zeigt Link, Transkript und die Anleitung', () => {
    render(<Huelle />)
    expect(screen.getByLabelText(/Link zum Video/)).toBeInTheDocument()
    expect(screen.getByLabelText('Transkript des Videos')).toBeInTheDocument()
    expect(screen.getByText('So kommst du an das Transkript')).toBeInTheDocument()
    expect(screen.getByText(/Transkript anzeigen/)).toBeInTheDocument()
    expect(screen.getByText('Mindestens 100 Zeichen.')).toBeInTheDocument()
  })

  it('zählt Zeichen und sagt, wie viel noch fehlt', () => {
    render(<Huelle />)
    const feld = screen.getByLabelText('Transkript des Videos')
    fireEvent.change(feld, { target: { value: 'nur ein bisschen' } })
    expect(screen.getByText(/Noch zu kurz: 16 von mindestens 100 Zeichen/)).toBeInTheDocument()
    fireEvent.change(feld, { target: { value: 'x'.repeat(1500) } })
    expect(screen.getByText('1.500 Zeichen')).toBeInTheDocument()
  })

  it('meldet einen Link ohne Web-Adresse verständlich', () => {
    render(<Huelle />)
    fireEvent.change(screen.getByLabelText(/Link zum Video/), { target: { value: 'youtube' } })
    expect(screen.getByRole('alert')).toHaveTextContent('vollständigen Link')
  })

  it('Ergebnis: nennt die Länge und den Link, bietet „Anderes Video“', () => {
    const anders = vi.fn()
    const ablauf = { kennzahlen: { seiten: 0, loesungen: 0, bilder: 0, tabellen: 0, zeichen: 4321, videoUrl: 'https://youtu.be/abc' } } as Ablauf
    render(<VideoErgebnis ablauf={ablauf} anderesVideo={anders} />)
    expect(screen.getByText('Transkript gelesen')).toBeInTheDocument()
    expect(screen.getByText(/4\.321 Zeichen/)).toBeInTheDocument()
    expect(screen.getByText('https://youtu.be/abc')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Anderes Video' }))
    expect(anders).toHaveBeenCalled()
  })

  it('Ergebnis ohne Link weist darauf hin', () => {
    const ablauf = { kennzahlen: { seiten: 0, loesungen: 0, bilder: 0, tabellen: 0, zeichen: 500 } } as Ablauf
    render(<VideoErgebnis ablauf={ablauf} />)
    expect(screen.getByText(/Ohne Link/)).toBeInTheDocument()
  })
})

describe('Schritt 2 bei Video-Fragen', () => {
  const zeige = (eingabe: 'skript' | 'video', werkzeugId: string, format = 'word') => {
    render(
      <SchrittEinstellungen
        werkzeugId={werkzeugId}
        eingabe={eingabe}
        einstellungen={{ format, niveau: 'mittel', bildungsgang: 'auto', lernfeld: '', umfang: '', ...feldStandards(werkzeugId) }}
        optionen={optionen}
        optionenFehler={false}
        setWerkzeug={vi.fn()}
        setEinstellungen={vi.fn()}
      />,
    )
  }

  it('bietet Word, H5P Interactive Video und H5P Quiz', () => {
    zeige('video', 'youtube')
    expect(screen.getByLabelText(/Word-Dokument/)).toBeChecked()
    expect(screen.getByLabelText(/H5P Interactive Video/)).not.toBeChecked()
    expect(screen.getByLabelText(/H5P Quiz/)).not.toBeChecked()
  })

  it('Mehr Optionen nennt Anzahl, Fragetypen, Videolänge', () => {
    zeige('video', 'youtube')
    expect(screen.getByText(/Mehr Optionen/)).toHaveTextContent('Anzahl Fragen, Fragetypen, Videolänge (optional), Bildungsgang, Lernfeld')
    expect(screen.getByText('Tipps')).toBeInTheDocument()
  })

  it('erklärt, warum man nicht zu einem Skript-Werkzeug wechseln kann', () => {
    zeige('video', 'youtube')
    expect(screen.getByText(/brauchen ein Transkript statt eines Skripts/)).toBeInTheDocument()
  })

  it('bei einem Skript-Ablauf steht dieser Hinweis nicht da', () => {
    zeige('skript', 'kahoot', '')
    expect(screen.queryByText(/brauchen ein Transkript statt eines Skripts/)).not.toBeInTheDocument()
  })
})

describe('Neuer Video-Ablauf (PROJ-54, Paket D)', () => {
  it('„Weiter“ geht erst mit gültigem Transkript, legt den Ablauf an und öffnet Schritt 1', async () => {
    const { AblaufNeu } = await import('./ablauf-neu')
    render(<AblaufNeu werkzeugParam="youtube" />)
    expect(screen.getByRole('heading', { name: 'Video' })).toBeInTheDocument()
    const weiter = screen.getByRole('button', { name: 'Weiter' })
    expect(weiter).toBeDisabled()
    fireEvent.change(screen.getByLabelText('Transkript des Videos'), { target: { value: 'Der Spediteur haftet. '.repeat(10) } })
    expect(weiter).toBeEnabled()
    fireEvent.change(screen.getByLabelText(/Link zum Video/), { target: { value: 'kein link' } })
    expect(weiter).toBeDisabled()
    fireEvent.change(screen.getByLabelText(/Link zum Video/), { target: { value: 'https://youtu.be/abc' } })
    fireEvent.click(weiter)
    await vi.waitFor(() => expect(legeVideoAblaufAn).toHaveBeenCalledWith('youtube', expect.objectContaining({ url: 'https://youtu.be/abc' })))
    await vi.waitFor(() => expect(ersetzen).toHaveBeenCalledWith('/admin/werkzeugkiste/ablauf/abc?schritt=1'))
  })
})
