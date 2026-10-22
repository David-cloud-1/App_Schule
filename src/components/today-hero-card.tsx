import Link from 'next/link'
import { BookOpen, Play, Target } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DAILY_GOAL } from '@/lib/home-today'

interface TodayHeroCardProps {
  answeredToday: number
  level: number
  levelPercent: number
  xpToNextLevel: number
  isMaxLevel: boolean
  /** Ziel für „Weiterlernen“; null → „Fach auswählen“ */
  continueTarget: { href: string; label: string } | null
}

/** Die eine Hauptfläche des „Heute“-Screens (PROJ-42): Tagesziel, Level, Weiterlernen. */
export function TodayHeroCard({
  answeredToday,
  level,
  levelPercent,
  xpToNextLevel,
  isMaxLevel,
  continueTarget,
}: TodayHeroCardProps) {
  const goalReached = answeredToday >= DAILY_GOAL
  const goalPercent = Math.min(100, Math.round((answeredToday / DAILY_GOAL) * 100))

  return (
    <section
      aria-label="Tagesziel"
      className="relative overflow-hidden rounded-3xl border border-[#4B5563] bg-gradient-to-br from-[#1F2937] to-[#18212F] p-5 shadow-lg"
    >
      <div className="pointer-events-none absolute -top-10 -right-10 h-36 w-36 rounded-full bg-[#58CC02]/10 blur-2xl" />

      {/* Tagesziel */}
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[#9CA3AF]">Tagesziel</p>
          <p className="mt-1 text-2xl font-bold tracking-tight text-[#F9FAFB]">
            {goalReached ? 'Geschafft! 🎉' : `${answeredToday}/${DAILY_GOAL} Fragen`}
          </p>
        </div>
        {goalReached ? (
          <span className="text-sm font-semibold text-[#58CC02] tabular-nums">
            {answeredToday}/{DAILY_GOAL}
          </span>
        ) : (
          <Target className="size-6 text-[#58CC02]" aria-hidden />
        )}
      </div>
      <div
        role="progressbar"
        aria-label="Fortschritt Tagesziel"
        aria-valuemin={0}
        aria-valuemax={DAILY_GOAL}
        aria-valuenow={Math.min(answeredToday, DAILY_GOAL)}
        className="mt-3 h-3 overflow-hidden rounded-full bg-[#374151]"
      >
        <div
          className="relative h-full rounded-full bg-[#58CC02] transition-all duration-700 ease-out"
          style={{ width: `${goalPercent}%` }}
        >
          <div className="absolute inset-0 rounded-full bg-white/10" />
        </div>
      </div>

      {/* Level */}
      <div className="mt-4 flex items-center gap-3">
        <span className="shrink-0 rounded-full bg-[#58CC02]/15 px-2.5 py-0.5 text-xs font-bold text-[#58CC02]">
          Lvl {level}
        </span>
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#374151]">
          <div className="h-full rounded-full bg-[#1CB0F6]" style={{ width: `${levelPercent}%` }} />
        </div>
        <span className="shrink-0 text-xs text-[#9CA3AF] tabular-nums">
          {isMaxLevel ? 'Max-Level erreicht' : `noch ${xpToNextLevel} XP → Lvl ${level + 1}`}
        </span>
      </div>

      {/* Hauptaktion */}
      <Link href={continueTarget?.href ?? '/subjects'} className="mt-5 block">
        <Button className="w-full rounded-2xl bg-[#58CC02] py-6 text-base font-bold text-white shadow-lg shadow-green-900/30 transition-all duration-200 hover:bg-[#4CAD02] active:scale-95">
          {continueTarget ? <Play className="mr-1 size-5 fill-current" /> : <BookOpen className="mr-1 size-5" />}
          {continueTarget ? 'Weiterlernen' : 'Fach auswählen'}
        </Button>
      </Link>
      {continueTarget && (
        <p className="mt-2 truncate text-center text-xs text-[#9CA3AF]">{continueTarget.label}</p>
      )}
    </section>
  )
}
