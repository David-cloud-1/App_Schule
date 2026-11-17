import type { Block } from '@/lib/werkzeugkiste-editor'
import {
  LUECKEN_TYPEN,
  hatEinzelnesSternchen,
  hatHtmlReste,
  luecken,
  markWoerter,
  zerlege,
  type LueckenTyp,
} from '@/components/werkzeugkiste/editor/aufgabenwerk/luecken'

/**
 * Bauplan der Aufgaben, die sich an Ort und Stelle bearbeiten lassen (PROJ-114).
 *
 * **Einzige Quelle für App und Seite:** Das Aufgabenwerk in der Vorschau zeichnet danach,
 * die App prüft danach, was die Seite zurückschickt, und das Seiten-Skript findet danach
 * den angeklickten Eintrag. Ein Typ ohne Bauplan öffnet sich (noch) in der Schublade.
 * Die gespeicherte Struktur ändert sich nie.
 *
 * Diese Datei darf nichts aus React oder der App laden: Sie wird in das Aufgabenwerk gebündelt.
 */

/** Ein Text-Teil der Aufgabe (Frage, Arbeitsanweisung, Überschrift) */
export interface TextTeil {
  art: 'text'
  feld: string
  label: string
  platzhalter: string
  pflicht: boolean
  max: number
  /** Leer = Feld wird entfernt (der Kern zeigt dann seine Standard-Anweisung) */
  leerWeg?: boolean
  /** Gleichwertige Feldnamen (`question`/`task`): gilt der erste, der im Block steht */
  namen?: string[]
  /** Mehr als eine Zeile hoch */
  hoch?: boolean
}

/** Gemeinsam für alle Listen */
interface ListenTeil {
  feld: string
  /** Gleichwertige Namen der Liste (`cards`/`pairs`): gilt der erste, der im Block steht; sonst `feld` */
  namen?: string[]
  mindestens: number
  hoechstens: number
  einzahl: string
  mehrzahl: string
  /** Kurzname für Verlauf und Toast („loeschen-antwort“) */
  schluessel: string
  /** Teil gilt nur, wenn das genannte Feld im Block (nicht) als Liste vorkommt (Zusammenfassung: Fragen oder Aussagen) */
  bedingung?: { feld: string; vorhanden: boolean }
}

/** Muster A: Antworten mit Kreis (genau eine richtig) und Rückmeldung je Antwort */
export interface AntwortenTeil extends ListenTeil {
  art: 'antworten'
  textFeld: string
  richtigFeld: string
  rueckmeldungFeld: string
}

/** Muster A, feste Form: Wahr/Falsch mit je einer Rückmeldung */
export interface WahrFalschTeil {
  art: 'wahrfalsch'
  feld: string
  rueckmeldungRichtig: string
  rueckmeldungFalsch: string
}

/** Ein Teil eines Paars (Muster C) */
export interface PaarFeld {
  feld: string
  label: string
  platzhalter: string
  max: number
}

/** Muster C: Paare – kurz nebeneinander oder lang zum Aufklappen */
export interface PaareTeil extends ListenTeil {
  art: 'paare'
  links: PaarFeld
  rechts: PaarFeld
  lang: boolean
  /** Satz am zugeklappten Eintrag, wenn der zweite Teil fehlt */
  fehlt: string
}

/** Muster E: Text mit Lücken (Sternchen-Schreibweise bleibt gespeichert) */
export interface LueckenTeil {
  art: 'luecken'
  feld: string
  typ: LueckenTyp
  /** „Als Lücke“ bzw. „Als Lösung“ */
  knopf: string
  einzahl: string
  mehrzahl: string
  tipp: boolean
  varianten: boolean
}

/** Muster B: nummerierte Zeilen (Liste aus reinem Text) */
export interface ZeilenTeil extends ListenTeil {
  art: 'zeilen'
  platzhalter: string
  max: number
}

/** Ein Feld in einem Eintrag (Muster F und C kurz) */
export interface EintragFeld {
  /** Gleichwertige Namen im Eintrag; zuerst der übliche */
  namen: string[]
  label: string
  platzhalter: string
  max: number
  /** Anteil an der Zeilenbreite */
  gewicht: number
  pflicht: boolean
  /** Hinter dem Fragezeichen-Knopf statt in der Zeile (Hinweis, Kommentar, Quelle …) */
  knopf?: boolean
  /** Ganze Zahl wird als Zahl gespeichert, sonst als Text (so liest der Kern beides) */
  zahl?: boolean
  /** Der Kern liest Text („a / b“) und Liste gleich: Eine vorhandene Liste bleibt eine Liste */
  liste?: boolean
  /** Zeitpunkt in Sekunden, angezeigt und getippt als mm:ss */
  zeit?: boolean
}

/** Antworten mit Kreis (genau eine richtig) in jedem Eintrag (Fallakte, Video-Fragen) */
export interface UnterAntworten {
  /** Gleichwertige Namen der Liste im Eintrag */
  namen: string[]
  mindestens: number
  hoechstens: number
  einzahl: string
  mehrzahl: string
  schluessel: string
}

/** Liste aus reinem Text, die zu jedem Eintrag gehört (falsche Antworten, Falschaussagen) */
export interface UnterListe {
  feld: string
  titel: string
  einzahl: string
  mehrzahl: string
  mindestens: number
  hoechstens: number
  schluessel: string
  platzhalter: string
}

/** Muster F und C kurz: Einträge mit mehreren Feldern in einer Zeile */
export interface EintraegeTeil extends ListenTeil {
  art: 'eintraege'
  felder: EintragFeld[]
  unterliste?: UnterListe
  unterAntworten?: UnterAntworten
  /** Felder eines neuen Eintrags (z. B. zwei leere Antworten) */
  vorlage?: Record<string, unknown>
}

/** Fragen verschiedener Typen als Karten (Kapiteltest): jede Frage nach dem Bauplan ihres Typs */
export interface UnterBloeckeTeil extends ListenTeil {
  art: 'unterbloecke'
  erlaubt: string[]
}

/** Eine ganze Zahl (Runden, Mindestzeichen, Höhe) */
export interface ZahlTeil {
  art: 'zahl'
  feld: string
  label: string
  platzhalter: string
  min: number
  max: number
}

/** Muster D: Kategorien als Kästen, Begriffe darin (Zuordnen) */
export interface ZuordnenTeil extends ListenTeil {
  art: 'zuordnen'
  /** Liste der Kategorien (Texte) */
  kategorien: string
  /** `feld` = Liste der Begriffe mit `text` und `category` */
  mindestKategorien: number
}

/** Muster D: Gruppen mit Titel, Hinweis, Einträgen in Reihenfolge und Störern (Trainer) */
export interface GruppenTeil extends ListenTeil {
  art: 'gruppen'
  titel: string[]
  reihe: string[]
  mindestensReihe: number
}

export type Teil = TextTeil | AntwortenTeil | WahrFalschTeil | PaareTeil | LueckenTeil | ZeilenTeil | EintraegeTeil | ZahlTeil | ZuordnenTeil | GruppenTeil | UnterBloeckeTeil

export interface Bauplan {
  muster: 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'Einzel'
  teile: Teil[]
  /** Zusätzliche Hinweise des Typs (z. B. „Formel oder Schritte nötig“) */
  pruefe?: (block: Block) => Hinweis[]
  /** Seite: CSS-Auswahl der anklickbaren Einträge in der gebauten Aufgabe (fehlt = nur ganze Aufgabe) */
  finder?: string
}

/** Obergrenze für einen einzelnen Text, auch wenn der Bauplan weniger vorsieht (Bestand, siehe QA BUG-4) */
const TEXT_GRENZE = 20_000
export const TEXT_MAX = 2000
const FRAGE_MAX = 5000
const LUECKENTEXT_MAX = 20_000

const FRAGE: TextTeil = {
  art: 'text',
  feld: 'question',
  label: 'Frage',
  platzhalter: 'Frage eingeben, z. B. „Wer haftet für Schäden während des Transports?“',
  pflicht: true,
  max: FRAGE_MAX,
}

