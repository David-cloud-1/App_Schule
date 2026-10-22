import { useEffect } from 'react'

/**
 * Ruft `onRefresh` regelmäßig auf, solange `active` gilt und der Tab sichtbar
 * ist; beim Zurückkehren in den Tab sofort einmal. Gedacht für Warteansichten
 * (z. B. Ergebnis noch nicht freigegeben), die sich ohne Neuladen aktualisieren sollen.
 */
export function useAutoRefresh(active: boolean, onRefresh: () => void, intervalMs = 12_000) {
  useEffect(() => {
    if (!active) return
    const tick = () => {
      if (document.visibilityState === 'visible') onRefresh()
    }
    const timer = setInterval(tick, intervalMs)
    document.addEventListener('visibilitychange', tick)
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', tick)
    }
  }, [active, onRefresh, intervalMs])
}
