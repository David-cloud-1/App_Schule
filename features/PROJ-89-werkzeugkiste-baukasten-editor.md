# PROJ-89: Werkzeugkiste – Baukasten-Editor (Grundgerüst)

## Status: Planned
**Created:** 2026-11-12
**Last Updated:** 2026-11-12 (Requirements)

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
_To be added by /architecture_

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
