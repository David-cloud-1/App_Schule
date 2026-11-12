/**
 * Aufgabentyp-Katalog des Baukasten-Editors (PROJ-90): alle Typen, die der Kern
 * (`seite.py`, `BAUSTEINE`) baut, in Gruppen, mit Texten für die Auswahl und
 * einem Beispielinhalt, mit dem ein neuer Block startet (E2).
 *
 * Die Beispielinhalte liegen als JSON daneben, damit auch der Kern-Test sie
 * lesen kann (jedes Beispiel muss ohne Warnung bauen).
 */
import BEISPIELE from './werkzeugkiste-katalog-beispiele.json'
import { kopie, typName, type Block, type EditorBefund, type Struktur } from './werkzeugkiste-editor'

export type GruppeId = 'lesen' | 'abfragen' | 'luecken' | 'ordnen' | 'rechnen' | 'spiele' | 'selbstcheck'

export const GRUPPEN: { id: GruppeId; titel: string }[] = [
  { id: 'lesen', titel: 'Lesen & Nachschlagen' },
  { id: 'abfragen', titel: 'Abfragen' },
  { id: 'luecken', titel: 'Lücken & Wörter' },
  { id: 'ordnen', titel: 'Zuordnen & Ordnen' },
  { id: 'rechnen', titel: 'Rechnen' },
  { id: 'spiele', titel: 'Spiele & Rätsel' },
  { id: 'selbstcheck', titel: 'Selbstcheck & Wiederholen' },
]

export interface KatalogEintrag {
  typ: string
  name: string
  gruppe: GruppeId
  /** Was die Schüler tun (ein Satz) */
  beschreibung: string
  /** Didaktik (E3), ohne „Gut für:“ */
  gutFuer: string
  suchbegriffe: string[]
  /** Zählt in den Fortschritt der Seite (PRUEFBAR im Kern) */
  wirdAusgewertet: boolean
  /** Braucht ein Bild des Materials (E5) */
  brauchtBild: boolean
}

type Roh = Omit<KatalogEintrag, 'name' | 'wirdAusgewertet' | 'brauchtBild'> & { ohneAuswertung?: true; bild?: true }

