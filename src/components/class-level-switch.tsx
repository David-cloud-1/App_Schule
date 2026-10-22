'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { useDepartment } from '@/components/department-provider'
import { CLASS_LEVEL_COOKIE } from '@/lib/learn-library'
import { cn } from '@/lib/utils'

const ALL = 'alle'

/**
 * Klassenstufen-Umschalter der Lernbibliothek (PROJ-43). Die Wahl liegt als
 * Cookie auf dem Gerät, damit der Server Fortschritt und Themen gleich passend
 * rendert; nach dem Umschalten wird die Seite neu geladen.
 */
export function ClassLevelSwitch({ current }: { current: number | null }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const levels = useDepartment().classLevels

  if (levels.length === 0) return null

  function select(value: string) {
    // Erneutes Tippen auf die aktive Stufe liefert '' — die Auswahl bleibt dann stehen.
    if (!value) return
    const cookieValue = value === ALL ? '' : value
    document.cookie = `${CLASS_LEVEL_COOKIE}=${cookieValue}; path=/; max-age=31536000; samesite=lax`
    startTransition(() => router.refresh())
  }

  const itemClass =
    'min-h-[40px] flex-1 rounded-xl text-sm font-semibold text-[#9CA3AF] hover:bg-transparent hover:text-[#F9FAFB] data-[state=on]:bg-[#374151] data-[state=on]:text-[#F9FAFB] data-[state=on]:shadow transition-all duration-200'

  return (
    <ToggleGroup
      type="single"
      value={current === null ? ALL : String(current)}
      onValueChange={select}
      aria-label="Klassenstufe"
      className={cn('w-full gap-1 rounded-2xl bg-[#1F2937] p-1 transition-opacity', pending && 'opacity-60')}
    >
      {levels.map((level) => (
        <ToggleGroupItem key={level} value={String(level)} aria-label={`Klasse ${level}`} className={itemClass}>
          {level}
        </ToggleGroupItem>
      ))}
      <ToggleGroupItem value={ALL} aria-label="Alle Klassen" className={itemClass}>
        Alle
      </ToggleGroupItem>
    </ToggleGroup>
  )
}
