'use client'

import { Monitor, Moon, Palette, Sun } from 'lucide-react'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { KontoCard } from '@/components/admin/konto-card'
import { useWorkspace } from '@/components/admin/workspace-provider'
import { LeaderboardOptOutToggle } from '@/components/leaderboard-opt-out-toggle'
import { PseudonymSettings } from '@/components/pseudonym-settings'
import { parseWorkspaceTheme, WORKSPACE_THEME_LABEL, WORKSPACE_THEMES } from '@/lib/workspace-theme'
import type { KontoSettings } from '@/lib/konto-data'

const THEME_ICON = { dark: Moon, light: Sun, system: Monitor } as const

/**
 * Karte „Darstellung & Rangliste“: Dunkel/Hell/System (derselbe Wert wie im
 * Konto-Menü — beide lesen und schreiben den gemeinsamen Zustand des Rahmens),
 * Pseudonym und Teilnahme an der Rangliste.
 */
export function KontoDarstellung({ settings }: { settings: KontoSettings }) {
  const { theme, setTheme } = useWorkspace()

  return (
    <KontoCard id="darstellung" icon={Palette} title="Darstellung & Rangliste">
      <div className="space-y-2">
        <p id="konto-theme-label" className="text-sm font-medium text-ws-text">
          Darstellung
        </p>
        <ToggleGroup
          type="single"
          value={theme}
          // Ein erneuter Klick auf die aktive Option liefert '' — dann bleibt die Wahl bestehen
          onValueChange={(value) => value && setTheme(parseWorkspaceTheme(value))}
          aria-labelledby="konto-theme-label"
          className="grid grid-cols-3 gap-2"
        >
          {WORKSPACE_THEMES.map((option) => {
            const Icon = THEME_ICON[option]
            return (
              <ToggleGroupItem
                key={option}
                value={option}
                className="min-h-11 gap-2 rounded-xl border border-ws-line bg-transparent text-ws-text hover:bg-ws-raised hover:text-ws-text focus-visible:ring-ws-green data-[state=on]:border-ws-green data-[state=on]:bg-ws-green/15 data-[state=on]:text-ws-text"
              >
                <Icon aria-hidden className="size-4" />
                {WORKSPACE_THEME_LABEL[option]}
              </ToggleGroupItem>
            )
          })}
        </ToggleGroup>
      </div>

      <div className="space-y-4 border-t border-ws-line pt-4">
        <PseudonymSettings initialPseudonym={settings.pseudonym} initialShowRealName={false} pseudonymOnly workspace />
        <LeaderboardOptOutToggle
          initialOptOut={settings.leaderboardOptOut}
          workspace
          hints={{
            visible: 'Alle sehen dich unter deinem Fantasienamen in der Rangliste',
            hidden: 'Du bist versteckt (nur du siehst deine Position)',
          }}
        />
      </div>
    </KontoCard>
  )
}
