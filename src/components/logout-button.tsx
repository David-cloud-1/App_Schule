'use client'

import { useState } from 'react'
import { LogOut, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase-browser'

export function LogoutButton() {
  const [loading, setLoading] = useState(false)

  async function handleLogout() {
    setLoading(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  return (
    <button
      onClick={handleLogout}
      disabled={loading}
      className="flex items-center gap-1.5 text-sm bg-white/20 hover:bg-white/30 rounded-lg px-3 py-1.5 transition-colors disabled:opacity-50"
      aria-label="Abmelden"
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <LogOut className="w-4 h-4" />
      )}
      <span>Abmelden</span>
    </button>
  )
}
