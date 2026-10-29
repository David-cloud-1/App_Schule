'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { CheckCircle2, Eye, EyeOff, Flag, Loader2, MoreHorizontal, Pencil, SearchX, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { AdminPageHeader } from '@/components/admin/admin-page-header'
import { AdminEmptyState, AdminErrorState, AdminLoadingState } from '@/components/admin/admin-states'
import { useAdminRole } from '@/components/admin/admin-role-provider'
import { ForumEditor } from '@/components/admin/forum-editor'
import { ForumMarkdown } from '@/components/admin/forum-markdown'
import { ForumReportDialog } from '@/components/admin/forum-report-dialog'
import {
  ForumCategoryPill,
  ForumHelpfulButton,
  ForumHiddenPill,
  ForumMeta,
  ForumScopePills,
  ForumSolvedPill,
} from '@/components/admin/forum-ui'
import { refreshForumNavCounts } from '@/components/admin/use-forum-nav-counts'
import { LEHRERZIMMER_HREF } from '@/lib/admin-nav'
import { FORUM_LIMITS, type ForumReply, type ForumThread } from '@/lib/forum'
import { forumJson, forumRequest } from '@/lib/forum-client'
import { cn } from '@/lib/utils'

type Target = { type: 'post' | 'reply'; id: string }
const API = '/api/admin/lehrerzimmer'

const outlineBtn =
  'min-h-11 rounded-xl border-ws-line bg-transparent text-ws-text hover:bg-ws-raised hover:text-ws-text focus-visible:ring-ws-green'

