'use client'

import { Ban, CheckCircle2, Download, MapPinned, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/** Checkbox-Optik im Lehrkräfte-Bereich (nur Farb-Tokens); der Zwischenzustand zeigt einen Strich statt Haken */
export const SELECT_CHECKBOX_CLASS = cn(
  'border-ws-line data-[state=checked]:border-ws-green data-[state=checked]:bg-ws-green data-[state=checked]:text-ws-on-accent',
  'focus-visible:ring-ws-green',
  'data-[state=indeterminate]:flex data-[state=indeterminate]:items-center data-[state=indeterminate]:justify-center',
  'data-[state=indeterminate]:border-ws-green data-[state=indeterminate]:bg-ws-green',
  'data-[state=indeterminate]:[&_svg]:hidden data-[state=indeterminate]:after:block data-[state=indeterminate]:after:h-0.5',
  'data-[state=indeterminate]:after:w-2 data-[state=indeterminate]:after:bg-ws-on-accent',
)

interface Props {
  /** Ausgewählte und gerade sichtbare Personen */
  count: number
  busy?: boolean
  onBan: () => void
  onUnban: () => void
  onMove: () => void
  onExport: () => void
  onClear: () => void
}

/**
 * Aktionsleiste der Mehrfachauswahl (PROJ-61). Am Handy fest am unteren Rand,
 * am Laptop direkt über der Tabelle.
 */
export function UserBulkBar({ count, busy = false, onBan, onUnban, onMove, onExport, onClear }: Props) {
  if (count === 0) return null
  const outline = 'min-h-11 border-ws-line bg-ws-surface text-ws-text hover:bg-ws-raised'
  return (
    <div
      role="region"
      aria-label="Aktionen für die Auswahl"
      className={cn(
        'fixed inset-x-0 bottom-0 z-30 border-t border-ws-line bg-ws-surface px-4 py-3 shadow-lg',
        'sm:static sm:z-auto sm:rounded-2xl sm:border sm:py-2 sm:shadow-none',
      )}
    >
      <div className="mx-auto flex max-w-screen-2xl flex-wrap items-center gap-2">
        <span className="mr-auto text-sm font-medium text-ws-text" aria-live="polite">
          {count} ausgewählt
        </span>
        <Button variant="outline" className={outline} disabled={busy} onClick={onBan}>
          <Ban className="size-4" /> Sperren
        </Button>
        <Button variant="outline" className={outline} disabled={busy} onClick={onUnban}>
          <CheckCircle2 className="size-4" /> Entsperren
        </Button>
        <Button variant="outline" className={outline} disabled={busy} onClick={onMove}>
          <MapPinned className="size-4" /> Bereich ändern
        </Button>
        <Button variant="outline" className={outline} disabled={busy} onClick={onExport}>
          <Download className="size-4" /> Exportieren
        </Button>
        <Button variant="ghost" className="min-h-11 text-ws-muted hover:text-ws-text" onClick={onClear}>
          <X className="size-4" /> Auswahl aufheben
        </Button>
      </div>
    </div>
  )
}
