'use client'

import { useCallback, useEffect, useState } from 'react'
import { forumNavTotals, type ForumNavCounts } from '@/lib/forum'

const REFRESH_EVENT = 'forum:nav-refresh'

/** Aus beliebiger Stelle: Zähler in der Seitenleiste neu holen (z. B. nach dem Besuch der Übersicht). */
export function refreshForumNavCounts() {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(REFRESH_EVENT))
}

/**
 * Zähler fürs Lehrerzimmer in der Seitenleiste (PROJ-63): neue Hinweise und,
 * nur für Admins, offene Meldungen. Wird bei jedem Seitenwechsel (`trigger`)
 * und auf Zuruf neu geholt; Echtzeit ist nicht nötig. Fehler und fremde
 * Antworten ergeben still 0, die Navigation muss immer funktionieren.
 */
export function useForumNavCounts(trigger: string) {
  const [totals, setTotals] = useState({ hints: 0, reports: 0 })

  const load = useCallback(async () => {
    if (typeof fetch !== 'function') return
    try {
      const res = await fetch('/api/admin/lehrerzimmer/nav-counts', { cache: 'no-store' })
      if (!res.ok) return
      const json = (await res.json()) as ForumNavCounts
      setTotals(forumNavTotals(json))
    } catch {
      /* Zähler sind nur eine Zugabe */
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load, trigger])

  useEffect(() => {
    const onRefresh = () => void load()
    window.addEventListener(REFRESH_EVENT, onRefresh)
    return () => window.removeEventListener(REFRESH_EVENT, onRefresh)
  }, [load])

  return totals
}
