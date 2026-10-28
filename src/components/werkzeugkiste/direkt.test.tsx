import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { SchrittErstellen, fortschrittSatz } from './schritt-erstellen'
import { KostenRueckfrage, WegKarte, type WegDaten } from './schritt-wegwahl'
import { Fortschritt } from './ablauf-rahmen'
import { SchrittFertig } from './schritt-fertig'
import { schrittAusParam, schrittErlaubt, type LaufInfo } from '@/lib/werkzeugkiste'

const LAUF: LaufInfo = {
  id: 'l1',
  status: 'laeuft',
  teileGesamt: 6,
  teileFertig: 2,
  kostenEur: 0.12,
  fehler: null,
  fehlerArt: null,
  gestartetAm: '2026-10-29T08:00:00Z',
  beendetAm: null,
}
const PREIS = { ein: 2, aus: 10, cache_schreiben: 2.5, cache_lesen: 0.1 }
const DATEN: WegDaten = { sperre: null, preis: PREIS, usdEur: 0.86, teile: [25_000] }

describe('Direkt erstellen – Oberfläche (PROJ-64)', () => {
  describe('Wegwahl', () => {
    it('nennt beim direkten Weg die geschätzten Kosten und die Dauer', () => {
      render(<WegKarte daten={DATEN} fehler={false} />)
      expect(screen.getByText(/^ca\. 0,\d\d € · etwa \d+(–\d+)? Minuten$/)).toBeInTheDocument()
      expect(screen.getByText('Kostenlos mit eigener KI')).toBeInTheDocument()
    })

    it('erklärt bei leerem Guthaben den Grund und zeigt keine Kosten', () => {
      render(<WegKarte daten={{ ...DATEN, sperre: 'guthaben' }} fehler={false} />)
      expect(screen.getByText(/Schulguthaben .* aufgebraucht/)).toBeInTheDocument()
      expect(screen.queryByText(/^ca\./)).not.toBeInTheDocument()
    })

    it('erklärt das erreichte Tageslimit', () => {
      render(<WegKarte daten={{ ...DATEN, sperre: 'tageslimit' }} fehler={false} />)
      expect(screen.getByText(/Heute sind schon 20 direkte Erstellungen erreicht/)).toBeInTheDocument()
    })

    it('zeigt „wird berechnet“ bzw. einen Satz, wenn die Kosten nicht kommen', () => {
      const { rerender } = render(<WegKarte daten={null} fehler={false} />)
      expect(screen.getByText('Kosten werden berechnet …')).toBeInTheDocument()
      rerender(<WegKarte daten={null} fehler />)
      expect(screen.getByText('Die Kosten ließen sich gerade nicht berechnen.')).toBeInTheDocument()
    })

    it('fragt bei hohen Kosten nach und gibt die Antwort zurück', () => {
      const wahl = vi.fn()
      render(<KostenRueckfrage satz="Das kostet ca. 2,40 €. Trotzdem erstellen?" offen beiAuswahl={wahl} />)
      expect(screen.getByText('Das kostet ca. 2,40 €. Trotzdem erstellen?')).toBeInTheDocument()
      fireEvent.click(screen.getByRole('button', { name: 'Trotzdem erstellen' }))
      expect(wahl).toHaveBeenCalledWith(true)
    })
  })

  describe('Erstellen (Warte-Bildschirm)', () => {
    const rest = { beschaeftigt: false, abbrechen: vi.fn(), nochmal: vi.fn(), kostenlos: vi.fn() }

    it('beschreibt den Fortschritt in Worten', () => {
      expect(fortschrittSatz(null)).toMatch(/gestartet/)
      expect(fortschrittSatz({ ...LAUF, teileGesamt: 1, teileFertig: 0 })).toBe('Die KI schreibt dein Material …')
      expect(fortschrittSatz({ ...LAUF, teileFertig: 0 })).toMatch(/6 Teile gleichzeitig/)
      expect(fortschrittSatz(LAUF)).toBe('2 von 6 Teilen sind fertig …')
      expect(fortschrittSatz({ ...LAUF, status: 'baut' })).toBe('Die Datei wird gebaut …')
    })

    it('zeigt beim Warten Hinweis zum Verlassen und fragt beim Abbrechen mit dem bisherigen Betrag nach', () => {
      const abbrechen = vi.fn()
      render(<SchrittErstellen lauf={LAUF} {...rest} abbrechen={abbrechen} />)
      expect(screen.getByRole('status')).toHaveTextContent('2 von 6 Teilen sind fertig')
      expect(screen.getByText(/Du kannst diese Seite offen lassen oder verlassen/)).toBeInTheDocument()
      fireEvent.click(screen.getByRole('button', { name: 'Abbrechen' }))
      expect(screen.getByText(/Bis jetzt sind 0,12 € angefallen/)).toBeInTheDocument()
      fireEvent.click(screen.getAllByRole('button', { name: 'Abbrechen' }).at(-1)!)
      expect(abbrechen).toHaveBeenCalledTimes(1)
    })

    it('bietet nach einem Fehler „Erneut versuchen“ und den kostenlosen Weg an, ohne technische Texte', () => {
      const nochmal = vi.fn()
      const kostenlos = vi.fn()
      const fehler: LaufInfo = { ...LAUF, status: 'fehlgeschlagen', fehler: 'Die KI hat gerade nicht geantwortet.', fehlerArt: 'ki' }
      render(<SchrittErstellen lauf={fehler} {...rest} nochmal={nochmal} kostenlos={kostenlos} />)
      expect(screen.getByRole('alert')).toHaveTextContent('Die KI hat gerade nicht geantwortet.')
      expect(screen.getByText(/angefallene Kosten: 0,12 €/)).toBeInTheDocument()
      fireEvent.click(screen.getByRole('button', { name: /Erneut versuchen/ }))
      fireEvent.click(screen.getByRole('button', { name: /Kostenlos mit eigener KI weitermachen/ }))
      expect(nochmal).toHaveBeenCalledTimes(1)
      expect(kostenlos).toHaveBeenCalledTimes(1)
    })

    it('zeigt bei leerem Guthaben nur den kostenlosen Weg', () => {
      const leer: LaufInfo = { ...LAUF, status: 'fehlgeschlagen', fehler: 'Guthaben leer.', fehlerArt: 'guthaben' }
      render(<SchrittErstellen lauf={leer} {...rest} />)
      expect(screen.queryByRole('button', { name: /Erneut versuchen/ })).not.toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Kostenlos mit eigener KI weitermachen/ })).toBeInTheDocument()
    })

    it('meldet einen Abbruch und nennt die Kosten', () => {
      render(<SchrittErstellen lauf={{ ...LAUF, status: 'abgebrochen' }} {...rest} />)
      expect(screen.getByText('Die Erstellung wurde abgebrochen.')).toBeInTheDocument()
    })
  })

  describe('Fortschrittsleiste und Schritte', () => {
    it('zeigt beim direkten Weg vier Schritte (Skript · Einstellungen · Erstellen · Fertig)', () => {
      render(<Fortschritt schritt={3} erreicht={3} direkt />)
      expect(screen.getByText(/Schritt 3 von 4/)).toBeInTheDocument()
      expect(screen.getAllByText('Erstellen').length).toBeGreaterThan(0)
      expect(screen.queryByText('Prompt')).not.toBeInTheDocument()
    })

    it('zählt Fertig beim direkten Weg als vierten Schritt', () => {
      render(<Fortschritt schritt={5} erreicht={5} direkt />)
      expect(screen.getByText(/Schritt 4 von 4/)).toBeInTheDocument()
    })

    it('zeigt beim kostenlosen Weg weiter fünf Schritte', () => {
      render(<Fortschritt schritt={3} erreicht={3} />)
      expect(screen.getByText(/Schritt 3 von 5/)).toBeInTheDocument()
    })

    it('erlaubt „Erstellen“ beim direkten Weg ohne Prompt, beim kostenlosen nicht', () => {
      const basis = { kennzahlen: { seiten: 1, loesungen: 0, bilder: 0, tabellen: 0 }, prompt: null, ergebnis: null }
      expect(schrittErlaubt({ ...basis, weg: 'direkt' }, 3)).toBe(true)
      expect(schrittErlaubt({ ...basis, weg: 'kostenlos' }, 3)).toBe(false)
      expect(schrittErlaubt({ ...basis, weg: 'direkt' }, 4)).toBe(false)
      expect(schrittAusParam('3', { ...basis, schritt: 3, weg: 'direkt' })).toBe(3)
      expect(schrittAusParam('3', { ...basis, schritt: 2, weg: null })).toBe(2)
    })
  })

  describe('Fertig nach direktem Weg', () => {
    const ergebnis = { titel: 'Heft 2', dateiname: 'Heft_2.h5p', format: 'h5p', kapitel: 6, aufgaben: 40 }

    it('zeigt den genauen Betrag und kurze Hinweise, aber kein „Antwort überarbeiten“', () => {
      render(<SchrittFertig ablaufId="a1" ergebnis={ergebnis} direkt kostenEur={0.13} hinweise={['Kapitel 2 – Memory wird ersetzt']} />)
      expect(screen.getByText('Kosten: 0,13 €')).toBeInTheDocument()
      expect(screen.getByText('Kapitel 2 – Memory wird ersetzt')).toBeInTheDocument()
      expect(screen.queryByText('Antwort überarbeiten')).not.toBeInTheDocument()
    })

    it('begrenzt die Hinweise auf fünf', () => {
      const viele = Array.from({ length: 8 }, (_, i) => `Hinweis ${i + 1}`)
      render(<SchrittFertig ablaufId="a1" ergebnis={ergebnis} direkt kostenEur={0.2} hinweise={viele} />)
      expect(screen.getByText('Hinweis 5')).toBeInTheDocument()
      expect(screen.queryByText('Hinweis 6')).not.toBeInTheDocument()
      expect(screen.getByText('… und 3 weitere.')).toBeInTheDocument()
    })

    it('zeigt beim kostenlosen Weg keine Kosten und weiter „Antwort überarbeiten“', () => {
      render(<SchrittFertig ablaufId="a1" ergebnis={ergebnis} />)
      expect(screen.queryByText(/Kosten:/)).not.toBeInTheDocument()
      expect(screen.getByText('Antwort überarbeiten')).toBeInTheDocument()
    })
  })
})
