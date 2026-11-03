'use client'

import { useEffect, useRef, useState } from 'react'
import { Loader2 } from 'lucide-react'
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
import { Progress } from '@/components/ui/progress'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  BULK_ACTION_LABEL,
  BULK_CHUNK_SIZE,
  BULK_SKIP_LABEL,
  chunk,
  previewNames,
  type BulkAction,
  type BulkResultItem,
} from '@/lib/user-bulk'

export type BulkRequest = {
  action: BulkAction
  targets: { id: string; name: string }[]
  /** Hinweis unter der Zahl, z. B. „2 sind schon gesperrt und werden ausgelassen“ */
  note?: string
  /** Ziel-Bereich (nur „Bereich ändern“); bei „Erneut versuchen“ schon bekannt */
  departmentId?: string
  /** Ohne Rückfrage sofort starten („Erneut versuchen“) */
  autoStart?: boolean
}

type DepartmentOption = { id: string; name: string }

interface DialogProps {
  request: BulkRequest | null
  onCancel: () => void
  onFinished: (action: BulkAction, results: BulkResultItem[], departmentId?: string) => void
}

const ACTION_BUTTON_CLASS: Record<BulkAction, string> = {
  ban: 'bg-ws-red hover:bg-ws-red-hover text-ws-on-accent',
  unban: 'bg-ws-green hover:bg-ws-green-hover text-ws-on-accent',
  move: 'bg-ws-green hover:bg-ws-green-hover text-ws-on-accent',
}

/**
 * Rückfrage und Fortschritt für Sammelaktionen (PROJ-61). Schickt die Auswahl in
 * Teilen an die Schnittstelle; bricht ein Teil ab, gelten die übrigen als
 * fehlgeschlagen und der Stand bleibt klar („120 von 300 erledigt“).
 */
export function UserBulkDialog({ request, onCancel, onFinished }: DialogProps) {
  const [departments, setDepartments] = useState<DepartmentOption[]>([])
  const [departmentId, setDepartmentId] = useState('')
  const [running, setRunning] = useState(false)
  const [progress, setProgress] = useState({ done: 0, total: 0 })
  const startedFor = useRef<BulkRequest | null>(null)

  async function run(req: BulkRequest, targetDepartment?: string) {
    const ids = req.targets.map((t) => t.id)
    const results: BulkResultItem[] = []
    setRunning(true)
    setProgress({ done: 0, total: ids.length })
    for (const part of chunk(ids, BULK_CHUNK_SIZE)) {
      let ok = false
      try {
        const res = await fetch('/api/admin/users/bulk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: req.action, ids: part, department_id: targetDepartment }),
        })
        if (res.ok) {
          const json = (await res.json()) as { results?: BulkResultItem[] }
          if (Array.isArray(json.results)) {
            results.push(...json.results)
            ok = true
          }
        }
      } catch (err) {
        console.error(err)
      }
      if (!ok) {
        // Alles, was noch nicht erledigt ist, gilt als fehlgeschlagen und lässt sich erneut versuchen
        for (const id of ids.slice(results.length)) results.push({ id, status: 'failed' })
        break
      }
      setProgress({ done: results.length, total: ids.length })
    }
    setRunning(false)
    onFinished(req.action, results, targetDepartment)
  }

  useEffect(() => {
    if (!request) {
      startedFor.current = null
      return
    }
    setDepartmentId(request.departmentId ?? '')
    if (request.autoStart && startedFor.current !== request) {
      startedFor.current = request
      void run(request, request.departmentId)
    }
    // run liest nur die Anfrage; sie wird pro Anfrage genau einmal gestartet
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request])

  const needsDepartment = request?.action === 'move'
  useEffect(() => {
    if (!request || !needsDepartment) return
    fetch('/api/admin/departments')
      .then((res) => (res.ok ? res.json() : { departments: [] }))
      .then((json) => setDepartments(json.departments ?? []))
      .catch(() => setDepartments([]))
  }, [request, needsDepartment])

  if (!request) return null
  const count = request.targets.length
  const label = BULK_ACTION_LABEL[request.action]
  const canStart = count > 0 && (!needsDepartment || departmentId !== '') && !running

  return (
    <AlertDialog
      open
      onOpenChange={(open) => {
        if (!open && !running) onCancel()
      }}
    >
      <AlertDialogContent className="bg-ws-surface border-ws-line text-ws-text">
        <AlertDialogHeader>
          <AlertDialogTitle>{running ? `${label.verb} läuft …` : label.title}</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3 text-ws-muted">
              <p>
                {count === 0
                  ? 'Für diese Auswahl ist nichts zu tun.'
                  : `${count} ${count === 1 ? 'Konto wird' : 'Konten werden'} ${label.done}: ${previewNames(request.targets.map((t) => t.name))}.`}
              </p>
              {request.note && <p className="text-sm">{request.note}</p>}
              {request.action === 'ban' && count > 0 && (
                <p className="text-sm">Gesperrte Personen können sich nicht mehr einloggen.</p>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        {needsDepartment && !running && (
          <Select value={departmentId} onValueChange={setDepartmentId}>
            <SelectTrigger
              aria-label="Ziel-Bereich"
              className="min-h-11 w-full rounded-xl bg-ws-bg border-ws-line text-ws-text"
            >
              <SelectValue placeholder="Ziel-Bereich wählen" />
            </SelectTrigger>
            <SelectContent className="bg-ws-surface border-ws-line text-ws-text">
              {departments.map((d) => (
                <SelectItem key={d.id} value={d.id} className="focus:bg-ws-raised focus:text-ws-text">
                  {d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {running && (
          <div className="space-y-2" aria-live="polite">
            <Progress
              value={progress.total ? (progress.done / progress.total) * 100 : 0}
              aria-label="Fortschritt"
              className="bg-ws-raised [&>div]:bg-ws-green"
            />
            <p className="text-sm text-ws-muted">
              {progress.done} von {progress.total} erledigt
            </p>
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={running}>Abbrechen</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault()
              if (canStart) void run(request, needsDepartment ? departmentId : undefined)
            }}
            disabled={!canStart}
            className={ACTION_BUTTON_CLASS[request.action]}
          >
            {running && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {label.verb}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

interface DetailsProps {
  details: { action: BulkAction; results: BulkResultItem[] } | null
  nameOf: (id: string) => string
  onClose: () => void
}

/** „Details“ zum Ergebnis: wer wurde übersprungen oder ist fehlgeschlagen, und warum */
export function UserBulkDetailsDialog({ details, nameOf, onClose }: DetailsProps) {
  const problems = details?.results.filter((r) => r.status !== 'done') ?? []
  return (
    <AlertDialog open={details !== null} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent className="bg-ws-surface border-ws-line text-ws-text">
        <AlertDialogHeader>
          <AlertDialogTitle>Details zum Ergebnis</AlertDialogTitle>
          <AlertDialogDescription className="text-ws-muted">
            Diese {problems.length === 1 ? 'Person wurde' : 'Personen wurden'} nicht bearbeitet.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <ul className="max-h-64 space-y-1 overflow-y-auto text-sm">
          {problems.map((r) => (
            <li key={r.id} className="flex justify-between gap-3">
              <span className="min-w-0 truncate text-ws-text" title={nameOf(r.id)}>
                {nameOf(r.id)}
              </span>
              <span className="shrink-0 text-ws-muted">
                {r.status === 'skipped' ? `übersprungen: ${BULK_SKIP_LABEL[r.reason]}` : 'fehlgeschlagen'}
              </span>
            </li>
          ))}
        </ul>
        <AlertDialogFooter>
          <AlertDialogCancel>Schließen</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
