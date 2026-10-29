'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Loader2, MessagesSquare, Plus, Search, SearchX, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { AdminPageHeader } from '@/components/admin/admin-page-header'
import { AdminEmptyState, AdminErrorState, AdminLoadingState } from '@/components/admin/admin-states'
import { useAdminRole } from '@/components/admin/admin-role-provider'
import { ForumPostCard } from '@/components/admin/forum-post-card'
import { ForumReportsPanel } from '@/components/admin/forum-reports-panel'
import { refreshForumNavCounts, useForumNavCounts } from '@/components/admin/use-forum-nav-counts'
import { useForumCatalog } from '@/components/admin/use-forum-catalog'
import { LEHRERZIMMER_HREF } from '@/lib/admin-nav'
import {
  FORUM_CATEGORIES,
  FORUM_CATEGORY_LABEL,
  FORUM_FILTER_KEYS,
  FORUM_SORTS,
  FORUM_SORT_LABEL,
  listQuerySchema,
  type ForumListItem,
  type ForumSort,
} from '@/lib/forum'
import { forumJson, forumRequest } from '@/lib/forum-client'

const ALL = 'all'
const triggerClass = 'h-11 w-full rounded-xl border-ws-line bg-ws-surface text-ws-text'
const contentClass = 'border-ws-line bg-ws-surface text-ws-text'
const chipClass =
  'min-h-11 rounded-full border border-ws-line px-4 text-ws-muted hover:bg-ws-raised hover:text-ws-text data-[state=on]:border-ws-green/30 data-[state=on]:bg-ws-green/15 data-[state=on]:text-ws-green'

