# PROJ-94: Werkzeugkiste – Baukasten: Leere Seite von null aufbauen

## Status: Planned
**Created:** 2026-11-12
**Last Updated:** 2026-11-12

## Idee in einem Satz
Eine Lehrkraft startet den Baukasten-Editor ohne Skript und ohne KI mit einer leeren Interaktiven Seite und baut sie Block für Block selbst auf.

## Entscheidungen (Nutzer, 2026-11-12)
- **E1 – Eigenes Feature nach PROJ-90:** Erst mit dem Aufgabentyp-Katalog lassen sich neue Blöcke anlegen. Deshalb kommt dieses Feature danach. PROJ-89 bleibt unverändert.
- **E2 – Startinhalt „Grundgerüst":** Deckblatt (Titel wird beim Anlegen abgefragt), ein Thema „Thema 1" mit einem Textblock samt leerer Lernziele-Box und eine leere Lernzielkontrolle.
- **E3 – Einstieg an zwei Stellen:** eigene Karte **„Eigene Seite bauen"** auf der Startseite der Werkzeugkiste und Knopf **„Leere Seite anlegen"** in Meine Materialien.
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
- **Lehrkraft legt an und schließt sofort wieder:** Das Material bleibt als Entwurf in Meine Materialien (Markierung „Entwurf"). Ein noch nie veröffentlichter, unveränderter Entwurf wird **nicht** automatisch gelöscht. Offen für /architecture: ob solche leeren Entwürfe wie andere Entwürfe ablaufen (`laeuft_ab_am`).
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
_To be added by /architecture_

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
