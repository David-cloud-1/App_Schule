import { EIGEN_MAX_BYTES, EIGEN_MAX_SEITE_PX } from '@/lib/werkzeugkiste-bilder'

/**
 * Bildbearbeitung im Browser (PROJ-92): öffnen, drehen, zuschneiden, verkleinern.
 * Das Original verlässt den Browser nie – hochgeladen wird nur das fertige Ergebnis.
 * Die Rechenteile (Größen, Ausschnitt, Transparenz) sind reine Funktionen und getestet;
 * Leinwand-Teile brauchen einen echten Browser.
 */

/** Die Arbeitskopie zum Drehen und Zuschneiden: größer als das Ergebnis, kleiner als ein Handyfoto */
export const ARBEITSKOPIE_PX = 2400
/** Kleinster Ausschnitt (in Bildpunkten des Originals); darunter wäre das Ergebnis unbrauchbar */
export const MIN_AUSSCHNITT_PX = 32

export interface Ausschnitt {
  x: number
  y: number
  breite: number
  hoehe: number
}

export const ERLAUBTE_TYPEN = ['image/png', 'image/jpeg', 'image/webp']
const ENDUNG = /\.(png|jpe?g|webp)$/i

/** Ist die Datei nach Typ (oder, wenn der Browser keinen nennt, nach Endung) ein erlaubtes Bildformat? */
export function formatErlaubt(datei: { type: string; name: string }): boolean {
  return ERLAUBTE_TYPEN.includes(datei.type) || (datei.type === '' && ENDUNG.test(datei.name))
}

/** Auf die längste Seite `max` verkleinern, nie vergrößern; Seitenverhältnis bleibt */
export function begrenzteGroesse(breite: number, hoehe: number, max: number): { breite: number; hoehe: number } {
  const faktor = Math.min(1, max / Math.max(breite, hoehe))
  return { breite: Math.max(1, Math.round(breite * faktor)), hoehe: Math.max(1, Math.round(hoehe * faktor)) }
}

/**
 * Den auf dem Bildschirm gezeichneten Rahmen (in angezeigten Pixeln) auf Bildpunkte
 * des Bildes umrechnen und in das Bild hinein begrenzen.
 */
export function ausschnittAufBild(
  rahmen: { x: number; y: number; width: number; height: number },
  angezeigt: { breite: number; hoehe: number },
  bild: { breite: number; hoehe: number },
): Ausschnitt {
  const fx = bild.breite / angezeigt.breite
  const fy = bild.hoehe / angezeigt.hoehe
  const x = Math.max(0, Math.min(bild.breite - 1, Math.round(rahmen.x * fx)))
  const y = Math.max(0, Math.min(bild.hoehe - 1, Math.round(rahmen.y * fy)))
  return {
    x,
    y,
    breite: Math.max(1, Math.min(bild.breite - x, Math.round(rahmen.width * fx))),
    hoehe: Math.max(1, Math.min(bild.hoehe - y, Math.round(rahmen.height * fy))),
  }
}

export const ausschnittZuKlein = (a: Ausschnitt) => a.breite < MIN_AUSSCHNITT_PX || a.hoehe < MIN_AUSSCHNITT_PX

/** Hat das Bild (RGBA-Bytes) durchsichtige Stellen? Prüft jeden vierten Bildpunkt – das genügt für Logos und Ausschnitte */
export function hatTransparenz(rgba: Uint8ClampedArray | Uint8Array): boolean {
  for (let i = 3; i < rgba.length; i += 16) if (rgba[i] < 250) return true
  return false
}

/** `data:image/jpeg;base64,…` → Blob (ohne fetch, damit keine Browser-Sicherheitsregel für data:-Adressen stört) */
export function dataAdresseZuBlob(adresse: string): Blob | null {
  const m = /^data:([a-z/+.-]+);base64,([A-Za-z0-9+/=]+)$/i.exec(adresse)
  if (!m) return null
  const roh = atob(m[2])
  const bytes = new Uint8Array(roh.length)
  for (let i = 0; i < roh.length; i++) bytes[i] = roh.charCodeAt(i)
  return new Blob([bytes], { type: m[1] })
}

// ── Leinwand-Teile (nur im Browser) ─────────────────────────────────────────

export const BILD_OEFFNEN_FEHLER = 'Dieses Bild lässt sich nicht öffnen. Versuche ein anderes.'

