'use client'

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { AlertTriangle, FolderTree } from 'lucide-react'
import { AdminPageHeader } from '@/components/admin/admin-page-header'
import { AdminSegmented } from '@/components/admin/admin-segmented'
import { AdminEmptyState, AdminErrorState, AdminLoadingState } from '@/components/admin/admin-states'
import { ContentTree } from '@/components/admin/content-tree'
import { ContentQuestionPanel } from '@/components/admin/content-question-panel'
import { ContentHistorySheet, type ContentType } from '@/components/admin/content-history-sheet'
import { SubjectFormModal } from '@/components/admin/subject-form-modal'
import { TopicNameDialog } from '@/components/admin/topic-name-dialog'
import { showVersionConflict } from '@/components/admin/content-meta'
import type { AdminSubject } from '@/components/admin/question-form-modal'
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

function parseKlasse(value: string | null): ClassFilter {
  return value === '10' ? 10 : value === '11' ? 11 : value === '12' ? 12 : 'all'
}

type TopicDialog =
  | { mode: 'create'; subject: TreeSubject }
  | { mode: 'rename'; subject: TreeSubject; topic: TreeTopic }

/**
 * Inhalte (PROJ-85): Fächer und Themen als Baum links, Fragen des gewählten
 * Knotens rechts. Auswahl, Klassenfilter und (auf dem Handy) die Listenansicht
 * stehen in der Adresse. `useSearchParams` braucht eine Suspense-Grenze.
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
  const listView = searchParams.get('ansicht') === 'liste'

  const [tree, setTree] = useState<ContentTreeData | null>(null)
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [editingSubject, setEditingSubject] = useState<TreeSubject | null>(null)
  const [topicDialog, setTopicDialog] = useState<TopicDialog | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<{ subject: TreeSubject; topic: TreeTopic } | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [history, setHistory] = useState<{ type: ContentType; id: string; title: string } | null>(null)
  const pushedRef = useRef(false)
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
    const wantsTopic = topicParam != null
    const wantsSubject = subjectParam != null
    if (selection.kind === 'none' && wantsSubject) {
      navigate({ fach: null, thema: null, ansicht: null }, 'replace')
    } else if (selection.kind === 'subject' && wantsTopic) {
      if (selection.reason === 'missing') {
        toast.info('Dieses Thema gibt es nicht mehr. Du siehst jetzt das ganze Fach.')
      }
      navigate({ thema: null }, 'replace')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectionKey])

  // Beim ersten Laden: Bereiche aufklappen, das gewählte Fach ebenfalls
  useEffect(() => {
    if (!tree || initializedRef.current) return
    initializedRef.current = true
    const keys = new Set<string>(tree.departments.map((d) => `d:${d.id}`))
    if (subjectParam) keys.add(`s:${subjectParam}`)
    setExpanded(keys)
  }, [tree, subjectParam])

  const toggleKey = useCallback((key: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }, [])

  const isDesktop = () => typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches

  function select(subject: TreeSubject, topicId: string | null) {
    setExpanded((prev) => new Set(prev).add(`s:${subject.id}`))
    const updates = { fach: subject.id, thema: topicId }
    if (isDesktop()) {
      navigate(updates, 'replace')
    } else {
      pushedRef.current = true
      navigate({ ...updates, ansicht: 'liste' }, 'push')
    }
  }

  function backToTree() {
    if (pushedRef.current) window.history.back()
    else navigate({ ansicht: null }, 'replace')
    pushedRef.current = false
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
      toast.success(next ? 'Fach aktiviert' : 'Fach deaktiviert')
      loadTree()
    } catch {
      toast.error('Netzwerkfehler')
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

  const hasSelection = selection != null && selection.kind !== 'none'
  const showList = listView && hasSelection
  const isEmptyTree = !!tree && tree.departments.every((d) => d.subjects.length === 0)
  const deleteCount = deleteTarget ? countFor(deleteTarget.topic.counts, 'all') : 0

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Inhalte"
        description="Fächer und Themen als Baum. Wähle links einen Knoten, rechts siehst du seine Fragen."
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
          description="Lege zuerst auf der Seite „Fächer“ ein Fach an."
          action={
            <Button asChild className="min-h-11 rounded-2xl bg-ws-green text-ws-on-accent hover:bg-ws-green-hover">
              <a href="/admin/subjects">Zu den Fächern</a>
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:items-start">
          <div className={showList ? 'hidden lg:block' : undefined}>
            <div className="overflow-hidden rounded-2xl border border-ws-line bg-ws-surface">
              <div className="border-b border-ws-line p-3">
                <p className="mb-2 text-xs font-medium text-ws-muted">Klassenstufe</p>
                <AdminSegmented
                  value={(klasse === 'all' ? 'all' : String(klasse)) as ClassParam}
                  onChange={changeKlasse}
                  options={CLASS_OPTIONS}
                  ariaLabel="Klassenstufe"
                />
              </div>
              <div className="max-h-[70vh] overflow-y-auto">
                <ContentTree
                  tree={tree}
                  klasse={klasse}
                  selected={{
                    subjectId: selection && selection.kind !== 'none' ? selection.subject.id : null,
                    topicId:
                      selection?.kind === 'topic' ? selection.topic.id : selection?.kind === 'notopic' ? NO_TOPIC : null,
                  }}
                  expanded={expanded}
                  onToggle={toggleKey}
                  onSelectSubject={(s) => select(s, null)}
                  onSelectTopic={(s, topicId) => select(s, topicId)}
                  onEditSubject={setEditingSubject}
                  onToggleSubjectActive={toggleSubjectActive}
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

          <div className={showList ? undefined : 'hidden lg:block'}>
            {selection && selection.kind !== 'none' ? (
              <ContentQuestionPanel
                key={`${selection.subject.id}:${selection.kind === 'topic' ? selection.topic.id : selection.kind === 'notopic' ? NO_TOPIC : ''}`}
                department={selection.department}
                subject={selection.subject}
                topic={selection.kind === 'topic' ? selection.topic : selection.kind === 'notopic' ? NO_TOPIC : null}
                klasse={klasse}
                subjects={subjectsForForm}
                onChanged={loadTree}
                onBack={showList ? backToTree : undefined}
              />
            ) : (
              <div className="rounded-2xl border border-dashed border-ws-line bg-ws-surface px-4 py-16 text-center text-sm text-ws-muted">
                Wähle links ein Fach oder Thema.
              </div>
            )}
          </div>
        </div>
      )}

      <SubjectFormModal
        open={editingSubject !== null}
        onOpenChange={(o) => !o && setEditingSubject(null)}
        subject={editingSubject}
        onSuccess={loadTree}
        onOpenHistory={() => {
          if (editingSubject) setHistory({ type: 'subject', id: editingSubject.id, title: editingSubject.name })
        }}
      />

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
