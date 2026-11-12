import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { TYP_NAMEN, type Struktur } from './werkzeugkiste-editor'
import {
  GRUPPEN,
  KAPITELTEST_KATALOG,
  KATALOG,
  anzahlBeispiele,
  beispielBefunde,
  beispielBlock,
  fuegeBlockEin,
  istBeispiel,
  leseZuletzt,
  merkeZuletzt,
  nachGruppen,
  normalisiere,
  sucheKatalog,
} from './werkzeugkiste-katalog'

describe('Katalog (PROJ-90)', () => {
  it('zeigt 31 Einträge: alle Typen außer single_choice (E8), jeder genau einmal', () => {
    expect(KATALOG).toHaveLength(31)
    const typen = KATALOG.map((e) => e.typ)
    expect(new Set(typen).size).toBe(31)
    expect(typen.sort()).toEqual(Object.keys(TYP_NAMEN).filter((t) => t !== 'single_choice').sort())
  })

  it('hat sieben Gruppen in fester Reihenfolge, jede mit Einträgen', () => {
    expect(GRUPPEN.map((g) => g.titel)).toEqual([
      'Lesen & Nachschlagen',
      'Abfragen',
      'Lücken & Wörter',
      'Zuordnen & Ordnen',
      'Rechnen',
      'Spiele & Rätsel',
      'Selbstcheck & Wiederholen',
    ])
    expect(nachGruppen(KATALOG)).toHaveLength(7)
  })

  it('jeder Eintrag hat Name, Beschreibung, „Gut für“ und Suchbegriffe, kein technischer Name sichtbar', () => {
    for (const e of KATALOG) {
      expect(e.name).toBe(TYP_NAMEN[e.typ])
      expect(e.beschreibung.length).toBeGreaterThan(20)
      expect(e.gutFuer.length).toBeGreaterThan(10)
      expect(e.suchbegriffe.length).toBeGreaterThan(2)
      expect(e.name).not.toMatch(/_/)
    }
  })

  it('markiert nur Lehrtext, Bild, Aufklappen, Rechenbeispiel und Umdreh-Karten als nicht ausgewertet', () => {
    expect(KATALOG.filter((e) => !e.wirdAusgewertet).map((e) => e.typ).sort()).toEqual(
      ['accordion', 'calculation_example', 'dialog_cards', 'image', 'text'].sort(),
    )
  })

  it('Bild und Bildzuordnung brauchen ein Bild, sonst keiner', () => {
    expect(KATALOG.filter((e) => e.brauchtBild).map((e) => e.typ).sort()).toEqual(['bildzuordnung', 'image'])
  })

  it('stimmt mit den Bausteinen des Kerns überein (wenn der Kern-Ordner daneben liegt)', () => {
    const pfad = resolve(__dirname, '../../../Werkzeugkiste/seite.py')
    if (!existsSync(pfad)) return
    const quelle = readFileSync(pfad, 'utf8')
    const block = /BAUSTEINE = \{([\s\S]*?)\n\}/.exec(quelle)?.[1] ?? ''
    const typen = [...block.matchAll(/"([a-z_]+)":/g)].map((m) => m[1]).sort()
    expect(typen.length).toBeGreaterThan(30)
    expect(typen).toEqual(Object.keys(TYP_NAMEN).sort())
  })
})

describe('Suche', () => {
  it('ignoriert Groß-/Kleinschreibung und Umlaute', () => {
    expect(normalisiere('Schätzrunde')).toBe(normalisiere('SCHAETZRUNDE'))
    expect(sucheKatalog('schatz').map((e) => e.typ)).toContain('schaetzrunde')
    expect(sucheKatalog('schaetz').map((e) => e.typ)).toContain('schaetzrunde')
  })

  it('findet über Suchbegriffe und englische H5P-Namen', () => {
    expect(sucheKatalog('Multiple Choice').map((e) => e.typ)).toContain('multiple_choice')
    expect(sucheKatalog('quiz').map((e) => e.typ)).toContain('multiple_choice')
    expect(sucheKatalog('crossword').map((e) => e.typ)).toEqual(['crossword'])
    expect(sucheKatalog('merke').map((e) => e.typ)).toContain('text')
  })

  it('liefert ohne Treffer eine leere Liste und mit leerer Suche alles', () => {
    expect(sucheKatalog('xyzabc')).toEqual([])
    expect(sucheKatalog('  ')).toHaveLength(31)
  })

  it('filtert im Kapiteltest auf die drei erlaubten Typen', () => {
    expect(sucheKatalog('', KAPITELTEST_KATALOG).map((e) => e.typ).sort()).toEqual(['fill_blanks', 'multiple_choice', 'true_false'])
    expect(sucheKatalog('kreuzwort', KAPITELTEST_KATALOG)).toEqual([])
  })
})

