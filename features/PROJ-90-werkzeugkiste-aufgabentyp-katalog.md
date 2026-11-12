# PROJ-90: Werkzeugkiste – Baukasten: Aufgabentyp-Katalog

## Status: Planned
**Created:** 2026-11-12
**Last Updated:** 2026-11-12 (Anforderungen ausgearbeitet)

## Idee in einem Satz
Im Baukasten-Editor (PROJ-89) fügt die Lehrkraft an jeder Stelle einen neuen Block ein: Sie wählt den Typ aus einem bebilderten Katalog aller Aufgabentypen der Interaktiven Seite. Der Block kommt mit einem Beispiel und wird im passenden Formular ausgefüllt.

## Kontext
- Wunsch des Nutzers (2026-11-12): „die Auswahl an verschiedensten Aufgabentypen, die man dann wählen kann".
- Der Kern (`seite.py`, `BAUSTEINE`) baut heute **32 Typen**. Acht davon gibt es nur auf der Seite (`reihenfolge`, `freitext`, `trainer`, `bildzuordnung`, `rechenweg`, `fallakte`, `schaetzrunde`, `selbsteinschaetzung`). Vier ahmen H5P nur nach (`find_words`, `memory_game`, `flashcards`, `image_sequencing`).
- PROJ-89 bringt Formulare für den Lehrtext und 13 Aufgabentypen. **18 Typen** lassen sich dort nur als Rohfassung (YAML) bearbeiten: `image`, `drag_drop`, `crossword`, `reihenfolge`, `calculation_example`, `arithmetic_quiz`, `interactive_video`, `freitext`, `trainer`, `bildzuordnung`, `find_words`, `memory_game`, `flashcards`, `image_sequencing`, `rechenweg`, `fallakte`, `schaetzrunde`, `selbsteinschaetzung`.
- Neue Blöcke gibt es im Editor heute noch nicht. Man kann nur vorhandene verschieben, duplizieren und löschen und leere Themen anlegen.

## Entscheidungen (Nutzer, 2026-11-12)
- **E1 – Aufteilung:** PROJ-90 umfasst den Katalog, das Einfügen und Formulare für **alle** Typen. „Typ eines vorhandenen Blocks wechseln" wird ein eigenes Feature (**PROJ-95**).
- **E2 – Startinhalt:** Ein neuer Block startet mit einem **kurzen Beispielinhalt**, der in der Vorschau sofort funktioniert. Bis die Lehrkraft ihn ändert, meldet die Prüfstelle einen Hinweis.
- **E3 – Didaktik:** Jeder Typ zeigt im Katalog **einen Satz „Gut für: …"** (abgeleitet aus dem Master-Prompt).
- **E4 – Darstellung im Katalog:** **kleines, festes Vorschaubild** je Typ (so sieht der Block auf der Seite aus) und ein Satz Beschreibung. Kein Live-Beispiel.
- **E5 – Bild-Typen:** „Bild" und „Bildzuordnung" sind im Katalog. Das Bild wird aus den **Bildern gewählt, die das Material schon hat** (aus dem Skript bzw. dem Bilder-Auszug). Hat das Material keine Bilder, ist der Typ ausgegraut. Hochladen folgt mit PROJ-92.
- **E6 – Kapiteltest:** „Frage hinzufügen" im Kapiteltest (im Thema und in der Lernzielkontrolle) nutzt **denselben Katalog, gefiltert** auf die dort erlaubten Typen.
- **E7 – Zuletzt verwendet:** Die letzten bis zu **4** eingefügten Typen stehen oben im Katalog. Gemerkt **pro Gerät**.
- **E8 – Auswahlfrage nur einmal (Vorschlag, beim Review bestätigen):** `multiple_choice` und `single_choice` haben im Kern dieselbe Form und dasselbe Formular. Der Katalog zeigt deshalb **einen** Eintrag „Auswahlfrage". Er legt `multiple_choice` an. Vorhandene `single_choice`-Blöcke bleiben unverändert bearbeitbar. Der Katalog hat damit **31 Einträge**.

