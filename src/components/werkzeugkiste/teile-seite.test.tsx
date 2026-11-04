import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { Ablauf, AblaufTeil } from '@/lib/werkzeugkiste'

const nav = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn(), schritt: '3' }))
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: nav.push, replace: nav.replace }),
  useSearchParams: () => new URLSearchParams({ schritt: nav.schritt }),
  usePathname: () => '/admin/werkzeugkiste/ablauf/a1',
}))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const api = vi.hoisted(() => ({
  ladeAblauf: vi.fn(),
  ladeOptionen: vi.fn(),
  speichereAblauf: vi.fn(),
  erstellePrompt: vi.fn(),
  fuegeTeileZusammen: vi.fn(),
  verwirfTeile: vi.fn(),
  schreibeWeiter: vi.fn(),
  setzeFort: vi.fn(),
  pruefeAntwort: vi.fn(),
  ladeTeilPrompt: vi.fn(),
  sendeTeilAntwort: vi.fn(),
}))
vi.mock('@/lib/werkzeugkiste-api', async (original) => ({ ...(await original<typeof import('@/lib/werkzeugkiste-api')>()), ...api }))

import { WerkzeugFehler } from '@/lib/werkzeugkiste-api'
import { AblaufSeite } from './ablauf-seite'

function teil(nr: number, zusatz: Partial<AblaufTeil> = {}): AblaufTeil {
  return {
    nr,
    inhalt: [`Abschnitt ${nr}`],
    auswahl: { seiten: '', abschnitte: [nr] },
    zeichen: 7000,
    zustand: 'fertig',
    kapitel: [`Kapitel ${nr}`],
    befund: 'ok',
    satz: 'ok',
    runden: 0,
    fingerabdruck: `fp${nr}`,
    ...zusatz,
  }
}

const OPTIONEN = {
  niveaus: [{ key: 'mittel', label: 'Mittel' }],
  bildungsgaenge: [{ key: 'auto', label: 'Automatisch' }],
  lernfelder: {},
  umfaenge: [],
}

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
    prompt: null,
    antwort: null,
    pruefung: null,
    ergebnis: null,
    weg: 'kostenlos',
    teile: { groesse: 8000, zusammengefuegt: false, hinweise: [], teile: [teil(1), teil(2), teil(3)] },
    aktualisiertAm: '2026-11-03T10:00:00Z',
    ...zusatz,
  } as Ablauf
}

beforeEach(() => {
  vi.clearAllMocks()
  nav.schritt = '3'
  api.ladeOptionen.mockResolvedValue(OPTIONEN)
  api.ladeTeilPrompt.mockResolvedValue({ prompt: 'p', nr: 1, von: 3 })
})

const ABGESCHNITTEN = { kapitel: ['A', 'B'], rettbar: true, runde: 0 }
const pruefung = (zusatz: Record<string, unknown> = {}) => ({ lesbar: true, fehler: null, befunde: [], korrekturen: 0, nachbesserungsPrompt: null, ...zusatz })

