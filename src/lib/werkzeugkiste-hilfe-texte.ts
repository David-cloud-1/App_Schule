/**
 * PROJ-87: Hilfetexte des Assistenten „Schritt für Schritt“ — zentral und ohne
 * Oberflächen-Code, damit sie als Ganzes gegengelesen und geändert werden
 * können. Nur reine Daten. Regeln (vom Test `werkzeugkiste-hilfe.test.ts`
 * erzwungen):
 *  • Anweisung höchstens 20 Wörter, Überschrift + Anweisung + Beispiel +
 *    „Fertig, wenn …“ zusammen höchstens 40 Wörter („Mehr dazu“ zählt nicht)
 *  • duzen, einfaches Deutsch, keine Wörter aus der Verbotsliste
 *  • „Prompt“ steht nur einmal in Klammern („Auftrag an die KI (Prompt)“) oder
 *    in Anführungszeichen, wenn ein Knopf der Oberfläche so heißt
 */

export type HilfeVariante = 'skript' | 'video' | 'einstellungen' | 'auftrag' | 'teile' | 'antwort' | 'fertig'

/** Stellen im Formular, auf die „Zeig mir die Stelle“ zeigt (Attribut `data-hilfe`) */
export type HilfeStelle =
  | 'datei'
  | 'auswahl'
  | 'einstellungen'
  | 'kopieren'
  | 'teile'
  | 'antwortfeld'
  | 'kontrolle'
  | 'herunterladen'
  | 'weiter'
  | 'transkript'

export interface HilfeSeite {
  /** Überschrift der Hilfeseite */
  ueberschrift: string
  /** Ein Satz, höchstens 20 Wörter */
  anweisung: string
  /** Ein Beispiel in einer Zeile */
  beispiel: string
  /** „Fertig, wenn …“ — ein Satz */
  fertigWenn: string
  /** Längere Erklärung, standardmäßig zugeklappt */
  mehrDazu?: string
  /** Worauf „Zeig mir die Stelle“ zeigt, solange der Schritt offen ist */
  zeige?: HilfeStelle
  /** Worauf es zeigt, wenn der Schritt erledigt ist */
  zeigeErledigt?: HilfeStelle
}

export type HilfeProblemId =
  | 'lesen'
  | 'gross'
  | 'zu_lang'
  | 'unvollstaendig'
  | 'passt_nicht'
  | 'kontrolle_fehler'
  | 'bilder_fehlen'
  | 'allgemein'

export interface HilfeProblem {
  /** Ein Satz: was ist passiert? */
  was: string
  /** Ein Satz: was tust du jetzt? */
  tun: string
  /** Optionaler Knopf; der Text dahinter kommt aus dem Ablauf */
  knopf?: 'nachbesserung'
}

