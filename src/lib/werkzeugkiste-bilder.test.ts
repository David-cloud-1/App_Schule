import { describe, expect, it } from 'vitest'
import {
  bildArt,
  eigeneBilderIn,
  eigeneDatei,
  eigeneVorschauDatei,
  EINGEBETTET_SCHAETZUNG_BYTES,
  istEigenerPfad,
  seiteMitBild,
} from '@/lib/werkzeugkiste-bilder'

describe('eigene Bilder (PROJ-92)', () => {
  it('erkennt nur Namen im erlaubten Muster', () => {
    expect(istEigenerPfad('images/eigen_abc123.jpg')).toBe(true)
    expect(istEigenerPfad('images/eigen_Abc123XyZ9.png')).toBe(true)
    for (const falsch of [
      'images/seite3_x1.png',
      'images/eigen_abc.jpg',
      'images/eigen_abc123.gif',
      'images/eigen_abc123.jpg/../x.jpg',
      '../images/eigen_abc123.jpg',
      'images/eigen_abc123.svg',
      'eigen_abc123.jpg',
      'images/eigen_ab/c123.jpg',
    ])
      expect(istEigenerPfad(falsch)).toBe(false)
  })

  it('findet eigene Bilder im Text und doppelt keines', () => {
    const text = JSON.stringify({ a: 'images/eigen_abc123.jpg', b: ['images/eigen_zzz999.png', 'images/eigen_abc123.jpg'], c: 'images/x.png' })
    expect(eigeneBilderIn(text)).toEqual(['images/eigen_abc123.jpg', 'images/eigen_zzz999.png'])
    expect(eigeneBilderIn('nichts')).toEqual([])
  })

  it('Dateinamen im Ordner', () => {
    expect(eigeneDatei('images/eigen_abc123.jpg')).toBe('eigen_abc123.jpg')
    expect(eigeneVorschauDatei('eigen_abc123.png')).toBe('eigen_abc123.vorschau.jpg')
  })

  it('erkennt PNG und JPEG am Kopf, sonst nichts', () => {
    expect(bildArt(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0]))).toBe('png')
    expect(bildArt(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe('jpg')
    expect(bildArt(new TextEncoder().encode('<svg xmlns="x"/>'))).toBeNull()
    expect(bildArt(new TextEncoder().encode('GIF89a......'))).toBeNull()
    expect(bildArt(new Uint8Array([]))).toBeNull()
  })

  it('schätzt die Seitengröße mit Deckel', () => {
    expect(seiteMitBild(null, 1000)).toBeNull()
    expect(seiteMitBild(1_000_000, 100_000)).toBe(1_134_000)
    expect(seiteMitBild(1_000_000, 2_000_000)).toBe(1_000_000 + EINGEBETTET_SCHAETZUNG_BYTES)
  })
})