const ROH: Roh[] = [
  // Lesen & Nachschlagen
  {
    typ: 'text',
    gruppe: 'lesen',
    beschreibung: 'Ein gestalteter Text mit Überschriften, Listen, Tabellen und Boxen wie Merke oder Tipp.',
    gutFuer: 'neuen Stoff erklären, Lernziele und Merksätze festhalten.',
    suchbegriffe: ['Text', 'Merke', 'Tipp', 'Box', 'Erklärung', 'Tabelle', 'Lernziele', 'Absatz'],
    ohneAuswertung: true,
  },
  {
    typ: 'image',
    gruppe: 'lesen',
    beschreibung: 'Ein Bild aus dem Skript mit Bildunterschrift.',
    gutFuer: 'Schaubilder, Formulare und Karten zeigen, über die anschließend gesprochen wird.',
    suchbegriffe: ['Bild', 'Abbildung', 'Grafik', 'Foto', 'Image', 'Schaubild'],
    ohneAuswertung: true,
    bild: true,
  },
  {
    typ: 'accordion',
    gruppe: 'lesen',
    beschreibung: 'Begriffe, deren Erklärung sich beim Antippen aufklappt.',
    gutFuer: 'Fachbegriffe zum Nachschlagen, ohne die Seite zu überladen.',
    suchbegriffe: ['Akkordeon', 'Accordion', 'Glossar', 'Begriffe', 'Aufklappen', 'Definitionen'],
    ohneAuswertung: true,
  },
  {
    typ: 'tabelle',
    gruppe: 'lesen',
    beschreibung: 'Eine Tabelle mit Kopfzeile, die du wie in Excel bearbeitest – ohne HTML.',
    gutFuer: 'Kosten, Fristen und Vergleiche übersichtlich zeigen.',
    suchbegriffe: ['Tabelle', 'Zeilen', 'Spalten', 'Excel', 'Vergleich', 'Übersicht', 'Zebra'],
    ohneAuswertung: true,
  },
  {
    typ: 'diagramm',
    gruppe: 'lesen',
    beschreibung: 'Ein Säulen-, Balken-, Linien- oder Kreisdiagramm aus einer kleinen Zahlentabelle.',
    gutFuer: 'Entwicklungen und Anteile zeigen, z. B. Umsatz je Quartal oder die Kostenstruktur.',
    suchbegriffe: ['Diagramm', 'Säulen', 'Balken', 'Linie', 'Kreis', 'Torte', 'Grafik', 'Statistik', 'Zahlen'],
    ohneAuswertung: true,
  },
  {
    typ: 'calculation_example',
    gruppe: 'lesen',
    beschreibung: 'Eine vorgerechnete Aufgabe mit Formel, Rechenschritten und Ergebnis.',
    gutFuer: 'einen Rechenweg vorführen, bevor die Schüler selbst rechnen.',
    suchbegriffe: ['Rechenbeispiel', 'Musterrechnung', 'Formel', 'vorrechnen', 'Calculation'],
    ohneAuswertung: true,
  },
  // Abfragen
  {
    typ: 'multiple_choice',
    gruppe: 'abfragen',
    beschreibung: 'Eine Frage mit mehreren Antworten, von denen genau eine richtig ist, mit Rückmeldung je Antwort.',
    gutFuer: 'Verständnis schnell prüfen und typische Fehlvorstellungen aufdecken.',
    suchbegriffe: ['Quiz', 'Multiple Choice', 'MC', 'Single Choice', 'Auswahl', 'Frage', 'Antworten'],
  },
  {
    typ: 'true_false',
    gruppe: 'abfragen',
    beschreibung: 'Eine Aussage, die als richtig oder falsch eingeordnet wird.',
    gutFuer: 'einen schnellen Aufwärmer am Kapitelanfang oder das Prüfen klarer Regeln.',
    suchbegriffe: ['Richtig falsch', 'True False', 'wahr', 'Aussage', 'Ja Nein'],
  },
  {
    typ: 'single_choice_set',
    gruppe: 'abfragen',
    beschreibung: 'Mehrere kurze Fragen nacheinander, je eine richtige Antwort.',
    gutFuer: 'Grundwissen in hohem Tempo wiederholen.',
    suchbegriffe: ['Schnellfragen', 'Single Choice Set', 'Fragenserie', 'Blitzrunde', 'Quiz'],
  },
  {
    typ: 'question_set',
    gruppe: 'abfragen',
    beschreibung: 'Ein kleiner Test aus mehreren Fragen mit Bestehensgrenze.',
    gutFuer: 'den Abschluss eines Themas: Haben alle das Wichtigste verstanden?',
    suchbegriffe: ['Kapiteltest', 'Test', 'Question Set', 'Quiz', 'Lernzielkontrolle', 'Prüfung'],
  },
  {
    typ: 'freitext',
    gruppe: 'abfragen',
    beschreibung: 'Eine offene Frage. Erst nach eigener Antwort lässt sich die Musterlösung aufdecken.',
    gutFuer: 'Begründungen, Entscheidungen und Stellungnahmen – das, was Ankreuzen nicht prüfen kann.',
    suchbegriffe: ['Offene Frage', 'Freitext', 'Essay', 'Begründung', 'Musterlösung', 'Schreiben'],
  },
  {
    typ: 'interactive_video',
    gruppe: 'abfragen',
    beschreibung: 'Ein verlinktes Video mit Fragen zu bestimmten Zeitpunkten.',
    gutFuer: 'Lernvideos aktiv anschauen statt nur nebenbei laufen lassen.',
    suchbegriffe: ['Video', 'Interactive Video', 'YouTube', 'Film', 'Zeitmarke'],
  },
  // Lücken & Wörter
  {
    typ: 'fill_blanks',
    gruppe: 'luecken',
    beschreibung: 'Ein Text mit Lücken, in die die Schüler die fehlenden Begriffe tippen.',
    gutFuer: 'Fachbegriffe sicher und richtig geschrieben abrufen.',
    suchbegriffe: ['Lückentext', 'Fill in the Blanks', 'Lücken', 'Cloze', 'Einsetzen'],
  },
  {
    typ: 'advanced_fill_blanks',
    gruppe: 'luecken',
    beschreibung: 'Ein Lückentext, bei dem jede Lücke einen eigenen Tipp anbietet.',
    gutFuer: 'schwierigere Begriffe, bei denen ein kleiner Schubs hilft.',
    suchbegriffe: ['Lückentext mit Hinweis', 'Advanced Fill the Blanks', 'Tipp', 'Hilfe', 'Lücken'],
  },
  {
    typ: 'drag_words',
    gruppe: 'luecken',
    beschreibung: 'Die fehlenden Wörter liegen bereit und werden in die Lücken gezogen.',
    gutFuer: 'leistungsschwächere Gruppen und den Einstieg in neue Fachsprache.',
    suchbegriffe: ['Wörter ziehen', 'Drag the Words', 'Ziehen', 'Lücken', 'Drag'],
  },
  {
    typ: 'mark_words',
    gruppe: 'luecken',
    beschreibung: 'In einem Text werden die gesuchten Wörter angeklickt.',
    gutFuer: 'Fachbegriffe in einem Fließtext erkennen, z. B. Fehler oder Schlüsselwörter.',
    suchbegriffe: ['Wörter markieren', 'Mark the Words', 'Markieren', 'Anklicken', 'Finden'],
  },
  // Zuordnen & Ordnen
  {
    typ: 'drag_drop',
    gruppe: 'ordnen',
    beschreibung: 'Begriffe werden in die passenden Kategorien gezogen.',
    gutFuer: 'Einordnen und Unterscheiden, z. B. Vor- und Nachteile oder Fachbereiche.',
    suchbegriffe: ['Zuordnen', 'Drag and Drop', 'Kategorien', 'Sortieren', 'Gruppieren'],
  },
  {
    typ: 'reihenfolge',
    gruppe: 'ordnen',
    beschreibung: 'Einträge werden in die richtige Reihenfolge gebracht.',
    gutFuer: 'Prozessschritte, Abläufe und Rangfolgen.',
    suchbegriffe: ['Reihenfolge', 'Ordnen', 'Ablauf', 'Prozess', 'Sequenz', 'Sortieren'],
  },
  {
    typ: 'bildzuordnung',
    gruppe: 'ordnen',
    beschreibung: 'Begriffe werden an die richtige Stelle eines Bildes gesetzt.',
    gutFuer: 'Formulare, Karten und Schaubilder beschriften.',
    suchbegriffe: ['Bildzuordnung', 'Beschriften', 'Hotspot', 'Image Hotspot', 'Karte', 'Bild'],
    bild: true,
  },
  {
    typ: 'image_sequencing',
    gruppe: 'ordnen',
    beschreibung: 'Abbildungen oder Schritte werden in die richtige Reihenfolge gebracht.',
    gutFuer: 'Abläufe, die sich mit Bildern aus dem Skript zeigen lassen.',
    suchbegriffe: ['Bilder ordnen', 'Image Sequencing', 'Reihenfolge', 'Bildfolge', 'Ablauf'],
  },
  // Rechnen
  {
    typ: 'calculation_exercise',
    gruppe: 'rechnen',
    beschreibung: 'Eine Rechenaufgabe, deren Ergebnis eingetippt und geprüft wird.',
    gutFuer: 'einstufige Rechnungen, bei denen nur das Ergebnis zählt.',
    suchbegriffe: ['Rechenaufgabe', 'Rechnen', 'Ergebnis', 'Mathe', 'Calculation'],
  },
  {
    typ: 'arithmetic_quiz',
    gruppe: 'rechnen',
    beschreibung: 'Mehrere kurze Rechnungen hintereinander.',
    gutFuer: 'Kopfrechnen und Grundrechenarten auffrischen.',
    suchbegriffe: ['Kopfrechnen', 'Arithmetic Quiz', 'Rechnen', 'Mathe', 'Training'],
  },
  {
    typ: 'rechenweg',
    gruppe: 'rechnen',
    beschreibung: 'Eine Rechnung in geprüften Zwischenschritten. Wer sich verrechnet, sieht, wo.',
    gutFuer: 'mehrstufige Rechnungen – besser als nur das Endergebnis abzufragen.',
    suchbegriffe: ['Rechenweg', 'Zwischenschritte', 'Schritt für Schritt', 'Kalkulation', 'Rechnen'],
  },
  {
    typ: 'schaetzrunde',
    gruppe: 'rechnen',
    beschreibung: 'Erst eine Zahl schätzen, dann auflösen. Es gibt kein Falsch, nur wie weit daneben.',
    gutFuer: 'den Einstieg ins Kapitel, wenn es um Größen, Mengen oder Kosten geht.',
    suchbegriffe: ['Schätzrunde', 'Schätzen', 'Einstieg', 'Zahlen', 'Größen'],
  },
  // Spiele & Rätsel
  {
    typ: 'crossword',
    gruppe: 'spiele',
    beschreibung: 'Ein Kreuzworträtsel aus Fachbegriffen und ihren Umschreibungen.',
    gutFuer: 'Fachbegriffe spielerisch wiederholen, z. B. am Ende eines Themas.',
    suchbegriffe: ['Kreuzworträtsel', 'Crossword', 'Rätsel', 'Begriffe'],
  },
  {
    typ: 'find_words',
    gruppe: 'spiele',
    beschreibung: 'Im Buchstabensalat werden die gesuchten Begriffe gefunden.',
    gutFuer: 'einen lockeren Einstieg oder eine Pause mit Fachbegriffen.',
    suchbegriffe: ['Wörtersuche', 'Find the Words', 'Buchstabensalat', 'Suchsel', 'Rätsel'],
  },
  {
    typ: 'memory_game',
    gruppe: 'spiele',
    beschreibung: 'Paare aus Begriff und Erklärung werden aufgedeckt.',
    gutFuer: 'Begriffe und Bedeutungen verknüpfen, gut auch für Partnerarbeit.',
    suchbegriffe: ['Memory', 'Paare', 'Memory Game', 'Spiel', 'Aufdecken'],
  },
  {
    typ: 'trainer',
    gruppe: 'spiele',
    beschreibung: 'Ein Übungsstapel über mehrere Runden. Was danebengeht, kommt gezielt noch einmal.',
    gutFuer: 'alles, was wirklich auswendig sitzen muss.',
    suchbegriffe: ['Trainer', 'Üben', 'Wiederholen', 'Auswendig', 'Drill', 'Karteikasten'],
  },
  {
    typ: 'fallakte',
    gruppe: 'spiele',
    beschreibung: 'Ein Fall, der sich Schritt für Schritt aufklärt: Jede richtige Antwort enthüllt einen neuen Fakt.',
    gutFuer: 'einen roten Faden durchs Kapitel, höchstens einmal pro Thema.',
    suchbegriffe: ['Fallakte', 'Fall', 'Krimi', 'Fallstudie', 'Detektiv', 'Story'],
  },
  // Selbstcheck & Wiederholen
  {
    typ: 'dialog_cards',
    gruppe: 'selbstcheck',
    beschreibung: 'Lernkarten mit Vorder- und Rückseite zum Umdrehen.',
    gutFuer: 'Selbstabfrage von Begriffen und Definitionen.',
    suchbegriffe: ['Lernkarten', 'Dialog Cards', 'Karteikarten', 'Umdrehen', 'Flashcards'],
    ohneAuswertung: true,
  },
  {
    typ: 'flashcards',
    gruppe: 'selbstcheck',
    beschreibung: 'Lernkarten, bei denen die Antwort getippt und geprüft wird.',
    gutFuer: 'Begriffe aktiv abrufen statt nur wiedererkennen.',
    suchbegriffe: ['Lernkarten zum Tippen', 'Flashcards', 'Karteikarten', 'Vokabeln', 'Abfragen'],
  },
  {
    typ: 'summary',
    gruppe: 'selbstcheck',
    beschreibung: 'Aus mehreren Aussagen wird jeweils die richtige gewählt, am Ende steht die Zusammenfassung.',
    gutFuer: 'das Kapitelende: die Kernaussagen noch einmal sichern.',
    suchbegriffe: ['Zusammenfassung', 'Summary', 'Kernaussagen', 'Wiederholung', 'Fazit'],
  },
  {
    typ: 'selbsteinschaetzung',
    gruppe: 'selbstcheck',
    beschreibung: 'Eine Kann-Liste mit drei Stufen (Sitzt / Geht so / Noch nicht) und Hinweisen zum Nachlesen.',
    gutFuer: 'ganz ans Kapitelende, nach dem Kapiteltest.',
    suchbegriffe: ['Selbsteinschätzung', 'Kann-Liste', 'Ich kann', 'Reflexion', 'Selbstcheck'],
  },
]

