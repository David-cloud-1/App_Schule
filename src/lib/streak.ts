/**
 * Welcher Streak gilt heute? Der gespeicherte Wert wird erst beim nächsten
 * Lernen neu berechnet. Wurde weder heute noch gestern gelernt, ist die Serie
 * gerissen und wird mit 0 angezeigt (Befund F3). Rein lesend, ändert keine Daten.
 */
function berlinDay(date: Date): string {
  return new Intl.DateTimeFormat('sv', { timeZone: 'Europe/Berlin' }).format(date)
}

export function activeStreak(
  storedStreak: number | null | undefined,
  lastSessionDate: string | null | undefined,
  now: Date = new Date(),
): number {
  const streak = storedStreak ?? 0
  if (streak <= 0 || !lastSessionDate) return 0
  const day = lastSessionDate.slice(0, 10)
  // Gestern über das Kalenderdatum, nicht „minus 24 Stunden“ (Zeitumstellung)
  const yesterday = new Date(`${berlinDay(now)}T12:00:00Z`)
  yesterday.setUTCDate(yesterday.getUTCDate() - 1)
  return day >= yesterday.toISOString().slice(0, 10) ? streak : 0
}
