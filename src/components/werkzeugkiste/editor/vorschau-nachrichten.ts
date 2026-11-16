import type { Auswahl } from '@/components/werkzeugkiste/editor/editor-gliederung'

/**
 * Nachrichten der Editor-Vorschau an die App (PROJ-101).
 *
 * Die Seite läuft abgeschottet und darf der App nur **Wünsche** schicken. Diese Datei
 * liest eine eingehende Nachricht streng und macht daraus einen Wunsch – oder `null`,
 * wenn irgendetwas nicht stimmt. Ob der Wunsch dann auch ausgeführt wird (Vorschau
 * aktuell, Block existiert, nicht schreibgeschützt), entscheidet die App.
 */

/** Gültige Marke: Deckblatt, Thema (k0), Block (k0-e3) oder Lernzielkontrolle (abschluss) */
const MARKE_ANNAHME = /^(deckblatt|k\d+(-e\d+)?|abschluss(-[a-z_]+)?)$/

/** Aus der Marke aus der Vorschau wird eine Auswahl im Editor; alles Fremde ergibt null */
export function auswahlAusMarke(marke: unknown): Auswahl {
  if (typeof marke !== 'string' || marke.length > 40 || !MARKE_ANNAHME.test(marke)) return null
  if (marke === 'deckblatt') return { art: 'deckblatt' }
  if (marke.startsWith('abschluss')) return { art: 'abschluss' }
  const m = /^k(\d+)(?:-e(\d+))?$/.exec(marke)
  if (!m) return null
  return m[2] === undefined ? { art: 'thema', thema: Number(m[1]) } : { art: 'block', thema: Number(m[1]), block: Number(m[2]) }
}

/** Typen der Schnellauswahl im leeren Thema – nur diese darf die Seite wünschen */
export const SCHNELLE_TYPEN = ['text', 'image', 'multiple_choice', 'fill_blanks', 'drag_drop', 'accordion'] as const

/** Die wenigen Tasten, die die Seite an die App weitergibt (sonst käme nichts an, solange die Seite den Fokus hat) */
export const WEITERGABE_TASTEN = ['ArrowUp', 'ArrowDown', 'Enter', 'Delete', 'Backspace', 'Escape', 'd', 'e', 'z', 'b', 'c', 'x', 'v'] as const
export type WeitergabeTaste = (typeof WEITERGABE_TASTEN)[number]

export interface Taste {
  key: WeitergabeTaste
  /** ⌘ oder Strg */
  mod: boolean
  shift: boolean
  alt: boolean
}

export type VorschauWunsch =
  | { art: 'waehle'; marke: string }
  | { art: 'abwaehlen' }
  | { art: 'bearbeite'; marke: string }
  | { art: 'einfuegen'; marke: string }
  | { art: 'loesche'; marke: string }
  | { art: 'dupliziere'; marke: string }
  | { art: 'menue'; marke: string; x: number; y: number }
  | { art: 'schnell'; marke: string; typ: (typeof SCHNELLE_TYPEN)[number] }
  | { art: 'mehr'; marke: string; wie: 'umschalten' | 'bereich' }
  | { art: 'lege'; marke: string; wo: 'vor' | 'nach' | 'anfang' }
  | { art: 'legeThema'; marke: string }
  | { art: 'kopiere'; marke: string }
  | { art: 'neuesThema' }
  | { art: 'taste'; taste: Taste }

function marke(wert: unknown): string | null {
  return auswahlAusMarke(wert) ? (wert as string) : null
}

function zahl(wert: unknown): number | null {
  return typeof wert === 'number' && Number.isFinite(wert) && Math.abs(wert) < 100_000 ? wert : null
}

/** Liest eine Nachricht aus der Vorschau; `null` heißt „gehört nicht zu uns oder ist ungültig“ */
export function liesWunsch(daten: unknown): VorschauWunsch | null {
  if (!daten || typeof daten !== 'object') return null
  const n = daten as Record<string, unknown>

  if (typeof n.wkWaehle === 'string') {
    const m = marke(n.wkWaehle)
    return m ? { art: 'waehle', marke: m } : null
  }
  if (n.wkAbwaehle === true) return { art: 'abwaehlen' }
  if (typeof n.wkBearbeite === 'string') {
    const m = marke(n.wkBearbeite)
    return m ? { art: 'bearbeite', marke: m } : null
  }
  if (typeof n.wkEinfuegen === 'string') {
    const m = marke(n.wkEinfuegen)
    return m ? { art: 'einfuegen', marke: m } : null
  }
  if (typeof n.wkLoesche === 'string') {
    const m = marke(n.wkLoesche)
    return m ? { art: 'loesche', marke: m } : null
  }
  if (typeof n.wkDupliziere === 'string') {
    const m = marke(n.wkDupliziere)
    return m ? { art: 'dupliziere', marke: m } : null
  }
  if (typeof n.wkMenue === 'string') {
    const m = marke(n.wkMenue)
    const x = zahl(n.x)
    const y = zahl(n.y)
    return m && x !== null && y !== null ? { art: 'menue', marke: m, x, y } : null
  }
  if (typeof n.wkSchnell === 'string') {
    const m = marke(n.wkSchnell)
    const typ = (SCHNELLE_TYPEN as readonly unknown[]).includes(n.typ) ? (n.typ as (typeof SCHNELLE_TYPEN)[number]) : null
    return m && typ ? { art: 'schnell', marke: m, typ } : null
  }
  if (typeof n.wkMehr === 'string') {
    const m = marke(n.wkMehr)
    return m && /^k\d+-e\d+$/.test(m) && (n.wie === 'umschalten' || n.wie === 'bereich') ? { art: 'mehr', marke: m, wie: n.wie } : null
  }
  if (typeof n.wkLege === 'string') {
    const m = marke(n.wkLege)
    const wo = n.wo === 'vor' || n.wo === 'nach' || n.wo === 'anfang' ? n.wo : null
    if (!m || !wo) return null
    // „anfang“ gehört einem Thema, „vor/nach“ einem Block
    if (wo === 'anfang' ? !/^k\d+$/.test(m) : !/^k\d+-e\d+$/.test(m)) return null
    return { art: 'lege', marke: m, wo }
  }
  if (typeof n.wkLegeThema === 'string') {
    // Ziel eines Themas: vor einem anderen Thema oder ans Ende (vor die Lernzielkontrolle)
    return n.wkLegeThema === 'abschluss' || (n.wkLegeThema.length <= 12 && /^k\d+$/.test(n.wkLegeThema)) ? { art: 'legeThema', marke: n.wkLegeThema } : null
  }
  if (typeof n.wkKopiere === 'string') {
    const m = marke(n.wkKopiere)
    return m && /^k\d+-e\d+$/.test(m) ? { art: 'kopiere', marke: m } : null
  }
  if (n.wkThemaNeu === true) return { art: 'neuesThema' }
  if (typeof n.wkTaste === 'string') {
    const key = (WEITERGABE_TASTEN as readonly string[]).includes(n.wkTaste) ? (n.wkTaste as WeitergabeTaste) : null
    return key ? { art: 'taste', taste: { key, mod: n.mod === true, shift: n.shift === true, alt: n.alt === true } } : null
  }
  return null
}
