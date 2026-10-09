/**
 * Figuren in „Mein Betrieb/Resort“ (PROJ-37): welche Tiere, Gäste und Arbeiter
 * erscheinen? Reine Regeln ohne Browser.
 *
 *  - **Tiere** sind kaufbare Shop-Items. Sie werden nicht auf eine Kachel
 *    gesetzt, sondern laufen frei im Gelände.
 *  - **Gäste und Personal** erscheinen von selbst passend zu den gesetzten
 *    Gebäuden und Anlagen (keine Datenbankzeilen, nicht kaufbar).
 */

export type FigurArt =
  | 'gast-1'
  | 'gast-2'
  | 'gast-3'
  | 'kind'
  | 'arbeiter'
  | 'fahrer'
  | 'hund'
  | 'katze'
  | 'huhn'
  | 'strandhund'
  | 'flamingo'
  | 'papagei'
  | 'krebs'

/** Icon-Schlüssel der Tier-Items je Fachbereich und ihre Figur. */
export const LEBEWESEN: Record<string, Record<string, FigurArt>> = {
  SPED: { hofhund: 'hund', hofkatze: 'katze', huehner: 'huhn' },
  TOUR: { strandhund: 'strandhund', flamingo: 'flamingo', papagei: 'papagei', krebs: 'krebs' },
}

export function istLebewesen(departmentCode: string, iconKey: string | null | undefined): boolean {
  return !!iconKey && !!LEBEWESEN[departmentCode]?.[iconKey]
}

/** Ist dieser Icon-Schlüssel irgendwo ein Tier? (Schlüssel sind fachbereichsübergreifend eindeutig.) */
export function istTierSchluessel(iconKey: string | null | undefined): boolean {
  return !!iconKey && Object.values(LEBEWESEN).some((m) => !!m[iconKey])
}

export function tierFigur(departmentCode: string, iconKey: string): FigurArt | null {
  return LEBEWESEN[departmentCode]?.[iconKey] ?? null
}

/** Welche gesetzten Items bringen Gäste/Personal hervor: Figuren (reihum) und wie weit sie sich entfernen. */
interface AutoRegel {
  arten: FigurArt[]
  radius: number
}

export const AUTO_REGELN: Record<string, Record<string, AutoRegel>> = {
  SPED: {
    lagerhalle: { arten: ['arbeiter'], radius: 3 },
    tankstelle: { arten: ['arbeiter'], radius: 2 },
    gabelstapler: { arten: ['arbeiter'], radius: 2 },
    imbisswagen: { arten: ['fahrer'], radius: 2 },
    brueckenwaage: { arten: ['arbeiter'], radius: 2 },
    'sattelschlepper-rot': { arten: ['fahrer'], radius: 2 },
    'transporter-blau': { arten: ['fahrer'], radius: 2 },
    'kleinlaster-gruen': { arten: ['fahrer'], radius: 2 },
    kuehltransporter: { arten: ['fahrer'], radius: 2 },
    tankwagen: { arten: ['fahrer'], radius: 2 },
    kipper: { arten: ['fahrer'], radius: 2 },
    abschleppwagen: { arten: ['fahrer'], radius: 2 },
  },
  TOUR: {
    hotel: { arten: ['gast-1', 'gast-2'], radius: 3 },
    pool: { arten: ['gast-3', 'gast-1'], radius: 2 },
    strandbar: { arten: ['gast-2'], radius: 2 },
    restaurant: { arten: ['gast-3'], radius: 2 },
    spielplatz: { arten: ['kind', 'kind'], radius: 2 },
    eisdiele: { arten: ['gast-1'], radius: 2 },
    tennisplatz: { arten: ['gast-2'], radius: 2 },
    volleyballfeld: { arten: ['gast-3'], radius: 2 },
    rezeption: { arten: ['gast-1'], radius: 2 },
    hochzeitsbogen: { arten: ['gast-2', 'gast-3'], radius: 2 },
    sonnenliegen: { arten: ['gast-1'], radius: 1 },
  },
}

/** So viele Figuren gleichzeitig (Tiere zuerst, dann Gäste/Personal). */
export const MAX_FIGUREN = 12

export interface FigurPlan {
  /** Stabil: `${itemId}` für Tiere, `${itemId}#${n}` für Gäste/Personal. */
  id: string
  art: FigurArt
  tier: boolean
  /** Name des Items, das die Figur hervorbringt (für Tooltip/Reaktion). */
  quelle: string
  heimat?: { x: number; y: number; radius: number }
  seed: number
}

export interface FigurQuelle {
  id: string
  name: string
  icon_key: string
  x: number | null
  y: number | null
}

/** FNV-1a: stabiler Startwert je Figur, damit sie bei jedem Laden gleich loslaufen. */
export function hash(text: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

export function planeFiguren(departmentCode: string, items: FigurQuelle[]): FigurPlan[] {
  const plan: FigurPlan[] = []
  const sortiert = [...items].sort((a, b) => a.id.localeCompare(b.id))

  for (const item of sortiert) {
    const art = tierFigur(departmentCode, item.icon_key)
    if (art) plan.push({ id: item.id, art, tier: true, quelle: item.name, seed: hash(item.id) })
  }

  const regeln = AUTO_REGELN[departmentCode] ?? {}
  for (const item of sortiert) {
    const regel = regeln[item.icon_key]
    if (!regel || item.x === null || item.y === null) continue
    regel.arten.forEach((art, n) => {
      const id = `${item.id}#${n}`
      plan.push({
        id,
        art,
        tier: false,
        quelle: item.name,
        heimat: { x: item.x!, y: item.y!, radius: regel.radius },
        seed: hash(id),
      })
    })
  }

  return plan.slice(0, MAX_FIGUREN)
}