## Dependencies
- Requires: PROJ-89 (Editor-Grundgerüst, Formulare, Rohfassung, Prüfstelle, Rückgängig)
- Grundlage für: PROJ-93 (Block per KI: nutzt den Katalog zur Typwahl), PROJ-94 (leere Seite: wird mit dem Katalog gefüllt), PROJ-95 (Typ wechseln)
- Berührt: PROJ-91 (Tabelle, Diagramm) und PROJ-92 (Bild-Upload) erweitern den Katalog später um ihre Einträge.

## User Stories
- Als **Lehrkraft** möchte ich an jeder Stelle eines Themas einen neuen Block einfügen, damit ich mein Material um eigene Aufgaben ergänzen kann, ohne einen neuen KI-Lauf zu starten.
- Als **Lehrkraft** möchte ich alle verfügbaren Aufgabentypen übersichtlich nach Gruppen sehen, mit Bild und einem Satz Erklärung, damit ich auch Typen entdecke, die ich noch nicht kenne.
- Als **Lehrkraft** möchte ich im Katalog suchen können (auch mit Begriffen wie „Quiz" oder „Multiple Choice"), damit ich den passenden Typ schnell finde.
- Als **Lehrkraft** möchte ich zu jedem Typ lesen, wofür er sich didaktisch eignet, damit ich bewusst auswähle.
- Als **Lehrkraft** möchte ich, dass ein neuer Block mit einem Beispiel startet, damit ich sofort sehe, wie er funktioniert, und nur noch meine Inhalte eintrage.
- Als **Lehrkraft** möchte ich jeden Aufgabentyp in einem verständlichen Formular bearbeiten statt in YAML, damit ich keine technischen Kenntnisse brauche.
- Als **Lehrkraft**, die oft dieselben Typen nutzt, möchte ich meine zuletzt verwendeten Typen oben finden, damit das Einfügen schnell geht.

## Acceptance Criteria

### Einfügen („Block hinzufügen")
- [ ] In der Gliederung gibt es **zwischen je zwei Blöcken** eine Einfügestelle „+". Sie ist mit der Maus beim Überfahren und per Tastatur-Fokus sichtbar. Auf Touch-Geräten ist sie immer sichtbar und mindestens 44 px hoch.
- [ ] **Am Ende jedes Themas** steht der Knopf „Block hinzufügen". Bei einem leeren Thema steht er unter „Noch keine Blöcke".
- [ ] Im `⋯`-Menü jedes Blocks stehen zusätzlich „Block darüber einfügen …" und „Block darunter einfügen …" (Weg ohne Maus und ohne Zielgenauigkeit).
- [ ] Jeder dieser Wege öffnet den **Katalog**. Der gewählte Typ wird **genau an der gewählten Stelle** eingefügt.
- [ ] Nach dem Einfügen ist der neue Block **geöffnet** (Formular sichtbar), die Gliederung scrollt zu ihm und die Vorschau springt nach dem nächsten Bau zu ihm.
- [ ] Einfügen ist **ein Schritt** für Rückgängig/Wiederholen (PROJ-89) und wird wie jede Änderung automatisch gespeichert.
- [ ] Im Deckblatt und in der Lernzielkontrolle gibt es keine Einfügestellen für Blöcke. Ausnahme: der Kapiteltest (siehe unten).

