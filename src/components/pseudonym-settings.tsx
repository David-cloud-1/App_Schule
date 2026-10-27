'use client'

import { useState } from 'react'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { RefreshCw, User, Ghost } from 'lucide-react'
import { toast } from 'sonner'

interface PseudonymSettingsProps {
  initialPseudonym: string
  initialShowRealName: boolean
  /**
   * Lehrer-Rollen erscheinen in der Rangliste immer unter Pseudonym (PROJ-44):
   * dann gibt es keinen Klarnamen-Schalter, nur einen kurzen Hinweis.
   */
  pseudonymOnly?: boolean
  /** Farben des Lehrkräfte-Bereichs (`ws-*`, hell/dunkel) statt der festen Spieler-Farben (PROJ-50) */
  workspace?: boolean
}

const PLAYER = {
  box: 'bg-[#374151]',
  accent: 'text-[#1CB0F6]',
  accentBtn: 'text-[#1CB0F6] hover:text-[#1CB0F6] hover:bg-[#1CB0F6]/10',
  muted: 'text-[#9CA3AF]',
  text: 'text-[#F9FAFB]',
  switchOn: 'data-[state=checked]:bg-[#58CC02]',
}

const WS = {
  box: 'bg-ws-raised',
  accent: 'text-ws-blue',
  accentBtn: 'text-ws-blue hover:text-ws-blue hover:bg-ws-blue/10',
  muted: 'text-ws-muted',
  text: 'text-ws-text',
  switchOn: 'data-[state=checked]:bg-ws-green',
}

export function PseudonymSettings({ initialPseudonym, initialShowRealName, pseudonymOnly = false, workspace = false }: PseudonymSettingsProps) {
  const c = workspace ? WS : PLAYER
  const [pseudonym, setPseudonym] = useState(initialPseudonym)
  const [showRealNameSetting, setShowRealName] = useState(initialShowRealName)
  const showRealName = !pseudonymOnly && showRealNameSetting
  const [rerolling, setRerolling] = useState(false)
  const [savingToggle, setSavingToggle] = useState(false)

  async function handleReroll() {
    setRerolling(true)
    try {
      const res = await fetch('/api/profile/pseudonym', { method: 'POST' })
      if (!res.ok) {
        toast.error('Konnte keinen neuen Namen generieren.')
        return
      }
      const { pseudonym: newName } = await res.json()
      setPseudonym(newName)
      toast.success(`Neuer Name: ${newName}`)
    } catch {
      toast.error('Fehler beim Generieren des Namens.')
    } finally {
      setRerolling(false)
    }
  }

  async function handleToggle(checked: boolean) {
    setSavingToggle(true)
    try {
      const res = await fetch('/api/profile/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ show_real_name: checked }),
      })
      if (!res.ok) {
        toast.error('Einstellung konnte nicht gespeichert werden.')
        return
      }
      setShowRealName(checked)
    } catch {
      toast.error('Einstellung konnte nicht gespeichert werden.')
    } finally {
      setSavingToggle(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Pseudonym display */}
      <div className={`${c.box} rounded-xl px-4 py-3 flex items-center justify-between gap-3`}>
        <div className="flex items-center gap-2 min-w-0">
          <Ghost size={16} className={`${c.accent} flex-shrink-0`} />
          <div className="min-w-0">
            <p className={`text-xs ${c.muted}`}>Dein Fantasiename</p>
            <p className={`text-sm font-semibold ${c.text} truncate`}>{pseudonym}</p>
          </div>
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={handleReroll}
          disabled={rerolling || showRealName}
          className={`h-8 px-3 ${c.accentBtn} flex-shrink-0 disabled:opacity-40`}
        >
          <RefreshCw size={14} className={rerolling ? 'animate-spin' : ''} />
          <span className="ml-1.5 text-xs">Neu würfeln</span>
        </Button>
      </div>

      {pseudonymOnly ? (
        <p className={`flex items-start gap-2 text-xs ${c.muted}`}>
          <User size={16} className={`mt-px ${c.muted} flex-shrink-0`} />
          In der Rangliste erscheinst du immer unter deinem Fantasienamen.
        </p>
      ) : (
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <User size={16} className={`${c.muted} flex-shrink-0`} />
            <div>
              <Label htmlFor="show-real-name" className={`text-sm font-medium ${c.text} cursor-pointer`}>
                Mit Klarnamen erscheinen
              </Label>
              <p className={`text-xs ${c.muted}`}>
                {showRealName
                  ? 'Dein echter Name ist in der Rangliste sichtbar'
                  : 'Dein Fantasiename wird in der Rangliste angezeigt'}
              </p>
            </div>
          </div>
          <Switch
            id="show-real-name"
            checked={showRealName}
            onCheckedChange={handleToggle}
            disabled={savingToggle}
            className={c.switchOn}
          />
        </div>
      )}
    </div>
  )
}
