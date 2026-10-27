'use client'

import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { TableHead } from '@/components/ui/table'
import { cn } from '@/lib/utils'

interface SortableTableHeadProps<K extends string> {
  sortKey: K
  label: string
  activeKey: K
  dir: 'asc' | 'desc'
  onSort: (key: K) => void
  className?: string
}

/** Spaltenüberschrift als Button mit Pfeil und aria-sort (PROJ-57) */
export function SortableTableHead<K extends string>({
  sortKey,
  label,
  activeKey,
  dir,
  onSort,
  className,
}: SortableTableHeadProps<K>) {
  const active = sortKey === activeKey
  const Icon = !active ? ArrowUpDown : dir === 'asc' ? ArrowUp : ArrowDown
  return (
    <TableHead
      aria-sort={active ? (dir === 'asc' ? 'ascending' : 'descending') : 'none'}
      className={cn('px-1', className)}
    >
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => onSort(sortKey)}
        className={cn(
          'min-h-11 gap-1 px-2 font-medium hover:bg-ws-raised hover:text-ws-text focus-visible:ring-ws-green',
          active ? 'text-ws-text' : 'text-ws-muted'
        )}
      >
        {label}
        <Icon className={cn('size-3.5', !active && 'opacity-50')} aria-hidden="true" />
      </Button>
    </TableHead>
  )
}
