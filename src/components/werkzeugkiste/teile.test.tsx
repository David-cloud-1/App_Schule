import { useState } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import type { Ablauf, AblaufTeil } from '@/lib/werkzeugkiste'

const api = vi.hoisted(() => ({ ladeTeilPrompt: vi.fn(), sendeTeilAntwort: vi.fn() }))
vi.mock('@/lib/werkzeugkiste-api', async (original) => ({ ...(await original<typeof import('@/lib/werkzeugkiste-api')>()), ...api }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

import { RettungsBox } from './abbruch-rettung'
import { naechsterOffenerTeil, SchrittTeile, sperrGrund, teilStatus } from './schritt-teile'
import { TeileVerwerfenDialog, UnvollstaendigDialog } from './teile-dialoge'

function teil(nr: number, zusatz: Partial<AblaufTeil> = {}): AblaufTeil {
  return {
    nr,
    inhalt: [`Abschnitt ${nr}`],
    auswahl: { seiten: '', abschnitte: [nr] },
    zeichen: 7000,
    zustand: 'offen',
    kapitel: [],
    befund: null,
    satz: null,
    runden: 0,
    fingerabdruck: null,
    ...zusatz,
  }
}
const fertig = (nr: number, zusatz: Partial<AblaufTeil> = {}) =>
  teil(nr, { zustand: 'fertig', kapitel: [`Kapitel ${nr}`], befund: 'ok', satz: `Teil ${nr} ist vollständig und in Ordnung (1 Kapitel).`, ...zusatz })

function ablaufMit(...teile: AblaufTeil[]): Ablauf {
  return { id: 'a1', werkzeug: 'skript', teile: { groesse: 8000, zusammengefuegt: false, hinweise: [], teile } } as unknown as Ablauf
}

/** Hält den Ablauf wie die Seite: Der neue Stand aus der Antwort kommt zurück in die Liste */
function Huelle({ start }: { start: Ablauf }) {
  const [a, setA] = useState(start)
  return <SchrittTeile ablauf={a} onAblauf={setA} />
}

beforeEach(() => {
  Object.values(api).forEach((f) => f.mockReset())
  api.ladeTeilPrompt.mockImplementation(async (_id: string, nr: number, weiter?: boolean) => ({
    prompt: weiter ? `WEITER Teil ${nr}` : `PROMPT Teil ${nr}`,
    nr,
    von: 3,
  }))
  Object.assign(navigator, { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } })
})

describe('Hilfen der Teil-Liste', () => {
  it('nennt den Grund, warum „Weiter zur Datei“ noch gesperrt ist', () => {
    expect(sperrGrund([fertig(1), teil(2), fertig(3)])).toBe('Es fehlt noch Teil 2.')
    expect(sperrGrund([teil(1), teil(2), fertig(3)])).toBe('Es fehlen noch die Teile 1, 2.')
    expect(sperrGrund([fertig(1), fertig(2, { befund: 'hoch' })])).toContain('Teil 2 hat einen schweren Fehler')
    expect(sperrGrund([fertig(1), fertig(2, { befund: 'mittel' })])).toBeNull()
    // ein abgeschnittener Teil sperrt nicht: Die Lehrkraft entscheidet im Dialog
    expect(sperrGrund([fertig(1), teil(2, { zustand: 'abgeschnitten', kapitel: ['A'] })])).toBeNull()
  })

  it('springt zum ersten Teil, der noch nicht fertig ist', () => {
    expect(naechsterOffenerTeil([fertig(1), teil(2), teil(3)])).toBe(2)
    expect(naechsterOffenerTeil([fertig(1), teil(2, { zustand: 'abgeschnitten' }), teil(3)])).toBe(2)
    expect(naechsterOffenerTeil([fertig(1), fertig(2, { befund: 'hoch' })])).toBe(2)
    expect(naechsterOffenerTeil([fertig(1), fertig(2)])).toBeNull()
  })

  it('beschreibt jeden Zustand in Worten', () => {
    expect(teilStatus(teil(1)).label).toBe('offen')
    expect(teilStatus(fertig(1)).label).toBe('geprüft')
    expect(teilStatus(fertig(1, { befund: 'mittel' })).label).toBe('mit Hinweisen')
    expect(teilStatus(fertig(1, { befund: 'hoch' })).label).toBe('Fehler')
    expect(teilStatus(teil(1, { zustand: 'abgeschnitten' })).label).toBe('abgeschnitten')
  })
})

describe('Schritt 3 in Teilen (PROJ-69)', () => {
  it('erklärt, warum es Teile sind, und zeigt den Fortschritt in Worten', () => {
    render(<SchrittTeile ablauf={ablaufMit(fertig(1), teil(2), teil(3))} onAblauf={vi.fn()} />)
    expect(screen.getByText(/Dein Skript ist lang, deshalb bekommst du es in/)).toBeInTheDocument()
    expect(screen.getByText('Antwort der KI hier einfügen')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Bayerncloud KI öffnen/ })).toBeInTheDocument()
    expect(screen.getByText('1 von 3 Teilen eingefügt')).toBeInTheDocument()
    expect(screen.getByRole('progressbar', { name: '1 von 3 Teilen eingefügt' })).toBeInTheDocument()
    expect(screen.getByText('Es fehlen noch die Teile 2, 3.')).toBeInTheDocument()
    expect(screen.getByText('Teil 1 von 3')).toBeInTheDocument()
    expect(screen.getByText('geprüft')).toBeInTheDocument()
    expect(screen.getAllByText('offen')).toHaveLength(2)
  })

  it('empfiehlt bei sehr vielen Teilen, weniger Kapitel auszuwählen', () => {
    const viele = Array.from({ length: 9 }, (_, i) => teil(i + 1))
    render(<SchrittTeile ablauf={ablaufMit(...viele)} onAblauf={vi.fn()} />)
    expect(screen.getByText(/Wähle in Schritt 1 nur die Kapitel für die nächsten Wochen aus/)).toBeInTheDocument()
  })

  it('klappt von selbst den nächsten offenen Teil auf und holt dessen Prompt', async () => {
    render(<SchrittTeile ablauf={ablaufMit(fertig(1), teil(2), teil(3))} onAblauf={vi.fn()} />)
    expect(await screen.findByRole('button', { name: 'Prompt für Teil 2 kopieren' })).toBeInTheDocument()
    expect(api.ladeTeilPrompt).toHaveBeenCalledTimes(1)
    expect(api.ladeTeilPrompt).toHaveBeenCalledWith('a1', 2)
    expect(screen.getByText(/Teil 2 von 3/, { selector: 'p' })).toBeInTheDocument()
  })

  it('kopiert den schon geladenen Prompt direkt, ohne Umweg über das Netz', async () => {
    render(<SchrittTeile ablauf={ablaufMit(teil(1), teil(2), teil(3))} onAblauf={vi.fn()} />)
    const knopf = await screen.findByRole('button', { name: 'Prompt für Teil 1 kopieren' })
    fireEvent.click(knopf)
    await waitFor(() => expect(navigator.clipboard.writeText).toHaveBeenCalledWith('PROMPT Teil 1'))
    expect(api.ladeTeilPrompt).toHaveBeenCalledTimes(1)
  })

  it('fügt eine Antwort ein, zeigt das Prüfergebnis und meldet den neuen Stand nach oben', async () => {
    const neu = ablaufMit(fertig(1), fertig(2), teil(3))
    api.sendeTeilAntwort.mockResolvedValue({
      uebernommen: true,
      ablauf: neu,
      teil: fertig(2),
      geretteteKapitel: 0,
      nachbesserungsPrompt: null,
      tippKleiner: false,
    })
    const onAblauf = vi.fn()
    render(<SchrittTeile ablauf={ablaufMit(fertig(1), teil(2), teil(3))} onAblauf={onAblauf} />)
    const feld = await screen.findByLabelText('Antwort der KI zu Teil 2')
    const knopf = screen.getByRole('button', { name: 'Einfügen und prüfen' })
    expect(knopf).toBeDisabled()
    fireEvent.change(feld, { target: { value: 'chapters: x' } })
    fireEvent.click(knopf)
    await waitFor(() => expect(api.sendeTeilAntwort).toHaveBeenCalledWith('a1', 2, { antwort: 'chapters: x' }))
    await waitFor(() => expect(onAblauf).toHaveBeenCalledWith(neu))
    // danach klappt der nächste offene Teil auf
    expect(await screen.findByLabelText('Antwort der KI zu Teil 3')).toHaveValue('')
  })

  it('warnt bei einer doppelten Antwort und übernimmt sie nur auf Wunsch', async () => {
    api.sendeTeilAntwort
      .mockResolvedValueOnce({
        uebernommen: false,
        warnung: { art: 'doppelt', teil: 1, satz: 'Diese Antwort hast du schon bei Teil 1 eingefügt.' },
      })
      .mockResolvedValueOnce({ uebernommen: true, ablauf: ablaufMit(fertig(1), fertig(2), teil(3)), teil: fertig(2), geretteteKapitel: 0, nachbesserungsPrompt: null, tippKleiner: false })
    render(<SchrittTeile ablauf={ablaufMit(fertig(1), teil(2), teil(3))} onAblauf={vi.fn()} />)
    fireEvent.change(await screen.findByLabelText('Antwort der KI zu Teil 2'), { target: { value: 'chapters: x' } })
    fireEvent.click(screen.getByRole('button', { name: 'Einfügen und prüfen' }))
    expect(await screen.findByText('Diese Antwort hast du schon bei Teil 1 eingefügt.')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Trotzdem bei Teil 2 übernehmen' }))
    await waitFor(() => expect(api.sendeTeilAntwort).toHaveBeenLastCalledWith('a1', 2, { antwort: 'chapters: x', trotzdem: true }))
  })

  it('lässt die Warnung mit „Nicht übernehmen“ verschwinden und behält den Text im Feld', async () => {
    api.sendeTeilAntwort.mockResolvedValue({ uebernommen: false, warnung: { art: 'falscher_teil', teil: 3, satz: 'Diese Antwort passt eher zu Teil 3 als zu Teil 2.' } })
    render(<SchrittTeile ablauf={ablaufMit(fertig(1), teil(2), teil(3))} onAblauf={vi.fn()} />)
    fireEvent.change(await screen.findByLabelText('Antwort der KI zu Teil 2'), { target: { value: 'chapters: x' } })
    fireEvent.click(screen.getByRole('button', { name: 'Einfügen und prüfen' }))
    expect(await screen.findByText(/passt eher zu Teil 3/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Nicht übernehmen' }))
    expect(screen.queryByText(/passt eher zu Teil 3/)).not.toBeInTheDocument()
    expect(screen.getByLabelText('Antwort der KI zu Teil 2')).toHaveValue('chapters: x')
  })

  it('zeigt einen Fehlersatz bei unlesbarer Antwort', async () => {
    api.sendeTeilAntwort.mockResolvedValue({ uebernommen: false, fehler: 'Die Antwort der KI ist an einer Stelle verrutscht (Zeile 4).' })
    render(<SchrittTeile ablauf={ablaufMit(fertig(1), teil(2), teil(3))} onAblauf={vi.fn()} />)
    fireEvent.change(await screen.findByLabelText('Antwort der KI zu Teil 2'), { target: { value: 'kaputt' } })
    fireEvent.click(screen.getByRole('button', { name: 'Einfügen und prüfen' }))
    expect(await screen.findByText(/an einer Stelle verrutscht/)).toBeInTheDocument()
  })

  it('zeigt bei Netzfehlern einen ruhigen Satz', async () => {
    api.sendeTeilAntwort.mockRejectedValue(new Error('offline'))
    render(<SchrittTeile ablauf={ablaufMit(fertig(1), teil(2), teil(3))} onAblauf={vi.fn()} />)
    fireEvent.change(await screen.findByLabelText('Antwort der KI zu Teil 2'), { target: { value: 'x' } })
    fireEvent.click(screen.getByRole('button', { name: 'Einfügen und prüfen' }))
    expect(await screen.findByText(/Die Prüfung hat gerade nicht geklappt/)).toBeInTheDocument()
  })

  it('bleibt bei einem schweren Befund auf dem Teil und bietet den Nachbesserungs-Prompt an', async () => {
    const hoch = ablaufMit(fertig(1), fertig(2, { befund: 'hoch', satz: 'Achtung: Kapitel 1 – Bild fehlt. Frage diesen Teil am besten noch einmal an.' }), teil(3))
    api.sendeTeilAntwort.mockResolvedValue({ uebernommen: true, ablauf: hoch, teil: hoch.teile!.teile[1], geretteteKapitel: 0, nachbesserungsPrompt: 'Bitte nachbessern …', tippKleiner: false })
    render(<Huelle start={ablaufMit(fertig(1), teil(2), teil(3))} />)
    fireEvent.change(await screen.findByLabelText('Antwort der KI zu Teil 2'), { target: { value: 'x' } })
    fireEvent.click(screen.getByRole('button', { name: 'Einfügen und prüfen' }))
    expect(await screen.findByText(/Achtung: Kapitel 1 – Bild fehlt/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Nachbesserungs-Prompt kopieren' })).toBeInTheDocument()
    expect(screen.getByText('Fehler')).toBeInTheDocument()
    // Teil 3 ist nicht aufgeklappt
    expect(screen.queryByLabelText('Antwort der KI zu Teil 3')).not.toBeInTheDocument()
  })

  it('bleibt bei einem Abbruch auf dem Teil und zeigt den Rest-Prompt', async () => {
    const cut = ablaufMit(fertig(1), teil(2, { zustand: 'abgeschnitten', kapitel: ['A'] }), teil(3))
    api.sendeTeilAntwort.mockResolvedValue({ uebernommen: true, ablauf: cut, teil: cut.teile!.teile[1], geretteteKapitel: 1, nachbesserungsPrompt: null, tippKleiner: false })
    render(<Huelle start={ablaufMit(fertig(1), teil(2), teil(3))} />)
    fireEvent.change(await screen.findByLabelText('Antwort der KI zu Teil 2'), { target: { value: 'x' } })
    fireEvent.click(screen.getByRole('button', { name: 'Einfügen und prüfen' }))
    expect(await screen.findByText('Teil 2 bricht ab.')).toBeInTheDocument()
    expect(await screen.findByRole('button', { name: 'Weiterschreib-Prompt kopieren' })).toBeInTheDocument()
  })

  it('zeigt bei einem abgeschnittenen Teil die Rettungs-Box mit dem Weiterschreib-Prompt', async () => {
    const ablauf = ablaufMit(fertig(1), teil(2, { zustand: 'abgeschnitten', kapitel: ['Haftung 1', 'Haftung 2'], satz: 'bricht ab' }), teil(3))
    render(<SchrittTeile ablauf={ablauf} onAblauf={vi.fn()} />)
    expect(await screen.findByText('Teil 2 bricht ab.')).toBeInTheDocument()
    expect(screen.getByText(/2 Kapitel sind vollständig angekommen, zuletzt „Haftung 2“/)).toBeInTheDocument()
    expect(await screen.findByRole('button', { name: 'Weiterschreib-Prompt kopieren' })).toBeInTheDocument()
    expect(api.ladeTeilPrompt).toHaveBeenCalledWith('a1', 2, true)
    // der normale Prompt wird dabei nicht geholt
    expect(api.ladeTeilPrompt).not.toHaveBeenCalledWith('a1', 2)
  })

  it('hängt die Antwort auf den Weiterschreib-Prompt an', async () => {
    const neu = ablaufMit(fertig(1), fertig(2), teil(3))
    api.sendeTeilAntwort.mockResolvedValue({ uebernommen: true, ablauf: neu, teil: fertig(2), geretteteKapitel: 0, nachbesserungsPrompt: null, tippKleiner: false })
    const onAblauf = vi.fn()
    render(<SchrittTeile ablauf={ablaufMit(fertig(1), teil(2, { zustand: 'abgeschnitten', kapitel: ['A'] }), teil(3))} onAblauf={onAblauf} />)
    fireEvent.change(await screen.findByLabelText('Antwort auf den Weiterschreib-Prompt'), { target: { value: 'chapters: Rest' } })
    fireEvent.click(screen.getByRole('button', { name: 'Anhängen und prüfen' }))
    await waitFor(() => expect(api.sendeTeilAntwort).toHaveBeenCalledWith('a1', 2, { antwort: 'chapters: Rest', weiter: true }))
    await waitFor(() => expect(onAblauf).toHaveBeenCalledWith(neu))
  })

  it('lässt einen abgeschnittenen Teil auch ganz neu anfragen und wieder zurück', async () => {
    render(<SchrittTeile ablauf={ablaufMit(fertig(1), teil(2, { zustand: 'abgeschnitten', kapitel: ['A'] }), teil(3))} onAblauf={vi.fn()} />)
    fireEvent.click(await screen.findByRole('button', { name: 'Stattdessen den ganzen Teil neu anfragen' }))
    expect(await screen.findByRole('button', { name: 'Prompt für Teil 2 kopieren' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Zurück zum Weiterschreiben' }))
    expect(await screen.findByText('Teil 2 bricht ab.')).toBeInTheDocument()
  })

  it('bietet bei einem fertigen Teil an, ihn zu ersetzen', async () => {
    render(<SchrittTeile ablauf={ablaufMit(fertig(1), fertig(2), fertig(3))} onAblauf={vi.fn()} />)
    // alle fertig: nichts ist aufgeklappt, der Teil lässt sich per Tippen öffnen
    fireEvent.click(screen.getByRole('button', { name: /Teil 2 von 3/ }))
    expect(await screen.findByRole('button', { name: 'Ersetzen und prüfen' })).toBeInTheDocument()
    expect(screen.getByText('Teil 2 ist vollständig und in Ordnung (1 Kapitel).')).toBeInTheDocument()
  })

  it('zeigt einen Hinweis, wenn der Prompt nicht geladen werden konnte', async () => {
    api.ladeTeilPrompt.mockRejectedValue(new Error('x'))
    render(<SchrittTeile ablauf={ablaufMit(teil(1), teil(2))} onAblauf={vi.fn()} />)
    expect(await screen.findByText('Der Prompt konnte gerade nicht erstellt werden.')).toBeInTheDocument()
  })

  it('zeigt ohne Teil-Liste nichts', () => {
    const { container } = render(<SchrittTeile ablauf={{ id: 'a1' } as Ablauf} onAblauf={vi.fn()} />)
    expect(container).toBeEmptyDOMElement()
  })
})

describe('Rettungs-Box', () => {
  it('holt den Prompt erst auf Knopfdruck, wenn das Holen die Antwort kürzt', async () => {
    const ladePrompt = vi.fn().mockResolvedValue('WEITER …')
    render(<RettungsBox titel="Die Antwort wurde abgeschnitten." fertig={['A', 'B', 'C']} ladePrompt={ladePrompt} senden={vi.fn()} />)
    expect(ladePrompt).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Fertige Kapitel behalten, Rest nachholen' }))
    expect(await screen.findByRole('button', { name: 'Weiterschreib-Prompt kopieren' })).toBeInTheDocument()
    expect(ladePrompt).toHaveBeenCalledTimes(1)
    expect(screen.getByText(/3 Kapitel sind vollständig angekommen, zuletzt „C“/)).toBeInTheDocument()
  })

  it('nennt den Fehlersatz, wenn das Absenden scheitert, und behält den Text', async () => {
    const senden = vi.fn().mockResolvedValue({ ok: false, fehler: 'Aus dieser Antwort ließ sich kein vollständiges Kapitel übernehmen.' })
    render(<RettungsBox titel="x" fertig={['A']} ladePrompt={async () => 'p'} senden={senden} automatisch />)
    const feld = await screen.findByLabelText('Antwort auf den Weiterschreib-Prompt')
    fireEvent.change(feld, { target: { value: 'Mist' } })
    fireEvent.click(screen.getByRole('button', { name: 'Anhängen und prüfen' }))
    expect(await screen.findByText(/kein vollständiges Kapitel übernehmen/)).toBeInTheDocument()
    expect(feld).toHaveValue('Mist')
  })

  it('rät zu einem kleineren Abschnitt, wenn auch das Nachholen abbricht', async () => {
    const senden = vi.fn().mockResolvedValue({ ok: true, tippKleiner: true })
    render(<RettungsBox titel="x" fertig={['A']} ladePrompt={async () => 'p'} senden={senden} automatisch />)
    expect(screen.queryByText(/Wähle in Schritt 1 einen kleineren/)).not.toBeInTheDocument()
    fireEvent.change(await screen.findByLabelText('Antwort auf den Weiterschreib-Prompt'), { target: { value: 'x' } })
    fireEvent.click(screen.getByRole('button', { name: 'Anhängen und prüfen' }))
    expect(await screen.findByText(/Wähle in Schritt 1 einen kleineren/)).toBeInTheDocument()
  })

  it('zeigt den Tipp sofort, wenn er schon feststeht', () => {
    render(<RettungsBox titel="x" fertig={[]} ladePrompt={async () => 'p'} senden={vi.fn()} tippKleiner />)
    expect(screen.getByText(/Wähle in Schritt 1 einen kleineren/)).toBeInTheDocument()
    expect(screen.getByText('Es ist noch kein Kapitel vollständig angekommen. Sie bleiben erhalten. Es fehlt nur der Rest.')).toBeInTheDocument()
  })
})

describe('Rückfrage-Dialoge', () => {
  it('fragt vor dem Verwerfen der Teile und führt es nur nach „Ja“ aus', () => {
    const beiAuswahl = vi.fn()
    render(<TeileVerwerfenDialog satz="Deine 2 eingefügten Teil-Antworten gehen dabei verloren." beiAuswahl={beiAuswahl} />)
    const dialog = screen.getByRole('alertdialog')
    expect(within(dialog).getByText(/Deine 2 eingefügten Teil-Antworten gehen dabei verloren/)).toBeInTheDocument()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Ja, Teile verwerfen' }))
    expect(beiAuswahl).toHaveBeenCalledWith(true)
  })

  it('behält die Teile bei „Nein“', () => {
    const beiAuswahl = vi.fn()
    render(<TeileVerwerfenDialog satz="Deine eingefügte Teil-Antwort geht dabei verloren." beiAuswahl={beiAuswahl} />)
    fireEvent.click(screen.getByRole('button', { name: 'Nein, behalten' }))
    expect(beiAuswahl).toHaveBeenCalledWith(false)
    expect(beiAuswahl).not.toHaveBeenCalledWith(true)
  })

  it('ist ohne Satz zu', () => {
    render(<TeileVerwerfenDialog satz={null} beiAuswahl={vi.fn()} />)
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  })

  it('lässt „Weiter“ bei einem unvollständigen Teil nur nach Zustimmung zu', () => {
    const beiAuswahl = vi.fn()
    render(<UnvollstaendigDialog satz="Mindestens ein Teil ist abgeschnitten." beiAuswahl={beiAuswahl} />)
    fireEvent.click(screen.getByRole('button', { name: 'Ohne den Rest weiter' }))
    expect(beiAuswahl).toHaveBeenCalledWith(true)
  })

  it('bietet „Rest nachholen“ als sichere Wahl', () => {
    const beiAuswahl = vi.fn()
    render(<UnvollstaendigDialog satz="Mindestens ein Teil ist abgeschnitten." beiAuswahl={beiAuswahl} />)
    fireEvent.click(screen.getByRole('button', { name: 'Rest nachholen' }))
    expect(beiAuswahl).toHaveBeenCalledWith(false)
  })
})
