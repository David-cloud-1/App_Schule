'use client'

import { useState } from 'react'
import { ArrowRightLeft, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

type Side = 'main' | 'linked'

interface AreaSwitcherProps {
  /** Welches Konto gerade aktiv ist */
  current: Side
  /** Bereichsnamen der beiden Konten, z. B. „Spedition" und „Tourismus" */
  mainName: string
  linkedName: string
}

/**
 * Bereichs-Umschalter für den Super-Admin (PROJ-29): wechselt zwischen
 * Hauptkonto und verknüpftem Tourismus-Zweitkonto. Nach dem Wechsel wird die
 * Seite komplett neu geladen, damit Bereich, Lernstand und Branding stimmen.
 */
export function AreaSwitcher({ current, mainName, linkedName }: AreaSwitcherProps) {
  const [pending, setPending] = useState<Side | null>(null)

  async function switchTo(target: Side) {
    if (target === current || pending) return
    setPending(target)
    try {
      const res = await fetch('/api/profile/switch-area', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target }),
      })
      if (!res.ok) {
        toast.error('Umschalten hat nicht geklappt. Bitte versuche es erneut.')
        setPending(null)
        return
      }
      window.location.assign('/profile')
    } catch {
      toast.error('Umschalten hat nicht geklappt. Bitte versuche es erneut.')
      setPending(null)
    }
  }

  const options: { side: Side; label: string }[] = [
    { side: 'main', label: mainName },
    { side: 'linked', label: linkedName },
  ]

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <ArrowRightLeft size={16} className="text-[#9CA3AF] flex-shrink-0" />
        <h2 className="text-sm font-semibold text-[#F9FAFB]">Ansicht wechseln</h2>
      </div>

      <div role="radiogroup" aria-label="Ansicht wechseln" className="grid grid-cols-2 gap-2">
        {options.map(({ side, label }) => {
          const active = side === current
          return (
            <button
              key={side}
              type="button"
              role="radio"
              aria-checked={active}
              disabled={pending !== null}
              onClick={() => switchTo(side)}
              className={cn(
                'min-h-11 rounded-2xl border px-3 py-2 text-sm font-semibold transition-all duration-200 active:scale-95 flex items-center justify-center gap-2',
                active
                  ? 'bg-[#58CC02] border-[#58CC02] text-white shadow-[0_3px_0_#46A302]'
                  : 'bg-[#111827] border-[#4B5563] text-[#F9FAFB] hover:bg-[#374151]',
                pending !== null && !active && pending !== side && 'opacity-50',
              )}
            >
              {pending === side && <Loader2 size={16} className="animate-spin" aria-hidden />}
              {label}
            </button>
          )
        })}
      </div>

      <p className="text-xs text-[#9CA3AF] leading-relaxed">
        {current === 'linked'
          ? `Du nutzt gerade das ${linkedName}-Testkonto mit eigenem Lernstand und ohne Admin-Rechte. Für das Admin-Panel wechsle zurück zu ${mainName}.`
          : `Das ${linkedName}-Testkonto hat einen eigenen Lernstand. Dein ${mainName}-Stand bleibt unberührt.`}
      </p>
    </div>
  )
}