export const KATALOG: KatalogEintrag[] = ROH.map(({ ohneAuswertung, bild, ...r }) => ({
  ...r,
  name: typName(r.typ),
  wirdAusgewertet: !ohneAuswertung,
  brauchtBild: !!bild,
}))

/** Im Kapiteltest erlaubte Typen im Katalog (single_choice zeigt der Katalog nicht, E8) */
export const KAPITELTEST_KATALOG = ['multiple_choice', 'true_false', 'fill_blanks'] as const

export function katalogEintrag(typ: string): KatalogEintrag | undefined {
  return KATALOG.find((e) => e.typ === typ)
}

// ── Beispielinhalte ──────────────────────────────────────────────────────

const BEISPIEL: Record<string, Block> = BEISPIELE as Record<string, Block>

/** Neuer Block mit Beispielinhalt (immer eine frische Kopie); `bild` setzt den Bildpfad */
export function beispielBlock(typ: string, bild?: string): Block {
  const vorlage = BEISPIEL[typ] ?? (typ === 'single_choice' ? { ...BEISPIEL.multiple_choice, type: 'single_choice' } : null)
  if (!vorlage) return { type: typ }
  const block = kopie(vorlage)
  if (bild && 'path' in block) block.path = bild
  return block
}

/** Felder, die beim Vergleich mit dem Beispiel nicht zählen (das gewählte Bild) */
function ohneBild(block: Block): Block {
  const { path: _p, ...rest } = block
  void _p
  return rest as Block
}

