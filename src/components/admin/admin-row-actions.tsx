'use client'

import type { ReactNode } from 'react'
import { MoreHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export interface AdminRowMenuItem {
  key: string
  label: string
  /** Symbol als fertiges Element (nie als Funktion, wegen der Server/Client-Grenze) */
  icon?: ReactNode
  onSelect: () => void
  /** Rot, steht am Ende hinter einem Trennstrich. Löschen fragt weiterhin per Dialog nach. */
  destructive?: boolean
  /** Fehlende Rechte: Eintrag erscheint gar nicht */
  hidden?: boolean
  disabled?: boolean
}

/**
 * Zeilenaktionen (PROJ-83): ein sichtbares Symbol für „Bearbeiten“ plus ein
 * `⋯`-Menü für Verlauf, Löschen und Weiteres. Gleiches Muster wie in der
 * Nachweis-Liste. Ohne Einträge entfällt das Menü (kein leeres `⋯`), ohne
 * `onEdit` das Stift-Symbol. Alle Bedienflächen sind 44 × 44 px.
 */
export function AdminRowActions({
  subject,
  onEdit,
  editLabel = 'Bearbeiten',
  editIcon,
  items = [],
}: {
  /** Worum es in der Zeile geht, für die Beschriftung („Frage“, „Thema Luftfracht“) */
  subject: string
  onEdit?: () => void
  editLabel?: string
  editIcon?: ReactNode
  items?: AdminRowMenuItem[]
}) {
  const visible = items.filter((i) => !i.hidden)
  const normal = visible.filter((i) => !i.destructive)
  const destructive = visible.filter((i) => i.destructive)

  return (
    <div className="flex items-center justify-end gap-1">
      {onEdit && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onEdit}
          aria-label={`${editLabel}: ${subject}`}
          title={editLabel}
          className="size-11 rounded-xl text-ws-muted hover:text-ws-text"
        >
          {editIcon}
        </Button>
      )}
      {visible.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={`Weitere Aktionen: ${subject}`}
              className="size-11 rounded-xl text-ws-muted hover:text-ws-text"
            >
              <MoreHorizontal className="size-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="rounded-xl border-ws-line bg-ws-surface text-ws-text">
            {normal.map((item) => (
              <DropdownMenuItem
                key={item.key}
                disabled={item.disabled}
                onSelect={item.onSelect}
                className="min-h-11 cursor-pointer gap-2 focus:bg-ws-raised focus:text-ws-text"
              >
                {item.icon}
                {item.label}
              </DropdownMenuItem>
            ))}
            {normal.length > 0 && destructive.length > 0 && <DropdownMenuSeparator className="bg-ws-line" />}
            {destructive.map((item) => (
              <DropdownMenuItem
                key={item.key}
                disabled={item.disabled}
                onSelect={item.onSelect}
                className="min-h-11 cursor-pointer gap-2 text-ws-red focus:bg-ws-red/10 focus:text-ws-red"
              >
                {item.icon}
                {item.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  )
}
