'use client'

import { CheckCircle2, EyeOff, ThumbsUp } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { FORUM_CATEGORY_LABEL, type ForumCategory } from '@/lib/forum'
import { formatFullDateTime, formatRelativeTime } from '@/lib/forum-time'
import { cn } from '@/lib/utils'

/** Tönung höchstens /20 (Kontrast-Test der Lehrkräfte-Farben, docs/DESIGN.md) */
const CATEGORY_CLASS: Record<ForumCategory, string> = {
  tipp: 'border-ws-green/30 bg-ws-green/15 text-ws-green',
  frage: 'border-ws-blue/30 bg-ws-blue/15 text-ws-blue',
  idee: 'border-ws-gold/30 bg-ws-gold/15 text-ws-gold',
}

const pill = 'rounded-full border px-2.5 py-0.5 text-xs font-semibold'

export function ForumCategoryPill({ category }: { category: ForumCategory }) {
  return <Badge variant="outline" className={cn(pill, CATEGORY_CLASS[category])}>{FORUM_CATEGORY_LABEL[category]}</Badge>
}

export function ForumSolvedPill() {
  return (
    <Badge variant="outline" className={cn(pill, 'gap-1 border-ws-green/30 bg-ws-green/15 text-ws-green')}>
      <CheckCircle2 className="size-3" aria-hidden />
      gelöst
    </Badge>
  )
}

export function ForumHiddenPill({ label = 'ausgeblendet' }: { label?: string }) {
  return (
    <Badge variant="outline" className={cn(pill, 'gap-1 border-ws-orange/30 bg-ws-orange/15 text-ws-orange')}>
      <EyeOff className="size-3" aria-hidden />
      {label}
    </Badge>
  )
}

export function ForumScopePills({ department, subject }: { department: string | null; subject: string | null }) {
  if (!department && !subject) return null
  return (
    <>
      {department && <Badge variant="outline" className={cn(pill, 'border-ws-line bg-ws-raised text-ws-muted')}>{department}</Badge>}
      {subject && <Badge variant="outline" className={cn(pill, 'border-ws-line bg-ws-raised text-ws-muted')}>{subject}</Badge>}
    </>
  )
}

/** „von Name · vor 2 Std.“ — der volle Zeitpunkt steht im title */
export function ForumMeta({
  author,
  createdAt,
  editedAt,
  className,
}: {
  author: string | null
  createdAt: string
  editedAt?: string | null
  className?: string
}) {
  return (
    <span className={cn('text-sm text-ws-muted', className)}>
      von <span className="font-medium text-ws-text">{author ?? 'Unbekannt'}</span> ·{' '}
      <time dateTime={createdAt} title={formatFullDateTime(createdAt)}>
        {formatRelativeTime(createdAt)}
      </time>
      {editedAt && (
        <span title={`Bearbeitet ${formatFullDateTime(editedAt)}`}> · bearbeitet</span>
      )}
    </span>
  )
}

/** „Hilfreich“-Daumen mit Zähler; für Eigenes ausgegraut (Datenbank lehnt es ebenfalls ab) */
export function ForumHelpfulButton({
  count,
  active,
  own,
  busy,
  onToggle,
}: {
  count: number
  active: boolean
  own: boolean
  busy?: boolean
  onToggle: () => void
}) {
  return (
    <Button
      type="button"
      variant="outline"
      onClick={onToggle}
      disabled={own || busy}
      aria-pressed={active}
      aria-label={`Hilfreich, ${count} ${count === 1 ? 'Person findet das' : 'Personen finden das'}`}
      title={own ? 'Eigener Beitrag' : active ? 'Markierung zurücknehmen' : 'Als hilfreich markieren'}
      className={cn(
        'min-h-11 gap-2 rounded-xl border-ws-line bg-transparent text-ws-text hover:bg-ws-raised hover:text-ws-text focus-visible:ring-ws-green',
        active && 'border-ws-green/30 bg-ws-green/15 text-ws-green hover:bg-ws-green/20 hover:text-ws-green',
      )}
    >
      <ThumbsUp className="size-4" aria-hidden />
      <span>Hilfreich</span>
      <span className="tabular-nums" aria-hidden>{count}</span>
    </Button>
  )
}
