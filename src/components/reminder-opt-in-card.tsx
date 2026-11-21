'use client'

import { useState } from 'react'
import { BellRing, Share, SquarePlus, Smartphone, CheckCircle2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { usePushReminder } from '@/hooks/use-push-reminder'
import { REMINDER_DAYS_LABEL, REMINDER_HOUR, shouldShowOptInCard } from '@/lib/push-client'
import { cn } from '@/lib/utils'

interface ReminderOptInCardProps {
  /**
   * `result`: Ergebnis-Bildschirm nach einer Runde (Spec: nach der ersten Runde).
   * `home`: „Heute“-Screen, damit die Einrichtung im Unterricht gleich am
   * Anmeldetag klappt (Nachtrag 6).
   */
  variant: 'result' | 'home'
  className?: string
}

type Outcome = 'enabled' | 'denied' | 'error' | 'dismissed' | null

/**
 * Opt-in-Karte „Erinnert werden?“ (PROJ-18). Erscheint, bis sich der
 * Schüler entschieden hat. Der Browser fragt erst nach dem Tippen auf „Ja“.
 */
export function ReminderOptInCard({ variant, className }: ReminderOptInCardProps) {
  const reminder = usePushReminder()
  const [outcome, setOutcome] = useState<Outcome>(null)

  if (reminder.loading || !reminder.server) return null

  // Rückmeldung nach einer Entscheidung in dieser Karte
  if (outcome === 'enabled') {
    return (
      <Shell className={className} tone="green">
        <div className="flex items-center gap-3" role="status">
          <CheckCircle2 className="size-6 shrink-0 text-[#58CC02]" />
          <p className="text-sm text-[#F9FAFB]">
            Erinnerung ist an. Wir melden uns {REMINDER_DAYS_LABEL} um {REMINDER_HOUR} Uhr, aber nur, wenn du an dem Tag noch nicht gelernt hast.
          </p>
        </div>
      </Shell>
    )
  }
  if (outcome === 'denied') {
    return (
      <Shell className={className}>
        <p className="text-sm text-[#9CA3AF]" role="status">
          Dein Browser hat Benachrichtigungen blockiert. Wir fragen nicht noch einmal. Falls du es dir anders überlegst,
          erlaube Benachrichtigungen für diese Seite in den Einstellungen deines Handys und schalte die Erinnerung dann im
          Profil ein.
        </p>
      </Shell>
    )
  }
  if (outcome === 'dismissed') return null

  if (!shouldShowOptInCard(reminder.server, new Date())) return null
  if (reminder.support === 'unsupported') return null
  // Bereits blockiert: ein Knopf würde nichts bewirken — das Profil erklärt den Weg
  if (reminder.permission === 'denied') return null

  async function handleYes() {
    const result = await reminder.enable()
    setOutcome(result)
  }

  async function handleNo() {
    setOutcome('dismissed')
    await reminder.decline()
  }

  const title = variant === 'home' ? 'Erinnerung einrichten' : 'Erinnert werden?'

  // iPhone/iPad in Safari: erst zum Home-Bildschirm hinzufügen
  if (reminder.support === 'ios-install-needed') {
    return (
      <Shell className={className}>
        <Header title={title} />
        <p className="mt-1 text-sm text-[#9CA3AF]">
          Auf dem iPhone geht das nur, wenn die App auf deinem Home-Bildschirm liegt. So geht&apos;s:
        </p>
        <ol className="mt-4 space-y-3">
          <Step n={1} icon={<Share className="size-5 text-[#1CB0F6]" aria-hidden />}>
            Unten in Safari auf <strong className="text-[#F9FAFB]">Teilen</strong> tippen
          </Step>
          <Step n={2} icon={<SquarePlus className="size-5 text-[#1CB0F6]" aria-hidden />}>
            <strong className="text-[#F9FAFB]">Zum Home-Bildschirm</strong> wählen
          </Step>
          <Step n={3} icon={<Smartphone className="size-5 text-[#1CB0F6]" aria-hidden />}>
            Die App über das neue Symbol öffnen und hier auf <strong className="text-[#F9FAFB]">Ja</strong> tippen
          </Step>
        </ol>
        <div className="mt-4 flex justify-end">
          <Button
            variant="ghost"
            onClick={handleNo}
            className="min-h-11 rounded-2xl text-[#9CA3AF] hover:bg-[#374151] hover:text-[#F9FAFB]"
          >
            Nein danke
          </Button>
        </div>
      </Shell>
    )
  }

  return (
    <Shell className={className}>
      <Header title={title} />
      <p className="mt-1 text-sm text-[#9CA3AF]">
        Höchstens zweimal pro Woche eine kurze Meldung ({REMINDER_DAYS_LABEL} um {REMINDER_HOUR} Uhr), nur wenn du an
        dem Tag noch nicht gelernt hast. Im Profil jederzeit abschaltbar.
      </p>
      {outcome === 'error' && (
        <p className="mt-2 text-sm text-[#FF4B4B]" role="alert">
          Das hat nicht geklappt. Versuch es bitte gleich noch einmal.
        </p>
      )}
      <div className="mt-4 grid grid-cols-2 gap-3">
        <Button
          variant="outline"
          onClick={handleNo}
          disabled={reminder.busy}
          className="min-h-11 rounded-2xl border-[#4B5563] bg-transparent font-semibold text-[#9CA3AF] hover:bg-[#374151] hover:text-[#F9FAFB]"
        >
          Nein danke
        </Button>
        <Button
          onClick={handleYes}
          disabled={reminder.busy}
          className="min-h-11 rounded-2xl bg-[#58CC02] font-bold text-white transition-all duration-200 hover:bg-[#4CAD02] active:scale-95"
        >
          {reminder.busy ? <Loader2 className="size-5 animate-spin" aria-label="Wird eingerichtet" /> : "Ja, bitte"}
        </Button>
      </div>
    </Shell>
  )
}

function Shell({ children, className, tone = 'blue' }: { children: React.ReactNode; className?: string; tone?: 'blue' | 'green' }) {
  return (
    <section
      aria-label="Erinnerung"
      className={cn(
        'w-full rounded-2xl border bg-[#1F2937] p-4 text-left shadow-lg',
        tone === 'green' ? 'border-[#58CC02]/40' : 'border-[#1CB0F6]/40',
        className,
      )}
    >
      {children}
    </section>
  )
}

function Header({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#1CB0F6]/15">
        <BellRing className="size-5 text-[#1CB0F6]" aria-hidden />
      </span>
      <h2 className="text-base font-bold text-[#F9FAFB]">{title}</h2>
    </div>
  )
}

function Step({ n, icon, children }: { n: number; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-3 text-sm text-[#9CA3AF]">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#374151]">{icon}</span>
      <span>
        <span className="sr-only">Schritt {n}: </span>
        {children}
      </span>
    </li>
  )
}