function gleich(a: unknown, b: unknown): boolean {
  if (a === b) return true
  if (Array.isArray(a) || Array.isArray(b)) {
    return Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((x, i) => gleich(x, b[i]))
  }
  if (a && b && typeof a === 'object' && typeof b === 'object') {
    const ka = Object.keys(a).filter((k) => (a as Record<string, unknown>)[k] !== undefined)
    const kb = Object.keys(b).filter((k) => (b as Record<string, unknown>)[k] !== undefined)
    return ka.length === kb.length && ka.every((k) => gleich((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k]))
  }
  return false
}

/** Enthält der Block noch genau den Beispielinhalt seines Typs? (E2) */
export function istBeispiel(block: Block | null | undefined): boolean {
  if (!block || typeof block.type !== 'string') return false
  const vorlage = BEISPIEL[block.type]
  return !!vorlage && gleich(ohneBild(block), ohneBild(vorlage))
}

/** Ist eine Frage im Kapiteltest noch eine unveränderte Beispielfrage? */
function istBeispielFrage(frage: unknown): boolean {
  const f = frage as Block
  if (!f || typeof f !== 'object') return false
  if (istBeispiel(f)) return true
  const qs = BEISPIEL.question_set?.questions
  return Array.isArray(qs) && qs.some((q) => gleich(f, q))
}

