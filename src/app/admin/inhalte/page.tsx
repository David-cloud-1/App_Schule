'use client'

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { AlertTriangle, Bot, ChevronDown, Download, FolderPlus, FolderTree, MoreHorizontal, Plus, Upload } from 'lucide-react'
import { AdminPageHeader } from '@/components/admin/admin-page-header'
import { AdminSegmented } from '@/components/admin/admin-segmented'
import { AdminEmptyState, AdminErrorState, AdminLoadingState } from '@/components/admin/admin-states'
import { ContentTree } from '@/components/admin/content-tree'
import { ContentQuestionPanel } from '@/components/admin/content-question-panel'
import { AdminTabs, AdminTabsContent, AdminTabsList, AdminTabsTrigger } from '@/components/admin/admin-tabs'
import { QuestionReportsInbox, type ListRestriction } from '@/components/admin/question-reports-inbox'
import { DifficultQuestions } from '@/components/admin/difficult-questions'
import { TrashList } from '@/components/admin/trash-list'
import { CsvImportDialog } from '@/components/admin/csv-import-dialog'
import { useOptionalAdminRole } from '@/components/admin/admin-role-provider'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { AI_GENERATOR_HREF } from '@/lib/admin-nav'
import { cn } from '@/lib/utils'
import { ContentHistorySheet, type ContentType } from '@/components/admin/content-history-sheet'
import { SubjectFormModal } from '@/components/admin/subject-form-modal'
import { TopicNameDialog } from '@/components/admin/topic-name-dialog'
import { showVersionConflict } from '@/components/admin/content-meta'
import { QuestionFormModal, type AdminSubject } from '@/components/admin/question-form-modal'
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
  NO_TOPIC,
  countFor,
  resolveSelection,
  totalsFor,
  type TreeSelection,
  type ClassFilter,
  type ContentTree as ContentTreeData,
  type TreeSubject,
  type TreeTopic,
} from '@/lib/content-tree'

const CLASS_OPTIONS = [
  { value: 'all', label: 'Alle' },
  { value: '10', label: '10' },
  { value: '11', label: '11' },
  { value: '12', label: '12' },
] as const

type ClassParam = (typeof CLASS_OPTIONS)[number]['value']

/** Satz der Rückfrage vor dem Ausblenden eines Fachs (E3); zählt alle Stufen. */
function describeHide(subject: TreeSubject): string {
  const questions = countFor(subject.counts, 'all')
  if (questions === 0) return 'Das Fach hat noch keine Fragen.'
  const topics = subject.topics.filter((t) => countFor(t.counts, 'all') > 0).length
  const q = `${questions.toLocaleString('de-DE')} ${questions === 1 ? 'Frage' : 'Fragen'}`
  const t = topics > 0 ? ` in ${topics} ${topics === 1 ? 'Thema' : 'Themen'}` : ''
  return `${q}${t} ${questions === 1 ? 'ist' : 'sind'} dann nicht mehr im Quiz.`
}

const TABS = ['fragen', 'gemeldet', 'schwierig', 'papierkorb'] as const
type Tab = (typeof TABS)[number]

function parseTab(value: string | null): Tab {
  return TABS.includes(value as Tab) ? (value as Tab) : 'fragen'
}

const TRASH_OPTIONS = [
  { value: 'question', label: 'Fragen' },
  { value: 'topic', label: 'Themen' },
  { value: 'subject', label: 'Fächer' },
] as const
type TrashTab = (typeof TRASH_OPTIONS)[number]['value']

/** Zahl an einem Reiter, nur wenn dort etwas liegt */
function TabCount({ value }: { value: number | null }) {
  if (!value) return null
  return (
    <span className="rounded-full bg-ws-raised px-2 py-0.5 text-xs font-medium tabular-nums text-ws-text">{value}</span>
  )
}

/** „LOP“ oder „LOP › Lagerlogistik“ */
function selectionLabel(selection: TreeSelection): string {
  if (selection.kind === 'all') return 'Alle Fächer'
  if (selection.kind === 'subject') return selection.subject.code
  return `${selection.subject.code} › ${selection.kind === 'topic' ? selection.topic.name : 'Ohne Thema'}`
}

