import { describe, expect, it } from 'vitest'
import {
  ANBIETER,
  KEIN_FENSTER,
  LINK_LANG,
  einbettAdresse,
  erkenneAnbieter,
  erkenneKahootPin,
  leseDarstellung,
  linkHost,
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
    const p = pruefeEinbettung({ url: 'https://padlet.com/lehrer/board-abc123xyz9', start: 'bald' })
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

// QA-Bugs PROJ-109 (2026-11-25): Editor und Kern sollen gleich entscheiden
function adresse(roh: string): string | null {
  const p = pruefeLink(roh)
  if (!p.ok) throw new Error('Link ungültig: ' + roh)
  return einbettAdresse(erkenneAnbieter(p.url), p.url)
}

describe('einbettAdresse wie im Kern (BUG-3/BUG-4)', () => {
  it('baut dieselben Einbett-Adressen wie kern_einbettung_test', () => {
    const faelle: Record<string, string> = {
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=x': 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?rel=0',
      'https://youtu.be/dQw4w9WgXcQ': 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?rel=0',
      'https://vimeo.com/12345': 'https://player.vimeo.com/video/12345?dnt=1',
      'https://learningapps.org/1234': 'https://learningapps.org/watch?app=1234',
      'https://learningapps.org/watch?v=pab12': 'https://learningapps.org/watch?v=pab12',
      'https://Kahoot.it/challenge/123?x=1#frag': 'https://kahoot.it/challenge/123?x=1',
      'https://padlet.com/lehrer/mein-board-abc123xyz9?x=1#f': 'https://padlet.com/embed/abc123xyz9',
      'https://padlet.com/embed/abc123xyz9': 'https://padlet.com/embed/abc123xyz9',
      'https://www.mentimeter.com/app/presentation/al1b2c3d4/edit': 'https://www.mentimeter.com/app/presentation/al1b2c3d4/embed',
      'https://www.geogebra.org/m/abcd1234': 'https://www.geogebra.org/material/iframe/id/abcd1234',
      'https://schule.h5p.com/content/1291234567': 'https://schule.h5p.com/content/1291234567/embed',
      'https://docs.google.com/forms/d/e/1FAIpQLSdAbCdEf123/viewform?usp=sf_link':
        'https://docs.google.com/forms/d/e/1FAIpQLSdAbCdEf123/viewform?embedded=true',
      'https://forms.office.com/r/AbC123xyz': 'https://forms.office.com/r/AbC123xyz?embed=true',
      'https://forms.office.com/Pages/ResponsePage.aspx?id=AbCdEf12345':
        'https://forms.office.com/Pages/ResponsePage.aspx?id=AbCdEf12345&embed=true',
    }
    for (const [u, soll] of Object.entries(faelle)) expect(adresse(u), u).toBe(soll)
    for (const u of [
      'https://www.youtube.com/',
      'https://www.menti.com/al1b2c3',
      'https://padlet.com/lehrer',
      'https://padlet.com/a/b',
      'https://www.geogebra.org/classic',
      'https://docs.google.com/forms/u/0/',
      'https://schule.h5p.com/content/x',
      'https://forms.gle/abc',
    ])
      expect(adresse(u), u).toBeNull()
  })

  it('meldet im Editor, wenn kein Fenster entstehen kann', () => {
    const s = pruefeEinbettung({ url: 'https://www.menti.com/al1b2c3', darstellung: 'einbetten' })
    expect(s.wirdEingebettet).toBe(false)
    expect(s.hinweise).toContain(KEIN_FENSTER)
    expect(pruefeEinbettung({ url: 'https://www.menti.com/al1b2c3', darstellung: 'link' }).hinweise).not.toContain(KEIN_FENSTER)
  })

  it('lehnt Leerzeichen im Link ab wie der Kern, nimmt Umlaut-Domains an', () => {
    expect(pruefeLink('https://a.de/x y').ok).toBe(false)
    expect(pruefeLink('https://a.de/\tx').ok).toBe(false)
    const p = pruefeLink('https://bücher.de/x')
    expect(p.ok && p.url.hostname).toBe('xn--bcher-kva.de')
  })

  it('nennt beim Öffnen den Host des Links (BUG-2)', () => {
    expect(linkHost(new URL('https://www.youtube.com/watch?v=x'))).toBe('youtube.com')
    expect(linkHost(new URL('https://youtu.be/x'))).toBe('youtu.be')
  })
})
