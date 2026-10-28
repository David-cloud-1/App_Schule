// Bewusst ohne 'use client': Server-Komponenten (z. B. „Mein Beitrag“) reichen
// ein Icon als Funktion weiter, das darf nicht über die Client-Grenze gehen.
// Die Datei hat keine Hooks. `onRetry` (ein Klick-Handler) darf nur aus
// Client-Komponenten kommen, in Server-Komponenten also weglassen.
import type { LucideIcon } from 'lucide-react'
import { AlertTriangle, RotateCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

/**
 * Einheitliche Zustände im Lehrkräfte-Bereich (PROJ-45): Lade-Platzhalter in
 * der Form des späteren Inhalts, freundlicher Leerzustand mit Hauptaktion und
 * verständlicher Fehler mit „Erneut versuchen“.
 */

const bone = 'bg-ws-raised/70'
const COLUMN_WIDTHS = ['w-2/5', 'w-1/5', 'w-1/5', 'w-[15%]']

export function AdminLoadingState({
  variant = 'list',
  rows = 5,
  label = 'Wird geladen …',
}: {
  variant?: 'list' | 'table' | 'cards' | 'form'
  rows?: number
  label?: string
}) {
  return (
    <div role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">{label}</span>
      {variant === 'table' && (
        <div className="overflow-hidden rounded-2xl border border-ws-line bg-ws-surface">
          <div className="flex gap-4 border-b border-ws-line px-4 py-3">
            {COLUMN_WIDTHS.map((w, i) => (
              <Skeleton key={i} className={`h-4 ${w} ${bone}`} />
            ))}
          </div>
          {Array.from({ length: rows }, (_, r) => (
            <div key={r} className="flex items-center gap-4 border-b border-ws-line/60 px-4 py-4 last:border-0">
              {COLUMN_WIDTHS.map((w, i) => (
                <Skeleton key={i} className={`h-4 ${w} ${bone}`} />
              ))}
            </div>
          ))}
        </div>
      )}
      {variant === 'list' && (
        <div className="space-y-3">
          {Array.from({ length: rows }, (_, r) => (
            <div key={r} className="flex items-center gap-4 rounded-2xl border border-ws-line bg-ws-surface p-4">
              <Skeleton className={`size-10 shrink-0 rounded-xl ${bone}`} />
              <div className="flex-1 space-y-2">
                <Skeleton className={`h-4 w-2/5 ${bone}`} />
                <Skeleton className={`h-3 w-3/5 ${bone}`} />
              </div>
            </div>
          ))}
        </div>
      )}
      {variant === 'cards' && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: rows }, (_, r) => (
            <div key={r} className="space-y-3 rounded-2xl border border-ws-line bg-ws-surface p-5">
              <Skeleton className={`h-5 w-1/2 ${bone}`} />
              <Skeleton className={`h-3 w-4/5 ${bone}`} />
              <Skeleton className={`h-3 w-3/5 ${bone}`} />
            </div>
          ))}
        </div>
      )}
      {variant === 'form' && (
        <div className="max-w-2xl space-y-5 rounded-2xl border border-ws-line bg-ws-surface p-6">
          {Array.from({ length: rows }, (_, r) => (
            <div key={r} className="space-y-2">
              <Skeleton className={`h-3 w-32 ${bone}`} />
              <Skeleton className={`h-11 w-full rounded-xl ${bone}`} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function AdminEmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon
  title: string
  description?: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-ws-line bg-ws-surface/50 px-6 py-12 text-center">
      <span className="flex size-12 items-center justify-center rounded-2xl bg-ws-raised text-ws-muted">
        <Icon className="size-6" aria-hidden />
      </span>
      <p className="text-base font-semibold text-ws-text">{title}</p>
      {description && <p className="max-w-sm text-sm text-ws-muted">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}

export function AdminErrorState({
  message = 'Die Daten konnten gerade nicht geladen werden.',
  onRetry,
}: {
  message?: string
  onRetry?: () => void
}) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-3 rounded-2xl border border-ws-red/40 bg-ws-red/5 px-6 py-10 text-center"
    >
      <AlertTriangle className="size-8 text-ws-red" aria-hidden />
      <p className="max-w-sm text-sm text-ws-text">{message}</p>
      {onRetry && (
        <Button
          variant="outline"
          onClick={onRetry}
          className="min-h-11 rounded-xl border-ws-line bg-transparent text-ws-text hover:bg-ws-raised hover:text-ws-text"
        >
          <RotateCw className="mr-2 size-4" />
          Erneut versuchen
        </Button>
      )}
    </div>
  )
}
