import { describe, expect, it } from 'vitest'
import { ersetzeText, treffersatz, zaehleTreffer } from './werkzeugkiste-ueberarbeiten'

describe('Tippfehler ersetzen (PROJ-52, Paket 2)', () => {
  it('ersetzt alle Fundstellen wörtlich und zählt sie', () => {
    expect(ersetzeText('Fraht und Fraht', 'Fraht', 'Fracht')).toEqual({ text: 'Fracht und Fracht', anzahl: 2 })
  })

  it('behandelt Sonderzeichen als reinen Text, nicht als Muster', () => {
    expect(ersetzeText('a.b a+b (x)', '.', '!')).toEqual({ text: 'a!b a+b (x)', anzahl: 1 })
    expect(ersetzeText('a.b a+b (x)', '(x)', '$&')).toEqual({ text: 'a.b a+b $&', anzahl: 1 })
  })

  it('lässt den Text ohne Suchbegriff oder Treffer unverändert', () => {
    expect(ersetzeText('abc', '', 'x')).toEqual({ text: 'abc', anzahl: 0 })
    expect(ersetzeText('abc', 'z', 'x')).toEqual({ text: 'abc', anzahl: 0 })
  })

  it('erlaubt das Löschen einer Stelle (leerer Ersatz) und zählt vorab', () => {
    expect(ersetzeText('ein  doppelt', '  ', ' ').text).toBe('ein doppelt')
    expect(zaehleTreffer('aXbXc', 'X')).toBe(2)
    expect(treffersatz(1)).toBe('1 Stelle ersetzt.')
    expect(treffersatz(3)).toBe('3 Stellen ersetzt.')
  })
})
