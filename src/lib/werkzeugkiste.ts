import {
  BarChart3,
  BookOpen,
  Briefcase,
  ClipboardCheck,
  FileText,
  LayoutGrid,
  ListChecks,
  MonitorPlay,
  Mic,
  Music,
  Sparkles,
  Timer,
  type LucideIcon,
} from 'lucide-react'

/**
 * Werkzeugkiste im Lehrkräfte-Bereich (PROJ-51 ff.) — einzige Quelle für die
 * Werkzeugliste der Startseite und die Werkzeug-Wahl im Ablauf. Die IDs sind
 * die Werkzeug-Schlüssel des Python-Kerns (`TOOLS` in prompts.py).
 *
 * Ein Werkzeug freischalten (PROJ-54) = `aktiv: true` setzen.
 */

export type WerkzeugGruppeId = 'selbstlernen' | 'ueben' | 'unterricht' | 'hoeren'

export interface WerkzeugGruppe {
  id: WerkzeugGruppeId
  label: string
  /** Token-Farbe der Gruppe für Icon-Kachel (ws-<farbe>) */
  farbe: 'green' | 'blue' | 'orange' | 'gold'
}

export const WERKZEUG_GRUPPEN: WerkzeugGruppe[] = [
  { id: 'selbstlernen', label: 'Selbstlernen', farbe: 'green' },
  { id: 'ueben', label: 'Üben & Wiederholen', farbe: 'blue' },
  { id: 'unterricht', label: 'Unterricht & Prüfung', farbe: 'orange' },
  { id: 'hoeren', label: 'Zum Hören', farbe: 'gold' },
]

export interface WerkzeugFormat {
  id: string
  label: string
  /** Ein Satz unter dem Format, z. B. „Ergebnisse zählen im Notenbuch“ */
  hinweis: string
}

export interface FeldOption {
  key: string
  label: string
}

/** Woher die Auswahl eines Feldes kommt: feste Liste oder Auswahllisten des Kerns */
export type FeldQuelle = 'niveaus' | 'bildungsgaenge' | 'lernfelder' | 'umfaenge'

/**
 * Eine Einstellung in Schritt 2 (PROJ-54). Jedes Werkzeug beschreibt seine
 * Einstellungen hier; die Oberfläche zeichnet sich daraus selbst (kein
 * Sonderlayout je Werkzeug). Höchstens drei Felder je Werkzeug stehen `direkt`
 * sichtbar, der Rest unter „Mehr Optionen“.
 */
export interface EinstellungsFeld {
  /** Schlüssel in den Einstellungen (und im Kern) */
  id: string
  label: string
  /** schalter = Knopfleiste (wenige Optionen) · wahl = Auswahlliste · zahl = Zahlenfeld · mehrfach = Häkchen, Werte kommagetrennt · text = kurzer Freitext */
  art: 'schalter' | 'wahl' | 'zahl' | 'mehrfach' | 'text'
  ort: 'direkt' | 'mehr'
  standard: string
  /** Feste Auswahl; alternativ `quelle` */
  optionen?: FeldOption[]
  quelle?: FeldQuelle
  /** Beschriftung für „nichts gewählt“ (nur bei wahl); ohne Angabe gibt es diese Möglichkeit nicht */
  leer?: string
  /** zahl */
  min?: number
  max?: number
  schritt?: number
  einheit?: string
  /** mehrfach: höchstens so viele Häkchen */
  hoechstens?: number
  /** Optionen und Standard hängen vom Wert eines anderen Feldes ab (z. B. Stufen je „Art“) */
  abhaengigVon?: { feld: string; optionen: Record<string, FeldOption[]>; standard: Record<string, string> }
  /** Ein Satz unter dem Feld */
  hinweis?: string
  /** text: Beispiel im leeren Feld */
  platzhalter?: string
  /** Das Feld erscheint nur, wenn ein anderes Feld diesen Wert hat (z. B. Notengrenzen bei freiem Notenschlüssel) */
  sichtbarWenn?: { feld: string; wert: string }
}

export interface Werkzeug {
  id: string
  name: string
  gruppe: WerkzeugGruppeId
  /** Eine Zeile Erklärung (Startseite und Schritt 2) */
  beschreibung: string
  icon: LucideIcon
  /** Bis zur Freischaltung (PROJ-54) als „kommt bald“ sichtbar, aber nicht wählbar */
  aktiv: boolean
  /** Mehr als ein Format → Auswahl in Schritt 2; das erste ist vorgewählt */
  formate: WerkzeugFormat[]
  /** Einstellungen in Schritt 2 (ohne Format) */
  felder: EinstellungsFeld[]
  /** Die bisherigen „Tipps je Werkzeug“, aufklappbar in Schritt 2 */
  tipps?: string[]
  /** Was die Lehrkraft in Schritt 1 gibt: ein Skript (Standard) oder ein Video-Transkript (Video-Fragen) */
  eingabe?: 'skript' | 'video'
}

const H5P: WerkzeugFormat = { id: 'h5p', label: 'H5P für Moodle', hinweis: 'Ergebnisse zählen im Notenbuch' }
const SEITE: WerkzeugFormat = { id: 'seite', label: 'Interaktive Seite', hinweis: 'Zum Üben, auch offline und druckbar' }

// ── Wiederkehrende Einstellungen ────────────────────────────────────────────

