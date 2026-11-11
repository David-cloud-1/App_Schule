import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { Ablauf } from '@/lib/werkzeugkiste'

/** Der Assistent im echten Ablauf (PROJ-87): Knopf, Angebot, Mitgehen, Problemhilfe */

const nav = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn(), schritt: '2' }))
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: nav.push, replace: nav.replace }),
  useSearchParams: () => new URLSearchParams({ schritt: nav.schritt }),
  usePathname: () => '/admin/werkzeugkiste/ablauf/a1',
}))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const api = vi.hoisted(() => ({
  ladeAblauf: vi.fn(),
  ladeOptionen: vi.fn(),
  ladeHilfeAngebot: vi.fn(),
  speichereHilfeAngebot: vi.fn(),
  pruefeAntwort: vi.fn(),
}))
vi.mock('@/lib/werkzeugkiste-api', async (original) => ({ ...(await original<typeof import('@/lib/werkzeugkiste-api')>()), ...api }))

import { AblaufSeite } from './ablauf-seite'

const OPTIONEN = { niveaus: [{ key: 'mittel', label: 'Mittel' }], bildungsgaenge: [{ key: 'auto', label: 'Automatisch' }], lernfelder: {}, umfaenge: [] }

function ablauf(zusatz: Partial<Ablauf> = {}): Ablauf {
  return {
    id: 'a1',
    werkzeug: 'skript',
    schritt: 3,
    status: 'laeuft',
    datei: { name: 'heft.docx', groesse: 1000 },
    kennzahlen: { seiten: 12, loesungen: 0, bilder: 0, tabellen: 0 },
    gliederung: [],
    auswahl: { seiten: '', abschnitte: [] },
    einstellungen: { format: 'h5p', niveau: 'mittel', bildungsgang: 'auto', lernfeld: '', umfang: '' },
    prompt: 'Mach daraus ein Arbeitsblatt.',
    antwort: null,
    pruefung: null,
    ergebnis: null,
    weg: 'kostenlos',
    teile: null,
    aktualisiertAm: '2026-11-11T10:00:00Z',
    ...zusatz,
  } as Ablauf
}

beforeEach(() => {
  vi.clearAllMocks()
  window.sessionStorage.clear()
  nav.schritt = '2'
  api.ladeOptionen.mockResolvedValue(OPTIONEN)
  api.ladeHilfeAngebot.mockResolvedValue({ werkzeug: 'skript', beantwortet: true, antwort: 'nein' })
  api.speichereHilfeAngebot.mockResolvedValue({ werkzeug: 'skript', beantwortet: true, antwort: 'ja' })
})

