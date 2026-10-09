import { Package } from 'lucide-react'
import { cn } from '@/lib/utils'
import { resolveHofIcon } from '@/lib/hof-icons'

interface Props {
  departmentCode: string
  iconKey?: string | null
  /** Altes Emoji-Feld aus PROJ-20 — Fallback, falls icon_key (noch) nicht auflösbar ist. */
  legacyIcon?: string | null
  name: string
  svgClassName?: string
  emojiClassName?: string
}

/**
 * Rendert die Illustration eines Hof-Items (PROJ-26): zuerst die passende
 * SVG-Illustration aus der Icon-Bibliothek, sonst das alte Emoji-Feld, sonst
 * ein generisches Platzhalter-Icon — nie eine kaputt wirkende Leerstelle.
 */
export function HofItemIcon({
  departmentCode,
  iconKey,
  legacyIcon,
  name,
  svgClassName = 'w-8 h-8',
  emojiClassName = 'text-3xl',
}: Props) {
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
