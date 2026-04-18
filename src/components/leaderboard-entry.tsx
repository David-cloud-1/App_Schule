'use client'

import { Zap } from 'lucide-react'
import { getLevelColor } from '@/lib/xp-utils'

export interface LeaderboardEntryData {
  id: string
  display_name: string | null
  total_xp: number
  level: number
  rank: number
  is_current_user?: boolean
  is_opted_out?: boolean
}

interface LeaderboardEntryProps {
  entry: LeaderboardEntryData
  currentUserId?: string
}

const RANK_STYLES: Record<number, { bg: string; border: string; rankText: string; icon: string }> = {
  1: { bg: 'bg-[#2A2410]', border: 'border-[#FFD700]', rankText: 'text-[#FFD700]', icon: '🥇' },
  2: { bg: 'bg-[#1E2328]', border: 'border-[#C0C0C0]', rankText: 'text-[#C0C0C0]', icon: '🥈' },
  3: { bg: 'bg-[#221A10]', border: 'border-[#CD7F32]', rankText: 'text-[#CD7F32]', icon: '🥉' },
}

function getAvatarColor(id: string): string {
  const colors = [
    '#58CC02', '#1CB0F6', '#FF9600', '#FF4B4B',
    '#9B59B6', '#E74C3C', '#3498DB', '#2ECC71',
  ]
  let hash = 0
  for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash)
  return colors[Math.abs(hash) % colors.length]
}

function getInitials(displayName: string | null, id: string): string {
  if (!displayName) {
    // Fallback: first char of id
    return id.slice(0, 2).toUpperCase()
  }
  const parts = displayName.trim().split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return displayName.slice(0, 2).toUpperCase()
}

export function LeaderboardEntry({ entry }: LeaderboardEntryProps) {
  const isTopThree = entry.rank <= 3
  const style = isTopThree ? RANK_STYLES[entry.rank] : null
  const isCurrentUser = entry.is_current_user
  const isOptedOut = entry.is_opted_out
  const avatarColor = getAvatarColor(entry.id)
  const initials = getInitials(entry.display_name, entry.id)
  const displayName = isOptedOut ? 'Du (anonym)' : (entry.display_name ?? 'Azubi')

  return (
    <div
      className={[
        'flex items-center gap-3 rounded-2xl p-3 border transition-all',
        isCurrentUser
          ? 'bg-[#1A2B1A] border-[#58CC02] ring-1 ring-[#58CC02]/30'
          : style
          ? `${style.bg} ${style.border}`
          : 'bg-[#1F2937] border-[#4B5563]',
      ].join(' ')}
    >
      {/* Rank */}
      <div className="w-7 flex-shrink-0 flex items-center justify-center">
        {isTopThree ? (
          <span className="text-xl leading-none">{style!.icon}</span>
        ) : (
          <span className={`text-sm font-bold ${isCurrentUser ? 'text-[#58CC02]' : 'text-[#9CA3AF]'}`}>
            #{entry.rank}
          </span>
        )}
      </div>

      {/* Avatar */}
      <div
        className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold text-white"
        style={{ backgroundColor: avatarColor }}
      >
        {initials}
      </div>

      {/* Name */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-semibold truncate ${isCurrentUser ? 'text-[#58CC02]' : 'text-[#F9FAFB]'}`}>
          {displayName}
          {isCurrentUser && !isOptedOut && (
            <span className="ml-2 text-xs font-normal text-[#9CA3AF]">Du</span>
          )}
        </p>
      </div>

      {/* Level Badge */}
      <div className={`flex-shrink-0 rounded-full border px-2 py-0.5 text-xs font-bold ${getLevelColor(entry.level)}`}>
        Lv.{entry.level}
      </div>

      {/* XP */}
      <div className="flex items-center gap-1 flex-shrink-0">
        <Zap size={13} className={isCurrentUser ? 'text-[#58CC02]' : 'text-[#FFD700]'} />
        <span className={`text-sm font-bold ${isCurrentUser ? 'text-[#58CC02]' : 'text-[#F9FAFB]'}`}>
          {entry.total_xp.toLocaleString('de-DE')}
        </span>
      </div>
    </div>
  )
}
