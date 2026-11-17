import { describe, expect, it } from 'vitest'
import type { Struktur } from '@/lib/werkzeugkiste-editor'
import {
  bereichOrte,
  bildPfadeIn,
  bloeckeAn,
  eineStelle,
  ersetzeBildPfade,
  fuegeBloeckeEin,
  gleicheTypOrte,
  loescheBloecke,
  ordneOrte,
  textAlsBlock,
  passendeBloecke,
  verschiebeBloecke,
} from '@/lib/werkzeugkiste-bloecke'

function bau(...themen: string[][]): Struktur {
  return {
    cover: { title: 'T' },
    chapters: themen.map((t, i) => ({ title: `K${i}`, elements: t.map((n) => ({ type: n.startsWith('i') ? 'image' : 'text', content: n })) })),
  }
}
const inhalt = (s: Struktur) => s.chapters.map((t) => t.elements.map((e) => String(e.content)))

describe('Mehrfachauswahl', () => {
  const s = bau(['a', 'i1', 'b'], ['c', 'i2'], [])

  it('ordnet Orte, entfernt Doppelte und unbekannte Stellen', () => {
    const orte = ordneOrte(s, [{ thema: 1, block: 0 }, { thema: 0, block: 2 }, { thema: 0, block: 2 }, { thema: 5, block: 0 }, { thema: 0, block: 9 }])
    expect(orte).toEqual([{ thema: 0, block: 2 }, { thema: 1, block: 0 }])
  })

  it('wählt einen Bereich über Themengrenzen', () => {
    expect(bereichOrte(s, { thema: 1, block: 0 }, { thema: 0, block: 1 })).toEqual([
      { thema: 0, block: 1 },
      { thema: 0, block: 2 },
      { thema: 1, block: 0 },
    ])
  })

  it('wählt alle gleichen Typen im Thema oder auf der Seite', () => {
    expect(gleicheTypOrte(s, { thema: 0, block: 1 }, true)).toEqual([{ thema: 0, block: 1 }])
    expect(gleicheTypOrte(s, { thema: 0, block: 1 }, false)).toEqual([{ thema: 0, block: 1 }, { thema: 1, block: 1 }])
  })
})

describe('Löschen und Verschieben', () => {
  it('löscht mehrere Blöcke auf einmal', () => {
    const s = bau(['a', 'b', 'c'], ['d', 'e'])
    const r = loescheBloecke(s, [{ thema: 1, block: 0 }, { thema: 0, block: 0 }, { thema: 0, block: 2 }])
    expect(inhalt(r)).toEqual([['b'], ['e']])
  })

  it('verschiebt mehrere Blöcke in anderes Thema in alter Reihenfolge', () => {
    const s = bau(['a', 'b', 'c'], ['d'])
    const r = verschiebeBloecke(s, [{ thema: 0, block: 2 }, { thema: 0, block: 0 }], { thema: 1, index: 0 })
    expect(inhalt(r.struktur)).toEqual([['b'], ['a', 'c', 'd']])
    expect(r.orte).toEqual([{ thema: 1, block: 0 }, { thema: 1, block: 1 }])
  })

  it('zählt das Ziel im selben Thema vor dem Entfernen', () => {
    const s = bau(['a', 'b', 'c', 'd'])
    const r = verschiebeBloecke(s, [{ thema: 0, block: 0 }], { thema: 0, index: 3 })
    expect(inhalt(r.struktur)).toEqual([['b', 'c', 'a', 'd']])
    expect(r.orte).toEqual([{ thema: 0, block: 2 }])
  })

  it('lässt alles, wie es ist, wenn das Ziel die alte Stelle ist', () => {
    const s = bau(['a', 'b', 'c'])
    expect(verschiebeBloecke(s, [{ thema: 0, block: 1 }], { thema: 0, index: 1 }).struktur).toBe(s)
    expect(verschiebeBloecke(s, [{ thema: 0, block: 1 }], { thema: 0, index: 2 }).struktur).toBe(s)
  })

  it('setzt ans Ende eines leeren Themas', () => {
    const s = bau(['a'], [])
    const r = verschiebeBloecke(s, [{ thema: 0, block: 0 }], { thema: 1, index: 0 })
    expect(inhalt(r.struktur)).toEqual([[], ['a']])
  })

  it('ignoriert ein Ziel, das es nicht gibt', () => {
    const s = bau(['a'])
    expect(verschiebeBloecke(s, [{ thema: 0, block: 0 }], { thema: 4, index: 0 }).struktur).toBe(s)
  })
})

describe('Alt + Pfeil', () => {
  const s = bau(['a', 'b'], ['c'])
  it('geht eine Stelle nach oben und über die Themengrenze', () => {
    expect(eineStelle(s, [{ thema: 0, block: 1 }], -1)).toEqual({ thema: 0, index: 0 })
    expect(eineStelle(s, [{ thema: 1, block: 0 }], -1)).toEqual({ thema: 0, index: 2 })
    expect(eineStelle(s, [{ thema: 0, block: 0 }], -1)).toBeNull()
  })
  it('geht eine Stelle nach unten und über die Themengrenze', () => {
    expect(eineStelle(s, [{ thema: 0, block: 0 }], 1)).toEqual({ thema: 0, index: 2 })
    expect(eineStelle(s, [{ thema: 0, block: 1 }], 1)).toEqual({ thema: 1, index: 0 })
    expect(eineStelle(s, [{ thema: 1, block: 0 }], 1)).toBeNull()
  })
  it('bewegt sich wirklich um eine Stelle', () => {
    const r = verschiebeBloecke(s, [{ thema: 0, block: 0 }], eineStelle(s, [{ thema: 0, block: 0 }], 1)!)
    expect(inhalt(r.struktur)).toEqual([['b', 'a'], ['c']])
  })
})

