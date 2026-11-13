import type { Auswahl } from '@/components/werkzeugkiste/editor/editor-gliederung'
import { auswahlAusMarke } from '@/components/werkzeugkiste/editor/vorschau-skript'
import type { Struktur } from '@/lib/werkzeugkiste-editor'

/**
 * „Wohin kommt der neue Block?“ (PROJ-97) – eine einzige Regel für alle Wege:
 * Leiste in der Gliederung, „+“ in der schmalen Leiste, Tastenkürzel, „+ Darunter“
 * in der Vorschau. Sie liest die Auswahl im Moment des Klicks, nie einen alten Wert.
 *
 *  - Block gewählt            → direkt dahinter
 *  - Thema gewählt            → am Ende dieses Themas
 *  - Deckblatt, Lernzielkontrolle oder nichts gewählt → am Ende des letzten Themas
 *  - es gibt kein Thema mehr  → `null`: Der Block kommt in ein neues Thema 1
 *    (angelegt wird es erst, wenn wirklich ein Block gewählt ist, nicht schon beim Öffnen des Katalogs)
 */
export type Einfuegeort = { thema: number; index: number }

export function einfuegeortAusAuswahl(auswahl: Auswahl, struktur: Struktur): Einfuegeort | null {
  const themen = struktur.chapters
  if (themen.length === 0) return null
  if (auswahl?.art === 'block') {
    const t = themen[auswahl.thema]
    if (t) return { thema: auswahl.thema, index: Math.min(auswahl.block + 1, t.elements.length) }
  }
  if (auswahl?.art === 'thema') {
    const t = themen[auswahl.thema]
    if (t) return { thema: auswahl.thema, index: t.elements.length }
  }
  const letztes = themen.length - 1
  return { thema: letztes, index: themen[letztes].elements.length }
}

/**
 * Stelle aus der Marke eines „+“-Klicks in der Vorschau: Block (`k0-e3`) → dahinter,
 * Thema (`k0`) → am Anfang des Themas. Alles andere (auch die Lernzielkontrolle, ungültige
 * Marken, Stellen, die es nicht mehr gibt) ergibt `undefined`.
 */
export function einfuegeortAusMarke(marke: unknown, struktur: Struktur): Einfuegeort | undefined {
  const a = auswahlAusMarke(marke)
  if (a?.art === 'thema') return struktur.chapters[a.thema] ? { thema: a.thema, index: 0 } : undefined
  if (a?.art === 'block') {
    const t = struktur.chapters[a.thema]
    return t && a.block < t.elements.length ? { thema: a.thema, index: a.block + 1 } : undefined
  }
  return undefined
}

/** Neues Thema direkt hinter dem Thema `nach`; ohne gültiges `nach` am Ende */
export function neuesThemaNach(s: Struktur, nach: number | null, titel = 'Neues Thema'): { struktur: Struktur; index: number } {
  const index = nach !== null && nach >= 0 && nach < s.chapters.length ? nach + 1 : s.chapters.length
  const themen = [...s.chapters]
  themen.splice(index, 0, { title: titel, elements: [] })
  return { struktur: { ...s, chapters: themen }, index }
}

/** Das Thema, hinter dem ein neues Thema stehen soll: das gewählte, sonst (bei einem Block) dessen Thema */
export function themaDerAuswahl(auswahl: Auswahl): number | null {
  return auswahl?.art === 'thema' || auswahl?.art === 'block' ? auswahl.thema : null
}
