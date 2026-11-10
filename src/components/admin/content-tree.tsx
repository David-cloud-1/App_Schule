'use client'

import { useCallback, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { Building2, ChevronRight, FileQuestion, FolderOpen, History, Layers, Pencil, Plus, Power, Trash2 } from 'lucide-react'
import { AdminRowActions } from '@/components/admin/admin-row-actions'
import { cn } from '@/lib/utils'
import {
  NO_TOPIC,
  countFor,
  topicVisible,
  type ClassFilter,
  type ContentTree as ContentTreeData,
  type LevelCounts,
  type TreeSubject,
  type TreeTopic,
} from '@/lib/content-tree'

type Node = {
  key: string
  kind: 'department' | 'subject' | 'topic' | 'notopic'
  level: 1 | 2 | 3
  parentKey: string | null
  label: string
  count: number | null
  expandable: boolean
  expanded: boolean
  inactive?: boolean
  subject?: TreeSubject
  topic?: TreeTopic
}

export interface ContentTreeProps {
  tree: ContentTreeData
  klasse: ClassFilter
  /** Gewählter Knoten: Fach-ID und Thema-ID oder `ohne` */
  selected: { subjectId: string | null; topicId: string | null }
  expanded: ReadonlySet<string>
  onToggle: (key: string) => void
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
const departmentKey = (id: string) => `d:${id}`

function Count({ counts, klasse }: { counts: LevelCounts; klasse: ClassFilter }) {
  const n = countFor(counts, klasse)
  return (
    <span
      className={cn(
        'shrink-0 rounded-full px-2 py-0.5 text-xs tabular-nums',
        n === 0 ? 'text-ws-faint' : 'bg-ws-raised text-ws-muted',
      )}
      title={n === 0 ? 'Keine Fragen' : `${n} ${n === 1 ? 'Frage' : 'Fragen'}`}
    >
      {n}
    </span>
  )
}

/**
 * Baum aus Bereich → Fach → Thema (PROJ-85) mit Baum-Rolle und Tastatur:
 * Pfeil hoch/runter bewegt, rechts/links klappt auf und zu, Enter wählt.
 */
export function ContentTree(props: ContentTreeProps) {
  const { tree, klasse, selected, expanded, onToggle } = props
  const itemRefs = useRef(new Map<string, HTMLDivElement>())
  const [focusKey, setFocusKey] = useState<string | null>(null)

  const nodes = useMemo(() => {
    const list: Node[] = []
    for (const dept of tree.departments) {
      const dKey = departmentKey(dept.id)
      const dOpen = expanded.has(dKey)
      list.push({
        key: dKey,
        kind: 'department',
        level: 1,
        parentKey: null,
        label: dept.name,
        count: null,
        expandable: dept.subjects.length > 0,
        expanded: dOpen,
      })
      if (!dOpen) continue
      for (const subject of dept.subjects) {
        const sKey = subjectKey(subject.id)
        const visibleTopics = subject.topics.filter((t) => topicVisible(t, klasse))
        const noTopicCount = countFor(subject.no_topic, klasse)
        const hasChildren = visibleTopics.length > 0 || noTopicCount > 0
        const sOpen = hasChildren && expanded.has(sKey)
        list.push({
          key: sKey,
          kind: 'subject',
          level: 2,
          parentKey: dKey,
          label: subject.name,
          count: countFor(subject.counts, klasse),
          expandable: hasChildren,
          expanded: sOpen,
          inactive: !subject.is_active,
          subject,
        })
        if (!sOpen) continue
        for (const topic of visibleTopics) {
          list.push({
            key: `t:${topic.id}`,
            kind: 'topic',
            level: 3,
            parentKey: sKey,
            label: topic.name,
            count: countFor(topic.counts, klasse),
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
            level: 3,
            parentKey: sKey,
            label: 'Ohne Thema',
            count: noTopicCount,
            expandable: false,
            expanded: false,
            subject,
          })
        }
      }
    }
    return list
  }, [tree, klasse, expanded])

  const selectedKey =
    selected.subjectId == null
      ? null
      : selected.topicId == null
        ? subjectKey(selected.subjectId)
        : selected.topicId === NO_TOPIC
          ? `n:${selected.subjectId}`
          : `t:${selected.topicId}`

  // Der Knoten, der per Tab erreichbar ist: zuletzt fokussiert, sonst gewählt, sonst erster
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
    if (node.kind === 'department') onToggle(node.key)
    else if (node.kind === 'subject' && node.subject) props.onSelectSubject(node.subject)
    else if (node.subject) props.onSelectTopic(node.subject, node.kind === 'notopic' ? NO_TOPIC : node.topic!.id)
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
        return (
          <div
            key={node.key}
            ref={(el) => {
              if (el) itemRefs.current.set(node.key, el)
              else itemRefs.current.delete(node.key)
            }}
            role="treeitem"
            aria-level={node.level}
            aria-selected={node.kind === 'department' ? undefined : isSelected}
            aria-expanded={node.expandable ? node.expanded : undefined}
            tabIndex={node.key === tabbableKey ? 0 : -1}
            onFocus={(e) => e.target === e.currentTarget && setFocusKey(node.key)}
            onKeyDown={(e) => handleKeyDown(e, node, index)}
            onClick={() => activate(node)}
            className={cn(
              'group flex min-h-11 cursor-pointer items-center gap-1 rounded-xl pr-1 text-sm outline-none transition-colors duration-200',
              'focus-visible:ring-2 focus-visible:ring-ws-green',
              node.level === 2 && 'pl-1',
              node.level === 3 && 'pl-7',
              isSelected ? 'bg-ws-green/15 font-semibold text-ws-text' : 'text-ws-text hover:bg-ws-raised',
              node.kind === 'department' && 'font-semibold',
            )}
          >
            {node.expandable ? (
              <button
                type="button"
                tabIndex={-1}
                aria-label={`${node.label} ${node.expanded ? 'zuklappen' : 'aufklappen'}`}
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
            ) : (
              <span className="size-11 shrink-0 flex items-center justify-center text-ws-faint" aria-hidden>
                {node.kind === 'department' ? (
                  <Building2 className="size-4" />
                ) : node.kind === 'notopic' ? (
                  <FileQuestion className="size-4" />
                ) : node.kind === 'subject' ? (
                  <FolderOpen className="size-4" />
                ) : (
                  <Layers className="size-4" />
                )}
              </span>
            )}
            <span
              className={cn('min-w-0 flex-1 truncate', node.inactive && 'text-ws-muted', node.kind === 'notopic' && 'italic')}
              title={node.label}
            >
              {node.label}
            </span>
            {node.inactive && (
              <span className="shrink-0 rounded-full border border-ws-line px-2 py-0.5 text-xs text-ws-muted">inaktiv</span>
            )}
            {node.count != null && node.subject && (
              <Count
                counts={
                  node.kind === 'subject'
                    ? node.subject.counts
                    : node.kind === 'notopic'
                      ? node.subject.no_topic
                      : node.topic!.counts
                }
                klasse={klasse}
              />
            )}
            {(node.kind === 'subject' || node.kind === 'topic') && node.subject && (
              <div
                className="shrink-0"
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => e.stopPropagation()}
              >
                {node.kind === 'subject' ? (
                  <AdminRowActions
                    subject={`Fach ${node.label}`}
                    items={[
                      { key: 'edit', label: 'Fach bearbeiten', icon: <Pencil />, onSelect: () => props.onEditSubject(node.subject!) },
                      {
                        key: 'toggle',
                        label: node.subject.is_active ? 'Deaktivieren' : 'Aktivieren',
                        icon: <Power />,
                        onSelect: () => props.onToggleSubjectActive(node.subject!),
                      },
                      { key: 'create-topic', label: 'Thema anlegen', icon: <Plus />, onSelect: () => props.onCreateTopic(node.subject!) },
                      { key: 'history', label: 'Verlauf', icon: <History className="text-ws-muted" />, onSelect: () => props.onSubjectHistory(node.subject!) },
                    ]}
                  />
                ) : (
                  <AdminRowActions
                    subject={`Thema ${node.label}`}
                    items={[
                      { key: 'rename', label: 'Umbenennen', icon: <Pencil />, onSelect: () => props.onRenameTopic(node.subject!, node.topic!) },
                      { key: 'history', label: 'Verlauf', icon: <History className="text-ws-muted" />, onSelect: () => props.onTopicHistory(node.topic!) },
                      { key: 'delete', label: 'Löschen', icon: <Trash2 />, destructive: true, onSelect: () => props.onDeleteTopic(node.subject!, node.topic!) },
                    ]}
                  />
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
