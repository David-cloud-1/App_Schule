import { describe, expect, it } from 'vitest'
import {
  ausschnittAufBild,
  ausschnittZuKlein,
  begrenzteGroesse,
  dataAdresseZuBlob,
  formatErlaubt,
  hatTransparenz,
} from '@/lib/werkzeugkiste-bild-bearbeiten'

describe('Bildbearbeitung – Rechenteile (PROJ-92)', () => {
  it('begrenzt an der längsten Seite und vergrößert nie', () => {
    expect(begrenzteGroesse(4000, 2000, 1800)).toEqual({ breite: 1800, hoehe: 900 })
    expect(begrenzteGroesse(2000, 4000, 1800)).toEqual({ breite: 900, hoehe: 1800 })
    expect(begrenzteGroesse(800, 600, 1800)).toEqual({ breite: 800, hoehe: 600 })
    expect(begrenzteGroesse(10_000, 1, 1800)).toEqual({ breite: 1800, hoehe: 1 })
  })

  it('rechnet den Rahmen vom Bildschirm auf Bildpunkte um und bleibt im Bild', () => {
    // Angezeigt 400×200, echtes Bild 1600×800 → Faktor 4
    expect(ausschnittAufBild({ x: 10, y: 20, width: 100, height: 50 }, { breite: 400, hoehe: 200 }, { breite: 1600, hoehe: 800 })).toEqual({
      x: 40,
      y: 80,
      breite: 400,
      hoehe: 200,
    })
    // ragt über den Rand: wird begrenzt
    const a = ausschnittAufBild({ x: 380, y: 190, width: 100, height: 100 }, { breite: 400, hoehe: 200 }, { breite: 1600, hoehe: 800 })
    expect(a.x + a.breite).toBeLessThanOrEqual(1600)
    expect(a.y + a.hoehe).toBeLessThanOrEqual(800)
    expect(a.breite).toBeGreaterThanOrEqual(1)
  })

  it('erkennt zu kleine Ausschnitte', () => {
    expect(ausschnittZuKlein({ x: 0, y: 0, breite: 31, hoehe: 500 })).toBe(true)
    expect(ausschnittZuKlein({ x: 0, y: 0, breite: 500, hoehe: 10 })).toBe(true)
    expect(ausschnittZuKlein({ x: 0, y: 0, breite: 32, hoehe: 32 })).toBe(false)
  })

  it('erkennt Durchsichtigkeit', () => {
    const deckend = new Uint8ClampedArray(64).fill(255)
    expect(hatTransparenz(deckend)).toBe(false)
    const luftig = new Uint8ClampedArray(64).fill(255)
    luftig[3] = 0
    expect(hatTransparenz(luftig)).toBe(true)
  })

  it('akzeptiert PNG, JPG und WebP – nach Typ, ohne Typ nach Endung', () => {
    expect(formatErlaubt({ type: 'image/png', name: 'a' })).toBe(true)
    expect(formatErlaubt({ type: 'image/jpeg', name: 'a.jpg' })).toBe(true)
    expect(formatErlaubt({ type: 'image/webp', name: 'a.webp' })).toBe(true)
    expect(formatErlaubt({ type: '', name: 'Foto.JPEG' })).toBe(true)
    expect(formatErlaubt({ type: 'image/svg+xml', name: 'a.svg' })).toBe(false)
    expect(formatErlaubt({ type: 'image/gif', name: 'a.gif' })).toBe(false)
    expect(formatErlaubt({ type: 'text/html', name: 'a.png' })).toBe(false)
    expect(formatErlaubt({ type: '', name: 'a.svg' })).toBe(false)
  })

  it('wandelt eine data:-Adresse in ein Blob', () => {
    const b = dataAdresseZuBlob('data:image/jpeg;base64,QUJD')
    expect(b?.type).toBe('image/jpeg')
    expect(b?.size).toBe(3)
    expect(dataAdresseZuBlob('https://x/y.png')).toBeNull()
    expect(dataAdresseZuBlob('data:text/html,<b>')).toBeNull()
  })
})
