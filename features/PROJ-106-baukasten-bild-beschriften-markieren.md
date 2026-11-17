# PROJ-106: Baukasten – Bild beschriften & markieren

## Status: Deployed
**Created:** 2026-11-16
**Last Updated:** 2026-11-17

## Idee in einem Satz
Auf ein Bild lassen sich Pfeile, Kreise, Rechtecke, Nummern und kurze Texte setzen, verschieben und wieder entfernen. Die Markierungen bleiben veränderbar und liegen über dem Bild, statt in die Datei eingebrannt zu sein.

Teil der Reihe „Baukasten direkt“, Übersicht und Leitbild in PROJ-101.

## Entscheidungen (Nutzer, 2026-11-16)
- **E1:** Beschriften und Markieren gehört in den Umfang.
- **E2:** Nur am Laptop und am Tablet, nicht am Handy (PROJ-101 Leitbild).

## Vorschläge (bitte beim Review bestätigen)
- **V1 – Markierungen bleiben bearbeitbar:** Sie werden als eigene Ebene gespeichert (Position in Prozent des Bildes), nicht ins Bild eingebrannt. So passen sie bei jeder Bildbreite und lassen sich später ändern.
- **V2 – Werkzeuge:** Pfeil, Linie, Kreis/Ellipse, Rechteck, Nummern-Punkt (1, 2, 3 … zählt automatisch hoch), Textfeld, Markerfläche (halbtransparent). Keine Freihand-Zeichnung im ersten Wurf.
- **V3 – Farben:** 5 feste Farben mit gutem Kontrast auf Fotos (Rot, Gelb, Blau, Grün, Weiß mit dunklem Rand). Strichstärke dünn/mittel/dick.

## Dependencies
- Requires: PROJ-104 (Bild-Leiste, Bild-Auswahl)
- Berührt: Kern (`seite.py`: Bild-Block mit Markierungs-Ebene, Druck), PROJ-107 (Hotspots bauen auf dem Platzieren von Punkten auf)

## User Stories
- Als **Lehrkraft** möchte ich auf ein LKW-Foto Nummern setzen („1 Zugmaschine, 2 Auflieger“), damit Schüler die Teile zuordnen können.
- Als **Lehrkraft** möchte ich mit einem Pfeil und einem kurzen Text auf eine Stelle im Bild zeigen.
- Als **Lehrkraft** möchte ich einen Bereich einkreisen oder hervorheben.
- Als **Lehrkraft** möchte ich eine Markierung später verschieben, ändern oder löschen.
- Als **Lehrkraft** möchte ich ein Bild zuschneiden, ohne dass die Markierungen danach an falscher Stelle sitzen.

## Acceptance Criteria

### Markier-Modus
- [ ] Die Bild-Leiste hat „Beschriften“. Es öffnet am Bild eine Werkzeugleiste mit den Werkzeugen aus V2, Farbe, Strichstärke, „Fertig“.
- [ ] Werkzeug wählen, dann auf das Bild klicken oder ziehen: Kreis, Rechteck, Pfeil und Linie entstehen durch Ziehen, Nummern-Punkt und Textfeld durch Klick.
- [ ] Nummern-Punkte zählen automatisch hoch. Wird einer gelöscht, rücken die übrigen nach (abschaltbar).
- [ ] Ein Textfeld wird direkt getippt (reiner Text, höchstens 80 Zeichen) und hat einen Hintergrund, damit es auf Fotos lesbar bleibt.
- [ ] Jede Markierung lässt sich anklicken, verschieben, an Anfassern in der Größe ändern, in Farbe/Stärke ändern und mit Entf oder dem Papierkorb löschen.
- [ ] ⌘/Strg + Z wirkt im Markier-Modus pro Markierung. Nach „Fertig“ ist die gesamte Änderung ein Schritt im Editor-Verlauf.
- [ ] Esc beendet das aktuelle Werkzeug, ein zweites Esc den Markier-Modus (Änderungen bleiben).
- [ ] „Alle Markierungen entfernen“ (mit Rückgängig-Hinweis) im „⋯“-Menü.

### Darstellung
- [ ] Markierungen bleiben bei jeder Bildbreite an der richtigen Stelle und skalieren mit (Schrift bleibt bis zu einer Mindestgröße lesbar).
- [ ] Sie erscheinen in Download, Link, Regal und Druck genauso wie in der Vorschau.
- [ ] Nach Zuschneiden oder Drehen werden die Markierungen mitbewegt. Fallen sie aus dem neuen Ausschnitt, kommt der Hinweis „2 Markierungen liegen außerhalb und wurden ausgeblendet“, und sie gehen nicht verloren (beim Zurücksetzen wieder sichtbar).
- [ ] Beim Austauschen des Bilds fragt der Editor: „Markierungen behalten?“ (Ja / Nein).

