'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { ArrowLeft, ChevronLeft, ChevronRight, FileQuestion, History, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { AdminSegmented } from '@/components/admin/admin-segmented'
import { AdminRowActions } from '@/components/admin/admin-row-actions'
import { AdminEmptyState, AdminErrorState, AdminLoadingState } from '@/components/admin/admin-states'
import { ContentHistorySheet } from '@/components/admin/content-history-sheet'
import { QuestionFormModal, type AdminQuestion, type AdminSubject } from '@/components/admin/question-form-modal'
import { DifficultyBadge } from '@/components/difficulty-badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
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
import { NO_TOPIC, type ClassFilter, type TreeDepartment, type TreeSubject, type TreeTopic } from '@/lib/content-tree'

type Row = AdminQuestion & { topics?: { id: string; name: string } | null }

type StatusFilter = 'all' | 'active' | 'inactive'

const STATUS_OPTIONS = [
  { value: 'all', label: 'Alle' },
  { value: 'active', label: 'Aktiv' },
  { value: 'inactive', label: 'Inaktiv' },
] as const

function useDebounced<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

/**
 * Fragenliste zum gewählten Knoten des Inhalts-Baums (PROJ-85). Nutzt die
 * bestehende Fragen-Schnittstelle, die Dialoge und den Verlauf der Seite
 * „Fragen“. `topic`: ein Thema, `NO_TOPIC` oder `null` (alle Fragen des Fachs).
 */
