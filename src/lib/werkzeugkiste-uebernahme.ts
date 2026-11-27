/**
 * „Aus Material übernehmen“ (PROJ-108) — Typen und reine Funktionen, von Dialog und Server geteilt.
 * Der Browser nennt nur **Verweise** (Quelle und Nummern), nie Inhalte (Grundsatz G1): Welche Blöcke
 * das sind, liest der Server selbst aus der Quelle.
 */

import {
  istBekannterTyp,
  kopie,
  kurzzeile,
  typName,
  type Block,
  type Struktur,
  type Thema,
} from '@/lib/werkzeugkiste-editor'

/** Eigenes Material oder Eintrag im Regal (Kennung der Freigabe, nicht des Materials) */
export type QuelleArt = 'eigen' | 'regal'
export interface QuelleRef {
  art: QuelleArt
  id: string
}

/** So viel darf eine Übernahme höchstens enthalten */
export const UEBERNAHME_MAX_BLOECKE = 200
export const UEBERNAHME_MAX_THEMEN = 40
export const UEBERNAHME_MAX_BYTES = 1_500_000

export interface GliederungBlock {
  typ: string
  name: string
  kurz: string
  /** Kennt das Ziel diesen Typ? Sonst wird er beim Übernehmen ausgelassen */
  passt: boolean
}

export interface GliederungThema {
  titel: string
  bloecke: GliederungBlock[]
}

export interface Gliederung {
  titel: string
  werkzeug: string
  themen: GliederungThema[]
  /** Fragen der Lernzielkontrolle (einzeln als Aufgaben übernehmbar) */
  fragen: GliederungBlock[]
  /** Nur bei Regal-Quellen: „Titel, Lehrkraft“ für den Herkunftsvermerk */
  herkunft?: string
}

/** Was gewählt ist: ganze Themen, einzelne Blöcke, einzelne Fragen der Lernzielkontrolle */
export interface UebernahmeAuswahl {
  themen: number[]
  bloecke: { thema: number; block: number }[]
  fragen: number[]
}

function zeile(block: Block): GliederungBlock {
  return { typ: block.type, name: typName(block.type), kurz: kurzzeile(block), passt: istBekannterTyp(block.type) }
}

/** Die Fragen der Lernzielkontrolle als Blöcke (leer, wenn es keine gibt) */
export function abschlussFragen(s: Struktur): Block[] {
  const qs = s.final_chapter?.question_set
  const liste = qs && typeof qs === 'object' ? (qs as { questions?: unknown }).questions : undefined
  return Array.isArray(liste) ? liste.filter((f): f is Block => !!f && typeof f === 'object' && typeof (f as Block).type === 'string') : []
}

/** Gliederung für den Dialog: nur Titel, Typ und Kurzzeile, nie ganze Inhalte */
export function gliederungVon(s: Struktur): { themen: GliederungThema[]; fragen: GliederungBlock[] } {
  return {
    themen: s.chapters.map((t) => ({
      titel: typeof t.title === 'string' && t.title.trim() ? t.title : 'Ohne Titel',
      bloecke: t.elements.filter((b) => !!b && typeof b.type === 'string').map(zeile),
    })),
    fragen: abschlussFragen(s).map(zeile),
  }
}

export interface GewaehlteInhalte {
  themen: Thema[]
  bloecke: Block[]
  /** Blöcke, die das Ziel nicht kennt und die deshalb fehlen */
  ausgelassen: number
}

const ganz = (n: unknown): n is number => typeof n === 'number' && Number.isInteger(n) && n >= 0

/**
 * Liest die gewählten Inhalte aus der Struktur der Quelle (tiefe Kopien). Ganze Themen gewinnen:
 * Einzelne Blöcke aus einem ganz gewählten Thema zählen nicht doppelt. Stellen, die es nicht gibt,
 * und Typen, die das Ziel nicht kennt, werden ausgelassen. Reihenfolge: wie in der Quelle.
 */
export function waehleInhalte(s: Struktur, auswahl: UebernahmeAuswahl): GewaehlteInhalte {
  let ausgelassen = 0
  const themenIdx = [...new Set(auswahl.themen.filter(ganz))].filter((i) => !!s.chapters[i]).sort((a, b) => a - b)
  const themen: Thema[] = themenIdx.map((i) => {
    const t = s.chapters[i]
    const passend = t.elements.filter((b) => !!b && typeof b.type === 'string' && istBekannterTyp(b.type))
    ausgelassen += t.elements.length - passend.length
    return { ...kopie(t), elements: kopie(passend) }
  })

  const ganzeThemen = new Set(themenIdx)
  const orte = auswahl.bloecke
    .filter((o) => ganz(o.thema) && ganz(o.block) && !ganzeThemen.has(o.thema) && !!s.chapters[o.thema]?.elements[o.block])
    .sort((a, b) => a.thema - b.thema || a.block - b.block)
    .filter((o, i, alle) => i === 0 || o.thema !== alle[i - 1].thema || o.block !== alle[i - 1].block)
  const einzeln: Block[] = orte.map((o) => s.chapters[o.thema].elements[o.block])

  const fragen = abschlussFragen(s)
  const fragenIdx = [...new Set(auswahl.fragen.filter(ganz))].filter((i) => !!fragen[i]).sort((a, b) => a - b)
  einzeln.push(...fragenIdx.map((i) => fragen[i]))

  const passend = einzeln.filter((b) => !!b && typeof b.type === 'string' && istBekannterTyp(b.type))
  ausgelassen += einzeln.length - passend.length
  return { themen, bloecke: kopie(passend), ausgelassen }
}

/** Wie viel ist gewählt (Themen, Blöcke und Fragen zusammen, jedes Thema zählt als eines) */
export function auswahlZahl(a: UebernahmeAuswahl): number {
  return a.themen.length + a.bloecke.length + a.fragen.length
}

export function istLeer(a: UebernahmeAuswahl): boolean {
  return auswahlZahl(a) === 0
}

/** Kurzer Satz für die Fußzeile des Dialogs und den Hinweis danach */
export function auswahlText(themen: number, bloecke: number): string {
  const teile: string[] = []
  if (themen > 0) teile.push(themen === 1 ? '1 Kapitel' : `${themen} Kapitel`)
  if (bloecke > 0) teile.push(bloecke === 1 ? '1 Block' : `${bloecke} Blöcke`)
  return teile.join(' und ')
}

/** Mini-Struktur für die Vorschau: Deckblatt der Quelle plus nur das Gewählte */
export function miniStruktur(s: Struktur, inhalte: { themen: Thema[]; bloecke: Block[] }): Struktur {
  const kapitel: Thema[] = [...inhalte.themen]
  if (inhalte.bloecke.length > 0) kapitel.push({ title: 'Auswahl', elements: inhalte.bloecke })
  return { cover: kopie(s.cover), chapters: kapitel }
}