const NIVEAU: EinstellungsFeld = { id: 'niveau', label: 'Niveau', art: 'schalter', ort: 'direkt', standard: 'mittel', quelle: 'niveaus' }
const BILDUNGSGANG: EinstellungsFeld = { id: 'bildungsgang', label: 'Bildungsgang', art: 'wahl', ort: 'mehr', standard: 'auto', quelle: 'bildungsgaenge' }
const LERNFELD: EinstellungsFeld = { id: 'lernfeld', label: 'Lernfeld', art: 'wahl', ort: 'mehr', standard: '', quelle: 'lernfelder', leer: 'keins' }
const UMFANG: EinstellungsFeld = { id: 'umfang', label: 'Umfang', art: 'wahl', ort: 'mehr', standard: '', quelle: 'umfaenge', leer: 'nach Skript' }
const SOZIALFORM: EinstellungsFeld = {
  id: 'sozialform',
  label: 'Sozialform',
  art: 'wahl',
  ort: 'direkt',
  standard: 'auto',
  optionen: [
    { key: 'auto', label: 'Automatisch (gemischt)' },
    { key: 'einzel', label: 'Einzelarbeit' },
    { key: 'partner', label: 'Partnerarbeit' },
    { key: 'gruppe', label: 'Gruppenarbeit' },
    { key: 'mix', label: 'Gemischt (Wechsel)' },
  ],
}
const DAUER: EinstellungsFeld = {
  id: 'dauer',
  label: 'Bearbeitungszeit',
  art: 'zahl',
  ort: 'mehr',
  standard: '60',
  min: 10,
  max: 1350,
  schritt: 5,
  einheit: 'Minuten',
}

/** Felder, die ein noch nicht umgezogenes Werkzeug vorläufig hat (werden in seinem Paket ersetzt) */
const VORLAEUFIG: EinstellungsFeld[] = [NIVEAU, BILDUNGSGANG, LERNFELD]

const WORD_ZIP = (hinweis: string): WerkzeugFormat => ({ id: 'word', label: 'Word-Dokument', hinweis })
const WORD: WerkzeugFormat = WORD_ZIP('Zum Ausdrucken und Bearbeiten')

const STUFEN_LERN: FeldOption[] = [
  { key: 'leichte_sprache', label: 'Leichte Sprache' },
  { key: 'leicht', label: 'leicht' },
  { key: 'mittel', label: 'mittel' },
  { key: 'schwer', label: 'schwer' },
]
const STUFEN_CEFR: FeldOption[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].map((k) => ({ key: k, label: k }))

