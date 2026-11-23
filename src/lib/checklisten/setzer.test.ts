import { describe, expect, it } from 'vitest'
import daten from './daten/leitlinien.json'
import { blockText, findeAnker, setzeLeitlinie, woerter } from './setzer'
import { CHECKLISTEN_LISTEN } from './listen'

const NORMEN = (daten as { normen: { kennung: string; text: string }[] }).normen

describe('Setzer', () => {
  it('erkennt Titel, Überschrift, Liste und Warnung', () => {
    const bloecke = setzeLeitlinie(
      'HLL-Test\nAnlage beifügen:\n• erstens • zweitens\nDefinitionen\nAchtung! Nicht ohne Antrag!',
    )
    expect(bloecke.map((b) => b.art)).toEqual(['kopf', 'absatz', 'liste', 'ueberschrift', 'warnung'])
    expect(bloecke[2]).toMatchObject({ art: 'liste', punkte: ['erstens', 'zweitens'] })
  })

  it('setzt „- “-Listen auch mitten in der Zeile', () => {
    const bloecke = setzeLeitlinie('Titel\nDienstreiseantrag: - Eins ist das - Zwei ist jenes')
    expect(bloecke[2]).toMatchObject({ art: 'liste', punkte: ['Eins ist das', 'Zwei ist jenes'] })
  })

  it('setzt bekannte Überschriften nur an Satzanfängen', () => {
    const bloecke = setzeLeitlinie(
      'Titel\nEinleitung. Zeitraum Sie dürfen im Zeitraum zwischen den Ferien nicht fahren.',
      ['Zeitraum'],
    )
    expect(bloecke.filter((b) => b.art === 'ueberschrift').map(blockText)).toEqual(['Zeitraum'])
    expect(blockText(bloecke[bloecke.length - 1])).toContain('im Zeitraum zwischen')
  })

  it('lässt Unsicheres als Absatz stehen', () => {
    const bloecke = setzeLeitlinie('Titel\nEin ganz normaler Satz, der weiter geht und nicht endet')
    expect(bloecke[1].art).toBe('absatz')
  })

  // Wort für Wort gleich zur Quelle – für ALLE Leitlinien, nicht nur die Pilot-Listen
  it.each(NORMEN.map((n) => [n.kennung, n.text] as const))('lässt bei „%s“ kein Wort weg und ändert keins', (_name, text) => {
    const ueberschriften = CHECKLISTEN_LISTEN.flatMap((l) => l.quellen).find((q) => q.leitlinie === _name)?.ueberschriften
    const gesetzt = setzeLeitlinie(text, ueberschriften)
    expect(woerter(gesetzt.map(blockText).join(' '))).toEqual(woerter(text))
  })
})

describe('Anker', () => {
  it('findet eine Wendung über Zeilenumbrüche und Leerraum hinweg', () => {
    const bloecke = setzeLeitlinie('Titel\nEs gilt:\n• mindestens   14 Tage vorher')
    expect(findeAnker(bloecke, 'mindestens 14 Tage vorher')).toBe('b2')
    expect(findeAnker(bloecke, 'gibt es nicht')).toBeNull()
  })
})
