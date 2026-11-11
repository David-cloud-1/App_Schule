import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react'

vi.mock('@/lib/werkzeugkiste-api', () => ({
  ladeHilfeAngebot: vi.fn(),
  speichereHilfeAngebot: vi.fn(),
}))

import { ladeHilfeAngebot, speichereHilfeAngebot } from '@/lib/werkzeugkiste-api'
import {
  HILFE_KNOPF_ID,
  HilfeAngebot,
  HilfeKnopf,
  HilfePanel,
  MARKIERUNG_MS,
  useHilfe,
  zeigeStelle,
  type HilfeKontext,
  type HilfeSteuerung,
} from './ablauf-assistent'
import { AblaufRahmen } from './ablauf-rahmen'

/** Assistent „Schritt für Schritt“ (PROJ-87): Knopf, Angebot, Panel, Markierung */

const FOLGE = ['skript', 'einstellungen', 'auftrag', 'antwort', 'fertig'] as const
const kontext = (extra: Partial<HilfeKontext> = {}): HilfeKontext => ({
  werkzeug: 'skript',
  variante: 'einstellungen',
  folge: [...FOLGE],
  erledigt: false,
  problem: null,
  ...extra,
})

function steuerung(extra: Partial<HilfeSteuerung> = {}): HilfeSteuerung {
  return {
    verfuegbar: true,
    offen: true,
    setOffen: vi.fn(),
    eingeklappt: false,
    setEingeklappt: vi.fn(),
    angebot: 'beantwortet',
    beantworteAngebot: vi.fn(),
    ...extra,
  }
}

beforeEach(() => {
  vi.mocked(ladeHilfeAngebot).mockReset()
  vi.mocked(speichereHilfeAngebot).mockReset().mockResolvedValue({ werkzeug: 'skript', beantwortet: true, antwort: 'ja' })
  window.sessionStorage.clear()
})
afterEach(() => vi.useRealTimers())