describe('Beispielinhalt (E2)', () => {
  it('jeder Katalog-Typ hat ein Beispiel mit passendem type', () => {
    for (const e of KATALOG) {
      const b = beispielBlock(e.typ)
      expect(b.type).toBe(e.typ)
      expect(Object.keys(b).length).toBeGreaterThan(1)
    }
  })

  it('liefert immer eine frische Kopie', () => {
    const a = beispielBlock('multiple_choice')
    ;(a.answers as { text: string }[])[0].text = 'geändert'
    expect((beispielBlock('multiple_choice').answers as { text: string }[])[0].text).toBe('Grün')
  })

  it('setzt das gewählte Bild ein und zählt es trotzdem als Beispiel', () => {
    const b = beispielBlock('image', 'images/seite1.png')
    expect(b.path).toBe('images/seite1.png')
    expect(istBeispiel(b)).toBe(true)
  })

  it('erkennt einen veränderten Block nicht mehr als Beispiel', () => {
    const b = beispielBlock('true_false')
    expect(istBeispiel(b)).toBe(true)
    expect(istBeispiel({ ...b, question: 'Eigene Aussage' })).toBe(false)
    expect(istBeispiel({ ...b, extra: 'neu' })).toBe(false)
    expect(istBeispiel(null)).toBe(false)
  })

  it('meldet Beispiel-Blöcke als Hinweis an der genauen Stelle', () => {
    const s: Struktur = {
      cover: {},
      chapters: [{ title: 'A', elements: [{ type: 'text', content: 'eigen' }, beispielBlock('crossword')] }],
      final_chapter: { question_set: { pass_percentage: 70, questions: [beispielBlock('true_false')] } },
    }
    const befunde = beispielBefunde(s)
    expect(befunde).toHaveLength(2)
    expect(befunde[0].stellen).toEqual([{ kapitel: 0, element: 1 }])
    expect(befunde[0].text).toContain('Beispielinhalt noch nicht ersetzt')
    expect(befunde[1].stellen).toEqual([{ abschluss: true }])
    expect(anzahlBeispiele(s)).toBe(2)
  })

  it('zählt einen Kapiteltest mit einer Beispielfrage', () => {
    const qs = { type: 'question_set', pass_percentage: 70, questions: [{ type: 'fill_blanks', text: 'eigen *x*' }, beispielBlock('multiple_choice')] }
    expect(beispielBefunde({ cover: {}, chapters: [{ elements: [qs] }] })).toHaveLength(1)
  })
})

describe('Einfügen', () => {
  const S: Struktur = { cover: {}, chapters: [{ title: 'A', elements: [{ type: 'text', content: '0' }, { type: 'text', content: '1' }], x: 1 }, { title: 'B', elements: [] }] }
  const neu = { type: 'true_false', question: 'n' }

  it('fügt genau an der Stelle ein und lässt das Original unverändert', () => {
    const r = fuegeBlockEin(S, 0, 1, neu)
    expect(r.chapters[0].elements.map((b) => b.content ?? b.question)).toEqual(['0', 'n', '1'])
    expect(r.chapters[0].x).toBe(1)
    expect(S.chapters[0].elements).toHaveLength(2)
  })

  it('fügt in ein leeres Thema und am Ende ein', () => {
    expect(fuegeBlockEin(S, 1, 0, neu).chapters[1].elements).toEqual([neu])
    expect(fuegeBlockEin(S, 0, 99, neu).chapters[0].elements[2]).toEqual(neu)
  })

  it('ignoriert ein unbekanntes Thema', () => {
    expect(fuegeBlockEin(S, 5, 0, neu)).toBe(S)
  })
})

describe('Zuletzt verwendet (E7)', () => {
  afterEach(() => window.localStorage.clear())

  it('merkt höchstens vier, neueste zuerst, ohne Doppelte', () => {
    for (const t of ['crossword', 'memory_game', 'trainer', 'fallakte', 'crossword', 'text']) merkeZuletzt(t)
    expect(leseZuletzt()).toEqual(['text', 'crossword', 'fallakte', 'trainer'])
  })

  it('übersteht kaputten oder fehlenden Speicher', () => {
    window.localStorage.setItem('wk-katalog-zuletzt', '{kaputt')
    expect(leseZuletzt()).toEqual([])
    window.localStorage.setItem('wk-katalog-zuletzt', JSON.stringify(['gibtsnicht', 'text']))
    expect(leseZuletzt()).toEqual(['text'])
  })
})
