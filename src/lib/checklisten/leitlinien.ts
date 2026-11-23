import daten from './daten/leitlinien.json'
import { findeAnker, setzeLeitlinie, type Block } from './setzer'
import type { AnkerKarte, OriginalAnsicht } from './leitlinien-typen'
import type { Checkliste } from './liste'

/**
 * Momentaufnahme der Leitlinien (PROJ-122), erzeugt mit
 * `python3 scripts/leitlinien-momentaufnahme.py`. Wird nur auf dem Server
 * gelesen und gesetzt; die ganze Sammlung landet nie im Browser-Paket.
 */
export interface Leitlinie {
  kennung: string
  bereich: string
  stand: string | null
  text: string
  pruefsumme: string
}

const NORMEN = (daten as { normen: Leitlinie[] }).normen

export function findeLeitlinie(kennung: string): Leitlinie | null {
  return NORMEN.find((n) => n.kennung === kennung) ?? null
}

/** Gesetzte Originale zu einer Liste plus „Schritt/Hinweis → Block“ für „Im Original ansehen“ */
export function originalFuerListe(liste: Checkliste): {
  originale: OriginalAnsicht[]
  anker: AnkerKarte
} {
  const originale: OriginalAnsicht[] = []
  const gesetzt = new Map<string, Block[]>()
  for (const q of liste.quellen) {
    const l = findeLeitlinie(q.leitlinie)
    if (!l) continue
    const bloecke = setzeLeitlinie(l.text, q.ueberschriften)
    gesetzt.set(q.schluessel, bloecke)
    originale.push({
      schluessel: q.schluessel,
      titel: l.kennung,
      bereich: l.bereich,
      stand: l.stand,
      geaendert: l.pruefsumme !== q.pruefsumme,
      bloecke,
    })
  }
  const anker: AnkerKarte = {}
  for (const element of [...liste.schritte, ...liste.hinweise]) {
    if (!element.anker) continue
    const bloecke = gesetzt.get(element.anker.quelle)
    const block = bloecke ? findeAnker(bloecke, element.anker.text) : null
    if (block) anker[element.id] = { quelle: element.anker.quelle, block }
  }
  return { originale, anker }
}