/** Arbeitsanweisung (`description`): leer zeigt der Kern seine Standard-Anweisung */
const anweisung = (standard: string): TextTeil => ({
  art: 'text',
  feld: 'description',
  label: 'Arbeitsanweisung',
  platzhalter: standard,
  pflicht: false,
  max: TEXT_MAX,
  leerWeg: true,
})

const AUSWAHL: Bauplan = {
  muster: 'A',
  finder: '.antworten .antwort',
  teile: [
    FRAGE,
    {
      art: 'antworten',
      feld: 'answers',
      textFeld: 'text',
      richtigFeld: 'correct',
      rueckmeldungFeld: 'feedback',
      mindestens: 2,
      hoechstens: 10,
      einzahl: 'Antwort',
      mehrzahl: 'Antworten',
      schluessel: 'antwort',
    },
  ],
}

const lueckenPlan = (typ: LueckenTyp, standard: string, knopf: string, einzahl: string, mehrzahl: string, finder: string): Bauplan => ({
  muster: 'E',
  finder,
  teile: [
    anweisung(standard),
    {
      art: 'luecken',
      feld: 'text',
      typ,
      knopf,
      einzahl,
      mehrzahl,
      tipp: typ === 'advanced_fill_blanks' || typ === 'drag_words',
      varianten: typ === 'fill_blanks' || typ === 'advanced_fill_blanks',
    },
  ],
})

/** Muster B: nummerierte Zeilen */
const zeilen = (feld: string, einzahl: string, mehrzahl: string, schluessel: string, mindestens: number, hoechstens: number, platzhalter: string): ZeilenTeil => ({
  art: 'zeilen',
  feld,
  mindestens,
  hoechstens,
  einzahl,
  mehrzahl,
  schluessel,
  platzhalter,
  max: TEXT_MAX,
})

