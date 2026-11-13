# PROJ-94: Werkzeugkiste – Baukasten: Leere Seite von null aufbauen

## Status: Approved
**Created:** 2026-11-12
**Last Updated:** 2026-11-12

## Idee in einem Satz
Eine Lehrkraft startet den Baukasten-Editor ohne Skript und ohne KI mit einer leeren Interaktiven Seite und baut sie Block für Block selbst auf.

## Entscheidungen (Nutzer, 2026-11-12)
- **E1 – Eigenes Feature nach PROJ-90:** Erst mit dem Aufgabentyp-Katalog lassen sich neue Blöcke anlegen. Deshalb kommt dieses Feature danach. PROJ-89 bleibt unverändert.
- **E2 – Startinhalt „Grundgerüst":** Deckblatt (Titel wird beim Anlegen abgefragt), ein Thema „Thema 1" mit einem Textblock samt leerer Lernziele-Box und eine leere Lernzielkontrolle.
- **E3 – Einstieg an zwei Stellen:** eigene Karte **„Eigene Seite bauen"** auf der Startseite der Werkzeugkiste und Knopf **„Leere Seite anlegen"** in Meine Materialien.
- **E4 – Kein Ablauf:** Eine eigene Seite bleibt gespeichert, bis die Lehrkraft sie löscht, auch als nie veröffentlichter Entwurf. Die Ablauf-Frist für unfertige Abläufe (PROJ-51/52) gilt hier nicht.
- Alle Entscheidungen aus PROJ-89 gelten weiter (nur Interaktive Seite, Entwurf/Veröffentlichen, Prüfstelle ohne Sperre, automatisches Speichern).

## Dependencies
- Requires: PROJ-89 (Editor-Grundgerüst)
- Requires: PROJ-90 (Aufgabentyp-Katalog, „Block hinzufügen")
- Empfohlen: PROJ-91 (Tabelle/Diagramm), PROJ-92 (Bilder hochladen). Ohne Skript gibt es keine Skript-Bilder, eigene Bilder gehen erst mit PROJ-92.
- Berührt: PROJ-52 (Meine Materialien, Speichergrenze), PROJ-93 (Thema per KI ist ohne Skript der wichtigste Weg zu Inhalt)

## User Stories
- Als **Lehrkraft** möchte ich eine Interaktive Seite ohne Skript anlegen, damit ich auch Material für Themen bauen kann, zu denen ich kein Skript habe.
- Als **Lehrkraft** möchte ich mit einem sinnvollen Grundgerüst starten statt mit einer völlig leeren Fläche, damit ich gleich weiß, wo ich anfange.
- Als **Lehrkraft** möchte ich die leere Seite von der Werkzeugkiste und von Meine Materialien aus anlegen können, damit ich sie dort finde, wo ich gerade bin.
- Als **Lehrkraft** möchte ich eine selbst gebaute Seite genauso teilen, verlinken und herunterladen wie eine aus der KI, damit sie für meine Schüler keinen Unterschied macht.

## Acceptance Criteria

### Anlegen
- [ ] Auf der Startseite der Werkzeugkiste gibt es eine Karte **„Eigene Seite bauen"** mit einer Zeile Erklärung („Ohne Skript und ohne KI: Baue eine Interaktive Seite selbst aus Blöcken.").
- [ ] In Meine Materialien gibt es **„Leere Seite anlegen"** als `variant="outline"` im Seitenkopf (die grüne Hauptaktion bleibt, wie sie ist). Im Leerzustand steht es zusätzlich als Aktion.
- [ ] Beide öffnen einen kleinen Dialog mit dem Pflichtfeld **Titel** (1–120 Zeichen, wie Materialtitel in PROJ-52) und optional **Untertitel**. „Anlegen" ist erst mit Titel aktiv.
- [ ] Vor dem Anlegen wird die Speichergrenze geprüft (PROJ-52). Ist sie erreicht, erscheint der bekannte Hinweis und es wird nichts angelegt.
- [ ] „Anlegen" legt ein neues Material im Format Interaktive Seite an und öffnet es direkt im Editor (PROJ-89).
- [ ] Das neue Material hat **kein Ablaufdatum**. Es erscheint nie in Abräum- oder Ablauf-Hinweisen und bleibt, bis die Lehrkraft es löscht (E4).

