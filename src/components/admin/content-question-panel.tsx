'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { FileQuestion, Search, SearchX } from 'lucide-react'
import { AdminSegmented } from '@/components/admin/admin-segmented'
import { AdminEmptyState, AdminErrorState, AdminLoadingState } from '@/components/admin/admin-states'
import { ContentHistorySheet } from '@/components/admin/content-history-sheet'
import { showVersionConflict } from '@/components/admin/content-meta'
import { QuestionBulkBar, type BulkChange } from '@/components/admin/question-bulk-bar'
import { QuestionFormModal, type AdminSubject } from '@/components/admin/question-form-modal'
import { QuestionListItem, type ListQuestion } from '@/components/admin/question-list-item'
import { useClassLevelOptions } from '@/components/department-provider'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
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
import { NO_TOPIC, type ClassFilter, type ContentTree, type TreeSubject, type TreeTopic } from '@/lib/content-tree'
import { formatQuestionTotals, type QuestionTotals } from '@/lib/question-count'

/** Muss zur Seitengröße der Fragen-Schnittstelle passen */
export const LIST_PAGE_SIZE = 25
const BULK_CHUNK = 200
const UNDO_MS = 7000

export type StatusFilter = 'all' | 'active' | 'inactive'

const STATUS_OPTIONS = [
  { value: 'all', label: 'Alle Fragen' },
  { value: 'active', label: 'Für Azubis sichtbar' },
  { value: 'inactive', label: 'Ausgeblendet' },
] as const

function useDebounced<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

type ListData = { questions: ListQuestion[]; total: number }

/**
 * Reiter „Fragen“ (PROJ-131): Fragen der Auswahl im Baum, Suche über alle
 * Fächer, ein Filter, Aufklappen (B102), „Weitere 25“ (B39), Ausblenden mit
 * „Rückgängig“ (B40) und Mehrfachauswahl (E4). `subject: null` = „Alle Fächer“.
 */
