import { describe, expect, it, vi } from 'vitest'
import { erreichbarkeitsBefunde, pruefeErreichbar, sammleEinbettungen } from './werkzeugkiste-einbettung-server'

const antwort = (status: number) => vi.fn().mockResolvedValue({ status, body: null })

describe('pruefeErreichbar (PROJ-109)', () => {
  it('ruft nur Anbieter der Liste ab', async () => {
    const abruf = antwort(200)
    expect(await pruefeErreichbar('https://example.com/x', abruf)).toBe('nicht_geprueft')
    expect(await pruefeErreichbar('https://127.0.0.1/x', abruf)).toBe('nicht_geprueft')
    expect(await pruefeErreichbar('http://youtu.be/abc', abruf)).toBe('nicht_geprueft')
    expect(await pruefeErreichbar('123456', abruf)).toBe('nicht_geprueft')
    expect(abruf).not.toHaveBeenCalled()
  })

  it('folgt keinen Weiterleitungen und hat eine Zeitgrenze', async () => {
    const abruf = antwort(200)
    await pruefeErreichbar('https://youtu.be/abc', abruf)
    expect(abruf).toHaveBeenCalledTimes(1)
    const init = abruf.mock.calls[0][1] as RequestInit
    expect(init.redirect).toBe('manual')
    expect(init.signal).toBeDefined()
  })

  it.each([
    [200, 'ok'],
    [302, 'ok'],
    [404, 'nicht_erreichbar'],
    [410, 'nicht_erreichbar'],
    [503, 'nicht_erreichbar'],
    [403, 'nicht_geprueft'],
    [429, 'nicht_geprueft'],
  ])('Status %s → %s', async (status, erwartet) => {
    expect(await pruefeErreichbar('https://learningapps.org/123', antwort(status))).toBe(erwartet)
  })

  it('Netzfehler = nicht erreichbar, Zeitüberschreitung = nicht geprüft', async () => {
    const netz = vi.fn().mockRejectedValue(new TypeError('fetch failed'))
    expect(await pruefeErreichbar('https://learningapps.org/123', netz)).toBe('nicht_erreichbar')
    const zeit = vi.fn().mockRejectedValue(Object.assign(new Error('t'), { name: 'TimeoutError' }))
    expect(await pruefeErreichbar('https://learningapps.org/123', zeit)).toBe('nicht_geprueft')
  })
})

describe('Befunde zu Einbett-Blöcken', () => {
  const struktur = {
    chapters: [
      { elements: [{ type: 'text' }, { type: 'einbetten', url: 'https://learningapps.org/1' }] },
      { elements: [{ type: 'einbetten', url: 'https://example.com/x' }, { type: 'einbetten', url: '' }] },
    ],
  }

  it('findet die Blöcke mit Link und ihre Stelle', () => {
    expect(sammleEinbettungen(struktur)).toEqual([
      { url: 'https://learningapps.org/1', kapitel: 0, element: 1 },
      { url: 'https://example.com/x', kapitel: 1, element: 0 },
    ])
    expect(sammleEinbettungen(null)).toEqual([])
    expect(sammleEinbettungen({ chapters: 'x' })).toEqual([])
  })

  it('meldet nur Links, die nicht erreichbar sind, als Hinweis mit Stelle', async () => {
    const befunde = await erreichbarkeitsBefunde(struktur, antwort(404))
    expect(befunde).toHaveLength(1)
    expect(befunde[0]).toMatchObject({ schwere: 'mittel', stellen: [{ kapitel: 0, element: 1 }] })
    expect(befunde[0].text).toContain('LearningApps')
    expect(await erreichbarkeitsBefunde(struktur, antwort(200))).toEqual([])
  })
})
