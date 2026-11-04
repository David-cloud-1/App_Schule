'use client'

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Loader2, Undo2, Users, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useOptionalAdminRole } from '@/components/admin/admin-role-provider'
import { AdminEmptyState, AdminErrorState, AdminLoadingState } from '@/components/admin/admin-states'

type Person = { personId: string | null; name: string; created: number; updated: number; deleted: number; restored: number }
type ChangeEntry = {
  id: string
  contentType: string
  contentId: string
  versionNumber: number
  changeType: string
  batchId: string | null
  createdAt: string
  changedByName: string | null
  departmentName: string | null
}
type RevertPreview = {
  total: number
  toRestore: number
  toTrash: number
  conflictCount: number
  skippedCount: number
  conflicts: { contentType: string; contentId: string; title: string | null }[]
}

const PERIODS = [
  { value: '7', label: 'Letzte 7 Tage' },
  { value: '30', label: 'Letzte 30 Tage' },
  { value: '90', label: 'Letzte 90 Tage' },
  { value: '365', label: 'Letztes Jahr' },
] as const

const TYPE_LABEL: Record<string, string> = {
  question: 'Frage',
  topic: 'Thema',
  subject: 'Fach',
  exam_question_set: 'Prüfungsset',
}
const CHANGE_LABEL: Record<string, string> = {
  created: 'Angelegt',
  updated: 'Geändert',
  deactivated: 'Deaktiviert',
  activated: 'Aktiviert',
  deleted: 'Gelöscht',
  restored: 'Wiederhergestellt',
}

function periodRange(days: string) {
  const to = new Date()
  const from = new Date(to.getTime() - Number(days) * 24 * 60 * 60 * 1000)
  return { from: from.toISOString(), to: to.toISOString() }
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' })
}

/**
 * Änderungen an Inhalten (PROJ-70, nur Super-Admin): Zusammenfassung je Person,
 * Protokoll mit Filtern und die gesammelte Rücknahme aller Änderungen einer
 * Person im Zeitraum — mit Vorschau, Konflikten einzeln und Umkehren.
 */
