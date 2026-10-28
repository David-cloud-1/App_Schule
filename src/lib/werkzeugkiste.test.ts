import { describe, expect, it } from 'vitest'
import {
  ablaufHref,
  ablaufKurzinfo,
  auswahlArt,
  einstellungenFuerWerkzeug,
  formatiereGroesse,
  istAblaufPfad,
  istAltesFormat,
  neuerAblaufHref,
  pruefeSkriptDatei,
  reiterAusParam,
  schrittAusParam,
  schrittErlaubt,
  WERKZEUG_GRUPPEN,
  WERKZEUGE,
  werkzeugeDerGruppe,
  type AblaufEinstellungen,
} from './werkzeugkiste'

const EINST: AblaufEinstellungen = { format: 'h5p', niveau: 'mittel', bildungsgang: 'auto', lernfeld: '', umfang: '' }

describe('Werkzeugliste', () => {
  it('hat zwölf Werkzeuge in vier Gruppen mit eindeutigen IDs', () => {
    expect(WERKZEUGE).toHaveLength(12)
    expect(new Set(WERKZEUGE.map((w) => w.id)).size).toBe(12)
    expect(WERKZEUG_GRUPPEN.map((g) => werkzeugeDerGruppe(g.id).length)).toEqual([3, 4, 3, 2])
  })

  it('schaltet in PROJ-51 nur „Ganzes Skript“ frei, mit H5P vor der Seite', () => {
    expect(WERKZEUGE.filter((w) => w.aktiv).map((w) => w.id)).toEqual(['skript'])
    expect(WERKZEUGE.find((w) => w.id === 'skript')?.formate.map((f) => f.id)).toEqual(['h5p', 'seite'])
  })
})

describe('Adressen', () => {
  it('liest den Reiter und fällt sonst auf „Werkzeuge“ zurück', () => {
    expect(reiterAusParam('regal')).toBe('regal')
    expect(reiterAusParam('materialien')).toBe('materialien')
    expect(reiterAusParam('quatsch')).toBe('werkzeuge')
    expect(reiterAusParam(null)).toBe('werkzeuge')
  })

  it('baut die Adressen für neuen und laufenden Ablauf', () => {
    expect(neuerAblaufHref()).toBe('/admin/werkzeugkiste/neu')
    expect(neuerAblaufHref('skript')).toBe('/admin/werkzeugkiste/neu?werkzeug=skript')
    expect(ablaufHref('abc', 3)).toBe('/admin/werkzeugkiste/ablauf/abc?schritt=3')
  })

  it('erkennt die Ablauf-Seiten ohne Seitenleiste, nicht aber die Startseite', () => {
    expect(istAblaufPfad('/admin/werkzeugkiste/neu')).toBe(true)
    expect(istAblaufPfad('/admin/werkzeugkiste/ablauf/abc')).toBe(true)
    expect(istAblaufPfad('/admin/werkzeugkiste')).toBe(false)
    expect(istAblaufPfad('/admin/werkzeugkiste/neues-ding')).toBe(false)
    expect(istAblaufPfad(null)).toBe(false)
  })
})

describe('Datei-Prüfung', () => {
  it('nimmt die erlaubten Formate bis 50 MB an', () => {
    for (const name of ['a.docx', 'b.PDF', 'c.pptx', 'd.doc', 'e.ppt', 'f.txt']) {
      expect(pruefeSkriptDatei({ name, size: 1000 })).toBeNull()
    }
    expect(pruefeSkriptDatei({ name: 'gross.pdf', size: 50 * 1024 * 1024 })).toBeNull()
  })

  it('lehnt falsche Formate, zu große und leere Dateien verständlich ab', () => {
    expect(pruefeSkriptDatei({ name: 'bild.jpg', size: 10 })).toMatch(/Format geht nicht/)
    expect(pruefeSkriptDatei({ name: 'ohne-endung', size: 10 })).toMatch(/Format geht nicht/)
    expect(pruefeSkriptDatei({ name: 'riesig.pdf', size: 50 * 1024 * 1024 + 1 })).toMatch(/größer als 50 MB/)
    expect(pruefeSkriptDatei({ name: 'leer.docx', size: 0 })).toMatch(/leer/)
  })

  it('kennt alte Formate und die passende Auswahl-Art', () => {
    expect(istAltesFormat('alt.doc')).toBe(true)
    expect(istAltesFormat('neu.docx')).toBe(false)
    expect(auswahlArt('a.docx')).toBe('abschnitte')
    expect(auswahlArt('a.pdf')).toBe('seiten')
    expect(auswahlArt('a.pptx')).toBe('seiten')
    expect(auswahlArt('a.txt')).toBeNull()
  })

  it('formatiert Größen deutsch', () => {
    expect(formatiereGroesse(500)).toBe('1 KB')
    expect(formatiereGroesse(13_378_001)).toBe('12,8 MB')
  })
})

describe('Schritte', () => {
  const leer = { schritt: 1 as const, kennzahlen: null, prompt: null, ergebnis: null }
  const kennzahlen = { seiten: 4, loesungen: 3, bilder: 1, tabellen: 0 }
  const mitPrompt = { ...leer, schritt: 3 as const, kennzahlen, prompt: 'p' }
  const fertig = {
    ...mitPrompt,
    schritt: 5 as const,
    ergebnis: { titel: 't', dateiname: 't.h5p', format: 'h5p', kapitel: 1, aufgaben: 2 },
  }

  it('öffnet vorwärts nur vorbereitete Schritte', () => {
    expect(schrittErlaubt(leer, 1)).toBe(true)
    expect(schrittErlaubt(leer, 2)).toBe(false)
    expect(schrittErlaubt({ ...leer, kennzahlen }, 2)).toBe(true)
    expect(schrittErlaubt({ ...leer, kennzahlen }, 3)).toBe(false)
    expect(schrittErlaubt(mitPrompt, 4)).toBe(true)
    expect(schrittErlaubt(mitPrompt, 5)).toBe(false)
    expect(schrittErlaubt(fertig, 5)).toBe(true)
  })

  it('nimmt den Schritt aus der Adresse, sonst den erreichten, und begrenzt nach unten', () => {
    expect(schrittAusParam(null, mitPrompt)).toBe(3)
    expect(schrittAusParam('2', mitPrompt)).toBe(2)
    expect(schrittAusParam('5', mitPrompt)).toBe(4)
    expect(schrittAusParam('9', mitPrompt)).toBe(3)
    expect(schrittAusParam('abc', leer)).toBe(1)
    expect(schrittAusParam('4', { ...leer, kennzahlen })).toBe(2)
  })
})

describe('Einstellungen & Kurzinfo', () => {
  it('setzt beim Werkzeugwechsel nur das Format zurück', () => {
    expect(einstellungenFuerWerkzeug('kahoot', { ...EINST, format: 'seite', niveau: 'schwer' })).toEqual({
      ...EINST,
      format: '',
      niveau: 'schwer',
    })
    expect(einstellungenFuerWerkzeug('skript', { ...EINST, format: '' }).format).toBe('h5p')
  })

  it('fasst den laufenden Ablauf in einer Zeile zusammen', () => {
    expect(
      ablaufKurzinfo({ werkzeug: 'skript', einstellungen: EINST, datei: { name: 'heft.docx', groesse: 1 } }, 'mittel'),
    ).toBe('heft.docx · Ganzes Skript · H5P für Moodle · mittel')
    expect(ablaufKurzinfo({ werkzeug: 'skript', einstellungen: EINST, datei: null })).toBe('Ganzes Skript · H5P für Moodle')
  })
})
