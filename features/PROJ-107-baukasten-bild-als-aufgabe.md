# PROJ-107: Baukasten – Bild als Aufgabe (Hotspots & Beschriftungen zuordnen)

## Status: Deployed
**Created:** 2026-11-16
**Last Updated:** 2026-11-17

## Idee in einem Satz
Aus einem Bild wird eine Aufgabe. Entweder klicken Schüler die richtigen Stellen an („Wo ist das Kühlaggregat?“), oder sie ziehen Beschriftungen an die passenden Punkte („Ordne zu: Zugmaschine, Auflieger, Plane“). Die Lehrkraft setzt die Punkte direkt auf dem Bild.

Teil der Reihe „Baukasten direkt“, Übersicht und Leitbild in PROJ-101.

## Kontext
- Der Katalog (PROJ-90) kennt schon `bildzuordnung` (Bild zu Begriff) und `image_sequencing` (Bilder in Reihenfolge). Eine Aufgabe, bei der **Stellen innerhalb eines Bildes** gefunden oder beschriftet werden, fehlt.
- Nutzer (2026-11-16): „Bild als Aufgabe“ gewünscht.

## Vorschläge (bitte beim Review bestätigen)
- **V1 – Zwei Aufgabentypen:**
  - **„Stelle im Bild finden“** (Hotspot): Frage plus ein oder mehrere richtige Bereiche. Schüler klicken, Rückmeldung pro Klick.
  - **„Bild beschriften“** (Zuordnung): Punkte im Bild, Schüler ziehen Begriffe aus einer Liste auf die Punkte. Optional Ablenker-Begriffe.
- **V2 – Feedback** wie bei den anderen Aufgaben: richtig/falsch je Antwort, Erklärung je Bereich bzw. Begriff, „Nochmal“ und „Lösung zeigen“.

## Dependencies
- Requires: PROJ-104 (Bild-Auswahl, Bild-Leiste), PROJ-106 (Punkte und Bereiche auf dem Bild platzieren, gleiche Bedienung)
- Berührt: Kern (`seite.py`: zwei neue Bausteine in `BAUSTEINE`, `PRUEFBAR`, Laufzeit, Fortschritt), PROJ-90 (Katalog), PROJ-95 (Typ wechseln: Bild ↔ Bild-Aufgabe), Prüfstelle

## User Stories
- Als **Lehrkraft** möchte ich auf einem Foto die richtige Stelle markieren und Schüler danach suchen lassen.
- Als **Lehrkraft** möchte ich auf einem LKW-Bild Punkte setzen und Schüler Fachbegriffe zuordnen lassen.
- Als **Lehrkraft** möchte ich ein vorhandenes Bild mit einem Klick in eine Bild-Aufgabe umwandeln.
- Als **Schüler** möchte ich am Handy Begriffe auf ein Bild ziehen oder antippen und sofort sehen, ob es stimmt.
- Als **Schüler mit Tastatur oder Bildschirmleser** möchte ich die Aufgabe ebenfalls lösen können.

## Acceptance Criteria

### Anlegen
- [ ] Der Katalog und das „⋯“-Menü eines Bild-Blocks („In Aufgabe umwandeln“) bieten „Stelle im Bild finden“ und „Bild beschriften“. Beim Umwandeln bleiben Bild, Alternativtext und Unterschrift erhalten.
- [ ] Die Lehrkraft setzt direkt auf dem Bild in der Vorschau:
  - **Finden:** Bereiche als Kreis oder Rechteck (ziehen), je Bereich „richtig“ oder „falsch“ plus Rückmeldetext.
  - **Beschriften:** Punkte (klicken), je Punkt der richtige Begriff. Zusätzlich optionale Ablenker-Begriffe.
- [ ] Fragetext und Rückmeldungen werden im Formular der Schublade bearbeitet (PROJ-103 E2). Die Bereiche und Punkte nur auf dem Bild.
- [ ] Die Prüfstelle meldet: kein richtiger Bereich, Punkt ohne Begriff, doppelte Begriffe, fehlender Alternativtext.
- [ ] Im Modus Ausprobieren (PROJ-101) lässt sich die Aufgabe wie von Schülern lösen.

### Schüler-Ansicht: Stelle finden
- [ ] Das Bild nimmt die volle Breite ein. Ein Klick oder Tipp setzt eine Markierung. Richtig wird grün, falsch rot, mit dem Rückmeldetext.
- [ ] Bei mehreren richtigen Bereichen zeigt die Aufgabe „2 von 3 gefunden“.
- [ ] Die Trefferfläche jedes Bereichs ist auf dem Handy mindestens 44 × 44 px groß, auch wenn der Bereich kleiner gezeichnet ist.

### Schüler-Ansicht: Bild beschriften
- [ ] Die Begriffe stehen als Karten unter dem Bild (gemischt). Ziehen auf einen Punkt oder erst Karte, dann Punkt antippen ordnet zu.
- [ ] „Prüfen“ färbt jede Zuordnung richtig/falsch. Falsche Karten lassen sich neu ziehen.
- [ ] Tastatur: Karte mit Tab wählen, Enter, dann Punkt mit Pfeiltasten wählen, Enter.

### Gemeinsam
- [ ] Die Aufgabe zählt im Fortschritt der Seite wie andere prüfbare Aufgaben.
- [ ] Druck: Das Bild mit Nummern an den Punkten und einer leeren Zeile je Nummer (Beschriften) bzw. mit Arbeitsauftrag (Finden). Die Lösungen druckt nur die Lösungsfassung.
- [ ] „Typ wechseln“ zurück zu Bild entfernt die Aufgabe nach Rückfrage, das Bild bleibt.