export function ContentQuestionPanel({
  subject,
  topic,
  klasse,
  tree,
  totals,
  subjects,
  initialSearch = '',
  onSearchChange,
  reloadKey = 0,
  onAdd,
  onChanged,
}: {
  subject: TreeSubject | null
  topic: TreeTopic | typeof NO_TOPIC | null
  klasse: ClassFilter
  tree: ContentTree
  /** Zahlen der Auswahl aus dem Baum — dieselben wie links (B35) */
  totals: QuestionTotals
  subjects: AdminSubject[]
  initialSearch?: string
  /** Gibt den (verzögerten) Suchbegriff weiter, damit er in der Adresse steht und eine Baum-Auswahl ihn nicht löscht */
  onSearchChange?: (value: string) => void
  /** Hochzählen lädt die Liste neu (z. B. nach „Fragen hinzufügen“) */
  reloadKey?: number
  onAdd: () => void
  /** Nach Anlegen, Bearbeiten, Löschen: Baum und Zähler neu laden */
  onChanged: () => void
}) {
  const [rows, setRows] = useState<ListQuestion[]>([])
  const [total, setTotal] = useState<number | null>(null)
  const [pages, setPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [failed, setFailed] = useState(false)
  const [status, setStatus] = useState<StatusFilter>('all')
  const [search, setSearch] = useState(initialSearch)
  const debouncedSearch = useDebounced(search.trim(), 300)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [editing, setEditing] = useState<ListQuestion | null>(null)
  const [template, setTemplate] = useState<ListQuestion | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ListQuestion | null>(null)
  const [bulkConfirm, setBulkConfirm] = useState<'hide' | 'delete' | null>(null)
  const [busy, setBusy] = useState(false)
  const [historyTarget, setHistoryTarget] = useState<ListQuestion | null>(null)
  const requestId = useRef(0)
  const pagesRef = useRef(1)
  const classLevels = useClassLevelOptions()

  const topicKey = topic === null ? '' : topic === NO_TOPIC ? NO_TOPIC : topic.id
  const topicName = topic === null ? null : topic === NO_TOPIC ? 'Ohne Thema' : topic.name
  const searching = debouncedSearch !== ''
  const searchSyncedRef = useRef(initialSearch.trim())
  useEffect(() => {
    if (debouncedSearch === searchSyncedRef.current) return
    searchSyncedRef.current = debouncedSearch
    onSearchChange?.(debouncedSearch)
  }, [debouncedSearch, onSearchChange])
  const filtered = searching || status !== 'all'

  const buildParams = useCallback(
    (page: number) => {
      const params = new URLSearchParams({ page: String(page), status })
      // Eine Suche läuft über alle Fächer des Bereichs, nicht nur über die Auswahl
      if (debouncedSearch) params.set('q', debouncedSearch)
      else {
        if (subject) params.set('subject_id', subject.id)
        if (topicKey === NO_TOPIC) params.set('missing_topic', 'true')
        else if (topicKey) params.set('topic_id', topicKey)
      }
      if (klasse !== 'all') params.set('class_level', String(klasse))
      return params
    },
    [subject, topicKey, klasse, status, debouncedSearch],
  )

  const fetchPage = useCallback(
    async (page: number): Promise<ListData> => {
      const res = await fetch(`/api/admin/questions?${buildParams(page)}`)
      if (!res.ok) throw new Error('load failed')
      const data = await res.json()
      return { questions: data.questions ?? [], total: data.total ?? 0 }
    },
    [buildParams],
  )

  /** Lädt die ersten `count` Abschnitte neu und behält so die angezeigte Länge (und die Bildlaufposition). */
  const loadFirst = useCallback(
    async (count: number, quiet: boolean) => {
      const id = ++requestId.current
      if (!quiet) setLoading(true)
      setFailed(false)
      try {
        const results = await Promise.all(Array.from({ length: count }, (_, i) => fetchPage(i + 1)))
        if (id !== requestId.current) return
        setRows(results.flatMap((r) => r.questions))
        setTotal(results[0].total)
      } catch {
        if (id === requestId.current) setFailed(true)
      } finally {
        if (id === requestId.current) setLoading(false)
      }
    },
    [fetchPage],
  )

  // Neue Auswahl, neuer Filter oder neue Suche: wieder von vorn, Auswahl leeren
  useEffect(() => {
    pagesRef.current = 1
    setPages(1)
    setSelected(new Set())
    setExpandedId(null)
    setRows([])
    setTotal(null)
    loadFirst(1, false)
  }, [loadFirst])

  const reloadRef = useRef(reloadKey)
  useEffect(() => {
    if (reloadRef.current === reloadKey) return
    reloadRef.current = reloadKey
    loadFirst(pagesRef.current, true)
  }, [reloadKey, loadFirst])

  const refresh = useCallback(() => {
    loadFirst(pagesRef.current, true)
    onChanged()
  }, [loadFirst, onChanged])

  async function showMore() {
    const next = pages + 1
    const id = ++requestId.current
    setLoadingMore(true)
    try {
      const data = await fetchPage(next)
      if (id !== requestId.current) return
      // Doppelte Zeilen weglassen, falls sich inzwischen etwas verschoben hat
      setRows((prev) => {
        const known = new Set(prev.map((r) => r.id))
        return [...prev, ...data.questions.filter((r) => !known.has(r.id))]
      })
      setTotal(data.total)
      pagesRef.current = next
      setPages(next)
    } catch {
      toast.error('Weitere Fragen konnten nicht geladen werden.')
    } finally {
      setLoadingMore(false)
    }
  }

  function patchRow(id: string, change: Partial<ListQuestion>) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...change } : r)))
  }

  /** Ein PATCH der Sichtbarkeit; bei Konflikt gilt der Klick trotzdem, mit Hinweis. */
  async function sendVisibility(id: string, visible: boolean, version: number | undefined) {
    const patch = (expected: number | undefined) =>
      fetch(`/api/admin/questions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: visible, ...(expected ? { expected_version: expected } : {}) }),
      })
    let res = await patch(version)
    if (res.status === 409) {
      const conflict = await res.json().catch(() => ({}))
      toast.info(`${conflict?.error ?? 'Die Frage wurde inzwischen geändert.'} Dein Klick wurde trotzdem übernommen.`)
      res = await patch(undefined)
    }
    if (!res.ok) throw new Error('patch failed')
    const data = await res.json().catch(() => ({}))
    return (data?.version_number as number | undefined) ?? undefined
  }

  async function toggleVisible(q: ListQuestion, visible: boolean, isUndo = false) {
    patchRow(q.id, { is_active: visible, hidden_info: null })
    try {
      const version = await sendVisibility(q.id, visible, isUndo ? undefined : q.version_number)
      patchRow(q.id, { version_number: version })
      if (isUndo) {
        toast.success('Rückgängig gemacht.')
      } else {
        toast.success(visible ? 'Wieder für Azubis sichtbar' : 'Ausgeblendet. Azubis sehen die Frage nicht mehr.', {
          duration: UNDO_MS,
          action: { label: 'Rückgängig', onClick: () => toggleVisible({ ...q, version_number: version }, !visible, true) },
        })
      }
      // Zähler und „von wem“ nachladen, ohne die Liste zu leeren
      loadFirst(pagesRef.current, true)
      onChanged()
    } catch {
      patchRow(q.id, { is_active: !visible, hidden_info: q.hidden_info })
      toast.error('Die Sichtbarkeit konnte nicht geändert werden.')
    }
  }

  async function releaseForPractice(q: ListQuestion) {
    try {
      const res = await fetch(`/api/admin/questions/${q.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assessment_only: false }),
      })
      if (!res.ok) throw new Error('release failed')
      toast.success('Frage für den Übungsbetrieb freigegeben')
      refresh()
    } catch {
      toast.error('Freigabe fehlgeschlagen.')
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setBusy(true)
    try {
      const res = await fetch(`/api/admin/questions/${deleteTarget.id}`, { method: 'DELETE' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        if (!showVersionConflict(res, data)) toast.error(data?.error ?? 'Löschen fehlgeschlagen')
        return
      }
      toast.success('Frage in den Papierkorb gelegt')
      setSelected((prev) => {
        const next = new Set(prev)
        next.delete(deleteTarget.id)
        return next
      })
      setDeleteTarget(null)
      refresh()
    } catch {
      toast.error('Netzwerkfehler')
    } finally {
      setBusy(false)
    }
  }

  /** Massenänderung in Päckchen, weil die Schnittstelle höchstens 200 IDs annimmt. */
  async function runBulk(method: 'PATCH' | 'DELETE', body: Record<string, unknown>, done: (n: number) => string) {
    const ids = Array.from(selected)
    if (ids.length === 0) return
    setBusy(true)
    let changed = 0
    try {
      for (let i = 0; i < ids.length; i += BULK_CHUNK) {
        const chunk = ids.slice(i, i + BULK_CHUNK)
        const res = await fetch('/api/admin/questions/bulk', {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids: chunk, ...body }),
        })
        if (!res.ok) throw new Error('bulk failed')
        changed += chunk.length
      }
      toast.success(done(changed))
      setSelected(new Set())
      setBulkConfirm(null)
    } catch {
      toast.error(
        changed > 0
          ? `Nur ${changed} von ${ids.length} Fragen wurden geändert. Bitte versuche den Rest erneut.`
          : 'Die Änderung hat nicht geklappt.',
      )
    } finally {
      setBusy(false)
      refresh()
    }
  }

  const topicOptions = useMemo(
    () =>
      tree.departments.flatMap((d) =>
        d.subjects.flatMap((s) => s.topics.map((t) => ({ id: t.id, label: `${s.code} › ${t.name}` }))),
      ),
    [tree],
  )
  const subjectOptions = subjects.map((s) => ({
    id: s.id,
    label: tree.departments.length > 1 && s.department_name ? `${s.code} (${s.department_name})` : s.code,
  }))

  const selectionName = searching
    ? 'Suche in allen Fächern'
    : !subject
      ? 'Alle Fächer'
      : topicName
        ? `${subject.code} › ${topicName}`
        : subject.code
  const allShownSelected = rows.length > 0 && rows.every((r) => selected.has(r.id))
  const remaining = total == null ? 0 : Math.max(0, total - rows.length)
  const hasNothing = !loading && !failed && total === 0

  let headline: string
  if (filtered) {
    headline =
      total == null
        ? 'Wird geladen …'
        : `${total.toLocaleString('de-DE')} Treffer`
  } else {
    headline = formatQuestionTotals(totals)
  }

  function resetFilters() {
    setSearch('')
    setStatus('all')
  }

  return (
    <section aria-label="Fragen" className="min-w-0 space-y-4">
      <div className="min-w-0">
        <h2 className="truncate text-lg font-semibold text-ws-text" title={selectionName}>
          {selectionName}
        </h2>
        <p className="text-sm text-ws-muted" aria-live="polite">
          {headline}
        </p>
      </div>

      <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ws-faint" aria-hidden />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Frage oder Antwort suchen"
            aria-label="Frage oder Antwort suchen"
            className="min-h-11 rounded-xl border-ws-line bg-ws-surface pl-9 text-ws-text focus-visible:ring-ws-green"
          />
        </div>
        <AdminSegmented value={status} onChange={setStatus} options={STATUS_OPTIONS} ariaLabel="Sichtbarkeit" />
      </div>
      {filtered && (
        <Button variant="ghost" onClick={resetFilters} className="-ml-2 min-h-11 text-ws-blue hover:text-ws-blue-hover">
          Suche und Filter zurücksetzen
        </Button>
      )}

      {selected.size > 0 && (
        <QuestionBulkBar
          count={selected.size}
          topics={topicOptions}
          subjects={subjectOptions}
          classLevels={classLevels}
          busy={busy}
          onApply={(change: BulkChange) => runBulk('PATCH', change, (n) => `${n} Fragen geändert`)}
          onShow={() => runBulk('PATCH', { is_active: true }, (n) => `${n} Fragen wieder für Azubis sichtbar`)}
          onHide={() => setBulkConfirm('hide')}
          onDelete={() => setBulkConfirm('delete')}
          onClear={() => setSelected(new Set())}
        />
      )}

      {failed ? (
        <AdminErrorState message="Die Fragen konnten gerade nicht geladen werden." onRetry={() => loadFirst(pagesRef.current, false)} />
      ) : loading && rows.length === 0 ? (
        <AdminLoadingState variant="table" rows={5} label="Fragen werden geladen" />
      ) : hasNothing && filtered ? (
        <AdminEmptyState
          icon={SearchX}
          title="Keine Frage gefunden"
          description="Prüfe die Schreibweise oder suche nach einem kürzeren Wort."
        />
      ) : hasNothing ? (
        <AdminEmptyState
          icon={FileQuestion}
          title="Hier gibt es noch keine Fragen"
          action={
            <Button onClick={onAdd} className="min-h-11 rounded-2xl bg-ws-green text-ws-on-accent hover:bg-ws-green-hover">
              Fragen hinzufügen
            </Button>
          }
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-ws-line bg-ws-surface" aria-busy={loading}>
          <label className="flex min-h-11 cursor-pointer items-center gap-1 border-b border-ws-line px-2 text-sm text-ws-muted sm:px-3">
            <span className="flex size-11 items-center justify-center">
              <Checkbox
                checked={allShownSelected}
                onCheckedChange={() => setSelected(allShownSelected ? new Set() : new Set(rows.map((r) => r.id)))}
                aria-label="Alle angezeigten Fragen auswählen"
                className="border-ws-line"
              />
            </span>
            Alle angezeigten auswählen
          </label>
          <ul className="divide-y divide-ws-line">
            {rows.map((q) => (
              <QuestionListItem
                key={q.id}
                question={q}
                expanded={expandedId === q.id}
                selected={selected.has(q.id)}
                onToggleExpanded={() => setExpandedId((prev) => (prev === q.id ? null : q.id))}
                onToggleSelected={() =>
                  setSelected((prev) => {
                    const next = new Set(prev)
                    if (next.has(q.id)) next.delete(q.id)
                    else next.add(q.id)
                    return next
                  })
                }
                onToggleVisible={(visible) => toggleVisible(q, visible)}
                onEdit={() => setEditing(q)}
                onDuplicate={() => setTemplate(q)}
                onHistory={() => setHistoryTarget(q)}
                onDelete={() => setDeleteTarget(q)}
                onReleaseForPractice={() => releaseForPractice(q)}
              />
            ))}
          </ul>
        </div>
      )}

      {!failed && remaining > 0 && rows.length > 0 && (
        <Button
          variant="outline"
          disabled={loadingMore}
          onClick={showMore}
          className="min-h-11 w-full rounded-xl border-ws-line bg-transparent text-ws-text hover:bg-ws-raised"
        >
          {loadingMore
            ? 'Wird geladen …'
            : `Weitere ${Math.min(LIST_PAGE_SIZE, remaining)} anzeigen (noch ${remaining.toLocaleString('de-DE')})`}
        </Button>
      )}

      <QuestionFormModal
        open={editing !== null || template !== null}
        onOpenChange={(o) => {
          if (!o) {
            setEditing(null)
            setTemplate(null)
          }
        }}
        question={editing}
        template={template}
        subjects={subjects}
        onSuccess={refresh}
        onOpenHistory={(q) => setHistoryTarget(q as ListQuestion)}
      />

      <AlertDialog open={deleteTarget !== null} onOpenChange={(o) => !o && !busy && setDeleteTarget(null)}>
        <AlertDialogContent className="border-ws-line bg-ws-surface text-ws-text">
          <AlertDialogHeader>
            <AlertDialogTitle>Frage löschen?</AlertDialogTitle>
            <AlertDialogDescription className="text-ws-muted">
              „{deleteTarget?.question_text.slice(0, 120)}“ wandert in den Papierkorb und lässt sich von dort
              wiederherstellen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy} className="min-h-11">Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              disabled={busy}
              onClick={(e) => {
                e.preventDefault()
                handleDelete()
              }}
              className="min-h-11 bg-ws-red text-ws-on-accent hover:bg-ws-red-hover"
            >
              Löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={bulkConfirm !== null} onOpenChange={(o) => !o && !busy && setBulkConfirm(null)}>
        <AlertDialogContent className="border-ws-line bg-ws-surface text-ws-text">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {bulkConfirm === 'delete'
                ? `${selected.size} ${selected.size === 1 ? 'Frage' : 'Fragen'} löschen?`
                : `${selected.size} ${selected.size === 1 ? 'Frage' : 'Fragen'} ausblenden?`}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-ws-muted">
              {bulkConfirm === 'delete'
                ? 'Sie wandern in den Papierkorb und lassen sich von dort wiederherstellen.'
                : 'Azubis sehen diese Fragen dann nicht mehr.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy} className="min-h-11">Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              disabled={busy}
              onClick={(e) => {
                e.preventDefault()
                if (bulkConfirm === 'delete') runBulk('DELETE', {}, (n) => `${n} Fragen in den Papierkorb gelegt`)
                else runBulk('PATCH', { is_active: false }, (n) => `${n} Fragen ausgeblendet`)
              }}
              className={
                bulkConfirm === 'delete'
                  ? 'min-h-11 bg-ws-red text-ws-on-accent hover:bg-ws-red-hover'
                  : 'min-h-11 bg-ws-green text-ws-on-accent hover:bg-ws-green-hover'
              }
            >
              {bulkConfirm === 'delete' ? 'Löschen' : 'Ausblenden'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {historyTarget && (
        <ContentHistorySheet
          open
          onOpenChange={(o) => !o && setHistoryTarget(null)}
          contentType="question"
          contentId={historyTarget.id}
          title={historyTarget.question_text}
          onRestored={refresh}
        />
      )}
    </section>
  )
}