### Katalog: Aufbau
- [ ] Der Katalog öffnet sich als Fenster über dem Editor. Unter 1024 px Breite füllt er den ganzen Bildschirm. Schließen mit ✕, Esc oder „Abbrechen" fügt nichts ein.
- [ ] Er zeigt **31 Einträge** (alle 32 Typen des Kerns, `single_choice` und `multiple_choice` als ein Eintrag „Auswahlfrage", siehe E8) in **sieben Gruppen** in dieser Reihenfolge:
  | Gruppe | Typen |
  |---|---|
  | Lesen & Nachschlagen | Lehrtext (`text`), Bild (`image`), Begriffe zum Aufklappen (`accordion`), Rechenbeispiel (`calculation_example`) |
  | Abfragen | Auswahlfrage (`multiple_choice`), Richtig oder falsch (`true_false`), Schnellfragen (`single_choice_set`), Kapiteltest (`question_set`), Offene Frage (`freitext`), Video mit Fragen (`interactive_video`) |
  | Lücken & Wörter | Lückentext (`fill_blanks`), Lückentext mit Hinweis (`advanced_fill_blanks`), Wörter ziehen (`drag_words`), Wörter markieren (`mark_words`) |
  | Zuordnen & Ordnen | Zuordnen (`drag_drop`), Reihenfolge (`reihenfolge`), Bildzuordnung (`bildzuordnung`), Bilder ordnen (`image_sequencing`) |
  | Rechnen | Rechenaufgabe (`calculation_exercise`), Kopfrechnen (`arithmetic_quiz`), Rechenweg (`rechenweg`), Schätzrunde (`schaetzrunde`) |
  | Spiele & Rätsel | Kreuzworträtsel (`crossword`), Wörtersuche (`find_words`), Memory (`memory_game`), Trainer (`trainer`), Fallakte (`fallakte`) |
  | Selbstcheck & Wiederholen | Lernkarten zum Umdrehen (`dialog_cards`), Lernkarten zum Tippen (`flashcards`), Zusammenfassung (`summary`), Selbsteinschätzung (`selbsteinschaetzung`) |
- [ ] Die Namen sind dieselben wie in der Gliederung (`TYP_NAMEN` aus PROJ-89). Kein technischer Typname ist sichtbar.
- [ ] Jeder Eintrag zeigt: **Vorschaubild** (statisch, mit Alternativtext), **Name**, **einen Satz Beschreibung** (was die Schüler tun) und **eine Zeile „Gut für: …"** (Didaktik, E3).
- [ ] Die Vorschaubilder passen zum gewählten Hell-/Dunkel-Modus des Lehrkräfte-Bereichs oder sind in beiden gut lesbar.
- [ ] Typen mit **Selbstkontrolle** (zählen in den Fortschritt der Seite, `PRUEFBAR` im Kern) tragen eine kleine Markierung „wird ausgewertet". Lehrtext, Bild, Begriffe zum Aufklappen und Rechenbeispiel haben sie nicht.
- [ ] Ganz oben steht **„Zuletzt verwendet"** mit den letzten bis zu 4 eingefügten Typen (neueste zuerst, ohne Doppelte). Ohne Verlauf entfällt der Abschnitt. Gemerkt wird pro Gerät (E7). Ist der Gerätespeicher nicht verfügbar (privates Fenster), entfällt der Abschnitt ohne Fehlermeldung.

### Katalog: Suche und Bedienung
- [ ] Ein Suchfeld oben hat beim Öffnen den Fokus. Die Liste filtert beim Tippen, ohne Groß-/Kleinschreibung und ohne Rücksicht auf Umlaute („schatz" findet „Schätzrunde").
- [ ] Gesucht wird in Name, Beschreibung, „Gut für" und in **Suchbegriffen** je Typ (z. B. Auswahlfrage: „Quiz, Multiple Choice, MC, Single Choice"; Kreuzworträtsel: „Rätsel, Crossword"; Lehrtext: „Text, Merke, Tipp, Box"). Auch die englischen H5P-Namen finden den Typ.
- [ ] Während der Suche entfällt „Zuletzt verwendet". Treffer bleiben nach Gruppen geordnet. Leere Gruppen werden ausgeblendet.
- [ ] Ohne Treffer erscheint „Kein Aufgabentyp passt zu „…"." mit dem Knopf „Suche löschen".
- [ ] Der Katalog ist vollständig per Tastatur bedienbar: Pfeiltasten wechseln zwischen den Einträgen, Enter fügt ein, Esc schließt. Ein Bildschirmleser liest Name, Beschreibung und „Gut für" vor.
- [ ] Ein Klick bzw. Tipp auf einen Eintrag fügt sofort ein. Es gibt keinen zweiten Bestätigungsschritt.

