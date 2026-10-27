'use client'

import { useSyncExternalStore } from 'react'
import Link from 'next/link'
import { ChevronDown, Flame, Gamepad2 } from 'lucide-react'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Progress } from '@/components/ui/progress'
import { getLevelFromXp, getProgressPercent, getXpCostOfLevel, getXpWithinLevel, MAX_LEVEL } from '@/lib/xp-utils'
import type { KontoSpiel } from '@/lib/konto-data'

const STORAGE_KEY = 'ws_konto_spielstand_offen'

/** Gemerkt wird pro Gerät im Browser; ist das Speichern gesperrt, bleibt der Bereich zugeklappt */
function readOpen(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

/** Hält die Wahl auch dann, wenn das Speichern gesperrt ist (gilt dann bis zum Neuladen) */
let fallbackOpen: boolean | null = null
const listeners = new Set<() => void>()

function writeOpen(open: boolean) {
  fallbackOpen = open
  try {
    window.localStorage.setItem(STORAGE_KEY, open ? '1' : '0')
  } catch {
    // Speicher gesperrt (privates Fenster): fallbackOpen trägt die Wahl
  }
  listeners.forEach((notify) => notify())
}

function subscribe(notify: () => void) {
  listeners.add(notify)
  return () => {
    listeners.delete(notify)
  }
}

const getSnapshot = () => fallbackOpen ?? readOpen()
// Auf dem Server und beim ersten Hydrieren zugeklappt, damit beide Ausgaben übereinstimmen
const getServerSnapshot = () => false

/**
 * Aufklappbarer Bereich „Mein Spielstand“ (PROJ-50): zugeklappt eine Zeile mit
 * Level, XP und Streak; aufgeklappt Fortschrittsbalken und Links ins Spiel.
 */
export function KontoSpielstand({ spiel }: { spiel: KontoSpiel }) {
  const open = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  const level = getLevelFromXp(spiel.totalXp)
  const atMax = level >= MAX_LEVEL

  return (
    <Collapsible
      open={open}
      onOpenChange={writeOpen}
      className="rounded-2xl border border-ws-line bg-ws-surface"
    >
      <CollapsibleTrigger className="flex min-h-14 w-full items-center gap-3 rounded-2xl px-5 py-3 text-left transition-colors duration-200 hover:bg-ws-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ws-green">
        <span aria-hidden className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-ws-raised text-ws-muted">
          <Gamepad2 className="size-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-base font-semibold text-ws-text">Mein Spielstand</span>
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ws-muted">
            <span className="rounded-full border border-ws-green/30 bg-ws-green/15 px-2 py-0.5 text-xs font-bold text-ws-green">Lvl {level}</span>
            <span>{spiel.totalXp.toLocaleString('de-DE')} XP</span>
            <span className="inline-flex items-center gap-1">
              <Flame aria-hidden className="size-4 text-ws-orange" />
              <span className="sr-only">Streak:</span>
              {spiel.streak}
            </span>
          </span>
        </span>
        <ChevronDown aria-hidden className={`size-5 shrink-0 text-ws-muted transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-4 px-5 pb-5">
        <div>
          <Progress
            value={getProgressPercent(spiel.totalXp)}
            aria-label="Fortschritt zum nächsten Level"
            className="h-2 bg-ws-raised [&>div]:bg-ws-green"
          />
          <p className="mt-1 text-right text-xs text-ws-muted">
            {atMax ? 'Höchstes Level erreicht' : `${getXpWithinLevel(spiel.totalXp)} / ${getXpCostOfLevel(level)} XP bis Level ${level + 1}`}
          </p>
        </div>
        <div className="flex flex-wrap gap-x-5">
          <Link
            href="/betrieb"
            className="inline-flex min-h-11 items-center text-sm font-medium text-ws-blue hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ws-green"
          >
            Mein Betrieb
          </Link>
          <Link
            href="/profile"
            className="inline-flex min-h-11 items-center text-sm font-medium text-ws-blue hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ws-green"
          >
            Zum Spielerprofil
          </Link>
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}
