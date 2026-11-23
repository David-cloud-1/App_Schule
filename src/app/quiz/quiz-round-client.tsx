'use client'

import { useCallback, useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  CheckCircle2,
  Coins,
  Flame,
  Loader2,
  RotateCcw,
  Trophy,
  WifiOff,
  XCircle,
  Zap,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { LevelUpDialog } from '@/components/level-up-dialog'
import { BadgeUnlockModal } from '@/components/badge-unlock-modal'
import { XpLevelBadge } from '@/components/xp-level-badge'
import { ReportQuestionButton } from '@/components/report-question-button'
import { ReminderOptInCard } from '@/components/reminder-opt-in-card'
import { ChoiceOptions } from '@/components/quiz-round/choice-options'
import { TrueFalseCard } from '@/components/quiz-round/true-false-card'
import { EliminateOptions } from '@/components/quiz-round/eliminate-options'
import { JokerButton } from '@/components/quiz-round/joker-button'
import { WagerDialog } from '@/components/quiz-round/wager-dialog'
import { FormBadge } from '@/components/quiz-round/form-badge'
import { FeedbackFlash } from '@/components/quiz-round/feedback-flash'
import { RoundReview, type QuestionOutcome } from '@/components/quiz-round/round-review'
import { finishQuizRound, sendRoundAnswer, sendRoundJoker, sendRoundWager } from '@/lib/quiz-round-api'
import {
  ELIMINATE_HEARTS,
  formatJokerCost,
  formatWagerOutcome,
  jokerState,
  type QuizRoundResult,
  type QuizRoundStart,
  type RoundAnswerRequest,
} from '@/lib/quiz-round'
import { getLevelFromXp } from '@/lib/xp-utils'
import type { BadgeDisplay } from '@/lib/badges'
import { cn } from '@/lib/utils'

const QUIZ_SIZE = 10

interface Subject {
  id: string
  code: string
  name: string
  color: string
}

export interface QuizRoundClientProps {
  start: QuizRoundStart
  subject: Subject
  totalAvailable: number
}

type Phase = 'question' | 'finishing' | 'finish_error' | 'expired' | 'summary'

/** Zustand der gerade gezeigten Frage (wird bei „Weiter“ zurückgesetzt) */
interface Current {
  selectedId: string | null
  saidTrue: boolean | null
  pending: boolean
  eliminatedIds: string[]
  keptIds: string[]
  heartsLeft: number
  pendingEliminateId: string | null
  lastHeartLostId: string | null
}

const freshCurrent = (): Current => ({
  selectedId: null,
  saidTrue: null,
  pending: false,
  eliminatedIds: [],
  keptIds: [],
  heartsLeft: ELIMINATE_HEARTS,
  pendingEliminateId: null,
  lastHeartLostId: null,
})

/**
 * Normales Quiz mit Rundenzettel (PROJ-129). Der Browser kennt die Lösung
 * erst, wenn der Server die Antwort geprüft hat. Varianten, Joker und Wette
 * legt der Server fest; diese Seite zeigt sie nur an.
 */
export function QuizRoundClient({ start, subject, totalAvailable }: QuizRoundClientProps) {
  const { round_id: roundId, questions, joker } = start
  const total = questions.length

  const [index, setIndex] = useState(0)
  const [phase, setPhase] = useState<Phase>('question')
  const [cur, setCur] = useState<Current>(freshCurrent)
  const [outcomes, setOutcomes] = useState<Record<number, QuestionOutcome>>({})
  const [retry, setRetry] = useState<(() => void) | null>(null)

  const [jokerRemoved, setJokerRemoved] = useState<Record<number, string[]>>({})
  const [jokersUsed, setJokersUsed] = useState(0)
  const [coinsReserved, setCoinsReserved] = useState(0)
  const [jokerPending, setJokerPending] = useState(false)
  const [jokerError, setJokerError] = useState<string | null>(null)

  const [wagerOffer, setWagerOffer] = useState<{ stake: number } | null>(null)
  const [wagerOpen, setWagerOpen] = useState(false)
  const [wagerPending, setWagerPending] = useState(false)
  const [wagerError, setWagerError] = useState(false)
  const [wagerAccepted, setWagerAccepted] = useState<boolean | null>(null)

  const [flash, setFlash] = useState<{ tone: 'correct' | 'wrong' | null; key: number }>({ tone: null, key: 0 })
  const [result, setResult] = useState<QuizRoundResult | null>(null)
  const [showLevelUp, setShowLevelUp] = useState(false)
  const [badgeQueue, setBadgeQueue] = useState<BadgeDisplay[]>([])

  const question = questions[index]
  const outcome = outcomes[index]
  const isLast = index === total - 1
  const correctCount = Object.values(outcomes).filter((o) => o.correct).length

  // ── Antwort an den Server ────────────────────────────────────────────────
  const submit = useCallback(
    async (req: RoundAnswerRequest) => {
      setRetry(null)
      const res = await sendRoundAnswer(roundId, req)
      if (!res.ok) {
        if (res.status === 404 || res.status === 410) {
          setPhase('expired')
          return
        }
        setCur((c) => ({ ...c, pending: false, pendingEliminateId: null }))
        setRetry(() => () => {
          setCur((c) => ({
            ...c,
            pending: true,
            pendingEliminateId: req.kind === 'eliminate' ? req.option_id : null,
          }))
          void submit(req)
        })
        return
      }

      const data = res.data
      const q = questions[req.question_index]

      if (data.status !== 'resolved') {
        // Rauswerfen: ein Schritt, die Frage läuft weiter
        setCur((c) => ({
          ...c,
          pendingEliminateId: null,
          heartsLeft: data.hearts_left,
          eliminatedIds: data.status === 'eliminated' ? [...c.eliminatedIds, data.option_id] : c.eliminatedIds,
          keptIds: data.status === 'heart_lost' ? [...c.keptIds, data.option_id] : c.keptIds,
          lastHeartLostId: data.status === 'heart_lost' ? data.option_id : null,
        }))
        return
      }

      const step = data.eliminate
      setCur((c) => ({
        ...c,
        pending: false,
        pendingEliminateId: null,
        ...(step
          ? {
              heartsLeft: step.hearts_left,
              eliminatedIds: step.step === 'eliminated' ? [...c.eliminatedIds, step.option_id] : c.eliminatedIds,
              keptIds: step.step === 'heart_lost' ? [...c.keptIds, step.option_id] : c.keptIds,
              lastHeartLostId: step.step === 'heart_lost' ? step.option_id : null,
            }
          : {}),
      }))
      setOutcomes((prev) => ({
        ...prev,
        [req.question_index]: {
          form: q.form,
          correct: data.correct,
          correct_option_id: data.correct_option_id,
          explanation: data.explanation,
          selected_option_id: req.kind === 'choice' ? req.option_id : null,
          says_true: req.kind === 'true_false' ? req.says_true : undefined,
          mistakes: step?.mistakes,
          joker: (jokerRemoved[req.question_index] ?? []).length > 0,
        },
      }))
      if (data.wager_offer && data.wager_offer.stake > 0) setWagerOffer(data.wager_offer)
      setFlash((f) => ({ tone: data.correct ? 'correct' : 'wrong', key: f.key + 1 }))
    },
    [roundId, questions, jokerRemoved],
  )

  function answerChoice(optionId: string) {
    if (cur.pending || outcome) return
    setCur((c) => ({ ...c, selectedId: optionId, pending: true }))
    void submit({ kind: 'choice', question_index: index, option_id: optionId })
  }

  const answerTrueFalse = useCallback(
    (saysTrue: boolean) => {
      if (cur.pending || outcome) return
      setCur((c) => ({ ...c, saidTrue: saysTrue, pending: true }))
      void submit({ kind: 'true_false', question_index: index, says_true: saysTrue })
    },
    [cur.pending, outcome, index, submit],
  )

  function tapEliminate(optionId: string) {
    if (cur.pendingEliminateId || outcome) return
    setCur((c) => ({ ...c, pendingEliminateId: optionId, lastHeartLostId: null }))
    void submit({ kind: 'eliminate', question_index: index, option_id: optionId })
  }

  // ── Joker ─────────────────────────────────────────────────────────────────
  async function applyJoker() {
    if (jokerPending) return
    setJokerPending(true)
    setJokerError(null)
    const res = await sendRoundJoker(roundId, index)
    setJokerPending(false)
    if (!res.ok) {
      setJokerError(
        res.status === 402
          ? 'Dafür reichen deine Münzen nicht.'
          : res.status === 409
            ? 'Der Joker geht bei dieser Frage nicht.'
            : 'Joker hat nicht geklappt. Bitte noch einmal versuchen.',
      )
      return
    }
    setJokerRemoved((prev) => ({ ...prev, [index]: res.data.removed_option_ids }))
    setJokersUsed(res.data.jokers_used)
    setCoinsReserved(res.data.coins_reserved)
  }

  // ── Weiter / Wette / Abrechnen ───────────────────────────────────────────
  function goTo(next: number) {
    setIndex(next)
    setCur(freshCurrent())
    setRetry(null)
    setJokerError(null)
    setFlash((f) => ({ tone: null, key: f.key }))
  }

  async function finish() {
    setPhase('finishing')
    const res = await finishQuizRound(roundId)
    if (!res.ok) {
      setPhase(res.status === 404 || res.status === 410 ? 'expired' : 'finish_error')
      return
    }
    setResult(res.data)
    setPhase('summary')
    if (res.data.leveled_up) setShowLevelUp(true)
    else if (res.data.new_badge_details?.length) setBadgeQueue(res.data.new_badge_details)
  }

  function handleNext() {
    if (isLast) {
      void finish()
      return
    }
    if (index === total - 2 && wagerOffer && wagerAccepted === null) {
      setWagerOpen(true)
      return
    }
    goTo(index + 1)
  }

  async function decideWager(accept: boolean) {
    setWagerPending(true)
    setWagerError(false)
    const res = await sendRoundWager(roundId, accept)
    setWagerPending(false)
    if (!res.ok) {
      setWagerError(true)
      return
    }
    setWagerAccepted(res.data.accepted)
    setWagerOpen(false)
    goTo(index + 1)
  }

  // ── Zustände ohne Frage ──────────────────────────────────────────────────
  if (phase === 'expired') {
    return (
      <CenteredMessage
        icon={<RotateCcw size={56} className="text-[#FF9600]" />}
        title="Diese Runde ist abgelaufen"
        text="Starte einfach eine neue Runde. Es wurde nichts abgebucht."
        action={
          <Button
            onClick={() => window.location.reload()}
            className="w-full rounded-2xl bg-[#58CC02] hover:bg-[#4CAD02] text-white font-bold py-6 active:scale-95 transition-all duration-200"
          >
            Neue Runde starten
          </Button>
        }
      />
    )
  }

  if (phase === 'finishing' || phase === 'finish_error') {
    return (
      <CenteredMessage
        icon={
          phase === 'finishing' ? (
            <Loader2 size={48} className="text-[#58CC02] animate-spin" />
          ) : (
            <WifiOff size={56} className="text-[#FF4B4B]" />
          )
        }
        title={phase === 'finishing' ? 'Ergebnisse werden berechnet …' : 'Ergebnis konnte nicht gespeichert werden'}
        text={phase === 'finishing' ? '' : 'Prüfe deine Verbindung und versuch es noch einmal. Deine Antworten sind gemerkt.'}
        action={
          phase === 'finish_error' ? (
            <Button
              onClick={() => void finish()}
              className="w-full rounded-2xl bg-[#58CC02] hover:bg-[#4CAD02] text-white font-bold py-6 active:scale-95 transition-all duration-200"
            >
              Erneut versuchen
            </Button>
          ) : null
        }
      />
    )
  }

  // ── Ergebnis ──────────────────────────────────────────────────────────────
  if (phase === 'summary' && result) {
    const percentage = total > 0 ? Math.round((result.score / total) * 100) : 0
    const newLevel = result.new_level ?? getLevelFromXp(result.new_total_xp)
    const { coins } = result
    return (
      <>
        {result.leveled_up && (
          <LevelUpDialog
            open={showLevelUp}
            onClose={() => {
              setShowLevelUp(false)
              if (result.new_badge_details?.length) setBadgeQueue(result.new_badge_details)
            }}
            newLevel={result.new_level}
            totalXp={result.new_total_xp}
          />
        )}
        {badgeQueue.length > 0 && (
          <BadgeUnlockModal open badge={badgeQueue[0]} onClose={() => setBadgeQueue((q) => q.slice(1))} />
        )}

        <div className="min-h-screen bg-[#111827] flex flex-col">
          <header className="bg-[#1F2937] border-b border-[#4B5563] px-4 py-4">
            <div className="max-w-md mx-auto flex items-center">
              <Link href="/subjects" aria-label="Zur Fachübersicht" className="text-[#9CA3AF] hover:text-[#F9FAFB] transition-colors">
                <ArrowLeft size={20} />
              </Link>
              <span className="ml-3 font-semibold text-[#F9FAFB]">Ergebnis</span>
            </div>
          </header>

          <main className="max-w-md mx-auto w-full px-4 py-8 flex-1 flex flex-col items-center justify-center">
            <div className="text-center mb-8">
              <Trophy size={64} className="text-[#FFD700] mx-auto mb-4" />
              <p className="text-[#9CA3AF] text-sm mb-2">Du hast</p>
              <p className="text-6xl font-bold text-[#F9FAFB]">
                {result.score}
                <span className="text-3xl text-[#9CA3AF]">/{total}</span>
              </p>
              <p className="text-[#9CA3AF] mt-2">Fragen richtig beantwortet</p>
            </div>

            <div className="w-full mb-4">
              <Progress value={percentage} className="h-3 bg-[#374151] rounded-full [&>div]:bg-[#58CC02]" />
              <p className="text-center text-sm text-[#9CA3AF] mt-2">{percentage}% richtig</p>
            </div>

            <div className="bg-[#1F2937] border border-[#4B5563] rounded-2xl p-4 w-full mb-3 flex items-center justify-between">
              <div>
                <p className="text-[#9CA3AF] text-sm">Verdiente XP</p>
                <p className="text-xl font-bold text-[#58CC02]">+{result.xp_earned} XP</p>
                {result.new_total_xp > 0 && <p className="text-xs text-[#6B7280] mt-0.5">{result.new_total_xp} XP gesamt</p>}
              </div>
              <div className="flex flex-col items-end gap-1">
                <Zap size={28} className="text-[#58CC02]" />
                {result.new_total_xp > 0 && <XpLevelBadge totalXp={result.new_total_xp} level={newLevel} />}
              </div>
            </div>

            <div className="bg-[#1F2937] border border-[#FFD700]/40 rounded-2xl p-4 w-full mb-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[#9CA3AF] text-sm">Verdiente Münzen</p>
                  <p className="text-xl font-bold text-[#FFD700]">
                    {result.coins_earned >= 0 ? `+${result.coins_earned}` : `−${Math.abs(result.coins_earned)}`}
                  </p>
                </div>
                <Coins size={28} className="text-[#FFD700]" />
              </div>
              {(coins.wager || coins.joker_cost > 0) && (
                <ul className="mt-3 flex flex-col gap-1 border-t border-[#374151] pt-3 text-sm" aria-label="Münzen im Detail">
                  {coins.wager && (
                    <li
                      data-testid="wager-outcome"
                      className={cn('font-semibold', coins.wager.won ? 'text-[#58CC02]' : 'text-[#FF4B4B]')}
                    >
                      {formatWagerOutcome(coins.wager)}
                    </li>
                  )}
                  {coins.joker_cost > 0 && <li className="text-[#9CA3AF]">{formatJokerCost(coins.joker_cost)}</li>}
                </ul>
              )}
            </div>

            <div
              className={cn(
                'rounded-2xl p-4 w-full mb-6 flex items-center justify-between bg-[#1F2937] border',
                result.new_streak > 0 ? 'border-[#FF9600]/30' : 'border-[#4B5563]',
              )}
            >
              <div>
                <p className="text-[#9CA3AF] text-sm">Tagesserie</p>
                {result.new_streak > 0 ? (
                  <p className="text-xl font-bold text-[#FF9600]">
                    {result.new_streak} {result.new_streak === 1 ? 'Tag' : 'Tage'} 🔥
                  </p>
                ) : (
                  <p className="text-sm font-semibold text-[#6B7280]">Morgen wieder einloggen!</p>
                )}
              </div>
              <Flame size={28} className={result.new_streak > 0 ? 'text-[#FF9600]' : 'text-[#4B5563]'} />
            </div>

            <ReminderOptInCard variant="result" className="mb-6" />
            <RoundReview questions={questions} outcomes={outcomes} />

            <div className="flex flex-col gap-3 w-full">
              <Button
                onClick={() => {
                  window.location.href = window.location.pathname + window.location.search
                }}
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

  // ── Frage ─────────────────────────────────────────────────────────────────
  const correctOption = outcome ? question.options.find((o) => o.id === outcome.correct_option_id) : undefined
  const proposal = question.form === 'true_false' ? question.options.find((o) => o.id === question.proposal_option_id) : undefined
  const jState = jokerState({
    joker,
    form: question.form,
    coinBalance: start.coin_balance,
    jokersUsed,
    usedOnThisQuestion: (jokerRemoved[index] ?? []).length > 0,
    isLastQuestion: isLast,
    answered: !!outcome || cur.pending,
  })
  const availableCoins = Math.max(0, start.coin_balance - coinsReserved)

  return (
    <div className="min-h-screen bg-[#111827] flex flex-col">
      <FeedbackFlash tone={flash.tone} flashKey={flash.key} />
      <WagerDialog
        open={wagerOpen}
        stake={wagerOffer?.stake ?? 0}
        pending={wagerPending}
        error={wagerError}
        onDecide={(accept) => void decideWager(accept)}
      />

      <header className="bg-[#1F2937] border-b border-[#4B5563] px-4 py-4 sticky top-0 z-10">
        <div className="max-w-md mx-auto">
          <div className="flex items-center justify-between mb-3">
            <Link href="/subjects" aria-label="Runde verlassen" className="text-[#9CA3AF] hover:text-[#F9FAFB] transition-colors">
              <ArrowLeft size={20} />
            </Link>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: subject.color }} aria-hidden="true" />
              <span className="text-sm font-medium text-[#9CA3AF]">{subject.code}</span>
              <span className="text-[#4B5563]">·</span>
              <span className="text-sm font-semibold text-[#F9FAFB]">
                Frage {index + 1}/{total}
              </span>
            </div>
            <span
              className="inline-flex items-center gap-1 rounded-full bg-[#FFD700]/15 px-2.5 py-1 text-xs font-semibold text-[#FFD700] tabular-nums"
              aria-label={`${availableCoins} Münzen`}
            >
              <Coins className="size-3.5" aria-hidden="true" />
              {availableCoins}
            </span>
          </div>
          <Progress
            value={(index / total) * 100}
            className="h-2 bg-[#374151] rounded-full [&>div]:bg-[#58CC02] [&>div]:transition-all [&>div]:duration-200"
          />
        </div>
      </header>

      <main className="max-w-md mx-auto w-full px-4 py-6 flex-1 flex flex-col">
        {totalAvailable < QUIZ_SIZE && index === 0 && (
          <div className="bg-[#1F2937] border border-[#FF9600]/60 rounded-xl px-4 py-3 mb-4 text-sm text-[#FF9600]">
            Nur {totalAvailable} {totalAvailable === 1 ? 'Frage' : 'Fragen'} für dieses Fach verfügbar.
          </div>
        )}

        {isLast && wagerAccepted && (
          <div className="mb-4 rounded-xl border border-[#FFD700]/50 bg-[#FFD700]/10 px-4 py-3 text-sm font-semibold text-[#FFD700]">
            Wette läuft: {wagerOffer?.stake} → {(wagerOffer?.stake ?? 0) * 2} Münzen
          </div>
        )}

        <div className="bg-[#1F2937] border border-[#4B5563] rounded-2xl p-5 mb-5">
          <div className="mb-3 flex flex-wrap items-start gap-2">
            {question.form === 'classic' ? (
              <span
                className={cn(
                  'text-xs font-medium px-2.5 py-1 rounded-full',
                  question.difficulty === 'leicht' && 'bg-[#58CC02]/20 text-[#58CC02]',
                  question.difficulty === 'mittel' && 'bg-[#FF9600]/20 text-[#FF9600]',
                  question.difficulty === 'schwer' && 'bg-[#FF4B4B]/20 text-[#FF4B4B]',
                )}
              >
                {question.difficulty.charAt(0).toUpperCase() + question.difficulty.slice(1)}
              </span>
            ) : (
              <FormBadge key={`${index}-${question.form}`} form={question.form} className="w-full" />
            )}
          </div>
          <p className="text-[#F9FAFB] text-base font-medium leading-relaxed">{question.question_text}</p>
        </div>

        {question.form === 'classic' && (
          <>
            <ChoiceOptions
              options={question.options}
              selectedId={cur.selectedId}
              pending={cur.pending}
              correctOptionId={outcome?.correct_option_id ?? null}
              removedIds={jokerRemoved[index]}
              onSelect={answerChoice}
            />
            <div className="mt-3">
              <JokerButton state={jState} price={joker.price} pending={jokerPending} onUse={() => void applyJoker()} />
              {jokerError && (
                <p role="alert" className="mt-2 text-right text-sm text-[#FF4B4B]">
                  {jokerError}
                </p>
              )}
            </div>
          </>
        )}

        {question.form === 'true_false' && proposal && (
          <TrueFalseCard
            key={index}
            proposalText={proposal.option_text}
            onAnswer={answerTrueFalse}
            pending={cur.pending}
            saidTrue={cur.saidTrue}
            result={outcome ? { correct: outcome.correct, proposalWasCorrect: proposal.id === outcome.correct_option_id } : null}
            keyboard={!wagerOpen}
          />
        )}

        {question.form === 'eliminate' && (
          <EliminateOptions
            options={question.options}
            eliminatedIds={cur.eliminatedIds}
            keptIds={cur.keptIds}
            heartsLeft={cur.heartsLeft}
            pendingId={cur.pendingEliminateId}
            correctOptionId={outcome?.correct_option_id ?? null}
            lastHeartLostId={cur.lastHeartLostId}
            onTap={tapEliminate}
          />
        )}

        {retry && (
          <div role="alert" className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-[#FF4B4B]/50 bg-[#FF4B4B]/10 px-4 py-3">
            <span className="text-sm text-[#F9FAFB]">Verbindung hakt – Antwort nicht angekommen.</span>
            <Button
              type="button"
              onClick={retry}
              className="min-h-11 rounded-xl bg-[#FF4B4B] hover:bg-[#e04040] text-white font-semibold"
            >
              Nochmal versuchen
            </Button>
          </div>
        )}

        {outcome && (
          <div className="mt-auto pt-5">
            <div
              aria-live="polite"
              className={cn(
                'rounded-2xl p-4 mb-4 border',
                outcome.correct ? 'bg-[#58CC02]/10 border-[#58CC02]' : 'bg-[#FF4B4B]/10 border-[#FF4B4B]',
              )}
            >
              <div className="flex items-center gap-2 mb-1">
                {outcome.correct ? (
                  <CheckCircle2 size={18} className="text-[#58CC02]" aria-hidden="true" />
                ) : (
                  <XCircle size={18} className="text-[#FF4B4B]" aria-hidden="true" />
                )}
                <span className={cn('font-bold text-sm', outcome.correct ? 'text-[#58CC02]' : 'text-[#FF4B4B]')}>
                  {feedbackTitle(outcome)}
                </span>
              </div>
              {feedbackDetail(outcome, proposal?.id, correctOption?.option_text) && (
                <p className="text-sm text-[#F9FAFB] mt-1">{feedbackDetail(outcome, proposal?.id, correctOption?.option_text)}</p>
              )}
              {outcome.explanation ? (
                <p className="text-[#9CA3AF] text-sm leading-relaxed mt-1">{outcome.explanation}</p>
              ) : (
                <p className="text-[#6B7280] text-xs mt-1 italic">Noch keine Erklärung hinterlegt.</p>
              )}
            </div>

            <div className="mb-2 flex justify-end">
              <ReportQuestionButton
                key={question.id}
                questionId={question.id}
                // Die Meldung gilt der Frage, nicht dem Vorschlag einer Variante
                selectedOptionId={question.form === 'classic' ? cur.selectedId : null}
              />
            </div>

            <Button
              onClick={handleNext}
              className={cn(
                'w-full rounded-2xl font-bold text-base py-6 transition-all duration-200 active:scale-95 text-white',
                outcome.correct ? 'bg-[#58CC02] hover:bg-[#4CAD02]' : 'bg-[#FF4B4B] hover:bg-[#e04040]',
              )}
            >
              {isLast ? 'Ergebnisse anzeigen' : 'Weiter'}
            </Button>
          </div>
        )}

        {/* Für Screenreader: Stand der Runde */}
        <p className="sr-only" aria-live="polite">
          {correctCount} von {Object.keys(outcomes).length} richtig
        </p>
      </main>
    </div>
  )
}

function feedbackTitle(o: QuestionOutcome): string {
  if (o.form === 'true_false') return o.correct ? 'Richtig eingeschätzt!' : 'Leider daneben!'
  if (o.form === 'eliminate') {
    if (!o.correct) return 'Die richtige rausgeworfen!'
    return (o.mistakes ?? 0) === 0 ? 'Sauber rausgeworfen!' : 'Geschafft – mit einem Fehlgriff'
  }
  return o.correct ? 'Richtig!' : 'Leider falsch!'
}

function feedbackDetail(o: QuestionOutcome, proposalId: string | undefined, correctText: string | undefined): string | null {
  if (o.form === 'true_false') {
    if (proposalId === o.correct_option_id) return 'Die Antwort stimmt.'
    return correctText ? `Die Antwort stimmt nicht. Richtig ist: ${correctText}` : 'Die Antwort stimmt nicht.'
  }
  if (!o.correct && correctText) return `Richtig ist: ${correctText}`
  return null
}

function CenteredMessage({
  icon,
  title,
  text,
  action,
}: {
  icon: React.ReactNode
  title: string
  text: string
  action: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-[#111827] flex flex-col items-center justify-center px-4 text-center">
      <div className="mb-6">{icon}</div>
      <h1 className="text-2xl font-bold text-[#F9FAFB] mb-3">{title}</h1>
      {text && <p className="text-[#9CA3AF] mb-8 leading-relaxed max-w-sm">{text}</p>}
      {action && <div className="w-full max-w-xs">{action}</div>}
    </div>
  )
}
