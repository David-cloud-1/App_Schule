import type { SVGProps } from 'react'
import type { HofIconDef, HofCategory } from './hof-icons'
import { getBetriebSprite } from './betrieb-sprites'

/**
 * Flache Icons aus isometrischen Sprites (PROJ-35/36): Für neue Items gibt es
 * kein eigenes flaches Bild. Damit Server-Prüfung ("Icon passt zu Kategorie und
 * Fachbereich") und Admin-Auswahl für alle Schlüssel gleich funktionieren, wird
 * das flache Icon aus dem Sprite erzeugt – es wird nur einmal gezeichnet.
 */
export function iconsAusSprites(
  departmentCode: string,
  liste: { key: string; label: string; category: HofCategory }[],
): HofIconDef[] {
  return liste.map((n) => ({
    key: n.key,
    label: n.label,
    category: n.category,
    Svg: (props: SVGProps<SVGSVGElement>) => {
      const sprite = getBetriebSprite(departmentCode, n.key)
      return (
        <svg viewBox="0 0 48 48" aria-hidden="true" focusable="false" {...props}>
          <image href={sprite.url} x={0} y={-3} width={48} height={Math.min(48, (48 * sprite.h) / sprite.w)} preserveAspectRatio="xMidYMax meet" />
        </svg>
      )
    },
  }))
}
