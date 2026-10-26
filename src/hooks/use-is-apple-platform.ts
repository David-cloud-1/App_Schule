import { useSyncExternalStore } from 'react'

const noSubscribe = () => () => {}

/**
 * Apple-Geräte zeigen Tastenkürzel mit ⌘, alle anderen mit Strg (PROJ-45).
 * Auf dem Server und vor dem Hydrieren gilt ⌘.
 */
export function useIsApplePlatform(): boolean {
  return useSyncExternalStore(
    noSubscribe,
    () => /Mac|iPhone|iPad|iPod/i.test(navigator.userAgent),
    () => true,
  )
}