### Barrierefreiheit
- [ ] Textfelder und Nummern mit Beschriftung gehen als Liste in eine für Bildschirmleser lesbare Beschreibung ein (zusätzlich zum Alternativtext).
- [ ] Im Editor sind Markierungen per Tab erreichbar und mit Pfeiltasten verschiebbar.

## Edge Cases
- **Sehr viele Markierungen** (über 30): Hinweis „Viele Markierungen machen das Bild unübersichtlich“, ohne Sperre.
- **Markierung ragt über den Bildrand:** Sie wird am Rand abgeschnitten dargestellt und lässt sich zurückziehen.
- **Bild in einer Galerie (PROJ-105):** Beschriften geht auch für Galerie-Bilder. In der kleinen Rasteransicht sind Markierungen sichtbar, Texte erscheinen erst im Leuchtkasten, falls sie zu klein würden.
- **Bild ohne Datei:** Der Beschriften-Knopf ist gesperrt.
- **Sehr kleines Bild (Breite unter 25 %):** Beschriften öffnet das Bild vergrößert über der Seite, damit man präzise arbeiten kann.

## Nicht Teil dieses Features
- Freihand-Zeichnen, Formen mit Füllmustern, Ebenen-Verwaltung.
- Interaktive Markierungen für Schüler (PROJ-107).

## Technical Requirements
- Sicherheit: Texte in Markierungen werden als reiner Text behandelt (keine HTML-Einbettung).
- Darstellung als Vektorgrafik über dem Bild, damit sie bei jeder Größe scharf bleibt (Umsetzung entscheidet `/architecture`).

## Offene Punkte für `/architecture`
- Speicherform der Markierungs-Ebene in der YAML und Darstellung im Kern (SVG-Ebene über dem Bild, vgl. PROJ-91 SVG im Kern).
- Mitbewegen der Markierungen beim Zuschneiden und Drehen (Koordinaten relativ zum Original).

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)
Siehe PROJ-104. Markierungen sind eine eigene Ebene `marks` im Bild-Block (Orte in Prozent des Bildes, `art` pfeil/linie/kreis/rechteck/nummer/text/marker, `farbe` aus fünf festen Werten, `staerke`, `text` ≤ 80 Zeichen, `aus` für ausgeblendet). Der Kern (`bildmarken.py`) liest sie streng und zeichnet ein SVG über dem Bild (1000 Einheiten Breite, Höhe nach Seitenverhältnis, Kreise bleiben rund); Texte sind nie HTML. Der Editor (`bild-beschriften.tsx`, `marken-svg.tsx`) arbeitet auf einer Kopie und gibt die Liste bei „Fertig“ zurück. Drehen und Zuschneiden rechnen die Markierungen mit (`markenNachDrehung`, `markenNachAusschnitt`).

## Umsetzung (2026-11-17)
- Gebaut: Werkzeuge Auswählen, Pfeil, Linie, Kreis, Rechteck, Nummer (zählt automatisch), Text, Marker; 5 Farben, 3 Stärken; Verschieben per Ziehen und Pfeiltasten, Endpunkte ziehen, Entf, Rückgängig/Wiederholen im Dialog, Esc beendet Werkzeug, zweites Esc übernimmt; Liste aller Markierungen (per Tab erreichbar), „Alle entfernen“, Hinweis ab 30; Leserliste für Bildschirmleser im Kern; Galerie-Bilder können beschriftet werden; Markierungen laufen beim Drehen/Zuschneiden mit, was außerhalb liegt wird ausgeblendet, nicht gelöscht (im Dialog wieder einblendbar).
- **Abweichungen:** (1) Beschriften öffnet einen Dialog statt direkt am Bild in der Vorschau. (2) Austauschen entfernt die Markierungen ohne Rückfrage (Hinweis mit Rückgängig). (3) „Zurücksetzen auf Original“ blendet ausgeblendete Markierungen nicht automatisch ein. (4) Mindestschriftgröße beim Verkleinern und Leuchtkasten-Texte nicht umgesetzt. (5) Kein Nummernpunkt-Neunummerieren-Schalter (immer automatisch). (6) Am Handy nicht verfügbar (Knopf ausgeblendet).
- **Offen:** Browser-Test (Zeichnen mit Maus/Touch).

## QA Test Results
_To be added by /qa_

## Deployment
- 2026-11-17: Kern `16f779f`/`584f51f` per `vercel deploy --prod`, App `c6a0020` (Push auf main, Vercel Ready). Keine Migration. Mit ausgeliefert: fremder Commit `1a17eee` (PROJ-103: Schreiben in der Seite und Schublade gleichzeitig).
- Geprüft: tsc, Build, Kern-Tests (90), Vitest je Datei grün; im Gesamtlauf unter Last wechselnde Zeitüberschreitungen in Baukasten-Tests (einzeln grün). Kein formaler QA-Durchlauf mit Bug-Liste, kein Browser-Test.
- Offen: Browser-Test durch den Nutzer.
