# PROJ-104: Baukasten – Bild direkt bearbeiten (Größe ziehen, Zuschneiden, Drehen, Datei auf die Seite ziehen)

## Status: Planned
**Created:** 2026-11-16
**Last Updated:** 2026-11-16

## Idee in einem Satz
Ein ausgewähltes Bild in der Vorschau bekommt Anfasser zum Größer- und Kleinerziehen. Zuschneiden und Drehen passieren direkt am Bild statt in einem Dialog, und Bilder vom Computer zieht man einfach an die gewünschte Stelle der Seite.

Teil der Reihe „Baukasten direkt“, Übersicht und Leitbild in PROJ-101.

## Kontext
- Rückmeldung des Nutzers (2026-11-16, mit Screenshot): Die Breite steckt heute in einem Dropdown („ganze Breite“) in der Schublade, Zuschneiden und Drehen in einem Dialog (`bild-dialog.tsx`, `bild-bearbeiten.tsx`, PROJ-92). Wunsch: „größer, kleiner ziehen, alles einfacher und intuitiver“.
- PROJ-92 legt fest: Original bleibt, die bearbeitete Fassung wird als neues Bild gespeichert. Formate PNG, JPG, WebP. 8-MB-Grenze der Seite mit Anzeige. Alternativtext ist Pflicht.

## Entscheidungen (Nutzer, 2026-11-16)
- **E1:** Größe per Ziehen an den Ecken direkt in der Vorschau. Zuschneiden und Drehen ohne Dialog.
- **E2:** Am Handy: Bild tauschen, Alternativtext und Unterschrift ändern, Breite über drei Knöpfe (Klein/Halb/Ganz). Ziehen der Größe und Zuschneiden nur ab Tablet.

## Vorschläge (bitte beim Review bestätigen)
- **V1 – Größe stufenlos mit Einrasten:** Die Breite ist stufenlos von 20 % bis 100 % der Inhaltsbreite und rastet spürbar bei 25 %, 33 %, 50 %, 66 % und 100 % ein (⌥/Alt beim Ziehen schaltet das Einrasten ab). Bisherige Werte Klein/Halb/Ganz werden in Prozent übersetzt.
- **V2 – Ausrichtung:** Kleinere Bilder lassen sich links, mittig oder rechts ausrichten. Text daneben ist Thema von PROJ-105.

## Dependencies
- Requires: PROJ-101 (Auswahl, Block-Leiste), PROJ-92 (Hochladen, Galerie, Zuschneiden, Original bleibt, Platzanzeige)
- Berührt: Kern (`seite.py`, Bild-Block muss eine Breite in Prozent und eine Ausrichtung kennen), PROJ-105/105 (bauen auf diesen Werkzeugen auf)

## User Stories
- Als **Lehrkraft** möchte ich ein Bild an der Ecke kleiner ziehen und sofort sehen, wie es in der Seite wirkt.
- Als **Lehrkraft** möchte ich einen störenden Rand oder ein Wasserzeichen („Len Rogers Collection“) direkt am Bild wegschneiden.
- Als **Lehrkraft** möchte ich ein schief gescanntes Bild drehen, ohne einen Dialog zu öffnen.
- Als **Lehrkraft** möchte ich ein Foto vom Desktop genau zwischen zwei Blöcke ziehen.
- Als **Lehrkraft** möchte ich ein Bild austauschen und Größe, Ausrichtung und Alternativtext dabei behalten.
- Als **Lehrkraft** möchte ich jederzeit zum Original zurück.

## Acceptance Criteria

### Größe ziehen
- [ ] Ein ausgewähltes Bild zeigt Anfasser an den vier Ecken und an der linken und rechten Kante (mindestens 24 px groß, Trefferfläche 44 px).
- [ ] Ziehen ändert die Breite live in der Vorschau, das Seitenverhältnis bleibt. Ein kleines Etikett zeigt die Breite („50 %“).
- [ ] Die Breite rastet bei den Stufen aus V1 ein. ⌥/Alt beim Ziehen schaltet das Einrasten ab.
- [ ] Doppelklick auf einen Anfasser setzt auf 100 % zurück.
- [ ] Tastatur: Mit ausgewähltem Bild ändern ⌘/Strg + Plus/Minus die Breite zur nächsten Stufe.
- [ ] Die Breite wird mit dem Material gespeichert und erscheint so in Download, Link, Regal und Druck. Auf schmalen Schüler-Bildschirmen (Handy) wird jedes Bild mindestens so breit wie ein Daumenbreit-Raster (Vorschlag: unter 360 px Bildschirmbreite immer 100 %), damit nichts winzig wird.

### Bild-Leiste
- [ ] Die Block-Leiste (PROJ-101) zeigt bei Bildern: Austauschen, Zuschneiden, Links drehen, Rechts drehen, Ausrichtung (links/mittig/rechts, nur unter 100 %), Alternativtext, Zurücksetzen auf Original.
- [ ] Die Bildunterschrift wird direkt unter dem Bild getippt (PROJ-103). Leer zeigt sie im Editor den Platzhalter „Bildunterschrift (optional)“.
- [ ] „Alternativtext“ öffnet ein kleines Feld direkt an der Leiste. Fehlt er, zeigt das Bild im Editor einen orangefarbenen Hinweis „Alternativtext fehlt“, und die Prüfstelle meldet ihn.

