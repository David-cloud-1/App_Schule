import { findeWerkzeug } from '@/lib/werkzeugkiste'

/**
 * Verbrauch der direkten Erstellung je Monat (PROJ-65) — reine Rechnungen auf
 * den eigenen Läufen, die „Mein Konto“ vom Server bekommt.
 */

export interface VerbrauchLauf {
  id: string
  werkzeug: string
  dateiName: string | null
  status: string
  /** Genauer Betrag in Euro, wie er beim Lauf festgehalten wurde */
  kostenEur: number
  gestartetAm: string
}

export interface VerbrauchZeile {
  id: string
  /** „28.10.“ */
  datum: string
  werkzeug: string
  titel: string
  /** Betrag, schon als Text („0,13 €“) */
  betrag: string
  abgebrochen: boolean
}

export interface VerbrauchMonat {
  /** „2026-10“ */
  key: string
  /** „Oktober 2026“ */
  label: string
  summe: string
  anzahl: number
  zeilen: VerbrauchZeile[]
}

export interface VerbrauchAnsicht {
  /** Alle wählbaren Monate, neueste zuerst: der laufende plus jeder mit Verbrauch */
  monate: { key: string; label: string }[]
  gewaehlt: VerbrauchMonat
  /** Es gab überhaupt schon einen Lauf mit Kosten */
  hatVerbrauch: boolean
}

const ZONE = 'Europe/Berlin'

/** Monat eines Zeitpunkts nach deutscher Zeit: „2026-10“ */
export function monatBerlin(iso: string | Date): string {
  const teile = new Intl.DateTimeFormat('en-CA', { timeZone: ZONE, year: 'numeric', month: '2-digit' }).formatToParts(new Date(iso))
  const get = (t: string) => teile.find((p) => p.type === t)?.value ?? ''
  return `${get('year')}-${get('month')}`
}

export function monatLabel(key: string): string {
  const [j, m] = key.split('-').map(Number)
  return new Intl.DateTimeFormat('de-DE', { timeZone: 'UTC', month: 'long', year: 'numeric' }).format(new Date(Date.UTC(j, m - 1, 15)))
}

const kurzDatum = (iso: string) => new Intl.DateTimeFormat('de-DE', { timeZone: ZONE, day: '2-digit', month: '2-digit' }).format(new Date(iso))

export function euroText(betrag: number): string {
  if (betrag > 0 && betrag < 0.005) return '< 0,01 €'
  return `${betrag.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`
}

export const istMonatKey = (s: string | null | undefined): s is string => !!s && /^\d{4}-(0[1-9]|1[0-2])$/.test(s)

/**
 * Gruppiert die Läufe nach Monat. `gewuenscht` kommt aus der Adresse: ein
 * unbekannter oder leerer Monat fällt auf den laufenden zurück. Läufe ohne
 * Kosten zählen nicht.
 */
export function baueVerbrauch(laeufe: VerbrauchLauf[], gewuenscht: string | null | undefined, jetzt: Date = new Date()): VerbrauchAnsicht {
  const mitKosten = laeufe.filter((l) => l.kostenEur > 0).sort((a, b) => b.gestartetAm.localeCompare(a.gestartetAm))
  const heute = monatBerlin(jetzt)
  const nachMonat = new Map<string, VerbrauchLauf[]>()
  for (const l of mitKosten) {
    const k = monatBerlin(l.gestartetAm)
    nachMonat.set(k, [...(nachMonat.get(k) ?? []), l])
  }
  const keys = [...new Set([heute, ...nachMonat.keys()])].sort().reverse()
  const gewaehltKey = istMonatKey(gewuenscht) && keys.includes(gewuenscht) ? gewuenscht : heute
  const liste = nachMonat.get(gewaehltKey) ?? []
  const summe = liste.reduce((s, l) => s + l.kostenEur, 0)
  return {
    monate: keys.map((key) => ({ key, label: monatLabel(key) })),
    hatVerbrauch: mitKosten.length > 0,
    gewaehlt: {
      key: gewaehltKey,
      label: monatLabel(gewaehltKey),
      summe: euroText(summe),
      anzahl: liste.length,
      zeilen: liste.map((l) => ({
        id: l.id,
        datum: kurzDatum(l.gestartetAm),
        werkzeug: findeWerkzeug(l.werkzeug)?.name ?? l.werkzeug,
        titel: l.dateiName ?? 'Skript',
        betrag: euroText(l.kostenEur),
        abgebrochen: l.status === 'abgebrochen',
      })),
    },
  }
}
