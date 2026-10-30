import { describe, expect, it } from 'vitest'
import {
  anderesWerkzeugErlaubt,
  entwurfStand,
  formatName,
  formatiereSpeicher,
  HINWEIS_SKRIPT_ENTFERNT,
  HINWEIS_VIDEO_WERKZEUG,
  loeschHinweis,
  relativesDatum,
  speicherStand,
  ueberarbeitenErlaubt,
  untertitel,
} from './werkzeugkiste-materialien'

// Mittwoch, 28.10.2026, 12:00 Ortszeit
const JETZT = new Date(2026, 9, 28, 12, 0, 0)
const vor = (tage: number, stunde = 9) => new Date(2026, 9, 28 - tage, stunde, 0, 0).toISOString()

describe('relativesDatum (PROJ-52)', () => {
  it('sagt heute, gestern und vor N Tagen', () => {
    expect(relativesDatum(vor(0), JETZT)).toBe('heute')
    expect(relativesDatum(vor(1, 23), JETZT)).toBe('gestern')
    expect(relativesDatum(vor(3), JETZT)).toBe('vor 3 Tagen')
    expect(relativesDatum(vor(6), JETZT)).toBe('vor 6 Tagen')
  })

  it('zählt Kalendertage, nicht 24-Stunden-Blöcke', () => {
    // gestern 23:30 ist erst 12,5 Stunden her, aber „gestern“
    expect(relativesDatum(new Date(2026, 9, 27, 23, 30).toISOString(), JETZT)).toBe('gestern')
  })

  it('zeigt ab einer Woche das Datum', () => {
    expect(relativesDatum(vor(7), JETZT)).toBe('21.10.2026')
  })

  it('behandelt Zukunft und kaputte Werte ruhig', () => {
    expect(relativesDatum(new Date(2026, 9, 29).toISOString(), JETZT)).toBe('heute')
    expect(relativesDatum('kein Datum', JETZT)).toBe('')
  })
})

describe('Entwürfe (PROJ-52)', () => {
  it('nennt den zuletzt erreichten Schritt', () => {
    expect(entwurfStand(3)).toBe('bei Schritt 3 · Prompt')
    expect(entwurfStand(2)).toBe('bei Schritt 2 · Einstellungen')
  })

  it('warnt erst ab dem vorletzten Tag vor der Löschung', () => {
    const inTagen = (n: number) => new Date(2026, 9, 28 + n, 3, 30).toISOString()
    expect(loeschHinweis(inTagen(5), JETZT)).toBeNull()
    expect(loeschHinweis(inTagen(2), JETZT)).toBeNull()
    expect(loeschHinweis(inTagen(1), JETZT)).toBe('wird morgen gelöscht')
    expect(loeschHinweis(inTagen(0), JETZT)).toBe('wird heute gelöscht')
    expect(loeschHinweis(null, JETZT)).toBeNull()
  })
})

describe('Zeile unter dem Titel (PROJ-52)', () => {
  it('kennt die Formate der Werkzeuge', () => {
    expect(formatName('h5p')).toBe('H5P für Moodle')
    expect(formatName('seite')).toBe('Interaktive Seite')
    expect(formatName('xyz')).toBe('XYZ')
    expect(formatName(null)).toBeNull()
  })

  it('setzt Format und Skriptname zusammen, bei Entwürfen bleibt sie leer', () => {
    expect(untertitel({ art: 'material', format: 'h5p', skriptName: 'Haftung.pdf' })).toBe('H5P für Moodle · aus Haftung.pdf')
    expect(untertitel({ art: 'material', format: 'h5p', skriptName: null })).toBe('H5P für Moodle')
    expect(untertitel({ art: 'entwurf', format: null, skriptName: 'Haftung.pdf' })).toBe('')
  })
})

describe('Aktionen nach 12 Monaten (PROJ-52, Entscheidung 2026-10-30)', () => {
  it('sperrt Überarbeiten und anderes Werkzeug, wenn das Skript entfernt wurde', () => {
    expect(ueberarbeitenErlaubt({ skriptEntfernt: true })).toEqual({ erlaubt: false, grund: HINWEIS_SKRIPT_ENTFERNT })
    expect(anderesWerkzeugErlaubt({ skriptEntfernt: true, werkzeug: 'skript' })).toEqual({ erlaubt: false, grund: HINWEIS_SKRIPT_ENTFERNT })
    expect(ueberarbeitenErlaubt({ skriptEntfernt: false })).toEqual({ erlaubt: true })
    expect(anderesWerkzeugErlaubt({ skriptEntfernt: false, werkzeug: 'skript' })).toEqual({ erlaubt: true })
  })

  it('lässt Video-Fragen nicht auf ein anderes Werkzeug wechseln (Transkript statt Skript)', () => {
    expect(anderesWerkzeugErlaubt({ skriptEntfernt: false, werkzeug: 'youtube' })).toEqual({ erlaubt: false, grund: HINWEIS_VIDEO_WERKZEUG })
  })
})

describe('Speicher (PROJ-52)', () => {
  const GB = 1024 * 1024 * 1024
  it('meldet erst ab 90 % und voll ab 100 %', () => {
    expect(speicherStand({ genutztBytes: 1.7 * GB, grenzeBytes: 2 * GB }).hinweis).toBe(false)
    const fast = speicherStand({ genutztBytes: 1.9 * GB, grenzeBytes: 2 * GB })
    expect(fast).toMatchObject({ prozent: 95, hinweis: true, voll: false })
    expect(speicherStand({ genutztBytes: 2.2 * GB, grenzeBytes: 2 * GB })).toMatchObject({ prozent: 100, voll: true })
  })

  it('rechnet nicht durch null', () => {
    expect(speicherStand({ genutztBytes: 5, grenzeBytes: 0 })).toMatchObject({ anteil: 0, hinweis: false })
  })

  it('schreibt Größen lesbar', () => {
    expect(formatiereSpeicher(1.5 * GB)).toBe('1,5 GB')
    expect(formatiereSpeicher(300 * 1024 * 1024)).toBe('300 MB')
  })
})
