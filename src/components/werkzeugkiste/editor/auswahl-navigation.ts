import type { Auswahl } from '@/components/werkzeugkiste/editor/editor-gliederung'
import type { Struktur } from '@/lib/werkzeugkiste-editor'

/**
 * Reihenfolge, in der Pfeil hoch/runter durch die Seite läuft (PROJ-101):
 * Thema 1, seine Blöcke, Thema 2, … bis zur Lernzielkontrolle. Das Deckblatt gehört nicht
 * dazu, solange die Vorschau es nicht markiert (es hätte dort keinen sichtbaren Rahmen).
 */
export function auswahlReihenfolge(struktur: Struktur): Exclude<Auswahl, null>[] {
  const liste: Exclude<Auswahl, null>[] = []
  struktur.chapters.forEach((t, thema) => {
    liste.push({ art: 'thema', thema })
    t.elements.forEach((_, block) => liste.push({ art: 'block', thema, block }))
  })
  if (struktur.final_chapter) liste.push({ art: 'abschluss' })
  return liste
}

function gleich(a: Auswahl, b: Exclude<Auswahl, null>): boolean {
  if (!a || a.art !== b.art) return false
  if (a.art === 'thema' && b.art === 'thema') return a.thema === b.thema
  if (a.art === 'block' && b.art === 'block') return a.thema === b.thema && a.block === b.block
  return true
}

/** Nächste (richtung 1) bzw. vorige (−1) Stelle; ohne Auswahl die erste bzw. letzte; am Rand bleibt es bei der Auswahl */
export function nachbarAuswahl(auswahl: Auswahl, struktur: Struktur, richtung: 1 | -1): Auswahl {
  const liste = auswahlReihenfolge(struktur)
  if (liste.length === 0) return auswahl
  const pos = liste.findIndex((x) => gleich(auswahl, x))
  if (pos < 0) {
    // Deckblatt oder nichts gewählt: nach unten die erste Stelle, nach oben bleibt alles
    if (auswahl?.art === 'deckblatt') return richtung === 1 ? liste[0] : auswahl
    return richtung === 1 ? liste[0] : liste[liste.length - 1]
  }
  const ziel = pos + richtung
  return ziel < 0 || ziel >= liste.length ? auswahl : liste[ziel]
}
