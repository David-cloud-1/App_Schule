import { grundMitte, tiefe } from './betrieb-welt'
import type { BetriebSprite } from './betrieb-sprites'

/**
 * Welches gesetzte Item liegt unter einem Antipp-Punkt? (PROJ-34)
 *
 * Sprites sind höher als eine Kachel (Gebäude, Bäume). Wer aufs Dach tippt,
 * meint das Gebäude, nicht die Kachel dahinter. Deshalb zählt die Sprite-Fläche,
 * leicht eingezogen (Sprites haben transparente Ränder), und das vorderste
 * Item gewinnt.
 */

export interface TrefferItem {
  id: string
  x: number
  y: number
  sprite: Pick<BetriebSprite, 'w' | 'h' | 'bottom' | 'skala'>
}

const RAND_SEITE = 0.18
const RAND_OBEN = 0.08
const RAND_UNTEN = 0.12

export function spriteFlaeche(i: TrefferItem): { left: number; top: number; right: number; bottom: number } {
  const m = grundMitte(i.x, i.y)
  const w = i.sprite.w * i.sprite.skala
  const h = i.sprite.h * i.sprite.skala
  const left = m.x - w / 2
  const top = m.y + i.sprite.bottom * i.sprite.skala - h
  return {
    left: left + w * RAND_SEITE,
    right: left + w * (1 - RAND_SEITE),
    top: top + h * RAND_OBEN,
    bottom: top + h * (1 - RAND_UNTEN),
  }
}

export function itemAnPunkt(items: TrefferItem[], wx: number, wy: number): string | null {
  const treffer = items
    .filter((i) => {
      const f = spriteFlaeche(i)
      return wx >= f.left && wx <= f.right && wy >= f.top && wy <= f.bottom
    })
    // vorderstes zuerst
    .sort((a, b) => tiefe(b.x + 1, b.y + 1) - tiefe(a.x + 1, a.y + 1))
  return treffer[0]?.id ?? null
}