export const WERKZEUGE: Werkzeug[] = [
  {
    id: 'skript',
    name: 'Ganzes Skript',
    gruppe: 'selbstlernen',
    beschreibung: 'Skript vollständig interaktiv',
    icon: BookOpen,
    aktiv: true,
    formate: [H5P, SEITE],
    tipps: [
      'Aus Ihrem Skript wird ein interaktives Lernheft: Die Schülerinnen und Schüler lesen und beantworten zwischendurch Fragen.',
      'Wählen Sie „Interaktive Seite“, wenn die Datei einfach per Doppelklick im Browser aufgehen soll. „H5P für Moodle“ brauchen Sie nur, wenn die Ergebnisse in Moodle zählen sollen.',
      'Ist Ihr Skript sehr lang, wählen Sie in Schritt 1 nur einen Teil aus. Die KI kann sonst mittendrin aufhören.',
      'Wenn Sie unsicher sind, lassen Sie alles so, wie es voreingestellt ist.',
    ],
    felder: [NIVEAU, BILDUNGSGANG, LERNFELD, UMFANG],
  },
  {
    id: 'kreativ',
    name: 'Kreative Einheit',
    gruppe: 'selbstlernen',
    beschreibung: 'Schüler erarbeiten es selbst',
    icon: Sparkles,
    aktiv: true,
    formate: [H5P, SEITE],
    tipps: [
      'Hier arbeiten die Schülerinnen und Schüler den Stoff selbst durch, statt ihn nur zu lesen. Das passt gut für eine Stunde ohne Lehrkraft vorn.',
      'Wählen Sie bei „Format“ „Interaktive Seite“, wenn Sie das Ergebnis einfach per Doppelklick im Browser öffnen möchten. „H5P für Moodle“ brauchen Sie nur, wenn die Aufgaben in Moodle hochgeladen werden sollen.',
      'Unter „Mehr Optionen“ stellen Sie ein, wie lange die Klasse daran arbeiten soll (zum Beispiel eine Einzelstunde) und ob alleine, zu zweit oder in Gruppen gearbeitet wird.',
      'Wenn Sie unsicher sind, lassen Sie alles so, wie es voreingestellt ist. Das passt in den meisten Fällen.',
    ],
    felder: [NIVEAU, BILDUNGSGANG, LERNFELD, UMFANG, { ...SOZIALFORM, ort: 'mehr' }],
  },
  {
    id: 'differenzierung',
    name: 'Differenzierung',
    gruppe: 'selbstlernen',
    beschreibung: 'Dasselbe in mehreren Stufen',
    icon: BarChart3,
    aktiv: true,
    formate: [WORD, H5P, SEITE],
    // Prompt und Bau kennen weder Niveau noch Bildungsgang noch Lernfeld – sie bleiben hier weg
    tipps: [
      'Aus einem Text entstehen mehrere Fassungen für verschiedene Leistungsstärken, alle in einer Datei. So müssen Sie nicht mehrmals Material anfertigen.',
      '„Lernniveau“ eignet sich für Klassen mit unterschiedlicher Leistung. „CEFR-Sprachniveau“ (A1 bis C2) eignet sich für Klassen mit unterschiedlichen Deutschkenntnissen.',
      'Wählen Sie lieber zwei bis drei Stufen als vier. Das Ergebnis bleibt übersichtlich und die Antwort der KI wird nicht zu lang.',
      'Das Word-Format ist am einfachsten: Sie können die Datei ausdrucken und in Word noch ändern.',
    ],
    felder: [
      {
        id: 'art',
        label: 'Differenzieren nach',
        art: 'schalter',
        ort: 'direkt',
        standard: 'lernniveau',
        optionen: [
          { key: 'lernniveau', label: 'Lernniveau (leicht–schwer)' },
          { key: 'cefr', label: 'CEFR-Sprachniveau (A1–C2)' },
        ],
      },
      {
        id: 'stufen',
        label: 'Stufen',
        art: 'mehrfach',
        ort: 'direkt',
        standard: 'leicht,mittel,schwer',
        hoechstens: 4,
        hinweis: 'Alle gewählten Stufen stehen in einer Datei. Höchstens vier.',
        abhaengigVon: {
          feld: 'art',
          optionen: { lernniveau: STUFEN_LERN, cefr: STUFEN_CEFR },
          standard: { lernniveau: 'leicht,mittel,schwer', cefr: 'A2,B1,B2' },
        },
      },
    ],
  },
  {
    id: 'kahoot',
    name: 'Kahoot-Quiz',
    gruppe: 'ueben',
    beschreibung: 'Wiederholung, Stundeneinstieg',
    icon: Timer,
    aktiv: true,
    formate: [],
    tipps: [
      'Sie bekommen eine Excel-Datei, die Sie in Kahoot unter „Quiz erstellen“ → „Importieren“ hochladen.',
      'Kahoot erlaubt höchstens 95 Zeichen je Frage und 60 je Antwort. Zu lange Texte meldet die Prüfstelle, bevor die Datei entsteht.',
      '„Automatisch“ beim Zeitlimit lässt die KI die Zeit nach der Schwierigkeit der Frage wählen.',
      'Spielen Sie das Quiz vor dem Unterricht einmal selbst durch. So fallen unklare Fragen auf.',
    ],
    felder: [
      { id: 'anzahl', label: 'Anzahl Fragen', art: 'zahl', ort: 'direkt', standard: '12', min: 1, max: 30, schritt: 1 },
      NIVEAU,
      {
        id: 'zeitlimit',
        label: 'Zeitlimit pro Frage',
        art: 'wahl',
        ort: 'mehr',
        standard: 'auto',
        optionen: [
          { key: 'auto', label: 'Automatisch (KI entscheidet)' },
          ...[5, 10, 20, 30, 60, 90, 120].map((z) => ({ key: String(z), label: `${z} Sek.` })),
        ],
      },
      BILDUNGSGANG,
      LERNFELD,
    ],
  },
  {
    id: 'moodle',
    name: 'Moodle-Fragen',
    gruppe: 'ueben',
    beschreibung: 'Tests in der Lernplattform',
    icon: ListChecks,
    aktiv: true,
    formate: [],
    tipps: [
      'Sie bekommen eine GIFT-Textdatei. In Moodle importieren Sie sie in der Fragensammlung unter „Importieren“ mit dem Format „GIFT“.',
      'Mit dem Ordner unter „Mehr Optionen“ legen Sie fest, in welche Kategorie der Fragensammlung die Fragen kommen.',
      'Mischen Sie die Fragetypen: Multiple Choice und Wahr/Falsch für Wissen, Kurzantwort und Rechenergebnis für Anwendung.',
      'Prüfen Sie nach dem Import in Moodle eine Frage von jedem Typ in der Vorschau.',
    ],
    felder: [
      { id: 'anzahl', label: 'Anzahl Fragen', art: 'zahl', ort: 'direkt', standard: '20', min: 1, max: 60, schritt: 1 },
      {
        id: 'types',
        label: 'Fragetypen',
        art: 'mehrfach',
        ort: 'direkt',
        standard: 'mc,tf',
        optionen: [
          { key: 'mc', label: 'Multiple Choice' },
          { key: 'tf', label: 'Wahr/Falsch' },
          { key: 'short', label: 'Kurzantwort' },
          { key: 'num', label: 'Rechenergebnis' },
          { key: 'match', label: 'Zuordnung' },
          { key: 'cloze', label: 'Lückentext' },
          { key: 'ms', label: 'Mehrfachauswahl' },
        ],
      },
      NIVEAU,
      {
        id: 'kategorie',
        label: 'Ordner in der Fragensammlung (optional)',
        art: 'text',
        ort: 'mehr',
        standard: '',
        platzhalter: 'z. B. Speditionsrecht/Haftung',
      },
      BILDUNGSGANG,
      LERNFELD,
    ],
  },
  {
    id: 'learningapps',
    name: 'LearningApps',
    gruppe: 'ueben',
    beschreibung: 'Inhalte zum Kopieren',
    icon: LayoutGrid,
    aktiv: true,
    formate: [],
    tipps: [
      'Zu jeder Übung bekommen Sie einen eigenen Textblock mit „Kopieren“. Den fügen Sie im Editor von learningapps.org in die passende Vorlage ein.',
      'Wählen Sie unter „Vorlagen“ nur die Übungsarten, die Sie wirklich brauchen. Jede Art ergibt eigene Übungen.',
      '„Elemente je Übung“ bestimmt, wie viele Paare, Lücken oder Fragen eine Übung hat. Für den Einstieg reichen 6 bis 8.',
      'Öffnen Sie die fertige Übung in LearningApps einmal und lösen Sie sie selbst, bevor Sie den Link teilen.',
    ],
    felder: [
      {
        id: 'vorlagen',
        label: 'Vorlagen',
        art: 'mehrfach',
        ort: 'direkt',
        standard: 'zuordnung,lueckentext',
        optionen: [
          { key: 'zuordnung', label: 'Paare zuordnen' },
          { key: 'lueckentext', label: 'Lückentext' },
          { key: 'quiz', label: 'Multiple-Choice-Quiz' },
          { key: 'gruppen', label: 'Gruppen-Zuordnung' },
        ],
      },
      NIVEAU,
      { id: 'anzahl', label: 'Elemente je Übung', art: 'zahl', ort: 'direkt', standard: '8', min: 4, max: 20, schritt: 1 },
      BILDUNGSGANG,
    ],
  },
  {
    id: 'youtube',
    name: 'Video-Fragen',
    gruppe: 'ueben',
    beschreibung: 'Arbeitsauftrag zu einem Video',
    icon: MonitorPlay,
    aktiv: true,
    eingabe: 'video',
    formate: [
      WORD_ZIP('Arbeitsblatt mit Fragen, Zeitmarken und Musterlösung'),
      { id: 'video', label: 'H5P Interactive Video', hinweis: 'Fragen erscheinen im Video, Ergebnisse zählen in Moodle' },
      { id: 'quiz', label: 'H5P Quiz', hinweis: 'Fragenset zum Video, ohne eingebettetes Video' },
    ],
    tipps: [
      'Die KI sieht das Video nicht, sondern nur das Transkript. Die Fragen sind also so gut wie das Transkript, das Sie einfügen.',
      'So kommen Sie an das Transkript: Video auf youtube.com öffnen, die Beschreibung mit „…mehr“ aufklappen und „Transkript anzeigen“ wählen. Dann den Text markieren und kopieren.',
      'Jede Frage trägt eine Zeitmarke. So finden Sie die Stelle im Video schnell wieder. Prüfen Sie ein, zwei Marken stichprobenartig.',
      'Ist das Video lang, tragen Sie unter „Mehr Optionen“ die Videolänge ein. Dann verteilt die KI die Fragen über das ganze Video.',
    ],
    felder: [
      NIVEAU,
      { id: 'anzahl', label: 'Anzahl Fragen', art: 'zahl', ort: 'mehr', standard: '12', min: 1, max: 40, schritt: 1 },
      {
        id: 'types',
        label: 'Fragetypen',
        art: 'mehrfach',
        ort: 'mehr',
        standard: 'mc,cloze,tf',
        optionen: [
          { key: 'mc', label: 'Multiple Choice' },
          { key: 'cloze', label: 'Lückentext' },
          { key: 'tf', label: 'Wahr/Falsch' },
          { key: 'open', label: 'Offen (Freitext)' },
        ],
      },
      { id: 'videolen', label: 'Videolänge (optional)', art: 'text', ort: 'mehr', standard: '', platzhalter: 'mm:ss, z. B. 8:30' },
      BILDUNGSGANG,
      LERNFELD,
    ],
  },
  {
    id: 'arbeitsblatt',
    name: 'Arbeitsblatt',
    gruppe: 'unterricht',
    beschreibung: 'Blatt mit Lösung',
    icon: FileText,
    aktiv: true,
    formate: [WORD_ZIP('ZIP mit Arbeitsblatt und Lösungsblatt'), SEITE],
    tipps: [
      'Sie bekommen ein Arbeitsblatt für die Klasse und ein Lösungsblatt nur für sich. Beides steckt in einer ZIP-Datei: Klicken Sie nach dem Herunterladen doppelt darauf, dann erscheinen beide Dateien.',
      'Geben Sie bei „Anzahl Aufgaben“ ein, wie viele Aufgaben das Blatt haben soll. Zehn bis fünfzehn sind für eine Stunde meist genug.',
      'Die Bearbeitungszeit finden Sie unter „Mehr Optionen“. Die KI passt den Umfang daran an.',
      'Kontrollieren Sie das Lösungsblatt kurz, bevor Sie es benutzen. Die KI kann sich verrechnen.',
    ],
    felder: [
      NIVEAU,
      { id: 'anzahl', label: 'Anzahl Aufgaben', art: 'zahl', ort: 'direkt', standard: '12', min: 1, max: 60, schritt: 1 },
      DAUER,
      BILDUNGSGANG,
      LERNFELD,
    ],
  },
  {
    id: 'lernsituation',
    name: 'Lernsituation',
    gruppe: 'unterricht',
    beschreibung: 'Betrieblicher Auftrag',
    icon: Briefcase,
    aktiv: true,
    formate: [WORD_ZIP('ZIP mit Material und Handreichung'), SEITE],
    tipps: [
      'Eine Lernsituation ist ein Auftrag aus dem Berufsalltag, den die Klasse Schritt für Schritt bearbeitet. Sie bekommen ein Material für die Klasse und eine Handreichung für sich.',
      'Beides steckt in einer ZIP-Datei: Klicken Sie nach dem Herunterladen doppelt darauf, dann erscheinen beide Dateien.',
      'Bei „Sozialform“ legen Sie fest, ob die Klasse alleine, zu zweit oder in Gruppen arbeitet. „Automatisch“ lässt die KI abwechseln.',
      'Planen Sie die Bearbeitungszeit realistisch ein (unter „Mehr Optionen“). Lieber etwas knapper, dann bleibt Zeit für die Besprechung.',
    ],
    felder: [SOZIALFORM, NIVEAU, DAUER, BILDUNGSGANG, LERNFELD],
  },
  {
    id: 'pruefung',
    name: 'Klassenarbeit',
    gruppe: 'unterricht',
    beschreibung: 'IHK-Stil, AFB I–III',
    icon: ClipboardCheck,
    aktiv: true,
    formate: [
      WORD_ZIP('ZIP mit Schülerblatt und Lösungen samt Erwartungshorizont'),
      { id: 'h5p', label: 'H5P Übungstest', hinweis: 'Zum Üben in Moodle, mit Erwartungshorizont' },
    ],
    tipps: [
      'Sie bekommen ein Schülerblatt zum Austeilen und ein Lösungsblatt mit Erwartungshorizont und Notenschlüssel nur für sich. Beides steckt in einer ZIP-Datei.',
      'Die Aufgaben sind nach Anforderungsbereichen I bis III geordnet, wie in IHK-Prüfungen. Jede Aufgabe trägt ihre Punkte.',
      'Unter „Mehr Optionen“ legen Sie den Notenschlüssel fest. „Frei einstellbar“ erwartet fünf Prozentwerte, zum Beispiel 85,70,55,40,20.',
      'Kontrollieren Sie Erwartungshorizont und Punkte kurz, bevor Sie die Arbeit schreiben lassen. Die KI kann sich verrechnen.',
    ],
    felder: [
      {
        id: 'dauer',
        label: 'Bearbeitungszeit',
        art: 'zahl',
        ort: 'direkt',
        standard: '60',
        min: 15,
        max: 180,
        schritt: 5,
        einheit: 'Minuten',
      },
      NIVEAU,
      {
        id: 'types',
        label: 'Aufgabentypen',
        art: 'mehrfach',
        ort: 'mehr',
        standard: 'offen,mc,rechnen',
        optionen: [
          { key: 'offen', label: 'Offen (Freitext)' },
          { key: 'mc', label: 'Multiple Choice / Wahr-Falsch' },
          { key: 'rechnen', label: 'Rechenaufgaben' },
          { key: 'fall', label: 'Situations-/Fallaufgabe' },
        ],
      },
      { id: 'mcprozent', label: 'Anteil Multiple Choice', art: 'zahl', ort: 'mehr', standard: '30', min: 0, max: 100, schritt: 10, einheit: '%' },
      {
        id: 'noten',
        label: 'Notenschlüssel',
        art: 'wahl',
        ort: 'mehr',
        standard: 'ihk',
        optionen: [
          { key: 'ihk', label: 'IHK-Schlüssel' },
          { key: 'frei', label: 'Frei einstellbar' },
        ],
      },
      {
        id: 'notengrenzen',
        label: 'Grenzen Note 1–5 (Mindestprozent)',
        art: 'text',
        ort: 'mehr',
        standard: '',
        platzhalter: 'z. B. 85,70,55,40,20',
        hinweis: 'Fünf fallende Prozentwerte. Sonst gilt der IHK-Schlüssel.',
        sichtbarWenn: { feld: 'noten', wert: 'frei' },
      },
      { id: 'hilfsmittel', label: 'Erlaubte Hilfsmittel (optional)', art: 'text', ort: 'mehr', standard: '', platzhalter: 'z. B. Taschenrechner, Gesetzestexte' },
      BILDUNGSGANG,
      LERNFELD,
    ],
  },
  { id: 'podcast', name: 'Podcast', gruppe: 'hoeren', beschreibung: 'Lern-Dialog als MP3', icon: Mic, aktiv: false, formate: [], felder: VORLAEUFIG },
  {
    id: 'lied',
    name: 'Lernlied',
    gruppe: 'hoeren',
    beschreibung: 'Fachbegriffe als Ohrwurm',
    icon: Music,
    aktiv: true,
    formate: [],
    tipps: [
      'Die Werkzeugkiste schreibt den Liedtext. Singen muss ihn eine Musik-KI, dafür liegt im ZIP ein fertiger Prompt zum Kopieren (zum Beispiel für suno.com).',
      'Das Karaoke-Blatt mit Lücken und seine Lösung funktionieren auch ohne Musik: Die Klasse kann den Text gemeinsam sprechen oder singen.',
      '„Ein Lied je Kapitel“ passt für längere Skripte, „Nur Refrain-Merksprüche“ für kurze Hooks zum Auswendiglernen.',
      'Prüfen Sie den Liedtext fachlich, bevor Sie ihn austeilen. Ein Reim darf nie eine falsche Aussage rechtfertigen.',
    ],
    felder: [
      {
        id: 'genre',
        label: 'Musikrichtung',
        art: 'wahl',
        ort: 'direkt',
        standard: 'electro',
        optionen: [
          { key: 'electro', label: 'Electro / Dance' },
          { key: 'rock', label: 'Rock' },
          { key: 'schlager', label: 'Schlager / Party' },
          { key: 'rap', label: 'Deutschrap' },
          { key: 'pop', label: 'Pop-Ballade' },
          { key: 'metal', label: 'Metal / Hardrock' },
          { key: 'reggae', label: 'Reggae' },
          { key: 'volksmusik', label: 'Volksmusik / Blasmusik' },
        ],
      },
      {
        id: 'lied_umfang',
        label: 'Wie viele Lieder',
        art: 'wahl',
        ort: 'direkt',
        standard: 'kapitel',
        optionen: [
          { key: 'kapitel', label: 'Ein Lied je Kapitel/Abschnitt' },
          { key: 'ganz', label: 'Ein Lied fürs ganze Skript' },
          { key: 'merk', label: 'Nur Refrain-Merksprüche' },
        ],
      },
      { ...NIVEAU, ort: 'mehr' },
      BILDUNGSGANG,
    ],
  },
]

