/**
 * Wörterliste des Lehrkräfte-Bereichs (PROJ-130, Abschnitt D) — ein Wort, eine Bedeutung.
 *
 * Namen, die an mehreren Stellen stehen (Menü, Seitenkopf, Schnellsuche), kommen von hier.
 * Der Wächter-Test `begriffe.test.ts` schlägt fehl, wenn ein alter Begriff wieder in einem
 * sichtbaren Text auftaucht. Die lesbare Fassung steht in `docs/DESIGN.md`.
 *
 * Datenbank, Adressen und Code-Namen (`departments`, `exam_sets`, `/admin/kalender`) bleiben.
 */
export const BEGRIFFE = {
  /** Spedition oder Tourismus */
  bereich: 'Bereich',
  /** Super-Admin-Seite: Menüname und Seitentitel */
  bereicheAnlegen: 'Bereiche anlegen',
  bereiche: 'Bereiche',
  bereichsEinstellungen: 'Einstellungen des Bereichs',
  /** Frei und ohne Note */
  uebungspruefung: 'Übungsprüfung',
  uebungspruefungen: 'Übungsprüfungen',
  /** Jahrgangsstufe 10, 11, 12. „Klasse“ heißt nur noch SP10C usw. */
  stufe: 'Stufe',
  /** Abschnitt einer Lernseite im Baukasten. „Thema“ heißt nur noch Lernthema */
  kapitel: 'Kapitel',
  abwesenheiten: 'Abwesenheiten',
  vertretungFehlt: 'Vertretung fehlt',
  fuerAzubis: 'Für Azubis (Link)',
  fuersKollegium: 'Fürs Kollegium (Regal)',
  aenderungenUebernehmen: 'Änderungen übernehmen',
  kopieBearbeiten: 'Kopie bearbeiten',
  eigeneSeiteBauen: 'Eigene Seite bauen',
  shopGegenstaende: 'Shop-Gegenstände',
  lernrunde: 'Lernrunde',
  auftragFuerDieKi: 'Auftrag für die KI',
  antwortDerKi: 'Antwort der KI',
} as const

/** Erklärt im Abwesenheits-Dialog den Unterschied zum Bereich der App */
export const ABTEILUNG_ERKLAERUNG =
  'Abteilung der Schule (z. B. Spedition, Touristik, KEP) – nicht dasselbe wie der Bereich in der App.'

export interface AlterBegriff {
  muster: RegExp
  stattdessen: string
}

/** Begriffe, die in keinem sichtbaren Text des Lehrkräfte-Bereichs mehr stehen dürfen */
export const ALTE_BEGRIFFE: readonly AlterBegriff[] = [
  { muster: /Fachbereich|Zielbereich/, stattdessen: BEGRIFFE.bereich },
  { muster: /Prüfungssimulation|Prüfungs-?[Ss]et|Prüfung üben/, stattdessen: BEGRIFFE.uebungspruefung },
  { muster: /Klassenstufe|\bKl\. /, stattdessen: BEGRIFFE.stufe },
  { muster: /\bKalender(?!woche)/, stattdessen: BEGRIFFE.abwesenheiten },
  { muster: /Vertretung offen/, stattdessen: BEGRIFFE.vertretungFehlt },
  { muster: /Link für alle|[Öö]ffentliche[nr]? Links?|Nur öffentliche/, stattdessen: BEGRIFFE.fuerAzubis },
  { muster: /Teilen …|Material teilen/, stattdessen: BEGRIFFE.fuersKollegium },
  { muster: /Nicht veröffentlicht|[Uu]nveröffentlicht/, stattdessen: BEGRIFFE.aenderungenUebernehmen },
  { muster: /Leere Seite anlegen/, stattdessen: BEGRIFFE.eigeneSeiteBauen },
  { muster: /\bItems?\b/, stattdessen: BEGRIFFE.shopGegenstaende },
  { muster: /\bLvl\b/, stattdessen: 'Level' },
  { muster: /\bSessions?\b|Lern-Session/, stattdessen: BEGRIFFE.lernrunde },
  { muster: /\bPrompts?\b|Prompt-|-Prompt/, stattdessen: BEGRIFFE.auftragFuerDieKi },
  { muster: /Nicht zu verwechseln/, stattdessen: 'eine Beschreibung in einem Satz' },
]
