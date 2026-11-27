'use client'

import { useCallback, useEffect, useId, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { BarChart3, ChevronDown, FilePlus2, FolderOpen, Pencil } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useOptionalAdminRole } from '@/components/admin/admin-role-provider'
import { groupByDepartment, MAX_HANDOFF_QUESTIONS, writeHandoff } from '@/lib/assessment-draft'
import { Progress } from '@/components/ui/progress'
import { AdminSegmented } from '@/components/admin/admin-segmented'
import { AdminEmptyState, AdminErrorState, AdminLoadingState } from '@/components/admin/admin-states'
import { QuestionAnswers } from '@/components/admin/question-answers'
import { QuestionFormModal, type AdminSubject } from '@/components/admin/question-form-modal'
import type { ListQuestion } from '@/components/admin/question-list-item'
import type { ListRestriction } from '@/components/admin/question-reports-inbox'
import type { ClassFilter } from '@/lib/content-tree'
import {
  changedAfterAnswers,
  needsAnswerCheck,
  NO_TOPIC_KEY,
  rankQuestions,
  rankTopics,
  solveRate,
  topWrongShare,
  type DifficultyRow,
  type TopicStat,
} from '@/lib/difficulty'
import { cn } from '@/lib/utils'

/** Feste Schwelle (PROJ-131, B49): darunter schwanken die Zahlen zu stark. */
export const HARD_MIN_ATTEMPTS = 30
const PAGE_SIZE = 25

type View = 'fragen' | 'themen'
type Days = 'all' | '30' | '90'

const VIEW_OPTIONS = [
  { value: 'fragen', label: 'Fragen' },
  { value: 'themen', label: 'Themen' },
] as const
const DAY_OPTIONS = [
  { value: 'all', label: 'Gesamt' },
  { value: '90', label: '90 Tage' },
  { value: '30', label: '30 Tage' },
] as const

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function RateBar({ correct, attempts }: { correct: number; attempts: number }) {
  const rate = solveRate(correct, attempts) ?? 0
  const fill = rate < 40 ? '[&>div]:bg-ws-red' : rate < 70 ? '[&>div]:bg-ws-orange' : '[&>div]:bg-ws-green'
  return (
    <div className="max-w-xs space-y-1">
      <p className="text-sm tabular-nums text-ws-text">
        <span className="font-semibold">{rate} % richtig</span> bei {attempts} Antworten
      </p>
      <Progress value={rate} aria-label={`${rate} Prozent richtig`} className={`h-2 bg-ws-raised ${fill}`} />
    </div>
  )
}

/** Eine Frage mehrerer Fächer erscheint nur einmal */
function dedupe(rows: DifficultyRow[]): DifficultyRow[] {
  const seen = new Set<string>()
  return rows.filter((r) => (seen.has(r.question_id) ? false : (seen.add(r.question_id), true)))
}

/**
 * Reiter „Schwierig“ (PROJ-74, seit PROJ-131 auf „Lerninhalte“): Fragen mit
 * der niedrigsten Quote zuerst, ab 30 Antworten. Fach, Thema und Stufe kommen
 * aus dem Baum. Jede Zeile führt weiter: aufklappen, bearbeiten, im Thema zeigen.
 */
