# PROJ-105: Baukasten – Bild neben Text & Bild-Galerie

## Status: Deployed
**Created:** 2026-11-16
**Last Updated:** 2026-11-17

## Idee in einem Satz
Ein Bild kann links oder rechts neben einem Lehrtext stehen, und mehrere Bilder lassen sich als Galerie nebeneinander anordnen, zum Beispiel „Foto 1–4“ in einer Reihe. Auf dem Handy der Schüler stapelt sich alles sauber untereinander.

Teil der Reihe „Baukasten direkt“, Übersicht und Leitbild in PROJ-101.

## Kontext
- Im Material „Basics rund um den LKW“ (Screenshot 2026-11-16) stehen 14 Fotos einzeln untereinander in voller Breite. Für eine Zuordnungsaufgabe wäre ein Raster deutlich übersichtlicher.
- Heute kennt die Seite nur einen Block nach dem anderen in voller Breite (`image`-Block mit Breite Klein/Halb/Ganz).

## Entscheidungen (Nutzer, 2026-11-16)
- **E1:** Bild neben Text und Galerie gehören in den Umfang.

## Vorschläge (bitte beim Review bestätigen)
- **V1 – Bild neben Text als Eigenschaft des Bildes:** Statt eines neuen Block-Typs bekommt das Bild die Einstellung „Text daneben: aus / links / rechts“. Dann fließt der **nächste** Lehrtext-Block daneben. So bleiben beide Blöcke einzeln bearbeitbar.
- **V2 – Galerie als eigener Block:** Ein Galerie-Block enthält 2–12 Bilder mit je eigener Unterschrift und eigenem Alternativtext, Spaltenzahl 2, 3 oder 4.
- **V3 – Bilder zur Galerie zusammenfassen:** Mehrere ausgewählte Bild-Blöcke (PROJ-102) lassen sich mit „Als Galerie zusammenfassen“ in einem Schritt umwandeln. „Galerie auflösen“ macht wieder Einzelbilder daraus.

## Dependencies
- Requires: PROJ-104 (Bild-Leiste, Breite, Ausrichtung), PROJ-102 (Mehrfachauswahl für V3)
- Berührt: Kern (`seite.py`: Text-umfließt-Bild-Darstellung, neuer Galerie-Baustein in `BAUSTEINE`), PROJ-90 (Katalog bekommt „Galerie“), PROJ-107 (Hotspots gelten nur für Einzelbilder)

## User Stories
- Als **Lehrkraft** möchte ich ein kleines Bild rechts neben einen Erklärtext setzen, damit die Seite nicht so lang wird.
- Als **Lehrkraft** möchte ich 4 LKW-Fotos in einem Raster zeigen, damit Schüler sie vergleichen können.
- Als **Lehrkraft** möchte ich 14 einzeln eingefügte Bilder in einem Schritt zu einer Galerie zusammenfassen.
- Als **Lehrkraft** möchte ich in einer Galerie die Reihenfolge der Bilder durch Ziehen ändern.
- Als **Schüler am Handy** möchte ich alle Bilder groß genug sehen.

## Acceptance Criteria

### Bild neben Text
- [ ] In der Bild-Leiste gibt es „Text daneben“ mit drei Werten (`AdminSegmented`: Aus, Bild links, Bild rechts).
- [ ] Ist „Bild links/rechts“ gewählt und folgt ein Lehrtext-Block, steht der Text neben dem Bild. Das Bild nimmt seine eingestellte Breite ein (höchstens 50 %, beim Umstellen auf 33 % voreingestellt).
- [ ] Folgt kein Lehrtext, erscheint im Editor ein Platzhalter „Text hier schreiben“, und ein Klick legt einen Lehrtext daneben an.
- [ ] Ist der Text länger als das Bild, fließt er unter dem Bild weiter.
- [ ] Unter 600 px Bildschirmbreite (Schüler-Handy) steht das Bild über dem Text in voller Breite.
- [ ] Bild und Lehrtext bleiben getrennte Blöcke. Wer einen der beiden verschiebt, löst die Verbindung, und das Bild steht wieder allein.

### Galerie-Block
- [ ] Der Katalog und die häufigen Blöcke im Leerzustand enthalten „Galerie“.
- [ ] Eine neue Galerie öffnet die Bildauswahl mit Mehrfachauswahl (Computer, Skript, zuletzt verwendet).
- [ ] Die Galerie zeigt die Bilder in einem Raster mit wählbaren 2, 3 oder 4 Spalten (`AdminSegmented` in der Leiste). Alle Bilder einer Reihe sind gleich hoch zugeschnitten (Darstellung, das Bild selbst bleibt unverändert), wahlweise auch „Originalform“.
- [ ] Jedes Galerie-Bild hat Alternativtext (Pflicht) und eine optionale Unterschrift, die direkt unter dem Bild getippt wird. Optional gibt es eine automatische Nummerierung („Foto 1“, „Foto 2“ …).
- [ ] Ein Bild in der Galerie lässt sich anklicken und hat eine eigene kleine Leiste: Austauschen, Zuschneiden, Drehen, Alternativtext, Entfernen.
- [ ] Bilder lassen sich innerhalb der Galerie per Ziehen umsortieren. Ein Bild vom Computer oder ein Bild-Block lässt sich in die Galerie ziehen.
- [ ] „+ Bild“ am Ende der Galerie fügt weitere hinzu (höchstens 12).
- [ ] In der veröffentlichten Seite öffnet ein Klick auf ein Galerie-Bild es groß (Leuchtkasten mit Weiter/Zurück, Esc schließt, per Tastatur bedienbar).
- [ ] Unter 600 px Bildschirmbreite zeigt die Galerie höchstens 2 Spalten.

