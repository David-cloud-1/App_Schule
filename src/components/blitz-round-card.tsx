'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Zap, Clock } from 'lucide-react'

interface BlitzStatus {
  available: boolean
  next_available_at: string | null
}

function formatCountdown(nextAvailableAt: string): string {
  const diffMs = new Date(nextAvailableAt).getTime() - Date.now()
  if (diffMs <= 0) return 'gleich wieder da'
  const hours = Math.floor(diffMs / 3_600_000)
  const minutes = Math.floor((diffMs % 3_600_000) / 60_000)
  if (hours > 0) return `wieder verfügbar in ${hours} Std ${minutes} Min`
  return `wieder verfügbar in ${minutes} Min`
}

/**
 * Reads availability from GET /api/quiz/blitz/status (PROJ-19, not yet built
 * by /backend). Fails soft: on error or 404, shows a neutral "not available
 * right now" state instead of crashing the home page.
 */
export function BlitzRoundCard() {
  const [status, setStatus] = useState<BlitzStatus | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetch('/api/quiz/blitz/status')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load blitz status')
        return res.json()
      })
      .then((data: BlitzStatus) => {
        if (!cancelled) setStatus(data)
      })
      .catch((err) => {
        console.error('[BlitzRoundCard]', err)
        if (!cancelled) setFailed(true)
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (failed) return null

  const available = status?.available ?? false

  return (
    <div className="bg-gradient-to-br from-[#FFD700]/15 to-[#1F2937] border border-[#FFD700]/40 rounded-2xl p-4 flex items-center gap-4">
      <div className="w-12 h-12 rounded-full bg-[#FFD700]/20 border-2 border-[#FFD700]/50 flex items-center justify-center flex-shrink-0">
        <Zap size={22} className="text-[#FFD700]" />
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-bold text-[#F9FAFB] text-sm">Blitzrunde</p>
        {status === null ? (
          <p className="text-xs text-[#9CA3AF] mt-0.5">Lädt…</p>
        ) : available ? (
          <p className="text-xs text-[#9CA3AF] mt-0.5">60 Sekunden, dreifache Münzen — einmal am Tag</p>
        ) : (
          <p className="text-xs text-[#9CA3AF] mt-0.5 flex items-center gap-1">
            <Clock size={12} />
            Heute erledigt — {status.next_available_at ? formatCountdown(status.next_available_at) : 'morgen wieder da'}
          </p>
        )}
      </div>

      {available && status !== null ? (
        <Link
          href="/blitzrunde"
          className="flex-shrink-0 bg-[#FFD700] hover:bg-[#e6c200] text-[#111827] font-bold text-sm rounded-2xl px-4 py-2.5 transition-all duration-200 active:scale-95"
        >
          Start
        </Link>
      ) : (
        <div className="flex-shrink-0 bg-[#374151] text-[#6B7280] font-bold text-sm rounded-2xl px-4 py-2.5">
          ✓
        </div>
      )}
    </div>
  )
}