/** Zahlen der Auswahl aus dem Baum, für den Kopf der Fragenliste */
function selectionTotals(tree: ContentTreeData, selection: TreeSelection, klasse: ClassFilter) {
  if (selection.kind === 'all') return totalsFor(tree, klasse)
  if (selection.kind === 'topic') return totalsFor(selection.topic, klasse)
  if (selection.kind === 'notopic') {
    return totalsFor({ counts: selection.subject.no_topic, hidden: selection.subject.no_topic_hidden }, klasse)
  }
  return totalsFor(selection.subject, klasse)
}

function parseKlasse(value: string | null): ClassFilter {
  return value === '10' ? 10 : value === '11' ? 11 : value === '12' ? 12 : 'all'
}

type TopicDialog =
  | { mode: 'create'; subject: TreeSubject }
  | { mode: 'rename'; subject: TreeSubject; topic: TreeTopic }

/**
 * Lerninhalte (PROJ-85, PROJ-131): Fächer und Themen als Baum links, rechts die
 * Reiter Fragen · Gemeldet · Schwierig · Papierkorb. Reiter, Auswahl und
 * Stufe stehen in der Adresse. `useSearchParams` braucht eine Suspense-Grenze.
 */
export default function InhaltePage() {
  return (
    <Suspense fallback={<AdminLoadingState variant="cards" rows={3} />}>
      <InhaltePageContent />
    </Suspense>
  )
}

