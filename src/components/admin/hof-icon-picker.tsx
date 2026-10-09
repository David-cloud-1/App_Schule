'use client'

import { cn } from '@/lib/utils'
import { getHofIconsByCategory, type HofCategory } from '@/lib/hof-icons'

interface Props {
  departmentCode: string
  category: HofCategory | ''
  value: string
  onChange: (iconKey: string) => void
}

/**
 * Icon-Picker fürs Admin-Formular (PROJ-26) — ersetzt das bisherige freie
 * Emoji-Textfeld. Zeigt nur die Illustrationen aus dem Icon-Set des eigenen
 * Fachbereichs und nur innerhalb der gewählten Kategorie, damit Icon und
 * Kategorie nie auseinanderlaufen können.
 */
export function HofIconPicker({ departmentCode, category, value, onChange }: Props) {
  if (!category) {
    return (
      <p className="text-xs text-[#6B7280] py-2">Zuerst eine Kategorie auswählen.</p>
    )
  }

  const icons = getHofIconsByCategory(departmentCode, category)

  if (icons.length === 0) {
    return (
      <p className="text-xs text-[#6B7280] py-2">
        Für deinen Fachbereich sind für diese Kategorie noch keine Illustrationen hinterlegt.
      </p>
    )
  }

  return (
    <div className="grid grid-cols-4 gap-2" role="radiogroup" aria-label="Illustration auswählen">
      {icons.map((icon) => {
        const selected = icon.key === value
        return (
          <button
            key={icon.key}
            type="button"
            role="radio"
            aria-checked={selected}
            title={icon.label}
            onClick={() => onChange(icon.key)}
            className={cn(
              'flex flex-col items-center justify-center gap-1 rounded-xl border p-2 min-h-[44px] transition-all duration-200 active:scale-95',
              selected
                ? 'border-[#FFD700] bg-[#FFD700]/10'
                : 'border-[#4B5563] bg-[#111827] hover:border-[#9CA3AF]',
            )}
          >
            <icon.Svg className="w-7 h-7" />
            <span className="text-[9px] leading-tight text-[#9CA3AF] text-center line-clamp-2">
              {icon.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}
