import { describe, expect, it } from 'vitest'
import {
  ANBIETER,
  LINK_LANG,
  erkenneAnbieter,
  erkenneKahootPin,
  leseDarstellung,
  pruefeEinbettung,
  pruefeLink,
  titelVorschlag,
  zeitInSekunden,
} from './werkzeugkiste-einbettung'

const anbieterVon = (url: string) => {
  const p = pruefeLink(url)
  return p.ok ? erkenneAnbieter(p.url)?.id : undefined
}

describe('pruefeLink (PROJ-109)', () => {
  it('nimmt normale https-Adressen an', () => {
    expect(pruefeLink('https://www.youtube.com/watch?v=abc').ok).toBe(true)
    expect(pruefeLink('  https://learningapps.org/123  ').ok).toBe(true)
  })

  it.each([
    'http://learningapps.org/1',
    'javascript:alert(1)',
    'data:text/html,<b>x</b>',
    'ftp://example.com/x',
    'https://127.0.0.1/x',
    'https://192.168.1.5/x',
    'https://[::1]/x',
    'https://localhost/x',
    'https://drucker.local/x',
    'https://intern/x',
    'https://user:pw@learningapps.org/x',
    'learningapps.org/1',
    'nur text',
  ])('lehnt %s ab', (url) => {
    const p = pruefeLink(url)
    expect(p.ok).toBe(false)
    if (!p.ok) expect(p.grund).toBe('Dieser Link kann nicht eingebettet werden.')
  })

  it('leer ist keine Fehlermeldung wert', () => {
    expect(pruefeLink('   ')).toEqual({ ok: false, grund: 'leer' })
  })
})

describe('erkenneAnbieter', () => {
  it.each([
    ['https://www.youtube.com/watch?v=abc', 'youtube'],
    ['https://youtu.be/abc', 'youtube'],
    ['https://www.youtube-nocookie.com/embed/abc', 'youtube'],
    ['https://vimeo.com/123', 'vimeo'],
    ['https://learningapps.org/watch?v=p1', 'learningapps'],
    ['https://create.kahoot.it/share/x/1', 'kahoot'],
    ['https://padlet.com/a/b', 'padlet'],
    ['https://www.menti.com/abc', 'mentimeter'],
    ['https://geogebra.org/m/abc', 'geogebra'],
    ['https://docs.google.com/forms/d/e/1/viewform', 'google-forms'],
    ['https://forms.office.com/r/abc', 'microsoft-forms'],
  ])('%s → %s', (url, id) => {
    expect(anbieterVon(url)).toBe(id)
  })

  it('erkennt keine Fremden und keine Täuschungen', () => {
    expect(anbieterVon('https://example.com/')).toBeUndefined()
    // anderer Google-Dienst
    expect(anbieterVon('https://docs.google.com/document/d/1')).toBeUndefined()
    // Host, der nur wie der Anbieter endet
    expect(anbieterVon('https://evilyoutube.com/x')).toBeUndefined()
    expect(anbieterVon('https://youtube.com.evil.de/x')).toBeUndefined()
  })

  it('hat nur https-taugliche, eindeutige Einträge', () => {
    const ids = ANBIETER.map((a) => a.id)
    expect(new Set(ids).size).toBe(ids.length)
    // Moodle ist zurückgestellt (PROJ-109, 2026-11-25)
    expect(ids.some((i) => i.includes('moodle'))).toBe(false)
  })
})

describe('Kahoot-PIN', () => {
  it('erkennt 6 bis 7 Ziffern, auch mit Leerzeichen', () => {
    expect(erkenneKahootPin('123456')).toBe('123456')
    expect(erkenneKahootPin('123 4567')).toBe('1234567')
    expect(erkenneKahootPin('12345')).toBeNull()
    expect(erkenneKahootPin('12345678')).toBeNull()
    expect(erkenneKahootPin('12a456')).toBeNull()
  })
})

describe('zeitInSekunden', () => {
  it('liest Sekunden, Minuten und Stunden', () => {
    expect(zeitInSekunden('90')).toBe(90)
    expect(zeitInSekunden('1:30')).toBe(90)
    expect(zeitInSekunden('1:02:03')).toBe(3723)
    expect(zeitInSekunden('')).toBeNull()
    expect(zeitInSekunden('abc')).toBeNaN()
    expect(zeitInSekunden('1:75')).toBeNaN()
  })
})

describe('pruefeEinbettung', () => {
  it('leer und ungültig', () => {
    expect(pruefeEinbettung({ url: '' }).art).toBe('leer')
    const u = pruefeEinbettung({ url: 'http://x.de' })
    expect(u.art).toBe('ungueltig')
    expect(u.fehler).toBeTruthy()
  })

  it('PIN', () => {
    const p = pruefeEinbettung({ url: '123456' })
    expect(p).toMatchObject({ art: 'pin', pin: '123456', wirdEingebettet: false })
  })

  it('Anbieter der Liste: Voreinstellung und Wahl', () => {
    expect(pruefeEinbettung({ url: 'https://vimeo.com/1' }).wirdEingebettet).toBe(true)
    expect(pruefeEinbettung({ url: 'https://vimeo.com/1', darstellung: 'link' }).wirdEingebettet).toBe(false)
    // Kahoot startet mit Link und QR-Code
    expect(pruefeEinbettung({ url: 'https://kahoot.it/challenge/1' }).wirdEingebettet).toBe(false)
    expect(pruefeEinbettung({ url: 'https://kahoot.it/challenge/1', darstellung: 'einbetten' }).wirdEingebettet).toBe(true)
  })

  it('fremder Anbieter wird nie eingebettet', () => {
    const p = pruefeEinbettung({ url: 'https://example.com/x', darstellung: 'einbetten' })
    expect(p.art).toBe('link')
    expect(p.anbieter).toBeNull()
    expect(p.wirdEingebettet).toBe(false)
  })

  it('warnt bei langem Link und falschen Zeiten', () => {
    const lang = pruefeEinbettung({ url: 'https://example.com/' + 'a'.repeat(LINK_LANG) })
    expect(lang.hinweise.join(' ')).toContain('QR-Code')
    const z = pruefeEinbettung({ url: 'https://youtu.be/abc', start: '2:00', ende: '1:00' })
    expect(z.hinweise.join(' ')).toContain('nach der Startzeit')
    const k = pruefeEinbettung({ url: 'https://youtu.be/abc', start: 'bald' })
    expect(k.hinweise.join(' ')).toContain('Startzeit')
  })

  it('Zeiten gibt es nur bei Video', () => {
    const p = pruefeEinbettung({ url: 'https://padlet.com/a', start: 'bald' })
    expect(p.hinweise).toEqual([])
  })
})

describe('leseDarstellung und Titel', () => {
  it('ohne Anbieter immer Link', () => {
    expect(leseDarstellung('einbetten', null)).toBe('link')
  })
  it('Titelvorschläge', () => {
    expect(titelVorschlag('https://youtu.be/abc')).toBe('Video ansehen')
    expect(titelVorschlag('123456')).toBe('Kahoot spielen')
    expect(titelVorschlag('https://padlet.com/a')).toBe('Padlet öffnen')
    expect(titelVorschlag('https://example.com')).toBe('')
    expect(titelVorschlag('quatsch')).toBe('')
  })
})
