/**
 * Kosten der direkten Erstellung (PROJ-64) — reine Rechnungen ohne Server,
 * damit Oberfläche (Schätzung) und Server (genauer Betrag) dieselben Zahlen nutzen.
 *
 * Preise in Dollar je Million „Bausteine“ (Tokens), wie der Anbieter abrechnet.
 */

export interface ModellPreis {
  ein: number
  aus: number
  cache_schreiben: number
  cache_lesen: number
}

/** Verbrauch eines KI-Aufrufs, wie der Anbieter ihn meldet */
export interface Verbrauch {
  ein: number
  aus: number
  cacheSchreiben: number
  cacheLesen: number
}

export const LEER_VERBRAUCH: Verbrauch = { ein: 0, aus: 0, cacheSchreiben: 0, cacheLesen: 0 }

/** Ab diesem geschätzten Betrag fragt die App vor dem Start noch einmal nach */
export const RUECKFRAGE_AB_EUR = 2
/** Schutz vor versehentlichen Schleifen: direkte Läufe je Lehrkraft in 24 Stunden */
export const TAGESLIMIT = 20

// Erfahrungswerte für die Schätzung — echte Läufe zeigen, ob sie stimmen
const BAUSTEINE_JE_ZEICHEN = 0.3
/** Die festen Anweisungen des Prompts (~37.000 Zeichen) */
const ANWEISUNG_BAUSTEINE = 11_000
/** Die Antwort (YAML) ist etwas länger als der Skripttext, mindestens aber eine Grundmenge */
const ANTWORT_JE_SKRIPT_BAUSTEIN = 1.4
const ANTWORT_MINDESTENS = 5_000
/** Zuschlag für gelegentliche Nachbesserungen */
const NACHBESSERUNG_ZUSCHLAG = 1.15
const BAUSTEINE_JE_SEKUNDE = 70

export function addiere(a: Verbrauch, b: Verbrauch): Verbrauch {
  return {
    ein: a.ein + b.ein,
    aus: a.aus + b.aus,
    cacheSchreiben: a.cacheSchreiben + b.cacheSchreiben,
    cacheLesen: a.cacheLesen + b.cacheLesen,
  }
}

/** Genauer Betrag in Dollar aus der Verbrauchsangabe */
export function kostenUsd(v: Verbrauch, p: ModellPreis): number {
  const summe = v.ein * p.ein + v.aus * p.aus + v.cacheSchreiben * p.cache_schreiben + v.cacheLesen * p.cache_lesen
  return Math.round((summe / 1_000_000) * 1e6) / 1e6
}

export interface Schaetzung {
  eur: number
  /** gerundete Spanne in Minuten */
  minutenVon: number
  minutenBis: number
}

/**
 * Schätzung vor dem Start aus der Zeichenzahl je Teil. Der erste Teil schreibt
 * die Anweisungen in den Zwischenspeicher, die übrigen lesen sie günstig.
 */
export function schaetze(teileZeichen: number[], p: ModellPreis, usdEur: number): Schaetzung {
  let usd = 0
  let laengsteAntwort = 0
  teileZeichen.forEach((zeichen, i) => {
    const skript = zeichen * BAUSTEINE_JE_ZEICHEN
    const antwort = Math.max(ANTWORT_MINDESTENS, skript * ANTWORT_JE_SKRIPT_BAUSTEIN)
    laengsteAntwort = Math.max(laengsteAntwort, antwort)
    usd += kostenUsd(
      {
        ein: skript,
        aus: antwort,
        cacheSchreiben: i === 0 ? ANWEISUNG_BAUSTEINE : 0,
        cacheLesen: i === 0 ? 0 : ANWEISUNG_BAUSTEINE,
      },
      p,
    )
  })
  const sekunden = laengsteAntwort / BAUSTEINE_JE_SEKUNDE + 30
  return {
    eur: usd * NACHBESSERUNG_ZUSCHLAG * usdEur,
    minutenVon: Math.max(1, Math.floor(sekunden / 60)),
    minutenBis: Math.max(2, Math.ceil((sekunden * 1.6) / 60)),
  }
}

/** „0,15 €“ — unter einem Cent „< 0,01 €“ */
export function euro(betrag: number): string {
  if (betrag > 0 && betrag < 0.005) return '< 0,01 €'
  return `${betrag.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`
}

/** Satz unter „Direkt erstellen“: „ca. 0,15 € · etwa 1–2 Minuten“ */
export function schaetzungsSatz(s: Schaetzung): string {
  const zeit = s.minutenVon === s.minutenBis ? `${s.minutenVon}` : `${s.minutenVon}–${s.minutenBis}`
  return `ca. ${euro(Math.max(0.01, s.eur))} · etwa ${zeit} Minuten`
}
