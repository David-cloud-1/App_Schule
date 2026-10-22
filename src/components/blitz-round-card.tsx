'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Zap } from 'lucide-react'
import { cn } from '@/lib/utils'

interface BlitzStatus {
  available: boolean
  next_available_at: string | null
}

/**
 * Kompakte Blitzrunden-Kachel auf dem „Heute“-Screen (PROJ-19, PROJ-42).
 * Liest GET /api/quiz/blitz/status; nach dem Spielen gedämpft mit „Morgen
 * wieder“. Bei Fehlern verschwindet sie, statt die Startseite zu stören.
 */
export function BlitzRoundTile() {
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
        console.error('[BlitzRoundTile]', err)
        if (!cancelled) setFailed(true)
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (failed) return null

  const available = status?.available ?? false
  const content = (
    <>
      <span
        className={cn(
          'flex size-10 shrink-0 items-center justify-center rounded-full',
          available ? 'bg-[#FFD700]/20' : 'bg-[#374151]',
        )}
      >
        <Zap className={cn('size-5', available ? 'text-[#FFD700]' : 'text-[#6B7280]')} />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-bold text-[#F9FAFB]">Blitzrunde</span>
        <span className="block truncate text-xs text-[#9CA3AF]">
          {status === null ? 'Lädt…' : available ? '60 s · 3× Münzen' : 'Morgen wieder'}
        </span>
      </span>
    </>
  )

  const base = 'flex min-h-[68px] items-center gap-3 rounded-2xl border px-3 py-3 transition-all duration-200'

  if (available) {
    return (
      <Link
        href="/blitzrunde"
        className={cn(base, 'border-[#FFD700]/40 bg-[#FFD700]/10 hover:bg-[#FFD700]/15 active:scale-95')}
      >
        {content}
      </Link>
    )
  }

  return (
    <div aria-disabled className={cn(base, 'border-[#374151] bg-[#1F2937]/50 opacity-70')}>
      {content}
    </div>
  )
}