### Bild-Typen (E5)
- [ ] „Bild" und „Bildzuordnung" sind nur wählbar, wenn das Material **mindestens ein Bild** hat (aus der Einlesung des Skripts oder aus dem Bilder-Auszug einer Regal-Kopie).
- [ ] Ohne Bilder sind beide Einträge ausgegraut und zeigen „Dieses Material hat noch keine Bilder. Hochladen kommt bald." Sie lassen sich nicht einfügen, sind aber per Bildschirmleser als „nicht verfügbar" erkennbar.
- [ ] Beim Einfügen eines Bild-Typs öffnet sich zuerst die **Bildauswahl**: Vorschaubilder aller Bilder des Materials, Auswahl per Klick. „Abbrechen" fügt keinen Block ein.
- [ ] Das Formular beider Typen erlaubt später, ein anderes Bild aus derselben Auswahl zu wählen.

### Kapiteltest (E6)
- [ ] Im Formular „Kapiteltest" (im Thema und in der Lernzielkontrolle) öffnet „Frage hinzufügen" denselben Katalog, **gefiltert** auf die im Kapiteltest erlaubten Typen: Auswahlfrage, Richtig oder falsch, Lückentext.
- [ ] Der gefilterte Katalog nennt oben den Grund: „Im Kapiteltest sind nur diese Fragetypen möglich."
- [ ] Gruppen, Suche und „Gut für" funktionieren dort genauso. „Zuletzt verwendet" zeigt nur erlaubte Typen.
- [ ] Die neue Frage wird am Ende des Kapiteltests eingefügt und startet mit Beispielinhalt.

