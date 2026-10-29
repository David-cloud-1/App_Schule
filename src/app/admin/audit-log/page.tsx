'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Info, Loader2, Undo2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
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
import { useAdminRole } from '@/components/admin/admin-role-provider'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination'
import { AdminPageHeader } from '@/components/admin/admin-page-header'
import { AdminErrorState } from '@/components/admin/admin-states'

type AuditEntry = {
  id: string
  created_at: string
  admin_id: string
  admin_name: string | null
  action_type: string
  object_type: string
  object_id: string | null
  object_label: string | null
  details: Record<string, unknown> | null
}

type AuditResponse = {
  entries: AuditEntry[]
  total: number
  page: number
  totalPages: number
}

const ACTION_TYPES = [
  { value: 'all', label: 'Alle Aktionen' },
  { value: 'question.create', label: 'Frage erstellt' },
  { value: 'question.update', label: 'Frage aktualisiert' },
  { value: 'question.delete', label: 'Frage gelöscht' },
  { value: 'question.activate', label: 'Frage aktiviert' },
  { value: 'question.deactivate', label: 'Frage deaktiviert' },
  { value: 'question.bulk_import', label: 'CSV-Import' },
  { value: 'question.restore', label: 'Frage wiederherstellt' },
  { value: 'batch.rollback', label: 'Vorgang zurückgenommen' },
  { value: 'subject.create', label: 'Fach erstellt' },
  { value: 'subject.update', label: 'Fach aktualisiert' },
  { value: 'subject.activate', label: 'Fach aktiviert' },
  { value: 'subject.deactivate', label: 'Fach deaktiviert' },
  { value: 'user.ban', label: 'Nutzer gesperrt' },
  { value: 'user.unban', label: 'Nutzer entsperrt' },
  { value: 'user.role_change', label: 'Rolle geändert' },
  { value: 'user.move_department', label: 'Bereich gewechselt' },
  { value: 'user.password_set', label: 'Passwort neu vergeben' },
  { value: 'forum.hide', label: 'Lehrerzimmer: ausgeblendet' },
  { value: 'forum.unhide', label: 'Lehrerzimmer: eingeblendet' },
]

const ACTION_LABEL = new Map(ACTION_TYPES.map((t) => [t.value, t.label]))

type BatchPreview = { batchId: string; affectedCount: number; conflicts: { contentType: string; contentId: string }[] }