export const BEISPIEL_HINWEIS = 'Beispielinhalt noch nicht ersetzt'

/**
 * Hinweise für Blöcke mit unverändertem Beispielinhalt – berechnet, nie gespeichert.
 * Ein Kapiteltest zählt, wenn er selbst oder eine seiner Fragen noch Beispiel ist.
 */
export function beispielBefunde(s: Struktur): EditorBefund[] {
  const befunde: EditorBefund[] = []
  s.chapters.forEach((t, ti) =>
    t.elements.forEach((b, bi) => {
      const frageBeispiel = b.type === 'question_set' && Array.isArray(b.questions) && b.questions.some(istBeispielFrage)
      if (istBeispiel(b) || frageBeispiel) {
        befunde.push({
          text: `Thema ${ti + 1} – ${typName(String(b.type))}: ${BEISPIEL_HINWEIS}`,
          schwere: 'mittel',
          stellen: [{ kapitel: ti, element: bi }],
        })
      }
    }),
  )
  const qs = (s.final_chapter?.question_set as { questions?: unknown[] } | undefined)?.questions
  if (Array.isArray(qs) && qs.some(istBeispielFrage)) {
    befunde.push({ text: `Lernzielkontrolle – Abschlusstest: ${BEISPIEL_HINWEIS}`, schwere: 'mittel', stellen: [{ abschluss: true }] })
  }
  return befunde
}

/**
 * Editor-Hinweise, die die Prüfstelle des Kerns nicht kennt (PROJ-90):
 * Video ohne gültige Web-Adresse – der Kern verlinkt dann nichts.
 */