export function DifficultQuestions({
  klasse = 'all',
  restriction = null,
  onShowAll,
  onShowInTopic,
  subjects = [],
  subjectCodes = {},
  topicIds,
  onChanged,
}: {
  klasse?: ClassFilter
  restriction?: ListRestriction | null
  onShowAll?: () => void
  onShowInTopic?: (subjectId: string, topicId: string) => void
  subjects?: AdminSubject[]
  /** Fach-ID → Kürzel aus dem Baum */
  subjectCodes?: Record<string, string>
  /** Themen, die es noch gibt; „Im Thema zeigen“ fehlt sonst */
  topicIds?: ReadonlySet<string>
  onChanged?: () => void
} = {}) {
  const [view, setView] = useState<View>('fragen')
  const [days, setDays] = useState<Days>('all')
  const [data, setData] = useState<DifficultyRow[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const [shown, setShown] = useState(PAGE_SIZE)
  const [editing, setEditing] = useState<ListQuestion | null>(null)
  // PROJ-133 (E4): Fragen markieren und „In neuen Nachweis“
  const router = useRouter()
  const role = useOptionalAdminRole()
  const [marked, setMarked] = useState<Set<string>>(new Set())
  const [chooseDepartment, setChooseDepartment] = useState<Map<string, string[]> | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setFailed(false)
    try {
      const params = new URLSearchParams()
      if (klasse !== 'all') params.set('class_level', String(klasse))
      if (days !== 'all') params.set('days', days)
      const res = await fetch(`/api/admin/schwierigste-fragen?${params}`, { cache: 'no-store' })
      if (!res.ok) throw new Error('load')
      const body = (await res.json()) as { items: DifficultyRow[] }
      setData(body.items)
    } catch {
      setFailed(true)
    } finally {
      setLoading(false)
    }
  }, [klasse, days])

  useEffect(() => {
    void load()
  }, [load])

  const subjectId = restriction?.subjectId
  const topicId = restriction?.topicId

  useEffect(() => {
    setShown(PAGE_SIZE)
  }, [subjectId, topicId, klasse, days])

  const rows = useMemo(() => {
    let list = data ?? []
    if (subjectId) list = list.filter((r) => r.subject_id === subjectId)
    if (topicId) list = list.filter((r) => (r.topic_id ?? 'ohne') === topicId)
    return list
  }, [data, subjectId, topicId])

  const ranked = useMemo(() => dedupe(rankQuestions(rows, HARD_MIN_ATTEMPTS).ranked), [rows])
  const topics = useMemo(() => rankTopics(rows, HARD_MIN_ATTEMPTS).ranked, [rows])

  function toggleMark(id: string) {
    setMarked((cur) => {
      const next = new Set(cur)
      if (next.has(id)) next.delete(id)
      else if (next.size >= MAX_HANDOFF_QUESTIONS) toast.error(`Du kannst höchstens ${MAX_HANDOFF_QUESTIONS} Fragen markieren.`)
      else next.add(id)
      return next
    })
  }

  function startAssessment(departmentId: string | null, ids: string[]) {
    if (!writeHandoff(window.sessionStorage, { questionIds: ids, departmentId })) {
      toast.error('Die Fragen konnten nicht übergeben werden. Bitte versuche es erneut.')
      return
    }
    router.push('/admin/leistungsnachweise/neu?aus=schwierig')
  }

  function onNewAssessment() {
    const chosen = ranked.filter((r) => marked.has(r.question_id))
    const groups = groupByDepartment(chosen)
    if (groups.size > 1) return setChooseDepartment(groups)
    const [[dept, ids]] = [...groups.entries()]
    startAssessment(dept || null, ids)
  }

  function departmentName(id: string): string {
    return role?.scope?.departments.find((d) => d.id === id)?.name ?? 'Anderer Bereich'
  }

  async function openEdit(questionId: string) {
    try {
      const question = await fetchQuestion(questionId)
      setEditing(question)
    } catch {
      toast.error('Die Frage konnte nicht geladen werden.')
    }
  }

  return (
    <div className="space-y-4">
      {restriction && (
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-sm text-ws-text">
            Nur Fragen zu <span className="font-semibold">{restriction.label}</span>
          </p>
          <Button variant="outline" onClick={onShowAll} className="min-h-11 rounded-xl border-ws-line bg-transparent text-ws-text hover:bg-ws-raised">
            Alle Fragen zeigen
          </Button>
        </div>
      )}
      <p className="max-w-prose text-sm text-ws-muted">
        Fragen, die Azubis am häufigsten falsch beantworten. Gezählt werden Fragen ab {HARD_MIN_ATTEMPTS} Antworten.
      </p>
      <div className="flex flex-wrap gap-3">
        <AdminSegmented value={view} onChange={setView} options={VIEW_OPTIONS} ariaLabel="Ansicht" />
        <AdminSegmented value={days} onChange={setDays} options={DAY_OPTIONS} ariaLabel="Zeitraum" />
      </div>

      {loading && !data ? (
        <AdminLoadingState variant="table" rows={6} />
      ) : failed ? (
        <AdminErrorState onRetry={() => void load()} />
      ) : (view === 'fragen' ? ranked.length : topics.length) === 0 ? (
        <AdminEmptyState
          icon={BarChart3}
          title="Noch keine Auswertung"
          description={`Hier erscheint etwas, sobald ${view === 'fragen' ? 'eine Frage' : 'ein Thema'} dieser Auswahl ${HARD_MIN_ATTEMPTS} Antworten hat.`}
        />
      ) : view === 'themen' ? (
        <TopicList topics={topics} topicIds={topicIds} onOpen={onShowInTopic} />
      ) : (
        <>
          <ul className="divide-y divide-ws-line overflow-hidden rounded-2xl border border-ws-line bg-ws-surface">
            {ranked.slice(0, shown).map((r) => (
              <DifficultItem
                key={r.question_id}
                row={r}
                code={subjectCodes[r.subject_id] ?? r.subject_name}
                canShowTopic={!!r.topic_id && (!topicIds || topicIds.has(r.topic_id)) && !!onShowInTopic}
                onShowInTopic={() => r.topic_id && onShowInTopic?.(r.subject_id, r.topic_id)}
                onEdit={() => openEdit(r.question_id)}
                marked={marked.has(r.question_id)}
                onToggleMark={() => toggleMark(r.question_id)}
              />
            ))}
          </ul>
          {ranked.length > shown && (
            <Button
              variant="outline"
              onClick={() => setShown((n) => n + PAGE_SIZE)}
              className="min-h-11 w-full rounded-xl border-ws-line bg-transparent text-ws-text hover:bg-ws-raised"
            >
              Weitere {Math.min(PAGE_SIZE, ranked.length - shown)} anzeigen (noch {ranked.length - shown})
            </Button>
          )}
        </>
      )}

      {marked.size > 0 && (
        <div
          role="region"
          aria-label="Markierte Fragen"
          className="sticky bottom-3 z-10 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-ws-line bg-ws-surface p-3 shadow-lg"
        >
          <p className="text-sm font-medium text-ws-text" role="status">
            {marked.size} {marked.size === 1 ? 'Frage' : 'Fragen'} markiert
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="ghost" className="min-h-11" onClick={() => setMarked(new Set())}>Auswahl aufheben</Button>
            <Button onClick={onNewAssessment} className="min-h-11 rounded-xl bg-ws-green text-ws-on-accent hover:bg-ws-green-hover">
              <FilePlus2 className="size-4" aria-hidden />
              In neuen Nachweis
            </Button>
          </div>
        </div>
      )}

      <AlertDialog open={chooseDepartment !== null} onOpenChange={(o) => !o && setChooseDepartment(null)}>
        <AlertDialogContent className="rounded-2xl border-ws-line bg-ws-surface text-ws-text">
          <AlertDialogHeader>
            <AlertDialogTitle>Die Fragen gehören zu mehreren Bereichen</AlertDialogTitle>
            <AlertDialogDescription className="text-ws-muted">
              Ein Nachweis gilt für einen Bereich. Wähle, welche Fragen du übernimmst. Die übrigen bleiben außen vor.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            {chooseDepartment &&
              [...chooseDepartment.entries()].map(([dept, ids]) => (
                <Button
                  key={dept || 'unbekannt'}
                  variant="outline"
                  className="min-h-11 w-full justify-between rounded-xl border-ws-line"
                  onClick={() => startAssessment(dept || null, ids)}
                >
                  <span>{dept ? departmentName(dept) : 'Ohne Bereich'}</span>
                  <span className="text-ws-muted">{ids.length} {ids.length === 1 ? 'Frage' : 'Fragen'}</span>
                </Button>
              ))}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel className="min-h-11 rounded-xl">Abbrechen</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <QuestionFormModal
        open={editing !== null}
        onOpenChange={(o) => !o && setEditing(null)}
        question={editing}
        subjects={subjects}
        onSuccess={() => {
          void load()
          onChanged?.()
        }}
      />
    </div>
  )
}

