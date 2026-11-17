/**
 * Hinweise der Prüfstelle in Alltagssprache (Baukasten).
 *
 * Die Texte kommen aus dem Kern als „Kapitel 4 – Kapitel zu groß“. Für Anfänger sind sie zu knapp und
 * sprechen von „Kapitel“, obwohl der Editor „Thema“ sagt. Diese Tabelle übersetzt die häufigsten Titel in einen
 * ganzen Satz mit einem Vorschlag. Unbekannte Titel bleiben unverändert (nur „Kapitel“ wird zu „Thema“), damit
 * eine Änderung im Kern nie einen Hinweis verschluckt.
 */

const TITEL: Record<string, string> = {
  'Kapitel zu groß': 'Das Thema ist sehr lang. Teile es in zwei Themen auf.',
  'Lernziele fehlen': 'Am Anfang des Themas fehlen die Lernziele.',
  'Kapitel ohne Spiel-Aufgabe': 'Keine spielerische Aufgabe. Füge zum Beispiel Memory oder Wörter ziehen hinzu.',
  'Jedes Kapitel endet gleich': 'Alle Themen enden mit derselben Aufgabe. Wechsle die letzte Aufgabe ab.',
  'Sehr viele Aufklapper': 'Sehr viele Aufklapp-Felder. Schreibe einige als normalen Text.',
  'Kapitel ohne Abschlussquiz': 'Am Ende des Themas fehlt ein kurzer Test.',
  'Kapitel fast ohne Aufgaben': 'Im Thema gibt es kaum Aufgaben. Ergänze welche zum Üben.',
  'Kapitel ohne Inhalt': 'Das Thema ist leer. Füge ein Element hinzu.',
  'Wenig Aufgaben mit Spielcharakter': 'Wenig spielerische Aufgaben. Ergänze zum Beispiel Memory oder Wörter ziehen.',
  'Sehr wenige Aufgaben': 'Sehr wenige Aufgaben. Ergänze welche zum Üben.',
  'Kein Merksatz': 'Es fehlt ein Merksatz, der das Wichtigste zusammenfasst.',
  'Platzhalter im Text': 'Im Text steht noch ein Platzhalter. Ersetze ihn durch deinen Inhalt.',
  'Lückentext ohne Lücke': 'Im Lückentext ist keine Lücke. Markiere ein Wort und wähle „Als Lücke“.',
  'Lückentext ohne Lücken': 'Im Lückentext ist keine Lücke. Markiere ein Wort und wähle „Als Lücke“.',
  'Frage ohne Lösung': 'Bei der Frage ist keine richtige Antwort festgelegt.',
  'Frage ohne Text': 'Die Frage hat noch keinen Text.',
  'Keine richtige Antwort markiert': 'Es ist keine richtige Antwort markiert.',
  'Bild ohne Alternativtext': 'Ein Bild hat keine Beschreibung für Screenreader.',
  'Lösung steht im Lehrtext': 'Die Lösung steht schon im Lehrtext. Nimm sie dort heraus.',
  'Lösung steht in der Aufgabe': 'Die Lösung steht schon in der Aufgabe. Nimm sie dort heraus.',
  'Memory ohne genug Paare': 'Das Memory hat zu wenige Paare.',
  'Zu wenige Paare': 'Zu wenige Paare. Ergänze weitere.',
  'Zu wenige Antwortoptionen': 'Zu wenige Antworten zur Auswahl. Ergänze weitere.',
  'Zu wenige Optionen': 'Zu wenige Antworten zur Auswahl. Ergänze weitere.',
}

/** „Kapitel“ heißt im Editor überall „Thema“; „gesamte Datei“ ist das ganze Material */
function ortKlartext(ort: string): string {
  return ort.replace(/^gesamte Datei$/i, 'Ganzes Material').replace(/\bKapitel\b/g, 'Thema')
}

/**
 * Übersetzt einen Kern-Hinweis („Thema 4 – Titel“) in einen verständlichen Satz.
 * Format des Kerns: `${ort} – ${titel}` oder nur `${titel}`.
 */
export function uebersetzeHinweis(text: string): string {
  const i = text.indexOf(' – ')
  const ort = i >= 0 ? text.slice(0, i) : ''
  const titel = i >= 0 ? text.slice(i + 3) : text
  const satz = TITEL[titel.trim()]
  const rest = satz ?? titel.replace(/\bKapitel\b/g, 'Thema')
  return ort ? `${ortKlartext(ort)} – ${rest}` : rest
}