/** Alle Einstellungs-Schlüssel, die ein Werkzeug kennt (Format zählt dazu, wenn es Formate hat) */
export function feldIds(werkzeugId: string): string[] {
  const w = findeWerkzeug(werkzeugId)
  return w ? w.felder.map((f) => f.id) : []
}

/** Feste oder vom Kern gelieferte Auswahl eines Feldes; bei abhängigen Feldern je nach Wert des Bezugsfeldes */
export function feldOptionen(
  feld: EinstellungsFeld,
  einstellungen: Record<string, string>,
  kern: { niveaus: FeldOption[]; bildungsgaenge: FeldOption[]; lernfelder: Record<string, FeldOption[]>; umfaenge: FeldOption[] } | null,
): FeldOption[] {
  if (feld.abhaengigVon) return feld.abhaengigVon.optionen[einstellungen[feld.abhaengigVon.feld]] ?? []
  if (feld.optionen) return feld.optionen
  if (!kern) return []
  switch (feld.quelle) {
    case 'niveaus':
      return kern.niveaus
    case 'bildungsgaenge':
      return kern.bildungsgaenge
    case 'umfaenge':
      return kern.umfaenge
    case 'lernfelder':
      return kern.lernfelder[einstellungen.bildungsgang] ?? []
    default:
      return []
  }
}

