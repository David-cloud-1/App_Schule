'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, CheckCircle2, XCircle, Zap, Trophy, RotateCcw, Flame } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { LevelUpDialog } from '@/components/level-up-dialog'
import { BadgeUnlockModal } from '@/components/badge-unlock-modal'
import { XpLevelBadge } from '@/components/xp-level-badge'
import { getLevelFromXp } from '@/lib/xp-utils'
import { BADGE_MAP, type BadgeDefinition } from '@/lib/badges'
import { cn } from '@/lib/utils'

export interface QuizQuestion {
  id: string
  question_text: string
  explanation: string | null
  difficulty: string
  answer_options: {
    id: string
    option_text: string
    is_correct: boolean
    display_order: number
  }[]
}

interface Subject {
  id: string
  code: string
  name: string
  color: string
}

interface SessionAnswer {
  question_id: string
  selected_option_id: string
  is_correct: boolean
}

interface SessionResult {
  xp_earned: number
  new_total_xp: number
  new_streak: number
  leveled_up: boolean
  old_level: number
  new_level: number
  new_badges: string[]
}

interface QuizClientProps {
  questions: QuizQuestion[]
  subject: Subject
  subjectId: string | null
  totalAvailable: number
}

type Phase = 'active' | 'feedback' | 'summary'

const QUIZ_SIZE = 10

async function saveSession(
  subjectId: string | null,
  answers: SessionAnswer[],
): Promise<SessionResult | null> {
  try {
    const res = await fetch('/api/quiz/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subject_id: subjectId, answers }),
    })
    if (!res.ok) return null
    return (await res.json()) as SessionResult
  } catch (err) {
    console.error('[QuizClient] Failed to save session:', err)
    return null
  }
}

