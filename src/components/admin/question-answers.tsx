'use client'

import { useEffect, useState } from 'react'
import { Check } from 'lucide-react'
import type { AdminQuestion } from '@/components/admin/question-form-modal'

type Stats = { total: number; correctRate: number | null }

/** Wie oft die Frage beantwortet wurde; fehlt die Antwort der Schnittstelle, bleibt die Zeile weg. */
function AnswerStats({ questionId }: { questionId: string }) {
  const [stats, setStats] = useState<Stats | null>(null)
  useEffect(() => {
    let cancelled = false
    fetch(`/api/admin/questions/${questionId}/stats`)
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (!cancelled && json && typeof json.total === 'number') setStats(json as Stats)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [questionId])
  if (!stats) return null
  return (
    <p className="text-xs text-ws-muted">
      {stats.total === 0
        ? 'Noch nicht beantwortet'
        : `${stats.total} ${stats.total === 1 ? 'Antwort' : 'Antworten'}${
            stats.correctRate !== null ? ` · ${stats.correctRate} % richtig` : ''
          }`}
    </p>
  )
}

/**
 * Aufgeklappte Frage (PROJ-131, B102): alle Antworten, die richtige mit Haken
 * und dem Wort „richtig“ (nicht nur Farbe), Erklärung bzw. bei Freitext die
 * Musterlösung. Liest nur, speichert nichts.
 */
export function QuestionAnswers({
  question,
  showStats = true,
}: {
  question: Pick<AdminQuestion, 'id' | 'type' | 'answer_options' | 'explanation' | 'sample_answer'>
  showStats?: boolean
}) {
  const options = [...(question.answer_options ?? [])].sort((a, b) => a.display_order - b.display_order)
  return (
    <div className="max-w-2xl space-y-2">
      {showStats && <AnswerStats questionId={question.id} />}
      {question.type === 'open' ? (
        <div className="rounded-lg bg-ws-raised p-3">
          <p className="mb-1 text-xs font-medium text-ws-muted">Musterlösung</p>
          <p className="whitespace-pre-line break-words text-sm text-ws-text">
            {question.sample_answer || 'Keine Musterlösung hinterlegt.'}
          </p>
        </div>
      ) : options.length === 0 ? (
        <p className="text-sm italic text-ws-muted">Keine Antworten hinterlegt.</p>
      ) : (
        <ul className="space-y-1.5">
          {options.map((a, i) => (
            <li
              key={a.id ?? i}
              className={
                a.is_correct
                  ? 'flex items-start gap-3 rounded-lg border border-ws-green/30 bg-ws-green/15 p-2'
                  : 'flex items-start gap-3 rounded-lg border border-transparent bg-ws-raised p-2'
              }
            >
              <span className="mt-0.5 w-4 shrink-0 text-xs font-bold text-ws-muted">{String.fromCharCode(65 + i)}</span>
              <span className="min-w-0 flex-1 break-words text-sm text-ws-text">{a.option_text}</span>
              {a.is_correct && (
                <span className="flex shrink-0 items-center gap-1 text-xs font-semibold text-ws-green">
                  <Check className="size-4" aria-hidden />
                  richtig
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
      {question.explanation && (
        <div className="rounded-lg bg-ws-raised p-3">
          <p className="mb-1 text-xs font-medium text-ws-muted">Erklärung</p>
          <p className="whitespace-pre-line break-words text-sm text-ws-text">{question.explanation}</p>
        </div>
      )}
    </div>
  )
}