type Quelle = CanvasImageSource & { width: number; height: number }

async function dekodiere(blob: Blob): Promise<Quelle> {
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(blob, { imageOrientation: 'from-image' })
    } catch {
      // weiter mit dem Bildelement
    }
  }
  const url = URL.createObjectURL(blob)
  try {
    const bild = new Image()
    bild.src = url
    await bild.decode()
    return bild
  } finally {
    URL.revokeObjectURL(url)
  }
}

function leinwand(breite: number, hoehe: number): HTMLCanvasElement {
  const c = document.createElement('canvas')
  c.width = breite
  c.height = hoehe
  return c
}

/** Datei öffnen, nach EXIF-Drehung ausrichten und auf die Arbeitskopie verkleinern */
export async function arbeitskopie(blob: Blob): Promise<HTMLCanvasElement> {
  let quelle: Quelle
  try {
    quelle = await dekodiere(blob)
  } catch {
    throw new Error(BILD_OEFFNEN_FEHLER)
  }
  const { breite, hoehe } = begrenzteGroesse(quelle.width, quelle.height, ARBEITSKOPIE_PX)
  const c = leinwand(breite, hoehe)
  const ctx = c.getContext('2d')
  if (!ctx) throw new Error(BILD_OEFFNEN_FEHLER)
  ctx.drawImage(quelle, 0, 0, breite, hoehe)
  if ('close' in quelle && typeof quelle.close === 'function') quelle.close()
  return c
}

/** Um 90° drehen: `1` nach rechts, `-1` nach links */
export function drehe(c: HTMLCanvasElement, richtung: 1 | -1): HTMLCanvasElement {
  const neu = leinwand(c.height, c.width)
  const ctx = neu.getContext('2d')
  if (!ctx) return c
  ctx.translate(neu.width / 2, neu.height / 2)
  ctx.rotate((richtung * Math.PI) / 2)
  ctx.drawImage(c, -c.width / 2, -c.height / 2)
  return neu
}

export const alsBlob = (c: HTMLCanvasElement, typ: string, qualitaet?: number) =>
  new Promise<Blob | null>((ok) => c.toBlob(ok, typ, qualitaet))

export interface Ergebnis {
  blob: Blob
  typ: 'jpg' | 'png'
  breite: number
  hoehe: number
}

/**
 * Das fertige Bild: Ausschnitt, höchstens 1 800 px an der längsten Seite, JPEG (oder PNG, wenn
 * die Quelle durchsichtige Stellen hat). Wird die Datei größer als erlaubt, geht es schrittweise kleiner.
 */
export async function erzeugeErgebnis(
  c: HTMLCanvasElement,
  ausschnitt: Ausschnitt | null,
  transparenzMoeglich: boolean,
): Promise<Ergebnis> {
  const a = ausschnitt ?? { x: 0, y: 0, breite: c.width, hoehe: c.height }
  let ziel = begrenzteGroesse(a.breite, a.hoehe, EIGEN_MAX_SEITE_PX)
  let png: boolean | null = null
  for (let versuch = 0; versuch < 8; versuch++) {
    const z = leinwand(ziel.breite, ziel.hoehe)
    const ctx: CanvasRenderingContext2D | null = z.getContext('2d', { willReadFrequently: png === null })
    if (!ctx) break
    if (png === false) {
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, z.width, z.height)
    }
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(c, a.x, a.y, a.breite, a.hoehe, 0, 0, z.width, z.height)
    if (png === null) {
      png = transparenzMoeglich && hatTransparenz(ctx.getImageData(0, 0, z.width, z.height).data)
      if (!png) {
        // Jetzt mit weißem Grund neu zeichnen (JPEG kennt keine Durchsichtigkeit)
        ctx.globalCompositeOperation = 'destination-over'
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, z.width, z.height)
      }
    }
    const blob = await alsBlob(z, png ? 'image/png' : 'image/jpeg', versuch < 2 ? 0.86 : 0.72)
    if (blob && blob.size <= EIGEN_MAX_BYTES) {
      return { blob, typ: png ? 'png' : 'jpg', breite: z.width, hoehe: z.height }
    }
    ziel = begrenzteGroesse(ziel.breite * 0.8, ziel.hoehe * 0.8, 100_000)
  }
  throw new Error('Das Bild ist zu groß für dieses Gerät oder diese Seite. Wähle ein kleineres Bild oder einen kleineren Ausschnitt.')
}