describe('Einsetzen', () => {
  it('setzt unabhängige Kopien an die Stelle', () => {
    const s = bau(['a', 'b'])
    const quelle = bloeckeAn(s, [{ thema: 0, block: 0 }])
    const r = fuegeBloeckeEin(s, { thema: 0, index: 1 }, quelle)
    expect(inhalt(r.struktur)).toEqual([['a', 'a', 'b']])
    expect(r.orte).toEqual([{ thema: 0, block: 1 }])
    expect(r.struktur.chapters[0].elements[1]).not.toBe(r.struktur.chapters[0].elements[0])
  })
  it('begrenzt die Stelle auf das Themenende und tut bei fehlendem Thema nichts', () => {
    const s = bau(['a'])
    expect(inhalt(fuegeBloeckeEin(s, { thema: 0, index: 99 }, [{ type: 'text', content: 'z' }]).struktur)).toEqual([['a', 'z']])
    expect(fuegeBloeckeEin(s, { thema: 3, index: 0 }, [{ type: 'text', content: 'z' }]).struktur).toBe(s)
  })
  it('lässt unbekannte Typen aus und zählt sie', () => {
    const r = passendeBloecke([{ type: 'text' }, { type: 'gibt_es_nicht' }])
    expect(r.passend).toHaveLength(1)
    expect(r.ausgelassen).toBe(1)
  })
})

describe('Fremdtext', () => {
  it('wird zu Absätzen und kann keine Auszeichnung einschleusen', () => {
    const b = textAlsBlock('Eins <b>x</b>\nzwei\n\nDrei "q"')
    expect(b?.content).toBe('<p>Eins &lt;b&gt;x&lt;/b&gt;<br>zwei</p><p>Drei &quot;q&quot;</p>')
  })
  it('lehnt leeren Text ab', () => {
    expect(textAlsBlock('  \n ')).toBeNull()
  })
})

describe('Bildnamen', () => {
  it('findet und ersetzt Bildnamen', () => {
    const b = [{ type: 'image', path: 'images/seite1_x.png' }, { type: 'text', content: '<img src="images/eigen_abc12345.jpg">' }]
    expect(bildPfadeIn(b).sort()).toEqual(['images/eigen_abc12345.jpg', 'images/seite1_x.png'])
    const r = ersetzeBildPfade(b, { 'images/seite1_x.png': 'images/eigen_neu12345.png' })
    expect(JSON.stringify(r)).toContain('images/eigen_neu12345.png')
    expect(JSON.stringify(r)).toContain('images/eigen_abc12345.jpg')
  })
})

describe('setzeUebernahmeEin (PROJ-108)', () => {
  const S = {
    cover: {},
    chapters: [
      { title: 'A', elements: [{ type: 'text', content: '1' }, { type: 'text', content: '2' }] },
      { title: 'B', elements: [] },
    ],
  } as Struktur
  const neuB = { type: 'true_false', statement: 'x' }
  const neuT = { title: 'Neu', elements: [{ type: 'text', content: 'n' }] }

  it('setzt Blöcke an die Stelle und gibt ihre Orte zurück', async () => {
    const { setzeUebernahmeEin } = await import('@/lib/werkzeugkiste-bloecke')
    const r = setzeUebernahmeEin(S, { thema: 0, index: 1 }, [], [neuB])
    expect(r.struktur.chapters[0].elements.map((b) => b.type)).toEqual(['text', 'true_false', 'text'])
    expect(r.orte).toEqual([{ thema: 0, block: 1 }])
    expect(S.chapters[0].elements).toHaveLength(2)
  })
  it('setzt Themen hinter das Thema der Blöcke bzw. des Ziels', async () => {
    const { setzeUebernahmeEin } = await import('@/lib/werkzeugkiste-bloecke')
    const r = setzeUebernahmeEin(S, { thema: 0, index: 0 }, [neuT], [neuB])
    expect(r.struktur.chapters.map((t) => t.title)).toEqual(['A', 'Neu', 'B'])
    expect(r.themaIndizes).toEqual([1])
    const nur = setzeUebernahmeEin(S, { thema: 1, index: 0 }, [neuT], [])
    expect(nur.struktur.chapters.map((t) => t.title)).toEqual(['A', 'B', 'Neu'])
  })
  it('ohne Ziel: ans Ende, ohne Thema in ein neues Thema 1, Themen ans Ende', async () => {
    const { setzeUebernahmeEin } = await import('@/lib/werkzeugkiste-bloecke')
    const leer = { cover: {}, chapters: [] } as Struktur
    const r = setzeUebernahmeEin(leer, null, [neuT], [neuB])
    expect(r.struktur.chapters.map((t) => t.title)).toEqual(['Thema 1', 'Neu'])
    expect(r.struktur.chapters[0].elements).toHaveLength(1)
    const ende = setzeUebernahmeEin(S, null, [], [neuB])
    expect(ende.struktur.chapters[1].elements).toHaveLength(1)
  })
})
