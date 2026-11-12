# PROJ-90: Werkzeugkiste – Baukasten: Aufgabentyp-Katalog

## Status: Architected
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
- [ ] **Bilder ordnen** (`image_sequencing`) ist immer wählbar. Jeder Schritt kann im Formular ein Bild aus derselben Auswahl bekommen. Ohne Bilder läuft die Aufgabe als reine Textreihenfolge, und der Kern meldet das als Hinweis.

### Kapiteltest (E6)
- [ ] Im Formular „Kapiteltest" (im Thema und in der Lernzielkontrolle) öffnet „Frage hinzufügen" denselben Katalog, **gefiltert** auf die im Kapiteltest erlaubten Typen: Auswahlfrage, Richtig oder falsch, Lückentext.
- [ ] Der gefilterte Katalog nennt oben den Grund: „Im Kapiteltest sind nur diese Fragetypen möglich."
- [ ] Gruppen, Suche und „Gut für" funktionieren dort genauso. „Zuletzt verwendet" zeigt nur erlaubte Typen.
- [ ] Die neue Frage wird am Ende des Kapiteltests eingefügt und startet mit Beispielinhalt.

### Beispielinhalt (E2)
- [ ] Jeder Typ hat einen festen **Beispielinhalt**, den der Kern ohne Warnung baut (Ausnahme: Bilder ordnen ohne Bilder, Video ohne echte Adresse) und in der Vorschau voll funktioniert (z. B. Auswahlfrage mit Frage, drei Antworten, einer richtigen und Feedback; Kreuzworträtsel mit vier Wörtern; Memory mit vier Paaren).
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
  - **Offene Frage** (`freitext`): Frage, Musterlösung, Mindestzahl Zeichen, Höhe des Antwortfelds (Zeilen)
  - **Trainer** (`trainer`): Arbeitsauftrag, Anzahl Runden (1–5), Gruppen mit Titel, optionalem Hinweis, Einträgen der Reihe und optionalen Störern
  - **Bildzuordnung** (`bildzuordnung`): Bild, Arbeitsauftrag, Alternativtext, Punkte mit Beschriftung. Punkte werden **per Klick auf das Bild** gesetzt und per Ziehen verschoben. Für Tastatur gibt es Eingabefelder für die Position in Prozent.
  - **Wörtersuche** (`find_words`): Arbeitsauftrag, Wörter
  - **Memory** (`memory_game`): Arbeitsauftrag, Paare (Karte A, Karte B)
  - **Lernkarten zum Tippen** (`flashcards`): Arbeitsauftrag, Karten mit Frage und akzeptierten Antworten
  - **Bilder ordnen** (`image_sequencing`): Arbeitsauftrag, Schritte in der richtigen Reihenfolge, je Schritt Text und optional ein Bild aus der Bildauswahl
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

> Stand 2026-11-12. Grundlage: Editor aus PROJ-89 (`src/components/werkzeugkiste/editor/*`, `src/lib/werkzeugkiste-editor*.ts`) und Kern (`seite.py`, `prompts.py`, `kern_editor.py`, Zweig `vercel-kern`).

