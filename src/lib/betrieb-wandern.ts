/**
 * Wandern auf dem Kachelgitter (PROJ-37) — reine, deterministische Rechnung
 * ohne Browser. Figuren gehen von Kachel zu Kachel (vier Richtungen) über freie
 * Felder, halten zwischendurch an, weichen belegten Kacheln aus und bleiben im
 * Land. Gleicher Startwert + gleiche Aufrufe = gleicher Ablauf (testbar).
 */

export type Richtung = 'se' | 'sw' | 'ne' | 'nw'

export interface Wanderer {
  id: string
  /** Aktuelle Position in Kachelkoordinaten (Bruchteile während des Gehens). */
  x: number
  y: number
  /** Zielkachel des laufenden Schritts; gleich der Position, wenn die Figur steht. */
  zielX: number
  zielY: number
  /** Restliche Wartezeit in ms. */
  pause: number
  richtung: Richtung
  /** Gehphase 0/1 für die Beinstellung. */
  phase: 0 | 1
  /** Zufallszustand (mulberry32). */
  rng: number
  /** Optionale Heimat: Gäste/Personal bleiben in der Nähe ihres Gebäudes. */
  heimat?: { x: number; y: number; radius: number }
}

/** Kacheln pro Sekunde. */
export const GESCHWINDIGKEIT = 0.42
export const PAUSE_MIN = 700
export const PAUSE_MAX = 3200

export function zufall(zustand: number): { wert: number; zustand: number } {
  let t = (zustand + 0x6d2b79f5) >>> 0
  const next = t
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  return { wert: ((t ^ (t >>> 14)) >>> 0) / 4294967296, zustand: next }
}

export function schluessel(x: number, y: number): string {
  return `${x},${y}`
}

const NACHBARN: [number, number, Richtung][] = [
  [1, 0, 'se'],
  [0, 1, 'sw'],
  [-1, 0, 'nw'],
  [0, -1, 'ne'],
]

export function istFrei(x: number, y: number, seite: number, blockiert: ReadonlySet<string>): boolean {
  return x >= 0 && y >= 0 && x < seite && y < seite && !blockiert.has(schluessel(x, y))
}

function ziehe(w: Wanderer): number {
  const r = zufall(w.rng)
  w.rng = r.zustand
  return r.wert
}

/** Nächste freie Kachel (Breitensuche) – für Figuren, deren Kachel plötzlich belegt wurde. */
export function naechsteFreieKachel(
  vonX: number,
  vonY: number,
  seite: number,
  blockiert: ReadonlySet<string>,
): { x: number; y: number } | null {
  const gesehen = new Set([schluessel(vonX, vonY)])
  let rand: [number, number][] = [[vonX, vonY]]
  while (rand.length > 0) {
    const neu: [number, number][] = []
    for (const [x, y] of rand) {
      for (const [dx, dy] of NACHBARN) {
        const nx = x + dx
        const ny = y + dy
        const k = schluessel(nx, ny)
        if (nx < 0 || ny < 0 || nx >= seite || ny >= seite || gesehen.has(k)) continue
        gesehen.add(k)
        if (!blockiert.has(k)) return { x: nx, y: ny }
        neu.push([nx, ny])
      }
    }
    rand = neu
  }
  return null
}

/** Eine zufällige freie Startkachel (Figuren erscheinen nie auf belegten Feldern). */
export function waehleStart(
  id: string,
  seed: number,
  seite: number,
  blockiert: ReadonlySet<string>,
  heimat?: Wanderer['heimat'],
): Wanderer | null {
  const frei: { x: number; y: number }[] = []
  for (let y = 0; y < seite; y++) for (let x = 0; x < seite; x++) {
    if (!blockiert.has(schluessel(x, y))) frei.push({ x, y })
  }
  if (frei.length === 0) return null
  const w: Wanderer = { id, x: 0, y: 0, zielX: 0, zielY: 0, pause: 0, richtung: 'se', phase: 0, rng: seed, heimat }
  // In der Nähe der Heimat starten, sonst irgendwo.
  const kandidaten = heimat
    ? frei.filter((k) => Math.abs(k.x - heimat.x) + Math.abs(k.y - heimat.y) <= heimat.radius)
    : frei
  const liste = kandidaten.length > 0 ? kandidaten : frei
  const wahl = liste[Math.floor(ziehe(w) * liste.length) % liste.length]!
  w.x = w.zielX = wahl.x
  w.y = w.zielY = wahl.y
  w.pause = PAUSE_MIN + ziehe(w) * (PAUSE_MAX - PAUSE_MIN)
  return w
}