export const BAUPLAENE: Record<string, Bauplan> = {
  multiple_choice: AUSWAHL,
  single_choice: AUSWAHL,
  true_false: {
    muster: 'A',
    finder: '.antworten .antwort',
    teile: [
      { ...FRAGE, label: 'Aussage', platzhalter: 'Aussage eingeben, z. B. „Der Frachtführer haftet nach CMR.“' },
      { art: 'wahrfalsch', feld: 'correct', rueckmeldungRichtig: 'feedback_correct', rueckmeldungFalsch: 'feedback_wrong' },
    ],
  },
  // ── Muster E ──
  fill_blanks: lueckenPlan('fill_blanks', 'Ergänze die fehlenden Wörter.', 'Als Lücke', 'Lücke', 'Lücken', '.lueckentext .luecke'),
  advanced_fill_blanks: lueckenPlan('advanced_fill_blanks', 'Ergänze die fehlenden Wörter.', 'Als Lücke', 'Lücke', 'Lücken', '.lueckentext .luecke'),
  drag_words: lueckenPlan('drag_words', 'Zieh die Wörter an die richtige Stelle.', 'Als Lücke', 'Lücke', 'Lücken', '.lueckentext .luecke'),
  mark_words: lueckenPlan('mark_words', 'Markiere die Fachbegriffe im Text.', 'Als Lösung', 'Lösung', 'Lösungen', '.markiertext .wort'),
  // ── Muster C ──
  accordion: {
    muster: 'C',
    finder: '.klappliste details',
    teile: [
      {
        art: 'paare',
        feld: 'items',
        links: { feld: 'term', label: 'Begriff', platzhalter: 'Begriff, z. B. „Stückgut“', max: TEXT_MAX },
        rechts: { feld: 'definition', label: 'Erklärung', platzhalter: 'Erklärung, z. B. „Güter, die einzeln verladen werden …“', max: 10_000 },
        lang: true,
        fehlt: 'Erklärung fehlt',
        mindestens: 1,
        hoechstens: 40,
        einzahl: 'Begriff',
        mehrzahl: 'Begriffe',
        schluessel: 'begriff',
      },
    ],
  },
  dialog_cards: {
    muster: 'C',
    finder: '.karten .karte',
    teile: [
      { art: 'text', feld: 'title', label: 'Überschrift', platzhalter: 'Überschrift (optional)', pflicht: false, max: TEXT_MAX, leerWeg: true },
      {
        art: 'paare',
        feld: 'cards',
        links: { feld: 'front', label: 'Vorderseite', platzhalter: 'Vorderseite, z. B. „CMR“', max: TEXT_MAX },
        rechts: { feld: 'back', label: 'Rückseite', platzhalter: 'Rückseite, z. B. „Übereinkommen über den internationalen Straßengüterverkehr“', max: 10_000 },
        lang: true,
        fehlt: 'Rückseite fehlt',
        mindestens: 1,
        hoechstens: 40,
        einzahl: 'Karte',
        mehrzahl: 'Karten',
        schluessel: 'karte',
      },
    ],
  },
  crossword: {
    muster: 'C',
    teile: [
      anweisung('Kreuzworträtsel'),
      {
        art: 'paare',
        feld: 'words',
        links: { feld: 'word', label: 'Lösungswort', platzhalter: 'Lösungswort', max: 60 },
        rechts: { feld: 'clue', label: 'Umschreibung', platzhalter: 'Umschreibung, z. B. „Begleitpapier im Straßenverkehr“', max: TEXT_MAX },
        lang: false,
        fehlt: 'Umschreibung fehlt',
        mindestens: 2,
        hoechstens: 20,
        einzahl: 'Wort',
        mehrzahl: 'Wörter',
        schluessel: 'wort',
      },
    ],
  },

  // ── Muster B ──
  reihenfolge: {
    muster: 'B',
    finder: '.plaetze .platz',
    teile: [
      anweisung('Bring die Einträge in die richtige Reihenfolge.'),
      zeilen('items', 'Schritt', 'Schritte', 'schritt', 3, 20, 'Schritt, in der richtigen Reihenfolge (die Seite mischt sie)'),
    ],
  },
  find_words: {
    muster: 'B',
    teile: [
      anweisung('Finde die versteckten Begriffe.'),
      {
        ...zeilen('words', 'Wort', 'Wörter', 'suchwort', 3, 20, 'Wort, z. B. „FRACHTBRIEF“ (nur Buchstaben, 3 bis 16)'),
        namen: ['words', 'woerter'],
        max: 60,
      },
    ],
  },
  // ── Muster C kurz (weitere) ──
  memory_game: {
    muster: 'C',
    teile: [
      anweisung('Finde die Paare.'),
      {
        art: 'eintraege',
        feld: 'cards',
        namen: ['cards', 'pairs'],
        felder: [
          { namen: ['front', 'a'], label: 'Karte A', platzhalter: 'Karte A, z. B. „CMR“', max: TEXT_MAX, gewicht: 2, pflicht: true },
          { namen: ['back', 'b'], label: 'Karte B', platzhalter: 'Karte B – kurz halten, sonst passt es nicht', max: TEXT_MAX, gewicht: 3, pflicht: true },
        ],
        mindestens: 3,
        hoechstens: 10,
        einzahl: 'Paar',
        mehrzahl: 'Paare',
        schluessel: 'paar',
      },
    ],
  },
  arithmetic_quiz: {
    muster: 'C',
    finder: '.rechenliste li',
    teile: [
      {
        art: 'eintraege',
        feld: 'questions',
        felder: [
          { namen: ['question'], label: 'Aufgabe', platzhalter: 'Aufgabe, z. B. „12 × 8“', max: TEXT_MAX, gewicht: 3, pflicht: true },
          { namen: ['answer'], label: 'Ergebnis', platzhalter: 'Ergebnis', max: 200, gewicht: 1, pflicht: true, zahl: true },
        ],
        mindestens: 1,
        hoechstens: 30,
        einzahl: 'Aufgabe',
        mehrzahl: 'Aufgaben',
        schluessel: 'rechenaufgabe',
      },
    ],
  },
  // ── Muster F ──
  calculation_example: {
    muster: 'F',
    finder: '.schritte li',
    pruefe: (b) =>
      !s(b.formula).trim() && listeVon(b.steps).every((x) => !s(x).trim())
        ? [{ wo: 'formula', text: 'Mindestens Formel oder Rechenschritte nötig, sonst erscheint der Block nicht.' }]
        : [],
    teile: [
      { art: 'text', feld: 'formula', label: 'Formel', platzhalter: 'Formel, z. B. „Preis = Menge × Einzelpreis“', pflicht: false, max: TEXT_MAX },
      { art: 'text', feld: 'explanation', label: 'Erklärung', platzhalter: 'Erklärung (optional)', pflicht: false, max: 10_000, leerWeg: true, hoch: true },
      zeilen('steps', 'Schritt', 'Schritte', 'rechenschritt', 0, 20, 'Rechenschritt, z. B. „12 × 8 = 96“'),
      { art: 'text', feld: 'result', label: 'Ergebnis', platzhalter: 'Ergebnis, z. B. „96 €“', pflicht: false, max: 500 },
    ],
  },
  rechenweg: {
    muster: 'F',
    finder: '.rechenweg .rechenschritt',
    teile: [
      {
        art: 'text',
        feld: 'task',
        namen: ['task', 'question'],
        label: 'Aufgabe',
        platzhalter: 'Aufgabe mit allen Ausgangsdaten',
        pflicht: true,
        max: FRAGE_MAX,
        hoch: true,
      },
      {
        art: 'eintraege',
        feld: 'schritte',
        namen: ['schritte', 'steps'],
        felder: [
          { namen: ['frage', 'question'], label: 'Frage', platzhalter: 'Zwischenschritt, z. B. „Wie hoch ist der Nettopreis?“', max: TEXT_MAX, gewicht: 4, pflicht: true },
          { namen: ['ergebnis', 'result'], label: 'Ergebnis', platzhalter: 'Ergebnis, z. B. 400,00', max: 200, gewicht: 2, pflicht: true },
          { namen: ['einheit'], label: 'Einheit', platzhalter: 'Einheit', max: 40, gewicht: 1, pflicht: false },
          { namen: ['hinweis'], label: 'Hinweis, falls es klemmt', platzhalter: 'Hinweis, falls es klemmt (optional)', max: TEXT_MAX, gewicht: 1, pflicht: false, knopf: true },
        ],
        mindestens: 2,
        hoechstens: 12,
        einzahl: 'Schritt',
        mehrzahl: 'Schritte',
        schluessel: 'rechenweg-schritt',
      },
    ],
  },
  schaetzrunde: {
    muster: 'F',
    finder: '.schaetzung',
    teile: [
      anweisung('Schätz erst – dann wird aufgelöst.'),
      {
        art: 'eintraege',
        feld: 'fragen',
        namen: ['fragen', 'questions'],
        felder: [
          { namen: ['frage', 'question'], label: 'Frage', platzhalter: 'Schätzfrage, z. B. „Wie viele Lkw fahren täglich über den Brenner?“', max: TEXT_MAX, gewicht: 4, pflicht: true },
          { namen: ['wert', 'value'], label: 'Richtiger Wert', platzhalter: 'Richtiger Wert, z. B. 150.000', max: 100, gewicht: 2, pflicht: true },
          { namen: ['einheit'], label: 'Einheit', platzhalter: 'Einheit', max: 40, gewicht: 1, pflicht: false },
          { namen: ['kommentar', 'comment'], label: 'Kommentar zur Auflösung', platzhalter: 'Kommentar zur Auflösung (optional)', max: 10_000, gewicht: 1, pflicht: false, knopf: true },
          { namen: ['quelle', 'source'], label: 'Quelle', platzhalter: 'Quelle (optional)', max: TEXT_MAX, gewicht: 1, pflicht: false, knopf: true },
        ],
        mindestens: 1,
        hoechstens: 20,
        einzahl: 'Frage',
        mehrzahl: 'Fragen',
        schluessel: 'schaetzfrage',
      },
    ],
  },
  selbsteinschaetzung: {
    muster: 'F',
    finder: '.einschaetzliste .einschaetzung',
    teile: [
      { art: 'text', feld: 'titel', namen: ['titel', 'title'], label: 'Überschrift', platzhalter: 'Überschrift (optional)', pflicht: false, max: TEXT_MAX, leerWeg: true },
      anweisung('Wie sicher bist du?'),
      {
        art: 'eintraege',
        feld: 'punkte',
        namen: ['punkte', 'items'],
        felder: [
          { namen: ['text', 'frage'], label: 'Aussage', platzhalter: 'Aussage, z. B. „Ich kann den Frachtbrief erklären.“', max: TEXT_MAX, gewicht: 1, pflicht: true },
          { namen: ['hilfe', 'help'], label: 'Wo man nachsieht', platzhalter: 'Wo man nachsieht (optional)', max: TEXT_MAX, gewicht: 1, pflicht: false, knopf: true },
        ],
        mindestens: 2,
        hoechstens: 20,
        einzahl: 'Aussage',
        mehrzahl: 'Aussagen',
        schluessel: 'aussage',
      },
    ],
  },
  // ── Muster D ──
  drag_drop: {
    muster: 'D',
    finder: '.faecher .fach',
    teile: [
      anweisung('Ordne die Begriffe den richtigen Kategorien zu.'),
      {
        art: 'zuordnen',
        feld: 'items',
        kategorien: 'categories',
        mindestKategorien: 2,
        mindestens: 1,
        hoechstens: 40,
        einzahl: 'Begriff',
        mehrzahl: 'Begriffe',
        schluessel: 'begriff',
      },
    ],
  },
  trainer: {
    muster: 'D',
    teile: [
      anweisung('Übe, bis es sitzt.'),
      { art: 'zahl', feld: 'runden', label: 'Runden', platzhalter: 'Standard 2', min: 1, max: 5 },
      {
        art: 'gruppen',
        feld: 'gruppen',
        namen: ['gruppen', 'groups'],
        titel: ['titel', 'title'],
        reihe: ['reihe', 'items'],
        mindestensReihe: 2,
        mindestens: 2,
        hoechstens: 20,
        einzahl: 'Gruppe',
        mehrzahl: 'Gruppen',
        schluessel: 'gruppe',
      },
    ],
  },
  // ── Weitere Muster F / C ──
  single_choice_set: {
    muster: 'F',
    finder: '.teilfrage',
    teile: [
      {
        art: 'eintraege',
        feld: 'questions',
        felder: [
          { namen: ['question'], label: 'Frage', platzhalter: 'Frage, z. B. „Wer stellt den Frachtbrief aus?“', max: TEXT_MAX, gewicht: 3, pflicht: true },
          { namen: ['correct'], label: 'Richtige Antwort', platzhalter: 'Richtige Antwort', max: TEXT_MAX, gewicht: 2, pflicht: true },
        ],
        unterliste: { feld: 'wrong', titel: 'Falsche Antworten', einzahl: 'Falsche Antwort', mehrzahl: 'Falsche Antworten', mindestens: 2, hoechstens: 8, schluessel: 'falsch', platzhalter: 'Falsche Antwort' },
        mindestens: 1,
        hoechstens: 20,
        einzahl: 'Frage',
        mehrzahl: 'Fragen',
        schluessel: 'schnellfrage',
      },
    ],
  },
  summary: {
    muster: 'F',
    finder: '.teilfrage, .haekchen li',
    teile: [
      {
        art: 'eintraege',
        feld: 'questions',
        bedingung: { feld: 'statements', vorhanden: false },
        felder: [{ namen: ['correct'], label: 'Richtige Aussage', platzhalter: 'Richtige Aussage', max: TEXT_MAX, gewicht: 1, pflicht: true }],
        unterliste: { feld: 'distractors', titel: 'Falsche Aussagen', einzahl: 'Falsche Aussage', mehrzahl: 'Falsche Aussagen', mindestens: 2, hoechstens: 8, schluessel: 'falschaussage', platzhalter: 'Falsche Aussage' },
        mindestens: 1,
        hoechstens: 20,
        einzahl: 'Frage',
        mehrzahl: 'Fragen',
        schluessel: 'zusammenfassung-frage',
      },
      { ...zeilen('statements', 'Aussage', 'Aussagen', 'kernaussage', 1, 20, 'Kernaussage, z. B. „Der Frachtführer haftet für Verlust.“'), bedingung: { feld: 'statements', vorhanden: true } },
    ],
  },
  flashcards: {
    muster: 'C',
    finder: '.lernkarte',
    teile: [
      anweisung('Schreib zu jeder Karte die passende Antwort.'),
      {
        art: 'eintraege',
        feld: 'cards',
        felder: [
          { namen: ['front'], label: 'Frage', platzhalter: 'Frage, z. B. „Abkürzung für das Frachtrecht?“', max: TEXT_MAX, gewicht: 2, pflicht: true },
          { namen: ['back'], label: 'Richtige Antworten', platzhalter: 'Antwort – mehrere Schreibweisen mit / trennen', max: TEXT_MAX, gewicht: 3, pflicht: true, liste: true },
        ],
        mindestens: 2,
        hoechstens: 30,
        einzahl: 'Karte',
        mehrzahl: 'Karten',
        schluessel: 'tippkarte',
      },
    ],
  },
  // ── Verschachtelt ──
  fallakte: {
    muster: 'F',
    finder: '.aktenschritt',
    teile: [
      { art: 'text', feld: 'titel', namen: ['titel', 'title'], label: 'Titel des Falls', platzhalter: 'Titel des Falls (optional)', pflicht: false, max: TEXT_MAX, leerWeg: true },
      { art: 'text', feld: 'situation', namen: ['situation', 'description'], label: 'Ausgangssituation', platzhalter: 'Ausgangssituation: Was ist passiert?', pflicht: true, max: FRAGE_MAX, hoch: true },
      {
        art: 'eintraege',
        feld: 'schritte',
        namen: ['schritte', 'steps'],
        felder: [
          { namen: ['frage', 'question'], label: 'Frage', platzhalter: 'Frage dieses Schritts', max: TEXT_MAX, gewicht: 3, pflicht: true },
          { namen: ['enthuellt', 'reveal'], label: 'Wird danach enthüllt', platzhalter: 'Wird danach enthüllt (optional)', max: 10_000, gewicht: 3, pflicht: false },
        ],
        unterAntworten: { namen: ['antworten', 'answers'], mindestens: 2, hoechstens: 6, einzahl: 'Antwort', mehrzahl: 'Antworten', schluessel: 'fall-antwort' },
        vorlage: { antworten: [{ text: '', correct: true, feedback: '' }, { text: '', correct: false, feedback: '' }], enthuellt: '' },
        mindestens: 2,
        hoechstens: 12,
        einzahl: 'Schritt',
        mehrzahl: 'Schritte',
        schluessel: 'fall-schritt',
      },
      { art: 'text', feld: 'urteil', namen: ['urteil', 'verdict'], label: 'Urteil am Ende', platzhalter: 'Urteil am Ende (optional)', pflicht: false, max: FRAGE_MAX, leerWeg: true, hoch: true },
    ],
  },
  interactive_video: {
    muster: 'F',
    finder: '.quizfrage',
    pruefe: (b) => {
      const u = s(b.url).trim()
      return u && !/^https?:\/\//i.test(u) ? [{ wo: 'url', text: 'Die Adresse sollte mit https:// beginnen, sonst zeigt die Seite keinen Link.' }] : []
    },
    teile: [
      { art: 'text', feld: 'url', label: 'Adresse des Videos', platzhalter: 'https://www.youtube.com/watch?v=… (öffnet sich in einem neuen Tab)', pflicht: true, max: 2000 },
      {
        art: 'eintraege',
        feld: 'questions',
        felder: [
          { namen: ['time'], label: 'Zeitpunkt', platzhalter: 'mm:ss', max: 20, gewicht: 1, pflicht: false, zeit: true },
          { namen: ['question'], label: 'Frage', platzhalter: 'Frage zum Video', max: TEXT_MAX, gewicht: 4, pflicht: true },
        ],
        unterAntworten: { namen: ['answers'], mindestens: 2, hoechstens: 6, einzahl: 'Antwort', mehrzahl: 'Antworten', schluessel: 'video-antwort' },
        vorlage: { time: 0, type: 'multiple_choice', answers: [{ text: '', correct: true }, { text: '', correct: false }] },
        mindestens: 1,
        hoechstens: 20,
        einzahl: 'Frage',
        mehrzahl: 'Fragen',
        schluessel: 'video-frage',
      },
    ],
  },
  question_set: {
    muster: 'F',
    finder: '.quizfrage',
    teile: [
      { art: 'zahl', feld: 'pass_percentage', label: 'Bestehensgrenze in Prozent', platzhalter: 'Standard 70', min: 0, max: 100 },
      {
        art: 'unterbloecke',
        feld: 'questions',
        erlaubt: ['multiple_choice', 'single_choice', 'true_false', 'fill_blanks'],
        mindestens: 1,
        hoechstens: 20,
        einzahl: 'Frage',
        mehrzahl: 'Fragen',
        schluessel: 'kapitelfrage',
      },
    ],
  },
  // ── Einzelfeld ──
  calculation_exercise: {
    muster: 'Einzel',
    teile: [
      { art: 'text', feld: 'task', label: 'Aufgabe', platzhalter: 'Aufgabenstellung – ohne Formel, Rechenweg oder „Ergebnis:“', pflicht: true, max: FRAGE_MAX, hoch: true },
      { art: 'text', feld: 'result', label: 'Ergebnis', platzhalter: 'Ergebnis, z. B. 4.165,00 €', pflicht: true, max: 200 },
    ],
  },
  freitext: {
    muster: 'Einzel',
    teile: [
      { art: 'text', feld: 'question', namen: ['question', 'task'], label: 'Frage', platzhalter: 'Frage, die in eigenen Worten beantwortet wird', pflicht: true, max: FRAGE_MAX, hoch: true },
      { art: 'text', feld: 'solution', label: 'Musterlösung', platzhalter: 'Musterlösung, ausformuliert – sie lässt sich erst aufdecken, wenn selbst geschrieben wurde', pflicht: true, max: FRAGE_MAX, hoch: true },
      { art: 'zahl', feld: 'min_zeichen', label: 'Mindestens Zeichen', platzhalter: 'Standard 60', min: 0, max: 2000 },
      { art: 'zahl', feld: 'rows', label: 'Höhe (Zeilen)', platzhalter: 'Standard 4', min: 2, max: 12 },
    ],
  },
}