describe('Assistent im Ablauf', () => {
  it('ohne Klick sieht die Seite aus wie vorher: Knopf ja, Assistent nein', async () => {
    api.ladeAblauf.mockResolvedValue({ ablauf: ablauf() })
    render(<AblaufSeite id="a1" />)
    expect(await screen.findByRole('button', { name: /Hilfe: Schritt für Schritt/ })).toBeInTheDocument()
    expect(screen.queryByRole('complementary')).toBeNull()
    expect(screen.queryByText(/Neu hier\?/)).toBeNull()
  })

  it('öffnet auf Knopfdruck die Hilfe zum aktuellen Schritt und schließt sie wieder', async () => {
    api.ladeAblauf.mockResolvedValue({ ablauf: ablauf() })
    render(<AblaufSeite id="a1" />)
    fireEvent.click(await screen.findByRole('button', { name: /Hilfe: Schritt für Schritt/ }))
    const panel = screen.getByRole('complementary', { name: 'Hilfe: Schritt für Schritt' })
    expect(panel).toHaveTextContent('Schritt 2 von 5')
    expect(panel).toHaveTextContent('Wähle das Format und das Niveau')
    // Der Ablauf selbst bleibt unverändert und bedienbar
    expect(screen.getByRole('button', { name: 'Prompt erstellen' })).toBeEnabled()
    fireEvent.click(screen.getByRole('button', { name: 'Hilfe schließen' }))
    expect(screen.queryByRole('complementary')).toBeNull()
  })

  it('zeigt den Schritt als erledigt, sobald der Auftrag vorliegt', async () => {
    api.ladeAblauf.mockResolvedValue({ ablauf: ablauf() })
    render(<AblaufSeite id="a1" />)
    fireEvent.click(await screen.findByRole('button', { name: /Hilfe: Schritt für Schritt/ }))
    expect(screen.getByText('Erledigt')).toBeInTheDocument()
  })

  it('in Schritt 3 meldet das Kopieren „Erledigt“', async () => {
    nav.schritt = '3'
    const schreibe = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: schreibe }, configurable: true })
    api.ladeAblauf.mockResolvedValue({ ablauf: ablauf() })
    render(<AblaufSeite id="a1" />)
    fireEvent.click(await screen.findByRole('button', { name: /Hilfe: Schritt für Schritt/ }))
    expect(screen.getByRole('heading', { name: 'Auftrag an die KI (Prompt) kopieren' })).toBeInTheDocument()
    expect(screen.queryByText('Erledigt')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: /Prompt kopieren/ }))
    await waitFor(() => expect(screen.getByText('Erledigt')).toBeInTheDocument())
  })

  it('zeigt bei langem Skript die Teile-Hilfe mit Stand', async () => {
    nav.schritt = '3'
    const teile = {
      groesse: 8000,
      zusammengefuegt: false,
      hinweise: [],
      teile: [1, 2, 3].map((nr) => ({
        nr, inhalt: [`A${nr}`], auswahl: { seiten: '', abschnitte: [nr] }, zeichen: 7000,
        zustand: nr === 1 ? 'fertig' : 'offen', kapitel: [], befund: null, satz: null, runden: 0, fingerabdruck: null,
      })),
    }
    api.ladeAblauf.mockResolvedValue({ ablauf: ablauf({ prompt: null, teile } as Partial<Ablauf>) })
    render(<AblaufSeite id="a1" />)
    fireEvent.click(await screen.findByRole('button', { name: /Hilfe: Schritt für Schritt/ }))
    const panel = screen.getByRole('complementary')
    expect(panel).toHaveTextContent('Dein Skript in Teilen')
    expect(panel).toHaveTextContent('1 von 3 Teilen eingefügt')
  })

  it('bei einer abgeschnittenen Antwort erscheint von selbst die passende Hilfe', async () => {
    nav.schritt = '4'
    const pruefung = {
      lesbar: true, fehler: null, befunde: [], korrekturen: 0, nachbesserungsPrompt: null,
      abgeschnitten: { kapitel: ['A'], rettbar: true, runde: 0 },
    }
    api.ladeAblauf.mockResolvedValue({ ablauf: ablauf({ schritt: 4, antwort: 'title: Haftung\n'.repeat(5), pruefung } as Partial<Ablauf>) })
    render(<AblaufSeite id="a1" />)
    fireEvent.click(await screen.findByRole('button', { name: /Hilfe: Schritt für Schritt/ }))
    await waitFor(() =>
      expect(screen.getByRole('complementary')).toHaveTextContent('Die Antwort der KI wurde mittendrin abgebrochen.'),
    )
  })

  it('eine Kopie aus dem Regal beginnt in der Hilfe bei der Antwort', async () => {
    nav.schritt = '4'
    api.ladeAblauf.mockResolvedValue({ ablauf: ablauf({ schritt: 4, prompt: null, kennzahlen: null, herkunft: 'Frau Muster' } as Partial<Ablauf>) })
    render(<AblaufSeite id="a1" />)
    fireEvent.click(await screen.findByRole('button', { name: /Hilfe: Schritt für Schritt/ }))
    expect(screen.getByRole('complementary')).toHaveTextContent('Antwort der KI einfügen')
    expect(screen.queryByRole('button', { name: /‹ Hilfe zu Schritt/ })).toBeNull()
  })

  it('Werkzeuge ohne fertige Hilfeseiten zeigen keinen Hilfe-Knopf', async () => {
    api.ladeAblauf.mockResolvedValue({ ablauf: ablauf({ werkzeug: 'podcast' }) })
    render(<AblaufSeite id="a1" />)
    await screen.findByRole('heading', { name: 'Was soll daraus werden?' })
    expect(screen.queryByRole('button', { name: /Hilfe/ })).toBeNull()
    expect(api.ladeHilfeAngebot).not.toHaveBeenCalled()
  })
})

describe('Erstes Angebot im Ablauf', () => {
  it('erscheint beim ersten Mal; „Ja, bitte“ öffnet den Assistenten im aktuellen Schritt', async () => {
    api.ladeHilfeAngebot.mockResolvedValue({ werkzeug: 'skript', beantwortet: false, antwort: null })
    api.ladeAblauf.mockResolvedValue({ ablauf: ablauf() })
    render(<AblaufSeite id="a1" />)
    fireEvent.click(await screen.findByRole('button', { name: 'Ja, bitte' }))
    expect(screen.getByRole('complementary')).toHaveTextContent('Schritt 2 von 5')
    expect(screen.queryByText(/Neu hier\?/)).toBeNull()
    expect(api.speichereHilfeAngebot).toHaveBeenCalledWith('skript', 'ja')
  })

  it('„Nein, danke“ schließt die Karte, der Hilfe-Knopf bleibt', async () => {
    api.ladeHilfeAngebot.mockResolvedValue({ werkzeug: 'skript', beantwortet: false, antwort: null })
    api.ladeAblauf.mockResolvedValue({ ablauf: ablauf() })
    render(<AblaufSeite id="a1" />)
    fireEvent.click(await screen.findByRole('button', { name: 'Nein, danke' }))
    expect(screen.queryByText(/Neu hier\?/)).toBeNull()
    expect(screen.queryByRole('complementary')).toBeNull()
    expect(screen.getByRole('button', { name: /Hilfe: Schritt für Schritt/ })).toBeInTheDocument()
    expect(api.speichereHilfeAngebot).toHaveBeenCalledWith('skript', 'nein')
  })

  it('zeigt bei einer fehlgeschlagenen Abfrage weder Angebot noch Fehler', async () => {
    api.ladeHilfeAngebot.mockRejectedValue(new Error('offline'))
    api.ladeAblauf.mockResolvedValue({ ablauf: ablauf() })
    render(<AblaufSeite id="a1" />)
    await screen.findByRole('button', { name: /Hilfe: Schritt für Schritt/ })
    expect(screen.queryByText(/Neu hier\?/)).toBeNull()
    expect(screen.queryByRole('alert')).toBeNull()
  })
})