/** Ist das Feld gerade sichtbar? Bedingte Felder (sichtbarWenn) erscheinen nur bei passendem Wert des Bezugsfeldes. */
export function feldSichtbar(feld: EinstellungsFeld, einstellungen: Record<string, string>): boolean {
  return !feld.sichtbarWenn || einstellungen[feld.sichtbarWenn.feld] === feld.sichtbarWenn.wert
}

/** Startwerte aller Felder eines Werkzeugs */
export function feldStandards(werkzeugId: string): Record<string, string> {
  const w = findeWerkzeug(werkzeugId)
  const out: Record<string, string> = {}
  for (const f of w?.felder ?? []) {
    out[f.id] = f.abhaengigVon ? (f.abhaengigVon.standard[out[f.abhaengigVon.feld] ?? ''] ?? f.standard) : f.standard
  }
  return out
}

/**
 * Ein Feld ändern. Abhängiges folgt: neuer Bildungsgang → Lernfeld leer,
 * neue „Art“ → Stufen auf deren Standard.
 */
export function feldSetzen(
  werkzeugId: string,
  einstellungen: AblaufEinstellungen,
  feldId: string,
  wert: string,
): AblaufEinstellungen {
  const neu: AblaufEinstellungen = { ...einstellungen, [feldId]: wert }
  if (feldId === 'bildungsgang') neu.lernfeld = ''
  for (const f of findeWerkzeug(werkzeugId)?.felder ?? []) {
    if (f.abhaengigVon?.feld === feldId) neu[f.id] = f.abhaengigVon.standard[wert] ?? f.standard
  }
  return neu
}