/** Die Teile des Bauplans, die für diesen Block gelten (Namen aufgelöst, Bedingungen geprüft) */
export function teileVon(plan: Bauplan, block: Record<string, unknown>): Teil[] {
  return plan.teile
    .map((t) => loese(t, block))
    .filter((t) => !('bedingung' in t && t.bedingung) || Array.isArray(block[t.bedingung.feld]) === t.bedingung.vorhanden)
}

/** Typen, die das Aufgabenwerk an Ort und Stelle öffnet */
export const AUFGABENWERK_TYPEN = Object.keys(BAUPLAENE)

export function hatBauplan(typ: unknown): typ is string {
  return typeof typ === 'string' && Object.prototype.hasOwnProperty.call(BAUPLAENE, typ)
}

/** Für das Seiten-Skript: Typ → Auswahl der anklickbaren Einträge */
export const FINDER: Record<string, string> = Object.fromEntries(
  Object.entries(BAUPLAENE).flatMap(([t, b]) => (b.finder ? [[t, b.finder]] : [])),
)

/** Verlaufs-Gruppen der Seite, nach denen die App „… gelöscht – Rückgängig“ zeigt */
export const LOESCH_TEXTE: Record<string, string> = {
  'loeschen-kategorie': 'Kategorie samt ihren Begriffen gelöscht',
  'loeschen-trainer-eintrag': 'Eintrag gelöscht',
  'loeschen-trainer-stoerer': 'Störer gelöscht',
  'loeschen-fall-antwort': 'Antwort gelöscht',
  'loeschen-video-antwort': 'Antwort gelöscht',
  ...Object.fromEntries(
    Object.values(BAUPLAENE).flatMap((b) =>
      b.teile.flatMap((t) => (t.art === 'eintraege' && t.unterliste ? [[`loeschen-${t.unterliste.schluessel}`, `${t.unterliste.einzahl} gelöscht`]] : [])),
    ),
  ),
  ...Object.fromEntries(
    Object.values(BAUPLAENE).flatMap((b) =>
      b.teile.flatMap((t) =>
        t.art === 'antworten' || t.art === 'paare' || t.art === 'zeilen' || t.art === 'eintraege' || t.art === 'zuordnen' || t.art === 'gruppen' || t.art === 'unterbloecke'
          ? [[`loeschen-${t.schluessel}`, `${t.einzahl} gelöscht`]]
          : [],
      ),
    ),
  ),
}

