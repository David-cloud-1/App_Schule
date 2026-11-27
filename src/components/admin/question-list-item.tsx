'use client'

import { useId } from 'react'
import { ChevronDown, Copy, History, Pencil, Trash2 } from 'lucide-react'
import { AdminRowActions } from '@/components/admin/admin-row-actions'
import { DepartmentTag, LastChangedLine } from '@/components/admin/content-meta'
import { QuestionAnswers } from '@/components/admin/question-answers'
import type { AdminQuestion } from '@/components/admin/question-form-modal'
import { DifficultyBadge } from '@/components/difficulty-badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'

export type ListQuestion = AdminQuestion & {
  topics?: { id: string; name: string } | null
  question_subjects: {
    subjects: {
      id: string
      code: string
      name: string
      departments?: { name: string; code: string } | null
    } | null
  }[]
  hidden_info?: string | null
  last_changed_by?: string | null
  last_changed_at?: string | null
}

const pill = 'rounded-full border px-2 py-0.5 text-xs font-medium'

function uniqueDepartments(q: ListQuestion) {
  const seen = new Map<string, { name: string; code: string }>()
  for (const qs of q.question_subjects ?? []) {
    const d = qs.subjects?.departments
    if (d) seen.set(d.code, d)
  }
  return Array.from(seen.values())
}

/** Eine Frage im Reiter „Fragen“ (PROJ-131): ganzer Text, aufklappbar, Aktionen immer sichtbar. */
export function QuestionListItem({
  question: q,
  expanded,
  selected,
  onToggleExpanded,
  onToggleSelected,
  onToggleVisible,
  onEdit,
  onDuplicate,
  onHistory,
  onDelete,
  onReleaseForPractice,
}: {
  question: ListQuestion
  expanded: boolean
  selected: boolean
  onToggleExpanded: () => void
  onToggleSelected: () => void
  onToggleVisible: (visible: boolean) => void
  onEdit: () => void
  onDuplicate: () => void
  onHistory: () => void
  onDelete: () => void
  onReleaseForPractice: () => void
}) {
  const panelId = useId()
  const codes = Array.from(new Set(q.question_subjects.flatMap((qs) => (qs.subjects ? [qs.subjects.code] : []))))
  const short = q.question_text.slice(0, 40)
  return (
    <li className={cn('px-2 py-3 sm:px-3', selected && 'bg-ws-raised/60')}>
      <div className="flex items-start gap-1">
        <label className="flex size-11 shrink-0 cursor-pointer items-center justify-center">
          <Checkbox
            checked={selected}
            onCheckedChange={onToggleSelected}
            aria-label={`Frage auswählen: ${short}`}
            className="border-ws-line"
          />
        </label>
        <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-start">
          <div className="min-w-0 flex-1">
            <button
              type="button"
              aria-expanded={expanded}
              aria-controls={expanded ? panelId : undefined}
              onClick={onToggleExpanded}
              className="flex min-h-11 w-full items-start gap-2 rounded-lg py-2.5 text-left outline-none focus-visible:ring-2 focus-visible:ring-ws-green"
            >
              <span className="min-w-0 flex-1 whitespace-pre-line break-words text-ws-text">{q.question_text}</span>
              <ChevronDown
                className={cn('mt-1 size-4 shrink-0 text-ws-muted transition-transform duration-200', expanded && 'rotate-180')}
                aria-hidden
              />
            </button>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ws-muted">
              <span>
                {codes.join(', ') || 'Ohne Fach'} › {q.topics?.name ?? 'Ohne Thema'}
              </span>
              <span aria-hidden>·</span>
              <span>{q.class_level != null ? `Stufe ${q.class_level}` : 'Alle Stufen'}</span>
              <DifficultyBadge difficulty={q.difficulty} />
              {!q.is_active && <span className={cn(pill, 'border-ws-line text-ws-muted')}>ausgeblendet</span>}
              {q.assessment_only && (
                <span className={cn(pill, 'border-ws-orange/30 bg-ws-orange/15 text-ws-orange')}>Nur für Nachweise</span>
              )}
              {q.is_private && (
                <span
                  className={cn(pill, 'border-ws-gold/30 bg-ws-gold/15 text-ws-gold')}
                  title="Private Nachweis-Frage einer Lehrkraft — kann nie für den Übungsbetrieb freigegeben werden"
                >
                  Privat
                </span>
              )}
              {uniqueDepartments(q).map((d) => (
                <DepartmentTag key={d.code} name={d.name} code={d.code} />
              ))}
            </div>
            {!q.is_active && q.hidden_info && <p className="mt-1 text-xs text-ws-muted">{q.hidden_info}</p>}
            <div className="mt-1">
              <LastChangedLine by={q.last_changed_by} at={q.last_changed_at} />
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 sm:justify-end">
            <label className="flex min-h-11 cursor-pointer items-center gap-2 text-xs text-ws-muted">
              <Switch
                checked={q.is_active}
                onCheckedChange={onToggleVisible}
                aria-label={`Für Azubis sichtbar: ${short}`}
              />
              Für Azubis sichtbar
            </label>
            <div className="flex items-center gap-1">
              {q.assessment_only && !q.is_private && (
                <Button
                  variant="outline"
                  onClick={onReleaseForPractice}
                  className="min-h-11 rounded-xl border-ws-line text-ws-text hover:bg-ws-raised"
                  title="Frage auch im Quiz und in den Übungsmodi anzeigen"
                >
                  Für Übung freigeben
                </Button>
              )}
              <AdminRowActions
                subject={`Frage ${short}`}
                editIcon={<Pencil className="size-4" />}
                onEdit={onEdit}
                items={[
                  { key: 'history', label: 'Verlauf', icon: <History className="text-ws-muted" />, onSelect: onHistory },
                  { key: 'duplicate', label: 'Duplizieren', icon: <Copy className="text-ws-muted" />, onSelect: onDuplicate },
                  { key: 'delete', label: 'Löschen', icon: <Trash2 />, destructive: true, onSelect: onDelete },
                ]}
              />
            </div>
          </div>
        </div>
      </div>
      {expanded && (
        <div id={panelId} className="mt-2 sm:pl-12">
          <QuestionAnswers question={q} />
        </div>
      )}
    </li>
  )
}
