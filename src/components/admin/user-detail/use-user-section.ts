'use client'

import { useCallback, useEffect, useState } from 'react'
import type { UserSectionKey } from '@/lib/user-detail'
import type { SectionState } from './types'

/**
 * Lädt einen Abschnitt der Detailseite für sich (PROJ-59). Ein Fehler bleibt
 * auf diesen Abschnitt beschränkt; `reload` lädt ihn still neu (alte Daten
 * bleiben stehen, bis die neuen da sind).
 */
export function useUserSection<T>(userId: string, section: UserSectionKey) {
  const [state, setState] = useState<SectionState<T>>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    async function run() {
      try {
        const res = await fetch(`/api/admin/users/${userId}/detail/${section}`)
        if (cancelled) return
        if (!res.ok) {
          setState({ status: 'error', notFound: res.status === 404 })
          return
        }
        setState({ status: 'ready', data: (await res.json()) as T })
      } catch {
        if (!cancelled) setState({ status: 'error', notFound: false })
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [userId, section, attempt])

  const reload = useCallback(() => setAttempt((n) => n + 1), [])
  const retry = useCallback(() => {
    setState({ status: 'loading' })
    setAttempt((n) => n + 1)
  }, [])

  return { state, reload, retry }
}