export const STANDARD_WERKZEUG = 'skript'

export function findeWerkzeug(id: string | null | undefined): Werkzeug | undefined {
  return WERKZEUGE.find((w) => w.id === id)
}

export function werkzeugeDerGruppe(gruppe: WerkzeugGruppeId): Werkzeug[] {
  return WERKZEUGE.filter((w) => w.gruppe === gruppe)
}

// ── Reiter der Werkzeugkiste-Seite ─────────────────────────────────────────

export const WERKZEUGKISTE_HREF = '/admin/werkzeugkiste'

export type WerkzeugkisteReiter = 'werkzeuge' | 'materialien' | 'regal'

export const WERKZEUGKISTE_REITER: { id: WerkzeugkisteReiter; label: string }[] = [
  { id: 'werkzeuge', label: 'Werkzeuge' },
  { id: 'materialien', label: 'Meine Materialien' },
  { id: 'regal', label: 'Regal des Kollegiums' },
]

export function reiterAusParam(param: string | null | undefined): WerkzeugkisteReiter {
  return WERKZEUGKISTE_REITER.some((r) => r.id === param) ? (param as WerkzeugkisteReiter) : 'werkzeuge'
}

/** Adresse, unter der ein neuer Ablauf beginnt — optional mit vorgewähltem Werkzeug */
/** Was ein Werkzeug in Schritt 1 braucht: ein Skript (Datei) oder ein Video-Transkript */
export function eingabeArt(werkzeugId: string): 'skript' | 'video' {
  return findeWerkzeug(werkzeugId)?.eingabe ?? 'skript'
}

/** Gilt für Skript-Werkzeuge untereinander und für Video-Fragen für sich – dazwischen gibt es keinen Wechsel */
export function werkzeugWechselErlaubt(vonId: string, nachId: string): boolean {
  return eingabeArt(vonId) === eingabeArt(nachId)
}

export const TRANSKRIPT_MIN_ZEICHEN = 100
export const TRANSKRIPT_MAX_ZEICHEN = 200_000
export const VIDEO_LINK_MAX_ZEICHEN = 300

/** Der Link ist freiwillig, wird aber nur als Web-Adresse angenommen (er wird nie abgerufen) */
export function pruefeVideoLink(link: string): string | null {
  const l = link.trim()
  if (!l) return null
  if (l.length > VIDEO_LINK_MAX_ZEICHEN) return 'Der Link ist zu lang.'
  try {
    const u = new URL(l)
    if (u.protocol !== 'https:' && u.protocol !== 'http:') throw new Error('kein Web-Link')
  } catch {
    return 'Bitte gib den vollständigen Link an, zum Beispiel https://www.youtube.com/watch?v=…'
  }
  return null
}

export function pruefeTranskript(text: string): string | null {
  const t = text.trim()
  if (t.length < TRANSKRIPT_MIN_ZEICHEN) {
    return 'Bitte füge das Transkript des Videos ein (mindestens 100 Zeichen). In YouTube: „…“ → „Transkript anzeigen“ → kopieren.'
  }
  if (t.length > TRANSKRIPT_MAX_ZEICHEN) return 'Das Transkript ist zu lang. Bitte kürze es auf den Teil, zu dem Fragen entstehen sollen.'
  return null
}

export function neuerAblaufHref(werkzeug?: string): string {
  return werkzeug ? `${WERKZEUGKISTE_HREF}/neu?werkzeug=${encodeURIComponent(werkzeug)}` : `${WERKZEUGKISTE_HREF}/neu`
}

export function ablaufHref(id: string, schritt?: AblaufSchritt): string {
  const basis = `${WERKZEUGKISTE_HREF}/ablauf/${encodeURIComponent(id)}`
  return schritt ? `${basis}?schritt=${schritt}` : basis
}

/**
 * Der Ablauf erscheint ohne Seitenleiste und Kopfzeile (PROJ-51): Beim
 * Erstellen soll nichts ablenken.
 */
export function istAblaufPfad(pathname: string | null | undefined): boolean {
  if (!pathname) return false
  return (
    pathname === `${WERKZEUGKISTE_HREF}/neu` ||
    pathname.startsWith(`${WERKZEUGKISTE_HREF}/neu/`) ||
    pathname.startsWith(`${WERKZEUGKISTE_HREF}/ablauf/`)
  )
}

// ── Datei-Prüfung vor dem Hochladen (Schritt 1) ───────────────────────────