export function QuizClient({ questions, subject, subjectId, totalAvailable }: QuizClientProps) {
  const router = useRouter()
  const [currentIndex, setCurrentIndex] = useState(0)
  const [phase, setPhase] = useState<Phase>('active')
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null)
  const [hasAnswered, setHasAnswered] = useState(false)
  const [results, setResults] = useState<boolean[]>([])
  const [sessionAnswers, setSessionAnswers] = useState<SessionAnswer[]>([])
  const [sessionResult, setSessionResult] = useState<SessionResult | null>(null)
  const [showLevelUp, setShowLevelUp] = useState(false)
  const [badgeQueue, setBadgeQueue] = useState<BadgeDefinition[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  const totalQuestions = questions.length
  const currentQuestion = questions[currentIndex]
  const correctCount = results.filter(Boolean).length

  function handleSelectAnswer(optionId: string) {
    if (hasAnswered) return
    const option = currentQuestion.answer_options.find((o) => o.id === optionId)
    if (!option) return

    const newAnswer: SessionAnswer = {
      question_id: currentQuestion.id,
      selected_option_id: optionId,
      is_correct: option.is_correct,
    }

    setSelectedOptionId(optionId)
    setHasAnswered(true)
    setResults((prev) => [...prev, option.is_correct])
    setSessionAnswers((prev) => [...prev, newAnswer])
    setPhase('feedback')
  }

  async function handleNext() {
    if (currentIndex + 1 >= totalQuestions) {
      if (isSubmitting) return
      setIsSubmitting(true)
      const allAnswers = [...sessionAnswers]
      const result = await saveSession(subjectId, allAnswers)
      setSessionResult(result)
      setPhase('summary')
      if (result?.leveled_up) {
        setShowLevelUp(true)
      } else if (result?.new_badges?.length) {
        // No level-up: start badge queue immediately
        const defs = result.new_badges
          .map((id) => BADGE_MAP.get(id))
          .filter((b): b is BadgeDefinition => !!b)
        setBadgeQueue(defs)
      }
    } else {
      setCurrentIndex((prev) => prev + 1)
      setSelectedOptionId(null)
      setHasAnswered(false)
      setPhase('active')
    }
  }

  const isCorrectSelected = selectedOptionId
    ? (currentQuestion.answer_options.find((o) => o.id === selectedOptionId)?.is_correct ?? false)
    : false

  // ── Summary screen ────────────────────────────────────────────────────────
  if (phase === 'summary') {
    const percentage = Math.round((correctCount / totalQuestions) * 100)
    const xpEarned = sessionResult?.xp_earned ?? 0
    const newTotalXp = sessionResult?.new_total_xp ?? 0
    const newStreak = sessionResult?.new_streak ?? 0
    const newLevel = sessionResult?.new_level ?? getLevelFromXp(newTotalXp)

    return (
      <>
        {/* Level-up celebration dialog — chains into badge queue on close */}
        {sessionResult?.leveled_up && (
          <LevelUpDialog
            open={showLevelUp}
            onClose={() => {
              setShowLevelUp(false)
              if (sessionResult.new_badges?.length) {
                const defs = sessionResult.new_badges
                  .map((id) => BADGE_MAP.get(id))
                  .filter((b): b is BadgeDefinition => !!b)
                setBadgeQueue(defs)
              }
            }}
            newLevel={sessionResult.new_level}
            totalXp={sessionResult.new_total_xp}
          />
        )}

        {/* Badge unlock queue — one modal at a time */}
        {badgeQueue.length > 0 && (
          <BadgeUnlockModal
            open
            badge={badgeQueue[0]}
            onClose={() => setBadgeQueue((q) => q.slice(1))}
          />
        )}

        <div className="min-h-screen bg-[#111827] flex flex-col">
          <header className="bg-[#1F2937] border-b border-[#4B5563] px-4 py-4">
            <div className="max-w-md mx-auto flex items-center">
              <Link href="/subjects" className="text-[#9CA3AF] hover:text-[#F9FAFB] transition-colors">
                <ArrowLeft size={20} />
              </Link>
              <span className="ml-3 font-semibold text-[#F9FAFB]">Ergebnis</span>
            </div>
          </header>

          <main className="max-w-md mx-auto px-4 py-8 flex-1 flex flex-col items-center justify-center">
            <div className="text-center mb-8">
              <Trophy size={64} className="text-[#FFD700] mx-auto mb-4" />
              <p className="text-[#9CA3AF] text-sm mb-2">Du hast</p>
              <p className="text-6xl font-bold text-[#F9FAFB]">
                {correctCount}
                <span className="text-3xl text-[#9CA3AF]">/{totalQuestions}</span>
              </p>
              <p className="text-[#9CA3AF] mt-2">Fragen richtig beantwortet</p>
            </div>

            <div className="w-full mb-4">
              <Progress
                value={percentage}
                className="h-3 bg-[#374151] rounded-full [&>div]:bg-[#58CC02]"
              />
              <p className="text-center text-sm text-[#9CA3AF] mt-2">{percentage}% richtig</p>
            </div>

            {/* XP earned */}
            <div className="bg-[#1F2937] border border-[#4B5563] rounded-2xl p-4 w-full mb-3 flex items-center justify-between">
              <div>
                <p className="text-[#9CA3AF] text-sm">Verdiente XP</p>
                <p className="text-xl font-bold text-[#58CC02]">+{xpEarned} XP</p>
                {newTotalXp > 0 && (
                  <p className="text-xs text-[#6B7280] mt-0.5">{newTotalXp} XP gesamt</p>
                )}
              </div>
              <div className="flex flex-col items-end gap-1">
                <Zap size={28} className="text-[#58CC02]" />
                {newTotalXp > 0 && <XpLevelBadge totalXp={newTotalXp} level={newLevel} />}
              </div>
            </div>

            {/* Streak */}
            <div className={cn(
              'rounded-2xl p-4 w-full mb-6 flex items-center justify-between',
              newStreak > 0
                ? 'bg-[#1F2937] border border-[#FF9600]/30'
                : 'bg-[#1F2937] border border-[#4B5563]',
            )}>
              <div>
                <p className="text-[#9CA3AF] text-sm">Tagesserie</p>
                {newStreak > 0 ? (
                  <p className="text-xl font-bold text-[#FF9600]">{newStreak} {newStreak === 1 ? 'Tag' : 'Tage'} 🔥</p>
                ) : (
                  <p className="text-sm font-semibold text-[#6B7280]">Morgen wieder einloggen!</p>
                )}
              </div>
              <Flame size={28} className={newStreak > 0 ? 'text-[#FF9600]' : 'text-[#4B5563]'} />
            </div>

            <div className="flex flex-col gap-3 w-full">
              <Button
                onClick={() => router.push(typeof window !== 'undefined' ? window.location.pathname + window.location.search : '/quiz')}
                className="w-full rounded-2xl bg-[#58CC02] hover:bg-[#4CAD02] text-white font-bold text-base py-6 transition-all duration-200 active:scale-95"
              >
                <RotateCcw className="mr-2" size={18} />
                Nochmal üben
              </Button>
              <Link href="/subjects">
                <Button
                  variant="outline"
                  className="w-full rounded-2xl border-[#4B5563] text-[#9CA3AF] hover:text-[#F9FAFB] hover:bg-[#374151] font-semibold text-base py-6 transition-all duration-200"
                >
                  Zur Fachübersicht
                </Button>
              </Link>
            </div>
          </main>
        </div>
      </>
    )
  }

  // ── Active / Feedback screen ──────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#111827] flex flex-col">
      {/* Header with progress */}
      <header className="bg-[#1F2937] border-b border-[#4B5563] px-4 py-4 sticky top-0 z-10">
        <div className="max-w-md mx-auto">
          <div className="flex items-center justify-between mb-3">
            <Link
              href="/subjects"
              className="text-[#9CA3AF] hover:text-[#F9FAFB] transition-colors"
            >
              <ArrowLeft size={20} />
            </Link>
            <div className="flex items-center gap-2">
              <div
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: subject.color }}
              />
              <span className="text-sm font-medium text-[#9CA3AF]">{subject.code}</span>
              <span className="text-[#4B5563]">·</span>
              <span className="text-sm font-semibold text-[#F9FAFB]">
                Frage {currentIndex + 1}/{totalQuestions}
              </span>
            </div>
            <div className="w-5" />
          </div>
          <Progress
            value={(currentIndex / totalQuestions) * 100}
            className="h-2 bg-[#374151] rounded-full [&>div]:bg-[#58CC02] [&>div]:transition-all [&>div]:duration-500"
          />
        </div>
      </header>

      {/* Quiz content */}
      <main className="max-w-md mx-auto px-4 py-6 flex-1 flex flex-col">
        {/* Warning: fewer than 10 questions available */}
        {totalAvailable < QUIZ_SIZE && (
          <div className="bg-[#1F2937] border border-[#FF9600]/60 rounded-xl px-4 py-3 mb-4 text-sm text-[#FF9600]">
            Nur {totalAvailable} {totalAvailable === 1 ? 'Frage' : 'Fragen'} für dieses Fach
            verfügbar.
          </div>
        )}

        {/* Question card */}
        <div className="bg-[#1F2937] border border-[#4B5563] rounded-2xl p-5 mb-5">
          <div className="mb-3">
            <span
              className={cn(
                'text-xs font-medium px-2.5 py-1 rounded-full',
                currentQuestion.difficulty === 'leicht' && 'bg-[#58CC02]/20 text-[#58CC02]',
                currentQuestion.difficulty === 'mittel' && 'bg-[#FF9600]/20 text-[#FF9600]',
                currentQuestion.difficulty === 'schwer' && 'bg-[#FF4B4B]/20 text-[#FF4B4B]',
              )}
            >
              {currentQuestion.difficulty.charAt(0).toUpperCase() +
                currentQuestion.difficulty.slice(1)}
            </span>
          </div>
          <p className="text-[#F9FAFB] text-base font-medium leading-relaxed">
            {currentQuestion.question_text}
          </p>
        </div>

        {/* Answer options */}
        <div className="flex flex-col gap-3">
          {currentQuestion.answer_options.map((option) => {
            const isSelected = selectedOptionId === option.id
            const showFeedback = phase === 'feedback'
            const isCorrect = option.is_correct

            let buttonClass =
              'bg-[#1F2937] border-[#4B5563] text-[#F9FAFB] hover:bg-[#374151] hover:border-[#6B7280]'

            if (showFeedback) {
              if (isCorrect) {
                buttonClass = 'bg-[#58CC02]/10 border-[#58CC02] text-[#58CC02]'
              } else if (isSelected) {
                buttonClass = 'bg-[#FF4B4B]/10 border-[#FF4B4B] text-[#FF4B4B]'
              } else {
                buttonClass = 'bg-[#1F2937] border-[#374151] text-[#6B7280] opacity-50'
              }
            }

            return (
              <button
                key={option.id}
                onClick={() => handleSelectAnswer(option.id)}
                disabled={phase === 'feedback'}
                className={cn(
                  'w-full text-left px-4 py-4 rounded-2xl border-2 font-medium text-sm',
                  'transition-all duration-200 min-h-[52px]',
                  'disabled:cursor-default',
                  buttonClass,
                  phase === 'active' && 'cursor-pointer active:scale-[0.98]',
                )}
              >
                <div className="flex items-center gap-3">
                  {showFeedback && isCorrect && (
                    <CheckCircle2 size={18} className="text-[#58CC02] flex-shrink-0" />
                  )}
                  {showFeedback && isSelected && !isCorrect && (
                    <XCircle size={18} className="text-[#FF4B4B] flex-shrink-0" />
                  )}
                  <span>{option.option_text}</span>
                </div>
              </button>
            )
          })}
        </div>

        {/* Feedback panel */}
        {phase === 'feedback' && (
          <div className="mt-auto pt-5">
            <div
              className={cn(
                'rounded-2xl p-4 mb-4 border',
                isCorrectSelected
                  ? 'bg-[#58CC02]/10 border-[#58CC02]'
                  : 'bg-[#FF4B4B]/10 border-[#FF4B4B]',
              )}
            >
              <div className="flex items-center gap-2 mb-1">
                {isCorrectSelected ? (
                  <CheckCircle2 size={18} className="text-[#58CC02]" />
                ) : (
                  <XCircle size={18} className="text-[#FF4B4B]" />
                )}
                <span
                  className={cn(
                    'font-bold text-sm',
                    isCorrectSelected ? 'text-[#58CC02]' : 'text-[#FF4B4B]',
                  )}
                >
                  {isCorrectSelected ? 'Richtig!' : 'Leider falsch!'}
                </span>
              </div>
              {currentQuestion.explanation && (
                <p className="text-[#9CA3AF] text-sm leading-relaxed mt-1">
                  {currentQuestion.explanation}
                </p>
              )}
            </div>

            <Button
              onClick={handleNext}
              disabled={isSubmitting}
              className={cn(
                'w-full rounded-2xl font-bold text-base py-6 transition-all duration-200 active:scale-95',
                isCorrectSelected
                  ? 'bg-[#58CC02] hover:bg-[#4CAD02] text-white'
                  : 'bg-[#FF4B4B] hover:bg-[#e04040] text-white',
              )}
            >
              {currentIndex + 1 >= totalQuestions ? 'Ergebnisse anzeigen' : 'Weiter'}
            </Button>
          </div>
        )}
      </main>
    </div>
  )
}