/** Übersicht des Lehrerzimmers (PROJ-63): Filter und Suche stehen in der Adresszeile. */
export function LehrerzimmerOverview() {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const { role } = useAdminRole()
  const isModerator = role === 'admin' || role === 'department_admin'
  const catalog = useForumCatalog()
  const nav = useForumNavCounts(pathname)

  const view = isModerator && params.get('ansicht') === 'gemeldet' ? 'reports' : 'all'
  const filters = useMemo(() => {
    const entries = Object.fromEntries(FORUM_FILTER_KEYS.map((k) => [k, params.get(k) ?? undefined]))
    const parsed = listQuerySchema.safeParse(entries)
    return parsed.success ? parsed.data : listQuerySchema.parse({})
  }, [params])
  const hasFilters = !!(filters.category || filters.department_id || filters.subject_id || filters.only_open || filters.mine || filters.q)
  const queryString = useMemo(() => {
    const qs = new URLSearchParams()
    for (const k of FORUM_FILTER_KEYS) {
      const v = params.get(k)
      if (v) qs.set(k, v)
    }
    return qs.toString()
  }, [params])

  const [items, setItems] = useState<ForumListItem[]>([])
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [failed, setFailed] = useState(false)
  const [reportsCount, setReportsCount] = useState<number | null>(null)
  const [searchText, setSearchText] = useState(filters.q ?? '')
  const requestId = useRef(0)
  const visited = useRef(false)

  const setParams = useCallback(
    (patch: Record<string, string | null>) => {
      const next = new URLSearchParams(params.toString())
      for (const [k, v] of Object.entries(patch)) {
        if (v === null || v === '') next.delete(k)
        else next.set(k, v)
      }
      const qs = next.toString()
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
    },
    [params, pathname, router],
  )

  const load = useCallback(async () => {
    const id = ++requestId.current
    setLoading(true)
    setFailed(false)
    const res = await forumRequest<{ items: ForumListItem[]; hasMore: boolean }>(
      `/api/admin/lehrerzimmer/posts${queryString ? `?${queryString}` : ''}`,
    )
    if (id !== requestId.current) return // eine neuere Anfrage ist schon unterwegs
    if (!res.ok) {
      setFailed(true)
    } else {
      setItems(res.data.items)
      setHasMore(res.data.hasMore)
    }
    setLoading(false)
  }, [queryString])

  useEffect(() => {
    if (view === 'all') void load()
  }, [load, view])

  // Der Besuch der Übersicht setzt „neue Beiträge“ in der Seitenleiste zurück
  useEffect(() => {
    if (visited.current || loading || failed || view !== 'all') return
    visited.current = true
    void forumRequest('/api/admin/lehrerzimmer/visit', forumJson('POST')).then(() => refreshForumNavCounts())
  }, [loading, failed, view])

  // Suche erst nach kurzer Tipp-Pause in die Adresse schreiben
  useEffect(() => {
    const trimmed = searchText.trim()
    if (trimmed === (filters.q ?? '')) return
    const t = setTimeout(() => setParams({ q: trimmed || null }), 300)
    return () => clearTimeout(t)
  }, [searchText, filters.q, setParams])

  async function loadMore() {
    setLoadingMore(true)
    const qs = new URLSearchParams(queryString)
    qs.set('offset', String(items.length))
    const res = await forumRequest<{ items: ForumListItem[]; hasMore: boolean }>(`/api/admin/lehrerzimmer/posts?${qs}`)
    setLoadingMore(false)
    if (!res.ok) {
      setFailed(true)
      return
    }
    setItems((prev) => [...prev, ...res.data.items.filter((n) => !prev.some((p) => p.id === n.id))])
    setHasMore(res.data.hasMore)
  }

  function resetFilters() {
    setSearchText('')
    setParams(Object.fromEntries(FORUM_FILTER_KEYS.map((k) => [k, null])))
  }

  const subjectsOfDepartment = catalog.subjects.filter(
    (s) => !filters.department_id || s.department_id === filters.department_id,
  )
  const isEmptyForum = view === 'all' && !loading && !failed && items.length === 0 && !hasFilters
  const reportsLabel = reportsCount ?? nav.reports

  const newPostButton = (
    <Button asChild className="min-h-11 rounded-xl bg-ws-green font-semibold text-ws-on-accent hover:bg-ws-green-hover">
      <Link href={`${LEHRERZIMMER_HREF}/neu`}>
        <Plus className="mr-2 size-4" aria-hidden />
        Neuer Beitrag
      </Link>
    </Button>
  )

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Lehrerzimmer"
        description="Tipps, Fragen und Ideen für den Austausch im Kollegium."
        actions={
          <>
            <Button asChild variant="outline" className="min-h-11 rounded-xl border-ws-line bg-transparent text-ws-text hover:bg-ws-raised hover:text-ws-text">
              <Link href="/admin/papierkorb?tab=forum">
                <Trash2 className="mr-2 size-4" aria-hidden />
                Papierkorb
              </Link>
            </Button>
            {!isEmptyForum && newPostButton}
          </>
        }
      />

      {isModerator && (
        <Tabs value={view} onValueChange={(v) => setParams({ ansicht: v === 'reports' ? 'gemeldet' : null })}>
          <TabsList className="h-11 bg-ws-raised">
            <TabsTrigger value="all" className="min-h-9">Alle Beiträge</TabsTrigger>
            <TabsTrigger value="reports" className="min-h-9">
              Gemeldet{reportsLabel > 0 ? ` (${reportsLabel})` : ''}
            </TabsTrigger>
          </TabsList>
        </Tabs>
      )}

      {view === 'reports' ? (
        <ForumReportsPanel onCount={setReportsCount} />
      ) : (
        <>
          <section aria-label="Filter" className="space-y-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ws-muted" aria-hidden />
              <Input
                type="search"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="Titel, Text und Antworten durchsuchen"
                aria-label="Beiträge durchsuchen"
                maxLength={100}
                className="h-11 rounded-xl border-ws-line bg-ws-surface pl-9 text-ws-text"
              />
            </div>

            <ToggleGroup
              type="single"
              value={filters.category ?? ALL}
              onValueChange={(v) => setParams({ category: !v || v === ALL ? null : v })}
              className="flex flex-wrap justify-start gap-2"
              aria-label="Kategorie"
            >
              <ToggleGroupItem value={ALL} className={chipClass}>Alle</ToggleGroupItem>
              {FORUM_CATEGORIES.map((c) => (
                <ToggleGroupItem key={c} value={c} className={chipClass}>{FORUM_CATEGORY_LABEL[c]}</ToggleGroupItem>
              ))}
            </ToggleGroup>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Select
                value={filters.department_id ?? ALL}
                onValueChange={(v) => setParams({ department_id: v === ALL ? null : v, subject_id: null })}
              >
                <SelectTrigger className={triggerClass} aria-label="Fachbereich"><SelectValue /></SelectTrigger>
                <SelectContent className={contentClass}>
                  <SelectItem value={ALL}>Alle Fachbereiche</SelectItem>
                  {catalog.departments.map((d) => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={filters.subject_id ?? ALL}
                onValueChange={(v) => setParams({ subject_id: v === ALL ? null : v })}
              >
                <SelectTrigger className={triggerClass} aria-label="Fach"><SelectValue /></SelectTrigger>
                <SelectContent className={contentClass}>
                  <SelectItem value={ALL}>Alle Fächer</SelectItem>
                  {subjectsOfDepartment.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={filters.sort}
                onValueChange={(v) => setParams({ sort: v === 'activity' ? null : (v as ForumSort) })}
              >
                <SelectTrigger className={triggerClass} aria-label="Sortierung"><SelectValue /></SelectTrigger>
                <SelectContent className={contentClass}>
                  {FORUM_SORTS.map((s) => (
                    <SelectItem key={s} value={s}>{FORUM_SORT_LABEL[s]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-wrap gap-x-6">
              <Label htmlFor="forum-only-open" className="flex min-h-11 cursor-pointer items-center gap-3 text-ws-text">
                <Switch id="forum-only-open" checked={filters.only_open} onCheckedChange={(v) => setParams({ only_open: v ? '1' : null })} />
                Nur offene Fragen
              </Label>
              <Label htmlFor="forum-mine" className="flex min-h-11 cursor-pointer items-center gap-3 text-ws-text">
                <Switch id="forum-mine" checked={filters.mine} onCheckedChange={(v) => setParams({ mine: v ? '1' : null })} />
                Meine Beiträge
              </Label>
            </div>
          </section>

          {failed ? (
            <AdminErrorState message="Die Beiträge konnten gerade nicht geladen werden." onRetry={load} />
          ) : loading ? (
            <AdminLoadingState variant="list" rows={4} label="Beiträge werden geladen …" />
          ) : isEmptyForum ? (
            <AdminEmptyState
              icon={MessagesSquare}
              title="Noch keine Beiträge"
              description="Teile den ersten Tipp mit dem Kollegium."
              action={newPostButton}
            />
          ) : items.length === 0 ? (
            <AdminEmptyState
              icon={SearchX}
              title="Keine Beiträge passen zu den Filtern"
              action={
                <Button variant="outline" onClick={resetFilters} className="min-h-11 rounded-xl border-ws-line bg-transparent text-ws-text hover:bg-ws-raised hover:text-ws-text">
                  Filter zurücksetzen
                </Button>
              }
            />
          ) : (
            <>
              <ul className="space-y-3" aria-label="Beiträge">
                {items.map((item) => (
                  <ForumPostCard key={item.id} item={item} />
                ))}
              </ul>
              {hasMore && (
                <div className="flex justify-center">
                  <Button
                    variant="outline"
                    disabled={loadingMore}
                    onClick={loadMore}
                    className="min-h-11 rounded-xl border-ws-line bg-transparent text-ws-text hover:bg-ws-raised hover:text-ws-text"
                  >
                    {loadingMore && <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />}
                    Mehr laden
                  </Button>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  )
}