export function ContentChangesPanel() {
  // Der Bereich kommt aus der Bereichsleiste im Seitenkopf (PROJ-70); null = Alle Bereiche
  const scopeDepartment = useOptionalAdminRole()?.scope?.current ?? null
  const [days, setDays] = useState('30')
  const [people, setPeople] = useState<Person[]>([])
  const [loading, setLoading] = useState(true)
  const [loadFailed, setLoadFailed] = useState(false)

  const [person, setPerson] = useState<Person | null>(null)
  const [typeFilter, setTypeFilter] = useState('all')
  const [changeFilter, setChangeFilter] = useState('all')
  const departmentFilter = scopeDepartment ?? 'all'
  const [subjectFilter, setSubjectFilter] = useState('all')
  const [subjects, setSubjects] = useState<{ id: string; code: string; name: string; department_id?: string }[]>([])
  const [entries, setEntries] = useState<ChangeEntry[]>([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [entriesLoading, setEntriesLoading] = useState(false)

  const [preview, setPreview] = useState<RevertPreview | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [includeConflicts, setIncludeConflicts] = useState(false)
  const [reverting, setReverting] = useState(false)

  const loadPeople = useCallback(async () => {
    setLoading(true)
    setLoadFailed(false)
    try {
      const { from, to } = periodRange(days)
      const peopleParams = new URLSearchParams({ from, to })
      if (scopeDepartment) peopleParams.set('department_id', scopeDepartment)
      const res = await fetch(`/api/admin/content-history/people?${peopleParams}`)
      if (!res.ok) throw new Error('load failed')
      setPeople((await res.json()).people ?? [])
    } catch {
      setLoadFailed(true)
    } finally {
      setLoading(false)
    }
  }, [days, scopeDepartment])

  useEffect(() => {
    void loadPeople()
  }, [loadPeople])

  const loadEntries = useCallback(
    async (pageNumber: number, append: boolean) => {
      if (!person?.personId) return
      setEntriesLoading(true)
      try {
        const { from, to } = periodRange(days)
        const params = new URLSearchParams({ person: person.personId, from, to, page: String(pageNumber) })
        if (typeFilter !== 'all') params.set('type', typeFilter)
        if (changeFilter !== 'all') params.set('change_type', changeFilter)
        if (departmentFilter !== 'all') params.set('department_id', departmentFilter)
        if (subjectFilter !== 'all') params.set('subject_id', subjectFilter)
        const res = await fetch(`/api/admin/content-history/changes?${params}`)
        if (!res.ok) throw new Error('load failed')
        const json = await res.json()
        setEntries((prev) => (append ? [...prev, ...(json.entries ?? [])] : (json.entries ?? [])))
        setPage(pageNumber)
        setTotalPages(json.totalPages ?? 0)
      } catch {
        toast.error('Das Protokoll konnte nicht geladen werden.')
      } finally {
        setEntriesLoading(false)
      }
    },
    [person, days, typeFilter, changeFilter, departmentFilter, subjectFilter]
  )

  // Fächer für den Fach-Filter einmal laden, sobald eine Person gewählt ist
  useEffect(() => {
    if (!person || subjects.length > 0) return
    fetch('/api/admin/subjects')
      .then((res) => (res.ok ? res.json() : { subjects: [] }))
      .then((json) => setSubjects(json.subjects ?? []))
      .catch(() => {})
  }, [person, subjects.length])

  useEffect(() => {
    if (person) void loadEntries(1, false)
  }, [person, loadEntries])

  async function openRevertPreview() {
    if (!person?.personId) return
    setPreviewLoading(true)
    setIncludeConflicts(false)
    try {
      const { from, to } = periodRange(days)
      const res = await fetch(`/api/admin/content-history/people/${person.personId}/preview?${new URLSearchParams({ from, to })}`)
      const json = await res.json()
      if (!res.ok) {
        toast.error(json.error ?? 'Die Vorschau konnte nicht erstellt werden.')
        return
      }
      setPreview(json)
    } finally {
      setPreviewLoading(false)
    }
  }

  async function undoBatch(batchId: string) {
    const res = await fetch(`/api/admin/content-history/batches/${batchId}`, { method: 'POST' })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) {
      toast.error(json.error ?? 'Das Umkehren ist fehlgeschlagen.')
      return
    }
    toast.success(`${json.restored} Inhalte wieder hergestellt.`)
    void loadPeople()
    if (person) void loadEntries(1, false)
  }

  async function confirmRevert() {
    if (!person?.personId) return
    setReverting(true)
    try {
      const { from, to } = periodRange(days)
      const res = await fetch(`/api/admin/content-history/people/${person.personId}/revert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from, to, includeConflicts }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(json.error ?? 'Die Rücknahme ist fehlgeschlagen.')
        if (json.batchId) void loadPeople()
        setPreview(null)
        return
      }
      setPreview(null)
      toast.success(
        `${json.restored} Inhalte zurückgenommen${json.skipped ? `, ${json.skipped} übersprungen` : ''}.`,
        json.batchId ? { action: { label: 'Rücknahme umkehren', onClick: () => void undoBatch(json.batchId) } } : undefined
      )
      void loadPeople()
      void loadEntries(1, false)
    } finally {
      setReverting(false)
    }
  }

  const selectClass = 'min-h-11 w-[190px] border-ws-line bg-ws-surface text-ws-text'
  const contentClass = 'border-ws-line bg-ws-surface text-ws-text'

  return (
    <section className="space-y-4" aria-label="Änderungen an Inhalten">
      <div className="flex flex-wrap items-center gap-3">
        <Select value={days} onValueChange={(v) => { setDays(v); setPerson(null) }}>
          <SelectTrigger aria-label="Zeitraum" className={selectClass}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent className={contentClass}>
            {PERIODS.map((p) => (
              <SelectItem key={p.value} value={p.value}>
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-sm text-ws-muted">Änderungen an Fragen, Themen, Fächern und Prüfungssets je Person.</p>
      </div>

      {loadFailed ? (
        <AdminErrorState message="Die Auswertung konnte gerade nicht geladen werden." onRetry={loadPeople} />
      ) : loading ? (
        <AdminLoadingState variant="table" rows={4} label="Auswertung wird geladen …" />
      ) : people.length === 0 ? (
        <AdminEmptyState icon={Users} title="Keine Änderungen" description="In diesem Zeitraum hat niemand Inhalte geändert." />
      ) : (
        <div className="ws-table-scroll ws-table-sticky rounded-2xl border border-ws-line bg-ws-surface">
          <Table>
            <TableHeader>
              <TableRow className="border-ws-line bg-ws-bg hover:bg-ws-bg">
                <TableHead className="text-ws-muted">Person</TableHead>
                <TableHead className="text-right text-ws-muted">Angelegt</TableHead>
                <TableHead className="text-right text-ws-muted">Geändert</TableHead>
                <TableHead className="text-right text-ws-muted">Gelöscht</TableHead>
                <TableHead className="text-right text-ws-muted">Wiederhergestellt</TableHead>
                <TableHead className="text-right text-ws-muted">Aktion</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {people.map((p) => (
                <TableRow key={p.personId ?? p.name} className="border-ws-line">
                  <TableCell className="font-medium text-ws-text">{p.name}</TableCell>
                  <TableCell className="text-right tabular-nums">{p.created}</TableCell>
                  <TableCell className="text-right tabular-nums">{p.updated}</TableCell>
                  <TableCell className="text-right tabular-nums">{p.deleted}</TableCell>
                  <TableCell className="text-right tabular-nums">{p.restored}</TableCell>
                  <TableCell className="text-right">
                    {p.personId && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPerson(p)}
                        className="min-h-11 border-ws-line text-ws-text hover:bg-ws-raised"
                      >
                        Änderungen ansehen
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {person && (
        <div className="space-y-3 rounded-2xl border border-ws-line bg-ws-surface p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-ws-text">Änderungen von {person.name}</h2>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={openRevertPreview}
                disabled={previewLoading}
                className="min-h-11 gap-2 border-ws-line text-ws-text hover:bg-ws-raised"
              >
                {previewLoading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Undo2 className="size-4" aria-hidden />}
                Alle zurücknehmen
              </Button>
              <Button
                variant="ghost"
                onClick={() => setPerson(null)}
                aria-label="Person schließen"
                className="min-h-11 text-ws-muted hover:text-ws-text"
              >
                <X className="size-4" aria-hidden />
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger aria-label="Inhaltstyp" className={selectClass}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className={contentClass}>
                <SelectItem value="all">Alle Inhalte</SelectItem>
                {Object.entries(TYPE_LABEL).map(([v, l]) => (
                  <SelectItem key={v} value={v}>{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={changeFilter} onValueChange={setChangeFilter}>
              <SelectTrigger aria-label="Art der Änderung" className={selectClass}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className={contentClass}>
                <SelectItem value="all">Alle Arten</SelectItem>
                {Object.entries(CHANGE_LABEL).map(([v, l]) => (
                  <SelectItem key={v} value={v}>{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {subjects.length > 0 && (
              <Select value={subjectFilter} onValueChange={setSubjectFilter}>
                <SelectTrigger aria-label="Fach" className={selectClass}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className={contentClass}>
                  <SelectItem value="all">Alle Fächer</SelectItem>
                  {subjects
                    .filter((x) => departmentFilter === 'all' || x.department_id === departmentFilter)
                    .map((x) => (
                      <SelectItem key={x.id} value={x.id}>{x.code} – {x.name}</SelectItem>
                    ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {entriesLoading && entries.length === 0 ? (
            <AdminLoadingState variant="list" rows={3} label="Protokoll wird geladen …" />
          ) : entries.length === 0 ? (
            <p className="text-sm text-ws-muted">Mit diesem Filter gibt es keine Änderungen.</p>
          ) : (
            <ul className="divide-y divide-ws-line text-sm">
              {entries.map((e) => (
                <li key={e.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2">
                  <span className="font-semibold text-ws-text">{CHANGE_LABEL[e.changeType] ?? e.changeType}</span>
                  <span className="text-ws-muted">{TYPE_LABEL[e.contentType] ?? e.contentType}</span>
                  {e.departmentName && <span className="text-ws-muted">· {e.departmentName}</span>}
                  <span className="ml-auto text-xs text-ws-faint">{formatDate(e.createdAt)}</span>
                </li>
              ))}
            </ul>
          )}
          {page < totalPages && (
            <Button
              variant="outline"
              onClick={() => loadEntries(page + 1, true)}
              disabled={entriesLoading}
              className="min-h-11 border-ws-line text-ws-text hover:bg-ws-raised"
            >
              {entriesLoading && <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />}
              Mehr laden
            </Button>
          )}
        </div>
      )}

      <AlertDialog open={preview !== null} onOpenChange={(v) => !v && setPreview(null)}>
        <AlertDialogContent className="max-h-[85vh] overflow-y-auto border-ws-line bg-ws-surface text-ws-text">
          <AlertDialogHeader>
            <AlertDialogTitle>Alle Änderungen von {person?.name} zurücknehmen?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-ws-muted">
                {preview && preview.total === 0 ? (
                  <p>Es gibt nichts zurückzunehmen.</p>
                ) : (
                  preview && (
                    <>
                      <p>
                        Betroffen: <strong className="text-ws-text">{preview.total}</strong> Inhalte
                        ({preview.toRestore} werden zurückgesetzt, {preview.toTrash} in den Papierkorb gelegt).
                      </p>
                      <p>Das ist selbst ein Vorgang und lässt sich als Ganzes wieder umkehren.</p>
                      {preview.conflictCount > 0 && (
                        <div className="rounded-xl border border-ws-orange/30 bg-ws-orange/15 p-3 text-ws-orange">
                          <p className="font-semibold">
                            {preview.conflictCount} Inhalte hat seitdem jemand anderes weiter bearbeitet. Sie bleiben standardmäßig unberührt.
                          </p>
                          <ul className="mt-1 list-disc pl-5 text-sm">
                            {preview.conflicts.slice(0, 10).map((c) => (
                              <li key={`${c.contentType}-${c.contentId}`} className="break-words">
                                {TYPE_LABEL[c.contentType] ?? c.contentType}: {c.title ?? c.contentId}
                              </li>
                            ))}
                          </ul>
                          {preview.conflictCount > 10 && <p className="text-sm">… und {preview.conflictCount - 10} weitere.</p>}
                          <div className="mt-2 flex min-h-11 items-center gap-2">
                            <Checkbox
                              id="include-conflicts"
                              checked={includeConflicts}
                              onCheckedChange={(c) => setIncludeConflicts(c === true)}
                            />
                            <Label htmlFor="include-conflicts" className="text-sm text-ws-text">
                              Diese Inhalte trotzdem überschreiben
                            </Label>
                          </div>
                        </div>
                      )}
                    </>
                  )
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={reverting}>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              disabled={reverting || !preview || preview.total === 0}
              onClick={(e) => {
                e.preventDefault()
                void confirmRevert()
              }}
              className="bg-ws-red text-ws-on-accent hover:bg-ws-red-hover"
            >
              {reverting && <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />}
              Zurücknehmen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  )
}
