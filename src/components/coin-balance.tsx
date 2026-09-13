'use client'

import { useEffect, useState } from 'react'
import { Coins } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CoinBalanceProps {
  variant?: 'pill' | 'inline'
  className?: string
}

/**
 * Reads `coin_balance` from /api/profile/stats (PROJ-19). Fetches client-side
 * so this component keeps working once the backend adds the field, without
 * requiring every page that renders it to thread the value through props.
 */
export function CoinBalance({ variant = 'pill', className }: CoinBalanceProps) {
  const [balance, setBalance] = useState<number | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetch('/api/profile/stats')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load coin balance')
        return res.json()
      })
      .then((data) => {
        if (!cancelled) setBalance(typeof data.coin_balance === 'number' ? data.coin_balance : 0)
      })
      .catch((err) => {
        console.error('[CoinBalance]', err)
        if (!cancelled) setFailed(true)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const display = balance === null ? (failed ? '—' : '···') : balance.toLocaleString('de-DE')

  if (variant === 'inline') {
    return (
      <div className={cn('flex items-center gap-1.5', className)}>
        <Coins size={18} className="text-[#FFD700] flex-shrink-0" />
        <span className="text-2xl font-bold text-[#F9FAFB] leading-none tabular-nums">
          {display}
        </span>
        <span className="text-sm text-[#9CA3AF] font-medium">Münzen</span>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'flex items-center gap-1 bg-[#111827] rounded-full px-3 py-1.5 border border-[#4B5563]',
        className,
      )}
      aria-label="Frachtmünzen-Stand"
    >
      <Coins size={13} className="text-[#FFD700]" />
      <span className="text-xs font-bold text-[#F9FAFB]">{display}</span>
    </div>
  )
}
