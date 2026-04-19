'use client'

import { useState } from 'react'
import Link from 'next/link'
import { CheckCircle2, XCircle, ChevronDown, ChevronUp, RotateCcw, Trophy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Slider } from '@/components/ui/slider'
import { cn } from '@/lib/utils'
import type { ExamResultsJson, QuestionResult, PartResult } from './page'

interface Props {
  sessionId: string
  results: ExamResultsJson
  status: 'completed' | 'aborted'
  partsSelected: number[]
  startedAt: string
  endedAt: string | null
}

const PART_LABELS: Record<number, string> = {
  1: 'Teil 1 – Leistungserstellung',
  2: 'Teil 2 – KSK',
  3: 'Teil 3 – WiSo',
}

function PartSummaryCard({ part, partNum, label }: { part: PartResult; partNum: number; label: string }) {
  const [expanded, setExpanded] = useState(false)
  const [selfScores, setSelfScores] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {}
    part.questions.forEach((q) => {
      if (q.type === 'open' && q.self_score != null) initial[q.id] = q.self_score
    })
    return initial
  })
  const [savingScores, setSavingScores] = useState<Record<string, boolean>>({})

  async function saveScore(questionId: string, score: number) {
    setSavingScores((prev) => ({ ...prev, [questionId]: true }))
    try {
      await fetch(`/api/exam/sessions/${location.pathname.split('/')[2]}/self-score`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionId, score }),
      })
    } finally {
      setSavingScores((prev) => ({ ...prev, [questionId]: false }))
    }
  }

  const mcQuestions = part.questions.filter((q) => q.type === 'multiple_choice')
  const openQuestions = part.questions.filter((q) => q.type === 'open')
  const mcCorrect = mcQuestions.filter((q) => q.is_correct).length

  const mcScores = mcQuestions.map((q) => (q.is_correct ? 100 : 0))
  const openScores = openQuestions.map((q) => selfScores[q.id] ?? q.self_score ?? 0)
  const allScores = [...mcScores, ...openScores]
  const displayScore = allScores.length > 0
    ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length)
    : part.score
  const displayPassed = displayScore >= 50

  return (
    <div className="bg-[#1F2937] border border-[#4B5563] rounded-2xl overflow-hidden">
      {/* Part header */}
      <button
        onClick={() => setExpanded((e) => !e)}
        className="w-full px-5 py-4 flex items-center justify-between hover:bg-[#374151]/50 transition-colors"
      >
        <div className="flex items-center gap-3 text-left">
          <div className="flex flex-col">
            <span className="text-xs text-[#9CA3AF]">Teil {partNum}</span>
            <span className="font-semibold text-[#F9FAFB] text-sm">{label.replace(`Teil ${partNum} – `, '')}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-lg font-bold text-[#F9FAFB]">{displayScore}%</span>
          <Badge className={cn(
            'text-xs border-0',
            displayPassed ? 'bg-[#58CC02]/20 text-[#58CC02]' : 'bg-[#FF4B4B]/20 text-[#FF4B4B]',
          )}>
            {displayPassed ? 'Bestanden' : 'Nicht bestanden'}
          </Badge>
          {expanded ? <ChevronUp size={16} className="text-[#9CA3AF]" /> : <ChevronDown size={16} className="text-[#9CA3AF]" />}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-[#4B5563] px-5 py-4 space-y-4">
          {mcQuestions.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-[#9CA3AF] mb-2">
                Multiple Choice: {mcCorrect}/{mcQuestions.length} richtig
              </p>
              <div className="space-y-3">
                {mcQuestions.map((q) => (
                  <MCResultCard key={q.id} question={q} />
                ))}
              </div>
            </div>
          )}

          {openQuestions.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-[#9CA3AF] mb-2">
                Offene Fragen — Selbstbewertung
              </p>
              <div className="space-y-4">
                {openQuestions.map((q) => (
                  <OpenResultCard
                    key={q.id}
                    question={q}
                    selfScore={selfScores[q.id] ?? q.self_score ?? null}
                    isSaving={savingScores[q.id] ?? false}
                    onScoreChange={(score) => {
                      setSelfScores((prev) => ({ ...prev, [q.id]: score }))
                      saveScore(q.id, score)
                    }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function MCResultCard({ question }: { question: QuestionResult }) {
  const [showExplanation, setShowExplanation] = useState(false)
  const sortedOptions = [...(question.answer_options ?? [])].sort((a, b) => a.display_order - b.display_order)

  return (
    <div className={cn(
      'rounded-xl border p-3',
      question.is_correct ? 'border-[#58CC02]/30 bg-[#58CC02]/5' : 'border-[#FF4B4B]/30 bg-[#FF4B4B]/5',
    )}>
      <div className="flex items-start gap-2 mb-2">
        {question.is_correct
          ? <CheckCircle2 size={16} className="text-[#58CC02] flex-shrink-0 mt-0.5" />
          : <XCircle size={16} className="text-[#FF4B4B] flex-shrink-0 mt-0.5" />}
        <p className="text-sm text-[#F9FAFB] leading-snug">{question.question_text}</p>
      </div>

      <div className="space-y-1 ml-6">
        {sortedOptions.map((opt) => {
          const isStudentAnswer = question.student_answer === opt.id
          const isCorrect = opt.is_correct
          return (
            <div
              key={opt.id}
              className={cn(
                'text-xs px-2 py-1 rounded-lg',
                isCorrect && isStudentAnswer && 'bg-[#58CC02]/20 text-[#58CC02]',
                isCorrect && !isStudentAnswer && 'bg-[#58CC02]/10 text-[#58CC02]',
                !isCorrect && isStudentAnswer && 'bg-[#FF4B4B]/20 text-[#FF4B4B]',
                !isCorrect && !isStudentAnswer && 'text-[#9CA3AF]',
              )}
            >
              {isCorrect ? '✓ ' : isStudentAnswer ? '✗ ' : '  '}
              {opt.option_text}
            </div>
          )
        })}
      </div>

      {question.explanation && (
        <button
          onClick={() => setShowExplanation((e) => !e)}
          className="text-xs text-[#1CB0F6] mt-2 ml-6 hover:underline"
        >
          {showExplanation ? 'Erklärung ausblenden' : 'Erklärung anzeigen'}
        </button>
      )}
      {showExplanation && question.explanation && (
        <p className="text-xs text-[#9CA3AF] mt-2 ml-6 leading-relaxed">{question.explanation}</p>
      )}
    </div>
  )
}

function OpenResultCard({
  question,
  selfScore,
  isSaving,
  onScoreChange,
}: {
  question: QuestionResult
  selfScore: number | null
  isSaving: boolean
  onScoreChange: (score: number) => void
}) {
  return (
    <div className="rounded-xl border border-[#4B5563] p-4 space-y-3">
      <p className="text-sm font-medium text-[#F9FAFB]">{question.question_text}</p>

      {/* Student answer */}
      <div>
        <p className="text-xs text-[#9CA3AF] mb-1 font-semibold">Deine Antwort:</p>
        <div className="bg-[#111827] rounded-lg p-3 text-sm text-[#F9FAFB] leading-relaxed min-h-[60px]">
          {question.student_answer
            ? question.student_answer
            : <span className="text-[#4B5563] italic">Keine Antwort gegeben</span>}
        </div>
      </div>

      {/* Sample answer */}
      {question.sample_answer && (
        <div>
          <p className="text-xs text-[#9CA3AF] mb-1 font-semibold">Musterlösung:</p>
          <div className="bg-[#58CC02]/5 border border-[#58CC02]/20 rounded-lg p-3 text-sm text-[#F9FAFB] leading-relaxed">
            {question.sample_answer}
          </div>
        </div>
      )}

      {/* Self-scoring slider */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold text-[#9CA3AF]">Selbstbewertung</p>
          <span className={cn(
            'text-sm font-bold',
            selfScore == null ? 'text-[#9CA3AF]' : selfScore >= 50 ? 'text-[#58CC02]' : 'text-[#FF4B4B]',
          )}>
            {selfScore == null ? '—' : `${selfScore}%`}
            {isSaving && <span className="text-xs text-[#9CA3AF] ml-1">gespeichert…</span>}
          </span>
        </div>
        <Slider
          value={[selfScore ?? 0]}
          onValueChange={([v]) => onScoreChange(v)}
          min={0}
          max={100}
          step={5}
          className="[&_[role=slider]]:bg-[#1CB0F6] [&_[role=slider]]:border-[#1CB0F6] [&_.bg-primary]:bg-[#1CB0F6]"
        />
        <div className="flex justify-between text-xs text-[#4B5563] mt-1">
          <span>0%</span>
          <span>50%</span>
          <span>100%</span>
        </div>
      </div>
    </div>
  )
}

export function ExamResultsClient({ sessionId: _sessionId, results, status, partsSelected, startedAt, endedAt }: Props) {
  const partEntries = partsSelected
    .map((p) => [p, results?.parts?.[String(p)]] as [number, PartResult | undefined])
    .filter(([, part]) => part != null) as [number, PartResult][]

  const overallScore = partEntries.length > 0
    ? Math.round(partEntries.reduce((sum, [, p]) => sum + p.score, 0) / partEntries.length)
    : 0

  const allPassed = partEntries.every(([, p]) => p.passed)

  const durationMs = endedAt && startedAt
    ? new Date(endedAt).getTime() - new Date(startedAt).getTime()
    : null
  const durationMinutes = durationMs ? Math.floor(durationMs / 60000) : null

  return (
    <div className="space-y-4">
      {/* Overall result card */}
      <div className={cn(
        'rounded-2xl border p-5 text-center',
        allPassed ? 'border-[#58CC02]/30 bg-[#58CC02]/5' : 'border-[#FF4B4B]/30 bg-[#FF4B4B]/5',
      )}>
        <Trophy size={36} className={cn('mx-auto mb-3', allPassed ? 'text-[#FFD700]' : 'text-[#9CA3AF]')} />
        <p className="text-4xl font-bold text-[#F9FAFB] mb-1">{overallScore}%</p>
        <p className="text-sm text-[#9CA3AF] mb-3">Gesamtergebnis</p>

        <Badge className={cn(
          'text-sm px-4 py-1 border-0',
          allPassed ? 'bg-[#58CC02]/20 text-[#58CC02]' : 'bg-[#FF4B4B]/20 text-[#FF4B4B]',
        )}>
          {status === 'aborted'
            ? 'Abgebrochen'
            : allPassed
              ? 'Bestanden (≥ 50% je Teil)'
              : 'Nicht bestanden'}
        </Badge>

        {durationMinutes != null && (
          <p className="text-xs text-[#9CA3AF] mt-2">{durationMinutes} Minuten bearbeitet</p>
        )}
      </div>

      {/* Per-part results */}
      {partEntries.map(([partNum, part]) => (
        <PartSummaryCard
          key={partNum}
          part={part}
          partNum={partNum}
          label={PART_LABELS[partNum] ?? `Teil ${partNum}`}
        />
      ))}

      {/* Actions */}
      <div className="flex flex-col gap-3 pt-2">
        <Link href="/exam">
          <Button className="w-full rounded-2xl bg-[#1CB0F6] hover:bg-[#18a0e0] text-white font-bold py-6">
            <RotateCcw size={18} className="mr-2" />
            Neue Prüfung starten
          </Button>
        </Link>
        <Link href="/exam-history">
          <Button variant="outline" className="w-full rounded-2xl border-[#4B5563] text-[#9CA3AF] hover:text-[#F9FAFB] hover:bg-[#374151] py-6">
            Prüfungsverlauf
          </Button>
        </Link>
        <Link href="/">
          <Button variant="outline" className="w-full rounded-2xl border-[#4B5563] text-[#9CA3AF] hover:text-[#F9FAFB] hover:bg-[#374151] py-6">
            Zur Startseite
          </Button>
        </Link>
      </div>
    </div>
  )
}