export const MAX_SKRIPT_BYTES = 50 * 1024 * 1024
export const ERLAUBTE_ENDUNGEN = ['docx', 'pdf', 'pptx', 'doc', 'ppt', 'txt'] as const
export const ALTE_FORMATE = ['doc', 'ppt'] as const

export function dateiEndung(name: string): string {
  const i = name.lastIndexOf('.')
  return i < 0 ? '' : name.slice(i + 1).toLowerCase()
}

/** Fehlertext für eine unpassende Datei, sonst `null` */
export function pruefeSkriptDatei(datei: { name: string; size: number }): string | null {
  const endung = dateiEndung(datei.name)
  if (!(ERLAUBTE_ENDUNGEN as readonly string[]).includes(endung)) {
    return 'Dieses Format geht nicht. Erlaubt sind Word (.docx, .doc), PDF, PowerPoint (.pptx, .ppt) und .txt.'
  }
  if (datei.size > MAX_SKRIPT_BYTES) {
    return 'Die Datei ist größer als 50 MB. Bitte Bilder komprimieren oder das Skript teilen.'
  }
  if (datei.size === 0) return 'Die Datei ist leer.'
  return null
}

export function istAltesFormat(name: string): boolean {
  return (ALTE_FORMATE as readonly string[]).includes(dateiEndung(name))
}

/** Bei Word wird nach Abschnitten eingegrenzt, sonst nach Seiten bzw. Folien */
export function auswahlArt(name: string): 'abschnitte' | 'seiten' | null {
  const endung = dateiEndung(name)
  if (endung === 'docx' || endung === 'doc') return 'abschnitte'
  if (endung === 'pdf') return 'seiten'
  if (endung === 'pptx' || endung === 'ppt') return 'seiten'
  return null
}