function InhaltePageContent() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const subjectParam = searchParams.get('fach')
  const topicParam = searchParams.get('thema')
  const klasse = parseKlasse(searchParams.get('klasse'))
  const tab = parseTab(searchParams.get('reiter'))
  const searchTerm = searchParams.get('q') ?? ''

  const [tree, setTree] = useState<ContentTreeData | null>(null)
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [editingSubject, setEditingSubject] = useState<TreeSubject | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  const [hideTarget, setHideTarget] = useState<TreeSubject | null>(null)
  const [topicDialog, setTopicDialog] = useState<TopicDialog | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<{ subject: TreeSubject; topic: TreeTopic } | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [history, setHistory] = useState<{ type: ContentType; id: string; title: string } | null>(null)
  const [treeOpen, setTreeOpen] = useState(false)
  const [taskCount, setTaskCount] = useState<number | null>(null)
  const [trashCount, setTrashCount] = useState<number | null>(null)
  const [trashType, setTrashType] = useState<TrashTab>('question')
  const [newSubjectOpen, setNewSubjectOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [exporting, setExporting] = useState(false)
  const role = useOptionalAdminRole()?.role
  const initializedRef = useRef(false)

  const loadTree = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/content-tree')
      if (!res.ok) throw new Error('load failed')
      setTree((await res.json()) as ContentTreeData)
      setFailed(false)
    } catch {
      setFailed(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadTree()
  }, [loadTree])

  // Zahlen an den Reitern: „Gemeldet“ aus derselben Zählung wie „Zu erledigen“ auf dem Start
  const loadCounts = useCallback(async () => {
    const [tasks, trash] = await Promise.all(
      ['/api/admin/tasks', '/api/admin/trash?type=count'].map((url) =>
        fetch(url, { cache: 'no-store' })
          .then((res) => (res.ok ? res.json() : null))
          .catch(() => null),
      ),
    )
    setTaskCount(typeof tasks?.counts?.openReports === 'number' ? tasks.counts.openReports : null)
    setTrashCount(typeof trash?.count === 'number' ? trash.count : null)
  }, [])

  useEffect(() => {
    loadCounts()
  }, [loadCounts])

  const refreshAll = useCallback(() => {
    loadTree()
    loadCounts()
  }, [loadTree, loadCounts])

  const selection = useMemo(
    () => (tree ? resolveSelection(tree, { subjectId: subjectParam, topicId: topicParam }, klasse) : null),
    [tree, subjectParam, topicParam, klasse],
  )

  const navigate = useCallback(
    (updates: Record<string, string | null>, mode: 'push' | 'replace') => {
      const params = new URLSearchParams(searchParams.toString())
      for (const [key, value] of Object.entries(updates)) {
        if (value == null) params.delete(key)
        else params.set(key, value)
      }
      const qs = params.toString()
      const url = qs ? `${pathname}?${qs}` : pathname
      // Nur die Adresse ändern, ohne Server-Rundreise (Next.js gleicht useSearchParams ab).
      // router.replace kostete im Browser je Klick ca. 0,5 s.
      if (mode === 'push') window.history.pushState(null, '', url)
      else window.history.replaceState(null, '', url)
    },
    [pathname, searchParams],
  )

  // Adresse zeigt auf etwas, das es nicht (mehr) gibt: still auf das nächste Vorhandene zurückfallen
  const selectionKey = selection ? JSON.stringify([selection.kind, subjectParam, topicParam]) : null
  useEffect(() => {
    if (!selection || !tree) return
    if (selection.kind === 'all' && selection.reason === 'missing') {
      if (topicParam != null) toast.info('Dieses Thema gibt es nicht mehr. Du siehst jetzt alle Fächer.')
      navigate({ fach: null, thema: null }, 'replace')
    } else if (selection.kind === 'subject' && topicParam != null) {
      navigate({ thema: null }, 'replace')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectionKey])

  // Beim ersten Laden das gewählte Fach aufklappen (es bleibt auch danach offen)
  useEffect(() => {
    if (!tree || initializedRef.current) return
    initializedRef.current = true
    if (subjectParam) setExpanded(new Set([`s:${subjectParam}`]))
  }, [tree, subjectParam])

  const toggleKey = useCallback((key: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }, [])

  function select(subject: TreeSubject | null, topicId: string | null) {
    if (subject) setExpanded((prev) => new Set(prev).add(`s:${subject.id}`))
    setTreeOpen(false)
    navigate({ fach: subject?.id ?? null, thema: topicId }, 'push')
  }

  function changeTab(next: Tab) {
    navigate({ reiter: next === 'fragen' ? null : next }, 'push')
  }

  /** Aus „Schwierig“: Thema im Baum wählen und zum Reiter „Fragen“ wechseln */
  function showInTopic(subjectId: string, topicId: string) {
    setExpanded((prev) => new Set(prev).add(`s:${subjectId}`))
    navigate({ fach: subjectId, thema: topicId, reiter: null }, 'push')
  }

  function showAll() {
    navigate({ fach: null, thema: null }, 'push')
  }

  function changeKlasse(value: ClassParam) {
    const next = value === 'all' ? null : value
    const nextFilter = parseKlasse(next)
    // Blendet der Filter das gewählte Thema aus, fällt die Auswahl aufs Fach zurück
    let thema = topicParam
    if (tree && subjectParam && topicParam) {
      const sel = resolveSelection(tree, { subjectId: subjectParam, topicId: topicParam }, nextFilter)
      if (sel.kind === 'subject') thema = null
    }
    navigate({ klasse: next, thema }, 'replace')
  }

  /** Ausblenden fragt vorher nach (B41), Einblenden geht sofort. */
  function askToggleSubject(subject: TreeSubject) {
    if (subject.is_active) setHideTarget(subject)
    else toggleSubjectActive(subject)
  }

  async function toggleSubjectActive(subject: TreeSubject) {
    const next = !subject.is_active
    try {
      const res = await fetch(`/api/admin/subjects/${subject.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: next, expected_version: subject.version_number }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        if (showVersionConflict(res, data, () => setHistory({ type: 'subject', id: subject.id, title: subject.name }))) {
          loadTree()
          return
        }
        toast.error(data?.error ?? 'Status konnte nicht geändert werden.')
        return
      }
      toast.success(
        next ? `${subject.code} ist wieder für Azubis sichtbar.` : `${subject.code} ist für Azubis ausgeblendet.`,
      )
      setHideTarget(null)
      loadTree()
    } catch {
      toast.error('Netzwerkfehler')
    }
  }

  /** Tabelle (CSV) der Auswahl im Baum, mit derselben Stufe */
  async function exportTable() {
    setExporting(true)
    try {
      const params = new URLSearchParams()
      if (selection && selection.kind !== 'all') params.set('subject', selection.subject.code)
      if (selection?.kind === 'topic') params.set('topic_id', selection.topic.id)
      if (selection?.kind === 'notopic') params.set('missing_topic', 'true')
      if (klasse !== 'all') params.set('class_level', String(klasse))
      const res = await fetch(`/api/admin/questions/export?${params}`)
      if (!res.ok) throw new Error('export failed')
      const url = URL.createObjectURL(await res.blob())
      const a = document.createElement('a')
      a.href = url
      a.download = `fragen-${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Tabelle exportiert')
    } catch {
      toast.error('Export fehlgeschlagen.')
    } finally {
      setExporting(false)
    }
  }

  async function submitTopic(name: string): Promise<string | null> {
    if (!topicDialog) return null
    const isCreate = topicDialog.mode === 'create'
    try {
      const res = await fetch(isCreate ? '/api/admin/topics' : `/api/admin/topics/${topicDialog.topic.id}`, {
        method: isCreate ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          isCreate
            ? { subject_id: topicDialog.subject.id, name }
            : { name, expected_version: topicDialog.topic.version_number },
        ),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        if (!isCreate) {
          const topic = topicDialog.topic
          if (showVersionConflict(res, data, () => setHistory({ type: 'topic', id: topic.id, title: topic.name }))) {
            loadTree()
            setTopicDialog(null)
            return null
          }
        }
        return data?.error ?? 'Das Thema konnte nicht gespeichert werden.'
      }
      toast.success(isCreate ? 'Thema angelegt' : 'Thema umbenannt')
      if (isCreate && data?.topic?.id) {
        setExpanded((prev) => new Set(prev).add(`s:${topicDialog.subject.id}`))
      }
      loadTree()
      return null
    } catch {
      return 'Netzwerkfehler. Bitte versuche es erneut.'
    }
  }

  async function confirmDeleteTopic() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/admin/topics/${deleteTarget.topic.id}`, { method: 'DELETE' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(data?.error ?? 'Das Thema konnte nicht gelöscht werden.')
        loadTree()
      } else {
        toast.success('Thema gelöscht')
        loadCounts()
        // Die eigene Auswahl räumen wir selbst, damit kein „gibt es nicht mehr“-Hinweis erscheint
        if (topicParam === deleteTarget.topic.id) navigate({ thema: null }, 'replace')
        loadTree()
      }
      setDeleteTarget(null)
    } catch {
      toast.error('Netzwerkfehler')
    } finally {
      setDeleting(false)
    }
  }

  const subjectsForForm: AdminSubject[] = useMemo(
    () =>
      (tree?.departments ?? []).flatMap((d) =>
        d.subjects.map((s) => ({ id: s.id, code: s.code, name: s.name, department_name: d.name })),
      ),
    [tree],
  )

  const selectedSubject = selection && selection.kind !== 'all' ? selection.subject : null
  const restriction: ListRestriction | null =
    !selection || selection.kind === 'all'
      ? null
      : {
          subjectId: selection.subject.id,
          topicId: selection.kind === 'topic' ? selection.topic.id : selection.kind === 'notopic' ? NO_TOPIC : undefined,
          label: selectionLabel(selection),
        }
  const subjectCodes = useMemo(
    () => Object.fromEntries((tree?.departments ?? []).flatMap((d) => d.subjects.map((s) => [s.id, s.code]))),
    [tree],
  )
  const topicIds = useMemo(
    () => new Set((tree?.departments ?? []).flatMap((d) => d.subjects.flatMap((s) => s.topics.map((t) => t.id)))),
    [tree],
  )
  const isEmptyTree = !!tree && tree.departments.every((d) => d.subjects.length === 0)
  const deleteCount = deleteTarget ? countFor(deleteTarget.topic.counts, 'all') : 0

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Lerninhalte"
        description="Fächer, Themen und Fragen, mit denen die Azubis in der App lernen."
        actions={
          <>
            {/* Bei einem leeren Bereich steht die Hauptaktion im Leerzustand */}
            {!isEmptyTree && (
              <Button
                onClick={() => setAddOpen(true)}
                disabled={!tree}
                className="min-h-11 rounded-2xl bg-ws-green text-ws-on-accent hover:bg-ws-green-hover"
              >
                <Plus className="size-5" aria-hidden />
                Fragen hinzufügen
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="size-11 rounded-xl border-ws-line bg-transparent text-ws-text hover:bg-ws-raised hover:text-ws-text"
                  aria-label="Weitere Aktionen"
                  disabled={!tree}
                >
                  <MoreHorizontal className="size-5" aria-hidden />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="border-ws-line bg-ws-surface text-ws-text">
                <DropdownMenuItem className="min-h-11" onSelect={() => setNewSubjectOpen(true)}>
                  <FolderPlus className="size-4" aria-hidden />
                  Neues Fach …
                </DropdownMenuItem>
                <DropdownMenuItem className="min-h-11" onSelect={exportTable} disabled={exporting}>
                  <Download className="size-4" aria-hidden />
                  Tabelle exportieren
                </DropdownMenuItem>
                <DropdownMenuItem className="min-h-11" onSelect={() => setImportOpen(true)}>
                  <Upload className="size-4" aria-hidden />
                  Tabelle importieren
                </DropdownMenuItem>
                {role === 'admin' && (
                  <DropdownMenuItem asChild className="min-h-11">
                    <a href={AI_GENERATOR_HREF}>
                      <Bot className="size-4" aria-hidden />
                      Fragen aus Material
                    </a>
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        }
      />

      {failed && !tree ? (
        <AdminErrorState
          onRetry={() => {
            setLoading(true)
            loadTree()
          }}
        />
      ) : loading || !tree ? (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
          <AdminLoadingState variant="list" rows={6} label="Baum wird geladen" />
          <div className="hidden lg:block">
            <AdminLoadingState variant="table" rows={5} />
          </div>
        </div>
      ) : isEmptyTree ? (
        <AdminEmptyState
          icon={FolderTree}
          title="In diesem Bereich gibt es noch keine Fächer."
          description="Lege zuerst ein Fach an, dann kannst du Themen und Fragen hinzufügen."
          action={
            <Button
              onClick={() => setNewSubjectOpen(true)}
              className="min-h-11 rounded-2xl bg-ws-green text-ws-on-accent hover:bg-ws-green-hover"
            >
              Neues Fach …
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:items-start">
          <div className="min-w-0">
            {/* Handy: der Baum ist eine einklappbare Leiste über den Fragen */}
            <Button
              variant="outline"
              onClick={() => setTreeOpen((o) => !o)}
              aria-expanded={treeOpen}
              aria-controls="lerninhalte-baum"
              className="min-h-11 w-full justify-between rounded-xl border-ws-line bg-ws-surface text-left text-ws-text hover:bg-ws-raised lg:hidden"
            >
              <span className="min-w-0 truncate">
                Fach und Thema:{' '}
                <span className="font-semibold">{selection ? selectionLabel(selection) : 'Alle Fächer'}</span>
              </span>
              <ChevronDown
                className={cn('size-4 shrink-0 transition-transform duration-200', treeOpen && 'rotate-180')}
                aria-hidden
              />
            </Button>
            <div id="lerninhalte-baum" className={cn('mt-2 lg:mt-0 lg:block', !treeOpen && 'hidden')}>
              <div className="overflow-hidden rounded-2xl border border-ws-line bg-ws-surface">
                <div className="border-b border-ws-line p-3">
                  <p className="mb-2 text-xs font-medium text-ws-muted">Stufe</p>
                  <AdminSegmented
                    value={(klasse === 'all' ? 'all' : String(klasse)) as ClassParam}
                    onChange={changeKlasse}
                    options={CLASS_OPTIONS}
                    ariaLabel="Stufe"
                  />
                </div>
                <div className="max-h-[70vh] overflow-y-auto">
                  <ContentTree
                    tree={tree}
                    klasse={klasse}
                    selected={{
                      subjectId: selectedSubject?.id ?? null,
                      topicId:
                        selection?.kind === 'topic' ? selection.topic.id : selection?.kind === 'notopic' ? NO_TOPIC : null,
                    }}
                    expanded={expanded}
                    onToggle={toggleKey}
                    onSelectAll={() => select(null, null)}
                    onSelectSubject={(s) => select(s, null)}
                    onSelectTopic={(s, topicId) => select(s, topicId)}
                    onEditSubject={setEditingSubject}
                    onToggleSubjectActive={askToggleSubject}
                    onCreateTopic={(subject) => setTopicDialog({ mode: 'create', subject })}
                    onSubjectHistory={(s) => setHistory({ type: 'subject', id: s.id, title: s.name })}
                    onRenameTopic={(subject, topic) => setTopicDialog({ mode: 'rename', subject, topic })}
                    onTopicHistory={(t) => setHistory({ type: 'topic', id: t.id, title: t.name })}
                    onDeleteTopic={(subject, topic) => setDeleteTarget({ subject, topic })}
                  />
                </div>
              </div>
              {failed && (
                <p role="alert" className="mt-2 text-sm text-ws-red">
                  Der Baum konnte nicht aktualisiert werden.{' '}
                  <button type="button" className="underline" onClick={loadTree}>
                    Erneut versuchen
                  </button>
                </p>
              )}
            </div>
          </div>

          <AdminTabs value={tab} onValueChange={(v) => changeTab(v as Tab)} className="min-w-0">
            <AdminTabsList>
              <AdminTabsTrigger value="fragen">Fragen</AdminTabsTrigger>
              <AdminTabsTrigger value="gemeldet">
                Gemeldet
                <TabCount value={taskCount} />
              </AdminTabsTrigger>
              <AdminTabsTrigger value="schwierig">Schwierig</AdminTabsTrigger>
              <AdminTabsTrigger value="papierkorb">
                Papierkorb
                <TabCount value={trashCount} />
              </AdminTabsTrigger>
            </AdminTabsList>

            <AdminTabsContent value="fragen" className="mt-4">
              {selection && (
                <ContentQuestionPanel
                  key={`${selectedSubject?.id ?? 'alle'}:${selection.kind === 'topic' ? selection.topic.id : selection.kind === 'notopic' ? NO_TOPIC : ''}`}
                  subject={selectedSubject}
                  topic={selection.kind === 'topic' ? selection.topic : selection.kind === 'notopic' ? NO_TOPIC : null}
                  klasse={klasse}
                  tree={tree}
                  totals={selectionTotals(tree, selection, klasse)}
                  initialSearch={searchTerm}
                  reloadKey={reloadKey}
                  onAdd={() => setAddOpen(true)}
                  subjects={subjectsForForm}
                  onChanged={refreshAll}
                />
              )}
            </AdminTabsContent>

            <AdminTabsContent value="gemeldet" className="mt-4">
              <QuestionReportsInbox restriction={restriction} onShowAll={showAll} onChanged={refreshAll} />
            </AdminTabsContent>

            <AdminTabsContent value="schwierig" className="mt-4">
              <DifficultQuestions
                klasse={klasse}
                restriction={restriction}
                onShowAll={showAll}
                onShowInTopic={showInTopic}
                subjects={subjectsForForm}
                subjectCodes={subjectCodes}
                topicIds={topicIds}
                onChanged={refreshAll}
              />
            </AdminTabsContent>

            <AdminTabsContent value="papierkorb" className="mt-4 space-y-3">
              <AdminSegmented value={trashType} onChange={setTrashType} options={TRASH_OPTIONS} ariaLabel="Gelöschte Inhalte" />
              <TrashList
                type={trashType}
                onChanged={() => {
                  setReloadKey((k) => k + 1)
                  refreshAll()
                }}
              />
            </AdminTabsContent>
          </AdminTabs>
        </div>
      )}

      <QuestionFormModal
        open={addOpen}
        onOpenChange={setAddOpen}
        subjects={subjectsForForm}
        onSuccess={() => {
          setReloadKey((k) => k + 1)
          refreshAll()
        }}
        defaults={{
          subjectId: selectedSubject?.id,
          topicId: selection?.kind === 'topic' ? selection.topic.id : null,
          classLevel: klasse === 'all' ? null : klasse,
        }}
      />

      <SubjectFormModal
        open={newSubjectOpen}
        onOpenChange={setNewSubjectOpen}
        subject={null}
        onSuccess={refreshAll}
      />

      <CsvImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        subjects={subjectsForForm}
        onSuccess={() => {
          setReloadKey((k) => k + 1)
          refreshAll()
        }}
      />

      <SubjectFormModal
        open={editingSubject !== null}
        onOpenChange={(o) => !o && setEditingSubject(null)}
        subject={editingSubject}
        onSuccess={loadTree}
        onOpenHistory={() => {
          if (editingSubject) setHistory({ type: 'subject', id: editingSubject.id, title: editingSubject.name })
        }}
      />

      <AlertDialog open={hideTarget !== null} onOpenChange={(o) => !o && setHideTarget(null)}>
        <AlertDialogContent className="border-ws-line bg-ws-surface text-ws-text">
          <AlertDialogHeader>
            <AlertDialogTitle>{hideTarget?.code} für Azubis ausblenden?</AlertDialogTitle>
            <AlertDialogDescription className="text-ws-muted">
              {hideTarget && describeHide(hideTarget)}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="min-h-11">Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                if (hideTarget) toggleSubjectActive(hideTarget)
              }}
              className="min-h-11 bg-ws-green text-ws-on-accent hover:bg-ws-green-hover"
            >
              Ausblenden
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <TopicNameDialog
        open={topicDialog !== null}
        onOpenChange={(o) => !o && setTopicDialog(null)}
        mode={topicDialog?.mode ?? 'create'}
        subjectName={topicDialog?.subject.name ?? ''}
        initialName={topicDialog?.mode === 'rename' ? topicDialog.topic.name : ''}
        onSubmit={submitTopic}
      />

      <AlertDialog open={deleteTarget !== null} onOpenChange={(o) => !o && !deleting && setDeleteTarget(null)}>
        <AlertDialogContent className="border-ws-line bg-ws-surface text-ws-text">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="size-5 text-ws-red" aria-hidden />
              {deleteCount > 0 ? 'Thema kann nicht gelöscht werden' : 'Thema löschen?'}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-ws-muted">
              {deleteCount > 0
                ? `Das Thema „${deleteTarget?.topic.name}“ hat noch ${deleteCount} ${deleteCount === 1 ? 'Frage' : 'Fragen'}. Verschiebe sie zuerst in ein anderes Thema, dann lässt es sich löschen.`
                : `Das Thema „${deleteTarget?.topic.name}“ wandert in den Papierkorb und lässt sich von dort wiederherstellen.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting} className="min-h-11">
              {deleteCount > 0 ? 'Verstanden' : 'Abbrechen'}
            </AlertDialogCancel>
            {deleteCount === 0 && (
              <AlertDialogAction
                disabled={deleting}
                onClick={(e) => {
                  e.preventDefault()
                  confirmDeleteTopic()
                }}
                className="min-h-11 bg-ws-red text-ws-on-accent hover:bg-ws-red-hover"
              >
                Löschen
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {history && (
        <ContentHistorySheet
          open
          onOpenChange={(o) => !o && setHistory(null)}
          contentType={history.type}
          contentId={history.id}
          title={history.title}
          onRestored={loadTree}
        />
      )}
    </div>
  )
}