## Edge Cases
- **Bild wird nach dem Setzen der Punkte zugeschnitten:** Punkte wandern mit (wie PROJ-106). Fällt ein Punkt heraus, meldet die Prüfstelle ihn.
- **Bereiche überlappen:** Erlaubt. Ein Klick in die Überlappung zählt für den obersten Bereich, und die Lehrkraft sieht im Editor die Reihenfolge.
- **Sehr viele Punkte (über 12):** Hinweis wegen der Übersicht am Handy, ohne Sperre.
- **Kleines Bild am Handy:** Die Aufgabe zeigt das Bild immer in voller Breite, mit Vergrößern-Knopf.
- **Schüler löst ohne Maus und Touch:** Vollständig per Tastatur lösbar (siehe oben).
- **Bildschirmleser:** Bei „Finden“ gibt es eine Alternative als Auswahlliste mit den Bereichsbeschreibungen, damit niemand ausgeschlossen ist.

## Nicht Teil dieses Features
- Zeichnen durch Schüler, Freitext-Beschriftung durch Schüler.

## Technical Requirements
- Barrierefreiheit wie bei den übrigen Aufgaben (WCAG AA, Tastatur, Bildschirmleser).
- Funktioniert offline in der heruntergeladenen Seite.

## Offene Punkte für `/architecture`
- Neue Bausteine im Kern inklusive Laufzeit und Prüfregeln. Werden sie in den Prompt-Katalog (KI-Erzeugung) aufgenommen oder bleiben sie zunächst nur manuell?

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)
Entschieden am 2026-11-17 (ohne Rückfrage, nach der Grundregel aus PROJ-101):
- **„Bild beschriften“ gibt es schon:** `bildzuordnung` (PROJ-90) setzt Begriffe auf Punkte, das Formular hat einen Punkte-Setzer auf dem Bild. PROJ-107 baut deshalb nur dazu: Ablenker-Begriffe und die Umwandlung Bild → Aufgabe.
- **Neuer Typ `hotspot` („Stelle im Bild finden“):** `bereiche[]` mit `art` (kreis/rechteck), Rahmen `x/y/x2/y2` in Prozent, `richtig`, `label`, `feedback`; Fragetext in `description`/`question`. Der Kern baut daraus eine prüfbare Aufgabe (zählt im Fortschritt, Lösung im Lösungsblock wie bei den anderen Typen).
- **Schüler:** Klick/Tipp auf das Bild; die Trefferfläche ist mindestens 44 × 44 px; oberster (zuletzt genannter) Bereich zählt; richtig = grüne Fläche + Rückmeldung, falsch = roter Ring + Rückmeldung; Zähler „n von m gefunden“; „Nochmal“. Ohne Maus: aufklappbare Auswahlliste (`details`) mit allen Bereichen.
- **Lehrkraft:** `HotspotFormular` zeichnet Bereiche durch Ziehen auf dem Bild (wie der Punkte-Setzer), Liste mit Form, richtig/falsch, Beschreibung, Rückmeldung. Im „⋯“-Menü: „In Aufgabe umwandeln“ (Bild → Hotspot oder Bildzuordnung) und „Zurück zum einfachen Bild“.

## Umsetzung (2026-11-17)
- Gebaut: Kern-Baustein `hotspot` (Bau, Laufzeit, Druck: Markierungen ausgeblendet), Ablenker für `bildzuordnung` (`ablenker:`, gemischte Karten ohne Stelle), Prüfstelle (kein Bild, kein richtiger Bereich, Alternativtext), Katalog-Eintrag mit Skizze und Beispiel, `HotspotFormular`, Ablenker-Liste im Bildzuordnung-Formular, Menü „In Aufgabe umwandeln“ / „Zurück zum einfachen Bild“. Tests: Kern (`kern_bild_test.py`, Laufzeit zusätzlich in jsdom geprüft), `werkzeugkiste-bild-block.test.ts`, `hotspot-formular.test.tsx`.
- **Abweichungen:** (1) Bereiche werden im Formular der Schublade auf dem Bild gezeichnet, nicht direkt in der Vorschau. (2) „Zurück zum Bild“ fragt nicht nach, sondern bietet „Rückgängig“ an. (3) Die Bereiche folgen nicht automatisch dem Zuschneiden/Drehen (Zuschneiden ist bei Aufgaben nicht angeboten). (4) Die Reihenfolge der überlappenden Bereiche steht in der Liste (letzter = oben), eine eigene Anzeige gibt es nicht. (5) Der Hinweis „über 12 Punkte“ entfällt (Grenze: 20 Bereiche). (6) Druck: Das Bild mit Fragetext, ohne Lösungsmarkierungen; Nummern an Punkten (Beschriften) unverändert wie bisher. (7) Ob der Typ in den KI-Prompt kommt: nein, er bleibt dem Baukasten vorbehalten (Bereiche kann die KI nicht setzen).
- **Offen:** Browser-Test durch den Nutzer (Zeichnen im Formular, Tippen auf dem Handy, Auswahlliste mit Tastatur).

## QA Test Results
_To be added by /qa_

## Deployment
- 2026-11-17: Kern `020474f` per `vercel deploy --prod`, App `ec99013` (Push auf main, Vercel Ready). Keine Migration.
- Geprüft: tsc, ESLint (0 Fehler), Build, Kern-Tests, Hotspot-Laufzeit in jsdom, Vitest der Werkzeugkiste (1039 grün; 1 alter Fehler `werkzeugkiste-auszug.test.ts`, PROJ-100). Kein formaler QA-Durchlauf, kein Browser-Test.
- Offen: Browser-Test durch den Nutzer.
