'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { History, Loader2, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
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
import { AdminEmptyState, AdminErrorState, AdminLoadingState } from '@/components/admin/admin-states'

export type ContentType = 'question' | 'topic' | 'subject' | 'exam_question_set'

type VersionRow = {
  id: string
  versionNumber: number
  changeType: string
  data: Record<string, unknown>
  changedByName: string
  batchId: string | null
  createdAt: string
}

const CHANGE_TYPE_LABEL: Record<string, string> = {
  created: 'Angelegt',
  updated: 'Geändert',
  deactivated: 'Deaktiviert',
  activated: 'Aktiviert',
  deleted: 'Gelöscht',
  restored: 'Wiederhergestellt',
}

// Felder, die bei jedem Inhaltstyp vorkommen können, aber in der Vorschau
// nicht sinnvoll sind (IDs, Zeitstempel, interne Zählnummer).
const HIDDEN_FIELDS = new Set(['id', 'created_at', 'deleted_at', 'version_number', '_restored_from_version'])

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' })
}

function formatValue(v: unknown): string {
  if (v === null || v === undefined) return '—'
  if (typeof v === 'boolean') return v ? 'Ja' : 'Nein'
  if (Array.isArray(v) || typeof v === 'object') return JSON.stringify(v)
  return String(v)
}

/** Geänderte Felder zwischen zwei Versionen — Grundlage der rot/grün-Ansicht. */
function diffFields(older: Record<string, unknown> | null, newer: Record<string, unknown>) {
  const keys = new Set([...(older ? Object.keys(older) : []), ...Object.keys(newer)])
  const changes: { field: string; before: unknown; after: unknown }[] = []
  for (const key of keys) {
    if (HIDDEN_FIELDS.has(key)) continue
    const before = older ? older[key] : undefined
    const after = newer[key]
    if (JSON.stringify(before) !== JSON.stringify(after)) {
      changes.push({ field: key, before, after })
    }
  }
  return changes
}

export function ContentHistorySheet({
  open,
  onOpenChange,
  contentType,
  contentId,
  title,
  onRestored,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  contentType: ContentType
  contentId: string
  title: string
  onRestored?: () => void
}) {
  const [versions, setVersions] = useState<VersionRow[]>([])
  const [loading, setLoading] = useState(true)
  const [loadFailed, setLoadFailed] = useState(false)
  const [restoreTarget, setRestoreTarget] = useState<VersionRow | null>(null)
  const [restoring, setRestoring] = useState(false)

  useEffect(() => {
    if (!open) return
    void load()
  }, [open, contentType, contentId])

  async function load() {
    setLoading(true)
    setLoadFailed(false)
    try {
      const res = await fetch(`/api/admin/content-history/${contentType}/${contentId}`)
      if (!res.ok) throw new Error('load failed')
      const data = await res.json()
      setVersions(data.versions ?? [])
    } catch {
      setLoadFailed(true)
    } finally {
      setLoading(false)
    }
  }

  async function handleRestoreConfirmed() {
    if (!restoreTarget) return
    setRestoring(true)
    const res = await fetch(`/api/admin/content-history/${contentType}/${contentId}/restore`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ version_number: restoreTarget.versionNumber }),
    })
    const data = await res.json()
    if (!res.ok) {
      toast.error(data.error ?? 'Wiederherstellen fehlgeschlagen.')
    } else {
      toast.success(`Version vom ${formatDate(restoreTarget.createdAt)} wiederhergestellt.`)
      setRestoreTarget(null)
      await load()
      onRestored?.()
    }
    setRestoring(false)
  }

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
          className="bg-ws-surface border-ws-line text-ws-text w-full sm:max-w-lg overflow-y-auto"
        >
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2 text-ws-text">
              <History className="size-5 text-ws-blue" />
              Verlauf
            </SheetTitle>
            <SheetDescription className="text-ws-muted">{title}</SheetDescription>
          </SheetHeader>

          <div className="mt-4 space-y-3 px-1">
            {loadFailed ? (
              <AdminErrorState message="Der Verlauf konnte nicht geladen werden." onRetry={load} />
            ) : loading ? (
              <AdminLoadingState variant="list" rows={3} label="Verlauf wird geladen …" />
            ) : versions.length === 0 ? (
              <AdminEmptyState icon={History} title="Kein Verlauf" description="Für diesen Inhalt liegt noch keine Version vor." />
            ) : (
              versions.map((v, i) => {
                const older = versions[i + 1]?.data ?? null
                const changes = diffFields(older, v.data)
                const isCurrent = i === 0
                return (
                  <div key={v.id} className="rounded-xl border border-ws-line bg-ws-bg p-4 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <span className="text-sm font-semibold text-ws-text">
                          {CHANGE_TYPE_LABEL[v.changeType] ?? v.changeType}
                        </span>
                        <span className="ml-2 text-xs text-ws-faint">Version {v.versionNumber}</span>
                      </div>
                      {!isCurrent && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 gap-1.5 border-ws-line text-ws-text hover:bg-ws-raised"
                          onClick={() => setRestoreTarget(v)}
                        >
                          <RotateCcw className="size-3.5" />
                          Wiederherstellen
                        </Button>
                      )}
                    </div>
                    <div className="text-xs text-ws-muted">
                      {v.changedByName} · {formatDate(v.createdAt)}
                    </div>
                    {changes.length > 0 && (
                      <ul className="space-y-1 pt-1 text-xs">
                        {changes.map((c) => (
                          <li key={c.field} className="flex flex-col gap-0.5">
                            <span className="text-ws-faint">{c.field}</span>
                            {older && (
                              <span className="text-ws-red line-through break-words">{formatValue(c.before)}</span>
                            )}
                            <span className="text-ws-green break-words">{formatValue(c.after)}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={restoreTarget !== null} onOpenChange={(v) => !v && setRestoreTarget(null)}>
        <AlertDialogContent className="bg-ws-surface border-ws-line text-ws-text">
          <AlertDialogHeader>
            <AlertDialogTitle>Diese Version wiederherstellen?</AlertDialogTitle>
            <AlertDialogDescription className="text-ws-muted">
              {restoreTarget && `Setzt den Inhalt auf den Stand vom ${formatDate(restoreTarget.createdAt)} zurück. `}
              Das ist selbst eine Änderung und lässt sich genauso wieder zurücknehmen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={restoring}>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                handleRestoreConfirmed()
              }}
              disabled={restoring}
              className="bg-ws-green hover:bg-ws-green-hover text-ws-on-accent"
            >
              {restoring && <Loader2 className="size-4 mr-2 animate-spin" />}
              Wiederherstellen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
