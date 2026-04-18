'use client'

import { useState } from 'react'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { EyeOff } from 'lucide-react'
import { toast } from 'sonner'

interface LeaderboardOptOutToggleProps {
  initialOptOut: boolean
}

export function LeaderboardOptOutToggle({ initialOptOut }: LeaderboardOptOutToggleProps) {
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
        <EyeOff size={16} className="text-[#9CA3AF] flex-shrink-0" />
        <div>
          <Label htmlFor="leaderboard-opt-out" className="text-sm font-medium text-[#F9FAFB] cursor-pointer">
            In Rangliste erscheinen
          </Label>
          <p className="text-xs text-[#9CA3AF]">
            {optOut ? 'Du bist versteckt (nur du siehst deine Position)' : 'Alle Azubis sehen dich in der Rangliste'}
          </p>
        </div>
      </div>
      <Switch
        id="leaderboard-opt-out"
        checked={!optOut}
        onCheckedChange={handleToggle}
        disabled={saving}
        className="data-[state=checked]:bg-[#58CC02]"
      />
    </div>
  )
}