export default function AdminAuditLogPage() {
  const { role } = useAdminRole()
  const isSuperAdmin = role === 'admin'
  const [period, setPeriod] = useState<'7d' | '30d' | 'all'>('30d')
  const [actionType, setActionType] = useState<string>('all')
  const [page, setPage] = useState(1)
  const [data, setData] = useState<AuditResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadFailed, setLoadFailed] = useState(false)
  const [preview, setPreview] = useState<BatchPreview | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [rollingBack, setRollingBack] = useState(false)

  useEffect(() => {
    setPage(1)
  }, [period, actionType])

  const load = useCallback(async () => {
    setLoading(true)
    setLoadFailed(false)
    try {
      const params = new URLSearchParams()
      params.set('period', period)
      if (actionType !== 'all') params.set('action_type', actionType)
      params.set('page', String(page))

      const res = await fetch(`/api/admin/audit-log?${params.toString()}`)
      if (!res.ok) {
        setLoadFailed(true)
        return
      }
      const json = (await res.json()) as AuditResponse
      setData(json)
    } catch (err) {
      console.error(err)
      setLoadFailed(true)
    } finally {
      setLoading(false)
    }
  }, [period, actionType, page])

  useEffect(() => {
    load()
  }, [load])

  async function openBatchPreview(batchId: string) {
    setPreviewLoading(true)
    try {
      const res = await fetch(`/api/admin/content-history/batches/${batchId}`)
      const json = await res.json()
      if (!res.ok) {
        toast.error(json.error ?? 'Vorgang konnte nicht geladen werden.')
        return
      }
      setPreview(json)
    } finally {
      setPreviewLoading(false)
    }
  }

  async function confirmRollback() {
    if (!preview) return
    setRollingBack(true)
    try {
      const res = await fetch(`/api/admin/content-history/batches/${preview.batchId}`, { method: 'POST' })
      const json = await res.json()
      if (!res.ok) {
        toast.error(json.error ?? 'Zurücknehmen fehlgeschlagen.')
      } else {
        toast.success(`${json.restored} Inhalte zurückgenommen${json.skipped ? `, ${json.skipped} übersprungen` : ''}.`)
        setPreview(null)
        load()
      }
    } finally {
      setRollingBack(false)
    }
  }

  const entries = data?.entries ?? []
  const totalPages = data?.totalPages ?? 0
  const total = data?.total ?? 0

  const pageNumbers = useMemo(() => {
    if (totalPages <= 1) return []
    const result: number[] = []
    const maxVisible = 5
    let start = Math.max(1, page - 2)
    const end = Math.min(totalPages, start + maxVisible - 1)
    if (end - start + 1 < maxVisible) start = Math.max(1, end - maxVisible + 1)
    for (let i = start; i <= end; i++) result.push(i)
    return result
  }, [totalPages, page])

  return (
    <div className="space-y-6">
      <AdminPageHeader title="Änderungsprotokoll" description={`${total} ${total === 1 ? 'Eintrag' : 'Einträge'}`} />

      <div className="flex flex-wrap gap-3">
        <Select value={period} onValueChange={(v) => setPeriod(v as typeof period)}>
          <SelectTrigger className="w-[180px] bg-ws-surface border-ws-line text-ws-text">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-ws-surface border-ws-line text-ws-text">
            <SelectItem value="7d">Letzte 7 Tage</SelectItem>
            <SelectItem value="30d">Letzte 30 Tage</SelectItem>
            <SelectItem value="all">Alle Zeiträume</SelectItem>
          </SelectContent>
        </Select>
        <Select value={actionType} onValueChange={setActionType}>
          <SelectTrigger className="w-[220px] bg-ws-surface border-ws-line text-ws-text">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-ws-surface border-ws-line text-ws-text">
            {ACTION_TYPES.map((a) => (
              <SelectItem key={a.value} value={a.value}>
                {a.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loadFailed ? (
        <AdminErrorState message="Das Änderungsprotokoll konnte gerade nicht geladen werden." onRetry={load} />
      ) : (
        <div className="ws-table-scroll ws-table-sticky border border-ws-line rounded-2xl overflow-hidden bg-ws-surface">
          <Table>
            <TableHeader>
              <TableRow className="bg-ws-bg hover:bg-ws-bg border-ws-line">
                <TableHead className="text-ws-muted">Zeitstempel</TableHead>
                <TableHead className="text-ws-muted">Admin</TableHead>
                <TableHead className="text-ws-muted">Aktion</TableHead>
                <TableHead className="text-ws-muted">Objekt-Typ</TableHead>
                <TableHead className="text-ws-muted">Objekt</TableHead>
                {isSuperAdmin && <TableHead className="text-ws-muted">Vorgang</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={`sk-${i}`} className="border-ws-line">
                    {Array.from({ length: isSuperAdmin ? 6 : 5 }).map((__, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-24" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : entries.length === 0 ? (
                <TableRow className="border-ws-line">
                  <TableCell colSpan={isSuperAdmin ? 6 : 5} className="py-10">
                    <div className="flex flex-col items-center gap-2 text-ws-muted text-sm">
                      <Info className="w-5 h-5" />
                      Das Änderungsprotokoll füllt sich nach der ersten Admin-Aktion.
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                entries.map((e) => (
                  <TableRow key={e.id} className="border-ws-line hover:bg-ws-bg/40">
                    <TableCell className="text-xs text-ws-muted">
                      {formatDateTime(e.created_at)}
                    </TableCell>
                    <TableCell className="text-ws-text text-sm">
                      {e.admin_name ?? e.admin_id.slice(0, 8)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className="border-ws-line text-ws-green text-xs"
                        title={e.action_type}
                      >
                        {ACTION_LABEL.get(e.action_type) ?? e.action_type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-ws-muted text-sm">{e.object_type}</TableCell>
                    <TableCell className="text-ws-text text-sm max-w-[280px] truncate">
                      {e.object_label ?? e.object_id ?? '—'}
                    </TableCell>
                    {isSuperAdmin && (
                      <TableCell>
                        {typeof e.details?.batchId === 'string' && (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={previewLoading}
                            onClick={() => openBatchPreview(e.details!.batchId as string)}
                            className="h-8 gap-1.5 border-ws-line text-ws-text hover:bg-ws-raised"
                          >
                            <Undo2 className="size-3.5" />
                            Zurücknehmen
                          </Button>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {totalPages > 1 && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href="#"
                onClick={(e) => {
                  e.preventDefault()
                  if (page > 1) setPage(page - 1)
                }}
                className={page === 1 ? 'pointer-events-none opacity-50' : ''}
              />
            </PaginationItem>
            {pageNumbers.map((n) => (
              <PaginationItem key={n}>
                <PaginationLink
                  href="#"
                  isActive={n === page}
                  onClick={(e) => {
                    e.preventDefault()
                    setPage(n)
                  }}
                >
                  {n}
                </PaginationLink>
              </PaginationItem>
            ))}
            <PaginationItem>
              <PaginationNext
                href="#"
                onClick={(e) => {
                  e.preventDefault()
                  if (page < totalPages) setPage(page + 1)
                }}
                className={page === totalPages ? 'pointer-events-none opacity-50' : ''}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}

      <AlertDialog open={preview !== null} onOpenChange={(v) => !v && setPreview(null)}>
        <AlertDialogContent className="bg-ws-surface border-ws-line text-ws-text">
          <AlertDialogHeader>
            <AlertDialogTitle>Vorgang zurücknehmen?</AlertDialogTitle>
            <AlertDialogDescription className="text-ws-muted space-y-2">
              <span className="block">
                {preview?.affectedCount} betroffene Inhalte werden auf den Stand vor diesem Vorgang zurückgesetzt.
              </span>
              {preview && preview.conflicts.length > 0 && (
                <span className="block text-ws-orange">
                  {preview.conflicts.length} davon wurden seither von jemand anderem weiter bearbeitet und werden
                  dabei übersprungen, statt überschrieben zu werden.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={rollingBack}>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                confirmRollback()
              }}
              disabled={rollingBack}
              className="bg-ws-green hover:bg-ws-green-hover text-ws-on-accent"
            >
              {rollingBack && <Loader2 className="size-4 mr-2 animate-spin" />}
              Zurücknehmen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function formatDateTime(value: string): string {
  try {
    return new Date(value).toLocaleString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return value
  }
}