export function ContentQuestionPanel({
  department,
  subject,
  topic,
  klasse,
  subjects,
  onChanged,
  onBack,
}: {
  department: TreeDepartment
  subject: TreeSubject
  topic: TreeTopic | typeof NO_TOPIC | null
  klasse: ClassFilter
  subjects: AdminSubject[]
  /** Nach Anlegen, Bearbeiten, Löschen: Baum und Zähler neu laden */
  onChanged: () => void
  /** Nur auf dem Handy: zurück zum Baum */
  onBack?: () => void
}) {
  const [rows, setRows] = useState<Row[]>([])
  const [total, setTotal] = useState<number | null>(null)
  const [totalPages, setTotalPages] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const [status, setStatus] = useState<StatusFilter>('all')
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounced(search.trim(), 300)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Row | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Row | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [historyTarget, setHistoryTarget] = useState<Row | null>(null)
  const requestId = useRef(0)

  const topicKey = topic === null ? '' : topic === NO_TOPIC ? NO_TOPIC : topic.id
  const topicName = topic === null ? null : topic === NO_TOPIC ? 'Ohne Thema' : topic.name

  // Neue Auswahl oder neuer Filter: zurück auf Seite 1
  useEffect(() => {
    setPage(1)
  }, [subject.id, topicKey, klasse, status, debouncedSearch])

  // Neue Auswahl: Suche und Status zurücksetzen
  useEffect(() => {
    setSearch('')
    setStatus('all')
  }, [subject.id, topicKey])

  const fetchQuestions = useCallback(async () => {
    const id = ++requestId.current
    setLoading(true)
    setFailed(false)
    try {
      const params = new URLSearchParams({ subject_id: subject.id, page: String(page), status })
      if (topic === NO_TOPIC) params.set('missing_topic', 'true')
      else if (topic) params.set('topic_id', topic.id)
      if (klasse !== 'all') params.set('class_level', String(klasse))
      if (debouncedSearch) params.set('q', debouncedSearch)
      const res = await fetch(`/api/admin/questions?${params}`)
      if (!res.ok) throw new Error('load failed')
      const data = await res.json()
      if (id !== requestId.current) return
      setRows(data.questions ?? [])
      setTotal(data.total ?? 0)
      setTotalPages(data.totalPages ?? 0)
    } catch {
      if (id === requestId.current) setFailed(true)
    } finally {
      if (id === requestId.current) setLoading(false)
    }
  }, [subject.id, topic, page, status, klasse, debouncedSearch])

  useEffect(() => {
    fetchQuestions()
  }, [fetchQuestions])

  function refresh() {
    fetchQuestions()
    onChanged()
  }

  async function toggleActive(q: Row, next: boolean) {
    try {
      const res = await fetch(`/api/admin/questions/${q.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: next }),
      })
      if (!res.ok) {
        toast.error('Status konnte nicht geändert werden.')
        return
      }
      toast.success(next ? 'Frage aktiviert' : 'Frage deaktiviert')
      fetchQuestions()
    } catch {
      toast.error('Netzwerkfehler')
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/admin/questions/${deleteTarget.id}`, { method: 'DELETE' })
      if (!res.ok) {
        toast.error('Löschen fehlgeschlagen')
        return
      }
      const json = await res.json().catch(() => ({}))
      if (json.softDeleted) toast.info('Frage deaktiviert (hat Lernhistorie und wurde nicht endgültig gelöscht)')
      else toast.success('Frage gelöscht')
      setDeleteTarget(null)
      refresh()
    } catch {
      toast.error('Netzwerkfehler')
    } finally {
      setDeleting(false)
    }
  }

  const filtered = status !== 'all' || debouncedSearch !== ''
  const isEmpty = !loading && !failed && total === 0 && !filtered
  const newQuestion = (
    <Button
      onClick={() => {
        setEditing(null)
        setFormOpen(true)
      }}
      className="min-h-11 rounded-2xl bg-ws-green text-ws-on-accent hover:bg-ws-green-hover"
    >
      <Plus className="size-5" aria-hidden />
      Neue Frage
    </Button>
  )

  return (
    <section aria-label="Fragen" className="min-w-0 space-y-4">
      {onBack && (
        <Button variant="ghost" onClick={onBack} className="-ml-2 min-h-11 text-ws-muted hover:text-ws-text">
          <ArrowLeft className="size-5" aria-hidden />
          Zurück zum Baum
        </Button>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <nav aria-label="Pfad" className="flex flex-wrap items-center gap-1 text-sm text-ws-muted">
            <span className="truncate" title={department.name}>{department.name}</span>
            <ChevronRight className="size-3.5 shrink-0" aria-hidden />
            <span className={topicName ? 'truncate' : 'truncate font-semibold text-ws-text'} title={subject.name}>
              {subject.name}
            </span>
            {topicName && (
              <>
                <ChevronRight className="size-3.5 shrink-0" aria-hidden />
                <span className="truncate font-semibold text-ws-text" title={topicName}>{topicName}</span>
              </>
            )}
          </nav>
          <h2 className="mt-1 text-lg font-semibold text-ws-text">
            {total == null ? 'Wird geladen …' : `${total} ${total === 1 ? 'Frage' : 'Fragen'}${filtered ? ' gefunden' : ''}`}
          </h2>
        </div>
        {!isEmpty && !failed && <div className="shrink-0">{newQuestion}</div>}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ws-faint" aria-hidden />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Fragetext suchen …"
            aria-label="Fragetext suchen"
            className="min-h-11 rounded-xl border-ws-line bg-ws-surface pl-9 text-ws-text focus-visible:ring-ws-green"
          />
        </div>
        <AdminSegmented value={status} onChange={setStatus} options={STATUS_OPTIONS} ariaLabel="Status" />
      </div>

      {failed ? (
        <AdminErrorState onRetry={fetchQuestions} />
      ) : loading && rows.length === 0 ? (
        <AdminLoadingState variant="table" rows={5} label="Fragen werden geladen" />
      ) : isEmpty ? (
        <AdminEmptyState
          icon={FileQuestion}
          title={topicName ? 'In diesem Thema gibt es noch keine Fragen.' : 'In diesem Fach gibt es noch keine Fragen.'}
          action={newQuestion}
        />
      ) : rows.length === 0 ? (
        <p className="rounded-2xl border border-ws-line bg-ws-surface px-4 py-8 text-center text-sm text-ws-muted">
          Keine Fragen passen zu deiner Suche.
        </p>
      ) : (
        <div className="ws-table-scroll rounded-2xl border border-ws-line bg-ws-surface" aria-busy={loading}>
          <Table>
            <TableHeader>
              <TableRow className="border-ws-line hover:bg-transparent">
                <TableHead className="text-ws-muted">Frage</TableHead>
                {topic === null && <TableHead className="hidden text-ws-muted xl:table-cell">Thema</TableHead>}
                <TableHead className="hidden text-ws-muted md:table-cell">Klasse</TableHead>
                <TableHead className="hidden text-ws-muted sm:table-cell">Schwierigkeit</TableHead>
                <TableHead className="text-ws-muted">Status</TableHead>
                <TableHead className="text-right text-ws-muted">
                  <span className="sr-only">Aktionen</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((q) => (
                <TableRow key={q.id} className="border-ws-line hover:bg-ws-bg/40">
                  <TableCell className="max-w-[14rem] sm:max-w-md">
                    <span className="line-clamp-2 break-words text-ws-text" title={q.question_text}>
                      {q.question_text}
                    </span>
                  </TableCell>
                  {topic === null && (
                    <TableCell className="hidden text-sm text-ws-muted xl:table-cell">
                      {q.topics?.name ?? <span className="italic text-ws-faint">Ohne Thema</span>}
                    </TableCell>
                  )}
                  <TableCell className="hidden text-xs text-ws-muted md:table-cell">
                    {q.class_level != null ? `Kl. ${q.class_level}` : '—'}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <DifficultyBadge difficulty={q.difficulty as 'leicht' | 'mittel' | 'schwer'} />
                  </TableCell>
                  <TableCell>
                    <label className="flex min-h-11 cursor-pointer items-center gap-2 text-xs text-ws-muted">
                      <Switch
                        checked={q.is_active}
                        onCheckedChange={(v) => toggleActive(q, v)}
                        aria-label={`Frage ${q.is_active ? 'deaktivieren' : 'aktivieren'}`}
                      />
                      <span className={q.is_active ? 'font-medium text-ws-green' : ''}>
                        {q.is_active ? 'Aktiv' : 'Inaktiv'}
                      </span>
                    </label>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end">
                      <AdminRowActions
                        subject={`Frage ${q.question_text.slice(0, 40)}`}
                        editIcon={<Pencil className="size-4" />}
                        onEdit={() => {
                          setEditing(q)
                          setFormOpen(true)
                        }}
                        items={[
                          { key: 'history', label: 'Verlauf', icon: <History className="text-ws-muted" />, onSelect: () => setHistoryTarget(q) },
                          { key: 'delete', label: 'Löschen', icon: <Trash2 />, destructive: true, onSelect: () => setDeleteTarget(q) },
                        ]}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {totalPages > 1 && !failed && (
        <div className="flex items-center justify-between gap-2">
          <Button
            variant="outline"
            disabled={page <= 1 || loading}
            onClick={() => setPage((p) => p - 1)}
            className="min-h-11 rounded-xl border-ws-line bg-transparent text-ws-text hover:bg-ws-raised"
          >
            <ChevronLeft className="size-4" aria-hidden />
            Zurück
          </Button>
          <span className="text-sm text-ws-muted" aria-live="polite">
            Seite {page} von {totalPages}
          </span>
          <Button
            variant="outline"
            disabled={page >= totalPages || loading}
            onClick={() => setPage((p) => p + 1)}
            className="min-h-11 rounded-xl border-ws-line bg-transparent text-ws-text hover:bg-ws-raised"
          >
            Weiter
            <ChevronRight className="size-4" aria-hidden />
          </Button>
        </div>
      )}

      <QuestionFormModal
        open={formOpen}
        onOpenChange={setFormOpen}
        question={editing}
        subjects={subjects}
        onSuccess={refresh}
        onOpenHistory={(q) => setHistoryTarget(q as Row)}
        defaults={{
          subjectId: subject.id,
          topicId: topic && topic !== NO_TOPIC ? topic.id : null,
          classLevel: klasse === 'all' ? null : klasse,
        }}
      />

      <AlertDialog open={deleteTarget !== null} onOpenChange={(o) => !o && !deleting && setDeleteTarget(null)}>
        <AlertDialogContent className="border-ws-line bg-ws-surface text-ws-text">
          <AlertDialogHeader>
            <AlertDialogTitle>Frage löschen?</AlertDialogTitle>
            <AlertDialogDescription className="text-ws-muted">
              „{deleteTarget?.question_text.slice(0, 120)}“ wandert in den Papierkorb und lässt sich von dort
              wiederherstellen. Hat die Frage schon Lernhistorie, wird sie nur deaktiviert.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting} className="min-h-11">Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting}
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