/** Worauf in der Seite geklickt wurde: die Frage/Anweisung oder ein Eintrag (Nummer = Stelle in der gebauten Seite) */
export type EintragOrt = { art: 'frage' } | { art: 'eintrag'; nr: number }

/** Liest einen Eintrag aus einer Nachricht; alles Fremde ergibt null */
export function liesEintrag(wert: unknown): EintragOrt | null {
  if (!wert || typeof wert !== 'object') return null
  const e = wert as Record<string, unknown>
  if (e.art === 'frage') return { art: 'frage' }
  if (e.art === 'eintrag' && typeof e.nr === 'number' && Number.isInteger(e.nr) && e.nr >= 0 && e.nr < 10_000) return { art: 'eintrag', nr: e.nr }
  return null
}

const s = (v: unknown) => (typeof v === 'string' ? v : v == null ? '' : String(v))
function istObjekt(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === 'object' && !Array.isArray(v)
}
const listeVon = (v: unknown): unknown[] => (Array.isArray(v) ? v : [])

/** Name, unter dem das Feld im Block wirklich steht (erster gleichwertiger Name, der vorkommt) */
export function echterName(block: Record<string, unknown>, namen: string[] | undefined, standard: string): string {
  if (!namen) return standard
  return namen.find((n) => block[n] !== undefined && block[n] !== null) ?? namen[0] ?? standard
}

/** Wert eines Eintrags unter dem gültigen Namen */
export function eintragsName(e: Record<string, unknown>, namen: string[]): string {
  return namen.find((n) => e[n] !== undefined && e[n] !== null) ?? namen[0]
}

/** Teil mit dem Feldnamen, der im Block gilt (`cards` oder `pairs`, `question` oder `task`) */
export function loese<T extends Teil>(teil: T, block: Record<string, unknown>): T {
  if ('namen' in teil && teil.namen && 'feld' in teil) return { ...teil, feld: echterName(block, teil.namen, teil.feld) }
  return teil
}

/**
 * Welche gespeicherten Einträge zeigt der Kern, in welcher Reihenfolge? (Er lässt unvollständige weg.)
 * Ergebnis: je angezeigtem Eintrag die Nummer im Block – oder null, wenn er keinem Eintrag entspricht.
 */
function sichtbar(block: Block): Array<number | null> | null {
  const t = block.type
  if (t === 'multiple_choice' || t === 'single_choice') return listeVon(block.answers).map((_, i) => i)
  if (t === 'true_false') return [0, 1]
  if (t === 'accordion')
    return listeVon(block.items).flatMap((e, i) => (istObjekt(e) && s(e.term) && s(e.definition).trim() ? [i] : []))
  if (t === 'dialog_cards')
    return listeVon(block.cards).flatMap((e, i) => (istObjekt(e) && s(e.front) && s(e.back).trim() ? [i] : []))
  const nichtLeer = (x: unknown) => !!s(x).trim()
  if (t === 'reihenfolge') return listeVon(block.items).flatMap((x, i) => (nichtLeer(x) ? [i] : []))
  if (t === 'calculation_example') return listeVon(block.steps).flatMap((x, i) => (nichtLeer(x) ? [i] : []))
  if (t === 'drag_drop') return listeVon(block.categories).flatMap((x, i) => (nichtLeer(x) ? [i] : []))
  if (t === 'arithmetic_quiz')
    return listeVon(block.questions).flatMap((e, i) => (istObjekt(e) && s(e.question) && nichtLeer(e.answer) ? [i] : []))
  const erster = (e: Record<string, unknown>, namen: string[]) => {
    for (const n of namen) if (e[n]) return s(e[n])
    return ''
  }
  const erster2 = (e: Record<string, unknown>, namen: string[]) => {
    for (const n of namen) if (e[n]) return e[n]
    return undefined
  }
  const eintraegeMit = (liste: unknown, a: string[], b: string[]) =>
    listeVon(liste).flatMap((e, i) => (istObjekt(e) && nichtLeer(erster(e, a)) && nichtLeer(erster(e, b)) ? [i] : []))
  if (t === 'rechenweg') return eintraegeMit(block[echterName(block, ['schritte', 'steps'], 'schritte')], ['frage', 'question'], ['ergebnis', 'result'])
  if (t === 'schaetzrunde') return eintraegeMit(block[echterName(block, ['fragen', 'questions'], 'fragen')], ['frage', 'question'], ['wert', 'value'])
  if (t === 'selbsteinschaetzung')
    return listeVon(block[echterName(block, ['punkte', 'items'], 'punkte')]).flatMap((e, i) =>
      nichtLeer(istObjekt(e) ? erster(e, ['text', 'frage']) : e) ? [i] : [],
    )
  if (t === 'single_choice_set')
    return listeVon(block.questions).flatMap((e, i) =>
      istObjekt(e) && s(e.question) && nichtLeer(e.correct) && listeVon(e.wrong).some(nichtLeer) ? [i] : [],
    )
  if (t === 'summary') {
    if (listeVon(block.questions).length)
      return listeVon(block.questions).flatMap((e, i) => (istObjekt(e) && nichtLeer(e.correct) && listeVon(e.distractors).some(nichtLeer) ? [i] : []))
    return listeVon(block.statements).flatMap((x, i) => (nichtLeer(x) ? [i] : []))
  }
  if (t === 'flashcards')
    return listeVon(block.cards).flatMap((e, i) => {
      if (!istObjekt(e) || !nichtLeer(e.front)) return []
      const antw = Array.isArray(e.back) ? e.back.some(nichtLeer) : s(e.back).split('/').some(nichtLeer)
      return antw ? [i] : []
    })
  if (t === 'fallakte')
    return listeVon(block[echterName(block, ['schritte', 'steps'], 'schritte')]).flatMap((e, i) => {
      if (!istObjekt(e) || !nichtLeer(erster(e, ['frage', 'question']))) return []
      const a = listeVon(erster2(e, ['antworten', 'answers']))
      return a.length >= 2 && a.some((x) => istObjekt(x) && x.correct) ? [i] : []
    })
  if (t === 'interactive_video')
    return listeVon(block.questions).flatMap((e, i) => (istObjekt(e) && s(e.question) && listeVon(e.answers).length >= 2 ? [i] : []))
  if (t === 'question_set')
    return listeVon(block.questions).flatMap((e, i) => {
      if (!istObjekt(e)) return []
      const typ = s(e.type) || 'multiple_choice'
      if (typ === 'true_false') return s(e.question) ? [i] : []
      if (typ === 'fill_blanks') return s(e.text).includes('*') ? [i] : []
      if (typ === 'multiple_choice' || typ === 'single_choice') return s(e.question) && listeVon(e.answers).length >= 2 ? [i] : []
      return []
    })
  if (t === 'mark_words') return markWoerter(s(block.text))
  if ((LUECKEN_TYPEN as readonly string[]).includes(t)) return luecken(zerlege(t as LueckenTyp, s(block.text))).map((_, i) => i)
  return null
}

