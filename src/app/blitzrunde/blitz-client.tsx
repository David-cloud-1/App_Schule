'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, CheckCircle2, XCircle, Zap, Coins, Flame, Trophy, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { QuizQuestion } from '../quiz/quiz-client'

const ROUND_SECONDS = 60

interface SessionAnswer {
  question_id: string
  selected_option_id: string
  is_correct: boolean
}

interface StartResponse {
  token: string
  questions: QuizQuestion[]
}

interface FinishResponse {
  correct_count: number
  coins_earned: number
  xp_earned: number
  new_coin_balance: number
  new_total_xp: number
  new_streak: number
}

type Phase = 'loading' | 'unavailable' | 'error' | 'active' | 'finishing' | 'summary'

async function startRound(): Promise<{ ok: true; data: StartResponse } | { ok: false; status: number }> {
  try {
    const res = await fetch('/api/quiz/blitz/start', { method: 'POST' })
    if (!res.ok) return { ok: false, status: res.status }
    return { ok: true, data: (await res.json()) as StartResponse }
  } catch (err) {
    console.error('[BlitzClient] start failed:', err)
    return { ok: false, status: 0 }
  }
}

async function finishRound(token: string, answers: SessionAnswer[]): Promise<FinishResponse | null> {
  try {
    const res = await fetch('/api/quiz/blitz/finish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, answers }),
    })
    if (!res.ok) return null
    return (await res.json()) as FinishResponse
  } catch (err) {
    console.error('[BlitzClient] finish failed:', err)
    return null
  }
}