/** Menü ⋯ an Beitrag und Antworten: eigene Inhalte bearbeiten/löschen, fremde melden, Admins ausblenden. */
function ItemMenu({
  own,
  moderator,
  hidden,
  label,
  onEdit,
  onDelete,
  onReport,
  onToggleHidden,
}: {
  own: boolean
  moderator: boolean
  hidden: boolean
  label: string
  onEdit: () => void
  onDelete: () => void
  onReport: () => void
  onToggleHidden: () => void
}) {
  if (!own && !moderator) {
    // Lehrkräfte können fremde Beiträge nur melden
    return (
      <Button variant="ghost" onClick={onReport} aria-label={`${label} melden`} title="Melden" className="size-11 rounded-xl text-ws-muted hover:bg-ws-raised hover:text-ws-text">
        <Flag className="size-4" />
      </Button>
    )
  }
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" aria-label={`Weitere Aktionen: ${label}`} className="size-11 rounded-xl text-ws-muted hover:bg-ws-raised hover:text-ws-text">
          <MoreHorizontal className="size-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="border-ws-line bg-ws-surface text-ws-text">
        {own && (
          <>
            <DropdownMenuItem onSelect={onEdit} className="min-h-11 gap-2"><Pencil className="size-4" />Bearbeiten</DropdownMenuItem>
            <DropdownMenuItem onSelect={onDelete} className="min-h-11 gap-2 text-ws-red focus:text-ws-red"><Trash2 className="size-4" />Löschen</DropdownMenuItem>
          </>
        )}
        {!own && (
          <DropdownMenuItem onSelect={onReport} className="min-h-11 gap-2"><Flag className="size-4" />Melden</DropdownMenuItem>
        )}
        {moderator && (
          <>
            {own && <DropdownMenuSeparator className="bg-ws-line" />}
            <DropdownMenuItem onSelect={onToggleHidden} className="min-h-11 gap-2">
              {hidden ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
              {hidden ? 'Einblenden' : 'Ausblenden'}
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/** Beitrag mit Antworten (PROJ-63): Hilfreich, Lösung, Bearbeiten, Löschen, Melden, Ausblenden. */
export function ForumThreadView({ id }: { id: string }) {
  const router = useRouter()
  const { role } = useAdminRole()
  const moderator = role === 'admin' || role === 'department_admin'

  const [thread, setThread] = useState<ForumThread | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<{ status: number; message: string } | null>(null)
  const [busyKey, setBusyKey] = useState<string | null>(null)

  const [replyText, setReplyText] = useState('')
  const [replyError, setReplyError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [reportTarget, setReportTarget] = useState<Target | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Target | null>(null)

  const load = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true)
      const res = await forumRequest<ForumThread>(`${API}/posts/${id}`)
      if (!res.ok) {
        setError({ status: res.status, message: res.error })
      } else {
        setThread(res.data)
        setError(null)
        refreshForumNavCounts() // Öffnen setzt den Beitrag auf „gelesen“
      }
      setLoading(false)
    },
    [id],
  )

  useEffect(() => {
    void load()
  }, [load])

  // Lösungs-Antwort zuerst, danach die übrigen chronologisch
  const ordered = useMemo(() => {
    if (!thread) return { solution: null as ForumReply | null, rest: [] as ForumReply[] }
    const solution = thread.replies.find((r) => r.is_solution) ?? null
    return { solution, rest: thread.replies.filter((r) => !r.is_solution) }
  }, [thread])

  /** Aktion ausführen, Fehler als Toast, danach frisch laden */
  async function act(key: string, url: string, init: RequestInit, success?: string) {
    setBusyKey(key)
    const res = await forumRequest(url, init)
    setBusyKey(null)
    if (!res.ok) {
      toast.error(res.error)
      if (res.status === 404) void load(true)
      return false
    }
    if (success) toast.success(success)
    await load(true)
    return true
  }

  async function toggleHelpful(target: Target) {
    const res = await forumRequest<{ helpful: boolean; count: number }>(`${API}/helpful`, forumJson('POST', {
      target_type: target.type,
      target_id: target.id,
    }))
    if (!res.ok) {
      toast.error(res.error)
      return
    }
    setThread((t) => {
      if (!t) return t
      if (target.type === 'post') {
        return { ...t, post: { ...t.post, my_helpful: res.data.helpful, helpful_count: res.data.count } }
      }
      return {
        ...t,
        replies: t.replies.map((r) => (r.id === target.id ? { ...r, my_helpful: res.data.helpful, helpful_count: res.data.count } : r)),
      }
    })
  }

  async function sendReply(e: React.FormEvent) {
    e.preventDefault()
    const text = replyText.trim()
    if (!text) {
      setReplyError('Bitte schreibe etwas.')
      return
    }
    setReplyError(null)
    setBusyKey('reply')
    const res = await forumRequest(`${API}/posts/${id}/replies`, forumJson('POST', { body: text }))
    setBusyKey(null)
    if (!res.ok) {
      // Der Text bleibt im Feld, damit nichts verloren geht
      setReplyError(res.error)
      if (res.status === 404) void load(true)
      return
    }
    setReplyText('')
    toast.success('Antwort veröffentlicht')
    await load(true)
  }

  async function saveEdit(replyId: string) {
    const ok = await act(`edit:${replyId}`, `${API}/replies/${replyId}`, forumJson('PATCH', { body: editText.trim() }), 'Änderungen gespeichert')
    if (ok) setEditingId(null)
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    const target = deleteTarget
    setDeleteTarget(null)
    if (target.type === 'post') {
      setBusyKey('delete')
      const res = await forumRequest(`${API}/posts/${target.id}`, forumJson('DELETE'))
      setBusyKey(null)
      if (!res.ok) {
        toast.error(res.error)
        return
      }
      toast.success('Beitrag gelöscht. Im Papierkorb kannst du ihn 30 Tage lang zurückholen.')
      router.push(LEHRERZIMMER_HREF)
      return
    }
    await act(`delete:${target.id}`, `${API}/replies/${target.id}`, forumJson('DELETE'), 'Antwort gelöscht')
  }

  function toggleHidden(target: Target, hidden: boolean) {
    return act(`hide:${target.id}`, `${API}/hide`, forumJson('POST', { target_type: target.type, target_id: target.id, hidden: !hidden }), hidden ? 'Eingeblendet' : 'Ausgeblendet')
  }

  function setSolution(replyId: string | null) {
    return act(`solution`, `${API}/posts/${id}/solution`, forumJson('PUT', { reply_id: replyId }), replyId ? 'Als Lösung markiert' : 'Markierung zurückgenommen')
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <AdminPageHeader title="Beitrag" breadcrumb="Beitrag" />
        <AdminLoadingState variant="cards" rows={1} label="Beitrag wird geladen …" />
      </div>
    )
  }

  if (error && !thread) {
    const notFound = error.status === 404
    return (
      <div className="space-y-6">
        <AdminPageHeader title="Beitrag" breadcrumb="Beitrag" />
        {notFound ? (
          <AdminEmptyState
            icon={SearchX}
            title="Diesen Beitrag gibt es nicht mehr"
            description="Er wurde gelöscht oder ist nicht sichtbar."
            action={
              <Button asChild variant="outline" className={outlineBtn}>
                <Link href={LEHRERZIMMER_HREF}>Zurück zum Lehrerzimmer</Link>
              </Button>
            }
          />
        ) : (
          <AdminErrorState message={error.message} onRetry={() => void load()} />
        )}
      </div>
    )
  }

  if (!thread) return null
  const { post } = thread
  const isQuestion = post.category === 'frage'

  const renderReply = (reply: ForumReply, pinned = false) => {
    const editing = editingId === reply.id
    return (
      <li
        key={reply.id}
        id={`antwort-${reply.id}`}
        className={cn(
          'rounded-2xl border bg-ws-surface p-4 sm:p-5',
          pinned ? 'border-ws-green/40' : 'border-ws-line',
          reply.is_hidden && 'border-ws-orange/40',
        )}
      >
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            {reply.is_solution && (
              <span className="inline-flex items-center gap-1 rounded-full border border-ws-green/30 bg-ws-green/15 px-2.5 py-0.5 text-xs font-semibold text-ws-green">
                <CheckCircle2 className="size-3" aria-hidden />
                Lösung
              </span>
            )}
            {reply.is_hidden && <ForumHiddenPill label="von der Moderation ausgeblendet" />}
            <ForumMeta author={reply.author_name} createdAt={reply.created_at} editedAt={reply.edited_at} />
          </div>
          <ItemMenu
            own={reply.is_mine}
            moderator={moderator}
            hidden={reply.is_hidden}
            label="Antwort"
            onEdit={() => {
              setEditingId(reply.id)
              setEditText(reply.body)
            }}
            onDelete={() => setDeleteTarget({ type: 'reply', id: reply.id })}
            onReport={() => setReportTarget({ type: 'reply', id: reply.id })}
            onToggleHidden={() => void toggleHidden({ type: 'reply', id: reply.id }, reply.is_hidden)}
          />
        </div>

        {editing ? (
          <form
            className="mt-3 space-y-3"
            onSubmit={(e) => {
              e.preventDefault()
              void saveEdit(reply.id)
            }}
          >
            <ForumEditor value={editText} onChange={setEditText} maxLength={FORUM_LIMITS.replyMax} minRows={4} label="Antwort bearbeiten" />
            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={busyKey === `edit:${reply.id}` || !editText.trim()} className="min-h-11 rounded-xl bg-ws-green font-semibold text-ws-on-accent hover:bg-ws-green-hover">
                Speichern
              </Button>
              <Button type="button" variant="outline" onClick={() => setEditingId(null)} className={outlineBtn}>Abbrechen</Button>
            </div>
          </form>
        ) : (
          <ForumMarkdown text={reply.body} className="mt-3" />
        )}

        {!editing && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <ForumHelpfulButton
              count={reply.helpful_count}
              active={reply.my_helpful}
              own={reply.is_mine || reply.is_hidden}
              onToggle={() => void toggleHelpful({ type: 'reply', id: reply.id })}
            />
            {isQuestion && post.is_mine && !reply.is_mine && !reply.is_hidden && (
              <Button
                type="button"
                variant="outline"
                disabled={busyKey === 'solution'}
                onClick={() => void setSolution(reply.is_solution ? null : reply.id)}
                className={outlineBtn}
              >
                <CheckCircle2 className="mr-2 size-4" aria-hidden />
                {reply.is_solution ? 'Lösung zurücknehmen' : 'Als Lösung markieren'}
              </Button>
            )}
          </div>
        )}
      </li>
    )
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader title={post.title} breadcrumb={post.title}>
        <div className="flex flex-wrap items-center gap-2">
          <ForumCategoryPill category={post.category} />
          {isQuestion && ordered.solution && <ForumSolvedPill />}
          <ForumScopePills department={post.department_name} subject={post.subject_name} />
        </div>
      </AdminPageHeader>

      <article className={cn('rounded-2xl border bg-ws-surface p-4 sm:p-6', post.is_hidden ? 'border-ws-orange/40' : 'border-ws-line')}>
        {post.is_hidden && (
          <p role="status" className="mb-4 flex items-center gap-2 rounded-xl border border-ws-orange/30 bg-ws-orange/15 p-3 text-sm text-ws-orange">
            <EyeOff className="size-4 shrink-0" aria-hidden />
            Von der Moderation ausgeblendet. Für andere ist dieser Beitrag nicht sichtbar.
          </p>
        )}
        <div className="flex flex-wrap items-start justify-between gap-2">
          <ForumMeta author={post.author_name} createdAt={post.created_at} editedAt={post.edited_at} />
          <ItemMenu
            own={post.is_mine}
            moderator={moderator}
            hidden={post.is_hidden}
            label="Beitrag"
            onEdit={() => router.push(`${LEHRERZIMMER_HREF}/${post.id}/bearbeiten`)}
            onDelete={() => setDeleteTarget({ type: 'post', id: post.id })}
            onReport={() => setReportTarget({ type: 'post', id: post.id })}
            onToggleHidden={() => void toggleHidden({ type: 'post', id: post.id }, post.is_hidden)}
          />
        </div>
        <ForumMarkdown text={post.body} className="mt-4" />
        <div className="mt-4">
          <ForumHelpfulButton
            count={post.helpful_count}
            active={post.my_helpful}
            own={post.is_mine || post.is_hidden}
            onToggle={() => void toggleHelpful({ type: 'post', id: post.id })}
          />
        </div>
      </article>

      <section aria-labelledby="forum-antworten" className="space-y-3">
        <h2 id="forum-antworten" className="text-lg font-semibold text-ws-text">
          {thread.replies.length === 0 ? 'Antworten' : `Antworten (${thread.replies.length})`}
        </h2>
        {thread.replies.length === 0 ? (
          <p className="text-sm text-ws-muted">Noch keine Antworten. Sei die erste Person.</p>
        ) : (
          <ul className="space-y-3">
            {ordered.solution && renderReply(ordered.solution, true)}
            {ordered.rest.map((r) => renderReply(r))}
          </ul>
        )}
      </section>

      <form onSubmit={sendReply} noValidate className="space-y-3 rounded-2xl border border-ws-line bg-ws-surface p-4 sm:p-5">
        <h2 className="text-base font-semibold text-ws-text">Deine Antwort</h2>
        <ForumEditor
          value={replyText}
          onChange={(v) => {
            setReplyText(v)
            setReplyError(null)
          }}
          maxLength={FORUM_LIMITS.replyMax}
          minRows={4}
          label="Deine Antwort"
          placeholder="Schreibe eine Antwort …"
          invalid={!!replyError}
          describedBy={replyError ? 'forum-reply-error' : undefined}
        />
        {replyError && <p id="forum-reply-error" role="alert" className="text-sm text-ws-red">{replyError}</p>}
        <Button type="submit" disabled={busyKey === 'reply'} className="min-h-11 rounded-xl bg-ws-green font-semibold text-ws-on-accent hover:bg-ws-green-hover">
          {busyKey === 'reply' && <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />}
          Antworten
        </Button>
      </form>

      <ForumReportDialog target={reportTarget} onOpenChange={(open) => !open && setReportTarget(null)} />

      <AlertDialog open={deleteTarget !== null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent className="border-ws-line bg-ws-surface text-ws-text">
          <AlertDialogHeader>
            <AlertDialogTitle>{deleteTarget?.type === 'post' ? 'Beitrag löschen?' : 'Antwort löschen?'}</AlertDialogTitle>
            <AlertDialogDescription className="text-ws-muted">
              {deleteTarget?.type === 'post'
                ? 'Der Beitrag verschwindet mit allen Antworten. Im Papierkorb kannst du ihn 30 Tage lang zurückholen.'
                : 'Die Antwort verschwindet. Im Papierkorb kannst du sie 30 Tage lang zurückholen.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                void confirmDelete()
              }}
              className="bg-ws-red text-ws-on-accent hover:bg-ws-red-hover"
            >
              Löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
