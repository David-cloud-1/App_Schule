// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import {
  aufraeumen,
  boxArt,
  eingefuegtesBereinigen,
  hatAktivenInhalt,
  hatExterneBilder,
  istBox,
  kennzeichen,
  normalisiere,
  rundreiseOk,
  sauberGeschlossen,
} from './werkzeugkiste-text'

const el = (html: string) => new DOMParser().parseFromString(html, 'text/html').body.firstElementChild!

describe('Boxen erkennen wie der Kern', () => {
  it('Klassen, Schreibvarianten und Umlaute', () => {
    expect(kennzeichen('merke')).toBe('merke')
    expect(kennzeichen('Merksatz')).toBe('merke')
    expect(kennzeichen('foo Prüfungs-Simulation')).toBe('pruefung')
    expect(kennzeichen('schritt-liste')).toBe('schritte')
    expect(kennzeichen('unbekannt')).toBeNull()
    expect(boxArt('warnung')?.titel).toBe('Achtung:')
  })

  it('Box mit eigenem Stil ist keine bearbeitbare Box (Inline-CSS hat Vorrang)', () => {
    expect(istBox(el('<div class="tipp">x</div>'))).toBe(true)
    expect(istBox(el('<div class="tipp" style="color:red">x</div>'))).toBe(false)
    expect(istBox(el('<div style="background:#eef4fb">alt</div>'))).toBe(false)
    expect(istBox(el('<p class="tipp">x</p>'))).toBe(false)
    expect(istBox(el('<div class="vergleich"></div>'))).toBe(false)
  })
})

describe('Aufräumen', () => {
  it('packt einzelne Absätze in Listen, Zellen und Boxen aus', () => {
    expect(aufraeumen('<ul><li><p>a</p></li></ul><div class="merke"><p>M</p></div>')).toBe(
      '<ul><li>a</li></ul><div class="merke">M</div>',
    )
    // Zwei Absätze bleiben, Absätze mit Attributen auch
    expect(aufraeumen('<div class="merke"><p>a</p><p>b</p></div>')).toBe('<div class="merke"><p>a</p><p>b</p></div>')
    expect(aufraeumen('<li><p style="x">a</p></li>')).toBe('<li><p style="x">a</p></li>')
  })

  it('leerer Editor ergibt leeren Text', () => {
    expect(aufraeumen('<p></p>')).toBe('')
  })
})

describe('Rundreise-Prüfung', () => {
  const KI = `<div class="lernziele"><ul><li>Du kannst die Haftung erklären.</li></ul></div>
<h2>Grundlagen</h2>
<p>Der <b>Frachtführer</b> haftet.</p>
<div class="achtung" data-titel="⭐ Prüfungsrelevant:">8,33 SZR je kg</div>`

  it('gleich trotz Leerraum, Attribut-Reihenfolge, b/strong und Absätzen in Boxen', () => {
    const editor =
      '<div class="lernziele"><ul><li><p>Du kannst die Haftung erklären.</p></li></ul></div><h2>Grundlagen</h2>' +
      '<p>Der <strong>Frachtführer</strong> haftet.</p><div data-titel="⭐ Prüfungsrelevant:" class="achtung"><p>8,33 SZR je kg</p></div>'
    expect(rundreiseOk(KI, editor)).toBe(true)
  })

  it('erkennt verlorene Gestaltung', () => {
    expect(rundreiseOk('<p style="color:red">x</p>', '<p>x</p>')).toBe(false)
    expect(rundreiseOk('<p><u>x</u></p>', '<p>x</p>')).toBe(false)
    expect(rundreiseOk('<h5>x</h5>', '<p>x</p>')).toBe(false)
    expect(rundreiseOk('<div class="merke">x</div>', '<p>x</p>')).toBe(false)
  })

  it('Stil-Angaben vergleicht sie ohne Leerraum und letztes Semikolon', () => {
    expect(normalisiere('<p style="color: red; margin:0;">x</p>')).toBe(normalisiere('<p style="color:red;margin:0">x</p>'))
  })
})

describe('Hinweise zur HTML-Ansicht', () => {
  it('aktiver Inhalt', () => {
    expect(hatAktivenInhalt('<p onclick="x()">a</p>')).toBe(true)
    expect(hatAktivenInhalt('<script>alert(1)</script>')).toBe(true)
    expect(hatAktivenInhalt('<a href="javascript:alert(1)">a</a>')).toBe(true)
    expect(hatAktivenInhalt('<p>Online-Formular</p>')).toBe(false)
    // Was der Kern seit der QA zusätzlich entfernt
    expect(hatAktivenInhalt('<iframe src="https://x.example"></iframe>')).toBe(true)
    expect(hatAktivenInhalt('<form action="https://x.example"></form>')).toBe(true)
    expect(hatAktivenInhalt('<img src="x.png"/onerror=alert(1)>')).toBe(true)
    expect(hatAktivenInhalt('<iframe srcdoc="x"></iframe>')).toBe(true)
    expect(hatAktivenInhalt('<p>Ein Formular ausfüllen, die Information lesen</p>')).toBe(false)
  })

  it('externe Bilder', () => {
    expect(hatExterneBilder('<img src="https://example.org/a.png">')).toBe(true)
    expect(hatExterneBilder("<p><img alt='x' src='//cdn.example/a.png'></p>")).toBe(true)
    expect(hatExterneBilder('<img src="data:image/png;base64,AAA=">')).toBe(false)
    expect(hatExterneBilder('<img src="images/lager.png">')).toBe(false)
    expect(hatExterneBilder('<a href="https://example.org">Link</a>')).toBe(false)
  })

  it('nicht geschlossene Elemente', () => {
    expect(sauberGeschlossen('<div class="merke"><p>a</p></div><br><img src="x">')).toBe(true)
    expect(sauberGeschlossen('<div><p>a</div>')).toBe(false)
    expect(sauberGeschlossen('<div>')).toBe(false)
  })

  it('Eingefügtes aus Word verliert Schriften, Farben und Klassen', () => {
    const roh = '<p class="MsoNormal" style="font-family:Calibri"><span style="color:red">Rot</span> <b>fett</b><o:p></o:p></p><script>x</script>'
    expect(eingefuegtesBereinigen(roh)).toBe('<p>Rot <b>fett</b></p>')
  })
})