export function BlitzClient() {
  const [phase, setPhase] = useState<Phase>('loading')
  const [questions, setQuestions] = useState<QuizQuestion[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null)
  const [timeLeft, setTimeLeft] = useState(ROUND_SECONDS)
  const [result, setResult] = useState<FinishResponse | null>(null)

  const tokenRef = useRef<string | null>(null)
  const answersRef = useRef<SessionAnswer[]>([])
  const finishedRef = useRef(false)
  const advanceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const doFinish = useCallback(async () => {
    if (finishedRef.current) return
    finishedRef.current = true
    if (advanceTimeoutRef.current) clearTimeout(advanceTimeoutRef.current)
    setPhase('finishing')
    const token = tokenRef.current
    if (!token) {
      setPhase('error')
      return
    }
    const data = await finishRound(token, answersRef.current)
    if (!data) {
      setPhase('error')
      return
    }
    setResult(data)
    setPhase('summary')
  }, [])

  // ── Start the round on mount ──────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false
    startRound().then((res) => {
      if (cancelled) return
      if (!res.ok) {
        setPhase(res.status === 409 ? 'unavailable' : 'error')
        return
      }
      tokenRef.current = res.data.token
      setQuestions(res.data.questions)
      setPhase('active')
    })
    return () => {
      cancelled = true
    }
  }, [])

  // ── Countdown ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'active') return
    if (timeLeft <= 0) {
      doFinish()
      return
    }
    const id = setTimeout(() => setTimeLeft((t) => t - 1), 1000)
    return () => clearTimeout(id)
  }, [phase, timeLeft, doFinish])

  function handleSelect(optionId: string) {
    if (phase !== 'active' || selectedOptionId || questions.length === 0) return
    const question = questions[currentIndex % questions.length]
    const option = question.answer_options.find((o) => o.id === optionId)
    if (!option) return

    answersRef.current = [
      ...answersRef.current,
      { question_id: question.id, selected_option_id: optionId, is_correct: option.is_correct },
    ]
    setSelectedOptionId(optionId)

    advanceTimeoutRef.current = setTimeout(() => {
      if (finishedRef.current) return
      setSelectedOptionId(null)
      setCurrentIndex((i) => i + 1)
    }, 450)
  }

  useEffect(() => {
    return () => {
      if (advanceTimeoutRef.current) clearTimeout(advanceTimeoutRef.current)
    }
  }, [])

  // ── Unavailable / error states ────────────────────────────────────────────
  if (phase === 'loading') {
    return (
      <div className="min-h-screen bg-[#111827] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#FFD700] animate-spin" />
      </div>
    )
  }

  if (phase === 'unavailable') {
    return (
      <div className="min-h-screen bg-[#111827] flex flex-col items-center justify-center px-4 text-center">
        <Zap size={64} className="text-[#FFD700] mb-6" />
        <h1 className="text-2xl font-bold text-[#F9FAFB] mb-3">Heute schon erledigt!</h1>
        <p className="text-[#9CA3AF] mb-8 leading-relaxed">
          Die Blitzrunde ist einmal pro Tag verfügbar. Komm morgen wieder für die nächste Runde.
        </p>
        <Link href="/">
          <Button className="rounded-2xl bg-[#58CC02] hover:bg-[#4CAD02] text-white font-bold px-8 py-5">
            Zur Startseite
          </Button>
        </Link>
      </div>
    )
  }

  if (phase === 'error') {
    return (
      <div className="min-h-screen bg-[#111827] flex flex-col items-center justify-center px-4 text-center">
        <XCircle size={64} className="text-[#FF4B4B] mb-6" />
        <h1 className="text-2xl font-bold text-[#F9FAFB] mb-3">Etwas ist schiefgelaufen</h1>
        <p className="text-[#9CA3AF] mb-8 leading-relaxed">
          Die Blitzrunde konnte nicht gestartet werden. Versuch es gleich noch einmal.
        </p>
        <Link href="/">
          <Button variant="outline" className="rounded-2xl border-[#4B5563] text-[#9CA3AF] px-8 py-5">
            Zur Startseite
          </Button>
        </Link>
      </div>
    )
  }

  // ── Summary screen ────────────────────────────────────────────────────────
  if (phase === 'summary' && result) {
    return (
      <div className="min-h-screen bg-[#111827] flex flex-col">
        <header className="bg-[#1F2937] border-b border-[#4B5563] px-4 py-4">
          <div className="max-w-md mx-auto flex items-center">
            <span className="font-semibold text-[#F9FAFB]">Blitzrunde — Ergebnis</span>
          </div>
        </header>

        <main className="max-w-md mx-auto px-4 py-8 flex-1 flex flex-col items-center justify-center w-full">
          <div className="text-center mb-8">
            <Zap size={64} className="text-[#FFD700] mx-auto mb-4" />
            <p className="text-[#9CA3AF] text-sm mb-2">Richtige Antworten</p>
            <p className="text-6xl font-bold text-[#F9FAFB]">{result.correct_count}</p>
          </div>

          <div className="w-full grid grid-cols-2 gap-3 mb-6">
            <div className="bg-[#1F2937] border border-[#FFD700]/40 rounded-2xl p-4 flex flex-col items-center">
              <Coins size={22} className="text-[#FFD700] mb-1" />
              <p className="text-lg font-bold text-[#FFD700]">+{result.coins_earned}</p>
              <p className="text-xs text-[#9CA3AF]">Münzen</p>
            </div>
            <div className="bg-[#1F2937] border border-[#4B5563] rounded-2xl p-4 flex flex-col items-center">
              <Trophy size={22} className="text-[#58CC02] mb-1" />
              <p className="text-lg font-bold text-[#58CC02]">+{result.xp_earned}</p>
              <p className="text-xs text-[#9CA3AF]">XP</p>
            </div>
          </div>

          <div className="w-full bg-[#1F2937] border border-[#FF9600]/30 rounded-2xl p-4 mb-8 flex items-center justify-between">
            <div>
              <p className="text-[#9CA3AF] text-sm">Tagesserie</p>
              <p className="text-xl font-bold text-[#FF9600]">
                {result.new_streak} {result.new_streak === 1 ? 'Tag' : 'Tage'} 🔥
              </p>
            </div>
            <Flame size={28} className="text-[#FF9600]" />
          </div>

          <Link href="/" className="w-full">
            <Button className="w-full rounded-2xl bg-[#58CC02] hover:bg-[#4CAD02] text-white font-bold text-base py-6 transition-all duration-200 active:scale-95">
              Zur Startseite
            </Button>
          </Link>
        </main>
      </div>
    )
  }

  // ── Active / finishing round ──────────────────────────────────────────────
  const question = questions.length > 0 ? questions[currentIndex % questions.length] : null

  return (
    <div className="min-h-screen bg-[#111827] flex flex-col">
      <header className="bg-[#1F2937] border-b border-[#4B5563] px-4 py-4 sticky top-0 z-10">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <Link href="/" className="text-[#9CA3AF] hover:text-[#F9FAFB] transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <div
            className={cn(
              'flex items-center gap-1.5 font-bold text-lg tabular-nums',
              timeLeft <= 10 ? 'text-[#FF4B4B]' : 'text-[#FFD700]',
            )}
            aria-live="polite"
          >
            <Zap size={18} />
            {timeLeft}s
          </div>
          <div className="w-5" />
        </div>
        <div className="max-w-md mx-auto mt-2 h-2 bg-[#374151] rounded-full overflow-hidden">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-1000 ease-linear',
              timeLeft <= 10 ? 'bg-[#FF4B4B]' : 'bg-[#FFD700]',
            )}
            style={{ width: `${(timeLeft / ROUND_SECONDS) * 100}%` }}
          />
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-6 flex-1 flex flex-col w-full">
        {phase === 'finishing' || !question ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-[#FFD700] animate-spin" />
          </div>
        ) : (
          <>
            <div className="bg-[#1F2937] border border-[#4B5563] rounded-2xl p-5 mb-5">
              <p className="text-[#F9FAFB] text-base font-medium leading-relaxed">
                {question.question_text}
              </p>
            </div>

            <div className="flex flex-col gap-3">
              {question.answer_options.map((option) => {
                const isSelected = selectedOptionId === option.id
                const showFeedback = selectedOptionId !== null
                const isCorrect = option.is_correct

                let buttonClass =
                  'bg-[#1F2937] border-[#4B5563] text-[#F9FAFB] hover:bg-[#374151] hover:border-[#6B7280]'

                if (showFeedback) {
                  if (isSelected && isCorrect) {
                    buttonClass = 'bg-[#58CC02]/10 border-[#58CC02] text-[#58CC02]'
                  } else if (isSelected && !isCorrect) {
                    buttonClass = 'bg-[#FF4B4B]/10 border-[#FF4B4B] text-[#FF4B4B]'
                  } else {
                    buttonClass = 'bg-[#1F2937] border-[#374151] text-[#6B7280] opacity-50'
                  }
                }

                return (
                  <button
                    key={option.id}
                    onClick={() => handleSelect(option.id)}
                    disabled={showFeedback}
                    className={cn(
                      'w-full text-left px-4 py-4 rounded-2xl border-2 font-medium text-sm',
                      'transition-all duration-200 min-h-[52px]',
                      'disabled:cursor-default',
                      buttonClass,
                      !showFeedback && 'cursor-pointer active:scale-[0.98]',
                    )}
                  >
                    <div className="flex items-center gap-3">
                      {isSelected && isCorrect && (
                        <CheckCircle2 size={18} className="text-[#58CC02] flex-shrink-0" />
                      )}
                      {isSelected && !isCorrect && (
                        <XCircle size={18} className="text-[#FF4B4B] flex-shrink-0" />
                      )}
                      <span>{option.option_text}</span>
                    </div>
                  </button>
                )
              })}
            </div>
          </>
        )}
      </main>
    </div>
  )
}