/** Eine Frage in der Form der Fragenliste (mit Antworten und richtiger Lösung) */
async function fetchQuestion(id: string): Promise<ListQuestion> {
  const res = await fetch(`/api/admin/questions?question_id=${id}`)
  if (!res.ok) throw new Error('load')
  const body = (await res.json()) as { questions: ListQuestion[] }
  const question = body.questions[0]
  if (!question) throw new Error('missing')
  return question
}

function DifficultItem({
  row: r,
  code,
  canShowTopic,
  onShowInTopic,
  onEdit,
  marked,
  onToggleMark,
}: {
  row: DifficultyRow
  code: string
  canShowTopic: boolean
  onShowInTopic: () => void
  onEdit: () => void
  marked: boolean
  onToggleMark: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [question, setQuestion] = useState<ListQuestion | null>(null)
  const [error, setError] = useState(false)
  const panelId = useId()
  const share = topWrongShare(r)

  function toggle() {
    const next = !expanded
    setExpanded(next)
    if (next && !question) {
      setError(false)
      fetchQuestion(r.question_id)
        .then(setQuestion)
        .catch(() => setError(true))
    }
  }

  return (
    <li className="space-y-2 px-3 py-3 sm:px-4">
      <div className="flex items-start gap-1">
      <label className="flex size-11 shrink-0 cursor-pointer items-center justify-center">
        <Checkbox checked={marked} onCheckedChange={onToggleMark} aria-label={`Für neuen Nachweis markieren: ${r.question_text}`} />
      </label>
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={expanded ? panelId : undefined}
        onClick={toggle}
        className="flex min-h-11 w-full items-start gap-2 rounded-lg py-2.5 text-left outline-none focus-visible:ring-2 focus-visible:ring-ws-green"
      >
        <span className="min-w-0 flex-1 break-words text-ws-text">{r.question_text}</span>
        <ChevronDown className={cn('mt-1 size-4 shrink-0 text-ws-muted transition-transform duration-200', expanded && 'rotate-180')} aria-hidden />
      </button>
      </div>
      <RateBar correct={r.correct} attempts={r.attempts} />
      <div className="flex flex-wrap items-center gap-2 text-xs text-ws-muted">
        <span>
          {code} › {r.topic_id ? (r.topic_name ?? 'Ohne Thema') : 'Ohne Thema'}
        </span>
        {r.top_wrong_option_text && (
          <span className="max-w-full truncate" title={r.top_wrong_option_text}>
            Häufigste falsche Antwort ({share} %): {r.top_wrong_option_text}
          </span>
        )}
        {needsAnswerCheck(r) && (
          <Badge variant="outline" className="rounded-full border-ws-orange/30 bg-ws-orange/15 text-ws-orange">
            Antwort prüfen
          </Badge>
        )}
        {r.open_reports > 0 && (
          <Badge variant="outline" className="rounded-full border-ws-line text-ws-muted">
            {r.open_reports === 1 ? '1 offene Meldung' : `${r.open_reports} offene Meldungen`}
          </Badge>
        )}
        {changedAfterAnswers(r) && r.last_changed_at && (
          <Badge variant="outline" className="rounded-full border-ws-line text-ws-muted">
            Seit {formatDate(r.last_changed_at)} geändert
          </Badge>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={onEdit} className="min-h-11 rounded-xl border-ws-line bg-transparent text-ws-text hover:bg-ws-raised">
          <Pencil className="size-4" aria-hidden />
          Bearbeiten
        </Button>
        {canShowTopic && (
          <Button variant="outline" onClick={onShowInTopic} className="min-h-11 rounded-xl border-ws-line bg-transparent text-ws-text hover:bg-ws-raised">
            <FolderOpen className="size-4" aria-hidden />
            Im Thema zeigen
          </Button>
        )}
      </div>
      {expanded && (
        <div id={panelId}>
          {question ? (
            <QuestionAnswers question={question} showStats={false} />
          ) : error ? (
            <p role="alert" className="text-sm text-ws-red">
              Die Antworten konnten nicht geladen werden.
            </p>
          ) : (
            <AdminLoadingState variant="list" rows={2} />
          )}
        </div>
      )}
    </li>
  )
}

function TopicList({
  topics,
  topicIds,
  onOpen,
}: {
  topics: TopicStat[]
  topicIds?: ReadonlySet<string>
  onOpen?: (subjectId: string, topicId: string) => void
}) {
  return (
    <ul className="divide-y divide-ws-line overflow-hidden rounded-2xl border border-ws-line bg-ws-surface">
      {topics.map((t) => (
        <li key={`${t.key}|${t.subject_name}`} className="flex flex-col gap-2 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4">
          <div className="min-w-0">
            <p className="break-words font-medium text-ws-text">{t.name}</p>
            <p className="text-xs text-ws-muted">
              {t.subject_name} · {t.questionsWithAnswers} von {t.questions} Fragen beantwortet
            </p>
            {onOpen && t.key !== NO_TOPIC_KEY && t.topic_id && (!topicIds || topicIds.has(t.topic_id)) && (
              <TopicOpenButton onClick={() => onOpen(t.subject_id, t.topic_id!)} name={t.name} />
            )}
          </div>
          <RateBar correct={t.correct} attempts={t.attempts} />
        </li>
      ))}
    </ul>
  )
}

function TopicOpenButton({ onClick, name }: { onClick: () => void; name: string }) {
  return (
    <Button variant="ghost" onClick={onClick} aria-label={`Im Thema zeigen: ${name}`} className="-ml-3 min-h-11 text-ws-blue hover:text-ws-blue-hover">
      Im Thema zeigen
    </Button>
  )
}
