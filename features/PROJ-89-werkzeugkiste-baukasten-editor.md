# PROJ-89: Werkzeugkiste – Baukasten-Editor (Grundgerüst)

## Status: In Review
**Created:** 2026-11-12
**Last Updated:** 2026-11-12 (Paket 3 gebaut)

## Idee in einem Satz
Eine Lehrkraft kann ein fertiges Material im Format „Interaktive Seite" nachträglich bearbeiten: Themen und Blöcke verschieben, löschen und duplizieren, Texte und Aufgaben ändern, mit Vorschau. Die Seite ändert sich für Schüler erst, wenn sie bewusst veröffentlicht.

## Teil einer Reihe („Baukasten")
| Feature | Inhalt |
|---|---|
| **PROJ-89** | Grundgerüst: Editor, Bearbeiten, Verschieben, Vorschau, Entwurf/Veröffentlichen (dieses Feature) |
| PROJ-90 | Aufgabentyp-Katalog: neue Blöcke aus allen 32 Typen wählen und ausfüllen |
| PROJ-91 | Neue Blöcke Tabelle und Diagramm |
| PROJ-92 | Bilder: hochladen und aus dem Skript übernehmen |
| PROJ-93 | Neues Thema oder neuen Block per KI (kopierter Prompt) |
| PROJ-94 | Leere Seite von null aufbauen (ohne Skript und KI) |
| später | Themen aus anderen Materialien oder dem Regal übernehmen (noch ohne Nummer) |

## Ausgangslage (Problem)
- Die Interaktive Seite wird nicht von Hand geschrieben. Die KI liefert eine strukturierte Antwort (YAML mit Kapiteln und Aufgaben). Die App speichert sie in `werkzeug_ablaeufe.antwort`. Der Python-Kern (`seite.py` im Repo `David-cloud-1/Werkzeugkiste`, eigenes Vercel-Projekt) baut daraus die HTML.
- Nachträglich ändern lässt sich heute fast nichts: Tippfehler ersetzen, ein Kapitel neu anfragen oder die ganze Antwort neu einfügen (Schritt 4).
- Die fertige Seite als Ganzes als HTML zu bearbeiten ist keine Lösung. Sie enthält den Programmcode der Aufgaben und eingebettete Bilder und wird bei jedem Bau neu erzeugt.

## Erkenntnisse aus dem Kern (2026-11-12)
Quelle: Repo `David-cloud-1/Werkzeugkiste` (Vercel-Projekt `werkzeugkiste-kern`), vor allem `seite.py` und `CLAUDE.md`.
- **Die Struktur ist schon ein Baukasten:** `cover` (Deckblatt) → `chapters` (Themen, je `title` und `elements`) → `elements` (Blöcke mit `type`) → `final_chapter` (Lernzielkontrolle mit `question_set` und `summary`).
- **32 Bausteintypen** baut `seite.py` heute (`BAUSTEINE`). Ein neuer Typ ist eine Funktion mehr in `BAUSTEINE` (plus `PRUEFBAR`, CSS, Abschnitt in `LAUFZEIT`).
- **Fünf Werkzeuge** bauen die Seite aus **derselben Kapitel-YAML**: Ganzes Skript, Kreative Einheit, Differenzierung, Arbeitsblatt, Lernsituation.
- **Textblöcke** (`text`) enthalten HTML mit Inline-CSS (Boxen: Lernziele, Merke, Tipp, Achtung, Beispiel, Ausgangssituation, Arbeitsauftrag, Mission, Prüfungssimulation; Tabellen). Sie laufen beim Bau durch `_saeubern()`, das Skripte, Event-Attribute und `javascript:`-URLs entfernt.
- **Tabellen** sind kein eigener Block, sondern HTML in Textblöcken (→ PROJ-91).
- **Bilder** sind `image`-Blöcke mit `path` auf ein beim Einlesen gespeichertes Bild. Die Seite darf höchstens 8 MB groß werden.
- Ein kaputter Block kippt nie die ganze Seite. Er wird mit Warnung übersprungen.
- **Link und Regal** zeigen heute immer die **aktuelle** gebaute Datei (PROJ-67, Tech Design). Ein Neubau ist sofort öffentlich. Deshalb braucht es den Entwurf (E3).

## Entscheidungen (Nutzer, 2026-11-12)
- **E1 – Format:** Der Editor gilt **nur für die Interaktive Seite**. H5P kann später folgen.
- **E2 – Werkzeuge:** Alle Werkzeuge, die eine Seite aus der Kapitel-YAML bauen (siehe oben).
- **E3 – Teilen:** Bearbeiten erzeugt einen **Entwurf**. Was Download, öffentlicher Link und Regal liefern, ändert sich erst nach **„Veröffentlichen"**.
- **E4 – Grafiken:** eigene Bilder hochladen, Bilder aus dem Skript, einfache Diagramme (→ PROJ-91, PROJ-92).
- **E5 – Neue Inhalte:** manuell und per kopiertem KI-Prompt, keine bezahlte KI (→ PROJ-93).
- **E6 – Aufteilung:** fünf Features (Tabelle oben). Die Auswahl aus allen Aufgabentypen ist ein eigenes Feature (PROJ-90).
- **E7 – Aufbau:** **Liste neben Vorschau.** Links Themen und Blöcke als Liste zum Ziehen, rechts die Seite als Vorschau. Auf dem Handy umschaltbar.
- **E8 – Textblöcke:** Standard ist eine **gestaltete Ansicht** (wie in Word, mit Knöpfen für Fett, Liste, Überschrift und die Boxen). Ein Schalter **„HTML"** zeigt den Quelltext des Blocks zum direkten Bearbeiten. Aufgaben werden immer per **Formular** bearbeitet, nie als HTML.
- **E9 – Prüfstelle:** Die vorhandene Prüfstelle (`qualitaet.py`) läuft nach dem Bearbeiten mit. Befunde sind **Hinweise ohne Sperre**, Veröffentlichen bleibt immer möglich.
- **E10 – Speichern:** Der Entwurf wird **automatisch** gesichert. Veröffentlichen ist immer ein eigener Klick.
- **E11 – Zurück:** **Rückgängig/Wiederholen** im offenen Editor und **„Entwurf verwerfen"** (zurück auf die veröffentlichte Fassung). Keine Versionsgeschichte früherer Veröffentlichungen.
- **E12 – H5P-Materialien:** „Bearbeiten" bietet an, eine **Kopie als Interaktive Seite** anzulegen. Das H5P-Original bleibt unverändert.
- **E13 – Einstieg:** aus **Meine Materialien** (Zeilenaktion), aus dem Schritt **„Fertig"** und nach **„Anpassen"** im Regal.

