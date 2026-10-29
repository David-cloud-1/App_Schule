'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { EyeOff, Flag, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AdminEmptyState, AdminErrorState, AdminLoadingState } from '@/components/admin/admin-states'
import { ForumHiddenPill } from '@/components/admin/forum-ui'
import { refreshForumNavCounts } from '@/components/admin/use-forum-nav-counts'
import { LEHRERZIMMER_HREF } from '@/lib/admin-nav'
import { FORUM_REPORT_REASON_LABEL, type ForumReportItem } from '@/lib/forum'
import { forumJson, forumRequest } from '@/lib/forum-client'
import { formatRelativeTime } from '@/lib/forum-time'

/** Gemeldete Beiträge und Antworten für Super-Admin und Bereichs-Admins (PROJ-63, E4). */
export function ForumReportsPanel({ onCount }: { onCount?: (count: number) => void }) {
  const [items, setItems] = useState<ForumReportItem[]>([])
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const [busyKey, setBusyKey] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setFailed(false)
    const res = await forumRequest<{ items: ForumReportItem[] }>('/api/admin/lehrerzimmer/reports')
    if (!res.ok) {
      setFailed(true)
    } else {
      setItems(res.data.items)
      onCount?.(res.data.items.length)
    }
    setLoading(false)
  }, [onCount])

  useEffect(() => {
    void load()
  }, [load])

  async function resolve(item: ForumReportItem, action: 'hide' | 'dismiss') {
    const key = `${item.target_type}:${item.target_id}`
    setBusyKey(key)
    const res = await forumRequest('/api/admin/lehrerzimmer/reports/resolve', forumJson('POST', {
      target_type: item.target_type,
      target_id: item.target_id,
      action,
    }))
    setBusyKey(null)
    if (!res.ok) {
      toast.error(res.error)
      return
    }
    toast.success(action === 'hide' ? 'Ausgeblendet.' : 'Meldung verworfen.')
    const next = items.filter((i) => !(i.target_type === item.target_type && i.target_id === item.target_id))
    setItems(next)
    onCount?.(next.length)
    refreshForumNavCounts()
  }

  if (failed) return <AdminErrorState message="Die Meldungen konnten nicht geladen werden." onRetry={load} />
  if (loading) return <AdminLoadingState variant="list" rows={3} label="Meldungen werden geladen …" />
  if (items.length === 0) {
    return <AdminEmptyState icon={Flag} title="Keine offenen Meldungen" description="Alles ruhig im Lehrerzimmer." />
  }

  return (
    <ul className="space-y-3">
      {items.map((item) => {
        const key = `${item.target_type}:${item.target_id}`
        const busy = busyKey === key
        return (
          <li key={key} className="rounded-2xl border border-ws-line bg-ws-surface p-4 sm:p-5">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded-full border border-ws-orange/30 bg-ws-orange/15 px-2.5 py-0.5 font-semibold text-ws-orange">
                {item.report_count} {item.report_count === 1 ? 'Meldung' : 'Meldungen'}
              </span>
              <span className="rounded-full border border-ws-line bg-ws-raised px-2.5 py-0.5 font-semibold text-ws-muted">
                {item.target_type === 'reply' ? 'Antwort' : 'Beitrag'}
              </span>
              {item.is_hidden && <ForumHiddenPill />}
              <span className="text-ws-muted">seit {formatRelativeTime(item.first_reported_at)}</span>
            </div>

            <p className="mt-2 text-sm text-ws-muted">
              {item.target_type === 'reply' ? 'Antwort in „' : '„'}
              <span className="font-medium text-ws-text">{item.title}</span>” von {item.author_name ?? 'Unbekannt'}
            </p>
            <p className="mt-1 line-clamp-3 break-words text-sm text-ws-text">{item.snippet}</p>

            <p className="mt-2 text-sm text-ws-muted">
              Gründe: {item.reasons.map((r) => FORUM_REPORT_REASON_LABEL[r] ?? r).join(', ')}
            </p>
            {item.notes.length > 0 && (
              <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm text-ws-muted">
                {item.notes.map((n, i) => (
                  <li key={i} className="break-words">{n}</li>
                ))}
              </ul>
            )}

            <div className="mt-3 flex flex-wrap gap-2">
              <Button asChild variant="outline" className="min-h-11 rounded-xl border-ws-line bg-transparent text-ws-text hover:bg-ws-raised hover:text-ws-text">
                <Link href={`${LEHRERZIMMER_HREF}/${item.post_id}`}>Ansehen</Link>
              </Button>
              {!item.is_hidden && (
                <Button
                  variant="outline"
                  disabled={busy}
                  onClick={() => resolve(item, 'hide')}
                  className="min-h-11 gap-2 rounded-xl border-ws-line bg-transparent text-ws-text hover:bg-ws-raised hover:text-ws-text"
                >
                  {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <EyeOff className="size-4" aria-hidden />}
                  Ausblenden
                </Button>
              )}
              <Button
                variant="outline"
                disabled={busy}
                onClick={() => resolve(item, 'dismiss')}
                className="min-h-11 rounded-xl border-ws-line bg-transparent text-ws-text hover:bg-ws-raised hover:text-ws-text"
              >
                Meldung verwerfen
              </Button>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