### Was die Prüfung des Bestands ergeben hat
1. **Der Editor kann schon fast alles, was der Katalog braucht.** Änderungen laufen über eine Funktion („ändere die Struktur"), sind damit automatisch ein Rückgängig-Schritt und werden automatisch gespeichert. Ein neuer Block ist nur eine weitere solche Änderung.
2. **Die 13 Formulare aus PROJ-89** nutzen gemeinsame Bausteine (Feld, sortierbare Liste). Die 18 neuen Formulare bauen darauf auf.
3. **Bilder liegen nicht einzeln im Speicher**, sondern gepackt in der Einlesung (bzw. im Bilder-Auszug) des Materials, unter Namen wie `images/seite3_x42.png`. Nur der Kern öffnet dieses Paket. Für die Bildauswahl braucht es deshalb einen kleinen neuen Kern-Weg.
4. **Die genauen Felder je Typ** stehen in `seite.py`. Viele Typen akzeptieren zwei Namen (`schritte`/`steps`, `frage`/`question`, `punkte`/`points`). Der Master-Prompt nennt jeweils den bevorzugten Namen.
5. **Die Prüfstelle läuft im Kern.** Den Hinweis „Beispielinhalt noch nicht ersetzt" kann der Kern nicht erkennen, weil er die Beispiele nicht kennt. Er entsteht deshalb im Editor.

### A) Komponenten-Struktur
```
Editor (vorhanden, PROJ-89)
+-- Gliederung
|   +-- Thema
|   |   +-- Einfügestelle „+" zwischen je zwei Blöcken          ← neu
|   |   +-- Block-Zeile
|   |   |   +-- ⋯-Menü: „Block darüber/darunter einfügen …"     ← neu
|   |   |   +-- geöffneter Block → Formular (jetzt für alle Typen)
|   |   +-- „Block hinzufügen" am Ende des Themas                ← neu
|   +-- Lernzielkontrolle → Kapiteltest → „Frage hinzufügen"     ← öffnet jetzt den gefilterten Katalog
|   +-- Hinweise der Prüfstelle (inkl. „Beispielinhalt noch nicht ersetzt")   ← ergänzt
+-- Veröffentlichen-Dialog: „N Blöcke enthalten noch Beispielinhalt"         ← ergänzt

Katalog-Fenster (neu; ab 1024 px als Fenster, darunter Vollbild)
+-- Kopf: Titel „Block hinzufügen", ✕
+-- Hinweiszeile (nur gefiltert): „Im Kapiteltest sind nur diese Fragetypen möglich."
+-- Suchfeld (Fokus beim Öffnen)
+-- „Zuletzt verwendet" (bis 4 Karten, entfällt bei Suche/ohne Verlauf)
+-- Gruppe × 7 (Überschrift)
|   +-- Typ-Karte: Vorschaubild · Name · Beschreibung · „Gut für: …" · Pill „wird ausgewertet"
|       (ausgegraut mit Grund, wenn Bild-Typ ohne Bilder)
+-- Leerzustand: „Kein Aufgabentyp passt zu „…"." + „Suche löschen"

Bildauswahl-Fenster (neu): Raster der Bilder des Materials, Laden/Leer/Fehler-Zustand

Neue Formulare (18, gleicher Aufbau wie PROJ-89, Umschalter „Formular | Rohfassung")
+-- Bild · Zuordnen · Kreuzworträtsel · Reihenfolge · Rechenbeispiel · Kopfrechnen
+-- Video mit Fragen · Offene Frage · Trainer · Wörtersuche · Memory · Lernkarten zum Tippen
+-- Bilder ordnen · Rechenweg · Fallakte · Schätzrunde · Selbsteinschätzung
+-- Bildzuordnung mit Punkte-Setzer (Bild groß, Klick setzt Punkt, Ziehen verschiebt, Prozentfelder)
```

### B) Daten (in Alltagssprache)
**Keine Änderung an der Datenbank.** Ein neuer Block ist ein gewöhnlicher Block im Entwurf (PROJ-89) und wird mit ihm gespeichert und veröffentlicht.

**Der Katalog ist feste Programm-Information** (eine Liste in der App, kein Inhalt aus der Datenbank). Je Eintrag:
- Typ (technischer Name), Name (aus der vorhandenen Namensliste), Gruppe
- Beschreibung (ein Satz), „Gut für" (ein Satz), Suchbegriffe
- wird ausgewertet ja/nein, braucht Bild ja/nein, im Kapiteltest erlaubt ja/nein
- Beispielinhalt (fester Block in der Form des Master-Prompts)
- Vorschaubild (siehe Entscheidungen)

**„Zuletzt verwendet"** liegt im Speicher des Browsers (pro Gerät, E7): höchstens 4 Typnamen, keine Inhalte. Fehlt der Speicher, entfällt der Abschnitt.

**„Beispielinhalt unverändert"** wird nicht gespeichert, sondern bei jeder Anzeige berechnet: Ein Block, der inhaltlich genau dem Beispiel seines Typs entspricht, trägt den Hinweis. So verschwindet er mit der ersten Änderung von selbst und überlebt Neuladen, Duplizieren und Rückgängig ohne Sonderregeln.

**Bilder für die Auswahl** kommen auf Anfrage vom Kern: eine Liste mit Name und kleinem Vorschaubild (höchstens 240 px breit). Für Bild-Block und Bildzuordnung lädt das Formular das gewählte Bild in größerer Fassung (höchstens 1200 px). Nichts davon wird gespeichert, im Block steht wie bisher nur der Bildname.

### C) Abläufe
**Einfügen:** Klick auf „+", „Block hinzufügen" oder den Menüeintrag merkt sich die Stelle (Thema, Position) und öffnet den Katalog. Die Wahl eines Typs legt eine Kopie seines Beispielinhalts an genau diese Stelle, öffnet den Block und vermerkt den Typ in „Zuletzt verwendet". Bei Bild und Bildzuordnung kommt vorher die Bildauswahl. Ihr Bild wird in den Beispielinhalt eingesetzt.

**Kapiteltest:** „Frage hinzufügen" öffnet denselben Katalog mit Filter (nur Auswahlfrage, Richtig oder falsch, Lückentext). Die Frage wird am Ende angehängt.

**Bildauswahl:** Der Editor fragt beim ersten Öffnen die Bilderliste bei der App ab. Die App prüft wie bei allen Editor-Wegen Rolle und Besitz, sucht die Bildquelle (Einlesung oder Bilder-Auszug, wie beim Bauen) und lässt den Kern die Vorschaubilder erzeugen. Die Liste bleibt, solange der Editor offen ist. Ob ein Material überhaupt Bilder hat (für das Ausgrauen), weiß der Editor aus derselben Liste.

**Hinweise:** Die Befunde des Kerns und die Beispiel-Hinweise des Editors werden zu einer Liste zusammengeführt. Gliederung, Hinweis-Liste und Veröffentlichen-Dialog zeigen beide gleich.

### D) Neue Schnittstellen
| Weg | Wer | Was |
|---|---|---|
| App: Bilder eines Materials | Editor → App | Liste der Bilder (Name, Größe, Vorschaubild). Nur Besitzerin/Besitzer, sonst 403/404. |
| App: ein Bild groß | Editor → App | Ein Bild in Arbeitsgröße. Der Name muss in der Bilderliste des Materials stehen. |
| Kern: Bilder auflisten | App → Kern | Öffnet die Einlesung, verkleinert die Bilder, gibt die Liste zurück (höchstens 150 Bilder). |
| Kern: Bild holen | App → Kern | Ein Bild aus der Einlesung, auf höchstens 1200 px verkleinert. Nur Namen aus dem Paket, nie Pfade auf dem Server. |

Die neuen App-Wege liegen unter dem vorhandenen Editor-Pfad und sind damit für Lehrkräfte schon freigegeben (Proxy-Liste prüfen, Wächter-Test vorhanden). Das Verkleinern übernimmt PyMuPDF, das der Kern schon hat. Es kommt also keine neue Bibliothek hinzu.

### E) Technische Entscheidungen (und warum)
| Entscheidung | Warum |
|---|---|
| **Vorschaubilder als kleine gezeichnete Skizzen im App-Code (SVG), keine Bildschirmfotos.** | Sie passen sich Hell/Dunkel automatisch an (ws-Farben), laden ohne Wartezeit, wiegen fast nichts und müssen bei Änderungen am Seiten-Design nicht neu fotografiert werden. Bildschirmfotos bräuchten einen Browser im Bauprozess, den wir auf diesem Rechner nicht laufen lassen. |
| **Katalog und Beispielinhalte als eine feste Liste in der App.** | Ein Ort für alles, was die Oberfläche zeigt. Kein Datenbank- oder Kern-Aufruf beim Öffnen, damit öffnet er sich sofort (unter 300 ms). |
| **Beispiel-Hinweis im Editor statt in der Prüfstelle des Kerns.** | Der Kern kennt die Beispiele nicht und soll sie nicht kennen müssen. Weil der Hinweis berechnet und nicht gespeichert wird, braucht es keine Markierung im YAML, und veröffentlichte Seiten bleiben sauber. |
| **Gleicher Katalog für Blöcke und Kapiteltest, nur gefiltert.** | Eine Komponente, ein Bedienmuster. Die Liste der erlaubten Typen gibt es schon (`KAPITELTEST_TYPEN`). |
| **Formulare behalten unbekannte Felder und den vorhandenen Feldnamen.** | Wie in PROJ-89: Das Formular ändert nur, was es zeigt. Bei Doppelnamen (`steps`/`schritte`) schreibt es in den Namen, den der Block schon hat. So bleibt eine KI-Antwort beim Bearbeiten unverändert, wo niemand etwas angefasst hat. |
| **Bilder über die App holen, nicht direkt aus dem Speicher.** | Die Einlesung ist ein gepacktes Paket, das nur der Kern lesen kann. Der Kern hat keine Speicher-Schlüssel und bekommt wie bisher eine kurzlebige Leseadresse von der App. |
| **Wächter-Tests gegen Auseinanderlaufen.** | (1) Ein App-Test vergleicht den Katalog mit der Typliste des Kerns (`BAUSTEINE` in `seite.py`), wenn der Kern-Ordner danebenliegt. (2) Ein Kern-Test baut jeden Beispielinhalt aus der Liste der App und erwartet keine Warnung (außer den beiden erlaubten). |
| **Rohfassung bleibt in jedem Formular.** | Expertenweg und Rettungsleine für Sonderfälle, die ein Formular nicht abdeckt. |

### F) Abhängigkeiten (Pakete)
Keine neuen. Genutzt werden die vorhandenen: shadcn/ui (Dialog, Input, Badge …), dnd-kit (Sortieren in Listen, schon im Editor), lucide-react, im Kern PyMuPDF.

### G) Reihenfolge beim Bau
1. **Katalog-Grundlage:** Liste der 31 Einträge mit Texten, Suchbegriffen und Beispielinhalten, Such- und Einfüge-Funktionen, Tests.
2. **Kern:** Bilder auflisten und Bild holen, Test für alle Beispielinhalte. Deploy des Kerns vor der App.
3. **Oberfläche:** Katalog-Fenster mit Skizzen, Einfügestellen, Kapiteltest-Anbindung, Beispiel-Hinweise.
4. **18 Formulare** samt Bildauswahl und Punkte-Setzer.

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