## Dependencies
- Requires: PROJ-51 (Ablauf, Kern, Bau der Seite)
- Requires: PROJ-52 (Meine Materialien, Speicher, Speichergrenze)
- Berührt: PROJ-53 (Regal, „Anpassen"), PROJ-67 (öffentlicher Link), PROJ-60 (Konto löschen: Entwurf verschwindet mit)
- Grundlage für: PROJ-90, PROJ-91, PROJ-92, PROJ-93

## User Stories
- Als **Lehrkraft** möchte ich ein fertiges Material öffnen und Themen und Blöcke per Ziehen umsortieren, damit die Reihenfolge zu meinem Unterricht passt.
- Als **Lehrkraft** möchte ich Blöcke und ganze Themen löschen oder duplizieren, damit ich Überflüssiges entferne und Bewährtes wiederverwende.
- Als **Lehrkraft** möchte ich Lehrtexte gestaltet bearbeiten und bei Bedarf direkt im HTML, damit ich schnell korrigiere und trotzdem alle Gestaltungsmöglichkeiten habe.
- Als **Lehrkraft** möchte ich Fragen, Antworten, richtige Lösungen und Feedback einer Aufgabe in einem Formular ändern, damit ich Fehler der KI ohne neuen Prompt beheben kann.
- Als **Lehrkraft** möchte ich während des Bearbeitens sehen, wie die Seite aussieht, damit ich nicht raten muss.
- Als **Lehrkraft** möchte ich in Ruhe an einem Entwurf arbeiten, ohne dass meine Schüler über den Link Halbfertiges sehen, und ihn dann bewusst veröffentlichen.
- Als **Lehrkraft** möchte ich einen Fehlgriff rückgängig machen oder den ganzen Entwurf verwerfen können, damit ich nichts kaputt mache.
- Als **Lehrkraft** möchte ich auch ein H5P-Material als Interaktive Seite weiterbearbeiten können, ohne das Original zu verlieren.

## Acceptance Criteria

### Einstieg
- [ ] In **Meine Materialien** hat jedes Material im Format Interaktive Seite die Zeilenaktion **„Bearbeiten"** (sichtbares Stift-Symbol nach PROJ-83 `AdminRowActions`).
- [ ] Im Schritt **„Fertig"** steht bei Interaktiver Seite **„Bearbeiten"** als `variant="outline"` neben der Hauptaktion „Herunterladen". Es bleibt **eine** grüne Hauptaktion.
- [ ] Nach **„Anpassen"** im Regal öffnet sich die neue Kopie direkt im Editor statt in Schritt 4.
- [ ] Bei einem **H5P-Material** öffnet „Bearbeiten" einen Dialog: „Der Editor arbeitet mit der Interaktiven Seite. Soll eine Kopie als Interaktive Seite angelegt werden? Dein H5P-Material bleibt unverändert." mit „Kopie anlegen" und „Abbrechen". „Kopie anlegen" legt ein neues Material „[Titel] (Seite)" an, baut es als Seite und öffnet es im Editor. Die Speichergrenze wird vorher geprüft.
- [ ] Werkzeuge ohne Kapitel-YAML (Kahoot, Moodle-Fragen, LearningApps, Video-Fragen, Podcast, Lernlied sowie Arbeitsblatt/Lernsituation/Klassenarbeit im ZIP-Format) zeigen kein „Bearbeiten".
- [ ] Der Editor hat eine eigene Adresse je Material. Ein Neuladen der Seite öffnet ihn wieder mit dem aktuellen Entwurf.
- [ ] Nur die Besitzerin oder der Besitzer des Materials kann es bearbeiten. Andere Lehrkräfte, Azubis und nicht angemeldete Personen werden abgelehnt (Seiten leiten um, Server-Aufrufe liefern 403 bzw. 404 bei fremdem Material).

### Aufbau des Editors
- [ ] Der Editor ist eine eigene Ansicht **ohne Seitenleiste**, wie der Ablauf aus PROJ-51. Oben: Schließen (✕, `aria-label`), Titel des Materials, Speicherstand („Entwurf gespeichert" / „Wird gespeichert …" / „Nicht gespeichert – erneut versuchen"), „Rückgängig", „Wiederholen" und die Hauptaktion **„Veröffentlichen"**.
- [ ] **Links** steht die **Gliederung**: Deckblatt, darunter jedes Thema (Kapitel) mit seinen Blöcken, am Ende die Lernzielkontrolle. Jeder Block zeigt Symbol, Typ in Klartext (z. B. „Lückentext", nicht `fill_blanks`) und eine Kurzzeile des Inhalts (die ersten Wörter).
- [ ] Themen lassen sich auf- und zuklappen.
- [ ] Ein Klick auf einen Block öffnet sein **Bearbeitungsfeld** (in der linken Spalte unter dem Block oder als Seitenfeld). Es ist immer nur ein Block gleichzeitig offen.
- [ ] **Rechts** steht die **Vorschau** der Seite im Entwurfsstand. Sie aktualisiert sich nach jeder gespeicherten Änderung und springt zum zuletzt bearbeiteten Block.
- [ ] Die Vorschau läuft abgeschottet wie die bestehende Vorschau (PROJ-51): kein Zugriff auf die App, keine Anmeldedaten.
- [ ] Auf Geräten unter 1024 px Breite schaltet ein Umschalter (`AdminSegmented`) zwischen **„Gliederung"** und **„Vorschau"**.
- [ ] Alle Bedienelemente sind mindestens 44 × 44 px groß und per Tastatur erreichbar.

### Verschieben, Löschen, Duplizieren
- [ ] Blöcke lassen sich per **Ziehen** innerhalb eines Themas und **in ein anderes Thema** verschieben.
- [ ] Themen lassen sich per Ziehen umsortieren. Deckblatt und Lernzielkontrolle bleiben fest am Anfang bzw. Ende.
- [ ] Zum Ziehen gibt es eine **Alternative ohne Maus**: Im `⋯`-Menü jedes Blocks und Themas stehen „Nach oben", „Nach unten" und bei Blöcken „In anderes Thema verschieben …".
- [ ] **Duplizieren** legt eine Kopie direkt unter dem Original an (bei Themen mit allen Blöcken, Titel „[Titel] (Kopie)").
- [ ] **Löschen** steht im `⋯`-Menü ganz unten in Rot. Ein Block wird sofort gelöscht, ein Toast bietet „Rückgängig" an. Ein Thema löschen fragt vorher per `AlertDialog` („Thema „…" mit N Blöcken löschen?").
- [ ] Ein neues **leeres Thema** lässt sich über „Thema hinzufügen" am Ende der Themenliste anlegen (Titel „Neues Thema", ohne Blöcke).
- [ ] Ein Thema ohne Blöcke ist erlaubt. Die Gliederung zeigt dort „Noch keine Blöcke". Beim Veröffentlichen erscheint ein Hinweis (kein Hindernis).

### Textblöcke bearbeiten (E8)
- [ ] Ein Textblock öffnet sich in der **gestalteten Ansicht**: Der Inhalt erscheint so, wie er auf der Seite aussieht, und ist direkt beschreibbar.
- [ ] Die Werkzeugleiste bietet mindestens: Fett, Kursiv, Überschrift (Kapitelbalken h2, Unterabschnitt h3), Aufzählung, nummerierte Liste, Link, und **„Box einfügen"** mit den Boxen aus dem Skript-Design: Lernziele, Merke, Tipp, Achtung, Beispiel, Ausgangssituation, Arbeitsauftrag, Mission (Fallakte), Prüfungssimulation, Vergleich (zweispaltig), Schritt-für-Schritt-Liste.
- [ ] Neu eingefügte Überschriften und Boxen bekommen dieselben Inline-Stile wie im Master-Prompt, damit sie genauso aussehen wie die von der KI erzeugten.
- [ ] Vorhandene Boxen und Tabellen aus der KI-Antwort bleiben beim Bearbeiten **erhalten** (Text darin änderbar, Gestaltung bleibt).
- [ ] Ein Schalter **„HTML"** zeigt den HTML-Quelltext des Blocks in einem Code-Feld. Änderungen dort sind nach Zurückschalten in der gestalteten Ansicht sichtbar und umgekehrt.
- [ ] Inhalte aus der HTML-Ansicht laufen beim Bau wie bisher durch die Bereinigung des Kerns. Skripte, Event-Attribute (`onclick` …) und `javascript:`-Links erscheinen nie auf der fertigen Seite. Steht so etwas im Quelltext, zeigt der Editor den Hinweis „Skripte und Ereignisse werden aus Sicherheitsgründen entfernt."
- [ ] Ist der HTML-Quelltext fehlerhaft (z. B. nicht geschlossenes Element), wird er trotzdem gespeichert. Die Vorschau zeigt, was der Browser daraus macht. Es gibt einen Hinweis „Der HTML-Code ist nicht sauber geschlossen", aber keine Sperre.
- [ ] Einfügen aus Word oder einer Webseite übernimmt Text, Fett/Kursiv, Listen und Tabellen, aber keine fremden Schriftarten, Farben oder Klassen.

### Aufgaben bearbeiten
- [ ] Aufgaben werden in einem **Formular** bearbeitet, das zum Typ passt. In PROJ-89 gibt es Formulare für die häufigsten Typen:
  - Akkordeon (`accordion`): Begriff/Erklärung-Paare hinzufügen, löschen, sortieren
  - Auswahlfrage (`multiple_choice`, `single_choice`): Frage, Antworten, **genau eine** richtige markieren, Feedback je Antwort
  - Richtig/Falsch (`true_false`): Aussage, richtig/falsch, Feedback richtig/falsch
  - Schnellfragen (`single_choice_set`): je Frage richtige Antwort und falsche Antworten
  - Lückentext, Lückentext mit Hinweis, Wörter ziehen, Wörter markieren (`fill_blanks`, `advanced_fill_blanks`, `drag_words`, `mark_words`): Text mit `*Sternchen*`-Lücken, optional Überschrift (`description`). Unter dem Feld steht in einem Satz, wie Lücken markiert werden, und die Lücken erscheinen als Liste zur Kontrolle.
  - Lernkarten (`dialog_cards`): Vorder-/Rückseite, optional Überschrift
  - Rechenaufgabe (`calculation_exercise`): Aufgabe und Ergebnis
  - Zusammenfassung (`summary`): richtige Aussage und mindestens zwei falsche je Frage
  - Kapiteltest (`question_set`): Bestehensgrenze in Prozent und die enthaltenen Fragen (nur die dort erlaubten Typen)
- [ ] Alle **übrigen Typen** öffnen sich in PROJ-89 als **Rohfassung**: Der Block erscheint als YAML-Text zum direkten Bearbeiten. Ist das YAML nach dem Bearbeiten nicht lesbar, wird es nicht übernommen und es erscheint „Diese Rohfassung ist nicht lesbar. Bitte die Einrückung prüfen." (Die Formulare dafür kommen mit PROJ-90.)
- [ ] Pflichtfelder sind markiert. Ein leeres Pflichtfeld wird gespeichert, erscheint aber als Hinweis der Prüfstelle (E9).
- [ ] Der **Typ** eines vorhandenen Blocks lässt sich in PROJ-89 nicht ändern (kommt ggf. mit PROJ-90).

### Deckblatt und Lernzielkontrolle
- [ ] Das **Deckblatt** ist bearbeitbar: Titel, Untertitel, Schule, Dauer.
- [ ] Die **Lernzielkontrolle** ist bearbeitbar: Titel, Kapiteltest (wie oben) und die Aussagen der Gesamtzusammenfassung (hinzufügen, löschen, sortieren).
- [ ] Die Lernzielkontrolle lässt sich nicht löschen. Ist sie leer, wird sie auf der Seite nicht angezeigt (wie heute).

### Prüfstelle (E9)
- [ ] Nach jeder gespeicherten Änderung prüft die App den Entwurf mit derselben Prüfstelle wie in Schritt 4.
- [ ] Befunde erscheinen **am betroffenen Block** in der Gliederung (Symbol und Anzahl) und gesammelt in einer aufklappbaren Liste „Hinweise (N)". Ein Klick auf einen Befund öffnet den Block.
- [ ] Befunde sperren nie. „Veröffentlichen" ist immer möglich.

### Speichern, Rückgängig, Verwerfen (E10, E11)
- [ ] Jede Änderung wird nach kurzer Pause (höchstens 2 Sekunden nach der letzten Eingabe) **automatisch als Entwurf** gespeichert. Der Speicherstand oben zeigt das an.
- [ ] Schlägt das Speichern fehl (z. B. keine Verbindung), bleibt die Änderung im Editor erhalten. Der Speicherstand zeigt „Nicht gespeichert – erneut versuchen", und die App versucht es von selbst erneut, sobald die Verbindung zurück ist.
- [ ] Schließen oder Verlassen des Editors mit ungespeicherten Änderungen fragt nach („Änderungen sind noch nicht gespeichert. Trotzdem schließen?").
- [ ] **Rückgängig** (Strg+Z / ⌘Z und Knopf) und **Wiederholen** (Strg+Umschalt+Z / ⌘⇧Z und Knopf) gelten für die Änderungen seit dem Öffnen des Editors, mindestens die letzten 50 Schritte. Innerhalb eines Textfelds wirkt Strg+Z zuerst auf die Eingabe im Feld.
- [ ] **„Entwurf verwerfen"** (im `⋯`-Menü oben, mit `AlertDialog`) setzt den Entwurf auf die zuletzt veröffentlichte Fassung zurück. Danach ist kein Entwurf mehr vorhanden.

### Entwurf und Veröffentlichen (E3)
- [ ] Solange ein Entwurf besteht, liefern **Herunterladen**, **öffentlicher Link** und **Regal** weiterhin die **zuletzt veröffentlichte** Fassung.
- [ ] In **Meine Materialien** trägt ein Material mit Entwurf die Markierung **„Entwurf"** (Pill), mit Tooltip „Es gibt unveröffentlichte Änderungen".
- [ ] **„Veröffentlichen"** öffnet eine Bestätigung: „Die neue Fassung wird für alle sichtbar, die das Material nutzen", ergänzt um „über den öffentlichen Link" bzw. „im Regal", wenn das zutrifft. Dazu die Zahl offener Hinweise der Prüfstelle.
- [ ] Nach dem Veröffentlichen ist die neue Fassung die fertige Datei des Materials: Download, Link und Regal liefern sie. Der Link bleibt derselbe. Ein Toast bestätigt „Veröffentlicht".
- [ ] Veröffentlichen ersetzt auch die gespeicherte KI-Antwort des Materials durch die bearbeitete Fassung. Schritt 4 („Antwort überarbeiten") zeigt danach die bearbeitete Fassung.
- [ ] Schlägt der Bau beim Veröffentlichen fehl (Kern nicht erreichbar, Zeitüberschreitung), bleibt die alte Fassung veröffentlicht und der Entwurf erhalten. Es erscheint ein verständlicher Satz mit „Erneut versuchen".
- [ ] Wird die Seite beim Veröffentlichen größer als die Grenze des Kerns (8 MB), wird nicht veröffentlicht. Es erscheint „Die Seite ist zu groß geworden (N MB von 8 MB). Entferne Bilder oder teile das Material auf."

### Zusammenspiel mit vorhandenen Funktionen
- [ ] Besteht ein Entwurf, zeigen „Antwort überarbeiten", „Tippfehler korrigieren" und „Kapitel neu anfragen" (Schritt 4) einen Hinweis „Zu diesem Material gibt es einen Entwurf im Editor" mit „Im Editor öffnen". Sie ändern die veröffentlichte Fassung nicht an einem bestehenden Entwurf vorbei.
- [ ] „Gleiches Skript, anderes Werkzeug" arbeitet mit dem Skript, nicht mit dem Entwurf, und bleibt unverändert.
- [ ] Ein Entwurf zählt mit zur Speichergröße des Materials (2-GB-Grenze aus PROJ-52).
- [ ] Wird ein Material gelöscht oder das Konto gelöscht (PROJ-60), verschwindet der Entwurf mit.

## Edge Cases
- **Material in zwei Tabs geöffnet:** Speichert Tab B, nachdem Tab A gespeichert hat, und hat Tab B den neueren Stand von A nicht gesehen, erscheint in B „Dieses Material wurde in einem anderen Fenster geändert" mit „Neu laden". Es wird nichts stillschweigend überschrieben.
- **Alle Blöcke eines Themas gelöscht:** Thema bleibt leer stehen (siehe oben). Beim Veröffentlichen erscheint es nicht als leere Seite, sondern nur mit Titel (Verhalten des Kerns prüfen, ggf. ausblenden).
- **Alle Themen gelöscht:** Veröffentlichen ist möglich, die Bestätigung warnt zusätzlich „Das Material hat keine Themen mehr."
- **Unbekannter oder kaputter Block in der KI-Antwort** (Typ, den der Kern nicht kennt, oder fehlende Felder): Er erscheint in der Gliederung als „Unbekannter Block" mit Rohfassung und Hinweis. Er geht beim Speichern nicht verloren.
- **Block mit Bild, dessen Datei fehlt** (z. B. Regal-Kopie ohne Bilder-Auszug): Die Gliederung zeigt „Bild fehlt", die Vorschau einen Platzhalter. Kein Abbruch.
- **`bildzuordnung` ohne Koordinaten:** Der Setz-Modus der fertigen Seite bleibt wie bisher. In PROJ-89 gibt es dafür nur die Rohfassung.
- **Sehr großes Material** (viele Themen, über 300 Blöcke): Die Gliederung bleibt bedienbar (Themen standardmäßig zugeklappt ab 20 Themen). Die Vorschau darf länger brauchen und zeigt dabei „Vorschau wird aktualisiert …".
- **Kern beim Aktualisieren der Vorschau nicht erreichbar:** Die Vorschau zeigt den letzten Stand mit Hinweis „Vorschau gerade nicht aktuell". Bearbeiten und Speichern gehen weiter.
- **Lehrkraft verliert die Rolle während des Bearbeitens:** Der nächste Speicherversuch wird abgelehnt. Es erscheint „Du hast keinen Zugriff mehr auf die Werkzeugkiste", der Editor wird schreibgeschützt.
- **Material, dessen Skript nach 12 Monaten entfernt wurde, oder Regal-Kopie ohne Skript:** Bearbeiten geht ohne Einschränkung, weil der Editor nur die Antwort braucht.
- **HTML-Ansicht mit `<style>`-Block oder externen Bildern (`<img src="https://…">`):** Wird gespeichert. Externe Bilder erscheinen mit Hinweis „Externe Bilder funktionieren offline nicht. Lade das Bild lieber hoch (PROJ-92)."

## Abgrenzung (nicht in PROJ-89)
- Neue Aufgaben aus dem Katalog anlegen und Formulare für alle 32 Typen → PROJ-90
- Tabellen als eigener Block, Diagramme → PROJ-91
- Bilder hochladen oder aus dem Skript wählen → PROJ-92
- Thema oder Block per KI erzeugen → PROJ-93
- H5P-Ausgabe aus dem Editor (E1)
- Versionsgeschichte früherer Veröffentlichungen (E11)
- Gleichzeitiges Bearbeiten durch mehrere Personen
- Bearbeiten durch Schülerinnen und Schüler. Sie bearbeiten nur ihre Antworten in der fertigen Seite.
- Keine Änderung an den Regal-Regeln (`regal_darf_sehen`)

## Risiken
- Neue Blöcke erfordern Änderungen im zweiten Projekt (Kern). Die Vorgabe „inhaltsgleich zur alten Werkzeugkiste" aus PROJ-51/54 gilt für bearbeitete Materialien bewusst nicht mehr.
- Der Gleichstand zwischen gestalteter Ansicht und HTML ist anspruchsvoll. Die KI-Boxen müssen beim Hin- und Herschalten unverändert bleiben (Test mit echten Antworten aller fünf Werkzeuge).
- Die Seite darf höchstens 8 MB groß werden (`MAX_SEITE_BYTES`).
- Bereits veröffentlichte Links dürfen nicht unbemerkt ihren Inhalt ändern. Das ist mit E3 gelöst und muss in QA ausdrücklich getestet werden.

## Technical Requirements
- **Sicherheit:** Nur Besitzerin/Besitzer, Prüfung serverseitig. HTML aus Textblöcken wird beim Bau weiterhin bereinigt. Die Vorschau läuft abgeschottet.
- **Leistung:** Ein Klick auf einen Block öffnet ihn ohne spürbare Wartezeit. Die Vorschau ist bei einem typischen Material (bis 10 Themen) in unter 5 Sekunden nach dem Speichern aktuell.
- **Keine Inhalte in Logs** (wie PROJ-51).
- **Browser:** Aktuelle Chrome, Firefox, Safari, Edge. Ziehen funktioniert auch per Touch.
- **Design:** Lehrkräfte-Bereich nach `docs/DESIGN.md` (ws-Tokens, `AdminRowActions`, `AdminSegmented`, Zustände aus `admin-states.tsx`).

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)

> Stand 2026-11-12. Grundlage: App-Code (`App_Schule`) und Kern-Code (Repo `Werkzeugkiste`, Branch `vercel-kern`, Datei `kern.py`, `seite.py`, `qualitaet.py`).

### Was die Prüfung des Bestands ergeben hat
1. **Der Kern baut die Seite aus YAML-Text.** `kern.bauen()` liest die Antwort mit PyYAML, repariert Kleinigkeiten (`qualitaet.repariere`) und ruft `seite.baue_seite()` mit den Bildern aus der Einlesung auf. Er gibt die fertige HTML-Datei und eine schlichte Lehrer-Vorschau zurück.
2. **Link und Regal liefern immer die Datei unter `<Besitzer>/<Ablauf>/ausgabe`.** Was dort liegt, ist sofort öffentlich (PROJ-67).
3. **Die heutige Vorschau** (`vorschau-dialog.tsx`) ist die schlichte Lehrer-Übersicht aus `vorschau.py` in einem Rahmen ohne Skripte. Sie zeigt nicht die echte Seite.
4. **Die Prüfstelle nennt den Ort nur als Text** („Kapitel 2: …"), nicht als genaue Blocknummer.
5. **Die gebaute Seite hat keine Sprungmarken je Block.** Die Vorschau kann so nicht zum bearbeiteten Block springen.
6. **Die Zwei-Tabs-Regel gibt es schon:** Die App schickt beim Bauen den zuletzt gesehenen Änderungszeitpunkt (`stand`) mit und fragt nach, wenn sich inzwischen etwas geändert hat (PROJ-52).
7. **Bilder bei Materialien ohne Skript** (Regal-Kopie, Skript nach 12 Monaten entfernt) kommen aus dem „Bilder-Auszug" (PROJ-53). Der Bau-Schritt kann das schon.
8. **Die App hat noch keine Bibliotheken** für Ziehen & Ablegen, gestaltete Texteingabe oder Code-Felder.

### Überblick: Wo was passiert
```
Browser (Editor)                        Lern-App (Server)                       Werkzeugkiste-Kern
------------------------------          ------------------------------          --------------------------
Gliederung, Formulare, Text-Editor  →   prüft Rolle + Besitz, speichert    →    liest YAML, baut Seite,
Rückgängig/Wiederholen (im Speicher)    Entwurf, legt Vorschau ab,              prüft (Prüfstelle),
Vorschau im abgeschotteten Rahmen   ←   veröffentlicht                     ←    wandelt YAML ↔ Struktur
```
- **Der Browser** hält das Material während des Bearbeitens als **Struktur** (Deckblatt, Themen, Blöcke mit Feldern), nicht als Text. Verschieben, Löschen, Duplizieren und Rückgängig passieren sofort im Browser.
- **Die App** speichert diese Struktur als **Entwurf** und ist die einzige Stelle, die mit dem Kern spricht (wie bisher).
- **Der Kern** bleibt der einzige, der YAML liest, schreibt, prüft und Seiten baut. So sieht der Editor genau das, was später auch gebaut wird.

### A) Komponenten-Struktur
```
Meine Materialien (vorhanden)
+-- Zeilenaktion „Bearbeiten" (Stift)            ← neu, nur bei Interaktiver Seite der 5 Werkzeuge
+-- Pill „Entwurf" an der Zeile                  ← neu
+-- Dialog „Als Interaktive Seite kopieren?"     ← neu, bei H5P-Materialien

Schritt 5 „Fertig" (vorhanden)
+-- Knopf „Bearbeiten" (outline)                 ← neu

Regal → „Anpassen" (vorhanden)
+-- öffnet danach den Editor statt Schritt 4     ← geändert

Schritt 4 „Antwort" (vorhanden)
+-- Hinweis „Es gibt einen Entwurf im Editor" + „Im Editor öffnen"   ← neu

Editor-Seite  /admin/werkzeugkiste/bearbeiten/[id]   (eigene Ansicht ohne Seitenleiste, wie der Ablauf)
+-- Kopfleiste
|   +-- ✕ Schließen (fragt bei ungespeicherten Änderungen)
|   +-- Titel des Materials
|   +-- Speicherstand („Entwurf gespeichert" / „Wird gespeichert …" / „Nicht gespeichert – erneut versuchen")
|   +-- Rückgängig · Wiederholen
|   +-- ⋯-Menü: „Entwurf verwerfen"
|   +-- Hauptaktion „Veröffentlichen"  → Bestätigungsdialog (Hinweis auf Link/Regal, Zahl der Hinweise)
+-- Umschalter „Gliederung | Vorschau" (nur unter 1024 px, AdminSegmented)
+-- Linke Spalte: Gliederung
|   +-- Hinweise (N), aufklappbar – Befunde der Prüfstelle, Klick öffnet Block
|   +-- Deckblatt (klickbar → Deckblatt-Formular)
|   +-- Themenliste (ziehbar)
|   |   +-- Thema (auf-/zuklappbar, ⋯: nach oben/unten, duplizieren, löschen)
|   |       +-- Block-Zeile (ziehbar, auch in andere Themen; Symbol, Typ in Klartext, Kurzzeile, Hinweis-Symbol)
|   |       |   +-- ⋯: nach oben/unten, in anderes Thema …, duplizieren, löschen
|   |       +-- geöffneter Block: Bearbeitungsfeld
|   |           +-- Textblock-Editor (gestaltete Ansicht ⇄ HTML-Ansicht)
|   |           |   +-- Werkzeugleiste: Fett, Kursiv, h2/h3, Listen, Link, „Box einfügen ▾"
|   |           +-- Aufgaben-Formular (je Typ, 13 Typen in PROJ-89)
|   |           +-- Rohfassung (YAML-Feld) für alle übrigen Typen und unbekannte Blöcke
|   +-- „Thema hinzufügen"
|   +-- Lernzielkontrolle (klickbar → Formular: Titel, Kapiteltest, Aussagen)
+-- Rechte Spalte: Vorschau
    +-- echte Seite im abgeschotteten Rahmen
    +-- Hinweis „Vorschau wird aktualisiert …" / „Vorschau gerade nicht aktuell"
```

### B) Datenmodell (in Alltagssprache)

**Am vorhandenen Material (Tabelle `werkzeug_ablaeufe`) kommt hinzu:**
- **Entwurf:** die bearbeitete Struktur des Materials (Deckblatt, Themen, Blöcke). Leer, solange niemand bearbeitet. Gleiche Größengrenze wie die KI-Antwort heute.
- **Entwurf geändert am:** Zeitpunkt der letzten Entwurfs-Speicherung. Dient der Zwei-Tabs-Regel und der Anzeige.
- **Hat Entwurf:** wird automatisch abgeleitet (ja, sobald ein Entwurf da ist). Damit kann „Meine Materialien" die Pill „Entwurf" zeigen, ohne den Entwurf selbst zu laden (wie heute `hat_antwort`).
- **Entwurfs-Prüfung:** die Befunde der Prüfstelle zum aktuellen Entwurf.

**Im Speicher (Supabase Storage), im Ordner des Materials:**
- **Entwurfs-Vorschau:** die zuletzt gebaute Seite des Entwurfs. Sie liegt **neben** der veröffentlichten Datei (`ausgabe`), nie an ihrer Stelle. Sie zählt zur Speichergröße des Materials und wird beim Verwerfen, Veröffentlichen und Löschen entfernt.

**Unverändert bleiben:** die veröffentlichte Datei (`ausgabe`), die KI-Antwort (`antwort`), Link, Regal-Freigaben, Bilder-Auszug. Bis zum Veröffentlichen fasst der Editor sie nicht an.

**Beim Veröffentlichen** wird der Entwurf zur neuen Fassung:
1. Der Kern baut aus dem Entwurf die Seite.
2. Sie ersetzt die Datei `ausgabe`. Link und Regal liefern ab jetzt die neue Fassung, die Adresse bleibt gleich.
3. Der Kern schreibt den Entwurf als YAML zurück. Das ersetzt die gespeicherte KI-Antwort, damit Schritt 4 und „Kapitel neu anfragen" mit der bearbeiteten Fassung weiterarbeiten.
4. Ergebnis-Kennzahlen (Kapitel, Aufgaben) und Prüfbericht werden aktualisiert.
5. Entwurf und Entwurfs-Vorschau werden entfernt.

Schlägt Schritt 1 fehl, passiert nichts weiter: Die alte Fassung bleibt veröffentlicht, der Entwurf bleibt erhalten.

**Hinweis zur Optik in Schritt 4:** Das zurückgeschriebene YAML erzeugt der Kern, nicht die KI. Inhaltlich ist es dasselbe, aber Einrückung und Anführungszeichen können anders aussehen als in der ursprünglichen KI-Antwort.

### C) Abläufe

**Öffnen:** Die App lädt das Material. Gibt es schon einen Entwurf, wird er geöffnet. Sonst bittet die App den Kern, die gespeicherte KI-Antwort in die Struktur zu übersetzen. Der Kern benutzt dafür dieselbe Lese-Logik wie beim Bauen, inklusive der kleinen Angleichungen (z. B. „richtige Antwort" vereinheitlichen).

**Bearbeiten und automatisch speichern:** Jede Änderung ändert die Struktur im Browser. Nach höchstens 2 Sekunden Ruhe schickt der Browser den ganzen Entwurf mit dem zuletzt gesehenen Stand an die App. Hat sich der Stand inzwischen geändert (anderer Tab), lehnt die App ab, und der Editor zeigt „In einem anderen Fenster geändert – Neu laden".

**Vorschau:** Nach einem erfolgreichen Speichern bittet der Browser (höchstens alle paar Sekunden, nie mehrere gleichzeitig) die App um eine neue Vorschau. Die App lässt den Kern die Seite bauen, legt sie als Entwurfs-Vorschau im Speicher ab und gibt eine kurzlebige Leseadresse zurück. Der Browser lädt die Seite als Text und zeigt sie im abgeschotteten Rahmen. Der Umweg über den Speicher ist nötig, weil Seiten mit Bildern größer sein können als die 4,5 MB, die eine App-Antwort auf Vercel höchstens haben darf.

**Prüfen:** Mit jeder Vorschau läuft auch die Prüfstelle über den Entwurf. Die Befunde werden gespeichert und in der Gliederung angezeigt.

**Rückgängig/Wiederholen:** Der Browser merkt sich die letzten mindestens 50 Fassungen der Struktur, solange der Editor offen ist. Rückgängig setzt die vorige Fassung ein und speichert sie wie jede andere Änderung.

**Verwerfen:** Die App löscht Entwurf, Entwurfs-Prüfung und Entwurfs-Vorschau. Der Editor lädt danach die veröffentlichte Fassung.

**H5P-Material als Seite kopieren:** Die App legt wie bei „Gleiches Skript, anderes Werkzeug" ein neues Material an: gleiches Werkzeug, Format Interaktive Seite, gleiche KI-Antwort, Skript und Einlesung bzw. Bilder-Auszug kopiert. Sie baut es einmal als Seite und öffnet den Editor. Das geht ohne neue KI-Antwort, weil beide Formate dieselbe Kapitel-Struktur nutzen.

### D) Änderungen am Kern (Repo `Werkzeugkiste`, Branch `vercel-kern`)
Klein und rückwärtsverträglich. Die heutigen Werkzeuge merken davon nichts.
1. **„Antwort → Struktur"**: liest eine Antwort genau wie beim Bauen und gibt die Struktur zurück. Ebenso für einen einzelnen Block (Rohfassung).
2. **„Struktur → YAML"**: schreibt eine Struktur als gut lesbares YAML (lange Texte als Textblock, Umlaute unverändert, Reihenfolge der Felder wie im Master-Prompt). Ebenso für einen einzelnen Block.
3. **Bauen, Prüfen und Vorschau nehmen auch eine Struktur an**, nicht nur YAML-Text.
4. **Sprungmarken im Editor-Modus:** Baut der Kern für die Editor-Vorschau, bekommt jeder Block auf der Seite eine unsichtbare Kennung (Thema-Nummer, Block-Nummer). Veröffentlichte Seiten bleiben ohne diese Kennungen.
5. **Befunde mit genauer Stelle:** Jeder Befund der Prüfstelle bekommt zusätzlich zur Ortsangabe als Text die Nummer von Thema und Block, wo bekannt. Wo nicht bekannt, ordnet der Editor den Befund dem Thema zu („Kapitel 2").

Die Prüfung `werkzeugtest.py` und `kern_test.py` müssen danach grün sein. Eine Rundreise „Antwort → Struktur → YAML → Struktur" muss für echte Antworten aller fünf Werkzeuge dieselbe Struktur ergeben.

### E) Technische Entscheidungen (und warum)

| Entscheidung | Warum |
|---|---|
| **YAML liest und schreibt nur der Kern, der Browser arbeitet mit der Struktur.** | Der Kern liest YAML mit PyYAML (YAML 1.1). Ein JavaScript-Leser (YAML 1.2) versteht manche Werte anders, z. B. „no" oder „on". Würden App und Kern verschieden lesen, sähe die Lehrkraft im Editor etwas anderes, als später gebaut wird. |
| **Entwurf als eigenes Feld am Material, Vorschau als eigene Datei daneben.** | Link und Regal lesen weiterhin nur `ausgabe` und müssen nicht geändert werden. Damit ist E3 („erst Veröffentlichen macht es sichtbar") ohne Eingriff in PROJ-53 und PROJ-67 erfüllt, und keine zweite Tabelle mit eigenen Zugriffsregeln ist nötig. Die bestehenden Zugriffsregeln (nur Besitzer) gelten automatisch. |
| **Der ganze Entwurf wird bei jedem Speichern geschickt, nicht nur die Änderung.** | Einfach und robust. Ein Material ist auch groß nur wenige hundert KB Text. Bilder sind nicht Teil des Entwurfs (nur ihr Dateiname). |
| **Vorschau = echte Seite im abgeschotteten Rahmen mit Skripten, aber ohne Zugriff auf die App.** | Die Lehrkraft soll sehen, was Schüler sehen, inklusive funktionierender Aufgaben. Der Rahmen bekommt eine eigene, leere Herkunft: Die Seite kann ihre eigenen Skripte ausführen, aber weder Anmeldedaten noch Inhalte der App lesen. Die schlichte Lehrer-Vorschau aus Schritt 5 bleibt, wie sie ist. |
| **Vorschau seltener als Speichern.** | Bauen mit Bildern dauert, Speichern nicht. So bleibt das Tippen flüssig und der Kern wird nicht mit Aufträgen überflutet. |
| **Text-Editor auf Basis von Tiptap (ProseMirror), mit eigenen Bausteinen für jede Box aus dem Skript-Design.** | Bewährter, barrierearmer Editor für React, gut erweiterbar. Die Boxen (Merke, Tipp, Lernziele …) werden als eigene, ganze Bausteine erkannt (an ihrer Gestaltung aus dem Master-Prompt). Für alles Unbekannte gibt es einen „Behalten"-Baustein, der Stil und Aufbau unverändert durchreicht. Tabellen kann Tiptap von Haus aus. |
| **Sicherheitsnetz für den Text-Editor: Rundreise-Prüfung.** | Beim Öffnen eines Textblocks prüft der Editor, ob „HTML → gestaltete Ansicht → HTML" den Block unverändert lässt. Wenn nicht, öffnet er ihn in der HTML-Ansicht mit dem Hinweis „Dieser Block enthält Gestaltung, die die gestaltete Ansicht nicht verlustfrei darstellen kann". So geht nie Gestaltung verloren, auch bei ungewöhnlichen KI-Antworten. |
| **Code-Felder (HTML-Ansicht, Rohfassung) mit CodeMirror.** | Leicht, gut mit Tastatur und am Handy bedienbar, mit Hervorhebung für HTML und YAML. |
| **Ziehen & Ablegen mit dnd-kit.** | Funktioniert mit Maus, Touch und Tastatur. Das ist wichtig für die Barrierefreiheit und für Tablets. |
| **Rückgängig im Browser, kein Verlauf auf dem Server.** | Entspricht E11. Spart Speicher und Komplexität. |
| **Die Sicherheitsbereinigung bleibt im Kern.** | HTML aus der HTML-Ansicht läuft beim Bau durch `_saeubern()`, wie heute die KI-Texte. Der Editor zeigt zusätzlich einen Hinweis, wenn er Skripte oder Ereignis-Attribute im Quelltext sieht, entfernt aber selbst nichts. So gibt es genau eine Stelle, die über Sicherheit entscheidet. |

### F) Server-Aufrufe (neu, alle nur für Lehrkräfte und Admins, nur eigenes Material)
| Aufruf | Zweck |
|---|---|
| Editor laden | Material, Entwurf oder (falls keiner) die in Struktur übersetzte KI-Antwort, Stand, Prüfbefunde |
| Entwurf speichern | ganze Struktur mit zuletzt gesehenem Stand. Lehnt bei fremdem Stand ab. |
| Vorschau bauen | baut die Entwurfs-Vorschau, prüft, gibt kurzlebige Leseadresse und Befunde zurück |
| Rohfassung lesen / schreiben | einen Block zwischen Struktur und YAML übersetzen (über den Kern) |
| Veröffentlichen | siehe Datenmodell. Prüft vorher die 8-MB-Grenze. |
| Entwurf verwerfen | löscht Entwurf, Entwurfs-Prüfung und Entwurfs-Vorschau |
| Als Seite kopieren | H5P-Material als neues Seiten-Material anlegen (Speichergrenze vorher prüfen) |

**Geändert:** „Meine Materialien" liefert zusätzlich „hat Entwurf". Regal-„Anpassen" gibt die Editor-Adresse zurück. „Material löschen" entfernt auch die Entwurfs-Vorschau. Schritt-4-Aufrufe (Antwort ersetzen, Tippfehler, Kapitel einsetzen) lehnen ab, solange ein Entwurf besteht, mit dem Satz „Zu diesem Material gibt es einen Entwurf im Editor".

### G) Sicherheit und Datenschutz
- Jeder Aufruf prüft serverseitig Rolle (Lehrkraft/Admin) und Besitz, wie alle Werkzeugkiste-Aufrufe.
- Die Kern-Adresse und sein Kennwort bleiben nur auf dem Server.
- Die Vorschau-Leseadresse gilt nur kurz und nur für die Entwurfs-Vorschau dieses Materials.
- Entwurfs-Inhalte erscheinen nicht in Fehlerberichten oder Logs.
- Kontolöschung (PROJ-60) entfernt Entwurf und Entwurfs-Vorschau mit dem Material.

### H) Pakete (neu zu installieren)
- `@dnd-kit/core`, `@dnd-kit/sortable`: Ziehen & Ablegen mit Maus, Touch und Tastatur
- `@tiptap/react`, `@tiptap/pm`, `@tiptap/starter-kit`: gestalteter Text-Editor
- `@tiptap/extension-table` (mit Zeile/Zelle/Kopf), `@tiptap/extension-link`: Tabellen und Links im Text
- `@uiw/react-codemirror`, `@codemirror/lang-html`, `@codemirror/lang-yaml`: HTML-Ansicht und Rohfassung

### I) Vorgeschlagene Bau-Reihenfolge (drei Pakete)
1. **Kern + Grundlage:** Kern-Erweiterungen (D 1–5), Datenbankfelder, Server-Aufrufe Laden/Speichern/Vorschau/Veröffentlichen/Verwerfen. Editor mit Gliederung, Verschieben, Löschen, Duplizieren, Deckblatt, Rohfassung für **alle** Blöcke, Vorschau, Rückgängig, Entwurf/Veröffentlichen. Damit ist der Editor schon voll benutzbar (für Experten).
2. **Formulare und Text-Editor:** die 13 Aufgaben-Formulare, Lernzielkontrolle, Textblock-Editor mit Boxen und HTML-Ansicht samt Rundreise-Prüfung, Prüfstelle in der Gliederung.
3. **Einstiege und Zusammenspiel:** „Bearbeiten" in Meine Materialien und Schritt 5, Regal-Anpassen → Editor, H5P → Seite kopieren, Entwurf-Pill, Sperre der Schritt-4-Funktionen bei Entwurf, Handy-Umschalter, Feinschliff.

### J) Was QA besonders prüfen muss
- Ein veröffentlichtes, verlinktes Material ändert sich über den Link **nicht**, solange nur ein Entwurf besteht, und **sofort** nach dem Veröffentlichen.
- Rundreise: echte Antworten aller fünf Werkzeuge (Ganzes Skript, Kreativ, Differenzierung, Arbeitsblatt, Lernsituation) öffnen, ohne Änderung veröffentlichen → die neue Seite ist inhaltsgleich mit der alten.
- Textblöcke mit allen Box-Arten bleiben nach Hin- und Herschalten zwischen gestalteter Ansicht und HTML unverändert.
- HTML mit `<script>`, `onclick` und `javascript:` erscheint nie auf der veröffentlichten Seite.
- Die Vorschau kann keine Daten der App lesen (Cookies, lokaler Speicher der App).
- Zwei Tabs: kein stilles Überschreiben.
- Material ohne Skript (Regal-Kopie, Skript entfernt): Bilder erscheinen in Vorschau und veröffentlichter Seite.

## Umsetzung

### Paket 1 (2026-11-12): Kern, Server, Editor mit Rohfassung
**Kern** (Repo `Werkzeugkiste`, Branch `feat/proj-89-editor`, PR gegen `vercel-kern`: https://github.com/David-cloud-1/Werkzeugkiste/pull/1)
- `kern_editor.py` (neu): Antwort → Struktur, Struktur → YAML (Rundreise), Rohfassung je Block, Prüfen und Bauen aus der Struktur, 8-MB-Grenze beim Veröffentlichen. `kern.py` bleibt unverändert.
- `seite.py`: Sprungmarken `data-wk` nur mit `marken=True`. `qualitaet.py`: Befunde tragen `stelle`/`stellen`.
- `app.py`: `/api/editor/{struktur,yaml,block-lesen,block-yaml,pruefen,bauen}`.
- 26 Tests (`kern_editor_test.py`). Wichtigster Befund: Eine unverändert veröffentlichte Struktur ergibt eine **byte-gleiche Seite** wie heute.

**App** (Branch `feat/proj-89-baukasten-editor`)
- Migration `20261120_proj89_baukasten_entwurf.sql` (+ Down): `entwurf`, `entwurf_am`, `entwurf_pruefung`, `hat_entwurf`. **Noch nicht angewendet.**
- Server: `GET/PUT/DELETE …/editor`, `POST …/editor/vorschau`, `…/editor/rohfassung`, `…/editor/veroeffentlichen`. Lib: `werkzeugkiste-editor.ts` (Struktur-Operationen), `werkzeugkiste-editor-server.ts`.
- Oberfläche `/admin/werkzeugkiste/bearbeiten/[id]` (ohne Seitenleiste): Gliederung mit Ziehen (dnd-kit, Maus/Touch/Tastatur) und Menü-Alternative, Duplizieren, Löschen mit „Rückgängig“-Toast, Thema hinzufügen/umbenennen/löschen, Deckblatt-Formular, **Rohfassung (YAML, CodeMirror) für alle Blöcke und die Lernzielkontrolle**, Vorschau der echten Seite (abgeschotteter Rahmen, Sprung zum Block), Hinweise der Prüfstelle am Block, automatisches Speichern mit Zwei-Tabs-Regel, Rückgängig/Wiederholen, Entwurf verwerfen, Veröffentlichen mit Bestätigung, Umschalter Gliederung/Vorschau unter 1024 px.
- Tests: 19 Routen-, 11 Struktur- und 11 Komponententests. Ganze Suite grün (3066), Build grün.

### Abweichungen und Funde
- **Live-Kern nicht auf GitHub:** Vercel betreibt den Kern mit Commit `b4a1780` (PROJ-88), `vercel-kern` auf GitHub steht auf `89537a4`. Vor dem Mergen des Kern-PRs muss der lokale Stand gepusht und der PR darauf rebased werden, sonst geht die neue Schulrecht-Suche live verloren.
- **Boxen ohne Inline-Stil:** Auf `vercel-kern` schreibt der Master-Prompt Boxen nur noch mit Klasse (`<div class="merke">`), das Schuldesign setzt `schuldesign.py`. Für Paket 2 heißt das: Der Text-Editor fügt Boxen als Klassen ein, nicht mit Inline-Stilen (die AC „gleiche Inline-Stile wie im Master-Prompt“ ist entsprechend zu lesen). Alte Antworten mit Inline-Stilen müssen trotzdem erhalten bleiben.
- **Name der Pill:** „Meine Materialien“ nennt unfertige Abläufe schon „Entwurf“. Die Markierung für unveröffentlichte Änderungen braucht in Paket 3 einen anderen Namen (Vorschlag: „Änderungen nicht veröffentlicht“).
- **Lernzielkontrolle als Rohfassung:** Der Kern liest einzelne Blöcke nur mit `type`. Die Lernzielkontrolle bekommt dafür beim Bearbeiten die Hilfsmarke `type: final_chapter`, die beim Übernehmen wieder entfernt wird.
- **Veröffentlichen und Prüfbericht:** Der neue Prüfbericht (`pruefung`) kommt aus der Editor-Prüfung (ohne Korrekturzähler und ohne Nachbesserungs-Prompt).

### Paket 2 (2026-11-12): Formulare und Text-Editor
- **Formulare** (`editor-formulare.tsx`) für 13 Typen: Auswahlfrage (multiple/single choice, genau eine richtig per Optionsfeld, mindestens zwei Antworten), Richtig/Falsch, Schnellfragen, Lückentext/Lückentext mit Hinweis/Wörter ziehen/Wörter markieren (mit Liste der erkannten Lücken und einem Satz zur Schreibweise), Begriffe zum Aufklappen, Lernkarten, Rechenaufgabe, Zusammenfassung (Fragen oder Aussagen), Kapiteltest (Bestehensgrenze 0–100, Fragen nur in den vier erlaubten Typen, Typwechsel übernimmt den Fragetext). Unbekannte Felder bleiben erhalten. Jede Eingabe ändert sofort; Tippen in einem Feld ist ein Rückgängig-Schritt.
- **Umschalter „Formular | Rohfassung“** an jedem Formular für Sonderfälle. Alle übrigen 19 Typen bleiben bis PROJ-90 in der Rohfassung.
- **Lernzielkontrolle als Formular:** Titel, Abschlusstest, Kernaussagen.
- **Text-Editor** (`text-editor.tsx`, Tiptap 2.27): gestaltete Ansicht wie die fertige Seite (Papier-Ansicht mit den Farben aus `schuldesign.py`) und Schalter zur HTML-Ansicht (CodeMirror). Werkzeugleiste: Fett, Kursiv, Kapitelüberschrift (h2), Unterabschnitt (h3), Aufzählung, nummerierte Liste, Schritt-für-Schritt-Liste, Link, „Box einfügen“ (Lernziele, Merke, Tipp, Achtung, Beispiel, Ausgangssituation, Arbeitsauftrag, Mission, Prüfungssimulation, Vergleich), „Box ändern in …“ und „Box auflösen“. Boxen werden **als Klasse** eingefügt wie im aktuellen Master-Prompt.
- **Was der gestaltete Editor nicht bearbeiten kann, bleibt byte-genau stehen** (unveränderliche Blöcke): Tabellen, Bilder, fremde `div`s, Boxen und Blöcke mit eigenem `style` (alte Antworten). Sie zeigen den Hinweis „Unverändert übernommen – bearbeiten in der HTML-Ansicht“.
- **Rundreise-Prüfung** (`werkzeugkiste-text.ts`): Beim Öffnen und beim Zurückschalten aus der HTML-Ansicht vergleicht der Editor das Original mit dem, was der gestaltete Editor daraus macht (Leerraum, Attribut-Reihenfolge, b/strong, einzelne Absätze in Listen und Boxen zählen nicht). Weicht es ab, bleibt der Block in der HTML-Ansicht mit dem Hinweis aus der Spec.
- **Einfügen aus Word/Webseiten** verliert Schriften, Farben, Klassen und Skripte. Links nur mit `https:`/`http:`/`mailto:`.
- **Hinweise in der HTML-Ansicht:** Skripte/Ereignisse („werden beim Bauen entfernt“) und nicht geschlossene Elemente, beides ohne Sperre.
- Tests: 10 (Text-Hilfen), 7 (Text-Editor mit echter neuer und alter KI-Antwort), 9 (Formulare), 3 (Zusammenspiel im Editor). Ganze Suite grün (3095), Build grün. Im echten Browser (Chromium) geprüft: Boxen, Schritte, Vergleich und Tabelle sehen aus wie auf der Seite, „Box einfügen“ funktioniert, am Handy (390 px) kein seitliches Scrollen.

### Funde aus Paket 2
- **Tiptap/ProseMirror deuten Inline-Stile um** (`font-weight` → fett, mehrteilige `style`-Angaben gehen verloren). Deshalb werden Blöcke mit eigenem `style` nicht im gestalteten Editor geöffnet, sondern unverändert gehalten. Neue Antworten (Boxen nur als Klasse) betrifft das nicht.
- **Tabellen** bleiben vorerst unveränderliche Blöcke (Tiptaps Tabellen bauen `thead`/`colgroup` um). Bearbeiten als Tabelle kommt mit PROJ-91.

### Paket 3 (2026-11-12): Einstiege und Zusammenspiel
- **Meine Materialien:** sichtbares Symbol „Im Baukasten bearbeiten“ (Bausteine-Symbol, damit es nicht mit „Überarbeiten“ = Schritt 4 verwechselt wird) neben der Hauptaktion, in Tabelle und Handy-Karte. Bei Interaktiver Seite führt es in den Editor, bei H5P der fünf Kapitel-Werkzeuge öffnet es den Dialog „Als Interaktive Seite bearbeiten?“ (E12). Andere Werkzeuge und unfertige Abläufe bekommen kein Symbol.
- **Markierung „Nicht veröffentlicht“** (Pill, Tooltip „Es gibt unveröffentlichte Änderungen im Baukasten“). Der Name „Entwurf“ war schon für unfertige Abläufe vergeben.
- **H5P → Seite:** neue Route `POST …/ablaeufe/:id/als-seite`. Sie prüft zuerst, ob der Kern die Antwort als Kapitel-Struktur liest (sonst wird nichts angelegt), und legt dann ein neues Material „[Titel] (Seite)“ an. Einlesung bzw. Bilder-Auszug und Skript werden kopiert, die Skript-Uhr läuft weiter, und das Material wird als Seite gebaut (höchstens 8 MB). Scheitert der Bau, wird die halbe Kopie wieder entfernt. Das Original bleibt unberührt. Die Speichergrenze wird vorher geprüft.
- **Schritt „Fertig“:** „Im Baukasten bearbeiten“ als `outline` neben „Herunterladen“, nur bei Interaktiver Seite.
- **Regal „Anpassen“:** Eine Interaktive Seite öffnet direkt im Editor, alles andere wie bisher bei Schritt 4.
- **Sperre in Schritt 4:** Solange ein Entwurf besteht, antworten „Neu bauen“, „Kapitel einsetzen“ und das Einfügen einer **anderen** Antwort mit 409 (`code: entwurf_im_editor`). Erneut prüfen derselben Antwort bleibt möglich. Schritt 4 zeigt den Hinweis „Zu diesem Material gibt es einen Entwurf im Editor“ mit „Im Editor öffnen“.
- `hat_entwurf` steht jetzt in der Material-Liste und am Ablauf (`ABLAUF_SPALTEN`). **Deshalb muss die Migration vor dem Ausrollen der App eingespielt sein**, sonst schlagen alle Werkzeugkiste-Abfragen fehl.
- Tests: 9 (Routen: Kopie als Seite, Sperren, Listen-Felder), 7 (Einstiege in der Oberfläche), 1 (Regal → Editor). Ganze Suite grün (3112), Build grün.

### Fixes nach der QA (2026-11-12)
**App** (Branch `feat/proj-89-baukasten-editor`)
- **BUG-1:** Stände werden als Zeitpunkt verglichen (`gleicherStand`), nicht als Text. `PUT …/editor` gibt den Stand so zurück, wie ihn die Datenbank schreibt. Die nachgebildete Datenbank in `editor.test.ts` liefert jetzt `…+00:00` wie die echte, ein Test speichert dreimal hintereinander.
- **BUG-2:** Veröffentlichen holt zuerst YAML und Prüfung (ohne Nebenwirkung), baut in Zwischendateien (`ausgabe-neu`, `vorschau-neu.html`), speichert mit Stand-Bedingung und ersetzt erst danach `ausgabe` und `vorschau.html`. Scheitert das Ersetzen, wird das Speichern zurückgenommen (alte Antwort, Entwurf wieder da). Bei 409 bleibt die veröffentlichte Datei unberührt.
- **BUG-4:** 401/403/404 beim Speichern → Banner „Du hast keinen Zugriff mehr …“ bzw. „Dieses Material gibt es nicht mehr …“, Gliederung schreibgeschützt (`inert`), Veröffentlichen gesperrt, kein neuer Versuch.
- **BUG-5:** Fehlende Bilder kommen als Hinweis „Bild fehlt: name.png“ an den Block (Liste und Symbol wie die Prüfstelle). Die HTML-Ansicht weist auf externe Bilder hin. Der Hinweis auf aktiven Inhalt erkennt jetzt auch iframe/object/embed/form/meta/srcdoc und `/onerror=`.
- **BUG-6:** „Neu einlesen“ ist bei einem Entwurf gesperrt (409, `entwurf_im_editor`).

**Kern** (Repo `Werkzeugkiste`, Branch `fix/proj-89-qa`, Commit 4704b78)
- **BUG-3:** `_saeubern` hat eine zweite Stufe: entfernt iframe, frame, object, embed, applet, meta, base, link, form, portal, `srcdoc` und alle on…-Attribute (auch nach `/`), entschärft Skript- und `data:`-URLs auch ohne Anführungszeichen und mit Zeichencodes (`&#x09;`, `&#106;`). Die erste Stufe bleibt unverändert. Gegenprobe mit 752 echten Texten: keine Abweichung, bisherige Seiten bleiben bytegleich.
- **BUG-7 (neu, Critical, bestand schon vor PROJ-89):** Bildpfade wurden im Server notfalls von der Platte des Kerns gelesen. Ein Pfad wie `/proc/self/environ` oder `kern.py` in der Antwort bzw. Rohfassung hätte Dateien des Servers (auch Umgebungsvariablen mit dem Kern-Kennwort) als Bild in die Seite geholt. Jetzt lesen `seite.py` und der Moodle-ZIP-Weg nur noch im Kommandozeilen-Betrieb (ohne `images`) von der Platte. H5P war nicht betroffen.
- **BUG-5 (Kern-Teil):** Der Editor-Bau liefert `fehlende_bilder` mit Stelle. Die Editor-Vorschau zeigt einen Platzhalter „Bild fehlt: …“, veröffentlichte Seiten bleiben ohne.
- Neue Tests: `kern_sicherheit_test.py` (7). Alle bisherigen Kern-Tests grün.

### Noch offen
- Kern-Branch `fix/proj-89-qa` nach `vercel-kern` mergen und deployen (vor der App).
- Erneute `/qa` und Browser-Durchgang mit einem Test-Material.
- Kennwort des Kerns (`KERN_SECRET`) vorsorglich erneuern: BUG-7 war seit PROJ-51 offen. Ein Missbrauch ist nicht bekannt, ließe sich aber nur an den Antworten in `werkzeug_ablaeufe` erkennen.

## QA Test Results

**Datum:** 2026-11-12 · **Prüfer:** QA (Claude Opus 5.5) · **Stand:** App-Branch `feat/proj-89-baukasten-editor` (5ddc9c6), Kern `vercel-kern` 4b35e3b (live), Migration eingespielt.

**Ergebnis: NICHT produktionsreif.** 1 Critical, 2 Medium, 3 Low.

### Was geprüft wurde
- **Automatisch:** `npm test` 3112/3112 grün (258 Dateien), `npm run build` grün. Kern: `kern_editor_test`, `kern_test`, `kern_recht_test`, `schulrecht_suche_neu_test`, `schulrecht_messung_test` grün.
- **Code-Review** aller neuen Routen, der Server-Lib, des Editor-Zustands, der Vorschau und der Schritt-4-Sperren gegen die Acceptance Criteria.
- **Datenbank (lesend):** RLS auf `werkzeug_ablaeufe` = nur Besitzer und nur mit Lehrkraft-Rolle, für alle vier Befehle. Neue Spalten vorhanden, `hat_entwurf` berechnet.
- **Live-Kern:** `/api/editor/struktur` (unbekannter Block bleibt erhalten), `/api/editor/block-yaml` (YAML-1.1-Fallen `no`/`on` korrekt in Anführungszeichen), `/api/editor/block-lesen` (kaputte Rohfassung → „Diese Rohfassung ist nicht lesbar (Zeile 2). Bitte die Einrückung prüfen.").
- **Bereinigung im Kern** (`seite._saeubern`) lokal mit Angriffs-HTML.
- **Nicht geprüft:** Browser-Durchgang (kein Dev-Server/Playwright auf diesem Rechner), Cross-Browser, 375/768/1440 px, echtes Veröffentlichen an einem Produktionsmaterial. Keine neuen E2E-Tests.

### Acceptance Criteria (Code-Review)
| Bereich | Ergebnis |
|---|---|
| Einstieg (Meine Materialien, Fertig, Regal, H5P-Kopie, nur Besitzer) | bestanden. Abweichungen dokumentiert: Bausteine-Symbol statt Stift, Pill „Nicht veröffentlicht“ statt „Entwurf“ |
| Aufbau, Verschieben, Löschen, Duplizieren, Thema hinzufügen | bestanden (laut Code und Komponententests) |
| Textblöcke, HTML-Hinweise | bestanden bis auf BUG-3 (Bereinigung) |
| Aufgaben-Formulare, Rohfassung, Deckblatt, Lernzielkontrolle | bestanden |
| Prüfstelle | bestanden (Liste heißt „Hinweise der Prüfstelle (N)“) |
| **Speichern (automatisch, Zwei-Tabs)** | **nicht bestanden – BUG-1** |
| **Veröffentlichen** | **nicht bestanden – BUG-1, BUG-2** |
| Zusammenspiel Schritt 4 (Sperren), Speichergröße, Löschen | bestanden. Lücke bei „Neu einlesen“ → BUG-6 |
| Edge Cases „Bild fehlt“, „Externe Bilder“, „Rolle verloren“ | nicht umgesetzt → BUG-4, BUG-5 |

### Bugs

**BUG-1 – Critical: Ab dem zweiten automatischen Speichern meldet der Editor „In einem anderen Fenster geändert“.**
`PUT …/editor` gibt `stand: new Date().toISOString()` zurück (`…123Z`), die Datenbank liefert `entwurf_am` aber als `…123+00:00` (live geprüft: `to_json(timestamptz)` → `+00:00`). Der Vergleich `eingabe.data.stand !== bekannt` ist ein Textvergleich und schlägt deshalb fehl.
Schritte: Material im Editor öffnen → etwas ändern (1. Speichern klappt, `stand` = `…Z`) → noch etwas ändern → 409, Editor gesperrt, „Neu laden“. Ebenso „Veröffentlichen“ ohne vorheriges Neuladen → 409.
Die Routentests verdecken das, weil die nachgebildete Datenbank `…Z` zurückgibt. Fix-Idee: Zeitpunkte als Zeit vergleichen (`Date.parse`) und nach dem Speichern den Wert aus der Datenbank zurückgeben (`.select('entwurf_am')`); einen Test mit `+00:00` aus der „Datenbank“ ergänzen.

**BUG-2 – Medium: Veröffentlichen ersetzt die öffentliche Datei, bevor sicher ist, dass der Rest klappt.**
`/api/editor/bauen` schreibt direkt nach `ausgabe` (und überschreibt die Lehrer-Vorschau). Erst danach laufen `yaml`, `pruefen` und das bedingte Update. Scheitert einer dieser Schritte (Kern-Fehler, Datenbankfehler, 409 weil ein anderer Tab weitergespeichert hat), sehen Link und Regal schon die neue Fassung, während Entwurf und alte Antwort bleiben. Das widerspricht E3 und dem AC „bleibt die alte Fassung veröffentlicht“. Bei der 409 im Rennen ist sogar ein älterer Entwurfsstand veröffentlicht.
Fix-Idee: `yaml` und `pruefen` vor dem Bau holen, in eine Zwischendatei bauen und erst nach erfolgreichem Datenbank-Update an die Stelle von `ausgabe` kopieren.

**BUG-3 – Medium (Kern, schon vor PROJ-89 vorhanden): Die Bereinigung lässt sich umgehen.**
`seite._saeubern` arbeitet mit regulären Ausdrücken. Lokal getestet, unverändert durchgelassen werden:
`<a href=javascript:alert(1)>` (ohne Anführungszeichen), `<a href="jav&#x09;ascript:…">`, `<iframe srcdoc="&lt;script&gt;…">`, `<object data="data:text/html;base64,…">`, `<meta http-equiv="refresh" content="0;url=https://…">`, `<form action="https://…">`.
Der öffentliche Link läuft in einer Sandbox ohne `allow-same-origin`, an Daten der App kommt so niemand. Möglich sind aber Weiterleitung oder ein gefälschtes Formular auf der Seite der Schüler und Skripte in heruntergeladenen Dateien. Mit dem HTML-Feld des Editors ist das jetzt ein offizieller Weg. AC „Skripte, Event-Attribute und `javascript:`-Links erscheinen nie“: nicht erfüllt.
Fix-Idee: Im Kern eine Freigabeliste statt Sperrliste (z. B. `nh3`), mit erlaubten Tags/Attributen/URL-Schemata. Dabei die Gleichwertigkeit bestehender Seiten prüfen.

**BUG-4 – Low: Rolle verloren → endlose Wiederholung statt Schreibschutz.**
Ein 403 beim Speichern landet im allgemeinen Fehlerzweig: „Nicht gespeichert“, alle 5 s neuer Versuch. Der Hinweis „Du hast keinen Zugriff mehr auf die Werkzeugkiste“ und der Schreibschutz (Edge Case) fehlen. Gleiches gilt für 404 (Material in anderem Tab gelöscht).

**BUG-5 – Low: Edge Cases „Bild fehlt“ und „Externe Bilder“ nicht umgesetzt.**
Die Gliederung zeigt bei fehlender Bilddatei keinen Hinweis. Die HTML-Ansicht weist bei `<img src="https://…">` nicht auf „Externe Bilder funktionieren offline nicht“ hin.

**BUG-6 – Low: „Neu einlesen“ lässt einen alten Entwurf liegen.**
`POST …/einlesen` setzt ein fertiges Material auf `laeuft` zurück, ohne `entwurfSperre` und ohne den Entwurf zu löschen. Nach dem neuen Bau taucht im Editor der Entwurf zum alten Skript wieder auf, und Schritt 4 ist gesperrt.

### Sicherheit (Red Team)
- Fremdes Material: RLS + `editorZeileOderFehler` → 404. Kein Weg über Service-Schlüssel an fremde Zeilen gefunden (alle Pfade aus der eigenen Zeile).
- Proxy: Seite und API liegen unter den freigegebenen Präfixen `/admin/werkzeugkiste` bzw. `/api/admin/werkzeugkiste`.
- Eingaben: Zod mit Größengrenzen (Struktur ≤ `ENTWURF_MAX_ZEICHEN`, 300 Themen, 1000 Blöcke, Rohfassung 200 000 Zeichen), dazu DB-Check 2,5 MB.
- Vorschau: `srcdoc` + `sandbox="allow-scripts"` ohne `allow-same-origin`. Das Sprung-Skript filtert die Marke. In Ordnung.
- Regal-„Anpassen“ und „anderes Werkzeug“ kopieren den Entwurf nicht. Unveröffentlichtes gelangt nicht zu Kolleginnen und Kollegen.
- Bereinigung: siehe BUG-3.

### Empfehlung
BUG-1 vor dem Livegang beheben (sonst ist der Editor praktisch nicht benutzbar), BUG-2 ebenfalls. BUG-3 als eigener Kern-Fix, BUG-4 bis BUG-6 können folgen. Nach den Fixes erneut `/qa` und ein Browser-Durchgang mit einem Test-Material.

### Stand der Bugs (2026-11-12, nach den Fixes)
BUG-1 bis BUG-6 behoben, dazu BUG-7 (Server-Dateien als Bild, beim Beheben gefunden). Details unter „Umsetzung → Fixes nach der QA“. Erneute QA steht aus.

## Deployment
_To be added by /deploy_
