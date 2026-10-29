/**
 * Relative Zeitangabe fürs Lehrerzimmer (PROJ-63): „gerade eben“, „vor 5 Min.“,
 * „vor 2 Std.“, „gestern“, „vor 3 Tagen“, danach das Datum. Kommt der
 * Zeitstempel (leicht) aus der Zukunft, z. B. durch eine abweichende Uhr,
 * zählt das als „gerade eben“.
 */
export function formatRelativeTime(iso: string, now: number = Date.now()): string {
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return ''
  const seconds = Math.floor((now - then) / 1000)
  if (seconds < 60) return 'gerade eben'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `vor ${minutes} Min.`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `vor ${hours} Std.`
  const days = Math.floor(hours / 24)
  if (days === 1) return 'gestern'
  if (days < 7) return `vor ${days} Tagen`
  return new Date(then).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

/** Vollständiges Datum mit Uhrzeit, für den `title` (Tooltip) neben der relativen Angabe */
export function formatFullDateTime(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' })
}
