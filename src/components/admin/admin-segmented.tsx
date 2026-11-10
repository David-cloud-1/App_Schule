'use client'

import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { cn } from '@/lib/utils'

export interface AdminSegmentedOption<V extends string = string> {
  value: V
  label: string
}

/** Ab so vielen Werten ist ein Dropdown übersichtlicher (PROJ-83: „bis 4 Werte = Segment“) */
export const SEGMENTED_MAX_OPTIONS = 4

/**
 * Segment-Schalter (PROJ-83): aus 2 bis 4 Werten genau einen wählen, alle
 * Werte sind sofort sichtbar. Der gewählte Wert hat Tönung, Rahmen und fette
 * Schrift, ist also nicht nur an der Farbe erkennbar. Bedienflächen sind 44 px
 * hoch, per Tastatur mit den Pfeiltasten bedienbar. Auf schmalen Bildschirmen
 * scrollt das Segment in sich, die Seite nie.
 *
 * Ein erneuter Klick auf den gewählten Wert lässt die Auswahl bestehen.
 */
export function AdminSegmented<V extends string>({
  value,
  onChange,
  options,
  ariaLabel,
  className,
}: {
  value: V
  onChange: (value: V) => void
  options: readonly AdminSegmentedOption<V>[]
  /** Pflicht: sagt Screenreadern, worüber hier entschieden wird („Status“) */
  ariaLabel: string
  className?: string
}) {
  return (
    <ToggleGroup
      type="single"
      value={value}
      onValueChange={(next) => {
        // Radix meldet beim Abwählen einen leeren Wert: ignorieren, es bleibt immer einer gewählt
        if (next) onChange(next as V)
      }}
      aria-label={ariaLabel}
      className={cn(
        'inline-flex max-w-full justify-start gap-0.5 overflow-x-auto rounded-xl border border-ws-line bg-ws-surface p-0.5',
        className,
      )}
    >
      {options.map((opt) => (
        <ToggleGroupItem
          key={opt.value}
          value={opt.value}
          className={cn(
            'h-11 min-w-11 shrink-0 rounded-lg bg-transparent px-4 text-sm font-medium text-ws-muted',
            'transition-colors duration-200 hover:bg-ws-raised hover:text-ws-text',
            'focus-visible:ring-2 focus-visible:ring-ws-green focus-visible:ring-offset-0',
            'data-[state=on]:bg-ws-green/15 data-[state=on]:font-semibold data-[state=on]:text-ws-green',
            'data-[state=on]:ring-1 data-[state=on]:ring-inset data-[state=on]:ring-ws-green/40',
            'data-[state=on]:hover:bg-ws-green/15 data-[state=on]:hover:text-ws-green',
          )}
        >
          {opt.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}
