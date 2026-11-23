'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Check, Coins, Flame, Loader2, Trophy, X, XCircle, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ChoiceOptions } from '@/components/quiz-round/choice-options'
import { TrueFalseCard } from '@/components/quiz-round/true-false-card'
import { FormBadge } from '@/components/quiz-round/form-badge'
import { FeedbackFlash } from '@/components/quiz-round/feedback-flash'
import { finishBlitzRound, sendRoundAnswer, startBlitzRound } from '@/lib/quiz-round-api'
import { BLITZ_SECONDS, blitzPoints, type BlitzRoundResult, type BlitzRoundStart, type RoundAnswerRequest } from '@/lib/quiz-round'
import { cn } from '@/lib/utils'

type Phase = 'loading' | 'unavailable' | 'error' | 'active' | 'finishing' | 'finish_error' | 'summary'

/** Wie lange beim Abrechnen höchstens auf noch laufende Antworten gewartet wird */
const SETTLE_TIMEOUT_MS = 3000

/**
 * Blitzrunde mit Rundenzettel (PROJ-129). Nach dem Tippen kommt sofort die
 * nächste Karte; ob die vorige Antwort stimmte, zeigt kurz darauf ein Flash am
 * Rand und der Punktestand. Gewertet wird nur auf dem Server.
 */
