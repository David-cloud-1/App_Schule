/**
 * Hinweise der Prüfstelle in Alltagssprache (Baukasten).
 *
 * Die Texte kommen aus dem Kern als „Kapitel 4 – Kapitel zu groß“. Für Anfänger sind sie zu knapp. Diese
 * Tabelle übersetzt die häufigsten Titel in einen ganzen Satz mit einem Vorschlag. Unbekannte Titel bleiben
 * unverändert, damit eine Änderung im Kern nie einen Hinweis verschluckt.
 */

const TITEL: Record<string, string> = {
  'Kapitel zu groß': 'Das Kapitel ist sehr lang. Teile es in zwei Kapitel auf.',
  'Lernziele fehlen': 'Am Anfang des Kapitels fehlen die Lernziele.',
  'Kapitel ohne Spiel-Aufgabe': 'Keine spielerische Aufgabe. Füge zum Beispiel Memory oder Wörter ziehen hinzu.',
  'Jedes Kapitel endet gleich': 'Alle Kapitel enden mit derselben Aufgabe. Wechsle die letzte Aufgabe ab.',
  'Sehr viele Aufklapper': 'Sehr viele Aufklapp-Felder. Schreibe einige als normalen Text.',
  'Kapitel ohne Abschlussquiz': 'Am Ende des Kapitels fehlt ein kurzer Test.',
  'Kapitel fast ohne Aufgaben': 'Im Kapitel gibt es kaum Aufgaben. Ergänze welche zum Üben.',
  'Kapitel ohne Inhalt': 'Das Kapitel ist leer. Füge ein Element hinzu.',
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
  'Einbettung ohne Titel': 'Die Einbettung hat keinen Titel. Gib der Karte eine Überschrift.',
  'Zu wenige Optionen': 'Zu wenige Antworten zur Auswahl. Ergänze weitere.',
}

/** „gesamte Datei“ ist das ganze Material */
function ortKlartext(ort: string): string {
  return ort.replace(/^gesamte Datei$/i, 'Ganzes Material')
}

/**
 * Übersetzt einen Kern-Hinweis („Kapitel 4 – Titel“) in einen verständlichen Satz.
 * Format des Kerns: `${ort} – ${titel}` oder nur `${titel}`.
 */
export function uebersetzeHinweis(text: string): string {
  const i = text.indexOf(' – ')
  const ort = i >= 0 ? text.slice(0, i) : ''
  const titel = i >= 0 ? text.slice(i + 3) : text
  const satz = TITEL[titel.trim()]
  const rest = satz ?? titel
  return ort ? `${ortKlartext(ort)} – ${rest}` : rest
}
