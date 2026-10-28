import { describe, expect, it } from 'vitest'
import { addiere, euro, kostenUsd, LEER_VERBRAUCH, schaetze, schaetzungsSatz, type ModellPreis } from './werkzeugkiste-kosten'

const SONNET: ModellPreis = { ein: 2, aus: 10, cache_schreiben: 2.5, cache_lesen: 0.1 }

describe('Kosten der direkten Erstellung (PROJ-64)', () => {
  it('rechnet den genauen Betrag aus allen vier Verbrauchsarten', () => {
    // 10.000 ein, 5.000 aus, 11.000 Cache schreiben, 0 lesen
    expect(kostenUsd({ ein: 10_000, aus: 5_000, cacheSchreiben: 11_000, cacheLesen: 0 }, SONNET)).toBeCloseTo(0.02 + 0.05 + 0.0275, 6)
    expect(kostenUsd({ ...LEER_VERBRAUCH, cacheLesen: 1_000_000 }, SONNET)).toBeCloseTo(0.1, 6)
    expect(kostenUsd(LEER_VERBRAUCH, SONNET)).toBe(0)
  })

  it('addiert den Verbrauch mehrerer Aufrufe (Nachbesserung zählt zum Teil)', () => {
    const a = { ein: 1, aus: 2, cacheSchreiben: 3, cacheLesen: 4 }
    expect(addiere(a, a)).toEqual({ ein: 2, aus: 4, cacheSchreiben: 6, cacheLesen: 8 })
  })

  it('schätzt ein normales Skript auf etwa 15 Cent und ein sehr langes auf unter einen Euro', () => {
    const normal = schaetze([25_000], SONNET, 0.86)
    expect(normal.eur).toBeGreaterThan(0.08)
    expect(normal.eur).toBeLessThan(0.3)
    const lang = schaetze(Array(6).fill(19_500), SONNET, 0.86)
    expect(lang.eur).toBeGreaterThan(0.4)
    expect(lang.eur).toBeLessThan(1.2)
    // Teile laufen parallel: Die Dauer hängt am längsten Teil, nicht an der Summe
    expect(lang.minutenBis).toBeLessThanOrEqual(normal.minutenBis + 1)
  })

  it('macht den zwischengespeicherten Prompt ab dem zweiten Teil billiger', () => {
    const einTeil = schaetze([20_000], SONNET, 1).eur
    const zweiTeile = schaetze([20_000, 20_000], SONNET, 1).eur
    expect(zweiTeile).toBeLessThan(2 * einTeil)
  })

  it('zeigt Beträge deutsch und mit „ca.“', () => {
    expect(euro(0.1234)).toBe('0,12 €')
    expect(euro(0.001)).toBe('< 0,01 €')
    expect(euro(0)).toBe('0,00 €')
    expect(schaetzungsSatz({ eur: 0.15, minutenVon: 1, minutenBis: 2 })).toBe('ca. 0,15 € · etwa 1–2 Minuten')
  })
})
