import { describe, expect, it } from 'vitest'
import { WERKZEUGE } from '@/lib/werkzeugkiste'
import {
  erkenneProblem,
  hatHilfe,
  HILFE_SCHRITT_NR,
  HILFE_VARIANTEN,
  HILFE_WERKZEUGE,
  hilfeFolge,
  hilfeProblem,
  hilfeSeite,
  hilfeVariante,
  istErledigt,
  zaehleWoerter,
  type HilfeStand,
} from '@/lib/werkzeugkiste-hilfe'
import { HILFE_PROBLEME, HILFE_SEITEN, HILFE_VERBOTEN, type HilfeProblemId } from '@/lib/werkzeugkiste-hilfe-texte'

/**
 * PROJ-87: Textregeln für den Assistenten „Schritt für Schritt“. Der Test
 * erzwingt Länge, Wortwahl und Vollständigkeit — wer einen Text ändert, merkt
 * es sofort.
 */

/** Anführungszeichen („…“) nennen Knöpfe der Oberfläche und zählen nicht als Fachwort */
function ohneKnopfnamen(text: string) {
  return text.replace(/„[^“]*“/g, '').replace(/\(Prompt\)/g, '')
}

const alleTexte = (werkzeug: string) =>
  HILFE_VARIANTEN.flatMap((v) => {
    const s = hilfeSeite(werkzeug, v)
    return [s.ueberschrift, s.anweisung, s.beispiel, s.fertigWenn, s.mehrDazu ?? ''].map((t) => ({ v, t }))
  })

describe('Hilfetexte: Länge und Aufbau', () => {
  for (const werkzeug of HILFE_WERKZEUGE) {
    for (const variante of HILFE_VARIANTEN) {
      it(`${werkzeug} / ${variante}: Anweisung ≤ 20 Wörter, Seite ≤ 40 Wörter, Erkennungszeichen vorhanden`, () => {
        const s = hilfeSeite(werkzeug, variante)
        expect(zaehleWoerter(s.anweisung)).toBeLessThanOrEqual(20)
        const gesamt = [s.ueberschrift, s.anweisung, s.beispiel, s.fertigWenn].map(zaehleWoerter).reduce((a, b) => a + b, 0)
        expect(gesamt).toBeLessThanOrEqual(40)
        expect(s.ueberschrift.trim()).not.toBe('')
        expect(s.beispiel.trim()).not.toBe('')
        expect(s.fertigWenn).toMatch(/^Fertig, wenn /)
      })
    }
  }

  it('jedes Werkzeug mit Assistent hat für alle sieben Varianten eine Seite', () => {
    for (const werkzeug of HILFE_WERKZEUGE) {
      for (const v of HILFE_VARIANTEN) expect(hilfeSeite(werkzeug, v).anweisung.length, `${werkzeug}/${v}`).toBeGreaterThan(0)
    }
    expect(Object.keys(HILFE_SEITEN).sort()).toEqual([...HILFE_VARIANTEN].sort())
  })

  it('der Assistent gibt es nur für echte Werkzeuge', () => {
    for (const id of HILFE_WERKZEUGE) expect(WERKZEUGE.some((w) => w.id === id)).toBe(true)
    expect(hatHilfe('skript')).toBe(true)
    expect(hatHilfe('podcast')).toBe(false)
    expect(hatHilfe('')).toBe(false)
    expect(hatHilfe(null)).toBe(false)
  })
})

describe('Hilfetexte: Wortwahl', () => {
  for (const werkzeug of HILFE_WERKZEUGE) {
    it(`${werkzeug}: keine Fachwörter aus der Verbotsliste`, () => {
      for (const { v, t } of alleTexte(werkzeug)) {
        for (const wort of HILFE_VERBOTEN) expect(t.toLowerCase(), `${v}: „${wort}“ in „${t}“`).not.toMatch(new RegExp(`\\b${wort}`))
      }
    })

    it(`${werkzeug}: „Prompt“ steht nur einmal in Klammern oder als Knopfname in Anführungszeichen`, () => {
      for (const { v, t } of alleTexte(werkzeug)) expect(ohneKnopfnamen(t), `${v}: „${t}“`).not.toMatch(/prompt/i)
      const klammern = alleTexte(werkzeug).filter(({ t }) => t.includes('(Prompt)'))
      expect(klammern).toHaveLength(1)
    })

    it(`${werkzeug}: duzt die Lehrkraft, nie „Sie“`, () => {
      for (const { v, t } of alleTexte(werkzeug)) expect(t, `${v}: „${t}“`).not.toMatch(/\bSie\b|\bIhr(e|en|er)?\b/)
    })
  }

  it('die Problemhilfen nutzen dieselben Regeln', () => {
    for (const [id, p] of Object.entries(HILFE_PROBLEME)) {
      const text = `${p.was} ${p.tun}`
      expect(zaehleWoerter(text), id).toBeLessThanOrEqual(40)
      expect(ohneKnopfnamen(text), id).not.toMatch(/prompt/i)
      for (const wort of HILFE_VERBOTEN) expect(text.toLowerCase(), `${id}: ${wort}`).not.toMatch(new RegExp(`\\b${wort}`))
    }
  })
})

