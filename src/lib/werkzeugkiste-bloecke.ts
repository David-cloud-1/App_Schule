/**
 * Mehrere Blöcke auf einmal (PROJ-102): auswählen, verschieben, löschen, einsetzen.
 * Reine Funktionen auf der Struktur, ohne Browser und Server. Alles Einsetzen
 * (Ziehen, „Verschieben nach …“, Einfügen aus der Zwischenablage) läuft durch
 * `fuegeBloeckeEin` bzw. `verschiebeBloecke`, damit überall dasselbe gilt:
 * Reihenfolge bleibt, ein Rückgängig-Schritt, nie ein Block doppelt.
 */

import { kopie, istBekannterTyp, type Block, type Ort, type Struktur, type Thema } from '@/lib/werkzeugkiste-editor'

/** Wo Blöcke hinkommen: Thema und Position im Thema (vor dem Entfernen gezählt) */
export type Ziel = { thema: number; index: number }

/** So viele Blöcke darf eine Zwischenablage höchstens halten */
export const ZWISCHENABLAGE_MAX_BLOECKE = 50

function gleicherOrt(a: Ort, b: Ort) {
  return a.thema === b.thema && a.block === b.block
}

/** In Lesereihenfolge, ohne Doppelte und ohne Stellen, die es nicht gibt */
export function ordneOrte(s: Struktur, orte: Ort[]): Ort[] {
  const ok = orte.filter((o) => Number.isInteger(o.thema) && Number.isInteger(o.block) && !!s.chapters[o.thema]?.elements[o.block])
  const sortiert = [...ok].sort((a, b) => a.thema - b.thema || a.block - b.block)
  return sortiert.filter((o, i) => i === 0 || !gleicherOrt(o, sortiert[i - 1]))
}

/** Alle Blöcke von `von` bis `bis` in Lesereihenfolge, auch über Themengrenzen */
export function bereichOrte(s: Struktur, von: Ort, bis: Ort): Ort[] {
  const [a, b] = [von, bis].sort((x, y) => x.thema - y.thema || x.block - y.block)
  const liste: Ort[] = []
  for (let t = a.thema; t <= b.thema; t++) {
    const elemente = s.chapters[t]?.elements ?? []
    const start = t === a.thema ? a.block : 0
    const ende = t === b.thema ? b.block : elemente.length - 1
    for (let i = start; i <= ende; i++) if (elemente[i]) liste.push({ thema: t, block: i })
  }
  return liste
}

/** Alle Blöcke desselben Typs, im Thema des Blocks oder auf der ganzen Seite */
export function gleicheTypOrte(s: Struktur, ort: Ort, imThema: boolean): Ort[] {
  const typ = s.chapters[ort.thema]?.elements[ort.block]?.type
  if (!typ) return []
  const liste: Ort[] = []
  s.chapters.forEach((t, ti) => {
    if (imThema && ti !== ort.thema) return
    t.elements.forEach((b, bi) => {
      if (b.type === typ) liste.push({ thema: ti, block: bi })
    })
  })
  return liste
}

function mitThemen(s: Struktur) {
  return s.chapters.map((t) => ({ ...t, elements: [...t.elements] }))
}

export function loescheBloecke(s: Struktur, orte: Ort[]): Struktur {
  const geordnet = ordneOrte(s, orte)
  if (geordnet.length === 0) return s
  const themen = mitThemen(s)
  for (let i = geordnet.length - 1; i >= 0; i--) themen[geordnet[i].thema].elements.splice(geordnet[i].block, 1)
  return { ...s, chapters: themen }
}

/**
 * Blöcke an eine Stelle verschieben (auch in ein anderes Thema). `ziel.index` zählt wie beim
 * Ziehen **vor** dem Entfernen. Die Blöcke bleiben in ihrer bisherigen Reihenfolge beieinander.
 * Liefert die neuen Orte der verschobenen Blöcke; ändert sich nichts, kommt `s` unverändert zurück.
 */
export function verschiebeBloecke(s: Struktur, orte: Ort[], ziel: Ziel): { struktur: Struktur; orte: Ort[] } {
  const geordnet = ordneOrte(s, orte)
  const zielThema = s.chapters[ziel.thema]
  if (geordnet.length === 0 || !zielThema) return { struktur: s, orte: geordnet }
  const davor = geordnet.filter((o) => o.thema === ziel.thema && o.block < ziel.index).length
  const index = Math.max(0, Math.min(ziel.index, zielThema.elements.length) - davor)
  const bloecke = geordnet.map((o) => s.chapters[o.thema].elements[o.block])
  const themen = mitThemen(s)
  for (let i = geordnet.length - 1; i >= 0; i--) themen[geordnet[i].thema].elements.splice(geordnet[i].block, 1)
  const im = Math.min(index, themen[ziel.thema].elements.length)
  themen[ziel.thema].elements.splice(im, 0, ...bloecke)
  const neu = bloecke.map((_, i) => ({ thema: ziel.thema, block: im + i }))
  // Gleiche Stelle wie vorher: nichts zu tun
  if (geordnet.length === neu.length && geordnet.every((o, i) => gleicherOrt(o, neu[i]))) return { struktur: s, orte: geordnet }
  return { struktur: { ...s, chapters: themen }, orte: neu }
}

/** Blöcke als neue, unabhängige Kopien einsetzen. Liefert die Orte der eingesetzten Blöcke */
export function fuegeBloeckeEin(s: Struktur, ziel: Ziel, bloecke: Block[]): { struktur: Struktur; orte: Ort[] } {
  const thema = s.chapters[ziel.thema]
  if (!thema || bloecke.length === 0) return { struktur: s, orte: [] }
  const themen = mitThemen(s)
  const index = Math.max(0, Math.min(ziel.index, thema.elements.length))
  themen[ziel.thema].elements.splice(index, 0, ...bloecke.map((b) => kopie(b)))
  return { struktur: { ...s, chapters: themen }, orte: bloecke.map((_, i) => ({ thema: ziel.thema, block: index + i })) }
}

