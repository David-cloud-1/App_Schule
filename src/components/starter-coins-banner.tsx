'use client'

import { useEffect, useState } from 'react'
import { Coins, X } from 'lucide-react'

/**
 * One-time "welcome back" hint for the PROJ-19 starter-coin grant. Reads
 * `starter_coins_hint` from /api/profile/stats (non-null exactly until the
 * user dismisses it, which calls POST /api/profile/coins/ack-starter).
 */
export function StarterCoinsBanner() {
  const [amount, setAmount] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch('/api/profile/stats')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data?.starter_coins_hint) setAmount(data.starter_coins_hint)
      })
      .catch((err) => console.error('[StarterCoinsBanner]', err))
    return () => {
      cancelled = true
    }
  }, [])

  function dismiss() {
    setAmount(null)
    fetch('/api/profile/coins/ack-starter', { method: 'POST' }).catch((err) =>
      console.error('[StarterCoinsBanner] ack failed:', err),
    )
  }

  if (amount === null) return null

  return (
    <div className="bg-gradient-to-r from-[#FFD700]/15 to-[#1F2937] border border-[#FFD700]/40 rounded-2xl p-4 flex items-center gap-3">
      <div className="w-10 h-10 rounded-full bg-[#FFD700]/20 border-2 border-[#FFD700]/50 flex items-center justify-center flex-shrink-0">
        <Coins size={18} className="text-[#FFD700]" />
      </div>
      <p className="flex-1 min-w-0 text-sm text-[#F9FAFB]">
        Willkommen zurück! Du hast <span className="font-bold text-[#FFD700]">{amount} Frachtmünzen</span> aus
        deinem bisherigen Lernfortschritt erhalten.
      </p>
      <button
        onClick={dismiss}
        aria-label="Hinweis schließen"
        className="flex-shrink-0 text-[#9CA3AF] hover:text-[#F9FAFB] transition-colors p-1"
      >
        <X size={16} />
      </button>
    </div>
  )
}
