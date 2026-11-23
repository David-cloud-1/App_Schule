'use client'

import { useCallback, useState, useSyncExternalStore } from 'react'

function readSeen(storageKey: string): boolean {
  try {
    return window.localStorage.getItem(storageKey) === '1'
  } catch {
    return false
  }
}

function subscribe(onChange: () => void) {
  window.addEventListener('storage', onChange)
  return () => window.removeEventListener('storage', onChange)
}

/**
 * Zeigt einen Hinweis genau einmal je Gerät (PROJ-129: Erst-Hinweis je Variante).
 * Ohne Speicher (privates Fenster, gesperrte Website-Daten) erscheint der
 * Hinweis einfach jedes Mal – das ist harmlos. Auf dem Server nie sichtbar.
 */
export function useFirstTimeHint(storageKey: string): [boolean, () => void] {
  const seen = useSyncExternalStore(
    subscribe,
    () => readSeen(storageKey),
    () => true,
  )
  const [dismissed, setDismissed] = useState(false)

  const dismiss = useCallback(() => {
    setDismissed(true)
    try {
      window.localStorage.setItem(storageKey, '1')
    } catch {
      // Speicher nicht verfügbar – Hinweis kommt beim nächsten Mal wieder
    }
  }, [storageKey])

  return [!seen && !dismissed, dismiss]
}