/**
 * Ziel für „eine Stelle nach oben/unten“ (Alt + Pfeil), auch über Themengrenzen.
 * `null`, wenn es am Rand nicht weiter geht.
 */
export function eineStelle(s: Struktur, orte: Ort[], richtung: 1 | -1): Ziel | null {
  const geordnet = ordneOrte(s, orte)
  if (geordnet.length === 0) return null
  if (richtung === -1) {
    const erster = geordnet[0]
    if (erster.block > 0) return { thema: erster.thema, index: erster.block - 1 }
    if (erster.thema > 0) return { thema: erster.thema - 1, index: s.chapters[erster.thema - 1].elements.length }
    return null
  }
  const letzter = geordnet[geordnet.length - 1]
  const anzahl = s.chapters[letzter.thema].elements.length
  if (letzter.block < anzahl - 1) return { thema: letzter.thema, index: letzter.block + 2 }
  if (letzter.thema < s.chapters.length - 1) return { thema: letzter.thema + 1, index: 0 }
  return null
}

/** Die Blöcke an den Orten, in Lesereihenfolge (tiefe Kopien) */
export function bloeckeAn(s: Struktur, orte: Ort[]): Block[] {
  return ordneOrte(s, orte).map((o) => kopie(s.chapters[o.thema].elements[o.block]))
}

/** Trennt Blöcke, die das Material kennt, von solchen, die es nicht kennt (anderer Typ-Umfang) */
export function passendeBloecke(bloecke: Block[]): { passend: Block[]; ausgelassen: number } {
  const passend = bloecke.filter((b) => !!b && typeof b.type === 'string' && istBekannterTyp(b.type))
  return { passend, ausgelassen: bloecke.length - passend.length }
}

const BILD_PFAD = /images\/[A-Za-z0-9_][A-Za-z0-9_.-]*\.(?:png|jpe?g|webp|gif)/g

/** Alle Bildnamen, die in den Blöcken (oder in beliebig verschachteltem JSON) vorkommen */
export function bildPfadeIn(bloecke: unknown): string[] {
  return [...new Set(JSON.stringify(bloecke).match(BILD_PFAD) ?? [])]
}

/** Ersetzt Bildnamen; was nicht in der Zuordnung steht, bleibt */
export function ersetzeBildPfade<T>(bloecke: T, zuordnung: Record<string, string>): T {
  const text = JSON.stringify(bloecke).replace(BILD_PFAD, (p) => zuordnung[p] ?? p)
  return JSON.parse(text) as T
}

/** „3 Blöcke“ / „1 Block“ */
export function blockZahl(n: number): string {
  return n === 1 ? '1 Block' : `${n} Blöcke`
}

/** Eingefügter Fremdtext als Lehrtext-Block: nur Text, nie Auszeichnung (Absätze bleiben erhalten) */
export function textAlsBlock(text: string): Block | null {
  const sauber = text.replace(/\r/g, '').replace(/\u0000/g, '').trim().slice(0, 20_000)
  if (!sauber) return null
  const maskiert = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
  const absaetze = sauber.split(/\n{2,}/).map((a) => `<p>${maskiert(a.trim()).replace(/\n/g, '<br>')}</p>`)
  return { type: 'text', content: absaetze.join('') }
}

/**
 * Übernommene Inhalte einsetzen (PROJ-108) — ein Schritt für Rückgängig:
 *  - Blöcke kommen an `ziel` (Thema und Position). Ohne `ziel` (es gibt kein Thema) entsteht ein neues Thema 1.
 *  - Ganze Themen kommen als neue Themen hinter das Thema, in dem die Blöcke gelandet sind
 *    (sonst hinter `ziel.thema`, sonst ans Ende).
 * Liefert die Orte der eingesetzten Blöcke und die Nummern der neuen Themen.
 */
export function setzeUebernahmeEin(
  s: Struktur,
  ziel: Ziel | null,
  themen: Thema[],
  bloecke: Block[],
): { struktur: Struktur; orte: Ort[]; themaIndizes: number[] } {
  let n = s
  let orte: Ort[] = []
  let blockThema = ziel && s.chapters[ziel.thema] ? ziel.thema : -1
  if (bloecke.length > 0) {
    if (blockThema < 0) {
      // Kein gültiges Ziel: ans Ende des letzten Themas, ohne Thema in ein neues Thema 1
      if (n.chapters.length === 0) n = { ...n, chapters: [{ title: 'Kapitel 1', elements: [] }] }
      blockThema = n.chapters.length - 1
      const r = fuegeBloeckeEin(n, { thema: blockThema, index: n.chapters[blockThema].elements.length }, bloecke)
      n = r.struktur
      orte = r.orte
    } else {
      const r = fuegeBloeckeEin(n, ziel as Ziel, bloecke)
      n = r.struktur
      orte = r.orte
    }
  }
  const themaIndizes: number[] = []
  if (themen.length > 0) {
    const nach = blockThema >= 0 ? blockThema : n.chapters.length - 1
    const kapitel = [...n.chapters]
    kapitel.splice(nach + 1, 0, ...themen.map((t) => kopie(t)))
    n = { ...n, chapters: kapitel }
    themen.forEach((_, i) => themaIndizes.push(nach + 1 + i))
  }
  return { struktur: n, orte, themaIndizes }
}
