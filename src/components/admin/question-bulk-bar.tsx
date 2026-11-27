'use client'

import { useState } from 'react'
import { Eye, EyeOff, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export type BulkTopicOption = { id: string; label: string }
export type BulkSubjectOption = { id: string; label: string }

/** Felder, die die Massenänderung setzen kann (Schnittstelle `/api/admin/questions/bulk`) */
export type BulkChange = {
  topic_id?: string | null
  class_level?: 10 | 11 | 12 | null
  subject_id?: string
  difficulty?: 'leicht' | 'mittel' | 'schwer'
}

const trigger = 'min-h-11 w-full rounded-xl border-ws-line bg-ws-surface text-ws-text sm:w-44'
const content = 'border-ws-line bg-ws-surface text-ws-text'

/** Leiste für die Mehrfachauswahl (PROJ-131, E4): ersetzt die Auswahl der alten Seite „Fragen“. */
export function QuestionBulkBar({
  count,
  topics,
  subjects,
  classLevels,
  busy,
  onApply,
  onShow,
  onHide,
  onDelete,
  onClear,
}: {
  count: number
  topics: BulkTopicOption[]
  subjects: BulkSubjectOption[]
  classLevels: { value: string; label: string }[]
  busy: boolean
  onApply: (change: BulkChange) => void
  onShow: () => void
  onHide: () => void
  onDelete: () => void
  onClear: () => void
}) {
  const [topic, setTopic] = useState('')
  const [level, setLevel] = useState('')
  const [subject, setSubject] = useState('')
  const [difficulty, setDifficulty] = useState('')
  const hasChange = !!(topic || level || subject || difficulty)

  function apply() {
    const change: BulkChange = {}
    if (topic) change.topic_id = topic === '_none' ? null : topic
    if (level) change.class_level = level === '_all' ? null : (Number(level) as 10 | 11 | 12)
    if (subject) change.subject_id = subject
    if (difficulty) change.difficulty = difficulty as BulkChange['difficulty']
    onApply(change)
    setTopic('')
    setLevel('')
    setSubject('')
    setDifficulty('')
  }

  return (
    <div role="region" aria-label="Mehrfachauswahl" className="space-y-3 rounded-2xl border border-ws-line bg-ws-surface p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="font-semibold text-ws-text" aria-live="polite">
          {count} ausgewählt
        </p>
        <Button variant="ghost" onClick={onClear} className="min-h-11 text-ws-muted hover:text-ws-text">
          <X className="size-4" aria-hidden />
          Auswahl aufheben
        </Button>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <Select value={topic} onValueChange={setTopic}>
          <SelectTrigger className={trigger} aria-label="Thema ändern">
            <SelectValue placeholder="Thema ändern …" />
          </SelectTrigger>
          <SelectContent className={content}>
            <SelectItem value="_none">Ohne Thema</SelectItem>
            {topics.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={level} onValueChange={setLevel}>
          <SelectTrigger className={trigger} aria-label="Stufe ändern">
            <SelectValue placeholder="Stufe …" />
          </SelectTrigger>
          <SelectContent className={content}>
            <SelectItem value="_all">Alle Stufen</SelectItem>
            {classLevels.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={subject} onValueChange={setSubject}>
          <SelectTrigger className={trigger} aria-label="Fach ändern">
            <SelectValue placeholder="Fach …" />
          </SelectTrigger>
          <SelectContent className={content}>
            {subjects.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={difficulty} onValueChange={setDifficulty}>
          <SelectTrigger className={trigger} aria-label="Schwierigkeit ändern">
            <SelectValue placeholder="Schwierigkeit …" />
          </SelectTrigger>
          <SelectContent className={content}>
            <SelectItem value="leicht">Leicht</SelectItem>
            <SelectItem value="mittel">Mittel</SelectItem>
            <SelectItem value="schwer">Schwer</SelectItem>
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          disabled={busy || !hasChange}
          onClick={apply}
          className="min-h-11 rounded-xl border-ws-line text-ws-text hover:bg-ws-raised"
        >
          Anwenden
        </Button>
      </div>
      <div className="flex flex-wrap gap-2 border-t border-ws-line pt-3">
        <Button variant="outline" disabled={busy} onClick={onShow} className="min-h-11 rounded-xl border-ws-line text-ws-text hover:bg-ws-raised">
          <Eye className="size-4" aria-hidden />
          Einblenden
        </Button>
        <Button variant="outline" disabled={busy} onClick={onHide} className="min-h-11 rounded-xl border-ws-line text-ws-text hover:bg-ws-raised">
          <EyeOff className="size-4" aria-hidden />
          Ausblenden …
        </Button>
        <Button variant="outline" disabled={busy} onClick={onDelete} className="min-h-11 rounded-xl border-ws-red/30 text-ws-red hover:bg-ws-red/15 sm:ml-auto">
          <Trash2 className="size-4" aria-hidden />
          Löschen …
        </Button>
      </div>
    </div>
  )
}
