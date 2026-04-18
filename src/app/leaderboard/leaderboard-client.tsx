'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { LeaderboardEntry, type LeaderboardEntryData } from '@/components/leaderboard-entry'
import { Separator } from '@/components/ui/separator'

type Period = 'week' | 'month' | 'all'

interface LeaderboardResponse {
  entries: LeaderboardEntryData[]
  current_user: LeaderboardEntryData | null
}

interface LeaderboardClientProps {
  userId: string
}

const PERIOD_LABELS: Record<Period, string> = {
  week: 'Diese Woche',
  month: 'Dieser Monat',
  all: 'Gesamt',
}

export function LeaderboardClient({ userId }: LeaderboardClientProps) {
  const [period, setPeriod] = useState<Period>('week')
  const [data, setData] = useState<LeaderboardResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchLeaderboard = useCallback(async (p: Period) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/leaderboard?period=${p}`)
      if (!res.ok) throw new Error('Fehler beim Laden der Rangliste')
      const json: LeaderboardResponse = await res.json()
      setData(json)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unbekannter Fehler')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchLeaderboard(period)
  }, [period, fetchLeaderboard])

  return (
    <div className="space-y-4">
      {/* Period tabs */}
      <Tabs value={period} onValueChange={(v) => setPeriod(v as Period)}>
        <TabsList className="w-full bg-[#1F2937] border border-[#4B5563] rounded-xl p-1">
          {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
            <TabsTrigger
              key={p}
              value={p}
              className="flex-1 text-xs rounded-lg data-[state=active]:bg-[#374151] data-[state=active]:text-[#F9FAFB] text-[#9CA3AF]"
            >
              {PERIOD_LABELS[p]}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Content */}
      {error && (
        <div className="bg-[#1F2937] border border-[#FF4B4B]/50 rounded-2xl p-4 text-center text-[#FF4B4B] text-sm">
          {error}
        </div>
      )}

      {loading && (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-[60px] w-full rounded-2xl bg-[#1F2937]" />
          ))}
        </div>
      )}

      {!loading && !error && data && (
        <>
          {data.entries.length === 0 ? (
            <div className="bg-[#1F2937] border border-[#4B5563] rounded-2xl p-8 text-center">
              <p className="text-[#9CA3AF] text-sm">
                Noch keine Daten für diesen Zeitraum.
              </p>
              <p className="text-[#6B7280] text-xs mt-1">
                Lerne jetzt und erscheine in der Rangliste!
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {data.entries.map((entry) => (
                <LeaderboardEntry key={entry.id} entry={entry} currentUserId={userId} />
              ))}
            </div>
          )}

          {/* Own position when outside top 10 */}
          {data.current_user && (
            <>
              <div className="flex items-center gap-2 my-2">
                <Separator className="flex-1 bg-[#374151]" />
                <span className="text-xs text-[#6B7280]">Deine Position</span>
                <Separator className="flex-1 bg-[#374151]" />
              </div>
              <LeaderboardEntry entry={data.current_user} currentUserId={userId} />
            </>
          )}

          <p className="text-center text-[#6B7280] text-xs pt-2">
            Opt-out-Einstellungen in{' '}
            <Link href="/profile" className="text-[#9CA3AF] underline underline-offset-2">
              deinem Profil
            </Link>
          </p>
        </>
      )}
    </div>
  )
}
