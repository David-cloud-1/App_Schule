import { describe, expect, it } from 'vitest'
import {
  einstellungenFuerWerkzeug,
  feldOptionen,
  feldSetzen,
  feldSichtbar,
  feldStandards,
  findeWerkzeug,
  type AblaufEinstellungen,
} from './werkzeugkiste'
import { einstellungenFuerWechsel, standardEinstellungen } from './werkzeugkiste-server'

const EINST: AblaufEinstellungen = { format: '', niveau: 'mittel', bildungsgang: 'auto', lernfeld: '', umfang: '' }

const feld = (w: string, id: string) => findeWerkzeug(w)!.felder.find((f) => f.id === id)!
const ort = (w: string) => {
  const f = findeWerkzeug(w)!.felder
  return { direkt: f.filter((x) => x.ort === 'direkt').map((x) => x.id), mehr: f.filter((x) => x.ort === 'mehr').map((x) => x.id) }
}

describe('Paket C: Klassenarbeit und Lernlied (PROJ-54)', () => {
  it('schaltet beide Werkzeuge frei', () => {
    for (const id of ['pruefung', 'lied']) expect(findeWerkzeug(id)?.aktiv, id).toBe(true)
  })

  it('Klassenarbeit: ZIP vor H5P, Standardwerte der alten Oberfläche', () => {
    expect(findeWerkzeug('pruefung')!.formate.map((f) => f.id)).toEqual(['word', 'h5p'])
    expect(feldStandards('pruefung')).toMatchObject({
      dauer: '60', types: 'offen,mc,rechnen', mcprozent: '30', noten: 'ihk', notengrenzen: '', hilfsmittel: '',
    })
    expect(standardEinstellungen('pruefung').format).toBe('word')
  })

  it('Klassenarbeit: Dauer und Niveau direkt, der Rest unter „Mehr Optionen“ (höchstens drei direkt)', () => {
    expect(ort('pruefung')).toEqual({
      direkt: ['dauer', 'niveau'],
      mehr: ['types', 'mcprozent', 'noten', 'notengrenzen', 'hilfsmittel', 'bildungsgang', 'lernfeld'],
    })
  })

  it('Klassenarbeit: dieselben Aufgabentypen und Notenschlüssel wie früher', () => {
    const e = standardEinstellungen('pruefung')
    const liste = (id: string) => feldOptionen(feld('pruefung', id), e, null).map((o) => o.key)
    expect(liste('types')).toEqual(['offen', 'mc', 'rechnen', 'fall'])
    expect(liste('noten')).toEqual(['ihk', 'frei'])
    // Der Prompt begrenzt die Dauer auf 15–180 Minuten; das Feld verspricht nicht mehr
    expect([feld('pruefung', 'dauer').min, feld('pruefung', 'dauer').max]).toEqual([15, 180])
    expect([feld('pruefung', 'mcprozent').min, feld('pruefung', 'mcprozent').max]).toEqual([0, 100])
  })

  it('Klassenarbeit: Notengrenzen erscheinen nur beim freien Notenschlüssel', () => {
    const grenzen = feld('pruefung', 'notengrenzen')
    expect(feldSichtbar(grenzen, { noten: 'ihk' })).toBe(false)
    expect(feldSichtbar(grenzen, { noten: 'frei' })).toBe(true)
    expect(feldSichtbar(feld('pruefung', 'hilfsmittel'), { noten: 'ihk' })).toBe(true)
    expect(feldSetzen('pruefung', EINST, 'noten', 'frei').noten).toBe('frei')
  })

  it('Lernlied: Musikrichtung und Umfang direkt, Niveau und Bildungsgang dahinter, kein Format', () => {
    expect(findeWerkzeug('lied')!.formate).toEqual([])
    expect(ort('lied')).toEqual({ direkt: ['genre', 'lied_umfang'], mehr: ['niveau', 'bildungsgang'] })
    expect(feldStandards('lied')).toMatchObject({ genre: 'electro', lied_umfang: 'kapitel' })
    const e = standardEinstellungen('lied')
    expect(feldOptionen(feld('lied', 'genre'), e, null).map((o) => o.key)).toEqual([
      'electro', 'rock', 'schlager', 'rap', 'pop', 'metal', 'reggae', 'volksmusik',
    ])
    expect(feldOptionen(feld('lied', 'lied_umfang'), e, null).map((o) => o.key)).toEqual(['kapitel', 'ganz', 'merk'])
  })

  it('beide haben Tipps', () => {
    for (const id of ['pruefung', 'lied']) {
      const t = findeWerkzeug(id)!.tipps ?? []
      expect(t.length, id).toBeGreaterThanOrEqual(3)
      for (const satz of t) expect(satz.length, satz).toBeLessThan(260)
    }
  })

  it('Werkzeugwechsel: Dauer wird in den Bereich geholt, Musikrichtung fällt weg', () => {
    // 300 Minuten aus der Lernsituation passen nicht zur Klassenarbeit (höchstens 180)
    expect(einstellungenFuerWerkzeug('pruefung', { ...EINST, dauer: '300' }).dauer).toBe('180')
    expect(einstellungenFuerWerkzeug('pruefung', { ...EINST, dauer: '5' }).dauer).toBe('15')
    expect(einstellungenFuerWerkzeug('pruefung', { ...EINST, genre: 'rock' })).not.toHaveProperty('genre')
    expect(einstellungenFuerWerkzeug('lied', { ...EINST, genre: 'quatsch' }).genre).toBe('electro')
    expect(einstellungenFuerWerkzeug('lied', { ...EINST, genre: 'rap' }).genre).toBe('rap')
  })

  it('der Server behält die eigenen Felder und verwirft fremde', () => {
    const e = einstellungenFuerWechsel('pruefung', {
      ...EINST, format: 'seite', noten: 'frei', notengrenzen: '85,70,55,40,20', hilfsmittel: 'Taschenrechner', genre: 'rock',
    })
    expect(e).toMatchObject({ format: 'word', noten: 'frei', notengrenzen: '85,70,55,40,20', hilfsmittel: 'Taschenrechner' })
    expect(e).not.toHaveProperty('genre')
    expect(einstellungenFuerWechsel('pruefung', { ...EINST, format: 'h5p' }).format).toBe('h5p')
    expect(einstellungenFuerWechsel('lied', { ...EINST, format: 'h5p', genre: 'rock' })).toMatchObject({ format: '', genre: 'rock' })
  })
})