describe('Ablauf in Teilen: Schritt 3', () => {
  it('zeigt die Teil-Liste statt eines Prompts, mit eigenem Titel', async () => {
    api.ladeAblauf.mockResolvedValue({ ablauf: ablauf() })
    render(<AblaufSeite id="a1" />)
    expect(await screen.findByText('Dein Skript in Teilen')).toBeInTheDocument()
    expect(screen.getByText('3 von 3 Teilen eingefügt')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Ich habe die Antwort' })).not.toBeInTheDocument()
  })

  it('zeigt bei zerlegten Abschnitten die Beschriftung mit Beginn und den Tipp zu wenigen Überschriften (PROJ-71)', async () => {
    const teile = [
      teil(1, { inhalt: ['Übungen, 1. von 2'], unterteil: { nr: 1, von: 2 }, beginnt: 'Übungen' }),
      teil(2, { inhalt: ['Übungen, 2. von 2 (ab Aufgabe 3)'], unterteil: { nr: 2, von: 2 }, beginnt: 'Aufgabe 3' }),
    ]
    api.ladeAblauf.mockResolvedValue({ ablauf: ablauf({ teile: { groesse: 8000, zusammengefuegt: false, hinweise: [], teile } }) })
    render(<AblaufSeite id="a1" />)
    expect(await screen.findByText('Übungen, 2. von 2 (ab Aufgabe 3)')).toBeInTheDocument()
    expect(screen.getByText(/nur wenige Überschriften/)).toBeInTheDocument()
    expect(screen.queryByText(/bleibt größer als die anderen/)).not.toBeInTheDocument()
  })

  it('zeigt den Tipp nicht, wenn nichts zerlegt wurde, und warnt vor einem zu großen Teil', async () => {
    api.ladeAblauf.mockResolvedValue({ ablauf: ablauf() })
    const { unmount } = render(<AblaufSeite id="a1" />)
    await screen.findByText('Dein Skript in Teilen')
    expect(screen.queryByText(/nur wenige Überschriften/)).not.toBeInTheDocument()
    unmount()
    api.ladeAblauf.mockResolvedValue({ ablauf: ablauf({ teile: { groesse: 8000, zusammengefuegt: false, hinweise: [], teile: [teil(1), teil(2, { zuGross: true })] } }) })
    render(<AblaufSeite id="a1" />)
    expect(await screen.findByText(/bleibt größer als die anderen/)).toBeInTheDocument()
  })

  it('sperrt „Weiter zur Datei“, solange ein Teil fehlt, und nennt den Grund', async () => {
    api.ladeAblauf.mockResolvedValue({ ablauf: ablauf({ teile: { groesse: 8000, zusammengefuegt: false, hinweise: [], teile: [teil(1), teil(2, { zustand: 'offen', kapitel: [], befund: null, satz: null }), teil(3)] } }) })
    render(<AblaufSeite id="a1" />)
    const knopf = await screen.findByRole('button', { name: 'Weiter zur Datei' })
    expect(knopf).toBeDisabled()
    expect(screen.getByText('Es fehlt noch Teil 2.')).toBeInTheDocument()
  })

  it('fügt zusammen, übernimmt Antwort und Prüfung und geht zu Schritt 4', async () => {
    const zusammen = ablauf({
      schritt: 4,
      antwort: 'cover: gesamt',
      pruefung: pruefung(),
      teile: { groesse: 8000, zusammengefuegt: true, hinweise: ['Teil 1 endet und Teil 2 beginnt mit dem Kapitel „X“.'], teile: [teil(1), teil(2), teil(3)] },
    })
    api.ladeAblauf.mockResolvedValue({ ablauf: ablauf() })
    api.fuegeTeileZusammen.mockResolvedValue({ ablauf: zusammen, hinweise: zusammen.teile!.hinweise })
    render(<AblaufSeite id="a1" />)
    fireEvent.click(await screen.findByRole('button', { name: 'Weiter zur Datei' }))
    await waitFor(() => expect(api.fuegeTeileZusammen).toHaveBeenCalledWith('a1', false))
    await waitFor(() => expect(nav.push).toHaveBeenCalledWith(expect.stringContaining('schritt=4'), expect.anything()))
  })

  it('ist schon zusammengefügt: geht direkt weiter, ohne den Kern noch einmal zu fragen', async () => {
    api.ladeAblauf.mockResolvedValue({
      ablauf: ablauf({ antwort: 'cover: gesamt', pruefung: pruefung(), teile: { groesse: 8000, zusammengefuegt: true, hinweise: [], teile: [teil(1), teil(2)] } }),
    })
    render(<AblaufSeite id="a1" />)
    fireEvent.click(await screen.findByRole('button', { name: 'Weiter zur Datei' }))
    await waitFor(() => expect(nav.push).toHaveBeenCalledWith(expect.stringContaining('schritt=4'), expect.anything()))
    expect(api.fuegeTeileZusammen).not.toHaveBeenCalled()
  })

  it('fragt bei einem abgeschnittenen Teil nach und fügt nur nach Zustimmung zusammen', async () => {
    api.ladeAblauf.mockResolvedValue({
      ablauf: ablauf({ teile: { groesse: 8000, zusammengefuegt: false, hinweise: [], teile: [teil(1), teil(2, { zustand: 'abgeschnitten', befund: null }), teil(3)] } }),
    })
    api.fuegeTeileZusammen
      .mockRejectedValueOnce(new WerkzeugFehler('Mindestens ein Teil ist abgeschnitten. Der Rest davon würde in der Datei fehlen.', 409, undefined, 'unvollstaendig'))
      .mockResolvedValueOnce({ ablauf: ablauf({ schritt: 4, antwort: 'x', pruefung: pruefung() }), hinweise: [] })
    render(<AblaufSeite id="a1" />)
    fireEvent.click(await screen.findByRole('button', { name: 'Weiter zur Datei' }))
    expect(await screen.findByText('Ein Teil ist unvollständig')).toBeInTheDocument()
    expect(nav.push).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Ohne den Rest weiter' }))
    await waitFor(() => expect(api.fuegeTeileZusammen).toHaveBeenLastCalledWith('a1', true))
  })

  it('bleibt bei „Rest nachholen“ auf der Seite', async () => {
    api.ladeAblauf.mockResolvedValue({ ablauf: ablauf() })
    api.fuegeTeileZusammen.mockRejectedValue(new WerkzeugFehler('Mindestens ein Teil ist abgeschnitten.', 409, undefined, 'unvollstaendig'))
    render(<AblaufSeite id="a1" />)
    fireEvent.click(await screen.findByRole('button', { name: 'Weiter zur Datei' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Rest nachholen' }))
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
    expect(api.fuegeTeileZusammen).toHaveBeenCalledTimes(1)
    expect(nav.push).not.toHaveBeenCalled()
  })
})

describe('Ablauf in Teilen: Änderung in Schritt 2', () => {
  beforeEach(() => {
    nav.schritt = '2'
  })

  it('fragt vor dem Verwerfen eingefügter Teile und speichert danach neu', async () => {
    api.ladeAblauf.mockResolvedValue({ ablauf: ablauf() })
    api.speichereAblauf
      .mockRejectedValueOnce(new WerkzeugFehler('Deine 3 eingefügten Teil-Antworten gehen dabei verloren.', 409, undefined, 'teile_vorhanden'))
      .mockResolvedValueOnce({ ablauf: ablauf({ teile: null, schritt: 2 }) })
    api.verwirfTeile.mockResolvedValue({ ablauf: ablauf({ teile: null, schritt: 2 }) })
    api.erstellePrompt.mockResolvedValue({ ablauf: ablauf({ teile: null, prompt: 'neu', schritt: 3 }), hinweis: null })
    render(<AblaufSeite id="a1" />)
    fireEvent.click(await screen.findByRole('button', { name: 'Prompt erstellen' }))
    expect(await screen.findByText(/Deine 3 eingefügten Teil-Antworten gehen dabei verloren/)).toBeInTheDocument()
    expect(api.verwirfTeile).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Ja, Teile verwerfen' }))
    await waitFor(() => expect(api.verwirfTeile).toHaveBeenCalledWith('a1'))
    await waitFor(() => expect(api.erstellePrompt).toHaveBeenCalledWith('a1'))
    expect(api.speichereAblauf).toHaveBeenCalledTimes(2)
  })

  it('lässt die Teile bei „Nein, behalten“ in Ruhe', async () => {
    api.ladeAblauf.mockResolvedValue({ ablauf: ablauf() })
    api.speichereAblauf.mockRejectedValue(new WerkzeugFehler('Deine 3 eingefügten Teil-Antworten gehen dabei verloren.', 409, undefined, 'teile_vorhanden'))
    render(<AblaufSeite id="a1" />)
    fireEvent.click(await screen.findByRole('button', { name: 'Prompt erstellen' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Nein, behalten' }))
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
    expect(api.verwirfTeile).not.toHaveBeenCalled()
    expect(api.erstellePrompt).not.toHaveBeenCalled()
  })

  it('zeigt andere Fehler beim Speichern als Satz und fragt nicht nach', async () => {
    api.ladeAblauf.mockResolvedValue({ ablauf: ablauf() })
    api.speichereAblauf.mockRejectedValue(new WerkzeugFehler('Die Änderung konnte nicht gespeichert werden.', 500))
    render(<AblaufSeite id="a1" />)
    fireEvent.click(await screen.findByRole('button', { name: 'Prompt erstellen' }))
    expect(await screen.findByText('Die Änderung konnte nicht gespeichert werden.')).toBeInTheDocument()
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  })
})

describe('Antwort ohne Teile, abgeschnitten: Schritt 4', () => {
  beforeEach(() => {
    nav.schritt = '4'
  })
  const abgeschnittenerAblauf = (zusatz: Partial<Ablauf> = {}) =>
    ablauf({
      teile: null,
      prompt: 'p',
      schritt: 4,
      antwort: 'chapters: abgebrochen und lang genug für die Prüfung',
      pruefung: pruefung({ abgeschnitten: ABGESCHNITTEN }) as Ablauf['pruefung'],
      ...zusatz,
    })

  it('zeigt die Rettungs-Box mit den fertigen Kapiteln', async () => {
    api.ladeAblauf.mockResolvedValue({ ablauf: abgeschnittenerAblauf() })
    render(<AblaufSeite id="a1" />)
    expect(await screen.findByText('Die Antwort wurde abgeschnitten.')).toBeInTheDocument()
    expect(screen.getByText(/2 Kapitel sind vollständig angekommen, zuletzt „B“/)).toBeInTheDocument()
    expect(api.schreibeWeiter).not.toHaveBeenCalled()
  })

  it('kürzt die Antwort erst auf Knopfdruck und zeigt dann den Weiterschreib-Prompt', async () => {
    const gekuerzt = abgeschnittenerAblauf({ antwort: 'chapters: gerettet und ebenfalls lang genug', pruefung: pruefung({ abgeschnitten: { ...ABGESCHNITTEN, runde: 1 } }) as Ablauf['pruefung'] })
    api.ladeAblauf.mockResolvedValue({ ablauf: abgeschnittenerAblauf() })
    api.schreibeWeiter.mockResolvedValue({ ablauf: gekuerzt, prompt: 'WEITER AB B', kapitel: ['A', 'B'], runde: 1, tippKleiner: false })
    render(<AblaufSeite id="a1" />)
    fireEvent.click(await screen.findByRole('button', { name: 'Fertige Kapitel behalten, Rest nachholen' }))
    expect(await screen.findByRole('button', { name: 'Weiterschreib-Prompt kopieren' })).toBeInTheDocument()
    // das Antwortfeld zeigt jetzt die gekürzte Antwort, ohne dass die Prüfung noch einmal läuft
    expect(screen.getByLabelText('Antwort der KI')).toHaveValue('chapters: gerettet und ebenfalls lang genug')
    await new Promise((r) => setTimeout(r, 1000))
    expect(api.pruefeAntwort).not.toHaveBeenCalled()
  })

  it('hängt die Fortsetzung an und lässt die Box verschwinden, wenn nun alles da ist', async () => {
    const komplett = abgeschnittenerAblauf({ antwort: 'chapters: komplett und lang genug', pruefung: pruefung() as Ablauf['pruefung'] })
    api.ladeAblauf.mockResolvedValue({ ablauf: abgeschnittenerAblauf() })
    api.schreibeWeiter.mockResolvedValue({ ablauf: abgeschnittenerAblauf(), prompt: 'WEITER', kapitel: ['A', 'B'], runde: 1, tippKleiner: false })
    api.setzeFort.mockResolvedValue({ uebernommen: true, ablauf: komplett, tippKleiner: false })
    render(<AblaufSeite id="a1" />)
    fireEvent.click(await screen.findByRole('button', { name: 'Fertige Kapitel behalten, Rest nachholen' }))
    fireEvent.change(await screen.findByLabelText('Antwort auf den Weiterschreib-Prompt'), { target: { value: 'chapters: Rest' } })
    fireEvent.click(screen.getByRole('button', { name: 'Anhängen und prüfen' }))
    await waitFor(() => expect(api.setzeFort).toHaveBeenCalledWith('a1', 'chapters: Rest'))
    await waitFor(() => expect(screen.queryByText('Die Antwort wurde abgeschnitten.')).not.toBeInTheDocument())
    expect(screen.getByLabelText('Antwort der KI')).toHaveValue('chapters: komplett und lang genug')
  })

  it('erklärt, wenn nichts zu retten ist, statt einen nutzlosen Knopf zu zeigen', async () => {
    api.ladeAblauf.mockResolvedValue({
      ablauf: abgeschnittenerAblauf({ pruefung: pruefung({ lesbar: false, fehler: 'verrutscht', abgeschnitten: { kapitel: [], rettbar: false, runde: 0 } }) as Ablauf['pruefung'] }),
    })
    render(<AblaufSeite id="a1" />)
    expect(await screen.findByText(/bevor ein Kapitel fertig war/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Fertige Kapitel behalten, Rest nachholen' })).not.toBeInTheDocument()
  })

  it('zeigt bei einer vollständigen Antwort keine Rettungs-Box', async () => {
    api.ladeAblauf.mockResolvedValue({ ablauf: abgeschnittenerAblauf({ pruefung: pruefung() as Ablauf['pruefung'] }) })
    render(<AblaufSeite id="a1" />)
    expect(await screen.findByText('Alles in Ordnung')).toBeInTheDocument()
    expect(screen.queryByText('Die Antwort wurde abgeschnitten.')).not.toBeInTheDocument()
  })
})

describe('Ablauf in Teilen: Schritt 4 nach dem Zusammenfügen', () => {
  it('zeigt die Hinweise vom Zusammenfügen und keine Rettungs-Box', async () => {
    nav.schritt = '4'
    api.ladeAblauf.mockResolvedValue({
      ablauf: ablauf({
        schritt: 4,
        antwort: 'cover: gesamt und lang genug für die Prüfung',
        pruefung: pruefung({ abgeschnitten: ABGESCHNITTEN }) as Ablauf['pruefung'],
        teile: { groesse: 8000, zusammengefuegt: true, hinweise: ['Teil 3 ist unvollständig: Er wurde nach Kapitel 2 abgeschnitten, der Rest davon fehlt in der Datei.'], teile: [teil(1), teil(2), teil(3)] },
      }),
    })
    render(<AblaufSeite id="a1" />)
    expect(await screen.findByText(/Teil 3 ist unvollständig/)).toBeInTheDocument()
    expect(screen.queryByText('Die Antwort wurde abgeschnitten.')).not.toBeInTheDocument()
  })

  it('führt mit Teil-Liste, aber ohne Zusammenfügen, zurück zu Schritt 3', async () => {
    nav.schritt = '4'
    api.ladeAblauf.mockResolvedValue({ ablauf: ablauf() })
    render(<AblaufSeite id="a1" />)
    expect(await screen.findByText('Dein Skript in Teilen')).toBeInTheDocument()
  })
})
