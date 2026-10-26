'use client'

import { useState } from 'react'
import Link from 'next/link'
import { User, Shield, LogOut, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase-browser'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface PlayerMenuProps {
  displayName: string
  /** Alle Lehrer-Rollen sehen den Wechsel in den Lehrkräfte-Bereich (PROJ-44) */
  showTeacherArea: boolean
}

/** Profil-Menü oben rechts: bündelt Profil, Lehrkräfte-Bereich und Abmelden. */
export function PlayerMenu({ displayName, showTeacherArea }: PlayerMenuProps) {
  const [loggingOut, setLoggingOut] = useState(false)
  const initial = displayName.trim().charAt(0).toUpperCase() || '?'

  async function handleLogout() {
    setLoggingOut(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="flex items-center justify-center w-11 h-11 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-[#58CC02]"
        aria-label="Menü öffnen"
      >
        <span className="flex items-center justify-center w-9 h-9 rounded-full bg-[#58CC02]/15 border-2 border-[#58CC02]/50 text-sm font-bold text-[#58CC02]">
          {initial}
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-56 rounded-xl bg-[#1F2937] border-[#4B5563] text-[#F9FAFB]"
      >
        <DropdownMenuLabel className="truncate text-xs font-normal text-[#9CA3AF]">
          {displayName}
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-[#4B5563]" />
        <DropdownMenuItem asChild className="py-2.5 focus:bg-[#374151] focus:text-[#F9FAFB]">
          <Link href="/profile">
            <User className="w-4 h-4 text-[#9CA3AF]" />
            Profil
          </Link>
        </DropdownMenuItem>
        {showTeacherArea && (
          <DropdownMenuItem asChild className="py-2.5 focus:bg-[#374151] focus:text-[#F9FAFB]">
            <Link href="/admin">
              <Shield className="w-4 h-4 text-[#9CA3AF]" />
              Lehrkräfte-Bereich
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator className="bg-[#4B5563]" />
        <DropdownMenuItem
          onSelect={(e) => {
            e.preventDefault()
            handleLogout()
          }}
          disabled={loggingOut}
          className="py-2.5 text-[#FF4B4B] focus:bg-[#FF4B4B]/10 focus:text-[#FF4B4B]"
        >
          {loggingOut ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
          Abmelden
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
