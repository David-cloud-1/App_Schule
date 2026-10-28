/**
 * Begrenzt Fehlversuche je Schlüssel (z. B. je Person) in einem Zeitfenster.
 * Läuft im Arbeitsspeicher der Server-Instanz: Es genügt, damit eine einzelne
 * Person das gemeinsame Anmelde-Limit des Dienstes nicht für alle aufbraucht,
 * ist aber bewusst keine harte Sperre über alle Instanzen hinweg.
 */
export interface AttemptLimiter {
  /** Wie lange noch gesperrt (in Sekunden), 0 = frei */
  blockedFor(key: string): number
  recordFailure(key: string): void
  reset(key: string): void
}

export function createAttemptLimiter({
  max,
  windowMs,
  now = Date.now,
}: {
  max: number
  windowMs: number
  now?: () => number
}): AttemptLimiter {
  const failures = new Map<string, number[]>()

  /** Abgelaufene Versuche streichen; leere Einträge entfernen, damit die Liste nicht wächst */
  function recent(key: string): number[] {
    const cutoff = now() - windowMs
    const list = (failures.get(key) ?? []).filter((t) => t > cutoff)
    if (list.length > 0) failures.set(key, list)
    else failures.delete(key)
    return list
  }

  return {
    blockedFor(key) {
      const list = recent(key)
      if (list.length < max) return 0
      return Math.max(1, Math.ceil((list[0] + windowMs - now()) / 1000))
    },
    recordFailure(key) {
      failures.set(key, [...recent(key), now()])
    },
    reset(key) {
      failures.delete(key)
    },
  }
}
