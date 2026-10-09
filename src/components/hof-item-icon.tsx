import { Package } from 'lucide-react'
import { cn } from '@/lib/utils'
import { resolveHofIcon } from '@/lib/hof-icons'
import { getBetriebSprite, hatBetriebSprite } from '@/lib/betrieb-sprites'

interface Props {
  departmentCode: string
  iconKey?: string | null
  /** Altes Emoji-Feld aus PROJ-20 — Fallback, falls icon_key (noch) nicht auflösbar ist. */
  legacyIcon?: string | null
  name: string
  svgClassName?: string
  /** Größe des isometrischen Sprites (PROJ-34); ohne Angabe wie `svgClassName`. */
  isoClassName?: string
  emojiClassName?: string
}

/**
 * Rendert die Illustration eines Hof-Items (PROJ-26/PROJ-34): zuerst das
 * isometrische Sprite, sonst die passende
 * SVG-Illustration aus der Icon-Bibliothek, sonst das alte Emoji-Feld, sonst
 * ein generisches Platzhalter-Icon — nie eine kaputt wirkende Leerstelle.
 */
export function HofItemIcon({
  departmentCode,
  iconKey,
  legacyIcon,
  name,
  svgClassName = 'w-8 h-8',
  isoClassName,
  emojiClassName = 'text-3xl',
}: Props) {
  // Zuerst das isometrische Sprite aus „Mein Betrieb“, damit Shop, Admin und
  // Betrieb dasselbe Bild zeigen; fehlt es, das flache Icon wie bisher.
  if (hatBetriebSprite(departmentCode, iconKey)) {
    const sprite = getBetriebSprite(departmentCode, iconKey)
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={sprite.url} alt={name} className={cn(isoClassName ?? svgClassName, 'object-contain')} draggable={false} />
  }

  const icon = resolveHofIcon(departmentCode, iconKey)

  if (icon) {
    return <icon.Svg className={svgClassName} role="img" aria-label={name} />
  }

  if (legacyIcon) {
    return (
      <span className={emojiClassName} role="img" aria-label={name}>
        {legacyIcon}
      </span>
    )
  }

  return <Package className={cn(svgClassName, 'text-[#6B7280]')} aria-label={name} />
}