### Zusammenfassen und Auflösen
- [ ] Sind mindestens 2 Bild-Blöcke ausgewählt, bietet die Leiste „Als Galerie zusammenfassen“. Die Galerie entsteht an der Stelle des ersten gewählten Bilds, in der Reihenfolge der Seite. Alternativtexte und Unterschriften bleiben erhalten.
- [ ] „Galerie auflösen“ (im „⋯“-Menü) macht aus der Galerie wieder einzelne Bild-Blöcke.
- [ ] Beides ist je ein Schritt für Rückgängig.

## Edge Cases
- **Galerie mit nur einem Bild** (alle anderen entfernt): Hinweis „Eine Galerie braucht mindestens 2 Bilder“ mit dem Angebot „In Einzelbild umwandeln“.
- **Bilder sehr unterschiedlicher Form** (hochkant und quer): Im gleich hohen Modus wird mittig zugeschnitten. Wer das nicht will, schaltet auf „Originalform“.
- **Galerie und 8-MB-Grenze:** Gilt wie bei Einzelbildern. Vor dem Hinzufügen wird geprüft.
- **Druck:** Die Galerie druckt als Raster ohne Leuchtkasten. Bild neben Text druckt nebeneinander.
- **Ältere Materialien:** Ohne „Text daneben“ bleibt alles wie bisher.
- **Bild mit Text daneben wird zur Galerie hinzugefügt:** Die Verbindung zum Text wird gelöst, mit Hinweis.

## Nicht Teil dieses Features
- Freies Layout mit beliebigen Spalten für alle Block-Typen (bewusst nicht: zu fehleranfällig auf Schüler-Handys).

## Technical Requirements
- Barrierefreiheit: Galerie als Liste mit Bildern, Leuchtkasten mit Fokus-Einschluss, Esc und Pfeiltasten.
- Darstellung ohne seitliches Scrollen auf allen Breiten ab 320 px.

## Offene Punkte für `/architecture`
- Kern: Darstellung „Text daneben“ (Paar aus Bild und folgendem Lehrtext) und neuer Galerie-Baustein, inklusive Prüfstelle.
- Wie verhält sich der Leuchtkasten in der Sandbox der Editor-Vorschau (Modus Ausprobieren)?

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)
Siehe PROJ-104 (gemeinsame Architektur).
- **Text neben Bild:** Eigenschaft `text_neben` (links/rechts) am Bild. Der Kern verbindet das Bild mit dem **folgenden** Lehrtext zu `div.paar` (beide Abschnitte behalten ihre Marke `data-wk`, bleiben einzeln anklickbar). Das Bild schwebt (`float`) mit höchstens der halben Breite, der Text fließt darum und darunter weiter; unter 600 px steht das Bild darüber.
- **Galerie:** Eigener Block `gallery` (`images[]` mit `path`, `alt`, `caption`, `marks`; `columns` 2–4, `shape` gleich/original, `numbered`). Höchstens 12 Bilder. Raster, Leuchtkasten (Tastatur, Fokus-Einschluss, Esc) im Laufzeit-Skript der Seite; im Druck ohne Leuchtkasten.
- **Zusammenfassen/Auflösen:** reine Funktionen in `werkzeugkiste-bild-block.ts`, aufgerufen vom „⋯“-Menü.

## Umsetzung (2026-11-17)
- Gebaut: „Text daneben“ (Aus/Bild links/Bild rechts) im Bild-Formular, Kern-Darstellung mit Paar; Galerie-Block im Katalog (Gruppe Lesen, Skizze, Beispiel), Formular (Spalten, Bildform, Nummerierung, je Bild Alternativtext/Unterschrift/Zuschneiden/Beschriften, Reihenfolge per Pfeilen, Entfernen, +Bild bis 12), „Galerie mit nur einem Bild“ mit Angebot „In Einzelbild umwandeln“, „Als Galerie zusammenfassen“ (mind. 2 gewählte Bilder) und „Galerie auflösen“ im „⋯“-Menü; Prüfstelle meldet wenig Bilder, fehlenden Pfad und Alternativtext.
- **Abweichungen:** (1) Reihenfolge in der Galerie per Pfeil-Knöpfen statt Ziehen; Dateien/Bild-Blöcke lassen sich nicht in die Galerie ziehen. (2) Neue Galerie startet mit zwei leeren Plätzen statt Mehrfachauswahl-Bildfenster. (3) Platzhalter „Text hier schreiben“ bei fehlendem Text daneben entfällt: Ohne folgenden Lehrtext bleibt das Bild allein. (4) Ein Verschieben löst die Verbindung nicht aktiv; sie besteht nur, solange ein Lehrtext direkt folgt. (5) „Bild mit Text daneben zur Galerie“: `text_neben` wird beim Zusammenfassen nicht übernommen (still gelöst).
- **Offen:** Browser-Test (Leuchtkasten, Raster auf 320 px).

## QA Test Results
_To be added by /qa_

## Deployment
- 2026-11-17: Kern `16f779f`/`584f51f` per `vercel deploy --prod`, App `c6a0020` (Push auf main, Vercel Ready). Keine Migration. Mit ausgeliefert: fremder Commit `1a17eee` (PROJ-103: Schreiben in der Seite und Schublade gleichzeitig).
- Geprüft: tsc, Build, Kern-Tests (90), Vitest je Datei grün; im Gesamtlauf unter Last wechselnde Zeitüberschreitungen in Baukasten-Tests (einzeln grün). Kein formaler QA-Durchlauf mit Bug-Liste, kein Browser-Test.
- Offen: Browser-Test durch den Nutzer.