### Beispielinhalt (E2)
- [ ] Jeder Typ hat einen festen **Beispielinhalt**, der die Prüfstelle des Kerns ohne Fehler besteht und in der Vorschau voll funktioniert (z. B. Auswahlfrage mit Frage, drei Antworten, einer richtigen und Feedback; Kreuzworträtsel mit vier Wörtern; Memory mit vier Paaren).
- [ ] Die Beispiele sind **fachneutral**, damit sie in jedem Fachbereich passen. Sie erklären möglichst den Typ selbst (z. B. „Ersetze diese Frage durch deine eigene").
- [ ] Solange ein eingefügter Block seinen Beispielinhalt **unverändert** enthält, zeigt die Prüfstelle an diesem Block den Hinweis „Beispielinhalt noch nicht ersetzt". Wie alle Hinweise sperrt er nicht (PROJ-89 E9).
- [ ] Die Bestätigung „Veröffentlichen" nennt zusätzlich, wie viele Blöcke noch Beispielinhalt enthalten, wenn es mindestens einer ist.
- [ ] Der Hinweis verschwindet, sobald in dem Block irgendein Inhaltsfeld geändert wurde.
- [ ] Bild-Typen übernehmen das gewählte Bild. Die Bildzuordnung startet mit zwei Beispielpunkten in der Bildmitte.

### Formulare für alle Typen
- [ ] Jeder der 32 Typen öffnet sich in einem **Formular**. Die 13 Formulare aus PROJ-89 bleiben, wie sie sind. Neu kommen Formulare für die 18 übrigen Typen:
  - **Bild** (`image`): Bild aus der Auswahl, Bildunterschrift, Alternativtext (Pflicht), Breite (klein/mittel/ganze Breite)
  - **Zuordnen** (`drag_drop`): Arbeitsauftrag, Kategorien (mind. 2), Begriffe mit je einer richtigen Kategorie
  - **Kreuzworträtsel** (`crossword`): Arbeitsauftrag, Wörter mit Hinweis. Die Anordnung im Gitter übernimmt der Kern. Ist ein Wort nicht unterzubringen, nennt der Prüfhinweis es.
  - **Reihenfolge** (`reihenfolge`): Arbeitsauftrag, Schritte in der richtigen Reihenfolge (sortierbar per Ziehen und per Knöpfen)
  - **Rechenbeispiel** (`calculation_example`): Formel, Rechenschritte, Ergebnis, Erklärung
  - **Kopfrechnen** (`arithmetic_quiz`): Aufgaben mit Ergebnis
  - **Video mit Fragen** (`interactive_video`): Video-Adresse, Fragen mit Zeitpunkt (mm:ss) und Antworten
  - **Offene Frage** (`freitext`): Aufgabe, Frage, Musterlösung, Mindestzahl Zeichen, Höhe des Antwortfelds
  - **Trainer** (`trainer`): Arbeitsauftrag, Runden mit richtiger Reihe und Störern
  - **Bildzuordnung** (`bildzuordnung`): Bild, Arbeitsauftrag, Alternativtext, Punkte mit Beschriftung. Punkte werden **per Klick auf das Bild** gesetzt und per Ziehen verschoben. Für Tastatur gibt es Eingabefelder für die Position in Prozent.
  - **Wörtersuche** (`find_words`): Arbeitsauftrag, Wörter
  - **Memory** (`memory_game`): Arbeitsauftrag, Paare (Karte A, Karte B)
  - **Lernkarten zum Tippen** (`flashcards`): Arbeitsauftrag, Karten mit Frage und akzeptierten Antworten
  - **Bilder ordnen** (`image_sequencing`): Arbeitsauftrag, Schritte in der richtigen Reihenfolge
  - **Rechenweg** (`rechenweg`): Aufgabe, Frage, Schritte, Ergebnis, Einheit, Hinweis
  - **Fallakte** (`fallakte`): Titel, Ausgangssituation, Schritte (Frage, Antworten, richtige Antwort, was danach enthüllt wird), Urteil am Ende
  - **Schätzrunde** (`schaetzrunde`): Arbeitsauftrag, Fragen mit Wert, Einheit, Quelle und Kommentar
  - **Selbsteinschätzung** (`selbsteinschaetzung`): Titel, Arbeitsauftrag, Aussagen („Ich kann …") mit optionaler Hilfe
- [ ] Listen in allen Formularen (Antworten, Paare, Schritte, Punkte …) lassen sich hinzufügen, löschen und sortieren, wie in den Formularen aus PROJ-89.
- [ ] Pflichtfelder sind markiert. Leere Pflichtfelder werden gespeichert und erscheinen als Hinweis der Prüfstelle (wie PROJ-89).
- [ ] Felder, die der Kern unter zwei Namen akzeptiert (z. B. `steps`/`schritte`, `question`/`frage`), zeigt das Formular als **ein** Feld. Beim Speichern bleibt der Name erhalten, den der Block schon hatte. Neue Blöcke nutzen die Namen aus dem Master-Prompt.
- [ ] Felder, die das Formular nicht kennt (z. B. von einer neueren KI-Antwort), gehen beim Bearbeiten **nicht verloren**.
- [ ] In jedem Formular gibt es den Schalter **„Rohfassung"** (Expertenweg aus PROJ-89). Er zeigt den Block als YAML. Zurück zum Formular geht nur, wenn die Rohfassung lesbar ist.

## Edge Cases
- **Einfügen in ein zugeklapptes Thema** (über das `⋯`-Menü des Themas oder „Block hinzufügen"): Das Thema klappt auf, der neue Block ist geöffnet.
- **Einfügen, während die Vorschau noch baut:** Das Einfügen wirkt sofort in der Gliederung. Die Vorschau baut danach erneut (PROJ-89: nie mehrere Bauaufträge gleichzeitig).
- **Rückgängig direkt nach dem Einfügen:** Der Block verschwindet vollständig. Der Eintrag in „Zuletzt verwendet" bleibt.
- **Material ohne Bilder, später mit Bild-Upload (PROJ-92):** Die Bild-Typen werden automatisch wählbar, sobald das Material ein Bild hat. Der Katalog braucht dafür keine Änderung.
- **Bild des Bild-Blocks fehlt** (Bilder-Auszug unvollständig): Verhalten wie PROJ-89 („Bild fehlt", Platzhalter). Im Formular kann ein anderes Bild gewählt werden.
- **Bildzuordnung mit Punkten außerhalb des Bildes** (alte Daten, Werte über 100 %): Die Punkte werden am Rand angezeigt und als Hinweis gemeldet, nicht gelöscht.
- **Video-Adresse ungültig oder nicht von einer bekannten Plattform:** Speichern geht. Die Prüfstelle meldet „Video-Adresse prüfen". Die Vorschau zeigt, was der Kern daraus baut.
- **Kreuzworträtsel mit Wörtern, die nicht ins Gitter passen:** Speichern geht. Der Prüfhinweis nennt die Wörter. Der Kern lässt sie wie heute weg.
- **Kapiteltest mit einer nicht erlaubten Frage** (aus einer alten KI-Antwort): Sie bleibt erhalten und erscheint im Formular als „Nicht im Kapiteltest möglich – wird übersprungen" mit Löschen-Knopf. Der Kern überspringt sie wie heute.
- **Kern kennt künftig einen neuen Typ, den der Katalog noch nicht hat:** Der Katalog zeigt ihn nicht. Vorhandene Blöcke dieses Typs öffnen als Rohfassung (wie PROJ-89). Ein automatischer Test meldet beim Bau der App, wenn Katalog und `BAUSTEINE` des Kerns auseinanderlaufen.
- **Sehr viele Blöcke in einem Thema (über 50):** Einfügestellen bleiben bedienbar. Das Einfügen spürt keine Verzögerung.
- **Lehrkraft fügt denselben Typ fünfmal hintereinander ein:** „Zuletzt verwendet" zeigt ihn einmal, an erster Stelle.
- **Beispielinhalt bewusst übernommen** (z. B. Selbsteinschätzung passt so): Der Hinweis bleibt bis zur ersten Änderung. Veröffentlichen geht trotzdem.

## Abgrenzung (nicht in PROJ-90)
- Typ eines vorhandenen Blocks wechseln → PROJ-95
- Tabelle und Diagramm als neue Blocktypen → PROJ-91 (erscheinen dann zusätzlich im Katalog)
- Bilder hochladen → PROJ-92
- Blöcke per KI ausfüllen → PROJ-93
- Neue Aufgabentypen im Kern erfinden. Der Katalog zeigt, was der Kern kann.
- Ganze Themen aus einer Vorlage einfügen
- Eigene Beispiel-Vorlagen der Lehrkraft speichern
- „Zuletzt verwendet" über Geräte hinweg (nur pro Gerät, E7)

## Risiken
- **Viele neue Formulare (18):** Jedes muss die Feldvarianten des Kerns kennen (deutsche und englische Feldnamen). Grundlage ist `seite.py`, nicht der Master-Prompt allein. Rundreise-Test je Typ mit echten KI-Antworten.
- **Beispielinhalte und Kern laufen auseinander**, wenn der Kern Felder ändert. Ein automatischer Test baut jedes Beispiel durch den Kern und prüft, dass keine Warnung entsteht.
- **Vorschaubilder:** 31 Bilder müssen erstellt und bei Änderungen am Aussehen der Seite nachgezogen werden.
- **Bildzuordnung per Klick setzen** ist auf dem Handy fummelig. Die Eingabefelder in Prozent sind der Rückfallweg.

## Technical Requirements
- **Sicherheit:** wie PROJ-89 (nur Besitzerin/Besitzer, Bereinigung im Kern, abgeschottete Vorschau). Die Bildauswahl zeigt nur Bilder des eigenen Materials.
- **Leistung:** Der Katalog öffnet sich ohne spürbare Wartezeit (unter 300 ms, auch beim ersten Öffnen). Die Suche filtert bei jedem Tastendruck ohne Verzögerung.
- **Barrierefreiheit:** Katalog und Bildauswahl per Tastatur bedienbar, Vorschaubilder mit Alternativtext, Fokus kehrt nach dem Schließen an die Einfügestelle zurück.
- **Design:** Lehrkräfte-Bereich nach `docs/DESIGN.md` (ws-Tokens, 44-px-Ziele, `AdminRowActions`, Zustände aus `admin-states.tsx`).

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)
_To be added by /architecture_

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
