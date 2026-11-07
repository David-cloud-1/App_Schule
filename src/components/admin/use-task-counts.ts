'use client'

import { useCallback, useEffect, useState } from 'react'
import { EMPTY_TASK_COUNTS, parseTaskCounts, type TaskCounts } from '@/lib/teacher-tasks'

const REFRESH_EVENT = 'tasks:refresh'

/** Aus beliebiger Stelle: Zähler neu holen (z. B. nach dem Abschließen einer Meldung). */
export function refreshTaskCounts() {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(REFRESH_EVENT))
}

/**
 * Zähler für „Zu erledigen“ und die Seitenleiste (PROJ-81). Wird bei jedem
 * Seitenwechsel (`trigger`) und auf Zuruf neu geholt. Fehler ergeben leere
 * Zähler: die Navigation muss immer funktionieren. `status` unterscheidet
 * „lädt“, „fertig“ und „Fehler“ für die Karte auf der Startseite.
 */
export function useTaskCounts(trigger: string) {
  const [counts, setCounts] = useState<TaskCounts>({ ...EMPTY_TASK_COUNTS })
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')

  const load = useCallback(async () => {
    if (typeof fetch !== 'function') return
    try {
      const res = await fetch('/api/admin/tasks', { cache: 'no-store' })
      if (!res || !res.ok) {
        setStatus('error')
        return
      }
      setCounts(parseTaskCounts(await res.json()))
      setStatus('ready')
    } catch {
      setStatus('error')
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

  return { counts, status, reload: load }
}