function waehleZiel(w: Wanderer, seite: number, blockiert: ReadonlySet<string>): void {
  const frei = NACHBARN.filter(([dx, dy]) => istFrei(w.zielX + dx, w.zielY + dy, seite, blockiert))
  if (frei.length === 0) {
    w.pause = PAUSE_MIN
    return
  }
  // Gäste/Personal: Schritte weg von der Heimat sind unwahrscheinlicher, jenseits des Radius ausgeschlossen.
  let kandidaten = frei
  if (w.heimat) {
    const h = w.heimat
    const innen = frei.filter(([dx, dy]) => Math.abs(w.zielX + dx - h.x) + Math.abs(w.zielY + dy - h.y) <= h.radius)
    if (innen.length > 0) kandidaten = innen
    else {
      // zu weit weg: näher an die Heimat
      kandidaten = [...frei].sort(
        (a, b) =>
          Math.abs(w.zielX + a[0] - h.x) + Math.abs(w.zielY + a[1] - h.y) -
          (Math.abs(w.zielX + b[0] - h.x) + Math.abs(w.zielY + b[1] - h.y)),
      ).slice(0, 1)
    }
  }
  const [dx, dy, richtung] = kandidaten[Math.floor(ziehe(w) * kandidaten.length) % kandidaten.length]!
  w.zielX += dx
  w.zielY += dy
  w.richtung = richtung
}

/**
 * Ein Zeitschritt. Verändert `w` und gibt es zurück. `blockiert` enthält die von
 * Items belegten Kacheln und wird bei jedem Aufruf frisch übergeben – so weichen
 * Figuren sofort aus, wenn der Azubi etwas setzt.
 */
export function schritt(w: Wanderer, dtMs: number, seite: number, blockiert: ReadonlySet<string>): Wanderer {
  const dt = Math.min(dtMs, 250) // nie große Sprünge nach Tab-Wechsel o. Ä.

  // Steht auf einer Kachel, die inzwischen belegt ist (oder außerhalb liegt): zur nächsten freien gehen.
  const kx = Math.round(w.x)
  const ky = Math.round(w.y)
  if (!istFrei(kx, ky, seite, blockiert) && w.x === w.zielX && w.y === w.zielY) {
    const ziel = naechsteFreieKachel(kx, ky, seite, blockiert)
    if (ziel) {
      w.zielX = ziel.x
      w.zielY = ziel.y
    }
  }
  // Das Ziel selbst wurde belegt: neues Ziel suchen.
  if ((w.zielX !== w.x || w.zielY !== w.y) && !istFrei(w.zielX, w.zielY, seite, blockiert)) {
    w.zielX = Math.round(w.x)
    w.zielY = Math.round(w.y)
    w.pause = 0
  }

  if (w.x === w.zielX && w.y === w.zielY) {
    w.pause -= dt
    if (w.pause > 0) return w
    waehleZiel(w, seite, blockiert)
    w.pause = PAUSE_MIN + ziehe(w) * (PAUSE_MAX - PAUSE_MIN)
    if (w.x === w.zielX && w.y === w.zielY) return w
    w.pause = 0
  }

  const dx = w.zielX - w.x
  const dy = w.zielY - w.y
  const rest = Math.hypot(dx, dy)
  const weite = (GESCHWINDIGKEIT * dt) / 1000
  if (weite >= rest) {
    w.x = w.zielX
    w.y = w.zielY
    w.pause = PAUSE_MIN + ziehe(w) * (PAUSE_MAX - PAUSE_MIN)
    w.phase = 0
  } else {
    w.x += (dx / rest) * weite
    w.y += (dy / rest) * weite
    // Beinstellung wechselt alle ca. 0,18 Kacheln
    w.phase = Math.floor((Math.abs(w.x) + Math.abs(w.y)) / 0.18) % 2 === 0 ? 0 : 1
  }
  return w
}

export function laeuft(w: Wanderer): boolean {
  return w.x !== w.zielX || w.y !== w.zielY
}
