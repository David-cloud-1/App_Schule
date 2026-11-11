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
  | 'hinweise'
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
    mehrDazu:
      'Die Kontrolle prüft nur, ob die Antwort vollständig und lesbar ist. Dafür braucht die App keine KI, das kostet nichts. Meldet sie Hinweise, zum Beispiel fehlende Tabellen oder Bilder, wird das Material trotzdem gebaut, nur mit Lücken. Du hast dann drei Möglichkeiten. Erstens: Du lässt es so, wenn es dir reicht. Zweitens: Du kopierst den „Nachbesserungs-Prompt“, fügst ihn in dieselbe KI-Unterhaltung ein und ersetzt oben die Antwort durch die neue. Die KI ergänzt dann nur das Fehlende. Drittens: Unter dem Antwortfeld änderst du einzelne Stellen. „Tippfehler direkt korrigieren“ geht ohne KI, „Ein einzelnes Kapitel neu anfragen“ holt nur ein Kapitel neu von der KI. Alles andere bleibt, wie es ist.',
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
export const HILFE_ABWEICHUNGEN: Record<string, Partial<Record<HilfeVariante, Partial<HilfeSeite>>>> = {
  kreativ: {
    einstellungen: {
      mehrDazu:
        'Die Voreinstellung passt meistens. Unter „Mehr Optionen“ stellst du ein, ob alleine, zu zweit oder in Gruppen gearbeitet wird.',
    },
  },
  differenzierung: {
    einstellungen: {
      anweisung: 'Wähle, wonach differenziert wird, die Stufen und das Format.',
      beispiel: 'Zum Beispiel: Lernniveau, drei Stufen, Word-Dokument.',
      mehrDazu:
        'Zwei bis drei Stufen sind besser als vier, dann bleibt die Antwort der KI übersichtlich. Alle Stufen stehen in einer Datei.',
    },
  },
  kahoot: {
    einstellungen: {
      anweisung: 'Wähle die Anzahl der Fragen und das Niveau.',
      beispiel: 'Zum Beispiel: 12 Fragen, Niveau mittel.',
      mehrDazu:
        'Das Zeitlimit pro Frage findest du unter „Mehr Optionen“. „Automatisch“ lässt die KI es nach der Schwierigkeit wählen.',
    },
    antwort: { beispiel: 'Die Kontrolle startet von allein und meldet zu lange Fragen.' },
    fertig: {
      anweisung: 'Lade die Excel-Datei herunter und importiere sie in Kahoot.',
      beispiel: 'In Kahoot: „Quiz erstellen“, dann „Importieren“.',
      mehrDazu:
        'Kahoot erlaubt höchstens 95 Zeichen je Frage und 60 je Antwort. Zu lange Texte meldet die Kontrolle schon vorher. Spiele das Quiz vor dem Unterricht einmal selbst durch.',
    },
  },
  moodle: {
    einstellungen: {
      anweisung: 'Wähle die Anzahl der Fragen, die Fragetypen und das Niveau.',
      beispiel: 'Zum Beispiel: 20 Fragen, Multiple Choice und Wahr/Falsch.',
      mehrDazu:
        'Unter „Mehr Optionen“ legst du den Ordner in der Fragensammlung fest. So landen die Fragen gleich in der richtigen Kategorie.',
    },
    fertig: {
      anweisung: 'Lade die Textdatei herunter und importiere sie in Moodle.',
      beispiel: 'In Moodle: Fragensammlung, „Importieren“, Format „GIFT“.',
      mehrDazu: 'Schau dir nach dem Import in der Vorschau eine Frage von jedem Typ an.',
    },
  },
  learningapps: {
    einstellungen: {
      anweisung: 'Wähle die Übungsarten und wie viele Elemente jede Übung hat.',
      beispiel: 'Zum Beispiel: Paare zuordnen und Lückentext, 8 Elemente.',
      mehrDazu:
        'Wähle nur die Übungsarten, die du wirklich brauchst. Jede Art ergibt eigene Übungen. Für den Einstieg reichen 6 bis 8 Elemente.',
    },
    fertig: {
      ueberschrift: 'Texte in LearningApps einfügen',
      anweisung: 'Kopiere den Text einer Übung und füge ihn im Editor von learningapps.org ein.',
      beispiel: 'Zu jeder Übung gibt es einen eigenen Text mit „Kopieren“.',
      fertigWenn: 'Fertig, wenn alle Übungen in LearningApps angelegt sind.',
      mehrDazu: 'Löse die fertige Übung einmal selbst, bevor du den Link teilst.',
      zeige: undefined,
    },
  },
  youtube: {
    video: {
      mehrDazu:
        'Die KI sieht das Video nicht, sondern liest nur den Text. So kommst du daran: Video auf youtube.com öffnen, die Beschreibung mit „…mehr“ aufklappen, „Transkript anzeigen“ wählen und den Text kopieren.',
    },
    einstellungen: {
      anweisung: 'Wähle das Format, das Niveau und die Fragetypen.',
      beispiel: 'Zum Beispiel: Word-Dokument, Niveau mittel.',
      mehrDazu:
        'Unter „Mehr Optionen“ kannst du die Videolänge eintragen, zum Beispiel 8:30. Dann verteilt die KI die Fragen über das ganze Video. Jede Frage trägt eine Zeitmarke, prüfe ein, zwei davon.',
    },
  },
  arbeitsblatt: {
    einstellungen: {
      anweisung: 'Wähle das Format, das Niveau und die Anzahl der Aufgaben.',
      beispiel: 'Zum Beispiel: Word-Dokument, mittel, 12 Aufgaben.',
      mehrDazu:
        'Zehn bis fünfzehn Aufgaben reichen meist für eine Stunde. Die Bearbeitungszeit stellst du unter „Mehr Optionen“ ein, die KI passt den Umfang daran an.',
    },
    fertig: {
      anweisung: 'Lade die Datei herunter. Bei Word liegen Arbeitsblatt und Lösungsblatt in einer ZIP-Datei.',
      beispiel: 'ZIP-Datei mit Doppelklick öffnen, dann erscheinen beide Blätter.',
      mehrDazu: 'Das Lösungsblatt ist nur für dich. Kontrolliere es kurz, bevor du es benutzt. Die KI kann sich verrechnen.',
    },
  },
  lernsituation: {
    einstellungen: {
      anweisung: 'Wähle die Sozialform, das Niveau und das Format.',
      beispiel: 'Zum Beispiel: Partnerarbeit, Niveau mittel, Word-Dokument.',
      mehrDazu:
        'Die Bearbeitungszeit steht unter „Mehr Optionen“. Plane sie lieber etwas knapper, dann bleibt Zeit für die Besprechung. „Automatisch“ bei der Sozialform lässt die KI abwechseln.',
    },
    fertig: {
      anweisung: 'Lade die Datei herunter. Bei Word liegen Material und Handreichung in einer ZIP-Datei.',
      beispiel: 'ZIP-Datei mit Doppelklick öffnen, dann erscheinen beide Dateien.',
      mehrDazu: 'Das Material ist für die Klasse, die Handreichung nur für dich.',
    },
  },
  pruefung: {
    einstellungen: {
      anweisung: 'Wähle das Format, die Bearbeitungszeit und das Niveau.',
      beispiel: 'Zum Beispiel: Word-Dokument, 45 Minuten, Niveau mittel.',
      mehrDazu:
        'Unter „Mehr Optionen“ stellst du Aufgabentypen, den Anteil Multiple Choice und den Notenschlüssel ein. Ohne eigene Angaben gilt der IHK-Schlüssel.',
    },
    fertig: {
      anweisung: 'Lade die Datei herunter. Bei Word liegen Schülerblatt und Lösungsblatt in einer ZIP-Datei.',
      beispiel: 'ZIP-Datei mit Doppelklick öffnen, dann erscheinen beide Dateien.',
      mehrDazu:
        'Das Lösungsblatt mit Erwartungshorizont und Notenschlüssel ist nur für dich. Kontrolliere Punkte und Lösungen kurz, bevor die Arbeit geschrieben wird. Die KI kann sich verrechnen.',
    },
  },
  lied: {
    einstellungen: {
      anweisung: 'Wähle die Musikrichtung und wie viele Lieder entstehen sollen.',
      beispiel: 'Zum Beispiel: Rap, ein Lied je Kapitel.',
      mehrDazu:
        'Das Niveau steht unter „Mehr Optionen“. „Nur Refrain-Merksprüche“ passt für kurze Sprüche zum Auswendiglernen.',
    },
    fertig: {
      anweisung: 'Lade die ZIP-Datei herunter. Darin liegen Liedtext, Karaoke-Blatt und ein fertiger Text für die Musik-KI.',
      beispiel: 'Eine Musik-KI findest du zum Beispiel auf suno.com.',
      mehrDazu:
        'Prüfe den Liedtext fachlich, bevor du ihn austeilst. Das Karaoke-Blatt funktioniert auch ohne Musik: Die Klasse kann den Text gemeinsam sprechen.',
    },
  },
}

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
    was: 'Die Antwort ist nicht lesbar, daraus wird noch kein Material.',
    tun: 'Bitte die KI in derselben Unterhaltung um die ganze Antwort und füge die neue ein.',
    knopf: 'nachbesserung',
  },
  hinweise: {
    was: 'Die Kontrolle hat Hinweise gefunden. Das Material wird trotzdem gebaut.',
    tun: 'Du kannst es so lassen. Willst du es genauer, kopiere den „Nachbesserungs-Prompt“, schicke ihn in dieselbe KI-Unterhaltung und ersetze die Antwort durch die neue.',
    knopf: 'nachbesserung',
  },
  bilder_fehlen: {
    was: 'Bilder, Tabellen oder Lösungen fehlen. Das Material wird trotzdem gebaut, nur mit Lücken.',
    tun: 'Lass es so oder kopiere den „Nachbesserungs-Prompt“. Die KI ergänzt dann nur das Fehlende, du ersetzt die Antwort durch die neue.',
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