/** Standardseiten der sieben Schritt-Varianten */
export const HILFE_SEITEN: Record<HilfeVariante, HilfeSeite> = {
  skript: {
    ueberschrift: 'Skript hochladen',
    anweisung: 'Ziehe dein Skript in das Feld oder wähle die Datei aus.',
    beispiel: 'Zum Beispiel: Haftung_im_Frachtrecht.docx',
    fertigWenn: 'Fertig, wenn dort „… gelesen“ in Grün steht.',
    mehrDazu:
      'Word funktioniert am besten, PDF und PowerPoint gehen auch. Rot markierter Text gilt als Lösung. Bitte lade keine Schülerdaten hoch, nur Unterrichtsmaterial.',
    zeige: 'datei',
    zeigeErledigt: 'weiter',
  },
  video: {
    ueberschrift: 'Transkript einfügen',
    anweisung: 'Füge den Link zum Video und den Text des Videos ein.',
    beispiel: 'Zum Beispiel: der Text aus der Untertitel-Funktion.',
    fertigWenn: 'Fertig, wenn Link und Text eingefügt sind.',
    mehrDazu: 'Die KI sieht das Video nicht, sondern liest nur den Text, den du hier einfügst.',
    zeige: 'transkript',
    zeigeErledigt: 'weiter',
  },
  einstellungen: {
    ueberschrift: 'Was soll daraus werden?',
    anweisung: 'Wähle das Format und das Niveau für dein Material.',
    beispiel: 'Zum Beispiel: Interaktive Seite, Niveau mittel.',
    fertigWenn: 'Fertig, wenn du unten auf „Prompt erstellen“ geklickt hast.',
    mehrDazu: 'Die Voreinstellung passt meistens. Weitere Angaben wie Bildungsgang und Lernfeld sind freiwillig.',
    zeige: 'einstellungen',
    zeigeErledigt: 'weiter',
  },
  auftrag: {
    ueberschrift: 'Auftrag an die KI (Prompt) kopieren',
    anweisung: 'Klicke auf den grünen Knopf. Öffne die KI und füge den Text dort ein.',
    beispiel: 'Zum Beispiel Bayerncloud KI, ChatGPT oder Copilot.',
    fertigWenn: 'Fertig, wenn die KI ihre Antwort geschrieben hat.',
    mehrDazu: 'Kopiere am Ende die ganze Antwort der KI, nicht nur einen Teil davon.',
    zeige: 'kopieren',
    zeigeErledigt: 'weiter',
  },
  teile: {
    ueberschrift: 'Dein Skript in Teilen',
    anweisung: 'Kopiere Teil 1 in die KI und füge ihre Antwort bei Teil 1 ein.',
    beispiel: 'Danach folgt Teil 2, bis alle Teile eine Antwort haben.',
    fertigWenn: 'Fertig, wenn alle Teile eine Antwort haben.',
    mehrDazu:
      'Ein langes Skript passt nicht in eine einzige Eingabe. Darum teilt die App es in Stücke, die du nacheinander bearbeitest.',
    zeige: 'teile',
    zeigeErledigt: 'weiter',
  },
  antwort: {
    ueberschrift: 'Antwort der KI einfügen',
    anweisung: 'Kopiere die ganze Antwort der KI und füge sie in das Feld ein.',
    beispiel: 'Die Kontrolle startet nach dem Einfügen von allein.',
    fertigWenn: 'Fertig, wenn die Kontrolle keine Fehler meldet.',
    mehrDazu: 'Die Kontrolle prüft nur, ob die Antwort vollständig und lesbar ist. Dafür braucht die App keine KI, das kostet nichts.',
    zeige: 'antwortfeld',
    zeigeErledigt: 'weiter',
  },
  fertig: {
    ueberschrift: 'Material herunterladen',
    anweisung: 'Klicke auf „Herunterladen“ und speichere die Datei.',
    beispiel: 'Die Datei landet in deinem Download-Ordner.',
    fertigWenn: 'Fertig, wenn die Datei auf deinem Gerät liegt.',
    mehrDazu: 'Unter „Meine Materialien“ findest du das Material später wieder.',
    zeige: 'herunterladen',
  },
}

/**
 * Abweichungen je Werkzeug (Teil 2): nur die Stellen, die vom Grundmuster
 * abweichen. Ein Werkzeug steht in `HILFE_WERKZEUGE` (werkzeugkiste-hilfe.ts),
 * sobald alle seine Seiten gegengelesen sind.
 */
export const HILFE_ABWEICHUNGEN: Record<string, Partial<Record<HilfeVariante, Partial<HilfeSeite>>>> = {}

/** Handlungshilfen für die Problemfälle der Kontrolle und des Hochladens */
export const HILFE_PROBLEME: Record<HilfeProblemId, HilfeProblem> = {
  lesen: {
    was: 'Dein Skript konnte nicht gelesen werden.',
    tun: 'Lade es noch einmal hoch oder nimm eine andere Datei. Word, PDF und PowerPoint gehen.',
  },
  gross: {
    was: 'Die Datei ist größer als 50 MB.',
    tun: 'Verkleinere die Bilder im Skript oder teile es in zwei Dateien.',
  },
  zu_lang: {
    was: 'Die Antwort ist zu lang für ein einziges Feld.',
    tun: 'Wähle in Schritt 1 weniger Seiten aus oder nutze die Teile in Schritt 3.',
  },
  unvollstaendig: {
    was: 'Die Antwort der KI wurde mittendrin abgebrochen.',
    tun: 'Folge der Box unter dem Feld. Sie holt den fehlenden Rest bei der KI nach.',
  },
  passt_nicht: {
    was: 'Die Antwort passt nicht zu diesem Werkzeug.',
    tun: 'Nimm den Auftrag aus Schritt 3 und füge die neue Antwort der KI ein.',
  },
  kontrolle_fehler: {
    was: 'Die Kontrolle hat etwas gefunden.',
    tun: 'Schicke den Nachbesserungs-Auftrag in dieselbe KI-Unterhaltung und füge die neue Antwort ein.',
    knopf: 'nachbesserung',
  },
  bilder_fehlen: {
    was: 'In der Antwort fehlen Bilder oder Lösungen.',
    tun: 'Schicke den Nachbesserungs-Auftrag in dieselbe KI-Unterhaltung und füge die neue Antwort ein.',
    knopf: 'nachbesserung',
  },
  allgemein: {
    was: 'Das hat nicht geklappt.',
    tun: 'Versuche es noch einmal oder lade eine andere Datei hoch.',
  },
}

/** Diese Wörter gehören nicht in einen Hilfetext (Test) */
export const HILFE_VERBOTEN = [
  'token',
  'payload',
  'parser',
  'endpoint',
  'yaml',
  'json',
  'api',
  'prüfstelle',
  'server',
  'fehlercode',
  'stacktrace',
] as const