export function formatiereGroesse(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`
}

// ── Ablauf ────────────────────────────────────────────────────────────────

export type AblaufSchritt = 1 | 2 | 3 | 4 | 5

export const ABLAUF_SCHRITTE: { nr: AblaufSchritt; label: string }[] = [
  { nr: 1, label: 'Skript' },
  { nr: 2, label: 'Einstellungen' },
  { nr: 3, label: 'Prompt' },
  { nr: 4, label: 'Antwort' },
  { nr: 5, label: 'Fertig' },
]

/** Beim direkten Weg (PROJ-64) gibt es vier Schritte: Schritt 3 heißt „Erstellen“, Prompt und Antwort entfallen */
export const DIREKT_SCHRITTE: { nr: AblaufSchritt; label: string }[] = [
  { nr: 1, label: 'Skript' },
  { nr: 2, label: 'Einstellungen' },
  { nr: 3, label: 'Erstellen' },
  { nr: 5, label: 'Fertig' },
]

export interface AblaufKennzahlen {
  seiten: number
  loesungen: number
  bilder: number
  tabellen: number
  /** Nur bei Video-Fragen: Länge des Transkripts und der Link zum Video (PROJ-54, Paket D) */
  zeichen?: number
  videoUrl?: string
}

export interface AblaufEinstellungen {
  format: string
  niveau: string
  bildungsgang: string
  lernfeld: string
  umfang: string
  /** Werkzeugeigene Einstellungen (PROJ-54), z. B. dauer, anzahl, sozialform, art, stufen */
  [feld: string]: string
}

export interface AblaufAuswahl {
  /** z. B. „3-7, 10“ (PDF/PowerPoint); leer = alles */
  seiten: string
  /** Nummern der gewählten Word-Abschnitte; leer = alles */
  abschnitte: number[]
}

export interface PruefBefund {
  text: string
}

export interface AblaufPruefung {
  /** false = Antwort ist nicht lesbar (kein YAML, abgeschnitten) → Bauen gesperrt */
  lesbar: boolean
  /** Verständlicher Satz, wenn nicht lesbar */
  fehler: string | null
  befunde: PruefBefund[]
  /** Anzahl automatisch korrigierter Kleinigkeiten */
  korrekturen: number
  nachbesserungsPrompt: string | null
}

export interface AblaufErgebnis {
  titel: string
  dateiname: string
  format: string
  kapitel: number
  aufgaben: number
  /** Inhalt eines ZIP, z. B. ['Arbeitsblatt', 'Lösungsblatt'] (PROJ-54) */
  enthaelt?: string[]
  /** Was „aufgaben“ zählt, wenn nicht Aufgaben (z. B. „Phasen“, „Versionen“) */
  einheit?: string
  /** false = es gibt keine Vorschau (Standard: ja) */
  hatVorschau?: boolean
  /** Ein Satz unter dem Ergebnis, z. B. der Hinweis zur Musik-KI beim Lernlied (PROJ-54) */
  hinweis?: string
  /** Text zum Kopieren je Vorlage (LearningApps, PROJ-54): Schritt 5 zeigt ihn statt eines Downloads */
  texte?: { titel: string; text: string }[]
}

/**
 * „Direkt erstellen“ (PROJ-64) ist vorerst ausgeblendet (Nutzerentscheidung
 * 2026-10-29): Die Ausgabe ist ~15× so lang wie das Skript, ein 3-Seiten-Skript
 * kostet mit Sonnet ~0,30–0,40 € und brauchte mehr als die eingestellte Obergrenze.
 * Erst nach Überarbeitung (Modell, Teilgröße, Obergrenze, Schätzung) wieder einschalten.
 */
export const DIREKT_ERSTELLEN_AKTIV = false

/** Stand einer direkten Erstellung (PROJ-64), wie die Oberfläche ihn sieht */
export interface LaufInfo {
  id: string
  status: 'laeuft' | 'baut' | 'fertig' | 'abgebrochen' | 'fehlgeschlagen'
  teileGesamt: number
  teileFertig: number
  kostenEur: number
  /** Verständlicher Satz bei Fehlschlag */
  fehler: string | null
  /** 'guthaben' = Schulguthaben aufgebraucht → nur noch der kostenlose Weg */
  fehlerArt: string | null
  gestartetAm: string
  beendetAm: string | null
}

/** Warum „Direkt erstellen“ gerade nicht geht (null = es geht) */
export type DirektSperre = 'guthaben' | 'tageslimit' | null

export interface Ablauf {
  id: string
  werkzeug: string
  /** Weitester erreichter Schritt */
  schritt: AblaufSchritt
  status: 'laeuft' | 'fertig'
  datei: { name: string; groesse: number } | null
  kennzahlen: AblaufKennzahlen | null
  /** Überschriften eines Word-Skripts für die Auswahl */
  gliederung: { nr: number; titel: string }[]
  auswahl: AblaufAuswahl
  einstellungen: AblaufEinstellungen
  prompt: string | null
  antwort: string | null
  pruefung: AblaufPruefung | null
  ergebnis: AblaufErgebnis | null
  /** Gewählter Weg (PROJ-64); null = noch nicht entschieden */
  weg: 'direkt' | 'kostenlos' | null
  aktualisiertAm: string
}

/**
 * Darf dieser Schritt geöffnet werden? Vorwärts nur, was schon vorbereitet
 * ist: Prompt erst mit Einlesung, Antwort erst mit Prompt, Fertig erst mit Ergebnis.
 */
export function schrittErlaubt(
  ablauf: Pick<Ablauf, 'kennzahlen' | 'prompt' | 'ergebnis'> & Partial<Pick<Ablauf, 'weg'>>,
  schritt: AblaufSchritt,
): boolean {
  switch (schritt) {
    case 1:
      return true
    case 2:
      return !!ablauf.kennzahlen
    case 3:
      // Direkter Weg (PROJ-64): Schritt 3 ist „Erstellen“ und braucht keinen Prompt
      return !!ablauf.kennzahlen && (ablauf.weg === 'direkt' || !!ablauf.prompt)
    case 4:
      return !!ablauf.kennzahlen && !!ablauf.prompt
    case 5:
      return !!ablauf.ergebnis
  }
}

/** Schritt aus der Adresse, begrenzt auf das, was der Ablauf schon erlaubt */
export function schrittAusParam(
  param: string | null | undefined,
  ablauf: Pick<Ablauf, 'schritt' | 'kennzahlen' | 'prompt' | 'ergebnis'> & Partial<Pick<Ablauf, 'weg'>>,
): AblaufSchritt {
  const n = Number(param)
  const gewuenscht: AblaufSchritt = n >= 1 && n <= 5 && Number.isInteger(n) ? (n as AblaufSchritt) : ablauf.schritt
  if (schrittErlaubt(ablauf, gewuenscht)) return gewuenscht
  for (let s = gewuenscht; s >= 1; s--) {
    if (schrittErlaubt(ablauf, s as AblaufSchritt)) return s as AblaufSchritt
  }
  return 1
}

/** Kurzinfo im Ablauf-Kopf: „Ganzes Skript · H5P für Moodle · mittel“ */
export function ablaufKurzinfo(ablauf: Pick<Ablauf, 'werkzeug' | 'einstellungen' | 'datei'>, niveauLabel?: string): string {
  const werkzeug = findeWerkzeug(ablauf.werkzeug)
  const teile: string[] = []
  if (ablauf.datei) teile.push(ablauf.datei.name)
  if (werkzeug) {
    teile.push(werkzeug.name)
    const format = werkzeug.formate.find((f) => f.id === ablauf.einstellungen.format)
    if (format && werkzeug.formate.length > 1) teile.push(format.label)
  }
  if (niveauLabel) teile.push(niveauLabel)
  return teile.join(' · ')
}

/**
 * Einstellungen beim Werkzeugwechsel: Format auf den Standard des neuen
 * Werkzeugs, Niveau/Bildungsgang/Lernfeld/Umfang bleiben, werkzeugeigene
 * Felder des alten Werkzeugs entfallen, die des neuen starten mit ihrem Standard
 * (gleich benannte Felder behalten ihren Wert, wenn der noch erlaubt ist).
 */
export function einstellungenFuerWerkzeug(werkzeugId: string, bisher: AblaufEinstellungen): AblaufEinstellungen {
  const werkzeug = findeWerkzeug(werkzeugId)
  const kern = ['format', 'niveau', 'bildungsgang', 'lernfeld', 'umfang']
  const neu: AblaufEinstellungen = {
    format: werkzeug?.formate[0]?.id ?? '',
    niveau: bisher.niveau,
    bildungsgang: bisher.bildungsgang,
    lernfeld: bisher.lernfeld,
    umfang: bisher.umfang,
  }
  const standards = feldStandards(werkzeugId)
  for (const f of werkzeug?.felder ?? []) {
    if (kern.includes(f.id)) continue
    const alt = bisher[f.id]
    const erlaubt = alt !== undefined && (!f.optionen || f.art === 'mehrfach' || f.optionen.some((o) => o.key === alt))
    if (f.abhaengigVon) neu[f.id] = standards[f.id]
    else if (!erlaubt) neu[f.id] = standards[f.id]
    else if (f.art === 'zahl') {
      // Ein Zahlenwert des alten Werkzeugs (z. B. 40 Fragen) in den Bereich des neuen holen
      const n = Number(alt)
      neu[f.id] = Number.isFinite(n) && alt !== '' ? String(Math.min(f.max ?? n, Math.max(f.min ?? n, Math.round(n)))) : standards[f.id]
    } else if (f.art === 'mehrfach' && f.optionen) {
      const gueltig = alt.split(',').filter((k) => f.optionen!.some((o) => o.key === k))
      neu[f.id] = gueltig.length > 0 ? gueltig.join(',') : standards[f.id]
    } else neu[f.id] = alt
  }
  return neu
}
