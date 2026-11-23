import { describe, expect, it } from 'vitest'
import daten from './daten/leitlinien.json'
import { CHECKLISTEN } from './katalog'
import { CHECKLISTEN_LISTEN, findeCheckliste } from './listen'
import { findeAnker, setzeLeitlinie } from './setzer'
import { KENNUNG_MUSTER } from './katalog'

type Norm = { kennung: string; stand: string | null; text: string; pruefsumme: string }
const NORMEN = (daten as { normen: Norm[] }).normen
const norm = (k: string) => NORMEN.find((n) => n.kennung === k)

describe('Checklisten stimmen mit den Leitlinien überein (PROJ-122, E4)', () => {
  for (const liste of CHECKLISTEN_LISTEN) {
    describe(liste.titel, () => {
      it('hat zu jeder Quelle die Leitlinie, ihre Prüfsumme und ihren Stand – sonst „bitte prüfen“', () => {
        for (const q of liste.quellen) {
          const n = norm(q.leitlinie)
          expect(n, `Leitlinie „${q.leitlinie}“ fehlt in der Momentaufnahme`).toBeTruthy()
          expect(
            q.pruefsumme,
            `Die Leitlinie „${q.leitlinie}“ hat sich geändert. Liste prüfen, dann Prüfsumme auf ${n!.pruefsumme} setzen.`,
          ).toBe(n!.pruefsumme)
          expect(q.stand).toBe(n!.stand)
        }
      })

      it('verweist mit jedem Textanker auf eine Wendung, die wörtlich im Original steht', () => {
        for (const e of [...liste.schritte, ...liste.hinweise]) {
          if (!e.anker) continue
          const q = liste.quellen.find((x) => x.schluessel === e.anker!.quelle)
          expect(q, `${e.id}: Quelle „${e.anker.quelle}“ unbekannt`).toBeTruthy()
          const bloecke = setzeLeitlinie(norm(q!.leitlinie)!.text, q!.ueberschriften)
          expect(findeAnker(bloecke, e.anker.text), `${e.id}: Anker nicht im Original: „${e.anker.text}“`).not.toBeNull()
        }
      })

      it('setzt jede angegebene Überschrift tatsächlich als Überschrift', () => {
        for (const q of liste.quellen) {
          const gesetzt = setzeLeitlinie(norm(q.leitlinie)!.text, q.ueberschriften)
            .filter((b) => b.art === 'ueberschrift')
            .map((b) => (b as { text: string }).text)
          for (const u of q.ueberschriften ?? []) expect(gesetzt, `Überschrift fehlt: ${u}`).toContain(u)
        }
      })

      it('hat eindeutige, gültige Kennungen und kennt jede Variante', () => {
        const ids = [...liste.schritte.map((s) => s.id), ...liste.hinweise.map((h) => h.id)]
        expect(new Set(ids).size).toBe(ids.length)
        for (const id of ids) expect(id).toMatch(KENNUNG_MUSTER)
        const varianten = liste.varianten?.map((v) => v.id) ?? []
        for (const e of [...liste.schritte, ...liste.hinweise]) {
          for (const v of e.varianten ?? []) expect(varianten, `${e.id}: Variante ${v}`).toContain(v)
        }
        for (const s of liste.schritte) for (const v of s.fristAnnahme ?? []) expect(varianten).toContain(v)
      })

      it('steht mit denselben Varianten im Katalog der Schnittstellen', () => {
        expect(CHECKLISTEN[liste.id], 'Eintrag in katalog.ts fehlt').toBeTruthy()
        expect([...(liste.varianten?.map((v) => v.id) ?? [])].sort()).toEqual([...CHECKLISTEN[liste.id].varianten].sort())
      })

      it('führt jeden Schritt mit Verb am Anfang als einen Satz ohne Punkt-Ketten', () => {
        for (const s of liste.schritte) expect(s.text.length).toBeLessThan(160)
      })
    })
  }

  it('verweist mit „weiter“ auf eine vorhandene Liste', () => {
    for (const l of CHECKLISTEN_LISTEN) if (l.weiter) expect(findeCheckliste(l.weiter.id)).toBeTruthy()
  })

  it('enthält keine Unterschrift in der Momentaufnahme der Pilot-Leitlinien', () => {
    expect(norm('Dienst- und Fortbildungsreise')!.text).not.toMatch(/Schulleiterin?\s*$/)
  })

  it('enthält in keiner Leitlinie eine persönliche E-Mail-Adresse oder Handynummer', () => {
    for (const n of NORMEN) {
      expect(n.text, n.kennung).not.toMatch(/\b[a-zäöüß]+\.[a-zäöüß]+@/)
      expect(n.text, n.kennung).not.toMatch(/\b01[5-7]\d[\s\d]{6,}\d/)
    }
  })
})