export function BlitzRoundClient() {
  const [phase, setPhase] = useState<Phase>('loading')
  const [round, setRound] = useState<BlitzRoundStart | null>(null)
  const [index, setIndex] = useState(0)
  const [timeLeft, setTimeLeft] = useState(BLITZ_SECONDS)
  const [correct, setCorrect] = useState(0)
  const [wrong, setWrong] = useState(0)
  const [flash, setFlash] = useState<{ tone: 'correct' | 'wrong' | null; key: number }>({ tone: null, key: 0 })
  const [result, setResult] = useState<BlitzRoundResult | null>(null)

  const inFlight = useRef<Promise<unknown>[]>([])
  const finishedRef = useRef(false)
  const finishingRef = useRef(false)

  // ── Start ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false
    startBlitzRound().then((res) => {
      if (cancelled) return
      if (!res.ok) {
        setPhase(res.status === 409 ? 'unavailable' : 'error')
        return
      }
      setRound(res.data)
      setTimeLeft(res.data.seconds || BLITZ_SECONDS)
      setPhase('active')
    })
    return () => {
      cancelled = true
    }
  }, [])

  const doFinish = useCallback(async () => {
    if (!round || finishingRef.current) return
    finishingRef.current = true
    finishedRef.current = true
    setPhase('finishing')
    // Noch unterwegs befindliche Antworten abwarten, aber nicht ewig
    await Promise.race([
      Promise.allSettled(inFlight.current),
      new Promise((resolve) => setTimeout(resolve, SETTLE_TIMEOUT_MS)),
    ])
    const res = await finishBlitzRound(round.round_id)
    if (!res.ok) {
      finishingRef.current = false
      setPhase(res.status === 409 ? 'unavailable' : 'finish_error')
      return
    }
    setResult(res.data)
    setPhase('summary')
  }, [round])

  // ── Uhr ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'active') return
    const id = setTimeout(() => {
      if (timeLeft <= 1) {
        setTimeLeft(0)
        void doFinish()
      } else {
        setTimeLeft(timeLeft - 1)
      }
    }, 1000)
    return () => clearTimeout(id)
  }, [phase, timeLeft, doFinish])

  const answer = useCallback(
    (req: RoundAnswerRequest) => {
      if (!round || finishedRef.current) return
      const p = sendRoundAnswer(round.round_id, req).then((res) => {
        if (!res.ok || res.data.status !== 'resolved') return
        const ok = res.data.correct
        if (ok) setCorrect((c) => c + 1)
        else setWrong((w) => w + 1)
        setFlash((f) => ({ tone: ok ? 'correct' : 'wrong', key: f.key + 1 }))
      })
      inFlight.current.push(p)
      const next = req.question_index + 1
      if (next >= round.questions.length) {
        // Alle Karten geschafft – vor Ablauf der Zeit abrechnen
        void doFinish()
      } else {
        setIndex(next)
      }
    },
    [round, doFinish],
  )

  const answerTrueFalse = useCallback(
    (saysTrue: boolean) => answer({ kind: 'true_false', question_index: index, says_true: saysTrue }),
    [answer, index],
  )

  // ── Zustände ohne Runde ───────────────────────────────────────────────────
  if (phase === 'loading') {
    return (
      <div className="min-h-screen bg-[#111827] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#FFD700] animate-spin" aria-label="Blitzrunde wird geladen" />
      </div>
    )
  }

  if (phase === 'unavailable') {
    return (
      <Message
        icon={<Zap size={64} className="text-[#FFD700]" />}
        title="Heute schon erledigt!"
        text="Die Blitzrunde ist einmal pro Tag verfügbar. Komm morgen wieder für die nächste Runde."
        action={
          <Link href="/">
            <Button className="w-full rounded-2xl bg-[#58CC02] hover:bg-[#4CAD02] text-white font-bold py-6">Zur Startseite</Button>
          </Link>
        }
      />
    )
  }

  if (phase === 'error' || phase === 'finish_error') {
    return (
      <Message
        icon={<XCircle size={64} className="text-[#FF4B4B]" />}
        title="Etwas ist schiefgelaufen"
        text={
          phase === 'error'
            ? 'Die Blitzrunde konnte nicht gestartet werden. Versuch es gleich noch einmal.'
            : 'Das Ergebnis konnte nicht gespeichert werden. Prüfe deine Verbindung.'
        }
        action={
          phase === 'finish_error' ? (
            <Button
              onClick={() => void doFinish()}
              className="w-full rounded-2xl bg-[#58CC02] hover:bg-[#4CAD02] text-white font-bold py-6"
            >
              Erneut versuchen
            </Button>
          ) : (
            <Link href="/">
              <Button variant="outline" className="w-full rounded-2xl border-[#4B5563] text-[#9CA3AF] py-6">
                Zur Startseite
              </Button>
            </Link>
          )
        }
      />
    )
  }

  // ── Ergebnis ──────────────────────────────────────────────────────────────
  if (phase === 'summary' && result) {
    const isTf = result.form === 'true_false'
    return (
      <div className="min-h-screen bg-[#111827] flex flex-col">
        <header className="bg-[#1F2937] border-b border-[#4B5563] px-4 py-4">
          <div className="max-w-md mx-auto flex items-center">
            <span className="font-semibold text-[#F9FAFB]">Blitzrunde — Ergebnis</span>
          </div>
        </header>
        <main className="max-w-md mx-auto px-4 py-8 flex-1 flex flex-col items-center justify-center w-full">
          <div className="text-center mb-6">
            <Zap size={64} className="text-[#FFD700] mx-auto mb-4" />
            <p className="text-[#9CA3AF] text-sm mb-2">{isTf ? 'Punkte' : 'Richtige Antworten'}</p>
            <p className="text-6xl font-bold text-[#F9FAFB]" data-testid="blitz-points">
              {result.points}
            </p>
            {isTf && (
              <p className="text-sm text-[#9CA3AF] mt-2">
                {result.correct_count} richtig − {result.wrong_count} falsch
              </p>
            )}
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

  // ── Laufende Runde ───────────────────────────────────────────────────────
  const question = round?.questions[index] ?? null
  const isTf = round?.form === 'true_false'
  const proposal = question && isTf ? question.options.find((o) => o.id === question.proposal_option_id) : undefined
  const total = round?.seconds || BLITZ_SECONDS

  return (
    <div className="min-h-screen bg-[#111827] flex flex-col">
      <FeedbackFlash tone={flash.tone} flashKey={flash.key} variant="edge" />
      <header className="bg-[#1F2937] border-b border-[#4B5563] px-4 py-4 sticky top-0 z-10">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <Link href="/" aria-label="Blitzrunde verlassen" className="text-[#9CA3AF] hover:text-[#F9FAFB] transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <div
            className={cn('flex items-center gap-1.5 font-bold text-lg tabular-nums', timeLeft <= 10 ? 'text-[#FF4B4B]' : 'text-[#FFD700]')}
            aria-label={`${timeLeft} Sekunden übrig`}
          >
            <Zap size={18} aria-hidden="true" />
            {timeLeft}s
          </div>
          <div className="flex items-center gap-2 text-sm font-semibold tabular-nums" aria-live="polite">
            <span className="inline-flex items-center gap-0.5 text-[#58CC02]" aria-label={`${correct} richtig`}>
              <Check className="size-4" aria-hidden="true" />
              {correct}
            </span>
            {isTf && (
              <span className="inline-flex items-center gap-0.5 text-[#FF4B4B]" aria-label={`${wrong} falsch`}>
                <X className="size-4" aria-hidden="true" />
                {wrong}
              </span>
            )}
          </div>
        </div>
        <div className="max-w-md mx-auto mt-2 h-2 bg-[#374151] rounded-full overflow-hidden">
          <div
            className={cn('h-full rounded-full transition-all duration-1000 ease-linear', timeLeft <= 10 ? 'bg-[#FF4B4B]' : 'bg-[#FFD700]')}
            style={{ width: `${(timeLeft / total) * 100}%` }}
          />
        </div>
        {isTf && (
          <p className="max-w-md mx-auto mt-2 text-center text-xs text-[#9CA3AF]">
            Punkte: <span className="font-semibold text-[#F9FAFB]">{blitzPoints('true_false', correct, wrong)}</span> · Fehler ziehen
            einen Punkt ab
          </p>
        )}
      </header>

      <main className="max-w-md mx-auto px-4 py-6 flex-1 flex flex-col w-full">
        {phase === 'finishing' || !question ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-[#FFD700] animate-spin" aria-label="Wird abgerechnet" />
          </div>
        ) : (
          <>
            {isTf && <FormBadge form="true_false" className="mb-3" />}
            <div className="bg-[#1F2937] border border-[#4B5563] rounded-2xl p-5 mb-5">
              <p className="text-[#F9FAFB] text-base font-medium leading-relaxed">{question.question_text}</p>
            </div>

            {isTf && proposal ? (
              <TrueFalseCard
                key={question.index}
                proposalText={proposal.option_text}
                onAnswer={answerTrueFalse}
                pending={false}
                saidTrue={null}
                result={null}
              />
            ) : (
              <ChoiceOptions
                key={question.index}
                options={question.options}
                selectedId={null}
                pending={false}
                correctOptionId={null}
                onSelect={(optionId) => answer({ kind: 'choice', question_index: index, option_id: optionId })}
              />
            )}
          </>
        )}
      </main>
    </div>
  )
}

function Message({ icon, title, text, action }: { icon: React.ReactNode; title: string; text: string; action: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#111827] flex flex-col items-center justify-center px-4 text-center">
      <div className="mb-6">{icon}</div>
      <h1 className="text-2xl font-bold text-[#F9FAFB] mb-3">{title}</h1>
      <p className="text-[#9CA3AF] mb-8 leading-relaxed max-w-sm">{text}</p>
      <div className="w-full max-w-xs">{action}</div>
    </div>
  )
}