### Grundgerüst (E2)
- [ ] Das neue Material enthält: Deckblatt mit dem eingegebenen Titel und Untertitel, Schule wie in der Werkzeugkiste vorbelegt („Berufsschule für Spedition und Touristik"), Dauer leer.
- [ ] Ein Thema „Thema 1" mit genau einem Textblock. Er beginnt mit einer Lernziele-Box im Skript-Design („Nach diesem Kapitel kannst du…" und eine leere Aufzählung), darunter der gestylte Kapitelbalken mit „Thema 1".
- [ ] Eine leere Lernzielkontrolle (Titel „Lernzielkontrolle", keine Fragen, keine Aussagen).
- [ ] Alles im Grundgerüst lässt sich wie jedes andere Material bearbeiten, verschieben und löschen.

### Veröffentlichen und danach
- [ ] Ein neues leeres Material ist zunächst **nur Entwurf**. Es gibt noch keine veröffentlichte Fassung. Herunterladen, öffentlicher Link und Teilen im Regal sind ausgegraut mit Hinweis „Erst veröffentlichen".
- [ ] Nach dem ersten Veröffentlichen verhält es sich wie jedes andere Material: Herunterladen, Link für alle (PROJ-67), Regal (PROJ-53), Umbenennen, Löschen.
- [ ] In Meine Materialien steht als Werkzeug **„Eigene Seite"** und als Format „Interaktive Seite". Der Filter nach Werkzeug kennt „Eigene Seite".
- [ ] „Gleiches Skript, anderes Werkzeug", „Kapitel neu anfragen" und die Schritte 1–4 des Ablaufs gibt es bei eigenen Seiten nicht (kein Skript, keine KI-Antwort). An ihrer Stelle steht nur „Bearbeiten".
- [ ] Die Prüfstelle läuft wie in PROJ-89. Befunde, die nur mit Skript Sinn ergeben (z. B. „Skript-Aufgabe fehlt"), erscheinen bei eigenen Seiten nicht.

## Edge Cases
- **Lehrkraft legt an und schließt sofort wieder:** Das Material bleibt als Entwurf in Meine Materialien (Markierung „Entwurf"). Es wird **nie automatisch gelöscht** und läuft nicht ab (E4), auch wenn es nie veröffentlicht oder geändert wurde.
- **„Entwurf verwerfen" bei einem nie veröffentlichten Material:** Es gibt keine veröffentlichte Fassung, auf die man zurückkann. Die Aktion heißt hier „Zurück auf das Grundgerüst" und fragt per `AlertDialog`.
- **Veröffentlichen mit leerem Grundgerüst** (nichts geändert): erlaubt. Die Bestätigung weist darauf hin, dass die Seite noch keine Aufgaben hat.
- **Gleicher Titel wie ein vorhandenes Material:** erlaubt (wie bisher bei Materialtiteln).
- **Regal-„Anpassen" einer eigenen Seite durch eine Kollegin:** funktioniert wie bei jedem Material. Die Kopie hat ebenfalls kein Skript.
- **Azubis** sehen weder Karte noch Knopf. Server-Aufrufe liefern 403.

## Abgrenzung
- Vorlagen zur Auswahl (z. B. „Selbstlerneinheit", „Übungsblatt", „Fallakte") – vom Nutzer nicht gewählt, kann später kommen
- Leere H5P-Datei
- Nachträglich ein Skript an eine eigene Seite hängen

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)

> Stand 2026-11-12. Grundlage: der gebaute Stand von PROJ-89 bis PROJ-95 (App-Code `App_Schule`). Der Kern (`Werkzeugkiste`) bleibt unverändert.

### Was die Prüfung des Bestands ergeben hat
1. **Fertige Materialien haben nie einen Ablauftermin.** Der tägliche Aufräum-Lauf löscht nur unfertige Abläufe (`status = laeuft`). Legt man die eigene Seite als „fertig" an, ist E4 („kein Ablauf") ohne Eingriff in den Lauf erfüllt.
2. **Der Editor liest den Entwurf zuerst.** Er braucht eine KI-Antwort nur, wenn es keinen Entwurf gibt. Eine eigene Seite hat von Anfang an einen Entwurf, die fehlende Antwort stört daher nur an drei Stellen (siehe unten).
3. **Das Veröffentlichen schreibt die Antwort zurück.** Beim ersten Veröffentlichen entsteht also die erste gespeicherte Fassung, danach verhält sich die Seite wie jedes andere Material.
4. **Download, Link und Regal lesen nur die veröffentlichte Datei.** Gibt es sie noch nicht, muss jeder dieser drei Wege freundlich ablehnen („Erst veröffentlichen") statt einen Fehler zu melden.
5. **Das Werkzeug ist nur ein Text** (1–40 Zeichen) in der Datenbank, keine feste Liste. Ein neues Werkzeug „Eigene Seite" braucht keine Datenbank-Änderung am Werkzeug-Feld.
6. **Die Speichergrenze, der Titel (1–120 Zeichen) und die Vorbelegung der Schule** gibt es schon (PROJ-52, „Als Seite kopieren" aus PROJ-89).

### Grundidee
Eine eigene Seite ist ein **ganz normales Material** der Werkzeugkiste mit dem Werkzeug „Eigene Seite", Format Interaktive Seite, das beim Anlegen **schon einen Entwurf (das Grundgerüst), aber noch keine veröffentlichte Fassung** hat. „Nie veröffentlicht" erkennt man daran, dass keine KI-Antwort und keine veröffentlichte Datei da sind. Dafür braucht es **kein neues Feld**.

### A) Komponenten-Struktur
```
Startseite der Werkzeugkiste (vorhanden)
+-- Karte „Eigene Seite bauen"                       ← neu (steht neben den Werkzeug-Karten, ist aber kein Werkzeug mit Ablauf)
|   +-- öffnet Dialog „Leere Seite anlegen"

Meine Materialien (vorhanden)
+-- Seitenkopf: „Leere Seite anlegen" (outline)      ← neu, grüne Hauptaktion bleibt
+-- Leerzustand: zusätzlich „Leere Seite anlegen"    ← neu
+-- Zeile: Werkzeug „Eigene Seite", Format „Interaktive Seite"
|   +-- Pill „Nicht veröffentlicht" (vorhanden aus PROJ-89), solange es keine Fassung gibt
|   +-- Aktion „Im Baukasten bearbeiten" (vorhanden)
|   +-- Herunterladen / Link / Regal: ausgegraut „Erst veröffentlichen"   ← geändert
+-- Filter „Werkzeug" kennt „Eigene Seite"           ← geändert

Dialog „Leere Seite anlegen" (neu, eine Komponente für beide Einstiege)
+-- Feld Titel (Pflicht, 1–120 Zeichen)
+-- Feld Untertitel (optional)
+-- „Anlegen" (erst mit Titel aktiv) · „Abbrechen"
+-- Hinweis bei erreichter Speichergrenze (vorhandener Text)

Baukasten-Editor (vorhanden)
+-- Menü „Entwurf verwerfen" heißt hier „Zurück auf das Grundgerüst" (nur solange nie veröffentlicht)   ← geändert
+-- Veröffentlichen-Dialog: Zusatzhinweis „Die Seite hat noch keine Aufgaben", wenn nichts geändert wurde ← geändert

Ablauf-Ansicht (Schritte 1–5) bei eigenen Seiten
+-- gibt es nicht; „Überarbeiten", „Gleiches Skript, anderes Werkzeug", „Kapitel neu anfragen" fehlen; an ihrer Stelle nur „Bearbeiten"   ← geändert
```

### B) Datenmodell (in Alltagssprache)
Es kommt **kein neues Feld und keine neue Tabelle** dazu. Eine eigene Seite ist eine Zeile in den vorhandenen Materialien mit:
- **Werkzeug:** „Eigene Seite" (neuer Eintrag in der Werkzeugliste, aber **ohne Ablauf** und nicht in der Werkzeug-Übersicht)
- **Format:** Interaktive Seite · **Status:** fertig (damit gibt es nie einen Ablauftermin, E4)
- **Titel:** der eingegebene Titel · **Besitzer:** die anlegende Lehrkraft
- **Entwurf:** das Grundgerüst (siehe unten), bereits gefüllt
- **Antwort, Skript, Einlesung, veröffentlichte Datei:** leer
- **Ergebnis:** nur Titel und Format, ohne „fertig am" und ohne Kennzahlen

**Grundgerüst (E2)**, vom Server aus Titel und Untertitel erzeugt:
- Deckblatt: Titel, Untertitel, Schule „Berufsschule für Spedition und Touristik", Dauer leer
- ein Thema „Thema 1" mit einem Textblock: Lernziele-Box („Nach diesem Kapitel kannst du…", leere Aufzählung), darunter der Kapitelbalken „Thema 1". Boxen werden **als Klasse** geschrieben, wie der Text-Editor sie heute einfügt (Befund aus PROJ-89 Paket 2).
- eine leere Lernzielkontrolle (Titel „Lernzielkontrolle", keine Fragen, keine Aussagen)

**Nach dem ersten Veröffentlichen** gilt alles wie bei jedem Material: Das Veröffentlichen baut die Seite, legt die Datei ab und schreibt die Fassung als Antwort zurück. Von da an ist „nie veröffentlicht" nicht mehr wahr und „Zurück auf das Grundgerüst" wird wieder zu „Entwurf verwerfen".

### C) Abläufe
**Anlegen:** Die Lehrkraft gibt Titel (und Untertitel) ein → die App prüft Rolle und Speichergrenze → legt das Material samt Grundgerüst an → die Oberfläche öffnet den Editor. Es gibt keinen Kern-Aufruf beim Anlegen. Die erste Vorschau baut der Editor wie immer, und damit prüft der Kern das Grundgerüst gleich mit.

**Bearbeiten, Vorschau, Prüfstelle, Rückgängig, automatisches Speichern:** unverändert aus PROJ-89.

**Veröffentlichen:** unverändert, mit einem Zusatz im Bestätigungsdialog, wenn die Seite noch keine Aufgaben hat (erlaubt, E-Fall aus der Spec). Link und Regal bleiben bis dahin ausgeschaltet.

**Zurück auf das Grundgerüst:** Der Entwurf wird durch ein frisches Grundgerüst mit dem aktuellen Titel ersetzt. Vorher fragt ein `AlertDialog`.

**Löschen, Konto löschen, Regal-„Anpassen" durch Kolleginnen:** wie bei jedem Material. Die Kopie im Regal hat eine Antwort (die Fassung), aber kein Skript.

### D) Wo der Bestand angepasst werden muss (die eigentliche Arbeit)
Die fehlende KI-Antwort und die fehlende veröffentlichte Datei dürfen nirgends zu einem Fehler führen:
1. **Editor laden:** Gibt es keinen Entwurf und keine Antwort, entsteht aus dem Titel ein frisches Grundgerüst (Sicherheitsnetz, falls ein Entwurf je verloren ginge).
2. **Download, öffentlicher Link, Regal-Freigabe, Vorschau in der Liste:** lehnen mit dem Satz „Erst veröffentlichen" ab, solange die veröffentlichte Fassung fehlt. Die Oberfläche zeigt die Knöpfe ausgegraut.
3. **Schritt-4-Aufrufe** (Antwort ersetzen, Neu bauen, Kapitel einsetzen, Teile, Prompt, Einlesen) lehnen bei dem Werkzeug „Eigene Seite" ab. Es gibt dort keinen Ablauf.
4. **Prüfstelle:** Befunde, die ein Skript voraussetzen („Skript-Aufgabe fehlt" und Ähnliche), werden bei eigenen Seiten ausgeblendet. Der Editor nimmt sie schon heute nicht ins Material auf, die Filterung geschieht an einer Stelle in der Anzeige.
5. **Werkzeug-Übersicht, Verbrauch, Hilfe-Angebot, Filter:** Das neue Werkzeug darf in der Übersicht nicht als Karte mit Ablauf erscheinen, im Filter und in der Liste schon. Alle Stellen, die das Werkzeug nachschlagen (Name, Symbol), müssen den neuen Eintrag kennen.
6. **Vorhandene Wächter-Tests** (Freigabelisten der Rollen, Werkzeug-Listen) laufen mit und müssen grün bleiben.

### E) Technische Entscheidungen (und warum)
| Entscheidung | Warum |
|---|---|
| **Eigene Seite = normales Material mit eigenem Werkzeug-Eintrag, nicht eigene Tabelle.** | Teilen, Link, Regal, Löschen, Konto löschen, Speichergrenze, Meine Materialien und alle Zugriffsregeln gelten sofort und ohne neuen Code. Genau das fordert die vierte User Story („genauso teilen und herunterladen"). |
| **Status „fertig" von Anfang an.** | Der Aufräum-Lauf fasst fertige Materialien nie an. So ist „kein Ablauf" (E4) kein Sonderfall, sondern Bestandsverhalten. |
| **„Nie veröffentlicht" wird abgeleitet, nicht gespeichert.** | Ein zusätzliches Feld könnte von der Wirklichkeit abweichen. Die fehlende Antwort und die fehlende Datei sind die Wahrheit. |
| **Grundgerüst baut der Server, nicht der Kern.** | Die Struktur ist schlichtes Datenmaterial, das die App ohnehin hält. Der Kern prüft es bei der ersten Vorschau. Kein Eingriff in das zweite Repo, kein Kern-Deploy. |
| **Der Dialog ist eine Komponente für beide Einstiege.** | Gleiche Regeln (Titelgrenze, Speichergrenze), kein doppelter Pflegeaufwand. |
| **Keine neuen Pakete.** | Alles, was gebraucht wird (Dialog, Formular, Editor), ist da. |

### F) Server-Aufrufe
| Aufruf | Änderung |
|---|---|
| Material anlegen (neu: `POST …/materialien`) | Rolle Lehrkraft/Admin, Titel/Untertitel prüfen, Speichergrenze, Material mit Grundgerüst anlegen, Id zurückgeben (201) |
| Entwurf verwerfen | bei nie veröffentlichter Seite: Grundgerüst statt „zurück auf die Fassung" |
| Download / Link / Regal / Liste | „Erst veröffentlichen" statt Fehler, solange keine Fassung da ist |
| Schritt-4-Aufrufe | lehnen bei „Eigene Seite" ab |

Azubis erhalten bei allen 403, fremdes Material 404, wie überall.

### G) Sicherheit und Datenschutz
- Der Titel wird wie andere Materialtitel geprüft (Länge, keine Steuerzeichen) und nur als Text ausgegeben.
- Untertitel gleich, höchstens 200 Zeichen.
- Kein neuer öffentlicher Zugang: Ohne veröffentlichte Datei kann auch ein bereits aktivierter Link nichts ausliefern.
- Keine Inhalte in Fehlerberichten.

### H) Pakete (neu zu installieren)
Keine.

### I) Vorgeschlagene Bau-Reihenfolge (ein Paket)
Backend zuerst, weil die Oberfläche darauf aufbaut:
1. **Backend:** Werkzeug-Eintrag „Eigene Seite", Grundgerüst, `POST` Anlegen, „Erst veröffentlichen"-Ablehnungen, Verwerfen auf Grundgerüst, Sperre der Schritt-4-Aufrufe. Prüfen, ob die Datenbank ein fertiges Material ohne Antwort und ohne Kennzahlen annimmt (falls nicht: kleine Migration).
2. **Frontend:** Dialog, Karte, Knopf, Leerzustand, ausgegraute Aktionen, Texte im Editor.

### J) Was QA besonders prüfen muss
- Ein neues Material erscheint **nie** in Abräum- oder Ablauf-Hinweisen und überlebt den Aufräum-Lauf (auch unveröffentlicht, auch unverändert).
- Vor dem ersten Veröffentlichen liefern Download, Link und Regal „Erst veröffentlichen", nie einen Serverfehler oder eine leere Datei.
- Veröffentlichen des **unveränderten** Grundgerüsts klappt (leere Aufzählung, leere Lernzielkontrolle dürfen den Bau nicht scheitern lassen).
- Nach dem Veröffentlichen: Download, Link für alle, Regal, Umbenennen, Löschen, Regal-„Anpassen" durch eine Kollegin.
- Bilder hochladen (PROJ-92) ohne Skript, Tabelle/Diagramm (PROJ-91), Blocktyp wechseln (PROJ-95), „Block hinzufügen" (PROJ-90) auf einer eigenen Seite.
- Alle Stellen, die Werkzeuge nachschlagen, stürzen beim neuen Eintrag nicht ab (Meine Materialien, Verbrauch, Regal, Hilfe-Angebot).
- Speichergrenze erreicht: Es wird nichts angelegt.
- Azubi: 403 auf allen neuen Aufrufen.

## Umsetzung

### Backend (2026-11-12)
**Keine Migration nötig.** Die Tabelle nimmt ein fertiges Material ohne Antwort, Ergebnis und Skript an (alle Spalten sind leerbar), und der Zähler für den Ablauftermin wird für „fertig“ ohnehin auf leer gesetzt.

- **Werkzeug „Eigene Seite“** (`eigen`, `werkzeugkiste.ts`): neues Feld `ohneAblauf` an `Werkzeug`. Es bleibt `aktiv: false` (damit kein Ablauf damit startet), fehlt in der Werkzeug-Übersicht und steht im Filter von Meine Materialien.
- **Grundgerüst** `grundgeruest(titel, untertitel)` in `werkzeugkiste-editor.ts`: Deckblatt mit Schule, „Thema 1“ mit Lernziele-Box (Klasse, kein Inline-Stil) und Kapitelbalken, leere Lernzielkontrolle. Dazu `nieVeroeffentlicht()` (abgeleitet: eigene Seite ohne Antwort und ohne Ergebnis) und `kernWerkzeug()`.
- **Anlegen:** `POST /api/admin/werkzeugkiste/materialien` (Titel 1–120, Untertitel bis 200, strenges Schema, Speichergrenze vorher, kein Kern-Aufruf). Legt das Material als `fertig` mit Entwurf an.
- **Editor:** `GET …/editor` öffnet auch ohne Antwort und meldet `nieVeroeffentlicht`. Ohne Entwurf und ohne Fassung entsteht ein frisches Grundgerüst. `DELETE …/editor` setzt bei nie veröffentlichten Seiten auf ein frisches Grundgerüst zurück (Titel und Untertitel bleiben).
- **„Erst veröffentlichen“** (409) bei Download, Link und Regal-Freigabe, solange es keine Fassung gibt. Die Datenbankfunktionen verlangen ohnehin ein Ergebnis, das ist ein zweiter Riegel.
- **Schritt 4 gesperrt** bei eigenen Seiten (409, Code `eigene_seite`) in allen Routen mit Skript-/KI-Bezug (bauen, einlesen, pruefen, kapitel, kapitel/einsetzen, prompt, direkt, kopie, teile, teile/…, weiterschreiben, PATCH außer Umbenennen). Umbenennen geht.
- **Liste:** `format` ist „seite“ auch ohne Ergebnis, `nochNichtVeroeffentlicht` neu, `hatDatei`/`hatVorschau` falsch bis zum ersten Veröffentlichen.
- Tests: 29 neue (`eigene-seite.test.ts`), zwei vorhandene Werkzeuglisten-Tests angepasst. Ganze Suite grün (3370), Typprüfung und Build grün.

### Abweichungen und Funde
- **Der Kern kennt „eigen“ nicht** (`kern_editor._werkzeug` lässt nur die fünf Kapitel-Werkzeuge zu). Die App schickt deshalb `arbeitsblatt`. Als Seite gelten für jedes Werkzeug dieselben Regeln (`qualitaet.pruefen`, `vorschau.bauen`); die Regeln nur für Ganzes Skript und Kreativ (Kapitelaufbau, Abschlussquiz, Bildmarker) greifen bei `arbeitsblatt` nicht. Skript-Befunde entfallen dadurch von selbst, weil kein Skript-Text mitgeht. **Kein Kern-Deploy nötig.**
- **„Nie veröffentlicht“ = Ergebnis leer.** Das Ergebnis bleibt bewusst leer, bis zum ersten Veröffentlichen. So lehnen auch die Datenbankfunktionen für Link und Regal sauber ab.
- **Offen für Frontend:** Dialog „Leere Seite anlegen“, Karte auf der Startseite, Knopf und Leerzustand in Meine Materialien, ausgegraute Aktionen („Erst veröffentlichen“), Menüpunkt „Zurück auf das Grundgerüst“ mit `AlertDialog`, Hinweis „noch keine Aufgaben“ im Veröffentlichen-Dialog, Umleitung der Ablauf-Seite einer eigenen Seite in den Editor.
- **Offen für QA:** Das unveränderte Grundgerüst muss sich gegen den echten Kern bauen und veröffentlichen lassen (leere Aufzählung, leere Lernzielkontrolle). Die Tests mocken den Kern.

### Frontend (2026-11-13)
- **Dialog** `leere-seite-dialog.tsx`: Titel (Pflicht, 1–120), Untertitel (optional, bis 200), „Anlegen“ erst mit Titel aktiv, Serverfehler (z. B. volle Ablage) im Dialog; bei Erfolg Seitenwechsel in den Editor. Eine Komponente für beide Einstiege.
- **Karte „Eigene Seite bauen“** in einem eigenen Abschnitt „Selbst bauen“ der Werkzeug-Übersicht (Knopf, kein Link, da kein Ablauf).
- **Meine Materialien:** „Leere Seite anlegen“ als `outline` im Seitenkopf (nur im Reiter Materialien, grüne Hauptaktion bleibt) und im Leerzustand. Zeile einer nie veröffentlichten Seite: „Bearbeiten“ statt „Öffnen“; „Teilen …“ und „Link für alle …“ ausgegraut mit „Erst veröffentlichen“; „Überarbeiten“, „Gleiches Skript, anderes Werkzeug“ entfallen bei eigenen Seiten.
- **Editor:** Menüpunkt und `AlertDialog` heißen bei nie veröffentlichter Seite „Zurück auf das Grundgerüst“; Veröffentlichen-Dialog warnt „noch keine Aufgaben“ (neue Funktion `hatAufgaben`).
- **Ablauf-Seite:** Eine eigene Seite wird sofort in den Editor umgeleitet.
- Tests: `leere-seite.test.tsx` (neu, 8) und ein Test in `meine-materialien.test.tsx`. Ganze Suite grün (3399), Typprüfung grün.
- **Nicht im Browser geprüft** (kein Dev-Server auf diesem Rechner). Offen für QA: Anlegen → Editor → Veröffentlichen gegen den echten Kern.

## QA Test Results

**Getestet:** 2026-11-13 · **Methode:** Code-Review der gesamten Änderung (33 Dateien), Vitest-Suite, Typprüfung, ESLint, Gegenprobe gegen den **echten Python-Kern** (lokal, Scratchpad-venv). **Nicht im Browser getestet** (kein Dev-Server auf diesem Rechner, siehe Memory „Kein Dev-Server“). Deshalb keine Cross-Browser- und keine Responsive-Prüfung (375/768/1440 px) und kein neuer Playwright-Test (nicht lauffähig prüfbar).

### Automatische Prüfungen
- `npm test`: **271 Dateien, 3399 Tests grün** (darunter 29 in `eigene-seite.test.ts`, 8 in `leere-seite.test.tsx`)
- `tsc --noEmit`: grün · `eslint` über Werkzeugkiste: 0 Fehler, 5 Warnungen (React-Compiler-Hinweise, u. a. `editor-gliederung.tsx:603`, nicht aus PROJ-94)
- **Kern-Gegenprobe (offener Punkt aus dem Backend-Abschnitt):** Das unveränderte Grundgerüst (leere Aufzählung, leerer Absatz, Lernzielkontrolle nur mit Titel) besteht `kern_editor.pruefen` und `kern_editor.bauen` mit Werkzeug `arbeitsblatt`: Seite 72 KB, 1 Kapitel, 0 Aufgaben. Einziger Befund: „Lernzielkontrolle ohne Quiz“ (mittel), kein Skript-Befund. **Veröffentlichen des leeren Grundgerüsts scheitert also nicht.**

### Akzeptanzkriterien (nach Code-Review; Oberfläche nicht im Browser gesehen)
| Bereich | Kriterium | Ergebnis |
|---|---|---|
| Anlegen | Karte „Eigene Seite bauen“ mit Erklärzeile | ✅ (`werkzeug-uebersicht.tsx`, eigener Abschnitt „Selbst bauen“) |
| Anlegen | „Leere Seite anlegen“ outline im Kopf + im Leerzustand | ✅ (Kopf nur im Reiter Materialien) |
| Anlegen | Dialog: Titel Pflicht 1–120, Untertitel optional, „Anlegen“ erst mit Titel | ✅ (Client und Server-Schema) |
| Anlegen | Speichergrenze vor dem Anlegen | ✅ (`speicherPruefen`, Test vorhanden) |
| Anlegen | Legt Material an und öffnet den Editor | ✅ |
| Anlegen | Kein Ablaufdatum, nie in Abräum-Hinweisen | ✅ (Status `fertig`, Trigger setzt `laeuft_ab_am = NULL`, Cron löscht nur `status = laeuft`) |
| Grundgerüst | Deckblatt, Schule vorbelegt, Dauer leer | ✅ |
| Grundgerüst | „Thema 1“ mit Lernziele-Box (Klasse) + Kapitelbalken | ✅ |
| Grundgerüst | Leere Lernzielkontrolle | ✅ |
| Grundgerüst | Bearbeiten/Verschieben/Löschen wie sonst | ✅ (normale Struktur) |
| Veröffentlichen | Neu = nur Entwurf; Download/Link/Regal „Erst veröffentlichen“ | ✅ (409 in Download, Link, Freigabe; Oberfläche zeigt Einträge ausgegraut) |
| Veröffentlichen | Danach wie jedes Material (Download, Link, Regal, Umbenennen, Löschen) | ✅ im Code (Antwort + Ergebnis werden geschrieben) |
| Veröffentlichen | Werkzeug „Eigene Seite“ + Filter | ✅ |
| Veröffentlichen | Kein „Anderes Werkzeug“, „Kapitel neu anfragen“, Schritte 1–4; nur „Bearbeiten“ | ✅ (Menü, 409 `eigene_seite` in allen Skript-/KI-Routen, Umleitung der Ablauf-Seite) |
| Veröffentlichen | Prüfstelle ohne Skript-Befunde | ✅ (Kern-Gegenprobe) |
| Edge | Anlegen und sofort schließen → bleibt als Entwurf, läuft nie ab | ✅ |
| Edge | „Zurück auf das Grundgerüst“ mit `AlertDialog` | ✅ |
| Edge | Veröffentlichen ohne Aufgaben erlaubt, mit Hinweis | ✅ (`hatAufgaben`) |
| Edge | Gleicher Titel erlaubt | ✅ |
| Edge | Regal-„Anpassen“ einer eigenen Seite durch Kollegin | ❌ **BUG-1** (nur ohne Bilder) |
| Edge | Azubis: 403 | ✅ (`requireTeacherOrAdmin`, Tests) |

**Ergebnis: 20 von 21 Kriterien bestanden, 1 nicht bestanden.**

### Bugs

**BUG-1 (Mittel) – BEHOBEN 2026-11-13: Regal-„Anpassen“ schlägt bei einer eigenen Seite ohne Bilder fehl**
- Ursache: `erzeugeAuszug` (`werkzeugkiste-server.ts:432`) bricht mit `false` ab, wenn es keine Einlesung gibt *und* der Auszug nur den Platzhalter `text.txt` enthält. Eine eigene Seite ohne hochgeladene Bilder hat genau das. Danach bleibt `auszug_am` leer, und `regal/[id]/anpassen` lehnt mit „Dieses Material lässt sich leider nicht anpassen“ ab (`!quelle.auszug_am`).
- Schritte: Eigene Seite anlegen, ohne Bild veröffentlichen, im Regal teilen, als Kollegin „Anpassen“ wählen → 409.
- Erwartet laut Spec: Anpassen funktioniert wie bei jedem Material. Download und Ansehen gehen weiter.
- Lösungsrichtung: In `erzeugeAuszug` den Abbruch für Materialien ohne Einlesung entfernen (leerer Auszug mit Platzhalter ist gültig), oder in der Anpassen-Route bei `werkzeug = eigen` ohne Auszug eine leere Einlesung erzeugen. Dazu ein Test.

**BUG-2 (Niedrig) – BEHOBEN 2026-11-13: „Skript entfernt“ erscheint nach 12 Monaten bei eigenen Seiten**
- Ursache: Beim Anlegen setzt der Trigger `skript_hochgeladen_am := now()`. `entferneAlteSkripte` (Cron) fasst jedes fertige Material an und setzt nach 12 Monaten `skript_entfernt_am`; `meine-materialien.tsx:470` zeigt dann „Skript entfernt“, obwohl nie ein Skript da war. Außerdem wird „Gleiches Skript, anderes Werkzeug“ nirgends angeboten, also nur Anzeigefehler.
- Lösungsrichtung: Beim Anlegen `skript_entfernt_am` setzen (wie `regal/anpassen` es für Kopien tut) oder die Zeile bei `werkzeug = eigen` nicht anzeigen.

**Hinweis (kein Bug):** Beim Umbenennen einer nie veröffentlichten Seite bleibt der Titel im Deckblatt-Entwurf unverändert; die Liste zeigt den neuen Namen, die gebaute Seite den Deckblatt-Titel. Verhalten wie bei allen Materialien (PROJ-52/89).

**Behebung (2026-11-13):** BUG-1: `erzeugeAuszug` bekam den Parameter `leerErlaubt`; Veröffentlichen und Freigabe übergeben `istEigeneSeite(...)`, so entsteht auch ohne Einlesung und Bilder ein Auszug mit Platzhalter. BUG-2: `entferneAlteSkripte` überspringt `werkzeug = eigen` (`.neq`), keine Datenbank-Änderung nötig (der Trigger setzt `skript_entfernt_am` beim Anlegen ohnehin auf leer). Je ein Test ergänzt. Tests und Typprüfung grün. **Erneute QA (`/qa`) steht aus.**

### Sicherheitsprüfung (Red Team, Code-Ebene)
- ✅ **Zugriff:** Alle neuen/geänderten Routen laufen über `requireTeacherOrAdmin`; Besitz und Rolle erzwingt RLS (Anlegen mit Nutzer-Client, nicht Service-Schlüssel). Fremdes Material → 404.
- ✅ **Eingabe:** strenges Zod-Schema (`.strict()`), Steuerzeichen abgelehnt, Länge begrenzt (120/200). Titel wird nur als Text ausgegeben (React-Escaping). Das Grundgerüst enthält nur feste HTML-Teile plus Titel in `cover.title` (kein HTML-Pfad).
- ✅ **Kein neuer öffentlicher Zugang:** Link und Freigabe lehnen ohne Fassung mit 409 ab; die Datenbankfunktionen verlangen zusätzlich ein Ergebnis (zweiter Riegel).
- ✅ **Neuanlage per Ablauf-Route nicht möglich:** `eigen` ist `aktiv: false`, die Zod-Prüfung `freigeschaltet` lehnt es ab. Schritt-4-Routen geben 409.
- ✅ **Keine Geheimnisse/Inhalte in Fehlermeldungen** gefunden.
- Nicht prüfbar ohne laufende App: Rate-Limiting, Browser-Konsole/Netzwerk. Es gibt keinen neuen Massen-Endpunkt; Anlegen ist durch die Speichergrenze (PROJ-52) begrenzt.

### Regression
Ganze Suite grün (3399), darunter die Wächter-Tests der Rollen-Freigabelisten und Werkzeuglisten. Angrenzende Features (PROJ-52, 53, 67, 89–96) per Code-Review auf Absturz bei fehlender Antwort/Ergebnis geprüft: Liste, Download, Link, Regal, Editor-Laden behandeln `null` sauber.

### Noch offen (nur im Browser prüfbar)
Anlegen → Editor → Vorschau → Veröffentlichen → Download/Link/Regal als Gesamtablauf mit echtem Kern und Datenbank; Dialog und Karte auf 375/768/1440 px; Safari/Firefox; Fokus-Reihenfolge und Tastatur im Dialog.

### Erneute QA nach den Fixes (2026-11-13)
- **BUG-1 behoben, bestätigt:** `erzeugeAuszug(..., leerErlaubt)` (`werkzeugkiste-server.ts:415/434`); Veröffentlichen (`veroeffentlichen/route.ts:190`) und Freigabe (`freigabe/route.ts:70`) übergeben `istEigeneSeite(...)`. Test in `werkzeugkiste-auszug.test.ts:84` (Auszug nur mit Platzhalter bei eigener Seite). Normale Materialien ohne Einlesung lehnen weiter ab (Gegentest vorhanden).
- **BUG-2 behoben, bestätigt:** `entferneAlteSkripte` überspringt `werkzeug = eigen` (`werkzeugkiste-materialien-server.ts:244`), Test in `werkzeugkiste-materialien-server.test.ts:106`.
- `npm test`: **271 Dateien, 3400 Tests grün** · `tsc --noEmit`: grün · ESLint auf den geänderten Dateien: 0 Fehler, 0 Warnungen.
- Keine neuen Bugs gefunden. **Alle 21 Akzeptanzkriterien bestanden** (Code-Ebene).
- Weiterhin offen, nur im Browser prüfbar: Gesamtablauf mit echtem Kern und Datenbank, 375/768/1440 px, Safari/Firefox, Tastatur im Dialog. Kein Playwright-Test geschrieben (kein Dev-Server auf diesem Rechner).

### Entscheidung
**Produktionsreif: JA.** Kein offener Fehler, weder kritisch, hoch, mittel noch niedrig. Status: **Approved**. Empfehlung: Beim Deploy den Gesamtablauf (Anlegen → Veröffentlichen → Link → Regal → Anpassen) einmal von Hand in der Produktion durchspielen.

## Deployment
_To be added by /deploy_
