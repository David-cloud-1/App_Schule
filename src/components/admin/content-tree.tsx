'use client'

import { Fragment, useCallback, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { ChevronRight, Eye, EyeOff, History, Library, Pencil, Plus, Trash2 } from 'lucide-react'
import { AdminRowActions } from '@/components/admin/admin-row-actions'
import { cn } from '@/lib/utils'
import {
  NO_TOPIC,
  countFor,
  levelLabel,
  topicVisible,
  totalsFor,
  type ClassFilter,
  type ContentTree as ContentTreeData,
  type TreeSubject,
  type TreeTopic,
} from '@/lib/content-tree'
import { formatQuestionTotals, type QuestionTotals } from '@/lib/question-count'

type Node = {
  key: string
  kind: 'all' | 'subject' | 'topic' | 'notopic' | 'add'
  level: 1 | 2
  parentKey: string | null
  label: string
  totals: QuestionTotals | null
  expandable: boolean
  expanded: boolean
  /** Zwischenüberschrift mit dem Bereich vor diesem Eintrag (nur bei „Alle Bereiche“) */
  heading?: string
  subject?: TreeSubject
  topic?: TreeTopic
}

export interface ContentTreeProps {
  tree: ContentTreeData
  klasse: ClassFilter
  /** Gewählter Eintrag: `subjectId: null` = „Alle Fächer“, sonst Fach und Thema-ID oder `ohne` */
  selected: { subjectId: string | null; topicId: string | null }
  expanded: ReadonlySet<string>
  onToggle: (key: string) => void
  onSelectAll: () => void
  onSelectSubject: (subject: TreeSubject) => void
  onSelectTopic: (subject: TreeSubject, topicId: string) => void
  onEditSubject: (subject: TreeSubject) => void
  onToggleSubjectActive: (subject: TreeSubject) => void
  onCreateTopic: (subject: TreeSubject) => void
  onSubjectHistory: (subject: TreeSubject) => void
  onRenameTopic: (subject: TreeSubject, topic: TreeTopic) => void
  onTopicHistory: (topic: TreeTopic) => void
  onDeleteTopic: (subject: TreeSubject, topic: TreeTopic) => void
}

const subjectKey = (id: string) => `s:${id}`
const ALL_KEY = 'all'

function Count({ totals }: { totals: QuestionTotals }) {
  return (
    <span
      className={cn(
        'shrink-0 rounded-full px-2 py-0.5 text-xs font-normal tabular-nums',
        totals.total === 0 ? 'text-ws-faint' : 'bg-ws-raised text-ws-muted',
      )}
      title={totals.total === 0 ? 'Keine Fragen' : formatQuestionTotals(totals)}
    >
      {totals.total.toLocaleString('de-DE')}
    </span>
  )
}

/**
 * Baum „Alle Fächer“ → Fach → Thema (PROJ-85, neu gezeichnet in PROJ-131) mit
 * Baum-Rolle und Tastatur: Pfeil hoch/runter bewegt, rechts/links klappt auf
 * und zu, Enter wählt. Das gewählte Fach ist immer aufgeklappt.
 */
export function ContentTree(props: ContentTreeProps) {
  const { tree, klasse, selected, expanded, onToggle } = props
  const itemRefs = useRef(new Map<string, HTMLDivElement>())
  const [focusKey, setFocusKey] = useState<string | null>(null)

  const nodes = useMemo(() => {
    const list: Node[] = [
      {
        key: ALL_KEY,
        kind: 'all',
        level: 1,
        parentKey: null,
        label: 'Alle Fächer',
        totals: totalsFor(tree, klasse),
        expandable: false,
        expanded: false,
      },
    ]
    const grouped = tree.departments.length > 1
    for (const dept of tree.departments) {
      dept.subjects.forEach((subject, i) => {
        const sKey = subjectKey(subject.id)
        const visibleTopics = subject.topics.filter((t) => topicVisible(t, klasse))
        const noTopicCount = countFor(subject.no_topic, klasse)
        const sOpen = selected.subjectId === subject.id || expanded.has(sKey)
        list.push({
          key: sKey,
          kind: 'subject',
          level: 1,
          parentKey: null,
          label: subject.name,
          totals: totalsFor(subject, klasse),
          expandable: true,
          expanded: sOpen,
          heading: grouped && i === 0 ? dept.name : undefined,
          subject,
        })
        if (!sOpen) return
        for (const topic of visibleTopics) {
          list.push({
            key: `t:${topic.id}`,
            kind: 'topic',
            level: 2,
            parentKey: sKey,
            label: topic.name,
            totals: totalsFor(topic, klasse),
            expandable: false,
            expanded: false,
            subject,
            topic,
          })
        }
        if (noTopicCount > 0) {
          list.push({
            key: `n:${subject.id}`,
            kind: 'notopic',
            level: 2,
            parentKey: sKey,
            label: 'Ohne Thema',
            totals: totalsFor({ counts: subject.no_topic, hidden: subject.no_topic_hidden }, klasse),
            expandable: false,
            expanded: false,
            subject,
          })
        }
        list.push({
          key: `a:${subject.id}`,
          kind: 'add',
          level: 2,
          parentKey: sKey,
          label: 'Thema hinzufügen',
          totals: null,
          expandable: false,
          expanded: false,
          subject,
        })
      })
    }
    return list
  }, [tree, klasse, expanded, selected.subjectId])

  const selectedKey =
    selected.subjectId == null
      ? ALL_KEY
      : selected.topicId == null
        ? subjectKey(selected.subjectId)
        : selected.topicId === NO_TOPIC
          ? `n:${selected.subjectId}`
          : `t:${selected.topicId}`

  // Der Eintrag, der per Tab erreichbar ist: zuletzt fokussiert, sonst gewählt, sonst erster
  const tabbableKey =
    (focusKey && nodes.some((n) => n.key === focusKey) ? focusKey : null) ??
    (selectedKey && nodes.some((n) => n.key === selectedKey) ? selectedKey : null) ??
    nodes[0]?.key ??
    null

  const focusNode = useCallback((key: string) => {
    setFocusKey(key)
    itemRefs.current.get(key)?.focus()
  }, [])

  function activate(node: Node) {
    if (node.kind === 'all') props.onSelectAll()
    else if (node.kind === 'subject') props.onSelectSubject(node.subject!)
    else if (node.kind === 'add') props.onCreateTopic(node.subject!)
    else props.onSelectTopic(node.subject!, node.kind === 'notopic' ? NO_TOPIC : node.topic!.id)
  }

  function handleKeyDown(e: KeyboardEvent<HTMLDivElement>, node: Node, index: number) {
    // Tasten im ⋯-Menü oder am Auf-/Zuklapp-Knopf gehören nicht dem Baum
    if (e.target !== e.currentTarget) return
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        if (nodes[index + 1]) focusNode(nodes[index + 1].key)
        break
      case 'ArrowUp':
        e.preventDefault()
        if (nodes[index - 1]) focusNode(nodes[index - 1].key)
        break
      case 'Home':
        e.preventDefault()
        focusNode(nodes[0].key)
        break
      case 'End':
        e.preventDefault()
        focusNode(nodes[nodes.length - 1].key)
        break
      case 'ArrowRight':
        e.preventDefault()
        if (node.expandable && !node.expanded) onToggle(node.key)
        else if (node.expanded && nodes[index + 1]?.parentKey === node.key) focusNode(nodes[index + 1].key)
        break
      case 'ArrowLeft':
        e.preventDefault()
        if (node.expandable && node.expanded) onToggle(node.key)
        else if (node.parentKey) focusNode(node.parentKey)
        break
      case 'Enter':
      case ' ':
        e.preventDefault()
        activate(node)
        break
    }
  }

  return (
    <div role="tree" aria-label="Fächer und Themen" className="space-y-0.5 p-2">
      {nodes.map((node, index) => {
        const isSelected = node.key === selectedKey
        const subject = node.subject
        const stufe = node.kind === 'topic' && klasse === 'all' ? levelLabel(node.topic!.counts) : ''
        return (
          <Fragment key={node.key}>
            {node.heading && (
              <p role="presentation" className="px-3 pb-1 pt-3 text-xs font-semibold uppercase tracking-wide text-ws-faint">
                {node.heading}
              </p>
            )}
            <div
              ref={(el) => {
                if (el) itemRefs.current.set(node.key, el)
                else itemRefs.current.delete(node.key)
              }}
              role="treeitem"
              aria-level={node.level}
              aria-selected={node.kind === 'add' ? undefined : isSelected}
              aria-expanded={node.expandable ? node.expanded : undefined}
              tabIndex={node.key === tabbableKey ? 0 : -1}
              onFocus={(e) => e.target === e.currentTarget && setFocusKey(node.key)}
              onKeyDown={(e) => handleKeyDown(e, node, index)}
              onClick={() => activate(node)}
              className={cn(
                'group flex min-h-11 cursor-pointer items-center gap-1 rounded-xl pr-1 text-sm outline-none transition-colors duration-200',
                'focus-visible:ring-2 focus-visible:ring-ws-green',
                // Themen: eingerückt mit Linie, damit die Ordnung auf einen Blick sichtbar ist
                node.level === 2 && 'ml-6 rounded-l-none border-l-2 border-ws-line pl-3',
                node.kind === 'all' && 'pl-3 font-semibold',
                isSelected ? 'bg-ws-raised font-semibold text-ws-text ring-1 ring-inset ring-ws-line' : 'text-ws-text hover:bg-ws-raised',
                node.kind === 'add' && 'text-ws-muted hover:text-ws-text',
              )}
            >
              {node.expandable && (
                <button
                  type="button"
                  tabIndex={-1}
                  aria-label={`${subject!.code} ${node.expanded ? 'zuklappen' : 'aufklappen'}`}
                  onClick={(e) => {
                    e.stopPropagation()
                    onToggle(node.key)
                  }}
                  className="flex size-11 shrink-0 items-center justify-center rounded-xl text-ws-muted hover:text-ws-text"
                >
                  <ChevronRight
                    className={cn('size-4 transition-transform duration-200', node.expanded && 'rotate-90')}
                    aria-hidden
                  />
                </button>
              )}
              {node.kind === 'all' && <Library className="mr-1 size-4 shrink-0 text-ws-muted" aria-hidden />}
              {node.kind === 'add' && <Plus className="size-4 shrink-0" aria-hidden />}
              {node.kind === 'subject' ? (
                <span className={cn('min-w-0 flex-1 py-1', !subject!.is_active && 'text-ws-muted')}>
                  <span className="block truncate font-bold" title={subject!.code}>
                    {subject!.code}
                  </span>
                  <span className="block truncate text-xs font-normal text-ws-muted" title={subject!.name}>
                    {subject!.name}
                  </span>
                </span>
              ) : (
                <span className="flex min-w-0 flex-1 items-baseline gap-2">
                  <span
                    className={cn('truncate', node.kind === 'notopic' && 'italic')}
                    title={node.label}
                  >
                    {node.label}
                  </span>
                  {stufe && <span className="shrink-0 text-xs font-normal text-ws-faint">{stufe}</span>}
                </span>
              )}
              {node.kind === 'subject' && !subject!.is_active && (
                <span className="shrink-0 rounded-full border border-ws-line px-2 py-0.5 text-xs font-normal text-ws-muted">
                  ausgeblendet
                </span>
              )}
              {node.totals && <Count totals={node.totals} />}
              {(node.kind === 'subject' || node.kind === 'topic') && (
                <div
                  className="shrink-0"
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => e.stopPropagation()}
                >
                  {node.kind === 'subject' ? (
                    <AdminRowActions
                      subject={`Fach ${subject!.code}`}
                      items={[
                        { key: 'edit', label: 'Fach bearbeiten', icon: <Pencil />, onSelect: () => props.onEditSubject(subject!) },
                        { key: 'create-topic', label: 'Thema hinzufügen', icon: <Plus />, onSelect: () => props.onCreateTopic(subject!) },
                        {
                          key: 'toggle',
                          label: subject!.is_active ? 'Für Azubis ausblenden …' : 'Für Azubis einblenden',
                          icon: subject!.is_active ? <EyeOff /> : <Eye />,
                          onSelect: () => props.onToggleSubjectActive(subject!),
                        },
                        { key: 'history', label: 'Verlauf', icon: <History className="text-ws-muted" />, onSelect: () => props.onSubjectHistory(subject!) },
                      ]}
                    />
                  ) : (
                    <AdminRowActions
                      subject={`Thema ${node.label}`}
                      items={[
                        { key: 'rename', label: 'Umbenennen', icon: <Pencil />, onSelect: () => props.onRenameTopic(subject!, node.topic!) },
                        { key: 'history', label: 'Verlauf', icon: <History className="text-ws-muted" />, onSelect: () => props.onTopicHistory(node.topic!) },
                        { key: 'delete', label: 'Löschen', icon: <Trash2 />, destructive: true, onSelect: () => props.onDeleteTopic(subject!, node.topic!) },
                      ]}
                    />
                  )}
                </div>
              )}
            </div>
          </Fragment>
        )
      })}
    </div>
  )
}