describe('Problemhilfen: Zuordnung', () => {
  const pruefung = (p: Partial<NonNullable<Parameters<typeof erkenneProblem>[0]['pruefung']>>) => ({
    lesbar: true,
    fehler: null,
    befunde: [],
    korrekturen: 0,
    nachbesserungsPrompt: null,
    ...p,
  })

  it('alle sieben Pflichtfälle plus die allgemeine Hilfe haben einen Text', () => {
    const ids: HilfeProblemId[] = ['lesen', 'gross', 'zu_lang', 'unvollstaendig', 'passt_nicht', 'kontrolle_fehler', 'hinweise', 'bilder_fehlen', 'allgemein']
    for (const id of ids) {
      expect(HILFE_PROBLEME[id].was.length).toBeGreaterThan(0)
      expect(HILFE_PROBLEME[id].tun.length).toBeGreaterThan(0)
    }
  })

  it('ohne Meldung gibt es kein Problem', () => {
    expect(erkenneProblem({})).toBeNull()
    expect(erkenneProblem({ pruefung: pruefung({}) })).toBeNull()
    expect(erkenneProblem({ pruefung: null, aktionsFehler: null })).toBeNull()
  })

  it('ordnet Datei-, Lese- und Kontrollmeldungen zu', () => {
    expect(erkenneProblem({ dateiFehler: 'Die Datei ist größer als 50 MB. Bitte Bilder komprimieren.' })).toBe('gross')
    expect(erkenneProblem({ dateiFehler: 'Dieses Format geht nicht.' })).toBe('lesen')
    expect(erkenneProblem({ lesefehler: true })).toBe('lesen')
    expect(erkenneProblem({ pruefung: pruefung({ abgeschnitten: { kapitel: ['A'], rettbar: true, runde: 0 } }) })).toBe('unvollstaendig')
    expect(erkenneProblem({ pruefung: pruefung({ lesbar: false, fehler: 'Das ist die Antwort für ein anderes Werkzeug.' }) })).toBe('passt_nicht')
    expect(erkenneProblem({ pruefung: pruefung({ lesbar: false, fehler: 'Die Antwort ist kein lesbarer Text.' }) })).toBe('kontrolle_fehler')
    expect(
      erkenneProblem({ pruefung: pruefung({ befunde: [{ text: 'Bei Aufgabe 3 fehlt das Bild.' }], nachbesserungsPrompt: 'Bitte ergänze …' }) }),
    ).toBe('bilder_fehlen')
    expect(
      erkenneProblem({ pruefung: pruefung({ befunde: [{ text: 'In Kapitel 2 fehlt die Tabelle.' }], nachbesserungsPrompt: 'Bitte ergänze …' }) }),
    ).toBe('bilder_fehlen')
    expect(
      erkenneProblem({ pruefung: pruefung({ befunde: [{ text: 'Zwei Antworten sind gleich.' }], nachbesserungsPrompt: 'Bitte ändere …' }) }),
    ).toBe('hinweise')
    expect(erkenneProblem({ aktionsFehler: 'Die Antwort ist zu lang.' })).toBe('zu_lang')
  })

  it('eine unbekannte Meldung führt zur allgemeinen Hilfe, nie zu einer leeren Karte', () => {
    expect(erkenneProblem({ aktionsFehler: 'Irgendetwas Seltsames' })).toBe('allgemein')
    expect(hilfeProblem('allgemein').tun).toMatch(/noch einmal/)
    expect(hilfeProblem('gibt-es-nicht' as HilfeProblemId).was).toBe(HILFE_PROBLEME.allgemein.was)
  })
})

describe('Hilfeseite zum Schritt', () => {
  it('ordnet Schritt und Variante zu, auch bei Video, Teilen und Kopie', () => {
    expect(hilfeVariante(1, {})).toBe('skript')
    expect(hilfeVariante(1, { video: true })).toBe('video')
    expect(hilfeVariante(2, {})).toBe('einstellungen')
    expect(hilfeVariante(3, {})).toBe('auftrag')
    expect(hilfeVariante(3, { teile: true })).toBe('teile')
    expect(hilfeVariante(4, {})).toBe('antwort')
    expect(hilfeVariante(5, {})).toBe('fertig')
    expect(HILFE_SCHRITT_NR.teile).toBe(3)
    expect(hilfeFolge({})).toEqual(['skript', 'einstellungen', 'auftrag', 'antwort', 'fertig'])
    expect(hilfeFolge({ teile: true, video: true })).toEqual(['video', 'einstellungen', 'teile', 'antwort', 'fertig'])
    expect(hilfeFolge({ kopie: true })).toEqual(['antwort', 'fertig'])
  })

  const leer: HilfeStand = {
    eingelesen: false,
    einstellungenGespeichert: false,
    auftragKopiert: false,
    teileFertig: false,
    antwortGeprueft: false,
    heruntergeladen: false,
  }

  it('erkennt „erledigt“ aus dem Stand des Ablaufs', () => {
    for (const v of HILFE_VARIANTEN) expect(istErledigt(v, leer), v).toBe(false)
    expect(istErledigt('skript', { ...leer, eingelesen: true })).toBe(true)
    expect(istErledigt('video', { ...leer, eingelesen: true })).toBe(true)
    expect(istErledigt('einstellungen', { ...leer, einstellungenGespeichert: true })).toBe(true)
    expect(istErledigt('auftrag', { ...leer, auftragKopiert: true })).toBe(true)
    expect(istErledigt('teile', { ...leer, teileFertig: true })).toBe(true)
    expect(istErledigt('antwort', { ...leer, antwortGeprueft: true })).toBe(true)
    expect(istErledigt('fertig', { ...leer, heruntergeladen: true })).toBe(true)
    // Ein Signal für Schritt 3 macht Schritt 4 nicht fertig
    expect(istErledigt('antwort', { ...leer, auftragKopiert: true })).toBe(false)
  })
})