/**
 * Passt der angeklickte Eintrag zum gespeicherten Block? `anzahl` ist, wie viele Einträge die Seite
 * gezählt hat. Stimmt etwas nicht, öffnet die Aufgabe ohne Eintrag – nie an einem falschen.
 * Das Ergebnis nennt den Eintrag **im Block** (bei Lückentexten: die Nummer der Lücke).
 */
export function eintragFuerBlock(block: Block, eintrag: EintragOrt | null, anzahl: number | null): EintragOrt | null {
  if (!eintrag || !hatBauplan(block.type)) return null
  if (eintrag.art === 'frage') return eintrag
  const liste = sichtbar(block)
  if (!liste || anzahl !== liste.length || eintrag.nr >= liste.length) return null
  const nr = liste[eintrag.nr]
  return nr === null ? null : { art: 'eintrag', nr }
}

// ── Übernahme: Die App nimmt nur, was der Bauplan erlaubt ───────────────

type Ergebnis = { ok: true; block: Block } | { ok: false; grund: string }

/** Reiner Text: keine Steuerzeichen außer Zeilenumbruch und Tab, Länge begrenzt */
export function reinerText(wert: unknown, max: number): string | null {
  // Die Längen im Bauplan sind Richtwerte der Oberfläche. Bestand darf länger sein; hart begrenzt nur das Gesamtlimit der Nachricht.
  if (typeof wert !== 'string' || wert.length > Math.max(max, TEXT_GRENZE)) return null
  return wert.replace(/\r\n?/g, '\n').replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, '')
}

/**
 * Felder eines Eintrags, die der Bauplan nicht kennt, bleiben erhalten – aber nur solche,
 * die es im gespeicherten Block schon gab, und nur einfache Werte (die Seite ist nicht vertrauenswürdig).
 */
function fremdeFelder(neu: Record<string, unknown>, bekannt: Set<string>, erlaubt: Set<string>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(neu)) {
    if (bekannt.has(k) || !erlaubt.has(k)) continue
    if ((typeof v === 'string' && v.length <= TEXT_MAX) || typeof v === 'number' || typeof v === 'boolean') out[k] = v
  }
  return out
}

/** Liste mit Einträgen nach Bauplan: nur bekannte Felder als Text, bekannte Zusatzfelder bleiben */
function uebernimmListe(
  original: Block,
  vorschlag: Record<string, unknown>,
  teil: AntwortenTeil | PaareTeil | ZuordnenTeil,
  felder: Array<{ feld: string; max: number }>,
  extra: (roh: Record<string, unknown>) => Record<string, unknown>,
): Record<string, unknown>[] | string {
  const liste = vorschlag[teil.feld]
  if (!Array.isArray(liste) || liste.length > grenze(teil.hoechstens, original[teil.feld])) return `Zu viele ${teil.mehrzahl}.`
  const bekannt = new Set([...felder.map((f) => f.feld), ...Object.keys(extra({}))])
  const alt = listeVon(original[teil.feld])
  const erlaubt = new Set(alt.flatMap((a) => (istObjekt(a) ? Object.keys(a) : [])))
  const neu: Record<string, unknown>[] = []
  for (const roh of liste) {
    if (!istObjekt(roh)) return `Ungültiger Eintrag (${teil.einzahl}).`
    const eintrag: Record<string, unknown> = { ...fremdeFelder(roh, bekannt, erlaubt) }
    for (const f of felder) {
      const t = reinerText(roh[f.feld] ?? '', f.max)
      if (t === null) return `${teil.einzahl}: Text zu lang.`
      eintrag[f.feld] = t
    }
    neu.push({ ...eintrag, ...extra(roh) })
  }
  return neu
}

const ZAHL_GRENZE = 100_000

/** Höchstzahl der Oberfläche, aber nie weniger als der Bestand (sonst ließe sich ein langer Bestandsblock nicht mehr ändern) */
const grenze = (hoechstens: number, alt: unknown) => Math.max(hoechstens, Array.isArray(alt) ? alt.length : 0)

/** Antworten mit Kreis: Text und Rückmeldung als reiner Text, richtig als Ja/Nein */
function uebernimmAntworten(wert: unknown, u: UnterAntworten): Record<string, unknown>[] | string {
  if (!Array.isArray(wert) || wert.length > Math.max(u.hoechstens, 30)) return `Zu viele ${u.mehrzahl}.`
  const out: Record<string, unknown>[] = []
  for (const roh of wert) {
    if (!istObjekt(roh)) return `Ungültige ${u.einzahl}.`
    const text = reinerText(roh.text ?? '', TEXT_MAX)
    const rueck = reinerText(roh.feedback ?? '', TEXT_MAX)
    if (text === null || rueck === null) return `${u.einzahl}: Text zu lang oder ungültig.`
    const a: Record<string, unknown> = { text, correct: roh.correct === true }
    if (rueck || 'feedback' in roh) a.feedback = rueck
    out.push(a)
  }
  return out
}

/** Einträge mit mehreren Feldern (Muster F, C kurz) */
function uebernimmEintraege(original: Block, vorschlag: Record<string, unknown>, teil: EintraegeTeil): Record<string, unknown>[] | string {
  const liste = vorschlag[teil.feld]
  if (!Array.isArray(liste) || liste.length > grenze(teil.hoechstens, original[teil.feld])) return `Zu viele ${teil.mehrzahl}.`
  const bekannt = new Set([...teil.felder.flatMap((f) => f.namen), ...(teil.unterliste ? [teil.unterliste.feld] : []), ...(teil.unterAntworten?.namen ?? [])])
  const erlaubt = new Set(listeVon(original[teil.feld]).flatMap((a) => (istObjekt(a) ? Object.keys(a) : [])))
  const neu: Record<string, unknown>[] = []
  for (const roh of liste) {
    if (!istObjekt(roh)) return `Ungültiger Eintrag (${teil.einzahl}).`
    const eintrag: Record<string, unknown> = { ...fremdeFelder(roh, bekannt, erlaubt) }
    for (const f of teil.felder) {
      const name = eintragsName(roh, f.namen)
      const v = roh[name]
      if (f.zeit) {
        if (v === undefined || v === null || v === '') continue
        if (typeof v !== 'number' || !Number.isInteger(v) || v < 0 || v > 86_400) return `${teil.einzahl}: Zeitpunkt bitte als mm:ss angeben.`
        eintrag[name] = v
        continue
      }
      if (f.liste && Array.isArray(v)) {
        const l = uebernimmTexte(v, f.max, 50, f.label)
        if (typeof l === 'string') return l
        eintrag[name] = l
        continue
      }
      const t = reinerText(typeof v === 'number' && Number.isFinite(v) ? String(v) : (v ?? ''), f.max)
      if (t === null) return `${teil.einzahl}: ${f.label} ist zu lang oder ungültig.`
      if (!f.pflicht && t === '' && !(name in roh)) continue
      eintrag[name] = f.zahl && /^-?\d{1,15}$/.test(t.trim()) ? Number(t.trim()) : t
    }
    if (teil.unterAntworten) {
      const u = teil.unterAntworten
      const name = echterName(roh, u.namen, u.namen[0])
      const l = uebernimmAntworten(roh[name], u)
      if (typeof l === 'string') return l
      eintrag[name] = l
    }
    if (teil.unterliste) {
      const u = teil.unterliste
      const l = uebernimmTexte(roh[u.feld] ?? [], TEXT_MAX, Math.max(u.hoechstens, 50), u.mehrzahl)
      if (typeof l === 'string') return l
      eintrag[u.feld] = l
    }
    neu.push(eintrag)
  }
  return neu
}

/** Liste aus reinem Text (Muster B und Teile von D) */
function uebernimmTexte(wert: unknown, max: number, hoechstens: number, wort: string): string[] | string {
  if (!Array.isArray(wert) || wert.length > hoechstens) return `Zu viele ${wort}.`
  const out: string[] = []
  for (const x of wert) {
    const t = reinerText(x ?? '', max)
    if (t === null) return `${wort}: Text zu lang oder ungültig.`
    out.push(t)
  }
  return out
}

