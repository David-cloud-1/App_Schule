'use client'

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Loader2, RotateCcw, Trash2 } from 'lucide-react'
import { AdminEmptyState, AdminErrorState, AdminLoadingState } from '@/components/admin/admin-states'
import { useOptionalAdminRole } from '@/components/admin/admin-role-provider'
import { DepartmentTag } from '@/components/admin/content-meta'
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

/** Inhaltstypen; `forum` = Beiträge und Antworten im Lehrerzimmer (PROJ-63, 30 Tage) */
export type TrashType = 'question' | 'topic' | 'subject' | 'exam_question_set' | 'forum'

const NOUN: Record<TrashType, string> = {
  question: 'Fragen',
  topic: 'Themen',
  subject: 'Fächer',
  exam_question_set: 'Übungsprüfungen',
  forum: 'Beiträge',
}

type TrashItem = {
  id: string
  deleted_at: string
  question_text?: string
  name?: string
  code?: string
  kind?: 'post' | 'reply'
  title?: string
  snippet?: string
  department_name?: string | null
  department_code?: string | null
  deleted_by?: string | null
}

function labelOf(type: TrashType, i: TrashItem): string {
  if (type === 'question') return i.question_text ?? '—'
  if (type === 'subject') return `${i.code ?? ''} — ${i.name ?? ''}`
  if (type === 'forum') {
    return i.kind === 'reply' ? `Antwort in „${i.title ?? ''}“: ${i.snippet ?? ''}` : `${i.title ?? ''} — ${i.snippet ?? ''}`
  }
  return i.name ?? '—'
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' })
}

/**
 * Gelöschte Inhalte eines Typs (PROJ-47/70), seit PROJ-131 an den Seiten, zu
 * denen sie gehören: „Lerninhalte“, „Übungsprüfungen“ und Lehrerzimmer.
 * Endgültig entfernen darf nur der Super-Admin.
 */
export function TrashList({ type, onChanged }: { type: TrashType; onChanged?: () => void }) {
  const isSuperAdmin = useOptionalAdminRole()?.role === 'admin'
  const [items, setItems] = useState<TrashItem[]>([])
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [purgeTarget, setPurgeTarget] = useState<TrashItem | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setFailed(false)
    try {
      const res = await fetch(type === 'forum' ? '/api/admin/lehrerzimmer/trash' : `/api/admin/trash?type=${type}`)
      if (!res.ok) throw new Error('load failed')
      const data = await res.json()
      setItems(data.items ?? [])
    } catch {
      setFailed(true)
    } finally {
      setLoading(false)
    }
  }, [type])

  useEffect(() => {
    setItems([])
    load()
  }, [load])

  async function send(item: TrashItem, url: string, method: 'POST' | 'DELETE', success: string, fallback: string) {
    setBusyId(item.id)
    try {
      const res = await fetch(url, { method })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(data?.error ?? fallback)
        return
      }
      toast.success(success)
      setItems((prev) => prev.filter((i) => i.id !== item.id))
      onChanged?.()
    } catch {
      toast.error('Netzwerkfehler')
    } finally {
      setBusyId(null)
    }
  }

  const restore = (item: TrashItem) =>
    send(
      item,
      type === 'forum'
        ? `/api/admin/lehrerzimmer/${item.kind === 'reply' ? 'replies' : 'posts'}/${item.id}/restore`
        : `/api/admin/trash/${type}/${item.id}`,
      'POST',
      'Wiederhergestellt.',
      'Wiederherstellen fehlgeschlagen.',
    )

  if (failed) return <AdminErrorState message="Der Papierkorb konnte nicht geladen werden." onRetry={load} />
  if (loading) return <AdminLoadingState variant="list" rows={4} label="Papierkorb wird geladen …" />
  if (items.length === 0) {
    return <AdminEmptyState icon={Trash2} title="Papierkorb leer" description={`Keine gelöschten ${NOUN[type]}.`} />
  }

  return (
    <>
      <ul className="divide-y divide-ws-line overflow-hidden rounded-2xl border border-ws-line bg-ws-surface">
        {items.map((item) => (
          <li key={item.id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <div className="min-w-0 break-words text-sm text-ws-text sm:truncate" title={labelOf(type, item)}>
                  {labelOf(type, item)}
                </div>
                <DepartmentTag name={item.department_name} code={item.department_code} />
              </div>
              <div className="text-xs text-ws-muted">
                Gelöscht{item.deleted_by ? ` von ${item.deleted_by}` : ''} am {formatDate(item.deleted_at)}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                disabled={busyId === item.id}
                onClick={() => restore(item)}
                className="min-h-11 gap-1.5 rounded-xl border-ws-line text-ws-text hover:bg-ws-raised"
              >
                {busyId === item.id ? (
                  <Loader2 className="size-3.5 animate-spin" aria-hidden />
                ) : (
                  <RotateCcw className="size-3.5" aria-hidden />
                )}
                Wiederherstellen
              </Button>
              {isSuperAdmin && type !== 'forum' && (
                <Button
                  variant="ghost"
                  disabled={busyId === item.id}
                  onClick={() => setPurgeTarget(item)}
                  className="size-11 text-ws-muted hover:text-ws-red"
                  aria-label={`Endgültig entfernen: ${labelOf(type, item).slice(0, 60)}`}
                  title="Endgültig entfernen"
                >
                  <Trash2 className="size-4" aria-hidden />
                </Button>
              )}
            </div>
          </li>
        ))}
      </ul>

      <AlertDialog open={purgeTarget !== null} onOpenChange={(v) => !v && setPurgeTarget(null)}>
        <AlertDialogContent className="border-ws-line bg-ws-surface text-ws-text">
          <AlertDialogHeader>
            <AlertDialogTitle>Endgültig entfernen?</AlertDialogTitle>
            <AlertDialogDescription className="text-ws-muted">
              Dieser Inhalt wird unwiderruflich gelöscht und lässt sich danach nicht mehr wiederherstellen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="min-h-11">Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                const target = purgeTarget
                setPurgeTarget(null)
                if (target) {
                  send(target, `/api/admin/trash/${type}/${target.id}`, 'DELETE', 'Endgültig entfernt.', 'Endgültiges Löschen fehlgeschlagen.')
                }
              }}
              className="min-h-11 bg-ws-red text-ws-on-accent hover:bg-ws-red-hover"
            >
              Endgültig entfernen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