describe('Hilfe-Knopf', () => {
  it('zeigt den Knopf nur bei Werkzeugen mit Hilfeseiten, nie als grüne Hauptaktion', () => {
    const { rerender } = render(<HilfeKnopf steuerung={steuerung({ offen: false })} />)
    const knopf = screen.getByRole('button', { name: /Hilfe/ })
    expect(knopf.className).not.toMatch(/bg-ws-green/)
    expect(knopf).toHaveAttribute('aria-expanded', 'false')
    rerender(<HilfeKnopf steuerung={steuerung({ verfuegbar: false })} />)
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('schaltet den Assistenten ein und aus', () => {
    const s = steuerung({ offen: false })
    render(<HilfeKnopf steuerung={s} />)
    fireEvent.click(screen.getByRole('button'))
    expect(s.setOffen).toHaveBeenCalledWith(true)
  })
})

describe('Angebot „Neu hier?“', () => {
  it('erscheint nur, solange es offen ist, und blockiert nichts (kein Dialog)', () => {
    const { rerender } = render(<HilfeAngebot steuerung={steuerung({ angebot: 'offen' })} />)
    expect(screen.getByText(/Neu hier\? Ich führe dich Schritt für Schritt durch\./)).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).toBeNull()
    for (const a of ['laden', 'beantwortet'] as const) {
      rerender(<HilfeAngebot steuerung={steuerung({ angebot: a })} />)
      expect(screen.queryByText(/Neu hier/)).toBeNull()
    }
  })

  it('gibt die Antwort „Ja, bitte“ und „Nein, danke“ weiter', () => {
    const s = steuerung({ angebot: 'offen' })
    render(<HilfeAngebot steuerung={s} />)
    fireEvent.click(screen.getByRole('button', { name: 'Ja, bitte' }))
    fireEvent.click(screen.getByRole('button', { name: 'Nein, danke' }))
    expect(vi.mocked(s.beantworteAngebot).mock.calls).toEqual([['ja'], ['nein']])
  })
})

describe('useHilfe', () => {
  it('startet geschlossen und fragt das Angebot einmal ab', async () => {
    vi.mocked(ladeHilfeAngebot).mockResolvedValue({ werkzeug: 'skript', beantwortet: false, antwort: null })
    const { result } = renderHook(() => useHilfe('skript'))
    expect(result.current.offen).toBe(false)
    expect(result.current.angebot).toBe('laden')
    await waitFor(() => expect(result.current.angebot).toBe('offen'))
    expect(ladeHilfeAngebot).toHaveBeenCalledTimes(1)
  })

  it('zeigt kein Angebot, wenn es schon beantwortet ist oder die Abfrage scheitert', async () => {
    vi.mocked(ladeHilfeAngebot).mockResolvedValueOnce({ werkzeug: 'skript', beantwortet: true, antwort: 'nein' })
    const a = renderHook(() => useHilfe('skript'))
    await waitFor(() => expect(a.result.current.angebot).toBe('beantwortet'))
    vi.mocked(ladeHilfeAngebot).mockRejectedValueOnce(new Error('weg'))
    const b = renderHook(() => useHilfe('skript'))
    await waitFor(() => expect(b.result.current.angebot).toBe('beantwortet'))
  })

  it('fragt bei Werkzeugen ohne Hilfeseiten gar nicht erst', () => {
    const { result } = renderHook(() => useHilfe('kahoot'))
    expect(result.current.verfuegbar).toBe(false)
    expect(ladeHilfeAngebot).not.toHaveBeenCalled()
  })

  it('„Ja“ öffnet den Assistenten und merkt die Antwort, „Nein“ merkt nur', async () => {
    vi.mocked(ladeHilfeAngebot).mockResolvedValue({ werkzeug: 'skript', beantwortet: false, antwort: null })
    const { result } = renderHook(() => useHilfe('skript'))
    await waitFor(() => expect(result.current.angebot).toBe('offen'))
    act(() => result.current.beantworteAngebot('ja'))
    expect(result.current.offen).toBe(true)
    expect(result.current.angebot).toBe('beantwortet')
    expect(speichereHilfeAngebot).toHaveBeenCalledWith('skript', 'ja')

    const nein = renderHook(() => useHilfe('skript'))
    await waitFor(() => expect(nein.result.current.angebot).toBe('offen'))
    act(() => nein.result.current.beantworteAngebot('nein'))
    expect(nein.result.current.offen).toBe(false)
    expect(speichereHilfeAngebot).toHaveBeenLastCalledWith('skript', 'nein')
  })

  it('scheitert das Speichern, bleibt die Karte trotzdem weg und nichts wird angezeigt', async () => {
    vi.mocked(ladeHilfeAngebot).mockResolvedValue({ werkzeug: 'skript', beantwortet: false, antwort: null })
    vi.mocked(speichereHilfeAngebot).mockRejectedValue(new Error('offline'))
    const { result } = renderHook(() => useHilfe('skript'))
    await waitFor(() => expect(result.current.angebot).toBe('offen'))
    act(() => result.current.beantworteAngebot('nein'))
    expect(result.current.angebot).toBe('beantwortet')
  })

  it('gibt den offenen Zustand von „Neues Material“ an den Ablauf weiter, aber nur einmal', () => {
    vi.mocked(ladeHilfeAngebot).mockResolvedValue({ werkzeug: 'skript', beantwortet: true, antwort: 'ja' })
    const neu = renderHook(() => useHilfe('skript', 'schreiben'))
    act(() => neu.result.current.setOffen(true))
    const ablauf = renderHook(() => useHilfe('skript', 'lesen'))
    expect(ablauf.result.current.offen).toBe(true)
    const naechster = renderHook(() => useHilfe('skript', 'lesen'))
    expect(naechster.result.current.offen).toBe(false)
  })

  it('ein neuer Ablauf ist ohne Übergabe geschlossen', () => {
    vi.mocked(ladeHilfeAngebot).mockResolvedValue({ werkzeug: 'skript', beantwortet: true, antwort: 'ja' })
    const { result } = renderHook(() => useHilfe('skript', 'lesen'))
    expect(result.current.offen).toBe(false)
  })
})

describe('Assistent-Panel', () => {
  it('ist geschlossen unsichtbar', () => {
    render(<HilfePanel steuerung={steuerung({ offen: false })} kontext={kontext()} />)
    expect(screen.queryByRole('complementary')).toBeNull()
  })

  it('zeigt Schrittanzeige, Überschrift, eine Anweisung, ein Beispiel und „Fertig, wenn …“', () => {
    render(<HilfePanel steuerung={steuerung()} kontext={kontext()} />)
    const panel = screen.getByRole('complementary', { name: 'Hilfe: Schritt für Schritt' })
    expect(panel).toHaveTextContent('Schritt 2 von 5')
    expect(panel).toHaveTextContent('Einstellungen')
    expect(screen.getByRole('heading', { name: 'Was soll daraus werden?' })).toBeInTheDocument()
    expect(panel).toHaveTextContent('Wähle das Format und das Niveau für dein Material.')
    expect(panel).toHaveTextContent(/Zum Beispiel: Interaktive Seite/)
    expect(panel).toHaveTextContent(/Fertig, wenn du unten auf/)
    expect(panel.className).toMatch(/print:hidden/)
  })

  it('„Mehr dazu“ ist zu, bis man es aufklappt', () => {
    render(<HilfePanel steuerung={steuerung()} kontext={kontext()} />)
    expect(screen.queryByText(/Die Voreinstellung passt meistens/)).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: /Mehr dazu/ }))
    expect(screen.getByText(/Die Voreinstellung passt meistens/)).toBeInTheDocument()
  })

  it('sagt „Erledigt“ (auch für Screenreader) und behält das Erkennungszeichen', () => {
    render(<HilfePanel steuerung={steuerung()} kontext={kontext({ erledigt: true })} />)
    expect(screen.getByText('Erledigt')).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Schritt 2 von 5')
    expect(screen.getByRole('status')).toHaveTextContent('erledigt')
    expect(screen.getByText(/Fertig, wenn du unten auf/)).toBeInTheDocument()
  })

  it('ohne „erledigt“ gibt es kein Häkchen', () => {
    render(<HilfePanel steuerung={steuerung()} kontext={kontext()} />)
    expect(screen.queryByText('Erledigt')).toBeNull()
    expect(screen.getByRole('status')).not.toHaveTextContent('erledigt')
  })

  it('blättert mit „Hilfe zu Schritt N“ nur in der Hilfe und folgt dem Formular, sobald der Schritt wechselt', () => {
    const s = steuerung()
    const { rerender } = render(<HilfePanel steuerung={s} kontext={kontext()} />)
    fireEvent.click(screen.getByRole('button', { name: /Hilfe zu Schritt 3/ }))
    expect(screen.getByRole('heading')).toHaveTextContent('Auftrag an die KI (Prompt) kopieren')
    fireEvent.click(screen.getByRole('button', { name: /Hilfe zu Schritt 2/ }))
    fireEvent.click(screen.getByRole('button', { name: /Hilfe zu Schritt 1/ }))
    expect(screen.getByRole('heading')).toHaveTextContent('Skript hochladen')
    expect(screen.queryByRole('button', { name: /‹ Hilfe zu Schritt/ })).toBeNull()
    // Verwechslungsgefahr mit dem Weiter des Ablaufs ausgeschlossen: kein Knopf heißt nur „Weiter“
    expect(screen.queryByRole('button', { name: 'Weiter' })).toBeNull()
    // Im Formular geht es zu Schritt 4: der Assistent folgt
    rerender(<HilfePanel steuerung={s} kontext={kontext({ variante: 'antwort' })} />)
    expect(screen.getByRole('heading')).toHaveTextContent('Antwort der KI einfügen')
  })

  it('eine Kopie aus dem Regal beginnt bei der Antwort', () => {
    render(<HilfePanel steuerung={steuerung()} kontext={kontext({ variante: 'antwort', folge: ['antwort', 'fertig'] })} />)
    expect(screen.queryByRole('button', { name: /‹ Hilfe zu Schritt/ })).toBeNull()
    expect(screen.getByRole('heading')).toHaveTextContent('Antwort der KI einfügen')
  })

  it('bietet nach „erledigt“ ein „Weiter zu Schritt N“, das den Hauptknopf des Formulars drückt', () => {
    const fuss = document.createElement('div')
    fuss.setAttribute('data-hilfe', 'weiter')
    const zurueck = document.createElement('button')
    const hauptknopf = document.createElement('button')
    const geklickt = vi.fn()
    hauptknopf.addEventListener('click', geklickt)
    fuss.append(zurueck, hauptknopf)
    document.body.appendChild(fuss)
    render(<HilfePanel steuerung={steuerung()} kontext={kontext({ erledigt: true })} />)
    fireEvent.click(screen.getByRole('button', { name: 'Weiter zu Schritt 3' }))
    expect(geklickt).toHaveBeenCalledTimes(1)
    fuss.remove()
  })

  it('ohne „erledigt“ gibt es kein „Weiter zu Schritt N“, im letzten Schritt auch nicht', () => {
    const { rerender } = render(<HilfePanel steuerung={steuerung()} kontext={kontext()} />)
    expect(screen.queryByRole('button', { name: /Weiter zu Schritt/ })).toBeNull()
    rerender(<HilfePanel steuerung={steuerung()} kontext={kontext({ variante: 'fertig', erledigt: true })} />)
    expect(screen.queryByRole('button', { name: /Weiter zu Schritt/ })).toBeNull()
  })

  it('ist ein Teil des Seitenflusses (unter 1280 px) und überdeckt nie das Formular', () => {
    render(<HilfePanel steuerung={steuerung()} kontext={kontext()} />)
    const klassen = screen.getByRole('complementary').className
    expect(klassen).not.toMatch(/(^|\s)fixed(\s|$)/)
    expect(klassen).toMatch(/xl:fixed/)
  })

  it('zeigt bei einem Problem die Handlungshilfe statt der Standardseite', () => {
    render(<HilfePanel steuerung={steuerung()} kontext={kontext({ variante: 'antwort', problem: 'unvollstaendig' })} />)
    expect(screen.getByRole('alert')).toHaveTextContent('Die Antwort der KI wurde mittendrin abgebrochen.')
    expect(screen.queryByText(/Kopiere die ganze Antwort der KI/)).toBeNull()
  })

  it('bietet bei Kontrollfehlern „Nachbesserungs-Auftrag kopieren“', () => {
    render(
      <HilfePanel
        steuerung={steuerung()}
        kontext={kontext({ variante: 'antwort', problem: 'kontrolle_fehler', nachbesserung: 'Bitte ergänze …' })}
      />,
    )
    expect(screen.getByRole('button', { name: /Nachbesserungs-Auftrag kopieren/ })).toBeInTheDocument()
  })

  it('zeigt nie Technik: der allgemeine Fall nennt einen Ausweg', () => {
    render(<HilfePanel steuerung={steuerung()} kontext={kontext({ problem: 'allgemein' })} />)
    expect(screen.getByRole('alert')).toHaveTextContent('Das hat nicht geklappt.')
    expect(screen.getByRole('alert')).toHaveTextContent('Versuche es noch einmal oder lade eine andere Datei hoch.')
  })

  it('zeigt bei Teilen den Stand „2 von 3 Teilen“', () => {
    render(<HilfePanel steuerung={steuerung()} kontext={kontext({ variante: 'teile', teileZeile: '2 von 3 Teilen eingefügt' })} />)
    expect(screen.getByText('2 von 3 Teilen eingefügt')).toBeInTheDocument()
  })

  it('Schließen und Esc schließen, der Fokus geht zurück zum Hilfe-Knopf', () => {
    const knopf = document.createElement('button')
    knopf.id = HILFE_KNOPF_ID
    document.body.appendChild(knopf)
    const s = steuerung()
    const { rerender } = render(<HilfePanel steuerung={s} kontext={kontext()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Hilfe schließen' }))
    expect(s.setOffen).toHaveBeenLastCalledWith(false)
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(s.setOffen).toHaveBeenCalledTimes(2)
    rerender(<HilfePanel steuerung={{ ...s, offen: false }} kontext={kontext()} />)
    expect(document.activeElement).toBe(knopf)
    knopf.remove()
  })

  it('Esc schließt nicht, solange ein Dialog offen ist', () => {
    const s = steuerung()
    render(
      <>
        <div role="alertdialog" />
        <HilfePanel steuerung={s} kontext={kontext()} />
      </>,
    )
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(s.setOffen).not.toHaveBeenCalled()
  })

  it('beim Öffnen springt der Fokus in den Assistenten', () => {
    const s = steuerung({ offen: false })
    const { rerender } = render(<HilfePanel steuerung={s} kontext={kontext()} />)
    rerender(<HilfePanel steuerung={{ ...s, offen: true }} kontext={kontext()} />)
    expect(document.activeElement).toBe(screen.getByRole('heading'))
  })

  it('auf dem Handy lässt sich die Karte einklappen (nur die Titelzeile bleibt)', () => {
    const s = steuerung()
    render(<HilfePanel steuerung={s} kontext={kontext()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Hilfe einklappen' }))
    expect(s.setEingeklappt).toHaveBeenCalledWith(true)
  })
})

describe('„Zeig mir die Stelle“', () => {
  function stelle(name: string) {
    const el = document.createElement('div')
    el.setAttribute('data-hilfe', name)
    el.scrollIntoView = vi.fn()
    document.body.appendChild(el)
    return el
  }

  it('scrollt hin und markiert die Stelle genau 2 Sekunden', () => {
    vi.useFakeTimers()
    const el = stelle('einstellungen')
    expect(zeigeStelle('einstellungen')).toBe(true)
    expect(el.scrollIntoView).toHaveBeenCalled()
    expect(el.classList.contains('ring-ws-green')).toBe(true)
    vi.advanceTimersByTime(MARKIERUNG_MS - 1)
    expect(el.classList.contains('ring-ws-green')).toBe(true)
    vi.advanceTimersByTime(2)
    expect(el.classList.contains('ring-ws-green')).toBe(false)
    el.remove()
  })

  it('springt bei „Bewegung reduzieren“ ohne Animation', () => {
    const el = stelle('datei')
    vi.stubGlobal('matchMedia', () => ({ matches: true }))
    zeigeStelle('datei')
    expect(el.scrollIntoView).toHaveBeenCalledWith({ behavior: 'auto', block: 'center' })
    vi.unstubAllGlobals()
    el.remove()
  })

  it('meldet false, wenn es die Stelle gerade nicht gibt', () => {
    expect(zeigeStelle('teile')).toBe(false)
  })

  it('der Knopf markiert die Stelle', () => {
    vi.useFakeTimers()
    const el = stelle('einstellungen')
    const s = steuerung()
    render(<HilfePanel steuerung={s} kontext={kontext()} />)
    fireEvent.click(screen.getByRole('button', { name: /Zeig mir die Stelle/ }))
    act(() => {
      vi.advanceTimersByTime(60)
    })
    expect(el.classList.contains('ring-ws-green')).toBe(true)
    el.remove()
  })

  it('„Weiter zu Schritt N“ markiert die Fußzeile, wenn der Hauptknopf gerade nicht drückbar ist', () => {
    vi.useFakeTimers()
    const weiter = stelle('weiter')
    render(<HilfePanel steuerung={steuerung()} kontext={kontext({ erledigt: true })} />)
    fireEvent.click(screen.getByRole('button', { name: 'Weiter zu Schritt 3' }))
    expect(weiter.classList.contains('ring-ws-green')).toBe(true)
    weiter.remove()
  })
})

describe('Einbau im Ablauf-Rahmen', () => {
  const rahmen = (hilfe?: { steuerung: HilfeSteuerung; kontext: HilfeKontext }) =>
    render(
      <AblaufRahmen schritt={2} erreicht={2} titel="Was soll daraus werden?" schliessen={<span />} hilfe={hilfe}>
        <p>Formular</p>
      </AblaufRahmen>,
    )

  it('ohne Assistent sieht der Rahmen aus wie bisher', () => {
    rahmen()
    expect(screen.queryByRole('complementary')).toBeNull()
    expect(screen.queryByText(/Hilfe/)).toBeNull()
  })

  it('zeigt den Knopf in der Kopfzeile, das Angebot unter dem Fortschritt und den Assistenten nur auf Wunsch', () => {
    rahmen({ steuerung: steuerung({ offen: false, angebot: 'offen' }), kontext: kontext() })
    expect(screen.getByRole('button', { name: /Hilfe: Schritt für Schritt/ })).toBeInTheDocument()
    expect(screen.getByText(/Neu hier\?/)).toBeInTheDocument()
    expect(screen.queryByRole('complementary')).toBeNull()
    expect(screen.getByText('Formular')).toBeInTheDocument()
  })

  it('bei einem Werkzeug ohne Hilfeseiten gibt es weder Knopf noch Assistent', () => {
    rahmen({ steuerung: steuerung({ verfuegbar: false, offen: true }), kontext: kontext() })
    expect(screen.queryByRole('button', { name: /Hilfe/ })).toBeNull()
    expect(screen.queryByRole('complementary')).toBeNull()
  })

  it('der offene Assistent steht im Seitenfluss unter dem Fortschritt und schiebt die Spalte ab 1280 px zur Seite', () => {
    rahmen({ steuerung: steuerung(), kontext: kontext() })
    const main = document.getElementById('ws-main')!
    expect(main).toContainElement(screen.getByRole('complementary'))
    expect(screen.getByText('Formular')).toBeVisible()
    expect(main.parentElement?.className).toMatch(/xl:pr-\[22rem\]/)
  })

  it('geschlossen bleibt die Spalte unverändert', () => {
    rahmen({ steuerung: steuerung({ offen: false }), kontext: kontext() })
    expect(document.getElementById('ws-main')?.parentElement?.className).not.toMatch(/xl:pr/)
  })
})
