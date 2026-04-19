'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight, Clock, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Textarea } from '@/components/ui/textarea'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { cn } from '@/lib/utils'
import type { ExamQuestion } from './page'

interface Props {
  sessionId: string
  questions: ExamQuestion[]
  initialRemainingSeconds: number
  partsSelected: number[]
}

const PART_LABELS: Record<number, string> = {
  1: 'Teil 1 – Leistungserstellung',
  2: 'Teil 2 – KSK',
  3: 'Teil 3 – WiSo',
}

export function ExamSessionClient({ sessionId, questions, initialRemainingSeconds, partsSelected }: Props) {
  const router = useRouter()
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [remainingSeconds, setRemainingSeconds] = useState(initialRemainingSeconds)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const hasSubmitted = useRef(false)

  const totalQuestions = questions.length
  const currentQuestion = questions[currentIndex]
  const answeredCount = Object.keys(answers).length
  const unansweredCount = totalQuestions - answeredCount

  const submitExam = useCallback(async (action: 'submit' | 'abort') => {
    if (hasSubmitted.current) return
    hasSubmitted.current = true
    setIsSubmitting(true)
    try {
      await fetch(`/api/exam/sessions/${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, answers }),
      })
      router.push(`/exam/${sessionId}/results`)
    } catch {
      hasSubmitted.current = false
      setIsSubmitting(false)
    }
  }, [sessionId, answers, router])

  // Countdown timer
  useEffect(() => {
    if (remainingSeconds <= 0) {
      submitExam('submit')
      return
    }
    const interval = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(interval)
          submitExam('submit')
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [remainingSeconds, submitExam])

  function formatTime(seconds: number) {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }

  function setAnswer(questionId: string, value: string) {
    setAnswers((prev) => ({ ...prev, [questionId]: value }))
  }

  const isTimeLow = remainingSeconds < 300 // < 5 minutes

  return (
    <div className="min-h-screen bg-[#111827] flex flex-col">
      {/* Header */}
      <header className="bg-[#1F2937] border-b border-[#4B5563] px-4 py-3 sticky top-0 z-10">
        <div className="max-w-md mx-auto">
          <div className="flex items-center justify-between mb-2">
            {/* Timer */}
            <div className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold',
              isTimeLow ? 'bg-[#FF4B4B]/20 text-[#FF4B4B]' : 'bg-[#1CB0F6]/20 text-[#1CB0F6]',
            )}>
              <Clock size={14} />
              {formatTime(remainingSeconds)}
            </div>

            {/* Progress indicator */}
            <div className="text-sm text-[#9CA3AF]">
              <span className="text-[#F9FAFB] font-semibold">{currentIndex + 1}</span>
              <span>/{totalQuestions}</span>
              {unansweredCount > 0 && (
                <span className="ml-2 text-[#FF9600] text-xs">{unansweredCount} unbeantwortet</span>
              )}
            </div>

            {/* End exam */}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl border-[#FF4B4B]/50 text-[#FF4B4B] hover:bg-[#FF4B4B]/10 text-xs px-3"
                >
                  Beenden
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="bg-[#1F2937] border-[#4B5563] text-[#F9FAFB]">
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2">
                    <AlertTriangle size={18} className="text-[#FF9600]" />
                    Prüfung beenden?
                  </AlertDialogTitle>
                  <AlertDialogDescription className="text-[#9CA3AF]">
                    {unansweredCount > 0
                      ? `Du hast noch ${unansweredCount} unbeantwortete Frage${unansweredCount !== 1 ? 'n' : ''}. `
                      : ''}
                    Deine bisherigen Antworten werden gespeichert.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="bg-[#374151] border-[#4B5563] text-[#F9FAFB] hover:bg-[#4B5563]">
                    Weiter lernen
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => submitExam('abort')}
                    className="bg-[#FF4B4B] hover:bg-[#e04040] text-white"
                  >
                    Prüfung abgeben
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>

          {/* Part label */}
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs text-[#9CA3AF]">
              {partsSelected.map((p) => PART_LABELS[p]).join(' → ')}
            </span>
          </div>

          <Progress
            value={((currentIndex + 1) / totalQuestions) * 100}
            className="h-1.5 bg-[#374151] rounded-full [&>div]:bg-[#1CB0F6] [&>div]:transition-all [&>div]:duration-500"
          />
        </div>
      </header>

      {/* Question */}
      <main className="max-w-md mx-auto px-4 py-6 flex-1 flex flex-col w-full">
        {/* Question type badge */}
        <div className="flex items-center gap-2 mb-3">
          <span className={cn(
            'text-xs font-medium px-2.5 py-1 rounded-full',
            currentQuestion.type === 'open'
              ? 'bg-[#FF9600]/20 text-[#FF9600]'
              : 'bg-[#1CB0F6]/20 text-[#1CB0F6]',
          )}>
            {currentQuestion.type === 'open' ? 'Offene Frage' : 'Multiple Choice'}
          </span>
          <span className={cn(
            'text-xs font-medium px-2.5 py-1 rounded-full',
            currentQuestion.difficulty === 'leicht' && 'bg-[#58CC02]/20 text-[#58CC02]',
            currentQuestion.difficulty === 'mittel' && 'bg-[#FF9600]/20 text-[#FF9600]',
            currentQuestion.difficulty === 'schwer' && 'bg-[#FF4B4B]/20 text-[#FF4B4B]',
          )}>
            {currentQuestion.difficulty.charAt(0).toUpperCase() + currentQuestion.difficulty.slice(1)}
          </span>
        </div>

        {/* Question text */}
        <div className="bg-[#1F2937] border border-[#4B5563] rounded-2xl p-5 mb-5">
          <p className="text-[#F9FAFB] text-base font-medium leading-relaxed">
            {currentQuestion.question_text}
          </p>
        </div>

        {/* Answer area */}
        {currentQuestion.type === 'multiple_choice' ? (
          <div className="flex flex-col gap-3 flex-1">
            {currentQuestion.answer_options
              .slice()
              .sort((a, b) => a.display_order - b.display_order)
              .map((option) => {
                const isSelected = answers[currentQuestion.id] === option.id
                return (
                  <button
                    key={option.id}
                    onClick={() => setAnswer(currentQuestion.id, option.id)}
                    className={cn(
                      'w-full text-left px-4 py-4 rounded-2xl border-2 font-medium text-sm',
                      'transition-all duration-200 min-h-[52px] cursor-pointer active:scale-[0.98]',
                      isSelected
                        ? 'border-[#1CB0F6] bg-[#1CB0F6]/10 text-[#F9FAFB]'
                        : 'border-[#4B5563] bg-[#1F2937] text-[#F9FAFB] hover:bg-[#374151] hover:border-[#6B7280]',
                    )}
                  >
                    {option.option_text}
                  </button>
                )
              })}
          </div>
        ) : (
          <div className="flex-1 flex flex-col">
            <Textarea
              value={answers[currentQuestion.id] ?? ''}
              onChange={(e) => setAnswer(currentQuestion.id, e.target.value)}
              placeholder="Schreibe deine Antwort hier…"
              className="flex-1 min-h-[200px] bg-[#1F2937] border-[#4B5563] text-[#F9FAFB] placeholder:text-[#4B5563] rounded-xl focus:border-[#1CB0F6] focus:ring-[#1CB0F6] resize-none text-sm leading-relaxed"
            />
            <p className="text-xs text-[#9CA3AF] mt-2">
              {(answers[currentQuestion.id] ?? '').length} Zeichen
            </p>
          </div>
        )}
      </main>

      {/* Navigation bar */}
      <nav className="bg-[#1F2937] border-t border-[#4B5563] px-4 py-4 sticky bottom-0">
        <div className="max-w-md mx-auto flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
            disabled={currentIndex === 0}
            className="flex-1 rounded-2xl border-[#4B5563] text-[#9CA3AF] hover:text-[#F9FAFB] hover:bg-[#374151] py-6 disabled:opacity-30"
          >
            <ChevronLeft size={18} className="mr-1" />
            Zurück
          </Button>

          {currentIndex < totalQuestions - 1 ? (
            <Button
              onClick={() => setCurrentIndex((i) => Math.min(totalQuestions - 1, i + 1))}
              className="flex-1 rounded-2xl bg-[#1CB0F6] hover:bg-[#18a0e0] text-white font-bold py-6"
            >
              Weiter
              <ChevronRight size={18} className="ml-1" />
            </Button>
          ) : (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  disabled={isSubmitting}
                  className="flex-1 rounded-2xl bg-[#58CC02] hover:bg-[#4CAD02] text-white font-bold py-6 disabled:opacity-50"
                >
                  {isSubmitting ? 'Wird abgegeben…' : 'Abgeben'}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="bg-[#1F2937] border-[#4B5563] text-[#F9FAFB]">
                <AlertDialogHeader>
                  <AlertDialogTitle>Prüfung abgeben?</AlertDialogTitle>
                  <AlertDialogDescription className="text-[#9CA3AF]">
                    {unansweredCount > 0
                      ? `Du hast noch ${unansweredCount} unbeantwortete Frage${unansweredCount !== 1 ? 'n' : ''}. Nicht beantwortete Fragen werden als falsch gewertet.`
                      : 'Alle Fragen beantwortet. Prüfung jetzt abgeben?'}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="bg-[#374151] border-[#4B5563] text-[#F9FAFB] hover:bg-[#4B5563]">
                    Noch einmal prüfen
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => submitExam('submit')}
                    className="bg-[#58CC02] hover:bg-[#4CAD02] text-white"
                  >
                    Endgültig abgeben
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>

        {/* Question dot navigation */}
        <div className="max-w-md mx-auto mt-3 flex flex-wrap gap-1.5 justify-center">
          {questions.map((q, i) => (
            <button
              key={q.id}
              onClick={() => setCurrentIndex(i)}
              title={`Frage ${i + 1}`}
              className={cn(
                'w-6 h-6 rounded-full text-xs font-bold transition-all duration-150',
                i === currentIndex
                  ? 'bg-[#1CB0F6] text-white'
                  : answers[q.id]
                    ? 'bg-[#58CC02]/80 text-white'
                    : 'bg-[#374151] text-[#9CA3AF] hover:bg-[#4B5563]',
              )}
            >
              {i + 1}
            </button>
          ))}
        </div>
      </nav>
    </div>
  )
}
