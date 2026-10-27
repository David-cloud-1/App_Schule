'use client'

import { useMemo, useState } from 'react'
import { Search, Trash2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

/** Schlanke Frage für die Auswahl (Bereichs-Pool + eigene private Nachweis-Fragen, PROJ-46) */
export type PickerQuestion = {
  id: string
  question_text: string
  difficulty: string
  class_level: number | null
  topic: string | null
  subject_codes: string[]
  /** Eigene Nachweis-Frage (PROJ-46) — trägt das Schild „Meine Frage“ und ist bearbeitbar/löschbar */
  isPrivate?: boolean
}

type PickerSort = 'newest' | 'class' | 'subject' | 'topic' | 'difficulty' | 'text'

const SORT_LABELS: Record<PickerSort, string> = {
  newest: 'Neueste zuerst',
  class: 'Klasse',
  subject: 'Fach',
  topic: 'Thema',
  difficulty: 'Schwierigkeit',
  text: 'Fragetext A–Z',
}
const DIFFICULTY_ORDER: Record<string, number> = { leicht: 0, mittel: 1, schwer: 2 }

const TRIGGER = 'bg-ws-bg border-ws-line text-ws-text rounded-xl'
const CONTENT = 'bg-ws-surface border-ws-line text-ws-text'

interface Props {
  /** Alle zur Auswahl stehenden Fragen in Serverreihenfolge (neueste zuerst) */
  questions: PickerQuestion[]
  selectedIds: Set<string>
  onChange: (next: Set<string>) => void
  minSelection?: number
  /**
   * PROJ-49: Frage ansehen bzw. bearbeiten — private Fragen immer, Pool-Fragen
   * nur wenn `canEditPool` gesetzt ist. `editable` sagt dem Aufrufer, ob der
   * Dialog im Bearbeiten- oder nur-ansehen-Modus geöffnet werden soll.
   */
  onOpenQuestion?: (question: PickerQuestion, editable: boolean) => void
  /** PROJ-46: eigene private Frage löschen */
  onDeletePrivate?: (question: PickerQuestion) => void
  /** Darf die anfragende Person Pool-Fragen dieses Zielbereichs bearbeiten? (Bereichs-/Super-Admin) */
  canEditPool?: boolean
}

/**
 * Fragenauswahl mit Suche, Filter und Sortierung — Alle/Keine wirkt nur auf
 * die gefilterte Liste, bereits gewählte, gerade ausgeblendete Fragen bleiben.
 * Klassenstufen-Filter kommt aus den geladenen Fragen selbst (nicht aus dem
 * Bereich der anfragenden Person) — richtig auch für einen fremden Zielbereich.
 */
export function QuestionPicker({ questions, selectedIds, onChange, minSelection = 5, onOpenQuestion, onDeletePrivate, canEditPool = false }: Props) {
  const classLevelOptions = useMemo(() => {
    const levels = [...new Set(questions.map((q) => q.class_level).filter((l): l is number => l != null))]
    return levels.sort((a, b) => a - b).map((l) => ({ value: String(l), label: `Klasse ${l}` }))
  }, [questions])
  const [search, setSearch] = useState('')
  const [classLevel, setClassLevel] = useState('all')
  const [subject, setSubject] = useState('all')
  const [topic, setTopic] = useState('all')
  const [sort, setSort] = useState<PickerSort>('newest')

  // Fächer und Klassen, zu denen es tatsächlich Fragen gibt
  const subjectCodes = useMemo(
    () => [...new Set(questions.flatMap((q) => q.subject_codes))].sort((a, b) => a.localeCompare(b, 'de')),
    [questions],
  )

  const topicOptions = useMemo(() => {
    const names = questions
      .filter((q) => classLevel === 'all' || String(q.class_level ?? '') === classLevel)
      .filter((q) => subject === 'all' || q.subject_codes.includes(subject))
      .map((q) => q.topic)
      .filter((n): n is string => !!n)
    return [...new Set(names)].sort((a, b) => a.localeCompare(b, 'de'))
  }, [questions, classLevel, subject])

  // Array.sort ist stabil: bei Gleichstand bleibt die Serverreihenfolge (neueste zuerst)
  const visible = useMemo(() => {
    const needle = search.trim().toLowerCase()
    const list = questions.filter((q) => {
      if (needle && !q.question_text.toLowerCase().includes(needle) && !(q.topic ?? '').toLowerCase().includes(needle)) return false
      if (classLevel !== 'all' && String(q.class_level ?? '') !== classLevel) return false
      if (subject !== 'all' && !q.subject_codes.includes(subject)) return false
      if (topic !== 'all' && (q.topic ?? '') !== topic) return false
      return true
    })
    const byText = (a: string, b: string) => a.localeCompare(b, 'de')
    if (sort === 'class') list.sort((a, b) => (a.class_level ?? 99) - (b.class_level ?? 99))
    else if (sort === 'subject') list.sort((a, b) => byText(a.subject_codes.join('/'), b.subject_codes.join('/')))
    else if (sort === 'topic') list.sort((a, b) => byText(a.topic ?? '￿', b.topic ?? '￿'))
    else if (sort === 'difficulty') list.sort((a, b) => (DIFFICULTY_ORDER[a.difficulty] ?? 9) - (DIFFICULTY_ORDER[b.difficulty] ?? 9))
    else if (sort === 'text') list.sort((a, b) => byText(a.question_text, b.question_text))
    return list
  }, [questions, search, classLevel, subject, topic, sort])

  const allVisibleSelected = visible.length > 0 && visible.every((q) => selectedIds.has(q.id))

  function toggleVisible() {
    const next = new Set(selectedIds)
    visible.forEach((q) => (allVisibleSelected ? next.delete(q.id) : next.add(q.id)))
    onChange(next)
  }

  function toggleOne(id: string, checked: boolean) {
    const next = new Set(selectedIds)
    if (checked) next.add(id)
    else next.delete(id)
    onChange(next)
  }

  const enough = selectedIds.size >= minSelection

  return (
    <div className="space-y-2">
      <div className="sticky top-0 z-10 flex items-center justify-between rounded-xl bg-ws-bg px-3 py-2 text-sm">
        <span className="text-ws-muted">Gewählte Fragen</span>
        <span className={enough ? 'font-semibold text-ws-green' : 'font-semibold text-ws-orange'}>
          {selectedIds.size} (min. {minSelection})
        </span>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <Select value={classLevel} onValueChange={(v) => { setClassLevel(v); setTopic('all') }}>
          <SelectTrigger className={TRIGGER} aria-label="Klasse"><SelectValue /></SelectTrigger>
          <SelectContent className={CONTENT}>
            <SelectItem value="all">Klasse: gemischt</SelectItem>
            {classLevelOptions.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={subject} onValueChange={(v) => { setSubject(v); setTopic('all') }}>
          <SelectTrigger className={TRIGGER} aria-label="Fach"><SelectValue /></SelectTrigger>
          <SelectContent className={CONTENT}>
            <SelectItem value="all">Fach: gemischt</SelectItem>
            {subjectCodes.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={topic} onValueChange={setTopic}>
          <SelectTrigger className={TRIGGER} aria-label="Thema"><SelectValue /></SelectTrigger>
          <SelectContent className={`${CONTENT} max-h-72`}>
            <SelectItem value="all">Thema: gemischt</SelectItem>
            {topicOptions.map((n) => <SelectItem key={n} value={n}>{n}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ws-muted" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Stichwort in Frage oder Thema…"
            aria-label="Fragen durchsuchen"
            className="pl-9 bg-ws-bg border-ws-line text-ws-text rounded-xl"
          />
        </div>
        <Select value={sort} onValueChange={(v) => setSort(v as PickerSort)}>
          <SelectTrigger className={TRIGGER} aria-label="Sortierung"><SelectValue /></SelectTrigger>
          <SelectContent className={CONTENT}>
            {(Object.keys(SORT_LABELS) as PickerSort[]).map((k) => (
              <SelectItem key={k} value={k}>Sortieren: {SORT_LABELS[k]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center justify-between text-xs text-ws-muted">
        <span>{visible.length} von {questions.length} Fragen</span>
        <button type="button" className="min-h-11 px-2 text-ws-blue hover:underline" onClick={toggleVisible}>
          {allVisibleSelected ? 'Angezeigte abwählen' : 'Alle angezeigten wählen'}
        </button>
      </div>

      <div className="max-h-72 space-y-1 overflow-y-auto rounded-xl bg-ws-bg p-3">
        {visible.length === 0 ? (
          <p className="py-6 text-center text-sm text-ws-muted">
            {questions.length === 0 ? 'Keine passenden Fragen vorhanden.' : 'Keine Frage passt zu den Filtern.'}
          </p>
        ) : (
          visible.map((q) => {
            const editable = q.isPrivate || canEditPool
            return (
              <div key={q.id} className="group flex items-start gap-3 py-2">
                <label className="flex min-w-0 flex-1 cursor-pointer items-start gap-3">
                  <Checkbox
                    checked={selectedIds.has(q.id)}
                    onCheckedChange={(checked) => toggleOne(q.id, checked === true)}
                    className="mt-0.5 border-ws-line data-[state=checked]:border-ws-green data-[state=checked]:bg-ws-green"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs leading-snug text-ws-text">
                      {q.question_text.slice(0, 100)}{q.question_text.length > 100 ? '…' : ''}
                    </p>
                    <span className="text-xs text-ws-blue">
                      {q.difficulty}
                      {q.class_level != null && ` · Kl. ${q.class_level}`}
                      {q.subject_codes.length > 0 && ` · ${q.subject_codes.join('/')}`}
                      {q.topic && ` · ${q.topic}`}
                    </span>
                    {q.isPrivate && (
                      <Badge className="ml-2 border-0 bg-ws-gold/15 text-ws-gold text-[10px]">Meine Frage</Badge>
                    )}
                  </div>
                </label>
                {(onOpenQuestion || (q.isPrivate && onDeletePrivate)) && (
                  <div className="flex shrink-0 gap-1">
                    {onOpenQuestion && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => onOpenQuestion(q, editable)}
                        aria-label={`„${q.question_text.slice(0, 40)}“ ${editable ? 'bearbeiten' : 'ansehen'}`}
                        className="h-9 px-2 text-ws-muted hover:text-ws-text"
                      >
                        {editable ? 'Bearbeiten' : 'Ansehen'}
                      </Button>
                    )}
                    {q.isPrivate && onDeletePrivate && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => onDeletePrivate(q)}
                        aria-label={`„${q.question_text.slice(0, 40)}“ löschen`}
                        className="size-9 text-ws-muted hover:text-ws-red"
                      >
                        <Trash2 size={14} />
                      </Button>
                    )}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