export function editorBefunde(s: Struktur): EditorBefund[] {
  const befunde = beispielBefunde(s)
  s.chapters.forEach((t, ti) =>
    t.elements.forEach((b, bi) => {
      if (b.type !== 'interactive_video') return
      const url = typeof b.url === 'string' ? b.url.trim() : ''
      if (!/^https?:\/\/\S+$/i.test(url)) {
        befunde.push({
          text: `Thema ${ti + 1} – Video mit Fragen: Video-Adresse prüfen (sie muss mit https:// beginnen)`,
          schwere: 'mittel',
          stellen: [{ kapitel: ti, element: bi }],
        })
      }
    }),
  )
  return befunde
}

/** Wie viele Blöcke (inkl. Abschlusstest) enthalten noch Beispielinhalt? */
export function anzahlBeispiele(s: Struktur): number {
  return beispielBefunde(s).length
}

// ── Suche ────────────────────────────────────────────────────────────────

/** Klein, ohne Umlaute und Satzzeichen: „Schätzrunde“, „schaetz“ und „schatz“ treffen sich */
export function normalisiere(text: string): string {
  return text
    .toLowerCase()
    .replace(/ä/g, 'a')
    .replace(/ö/g, 'o')
    .replace(/ü/g, 'u')
    .replace(/ß/g, 'ss')
    .replace(/ae/g, 'a')
    .replace(/oe/g, 'o')
    .replace(/ue/g, 'u')
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

const SUCHTEXT = new Map(
  KATALOG.map((e) => [e.typ, normalisiere([e.name, e.beschreibung, e.gutFuer, ...e.suchbegriffe, e.typ.replace(/_/g, ' ')].join(' '))]),
)

/** Filtert den Katalog; alle Wörter der Suche müssen vorkommen. `erlaubt` begrenzt die Typen (Kapiteltest). */
export function sucheKatalog(suche: string, erlaubt?: readonly string[]): KatalogEintrag[] {
  const basis = erlaubt ? KATALOG.filter((e) => erlaubt.includes(e.typ)) : KATALOG
  const woerter = normalisiere(suche).split(' ').filter(Boolean)
  if (!woerter.length) return basis
  return basis.filter((e) => woerter.every((w) => SUCHTEXT.get(e.typ)!.includes(w)))
}

/** Einträge nach Gruppen in fester Reihenfolge; leere Gruppen fallen weg */
export function nachGruppen(eintraege: KatalogEintrag[]): { id: GruppeId; titel: string; eintraege: KatalogEintrag[] }[] {
  return GRUPPEN.map((g) => ({ ...g, eintraege: eintraege.filter((e) => e.gruppe === g.id) })).filter((g) => g.eintraege.length)
}

// ── Zuletzt verwendet (pro Gerät, E7) ────────────────────────────────────

const ZULETZT_SCHLUESSEL = 'wk-katalog-zuletzt'
export const ZULETZT_ANZAHL = 4

export function leseZuletzt(): string[] {
  try {
    const roh = JSON.parse(window.localStorage.getItem(ZULETZT_SCHLUESSEL) ?? '[]')
    return Array.isArray(roh) ? roh.filter((t): t is string => typeof t === 'string' && !!katalogEintrag(t)).slice(0, ZULETZT_ANZAHL) : []
  } catch {
    return []
  }
}

export function merkeZuletzt(typ: string): string[] {
  const neu = [typ, ...leseZuletzt().filter((t) => t !== typ)].slice(0, ZULETZT_ANZAHL)
  try {
    window.localStorage.setItem(ZULETZT_SCHLUESSEL, JSON.stringify(neu))
  } catch {
    // Kein Gerätespeicher (privates Fenster): dann eben ohne Verlauf
  }
  return neu
}

// ── Einfügen ─────────────────────────────────────────────────────────────

/** Block an Position `index` in Thema `thema` einfügen (Ende, wenn index zu groß) */
export function fuegeBlockEin(s: Struktur, thema: number, index: number, block: Block): Struktur {
  const t = s.chapters[thema]
  if (!t) return s
  const elemente = [...t.elements]
  elemente.splice(Math.max(0, Math.min(index, elemente.length)), 0, block)
  const themen = [...s.chapters]
  themen[thema] = { ...t, elements: elemente }
  return { ...s, chapters: themen }
}