/** Gruppen des Trainers: Titel, Hinweis, Einträge, Störer */
function uebernimmGruppen(original: Block, vorschlag: Record<string, unknown>, teil: GruppenTeil): Record<string, unknown>[] | string {
  const liste = vorschlag[teil.feld]
  if (!Array.isArray(liste) || liste.length > grenze(teil.hoechstens, original[teil.feld])) return `Zu viele ${teil.mehrzahl}.`
  const bekannt = new Set([...teil.titel, ...teil.reihe, 'hinweis', 'stoerer'])
  const erlaubt = new Set(listeVon(original[teil.feld]).flatMap((a) => (istObjekt(a) ? Object.keys(a) : [])))
  const neu: Record<string, unknown>[] = []
  for (const roh of liste) {
    if (!istObjekt(roh)) return 'Ungültige Gruppe.'
    const g: Record<string, unknown> = { ...fremdeFelder(roh, bekannt, erlaubt) }
    const titel = reinerText(roh[eintragsName(roh, teil.titel)] ?? '', TEXT_MAX)
    if (titel === null) return 'Titel der Gruppe ist zu lang oder ungültig.'
    g[eintragsName(roh, teil.titel)] = titel
    const hinweis = reinerText(roh.hinweis ?? '', TEXT_MAX)
    if (hinweis === null) return 'Hinweis der Gruppe ist zu lang.'
    if (hinweis || 'hinweis' in roh) g.hinweis = hinweis
    const reihe = uebernimmTexte(roh[eintragsName(roh, teil.reihe)], TEXT_MAX, 50, 'Einträge')
    if (typeof reihe === 'string') return reihe
    g[eintragsName(roh, teil.reihe)] = reihe
    if (roh.stoerer !== undefined) {
      const st = uebernimmTexte(roh.stoerer, TEXT_MAX, 50, 'Störer')
      if (typeof st === 'string') return st
      g.stoerer = st
    }
    neu.push(g)
  }
  return neu
}

/** Fragen des Kapiteltests: jede nach dem Bauplan ihres Typs (rekursiv, mit demselben Prüfer) */
function uebernimmFragen(original: Block, vorschlag: Record<string, unknown>, teil: UnterBloeckeTeil): Record<string, unknown>[] | string {
  const liste = vorschlag[teil.feld]
  if (!Array.isArray(liste) || liste.length > grenze(teil.hoechstens, original[teil.feld])) return `Zu viele ${teil.mehrzahl}.`
  // Zusatzfelder bleiben bei ihrer Frage, egal wohin sie verschoben wurde: erlaubt sind nur Namen, die es in
  // irgendeiner Original-Frage gab, und nur einfache Werte (die Seite ist nicht vertrauenswürdig)
  const bekannteNamen = new Set(listeVon(original[teil.feld]).flatMap((f) => (istObjekt(f) ? Object.keys(f) : [])))
  bekannteNamen.delete('type')
  const out: Record<string, unknown>[] = []
  for (let i = 0; i < liste.length; i++) {
    const roh = liste[i]
    if (!istObjekt(roh) || typeof roh.type !== 'string' || !teil.erlaubt.includes(roh.type)) return `${teil.einzahl} ${i + 1}: Dieser Typ ist im Kapiteltest nicht möglich.`
    const basis: Record<string, unknown> = { type: roh.type }
    for (const [k, v] of Object.entries(roh)) {
      if (!bekannteNamen.has(k) || k === '__proto__') continue
      if ((typeof v === 'string' && v.length <= TEXT_MAX) || typeof v === 'number' || typeof v === 'boolean') basis[k] = v
    }
    const r = uebernimmAufgabe(basis as Block, roh)
    if (!r.ok) return `${teil.einzahl} ${i + 1}: ${r.grund}`
    out.push(r.block)
  }
  return out
}

/**
 * Prüft den Vorschlag der Seite gegen den Bauplan und setzt ihn auf den gespeicherten Block.
 * Unbekannte Felder des Blocks kommen immer aus dem Original.
 */
export function uebernimmAufgabe(original: Block, vorschlag: unknown): Ergebnis {
  const plan = hatBauplan(original.type) ? BAUPLAENE[original.type] : null
  if (!plan) return { ok: false, grund: 'Dieser Aufgabentyp lässt sich hier nicht bearbeiten.' }
  if (!istObjekt(vorschlag) || vorschlag.type !== original.type) return { ok: false, grund: 'Die Änderung passt nicht zu dieser Aufgabe.' }
  const block: Block = { ...original }
  for (const teil of teileVon(plan, original)) {
    if (teil.art === 'text' || teil.art === 'luecken') {
      const label = teil.art === 'text' ? teil.label : 'Text'
      const t = reinerText(vorschlag[teil.feld] ?? '', teil.art === 'text' ? teil.max : LUECKENTEXT_MAX)
      if (t === null) return { ok: false, grund: `${label}: zu lang oder ungültig.` }
      if (teil.art === 'text' && teil.leerWeg && !t.trim()) delete block[teil.feld]
      else block[teil.feld] = t
    } else if (teil.art === 'wahrfalsch') {
      if (typeof vorschlag[teil.feld] !== 'boolean') return { ok: false, grund: 'Wahr oder falsch fehlt.' }
      block[teil.feld] = vorschlag[teil.feld]
      for (const f of [teil.rueckmeldungRichtig, teil.rueckmeldungFalsch]) {
        const t = reinerText(vorschlag[f] ?? '', TEXT_MAX)
        if (t === null) return { ok: false, grund: 'Rückmeldung zu lang.' }
        if (t) block[f] = t
        else delete block[f]
      }
    } else if (teil.art === 'antworten') {
      const l = uebernimmListe(
        original,
        vorschlag,
        teil,
        [
          { feld: teil.textFeld, max: TEXT_MAX },
          { feld: teil.rueckmeldungFeld, max: TEXT_MAX },
        ],
        (roh) => ({ [teil.richtigFeld]: roh[teil.richtigFeld] === true }),
      )
      if (typeof l === 'string') return { ok: false, grund: l }
      block[teil.feld] = l
    } else if (teil.art === 'paare') {
      const l = uebernimmListe(original, vorschlag, teil, [teil.links, teil.rechts], () => ({}))
      if (typeof l === 'string') return { ok: false, grund: l }
      block[teil.feld] = l
    } else if (teil.art === 'zeilen') {
      const l = uebernimmTexte(vorschlag[teil.feld], teil.max, grenze(teil.hoechstens, original[teil.feld]), teil.mehrzahl)
      if (typeof l === 'string') return { ok: false, grund: l }
      block[teil.feld] = l
    } else if (teil.art === 'eintraege') {
      const l = uebernimmEintraege(original, vorschlag, teil)
      if (typeof l === 'string') return { ok: false, grund: l }
      block[teil.feld] = l
    } else if (teil.art === 'zahl') {
      const v = vorschlag[teil.feld]
      if (v === undefined || v === null || v === '') delete block[teil.feld]
      else if (typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= ZAHL_GRENZE && ((v >= teil.min && v <= teil.max) || v === original[teil.feld])) block[teil.feld] = v
      else return { ok: false, grund: `${teil.label}: bitte eine ganze Zahl von ${teil.min} bis ${teil.max} eingeben.` }
    } else if (teil.art === 'zuordnen') {
      const kat = uebernimmTexte(vorschlag[teil.kategorien], TEXT_MAX, grenze(20, original[teil.kategorien]), 'Kategorien')
      if (typeof kat === 'string') return { ok: false, grund: kat }
      const l = uebernimmListe(original, vorschlag, teil, [{ feld: 'text', max: TEXT_MAX }, { feld: 'category', max: TEXT_MAX }], () => ({}))
      if (typeof l === 'string') return { ok: false, grund: l }
      block[teil.kategorien] = kat
      block[teil.feld] = l
    } else if (teil.art === 'unterbloecke') {
      const l = uebernimmFragen(original, vorschlag, teil)
      if (typeof l === 'string') return { ok: false, grund: l }
      block[teil.feld] = l
    } else {
      const l = uebernimmGruppen(original, vorschlag, teil)
      if (typeof l === 'string') return { ok: false, grund: l }
      block[teil.feld] = l
    }
  }
  return { ok: true, block }
}

