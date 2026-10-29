'use client'

import Link from 'next/link'
import { MessageSquare, ThumbsUp } from 'lucide-react'
import { ForumCategoryPill, ForumHiddenPill, ForumMeta, ForumScopePills, ForumSolvedPill } from '@/components/admin/forum-ui'
import { LEHRERZIMMER_HREF } from '@/lib/admin-nav'
import type { ForumListItem } from '@/lib/forum'
import { cn } from '@/lib/utils'

/** Eine Zeile der Beitragsliste (PROJ-63): ganze Karte ist der Link, Ungelesenes trägt einen Punkt. */
export function ForumPostCard({ item }: { item: ForumListItem }) {
  return (
    <li>
      <Link
        href={`${LEHRERZIMMER_HREF}/${item.id}`}
        className={cn(
          'block rounded-2xl border border-ws-line bg-ws-surface p-4 transition-colors duration-200 hover:bg-ws-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ws-green sm:p-5',
          item.is_hidden && 'border-ws-orange/40',
        )}
      >
        <div className="flex flex-wrap items-center gap-2">
          <ForumCategoryPill category={item.category} />
          {item.category === 'frage' && item.is_solved && <ForumSolvedPill />}
          {item.is_hidden && <ForumHiddenPill label="von der Moderation ausgeblendet" />}
          <ForumScopePills department={item.department_name} subject={item.subject_name} />
        </div>

        <h2 className="mt-2 flex items-start gap-2 text-lg font-semibold text-ws-text">
          {item.has_unread && (
            <span className="mt-2 size-2.5 shrink-0 rounded-full bg-ws-green" role="img" aria-label="Neu oder ungelesen" />
          )}
          <span className="min-w-0 truncate" title={item.title}>{item.title}</span>
        </h2>

        <p className="mt-1 line-clamp-2 break-words text-sm text-ws-muted">{item.snippet}</p>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
          <ForumMeta author={item.author_name} createdAt={item.created_at} editedAt={item.edited_at} />
          <span className="flex items-center gap-4 text-sm text-ws-muted">
            <span className="flex items-center gap-1" title={`${item.reply_count} Antworten`}>
              <MessageSquare className="size-4" aria-hidden />
              <span className="tabular-nums">{item.reply_count}</span>
              <span className="sr-only">Antworten</span>
            </span>
            <span className="flex items-center gap-1" title={`${item.helpful_count} hilfreich`}>
              <ThumbsUp className="size-4" aria-hidden />
              <span className="tabular-nums">{item.helpful_count}</span>
              <span className="sr-only">hilfreich</span>
            </span>
          </span>
        </div>
      </Link>
    </li>
  )
}
