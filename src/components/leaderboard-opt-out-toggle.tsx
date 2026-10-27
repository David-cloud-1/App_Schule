'use client'

import { useState } from 'react'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { EyeOff } from 'lucide-react'
import { toast } from 'sonner'

interface LeaderboardOptOutToggleProps {
  initialOptOut: boolean
  /** Farben des Lehrkräfte-Bereichs (`ws-*`) statt der festen Spieler-Farben (PROJ-50) */
  workspace?: boolean
  /** Erklärtext je Zustand; Standard richtet sich an Azubis */
  hints?: { visible: string; hidden: string }
}

const DEFAULT_HINTS = {
  visible: 'Alle Azubis sehen dich in der Rangliste',
  hidden: 'Du bist versteckt (nur du siehst deine Position)',
}

export function LeaderboardOptOutToggle({ initialOptOut, workspace = false, hints = DEFAULT_HINTS }: LeaderboardOptOutToggleProps) {
  const muted = workspace ? 'text-ws-muted' : 'text-[#9CA3AF]'
  const text = workspace ? 'text-ws-text' : 'text-[#F9FAFB]'
  const [optOut, setOptOut] = useState(initialOptOut)
  const [saving, setSaving] = useState(false)

  async function handleToggle(checked: boolean) {
    setSaving(true)
    try {
      const res = await fetch('/api/profile/opt-out', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leaderboard_opt_out: !checked }),
      })
      if (!res.ok) {
        toast.error('Einstellung konnte nicht gespeichert werden. Bitte versuche es erneut.')
        return
      }
      setOptOut(!checked)
    } catch {
      toast.error('Einstellung konnte nicht gespeichert werden. Bitte versuche es erneut.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-2">
        <EyeOff size={16} className={`${muted} flex-shrink-0`} />
        <div>
          <Label htmlFor="leaderboard-opt-out" className={`text-sm font-medium ${text} cursor-pointer`}>
            In Rangliste erscheinen
          </Label>
          <p className={`text-xs ${muted}`}>{optOut ? hints.hidden : hints.visible}</p>
        </div>
      </div>
      <Switch
        id="leaderboard-opt-out"
        checked={!optOut}
        onCheckedChange={handleToggle}
        disabled={saving}
        className={workspace ? 'data-[state=checked]:bg-ws-green' : 'data-[state=checked]:bg-[#58CC02]'}
      />
    </div>
  )
}
