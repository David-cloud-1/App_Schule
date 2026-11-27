'use client'

import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Check, ChevronDown, Loader2, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { AdminSegmented } from '@/components/admin/admin-segmented'
import { IntakeLayout } from '@/components/admin/intake-layout'
import { QuestionFields, fieldsFromIntake, intakeFromFields, type QuestionFieldValues } from '@/components/admin/question-fields'
import { buildImproveRequest, qualityFor, validateIntakeQuestion, type IntakeQuestion, type IntakeSource } from '@/lib/question-intake'
import type { IntakePreviewItem, IntakePreviewResponse } from '@/app/api/admin/questions/intake/preview/route'
import { cn } from '@/lib/utils'

/**
 * Die gemeinsame Vorschau von „Aus Material erstellen“ und „Aus einer Tabelle
 * übernehmen“ (PROJ-132): jede erkannte Frage als Karte mit Kästchen. Nichts
 * ist gespeichert und für Azubis sichtbar, bevor „N Fragen übernehmen“ geklickt wird.
 */
interface Entry {
  key: number
  item: IntakePreviewItem
  checked: boolean
  expanded: boolean
  editing: boolean
  fields: QuestionFieldValues | null
}

/** Gründe einer Karte nach dem Bearbeiten neu berechnen (Duplikat nur, solange der Fragetext gleich blieb) */
function recheck(item: IntakePreviewItem, next: IntakeQuestion): IntakePreviewItem {
  const errors = validateIntakeQuestion(next)
  const quality = qualityFor({ ...next, errors })
  const duplicate = item.duplicate && next.question_text.trim() === item.question.question_text.trim()
  const reasons = [...errors, ...quality.blockers.map((b) => b.message), ...(duplicate ? ['Gibt es schon in diesem Thema.'] : [])]
  return { ...item, question: { ...next, errors }, reasons, blockers: quality.blockers, warnings: quality.warnings, duplicate }
}

const DIFFICULTY_LABEL = { leicht: 'Leicht', mittel: 'Mittel', schwer: 'Schwer' } as const

function rightAnswer(q: IntakeQuestion): string {
  if (q.type === 'open') return q.sample_answer ?? ''
  return q.correct_index != null ? (q.options[q.correct_index] ?? '') : ''
}

