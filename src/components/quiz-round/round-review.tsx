'use client'

import { useState } from 'react'
import { CheckCircle2, ChevronDown, ChevronUp, XCircle } from 'lucide-react'
import { FORM_LABEL, type QuizRoundForm, type RoundQuestion } from '@/lib/quiz-round'
import { cn } from '@/lib/utils'

/** Ausgang einer Frage, wie ihn der Browser aus den Server-Antworten kennt. */
export interface QuestionOutcome {
  form: QuizRoundForm
  correct: boolean
  correct_option_id: string
  explanation: string | null
  /** Klassisch: gewählte Option */
  selected_option_id?: string | null
  /** Richtig/Falsch: was der Spieler gesagt hat */
  says_true?: boolean
  /** Rauswerfen: Fehlgriffe */
  mistakes?: number
  /** Klassisch mit Joker */
  joker?: boolean
}

function formNote(q: RoundQuestion, o: QuestionOutcome): string | null {
  if (o.form === 'true_false') {
    const proposal = q.options.find((opt) => opt.id === q.proposal_option_id)
    return proposal ? `Wischfrage: „${proposal.option_text}“ – du sagtest „${o.says_true ? 'Stimmt' : 'Stimmt nicht'}“` : FORM_LABEL.true_false
  }
  if (o.form === 'eliminate') {
    const m = o.mistakes ?? 0
    return `Rauswerfen: ${m === 0 ? 'ohne Fehlgriff' : m === 1 ? '1 Fehlgriff' : `${m} Fehlgriffe`}`
  }
  if (o.joker) return 'Mit Joker'
  return null
}

function ReviewItem({ question, index, outcome }: { question: RoundQuestion; index: number; outcome: QuestionOutcome | undefined }) {
  const [expanded, setExpanded] = useState(false)
  const correct = outcome?.correct ?? false
  const note = outcome ? formNote(question, outcome) : null

  return (
    <div className={cn('bg-[#1F2937] border rounded-2xl overflow-hidden', correct ? 'border-[#58CC02]/40' : 'border-[#FF4B4B]/40')}>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className="w-full min-h-11 text-left px-4 py-3 flex items-start gap-3 transition-colors hover:bg-[#374151]"
      >
        {correct ? (
          <CheckCircle2 size={18} className="text-[#58CC02] mt-0.5 shrink-0" aria-label="richtig" />
        ) : (
          <XCircle size={18} className="text-[#FF4B4B] mt-0.5 shrink-0" aria-label="falsch" />
        )}
        <p className="flex-1 min-w-0 text-sm text-[#F9FAFB] leading-snug">
          <span className="text-[#9CA3AF] mr-1">{index + 1}.</span>
          {question.question_text}
        </p>
        {expanded ? <ChevronUp size={16} className="text-[#9CA3AF] mt-0.5 shrink-0" /> : <ChevronDown size={16} className="text-[#9CA3AF] mt-0.5 shrink-0" />}
      </button>

      {expanded && (
        <div className="px-4 pb-4 pt-1 flex flex-col gap-2">
          {note && <p className="text-xs font-medium text-[#1CB0F6]">{note}</p>}
          {question.options.map((option) => {
            const isCorrect = option.id === outcome?.correct_option_id
            const isSelected = option.id === outcome?.selected_option_id
            let cls = 'bg-[#111827] border-[#374151] text-[#6B7280]'
            if (isCorrect) cls = 'bg-[#58CC02]/10 border-[#58CC02] text-[#58CC02]'
            else if (isSelected) cls = 'bg-[#FF4B4B]/10 border-[#FF4B4B] text-[#FF4B4B]'
            return (
              <div key={option.id} className={cn('rounded-xl border px-3 py-2.5 text-sm flex items-start gap-2', cls)}>
                {isCorrect ? (
                  <CheckCircle2 size={16} className="text-[#58CC02] mt-0.5 shrink-0" aria-hidden="true" />
                ) : isSelected ? (
                  <XCircle size={16} className="text-[#FF4B4B] mt-0.5 shrink-0" aria-hidden="true" />
                ) : (
                  <span className="w-4 shrink-0" />
                )}
                <span className="flex-1 min-w-0 leading-snug">{option.option_text}</span>
                {isSelected && (
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-[#9CA3AF] mt-0.5 shrink-0">Deine Antwort</span>
                )}
              </div>
            )
          })}
          {outcome?.explanation && <p className="text-xs text-[#9CA3AF] leading-relaxed mt-1">{outcome.explanation}</p>}
        </div>
      )}
    </div>
  )
}

export function RoundReview({ questions, outcomes }: { questions: RoundQuestion[]; outcomes: Record<number, QuestionOutcome> }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="w-full mb-6">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full min-h-11 flex items-center justify-between bg-[#1F2937] border border-[#4B5563] rounded-2xl px-4 py-3 text-sm font-semibold text-[#F9FAFB] transition-colors hover:bg-[#374151]"
      >
        <span>Fragenübersicht</span>
        {open ? <ChevronUp size={16} className="text-[#9CA3AF]" /> : <ChevronDown size={16} className="text-[#9CA3AF]" />}
      </button>
      {open && (
        <div className="mt-2 flex flex-col gap-2">
          {questions.map((q) => (
            <ReviewItem key={q.index} question={q} index={q.index} outcome={outcomes[q.index]} />
          ))}
        </div>
      )}
    </div>
  )
}