### Zuschneiden direkt am Bild
- [ ] „Zuschneiden“ legt einen Rahmen mit acht Anfassern über das Bild in der Vorschau. Der Bereich außerhalb wird abgedunkelt.
- [ ] Seitenverhältnis frei oder fest (Frei, 1:1, 4:3, 16:9) über eine kleine Auswahl in der Leiste.
- [ ] „Übernehmen“ (Enter) und „Abbrechen“ (Esc) stehen an der Leiste. Erst „Übernehmen“ speichert eine neue bearbeitete Fassung, das Original bleibt (PROJ-92 F2).
- [ ] Erneutes Zuschneiden geht vom Original aus und zeigt den bisherigen Ausschnitt als Startrahmen, sodass nichts unwiederbringlich verloren ist.

### Drehen
- [ ] Links/Rechts drehen in 90°-Schritten wirkt sofort in der Vorschau, ohne Dialog.

### Datei auf die Seite ziehen
- [ ] Zieht man eine Bilddatei vom Computer über die Vorschau, zeigt eine Linie die Einfügestelle zwischen Blöcken. Ablegen legt dort einen neuen Bild-Block an.
- [ ] Ablegen auf ein vorhandenes Bild (Fläche wird hervorgehoben: „Bild ersetzen“) tauscht das Bild aus und behält Breite, Ausrichtung, Unterschrift und Alternativtext.
- [ ] Mehrere Dateien auf einmal legen mehrere Bild-Blöcke untereinander an.
- [ ] Bilder aus der Zwischenablage (⌘/Strg + V, zum Beispiel ein Screenshot) legen einen Bild-Block hinter dem ausgewählten Block an.
- [ ] Nach dem Ablegen fragt ein kleines Feld direkt am neuen Bild nach dem Alternativtext (überspringbar, dann gilt der Hinweis „Alternativtext fehlt“).
- [ ] Format-, Größen- und 8-MB-Prüfungen gelten wie in PROJ-92, mit denselben Meldungen. Der Upload-Fortschritt erscheint direkt am neuen Block.

### Bildauswahl
- [ ] „Austauschen“ und ein neuer leerer Bild-Block öffnen eine kompakte Auswahl mit drei Wegen: „Vom Computer“, „Aus dem Skript“ (Galerie aus PROJ-92), „Zuletzt verwendet“ (Bilder aus diesem Material).

### Handy (< 1024 px)
- [ ] Bild antippen zeigt in der festen Leiste: Austauschen, Breite (Klein/Halb/Ganz), Drehen, Alternativtext, Löschen. Kein Ziehen der Größe, kein Zuschneiden.

## Edge Cases
- **Sehr kleines Originalbild wird groß gezogen:** Ab einer sichtbaren Vergrößerung über 150 % der Originalgröße zeigt das Etikett „Bild wird unscharf“.
- **Bild-Block ohne Bild** (Datei fehlt, Skript entfernt): Platzhalter „Bild nicht gefunden – austauschen?“. Er ist auswählbar, Anfasser gibt es nicht.
- **Zuschneiden auf sehr kleinen Ausschnitt:** Die Mindestgröße beträgt 50 × 50 Bildpunkte, darunter lässt der Rahmen sich nicht verkleinern.
- **Ziehen einer Nicht-Bild-Datei** (PDF, Word): Die Einfügelinie erscheint nicht. Beim Ablegen kommt „Nur PNG, JPG und WebP können als Bild eingefügt werden.“
- **Gleichzeitiges Ablegen über 8 MB:** Die Bilder, die noch passen, werden eingefügt, der Rest wird mit Hinweis abgelehnt.
- **Vorschau baut während des Ziehens neu:** Die Größe wird erst beim Loslassen gespeichert. Ein Neubau unterbricht das Ziehen nicht.
- **Ältere Materialien mit Klein/Halb/Ganz:** Sie werden ohne Umbau angezeigt und beim ersten Ziehen in Prozent gespeichert.
- **Rückgängig:** Ziehen, Zuschneiden, Drehen und Austauschen sind je ein Schritt.

## Nicht Teil dieses Features
- Text neben Bild, Galerie (PROJ-105). Beschriften und Markieren (PROJ-106). Hotspots (PROJ-107).

## Technical Requirements
- Sicherheit: Formatprüfung am Dateiinhalt (wie PROJ-92). Bilder werden nur in die Ablage des eigenen Kontos geladen.
- Performance: Live-Größe ohne Neubau der Seite (nur Darstellung). Gespeichert und neu gebaut wird beim Loslassen.

## Offene Punkte für `/architecture`
- Kern: Breite in Prozent und Ausrichtung im `image`-Block (Rückwärtskompatibilität mit Klein/Halb/Ganz).
- Liegen Anfasser und Zuschneide-Rahmen als App-Schicht über dem iframe oder im eingespielten Skript? Wiederverwendung von `react-image-crop`?

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)
_To be added by /architecture_

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
