'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { BarChart3, ExternalLink, Info } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AdminTabs, AdminTabsList, AdminTabsTrigger } from '@/components/admin/admin-tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { AdminEmptyState, AdminErrorState, AdminLoadingState } from '@/components/admin/admin-states'
import {
  changedAfterAnswers,
  DEFAULT_MIN_ATTEMPTS,
  filterRows,
  MIN_ATTEMPTS_LOWEST,
  needsAnswerCheck,
  questionSearchLink,
  rankQuestions,
  rankTopics,
  solveRate,
  topWrongShare,
  type DifficultyRow,
  type TopicStat,
} from '@/lib/difficulty'

type Tab = 'themen' | 'fragen'

interface Response {
  items: DifficultyRow[]
  totalQuestions: number
}

const ALL = 'alle'
const MIN_OPTIONS = [5, 10, 20, 50]

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function RateBar({ correct, attempts }: { correct: number; attempts: number }) {
  const rate = solveRate(correct, attempts) ?? 0
  const fill = rate < 40 ? '[&>div]:bg-ws-red' : rate < 70 ? '[&>div]:bg-ws-orange' : '[&>div]:bg-ws-green'
  return (
    <div className="flex min-w-32 items-center gap-2">
      <Progress value={rate} aria-label={`Lösungsquote ${rate} Prozent`} className={`h-2 flex-1 bg-ws-raised ${fill}`} />
      <span className="w-10 text-right text-sm font-medium tabular-nums text-ws-text">{rate} %</span>
    </div>
  )
}

/**
 * Auswertung „Schwierigste Fragen“ (PROJ-74): Themen und Einzelfragen mit
 * Lösungsquote. Daten kommen einmal je Klassenstufe/Zeitraum vom Server
 * (nur Summen); Fach, Thema und Mindestanzahl wirken hier im Browser.
 */