// ── Hinweise am Ort (gleiche Regeln in Seite und Tests) ─────────────────

export type Hinweis = { wo: string; text: string }

/** Was an der Aufgabe noch fehlt; `wo` ist das Feld (bei Listen auch `feld-…`) */
export function hinweise(block: Block): Hinweis[] {
  const plan = hatBauplan(block.type) ? BAUPLAENE[block.type] : null
  if (!plan) return []
  const out: Hinweis[] = []
  for (const teil of teileVon(plan, block)) {
    if (teil.art === 'text' && teil.pflicht && !s(block[teil.feld]).trim()) {
      out.push({ wo: teil.feld, text: `${teil.label} fehlt.` })
    }
    if (teil.art === 'antworten' || teil.art === 'paare' || teil.art === 'zeilen' || teil.art === 'eintraege' || teil.art === 'gruppen') {
      const l = listeVon(block[teil.feld]).filter((x) => (teil.art === 'zeilen' ? true : istObjekt(x)))
      if (l.length < teil.mindestens) out.push({ wo: teil.feld, text: `Mindestens ${teil.mindestens} ${teil.mindestens === 1 ? teil.einzahl : teil.mehrzahl} nötig.` })
    }
    if (teil.art === 'zeilen') {
      if (listeVon(block[teil.feld]).some((x) => !s(x).trim())) out.push({ wo: `${teil.feld}-leer`, text: `Eine ${teil.einzahl} ist noch leer.` })
    }
    if (teil.art === 'eintraege') {
      listeVon(block[teil.feld]).forEach((x, i) => {
        if (!istObjekt(x)) return
        const fehlen = teil.felder.filter((f) => f.pflicht && !s(x[eintragsName(x, f.namen)]).trim())
        if (teil.unterAntworten) {
          const u = teil.unterAntworten
          const a = listeVon(x[echterName(x, u.namen, u.namen[0])]).filter(istObjekt)
          if (a.length < u.mindestens) out.push({ wo: `${teil.feld}-unter-${i}`, text: `${teil.einzahl} ${i + 1}: mindestens ${u.mindestens} ${u.mehrzahl} nötig.` })
          else if (a.filter((y) => y.correct === true).length !== 1) out.push({ wo: `${teil.feld}-richtig-${i}`, text: `${teil.einzahl} ${i + 1}: Klick auf den Kreis vor der richtigen Antwort.` })
          if (a.some((y) => !s(y.text).trim())) out.push({ wo: `${teil.feld}-leer-${i}-antwort`, text: `${teil.einzahl} ${i + 1}: eine Antwort ist noch leer.` })
        }
        if (teil.unterliste) {
          const u = teil.unterliste
          if (listeVon(x[u.feld]).filter((y) => s(y).trim()).length < u.mindestens)
            out.push({ wo: `${teil.feld}-unter-${i}`, text: `${teil.einzahl} ${i + 1}: mindestens ${u.mindestens} ${u.mehrzahl.toLowerCase()} nötig.` })
        }
        if (fehlen.length) out.push({ wo: `${teil.feld}-leer-${i}`, text: `${teil.einzahl} ${i + 1}: ${fehlen.map((f) => f.label).join(' und ')} fehlt.` })
      })
    }
    if (teil.art === 'unterbloecke') {
      const n = listeVon(block[teil.feld]).length
      if (n < teil.mindestens) out.push({ wo: teil.feld, text: `Mindestens ${teil.mindestens} ${teil.mindestens === 1 ? teil.einzahl : teil.mehrzahl} nötig.` })
      else if (n < 3) out.push({ wo: teil.feld, text: `Nur ${n} ${n === 1 ? teil.einzahl : teil.mehrzahl} – drei bis vier sind ideal, sonst ist die Hürde leicht zu erraten.` })
    }
    if (teil.art === 'zahl') {
      const v = block[teil.feld]
      if (v !== undefined && v !== null && v !== '' && (typeof v !== 'number' || v < teil.min || v > teil.max))
        out.push({ wo: teil.feld, text: `${teil.label}: eine Zahl von ${teil.min} bis ${teil.max} (sonst nimmt die Seite ihren Standard).` })
    }
    if (teil.art === 'zuordnen') {
      const kat = listeVon(block[teil.kategorien]).map((k) => s(k).trim())
      const begriffe = listeVon(block[teil.feld]).filter(istObjekt)
      if (kat.filter(Boolean).length < teil.mindestKategorien) out.push({ wo: teil.kategorien, text: `Mindestens ${teil.mindestKategorien} Kategorien nötig.` })
      if (kat.some((k) => !k)) out.push({ wo: `${teil.kategorien}-leer`, text: 'Eine Kategorie hat noch keinen Namen.' })
      if (new Set(kat.filter(Boolean)).size < kat.filter(Boolean).length) out.push({ wo: `${teil.kategorien}-doppelt`, text: 'Zwei Kategorien heißen gleich.' })
      if (begriffe.length < 2) out.push({ wo: teil.feld, text: 'Mindestens 2 Begriffe nötig.' })
      if (begriffe.some((b) => !kat.includes(s(b.category).trim()) || !s(b.category).trim()))
        out.push({ wo: `${teil.feld}-ohne`, text: 'Ein Begriff gehört noch zu keiner Kategorie.' })
      if (begriffe.some((b) => !s(b.text).trim())) out.push({ wo: `${teil.feld}-leer`, text: 'Ein Begriff ist noch leer.' })
    }
    if (teil.art === 'gruppen') {
      listeVon(block[teil.feld]).forEach((g, i) => {
        if (!istObjekt(g)) return
        if (!s(g[eintragsName(g, teil.titel)]).trim()) out.push({ wo: `${teil.feld}-titel-${i}`, text: `Gruppe ${i + 1}: Titel fehlt.` })
        const reihe = listeVon(g[eintragsName(g, teil.reihe)]).filter((x) => s(x).trim())
        if (reihe.length < teil.mindestensReihe) out.push({ wo: `${teil.feld}-reihe-${i}`, text: `Gruppe ${i + 1}: mindestens ${teil.mindestensReihe} Einträge nötig.` })
      })
    }
    if (teil.art === 'antworten') {
      const l = listeVon(block[teil.feld]).filter(istObjekt)
      const richtig = l.filter((a) => a[teil.richtigFeld] === true).length
      if (l.length >= teil.mindestens && richtig !== 1) out.push({ wo: teil.feld, text: 'Klick auf den Kreis vor der richtigen Antwort.' })
      if (l.some((a) => !s(a[teil.textFeld]).trim())) out.push({ wo: `${teil.feld}-leer`, text: `Eine ${teil.einzahl} ist noch leer.` })
    }
    if (teil.art === 'luecken') {
      const text = s(block[teil.feld])
      const st = zerlege(teil.typ, text)
      if (!text.trim()) out.push({ wo: teil.feld, text: 'Schreib den Text hier hinein.' })
      else if (luecken(st).length === 0)
        out.push({ wo: teil.feld, text: `Noch keine ${teil.mehrzahl}: Wort auswählen und „${teil.knopf}“ klicken.` })
      if (hatEinzelnesSternchen(st)) out.push({ wo: `${teil.feld}-stern`, text: 'Im Text steht ein einzelnes Sternchen (*). Schüler sähen es als Zeichen.' })
      if (hatHtmlReste(text)) out.push({ wo: `${teil.feld}-html`, text: 'Im Text stehen HTML-Zeichen (<p>), die Lernende sehen würden.' })
    }
  }
  if (plan.pruefe) out.push(...plan.pruefe(block))
  return out
}
