import { describe, expect, it } from 'vitest'
import {
  eingabeArt,
  einstellungenFuerWerkzeug,
  feldStandards,
  findeWerkzeug,
  pruefeTranskript,
  pruefeVideoLink,
  werkzeugWechselErlaubt,
  type AblaufEinstellungen,
} from './werkzeugkiste'
import { einstellungenFuerWechsel, standardEinstellungen } from './werkzeugkiste-server'

const EINST: AblaufEinstellungen = { format: '', niveau: 'mittel', bildungsgang: 'auto', lernfeld: '', umfang: '' }

describe('Paket D: Video-Fragen (PROJ-54)', () => {
  const w = findeWerkzeug('youtube')!

  it('ist freigeschaltet und braucht ein Video statt eines Skripts', () => {
    expect(w.aktiv).toBe(true)
    expect(eingabeArt('youtube')).toBe('video')
    expect(eingabeArt('skript')).toBe('skript')
    expect(eingabeArt('unbekannt')).toBe('skript')
  })

  it('bietet die drei Ausgaben der alten Werkzeugkiste, Word zuerst', () => {
    expect(w.formate.map((f) => f.id)).toEqual(['word', 'video', 'quiz'])
    expect(standardEinstellungen('youtube').format).toBe('word')
  })

  it('hat die Standardwerte der alten Oberfläche (12 Fragen, drei Fragetypen)', () => {
    expect(feldStandards('youtube')).toMatchObject({ anzahl: '12', types: 'mc,cloze,tf', videolen: '' })
  })

  it('zeigt nur das Niveau direkt, der Rest steht unter „Mehr Optionen“', () => {
    const ort = (o: string) => w.felder.filter((f) => f.ort === o).map((f) => f.id)
    expect(ort('direkt')).toEqual(['niveau'])
    expect(ort('mehr')).toEqual(['anzahl', 'types', 'videolen', 'bildungsgang', 'lernfeld'])
  })

  it('hat die vier Fragetypen der alten Oberfläche', () => {
    expect(w.felder.find((f) => f.id === 'types')!.optionen!.map((o) => o.key)).toEqual(['mc', 'cloze', 'tf', 'open'])
  })

  it('Anzahl geht bis 40 wie in der alten Oberfläche', () => {
    const anzahl = w.felder.find((f) => f.id === 'anzahl')!
    expect([anzahl.min, anzahl.max]).toEqual([1, 40])
  })

  it('hat kurze Tipps', () => {
    expect(w.tipps!.length).toBeGreaterThanOrEqual(3)
    for (const t of w.tipps!) expect(t.length).toBeLessThan(260)
  })

  it('Werkzeugwechsel: nur innerhalb derselben Eingabe', () => {
    expect(werkzeugWechselErlaubt('youtube', 'youtube')).toBe(true)
    expect(werkzeugWechselErlaubt('skript', 'kahoot')).toBe(true)
    expect(werkzeugWechselErlaubt('youtube', 'skript')).toBe(false)
    expect(werkzeugWechselErlaubt('kahoot', 'youtube')).toBe(false)
  })

  it('nimmt Niveau mit und setzt Anzahl und Fragetypen auf die eigenen Standards', () => {
    expect(einstellungenFuerWerkzeug('youtube', { ...EINST, format: 'seite', niveau: 'schwer', anzahl: '60', types: 'num' })).toMatchObject({
      format: 'word',
      niveau: 'schwer',
      anzahl: '40',
      types: 'mc,cloze,tf',
    })
  })

  it('Server: unbekanntes Format wird zu Word, werkzeugfremde Felder entfallen', () => {
    const e = einstellungenFuerWechsel('youtube', { ...EINST, format: 'h5p', genre: 'rock', anzahl: '8' })
    expect(e.format).toBe('word')
    expect(e.anzahl).toBe('8')
    expect(e).not.toHaveProperty('genre')
    expect(einstellungenFuerWechsel('youtube', { ...EINST, format: 'quiz' }).format).toBe('quiz')
  })
})

describe('Video-Eingaben prüfen', () => {
  it('Transkript: mindestens 100 Zeichen, höchstens 200.000', () => {
    expect(pruefeTranskript('kurz')).toMatch(/Transkript/)
    expect(pruefeTranskript(' '.repeat(300) + 'kurz')).not.toBeNull()
    expect(pruefeTranskript('x'.repeat(100))).toBeNull()
    expect(pruefeTranskript('x'.repeat(200_000))).toBeNull()
    expect(pruefeTranskript('x'.repeat(200_001))).toMatch(/zu lang/)
  })

  it('Link: freiwillig, aber nur http(s)', () => {
    expect(pruefeVideoLink('')).toBeNull()
    expect(pruefeVideoLink('  ')).toBeNull()
    expect(pruefeVideoLink('https://www.youtube.com/watch?v=abc')).toBeNull()
    expect(pruefeVideoLink('http://youtu.be/abc')).toBeNull()
    expect(pruefeVideoLink('youtube')).toMatch(/Link/)
    expect(pruefeVideoLink('javascript:alert(1)')).toMatch(/Link/)
    expect(pruefeVideoLink('https://x.de/' + 'a'.repeat(300))).toMatch(/zu lang/)
  })
})
