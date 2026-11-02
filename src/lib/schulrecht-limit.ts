import { fehler } from '@/lib/werkzeugkiste-server'

/**
 * Einfache Mengenbremse für die Suche (PROJ-55): höchstens so viele Aufrufe je
 * Person und Minute. Der Zähler liegt im Speicher der jeweiligen Server-Instanz;
 * das bremst ein schnelles Durchklicken oder ein Skript, ersetzt aber kein
 * verteiltes Limit. Es wird nichts über die Aufrufe gespeichert, nur Zeitpunkte.
 */
export const SUCHEN_PRO_MINUTE = 30
const FENSTER_MS = 60_000
const zeitpunkte = new Map<string, number[]>()

/** `null`, wenn der Aufruf erlaubt ist, sonst die fertige 429-Antwort */
export function bremse(nutzerId: string, jetzt = Date.now()) {
  const frisch = (zeitpunkte.get(nutzerId) ?? []).filter((t) => jetzt - t < FENSTER_MS)
  if (frisch.length >= SUCHEN_PRO_MINUTE) {
    zeitpunkte.set(nutzerId, frisch)
    return fehler('Du suchst sehr schnell.', 429, 'Warte einen Moment und versuche es dann noch einmal.')
  }
  frisch.push(jetzt)
  zeitpunkte.set(nutzerId, frisch)
  // Speicher klein halten
  if (zeitpunkte.size > 5000) for (const [k, v] of zeitpunkte) if (v.every((t) => jetzt - t >= FENSTER_MS)) zeitpunkte.delete(k)
  return null
}

export function bremseZuruecksetzen() {
  zeitpunkte.clear()
}