export function DifficultQuestions() {
  const [tab, setTab] = useState<Tab>('themen')
  const [classLevel, setClassLevel] = useState<string>(ALL)
  const [days, setDays] = useState<string>(ALL)
  const [subject, setSubject] = useState<string>(ALL)
  const [topicKey, setTopicKey] = useState<string | null>(null)
  const [minAttempts, setMinAttempts] = useState<number>(DEFAULT_MIN_ATTEMPTS)

  const [data, setData] = useState<Response | null>(null)
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setFailed(false)
    try {
      const params = new URLSearchParams()
      if (classLevel !== ALL) params.set('class_level', classLevel)
      if (days !== ALL) params.set('days', days)
      const res = await fetch(`/api/admin/schwierigste-fragen?${params}`, { cache: 'no-store' })
      if (!res.ok) throw new Error('load')
      setData((await res.json()) as Response)
    } catch {
      setFailed(true)
    } finally {
      setLoading(false)
    }
  }, [classLevel, days])

  useEffect(() => {
    void load()
  }, [load])

  const subjects = useMemo(() => {
    const m = new Map<string, string>()
    for (const r of data?.items ?? []) m.set(r.subject_id, r.subject_name)
    return [...m.entries()].sort((a, b) => a[1].localeCompare(b[1], 'de'))
  }, [data])

  const subjectRows = useMemo(
    () => filterRows(data?.items ?? [], { subjectId: subject === ALL ? null : subject }),
    [data, subject],
  )
  const topics = useMemo(() => rankTopics(subjectRows, minAttempts), [subjectRows, minAttempts])
  const questionRows = useMemo(() => filterRows(subjectRows, { topicKey }), [subjectRows, topicKey])
  const questions = useMemo(() => rankQuestions(questionRows, minAttempts), [questionRows, minAttempts])
  const topicName = topicKey ? (subjectRows.find((r) => (r.topic_id ?? 'ohne-thema') === topicKey)?.topic_name ?? 'Ohne Thema') : null

  function openTopic(t: TopicStat) {
    setTopicKey(t.key)
    setTab('fragen')
  }

  const isEmpty = !!data && data.items.length === 0

  return (
    <div className="space-y-4">
      <p className="flex max-w-prose items-start gap-2 text-sm text-ws-muted">
        <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
        <span>
          Gezählt werden Antworten aus Üben, Quiz, Blitzrunde und Lücken schließen – keine benoteten Nachweise. Je Azubi
          und Frage zählen höchstens die ersten 3 Versuche.
        </span>
      </p>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-1.5">
          <Label htmlFor="df-subject" className="text-ws-muted">Fach</Label>
          <Select value={subject} onValueChange={(v) => { setSubject(v); setTopicKey(null) }}>
            <SelectTrigger id="df-subject" className="min-h-11 w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Alle Fächer</SelectItem>
              {subjects.map(([id, name]) => <SelectItem key={id} value={id}>{name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="df-class" className="text-ws-muted">Klassenstufe</Label>
          <Select value={classLevel} onValueChange={(v) => { setClassLevel(v); setTopicKey(null) }}>
            <SelectTrigger id="df-class" className="min-h-11 w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Alle Stufen</SelectItem>
              {[10, 11, 12].map((c) => <SelectItem key={c} value={String(c)}>Klasse {c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="df-days" className="text-ws-muted">Zeitraum</Label>
          <Select value={days} onValueChange={setDays}>
            <SelectTrigger id="df-days" className="min-h-11 w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Gesamt</SelectItem>
              <SelectItem value="30">Letzte 30 Tage</SelectItem>
              <SelectItem value="90">Letzte 90 Tage</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="df-min" className="text-ws-muted">Mindestens … Antworten</Label>
          <Select value={String(minAttempts)} onValueChange={(v) => setMinAttempts(Number(v))}>
            <SelectTrigger id="df-min" className="min-h-11 w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              {MIN_OPTIONS.map((n) => <SelectItem key={n} value={String(n)}>{n} Antworten</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      {minAttempts <= MIN_ATTEMPTS_LOWEST * 2 && (
        <p className="text-sm text-ws-muted">Bei wenigen Antworten schwanken die Zahlen stark – lies sie als Anhaltspunkt.</p>
      )}

      {loading && !data ? (
        <AdminLoadingState variant="table" rows={6} />
      ) : failed ? (
        <AdminErrorState onRetry={() => void load()} />
      ) : isEmpty ? (
        <AdminEmptyState
          icon={BarChart3}
          title="Noch keine Auswertung"
          description="Sobald Azubis üben, erscheinen hier Auswertungen."
        />
      ) : (
        <>
          <AdminTabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
            <AdminTabsList>
              <AdminTabsTrigger value="themen">Themen</AdminTabsTrigger>
              <AdminTabsTrigger value="fragen">Fragen</AdminTabsTrigger>
            </AdminTabsList>
          </AdminTabs>

          {tab === 'themen' ? (
            <TopicsTable ranked={topics.ranked} tooFew={topics.tooFew} minAttempts={minAttempts} onOpen={openTopic} />
          ) : (
            <>
              {topicName && (
                <div className="flex flex-wrap items-center gap-2 text-sm text-ws-text">
                  <Badge variant="outline" className="rounded-full border-ws-line px-3 py-1 text-ws-text">Thema: {topicName}</Badge>
                  <Button variant="outline" onClick={() => setTopicKey(null)} className="min-h-11 rounded-xl">
                    Filter aufheben
                  </Button>
                </div>
              )}
              <QuestionsTable ranked={questions.ranked} tooFew={questions.tooFew} minAttempts={minAttempts} />
            </>
          )}
        </>
      )}
    </div>
  )
}

function TooFewNote({ minAttempts }: { minAttempts: number }) {
  return (
    <p className="px-1 pt-2 text-sm font-medium text-ws-muted">
      Zu wenige Antworten (unter {minAttempts}) – noch nicht gerankt
    </p>
  )
}

function TopicsTable({
  ranked,
  tooFew,
  minAttempts,
  onOpen,
}: {
  ranked: TopicStat[]
  tooFew: TopicStat[]
  minAttempts: number
  onOpen: (t: TopicStat) => void
}) {
  const render = (list: TopicStat[]) => (
    <div className="ws-table-scroll rounded-2xl border border-ws-line bg-ws-surface">
      <Table>
        <TableHeader>
          <TableRow className="border-ws-line hover:bg-transparent">
            <TableHead className="text-ws-muted">Thema</TableHead>
            <TableHead className="text-ws-muted">Lösungsquote</TableHead>
            <TableHead className="text-right text-ws-muted">Antworten</TableHead>
            <TableHead className="text-right text-ws-muted">Fragen</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {list.map((t) => (
            <TableRow key={`${t.key}|${t.subject_name}`} className="border-ws-line">
              <TableCell className="max-w-xs">
                <button
                  type="button"
                  onClick={() => onOpen(t)}
                  title={`${t.name} (${t.subject_name})`}
                  className="min-h-11 text-left font-medium text-ws-text hover:underline focus-visible:ring-2 focus-visible:ring-ws-green"
                >
                  <span className="block truncate">{t.name}</span>
                  <span className="block truncate text-xs font-normal text-ws-muted">{t.subject_name}</span>
                </button>
              </TableCell>
              <TableCell><RateBar correct={t.correct} attempts={t.attempts} /></TableCell>
              <TableCell className="text-right tabular-nums text-ws-text">{t.attempts}</TableCell>
              <TableCell className="text-right tabular-nums text-ws-text">
                {t.questionsWithAnswers} / {t.questions}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
  if (ranked.length === 0 && tooFew.length === 0) {
    return <AdminEmptyState icon={BarChart3} title="Keine Themen mit Antworten" description="Für diese Auswahl liegen noch keine Antworten vor." />
  }
  return (
    <div className="space-y-3">
      {ranked.length > 0 ? render(ranked) : (
        <p className="text-sm text-ws-muted">Kein Thema hat schon {minAttempts} Antworten. Senke die Mindestanzahl oder wähle „Gesamt“.</p>
      )}
      {tooFew.length > 0 && (<><TooFewNote minAttempts={minAttempts} />{render(tooFew)}</>)}
    </div>
  )
}

function QuestionsTable({
  ranked,
  tooFew,
  minAttempts,
}: {
  ranked: DifficultyRow[]
  tooFew: DifficultyRow[]
  minAttempts: number
}) {
  const render = (list: DifficultyRow[]) => (
    <div className="ws-table-scroll ws-table-sticky rounded-2xl border border-ws-line bg-ws-surface">
      <Table>
        <TableHeader>
          <TableRow className="border-ws-line hover:bg-transparent">
            <TableHead className="text-ws-muted">Frage</TableHead>
            <TableHead className="text-ws-muted">Thema</TableHead>
            <TableHead className="text-ws-muted">Lösungsquote</TableHead>
            <TableHead className="text-right text-ws-muted">Antworten</TableHead>
            <TableHead className="text-ws-muted">Häufigste falsche Antwort</TableHead>
            <TableHead className="text-right text-ws-muted">Meldungen</TableHead>
            <TableHead className="text-ws-muted">Hinweis</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {list.map((r) => {
            const share = topWrongShare(r)
            const changed = changedAfterAnswers(r)
            return (
              <TableRow key={`${r.question_id}|${r.subject_id}`} className="border-ws-line">
                <TableCell className="max-w-sm">
                  <Link
                    href={questionSearchLink(r.question_text)}
                    title={r.question_text}
                    className="inline-flex min-h-11 items-center gap-1 font-medium text-ws-text hover:underline focus-visible:ring-2 focus-visible:ring-ws-green"
                  >
                    <span className="line-clamp-2">{r.question_text}</span>
                    <ExternalLink className="size-3.5 shrink-0 text-ws-muted" aria-hidden />
                  </Link>
                </TableCell>
                <TableCell className="max-w-40 truncate text-ws-muted" title={r.topic_name ?? 'Ohne Thema'}>
                  {r.topic_name ?? 'Ohne Thema'}
                </TableCell>
                <TableCell><RateBar correct={r.correct} attempts={r.attempts} /></TableCell>
                <TableCell className="text-right tabular-nums text-ws-text">{r.attempts}</TableCell>
                <TableCell className="max-w-48 text-ws-text">
                  {r.top_wrong_option_text ? (
                    <span title={r.top_wrong_option_text} className="block truncate">
                      {share} % · {r.top_wrong_option_text}
                    </span>
                  ) : '–'}
                </TableCell>
                <TableCell className="text-right tabular-nums text-ws-text">{r.open_reports > 0 ? r.open_reports : '–'}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {needsAnswerCheck(r) && (
                      <Badge variant="outline" className="rounded-full border-ws-orange/30 bg-ws-orange/15 px-3 py-1 text-ws-orange">
                        Antwort prüfen
                      </Badge>
                    )}
                    {changed && r.last_changed_at && (
                      <Badge variant="outline" className="rounded-full border-ws-line px-3 py-1 text-ws-muted">
                        Seit {formatDate(r.last_changed_at)} geändert
                      </Badge>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
  if (ranked.length === 0 && tooFew.length === 0) {
    return <AdminEmptyState icon={BarChart3} title="Keine Fragen mit Antworten" description="Für diese Auswahl liegen noch keine Antworten vor." />
  }
  return (
    <div className="space-y-3">
      {ranked.length > 0 ? render(ranked) : (
        <p className="text-sm text-ws-muted">Keine Frage hat schon {minAttempts} Antworten. Senke die Mindestanzahl.</p>
      )}
      {tooFew.length > 0 && (<><TooFewNote minAttempts={minAttempts} />{render(tooFew)}</>)}
    </div>
  )
}