export function IntakePreview({
  response,
  source,
  fileName,
  steps,
  current,
  classLevels,
  targetGroup,
  onBack,
  onAccepted,
}: {
  response: IntakePreviewResponse
  source: IntakeSource
  fileName?: string
  steps: readonly string[]
  current: number
  /** Stufen des Bereichs (für die Wahl, wenn eine Frage keine hat) */
  classLevels: number[]
  targetGroup: string
  onBack: () => void
  onAccepted: (result: { count: number; topicLabel: string | null; topicIds: string[] }) => void
}) {
  const [entries, setEntries] = useState<Entry[]>(() =>
    response.items.map((item, key) => ({
      key,
      item,
      // Markierte Karten sind nicht vorab angehakt (Fehler, Torwächter-Fund, Duplikat)
      checked: item.reasons.length === 0 && item.topic_id !== null,
      expanded: false,
      editing: false,
      fields: null,
    })),
  )
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const checked = entries.filter((e) => e.checked)
  const needsLevel = classLevels.length > 0 && checked.some((e) => e.item.question.class_level == null)
  const flagged = entries.filter((e) => e.item.reasons.some((r) => r !== 'Gibt es schon in diesem Thema.'))
  const topicNames = useMemo(() => [...new Set(entries.map((e) => e.item.topic_label).filter((l): l is string => !!l))], [entries])
  const topicLine = response.topic?.label ?? (topicNames.length === 1 ? topicNames[0] : null)

  function patch(key: number, change: Partial<Entry>) {
    setEntries((all) => all.map((e) => (e.key === key ? { ...e, ...change } : e)))
  }

  function startEdit(entry: Entry) {
    patch(entry.key, { editing: true, expanded: true, fields: fieldsFromIntake(entry.item.question) })
  }

  function finishEdit(entry: Entry) {
    if (!entry.fields) return
    const item = recheck(entry.item, intakeFromFields(entry.fields, entry.item.question))
    patch(entry.key, { item, editing: false, fields: null, checked: item.reasons.length === 0 && item.topic_id !== null ? true : entry.checked && item.question.errors.length === 0 })
  }

  function chooseLevel(level: number) {
    setEntries((all) => all.map((e) => (e.item.question.class_level == null ? { ...e, item: { ...e.item, question: { ...e.item.question, class_level: level } } } : e)))
  }

  async function copyImprove() {
    const items = flagged.map((e) => ({ question: e.item.question, reasons: e.item.reasons }))
    try {
      await navigator.clipboard.writeText(buildImproveRequest(items, targetGroup))
      toast.success('Kopiert')
    } catch {
      toast.error('Das Kopieren hat nicht geklappt. Bitte versuche es noch einmal.')
    }
  }

  async function accept() {
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/questions/intake/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source,
          file_name: fileName,
          allow_flagged: checked.some((e) => e.item.blockers.length > 0),
          items: checked.map(({ item }) => {
            const q = item.question
            return {
              topic_id: item.topic_id,
              question_text: q.question_text,
              type: q.type,
              answers: q.type === 'multiple_choice' ? q.options.map((text, i) => ({ text, is_correct: i === q.correct_index })) : undefined,
              sample_answer: q.type === 'open' ? q.sample_answer : null,
              explanation: q.explanation,
              difficulty: q.difficulty,
              class_level: q.class_level,
            }
          }),
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data?.error ?? 'Die Fragen konnten nicht übernommen werden.')
        return
      }
      const name = (response.topic?.label ?? topicLine ?? '').split('›').pop()?.trim()
      const count = data.imported as number
      toast.success(name ? `${count} ${count === 1 ? 'Frage' : 'Fragen'} in „${name}“ übernommen` : `${count} ${count === 1 ? 'Frage' : 'Fragen'} übernommen`)
      onAccepted({ count, topicLabel: topicLine, topicIds: data.topic_ids ?? [] })
    } catch {
      setError('Keine Verbindung. Bitte versuche es noch einmal.')
    } finally {
      setSubmitting(false)
    }
  }

  const missing = response.requested != null && response.items.length !== response.requested

  return (
    <IntakeLayout
      title="Vorschau"
      steps={steps}
      current={current}
      footer={
        <>
          <Button type="button" variant="ghost" onClick={onBack} disabled={submitting} className="min-h-11">
            Zurück
          </Button>
          <Button
            type="button"
            onClick={accept}
            disabled={checked.length === 0 || submitting || needsLevel}
            className="min-h-11 rounded-xl bg-ws-green text-ws-on-accent hover:bg-ws-green-hover"
          >
            {submitting && <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />}
            {checked.length === 1 ? '1 Frage übernehmen' : `${checked.length} Fragen übernehmen`}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="rounded-xl border border-ws-blue/30 bg-ws-blue/15 p-3 text-sm text-ws-text">
          <strong className="font-semibold">Noch nicht für Azubis sichtbar.</strong> Wähle, welche Fragen du übernehmen möchtest.
          {topicLine ? ` Ins Thema: ${topicLine}.` : ' Jede Frage kommt in das Thema, das auf ihrer Karte steht.'}
        </div>

        {missing && (
          <p className="text-sm text-ws-muted">
            Bestellt: {response.requested}, erhalten: {response.items.length}.
          </p>
        )}
        {response.truncated && (
          <p className="rounded-xl border border-ws-orange/30 bg-ws-orange/15 p-3 text-sm text-ws-text">
            Die Antwort der KI war abgeschnitten. Wir haben {response.items.length} lesbare {response.items.length === 1 ? 'Frage' : 'Fragen'} gefunden.
            Versuche es für die fehlenden noch einmal.
          </p>
        )}
        {response.skipped.length > 0 && <p className="text-xs text-ws-muted">Übersprungen: {response.skipped.join(' · ')}</p>}

        {needsLevel && (
          <div className="space-y-2 rounded-xl border border-ws-line bg-ws-bg p-3">
            <Label>Für welche Stufe sind diese Fragen?</Label>
            <div>
              <AdminSegmented
                value={'' as string}
                onChange={(v) => chooseLevel(Number(v))}
                options={classLevels.map((l) => ({ value: String(l), label: `Stufe ${l}` }))}
                ariaLabel="Stufe"
              />
            </div>
          </div>
        )}

        {flagged.length > 0 && (
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-sm text-ws-muted">
              {flagged.length === 1 ? '1 Frage ist markiert.' : `${flagged.length} Fragen sind markiert.`} Bearbeite sie hier oder lass sie von deiner KI verbessern.
            </p>
            <Button type="button" variant="outline" onClick={copyImprove} className="min-h-11 rounded-xl">
              Auftrag zum Verbessern kopieren
            </Button>
          </div>
        )}

        <ul className="space-y-3">
          {entries.map((entry) => {
            const q = entry.item.question
            const mark = entry.item.reasons
            const blocked = q.errors.length > 0 || entry.item.topic_id === null
            const right = rightAnswer(q)
            return (
              <li key={entry.key} className={cn('rounded-2xl border bg-ws-surface p-4', mark.length > 0 ? 'border-ws-orange/40' : 'border-ws-line')}>
                <div className="flex items-start gap-3">
                  <Checkbox
                    id={`intake-check-${entry.key}`}
                    checked={entry.checked}
                    disabled={blocked}
                    onCheckedChange={(c) => patch(entry.key, { checked: c === true })}
                    aria-label={`Frage ${entry.key + 1} übernehmen`}
                    className="mt-1 size-5 border-ws-line"
                  />
                  <div className="min-w-0 flex-1 space-y-2">
                    <button
                      type="button"
                      onClick={() => patch(entry.key, { expanded: !entry.expanded })}
                      aria-expanded={entry.expanded}
                      className="flex min-h-11 w-full items-start justify-between gap-2 text-left"
                    >
                      <span className="min-w-0 text-sm font-medium text-ws-text">{q.question_text || 'Ohne Fragetext'}</span>
                      <ChevronDown className={cn('mt-0.5 size-4 shrink-0 text-ws-muted transition-transform duration-200', entry.expanded && 'rotate-180')} aria-hidden />
                    </button>
                    {!entry.expanded && right && (
                      <p className="flex items-start gap-1.5 text-sm text-ws-muted">
                        <Check className="mt-0.5 size-4 shrink-0 text-ws-green" aria-hidden />
                        <span>
                          <span className="sr-only">Richtig: </span>
                          {right}
                        </span>
                      </p>
                    )}
                    <div className="flex flex-wrap items-center gap-2 text-xs text-ws-muted">
                      <span className="rounded-full border border-ws-line px-2 py-0.5">{DIFFICULTY_LABEL[q.difficulty]}</span>
                      {q.type === 'open' && <span className="rounded-full border border-ws-line px-2 py-0.5">Freitext</span>}
                      {q.source_row && <span>Zeile {q.source_row}</span>}
                      {entry.item.topic_label && source === 'table' && <span>{entry.item.topic_label}</span>}
                    </div>
                    {mark.map((reason) => (
                      <p key={reason} className="rounded-lg border border-ws-orange/30 bg-ws-orange/15 px-3 py-2 text-sm text-ws-text">
                        {q.source_row ? `Zeile ${q.source_row}: ` : ''}
                        {reason}
                      </p>
                    ))}

                    {entry.expanded && !entry.editing && (
                      <div className="space-y-2 border-t border-ws-line pt-3 text-sm">
                        {q.type === 'multiple_choice' ? (
                          <ul className="space-y-1.5">
                            {q.options.map((option, i) => (
                              <li key={i} className={cn('flex items-start gap-2', i === q.correct_index ? 'font-medium text-ws-text' : 'text-ws-muted')}>
                                <span className="w-5 shrink-0 font-semibold text-ws-green">{String.fromCharCode(65 + i)}</span>
                                <span className="min-w-0 flex-1">{option}</span>
                                {i === q.correct_index && (
                                  <>
                                    <Check className="size-4 shrink-0 text-ws-green" aria-hidden />
                                    <span className="sr-only">richtig</span>
                                  </>
                                )}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-ws-text">
                            <span className="font-semibold">Musterantwort: </span>
                            {q.sample_answer}
                          </p>
                        )}
                        {q.explanation && (
                          <p className="text-ws-muted">
                            <span className="font-semibold text-ws-text">Erklärung: </span>
                            {q.explanation}
                          </p>
                        )}
                      </div>
                    )}

                    {entry.editing && entry.fields && (
                      <div className="space-y-3 border-t border-ws-line pt-3">
                        <QuestionFields
                          idPrefix={`intake-${entry.key}`}
                          values={entry.fields}
                          onChange={(change) => patch(entry.key, { fields: { ...entry.fields!, ...change } })}
                        />
                        <Button type="button" onClick={() => finishEdit(entry)} className="min-h-11 rounded-xl bg-ws-green text-ws-on-accent hover:bg-ws-green-hover">
                          Fertig
                        </Button>
                      </div>
                    )}

                    {!entry.editing && (
                      <Button type="button" variant="outline" onClick={() => startEdit(entry)} className="min-h-11 rounded-xl">
                        <Pencil className="mr-2 size-4" aria-hidden />
                        Bearbeiten
                      </Button>
                    )}
                  </div>
                </div>
              </li>
            )
          })}
        </ul>

        {error && (
          <p role="alert" className="rounded-xl border border-ws-red/30 bg-ws-red/15 p-3 text-sm text-ws-text">
            {error}
          </p>
        )}
      </div>
    </IntakeLayout>
  )
}
