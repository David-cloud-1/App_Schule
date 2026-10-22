# PROJ-43: Lernbibliothek – Tab „Lernen“ & Fachseite mit Themenpfad

## Status: Architected
**Created:** 2026-10-22
**Last Updated:** 2026-10-22

## Dependencies
- Requires: PROJ-41 (Bottom-Navigation). Der Tab „Lernen“ (`/subjects`) und die Prüfungs-Einstiege oben entstehen dort.
- PROJ-3 / PROJ-12 / PROJ-13 (Quiz, Klassenstufen, Themenauswahl): Eine Lernrunde startet mit Fach, Klassenstufe und Thema wie bisher.
- PROJ-14 (Lücken schließen): Lücken-Einstieg pro Fach
- PROJ-11 (Prüfungssimulation) / PROJ-21 (Leistungsnachweise): Der gemischte Prüfungsverlauf wird in zwei getrennte Bereiche aufgeteilt
- PROJ-23 (Fachbereichs-Zuordnung): Nur Fächer des eigenen Bereichs
- PROJ-42 (Heute-Screen, bereits gebaut): Die Fachringe öffnen bisher das Themen-Sheet. Dieses Feature stellt sie auf die neue Fachseite um.

## Ausgangslage
Die Fächerseite zeigt jedes Fach als große Karte mit Beschreibung, Fragenanzahl und einem eigenen farbigen „Jetzt lernen“-Button. Für 5 Fächer muss man drei Bildschirme lang scrollen, und keine Aktion sticht heraus. Die Klassenstufe wählt man zweimal (auf der Seite und im Sheet), „Lücken schließen“ erscheint ebenfalls doppelt. Das Themen-Sheet ist eine unsortierte Wand aus Chips ohne Fortschritt (STG Klasse 10: 14 Themen). Bis zum Start einer Themen-Runde braucht man 4 Taps. Den eigenen Fortschritt sieht man nirgends, nur die Gesamtzahl der Fragen.

Dazu sind „Prüfungssimulation“ und „Prüfungsverlauf“ schwer auseinanderzuhalten. Im Prüfungsverlauf stehen Übungs-Simulationen und benotete Leistungsnachweise gemischt (Stand 22.10.2026: 22 Simulationen, 9 Leistungsnachweise), unterschieden nur durch ein kleines Badge. Den Code für einen Leistungsnachweis gibt man versteckt auf der Seite der Prüfungssimulation ein.

## Ziel
Der Tab „Lernen“ wird eine **Lernbibliothek mit zwei Ebenen**:
1. **Überblick (`/subjects`):** alle Fächer kompakt auf einem Bildschirm, jeweils mit dem eigenen Fortschritt.
2. **Fachseite (`/subjects/[code]`):** die Themen des Fachs als Lernpfad mit Fortschritt pro Thema. Ein Tap startet die Lernrunde.

Leitgedanke: Man sieht nicht, wie viele Fragen es gibt, sondern **wie weit man selbst ist**. Ein Thema auf „gemeistert“ zu bringen, ist ein kleines Ziel, das man in einer Sitzung schaffen kann.

## User Stories
- Als Azubi möchte ich alle meine Fächer auf einen Blick sehen, ohne zu scrollen, damit ich schnell das richtige finde.
- Als Azubi möchte ich bei jedem Fach und jedem Thema meinen Fortschritt sehen, damit ich weiß, wo ich stehe und was noch fehlt.
- Als Azubi möchte ich meine Klassenstufe nur einmal wählen, und die App merkt sie sich, damit ich sie nicht jedes Mal neu einstellen muss.
- Als Azubi möchte ich die Themen eines Fachs geordnet sehen (nach Klasse gruppiert, Hefte und Teile in der richtigen Reihenfolge), damit ich mich zurechtfinde.
- Als Azubi möchte ich mit einem Tap auf ein Thema sofort loslernen, ohne vorher eine Auswahl bestätigen zu müssen.
- Als Azubi möchte ich sehen, welches Thema ich als Nächstes angehen sollte, damit ich nicht überlegen muss.
- Als Azubi möchte ich bei einem Thema einen Haken sehen, sobald ich es gemeistert habe, damit ich meinen Erfolg erkenne.
- Als Azubi möchte ich ein Fach auch gemischt und nur meine Lücken in diesem Fach lernen können.
- Als Azubi möchte ich Prüfungs-Übung und benotete Leistungsnachweise klar getrennt finden, damit ich weiß, was zählt und was nur Training ist.
- Als Azubi möchte ich meine Noten aus Leistungsnachweisen an einem festen Ort sehen und dort auch den Code meiner Lehrkraft eingeben.

## Acceptance Criteria

### Tab „Lernen“ (`/subjects`): Kopf
- [ ] Oben steht ein schlanker Seitentitel „Lernen“ mit der XP-Anzeige. Die Begrüßung „Hallo, {Name}!“ und der Untertitel „Wähle ein Fach …“ entfallen.
- [ ] Darunter liegt **ein** Klassenstufen-Umschalter als Segmented Control: die Klassenstufen des eigenen Fachbereichs (z. B. „10 · 11 · 12“) und „Alle“.
- [ ] Die gewählte Klassenstufe wird **auf dem Gerät gespeichert** und gilt beim nächsten Besuch wieder, auch auf der Fachseite. Beim allerersten Besuch ist „Alle“ gewählt.
- [ ] Die Klassenstufe wirkt auf Fortschrittswerte, Themenliste und gestartete Runden.

### Tab „Lernen“: Prüfung & Leistungsnachweise
- [ ] Die bisherigen Einstiege „Prüfungssimulation“ und „Prüfungsverlauf“ werden ersetzt durch zwei kompakte, gleich große Kacheln nebeneinander:
  - **„Prüfung üben“** (Icon Stoppuhr o. ä., Untertitel „IHK-Simulation“) führt zur Prüfungssimulation (`/exam`),
  - **„Leistungsnachweise“** (Icon Abschlusshut, Untertitel „Code & Noten“) führt zum neuen Bereich Leistungsnachweise.
- [ ] Die Bezeichnung lautet im gesamten Spielerbereich einheitlich **„Leistungsnachweis(e)“**, genau wie im Lehrkräfte-Bereich. Benotete Tests heißen nirgends mehr „Prüfung“.

### Bereich „Prüfung üben“ (`/exam`)
- [ ] Unter dem Start der Simulation steht die Liste **„Meine Simulationen“** mit den eigenen abgeschlossenen und abgebrochenen Simulationen (Datum, Teile, Prozent, Bestanden / Nicht bestanden / Abgebrochen), neueste zuerst. Ein Tap öffnet das Ergebnis wie bisher.
- [ ] Die Liste enthält **keine** Leistungsnachweise.
- [ ] Der bisherige Einstieg „Code für Leistungsnachweis eingeben“ auf dieser Seite entfällt (er zieht in den Bereich Leistungsnachweise).

### Bereich „Leistungsnachweise“ (neu)
- [ ] Oben steht die Code-Eingabe für einen Leistungsnachweis. Sie funktioniert wie die bisherige Seite `/pruefung` (gleiche Prüfung, gleiche Weiterleitung).
- [ ] Darunter steht **„Meine Leistungsnachweise“**: jeder eigene Leistungsnachweis mit Titel, Datum und Note bzw. „Note ausstehend“, solange die Lehrkraft nicht freigegeben hat. Neueste zuerst.
- [ ] Ein Tap auf einen freigegebenen Leistungsnachweis öffnet das Ergebnis wie bisher. Bei ausstehender Note ist der Eintrag nicht antippbar oder zeigt nur „Note ausstehend“, wie heute.
- [ ] Ohne Leistungsnachweise steht ein leerer Zustand: „Noch keine Leistungsnachweise. Deine Lehrkraft gibt dir einen Code.“
- [ ] Die Bottom-Navigation ist sichtbar, „Lernen“ ist aktiv. Oben führt ein Zurück-Pfeil zum Tab „Lernen“.
- [ ] Der Deep-Link `/pruefung/[code]` (Teilnahme direkt per Link) bleibt unverändert und ohne Bottom-Navigation (PROJ-30).

### Alter Prüfungsverlauf
- [ ] Der gemischte „Prüfungsverlauf“ entfällt als eigener Einstieg. Der alte Link `/exam-history` führt zu „Meine Simulationen“, damit Lesezeichen weiter funktionieren.
- [ ] Der Zurück-Pfeil auf einer Ergebnisseite führt zu der Liste, aus der man kam: bei einer Simulation zu „Prüfung üben“, bei einem Leistungsnachweis zu „Leistungsnachweise“.

### Tab „Lernen“: Fächer
- [ ] Unter der Überschrift „Fächer“ steht zuerst die Zeile **„Alle Fächer mischen“** (Shuffle-Icon). Ein Tap startet eine gemischte Runde über alle Fächer mit der gewählten Klassenstufe.
- [ ] Danach folgt jedes Fach des eigenen Fachbereichs als **kompakte Listenzeile**:
  - links ein Fortschrittsring in der Fachfarbe mit dem Fach-Icon in der Mitte,
  - daneben das Kürzel (fett, z. B. „STG“) und darunter der Fachname (einzeilig, bei Bedarf gekürzt),
  - rechts der Fortschritt in Prozent und ein Pfeil.
- [ ] Fortschritt eines Fachs = Anteil der aktiven Fragen (in der gewählten Klassenstufe), die der Azubi mindestens einmal richtig beantwortet hat. Das ist dieselbe Definition wie bei den Fachringen in PROJ-42.
- [ ] Ein Tap auf eine Fachzeile öffnet die Fachseite `/subjects/{code}` (Kürzel klein geschrieben).
- [ ] Die Fachzeilen haben keinen farbigen Button, keine Beschreibung und keine Fragenanzahl mehr.
- [ ] Die große Karte „Lücken schließen“ entfällt auf dieser Seite (Lücken gibt es pro Fach und auf dem Heute-Screen).
- [ ] Auf einem iPhone (390 × 844) sind bei 5 Fächern Kopf, Prüfungs-Kacheln, „Alle Fächer mischen“ und alle Fachzeilen ohne Scrollen sichtbar.
- [ ] Jede Zeile und Kachel ist mindestens 44 px hoch.

### Fachseite (`/subjects/[code]`): Kopf
- [ ] Oben links steht ein Zurück-Pfeil zum Tab „Lernen“. Die Bottom-Navigation bleibt sichtbar, „Lernen“ ist aktiv.
- [ ] Der Kopf ist dezent in der Fachfarbe getönt und zeigt Fach-Icon, Kürzel, vollen Fachnamen, den Fortschritt des Fachs als Balken mit Prozent und die Zeile „{x} von {y} Themen gemeistert“.
- [ ] Der Klassenstufen-Umschalter ist auch hier sichtbar und mit dem Tab „Lernen“ synchron (dieselbe gespeicherte Wahl).
- [ ] Der Hauptbutton **„Fach gemischt lernen“** (Fachfarbe, volle Breite) startet eine Runde über alle Themen des Fachs mit der gewählten Klassenstufe.
- [ ] Hat der Azubi in diesem Fach offene Lücken, steht daneben bzw. darunter ein kleiner Button **„🎯 {n} Lücken“**, der `/quiz?subject={id}&mode=weak` startet. Bei 0 Lücken fehlt er.

### Fachseite: Themenpfad
- [ ] Die Themen erscheinen als Liste, **gruppiert nach Klassenstufe** („Klasse 10“, „Klasse 11“, …). Ist eine einzelne Klassenstufe gewählt, gibt es nur diese Gruppe ohne Gruppenüberschrift.
- [ ] Angezeigt werden nur Themen mit mindestens einer aktiven Frage in der jeweiligen Klassenstufe.
- [ ] Innerhalb einer Gruppe sind die Themen **natürlich sortiert**: Zahlen werden als Zahlen verglichen („Teil 2“ vor „Teil 10“, „Heft 1“ vor „Heft 2“), ohne Unterscheidung von Groß- und Kleinschreibung.
- [ ] Jede Themenzeile zeigt ein Zustands-Symbol, den Themennamen, einen dünnen Fortschrittsbalken und die Prozentzahl:
  - **Neu** (○, gedämpft): noch keine Frage dieses Themas beantwortet,
  - **Angefangen** (●, Fachfarbe): mindestens eine Frage beantwortet, aber unter 80 %,
  - **Gemeistert** (✓, Primary-Grün): mindestens 80 % der aktiven Fragen des Themas mindestens einmal richtig beantwortet.
- [ ] Fortschritt eines Themas = Anteil seiner aktiven Fragen (in dieser Klassenstufe), die der Azubi mindestens einmal richtig beantwortet hat.
- [ ] Genau ein Thema trägt die Markierung **„Weiter hier“**: das zuletzt gelernte, noch nicht gemeisterte Thema des Fachs. Gibt es keins, ist es das erste angefangene, noch nicht gemeisterte Thema in Pfad-Reihenfolge, sonst das erste neue Thema. Sind alle gemeistert, gibt es keine Markierung.
- [ ] **Ein Tap auf eine Themenzeile startet sofort** eine Lernrunde zu diesem Thema, mit der Klassenstufe der Gruppe, in der das Thema steht. Es gibt keinen Zwischenschritt.
- [ ] Jede Themenzeile ist mindestens 44 px hoch und als Ganzes antippbar.

### Heute-Screen (Anpassung an PROJ-42)
- [ ] Ein Tap auf einen Fachring in „Deine Fächer“ öffnet die Fachseite `/subjects/{code}` statt des Themen-Sheets.

### Entfallende Elemente
- [ ] Das bisherige Bottom-Sheet zur Themenauswahl wird weder auf der Fächerseite noch auf dem Heute-Screen verwendet.
- [ ] Die bisherigen großen Fachkarten mit „Jetzt lernen“-Button entfallen.

### Gestaltung
- [ ] Dark Mode und Farben gemäß DESIGN.md. Fachfarben erscheinen nur als Akzent (Ring, Kopf-Tönung, Hauptbutton der Fachseite, Zustand „Angefangen“), nicht als fünf konkurrierende Buttons.
- [ ] Fortschrittsringe und -balken füllen sich beim Erscheinen kurz animiert (200 ms, ease-out).
- [ ] Ein gemeistertes Thema ist auf den ersten Blick erkennbar (Haken, grüner Balken).

## Edge Cases
- **Ganz neuer Azubi:** Alle Fächer stehen auf 0 %, alle Themen sind „Neu“, „Weiter hier“ steht am ersten Thema des Pfads.
- **Fach ohne aktive Fragen (in der gewählten Klassenstufe):** Die Fachzeile bleibt sichtbar, ist aber gedämpft mit dem Hinweis „Noch keine Fragen“ und nicht antippbar.
- **Fach ohne Themen bzw. nur Fragen ohne Thema:** Die Fachseite zeigt nur den Kopf mit „Fach gemischt lernen“ und den Hinweis „Für dieses Fach gibt es noch keine Themen“. Fragen ohne Thema werden nicht als eigenes Thema gelistet, sind aber in „Fach gemischt lernen“ enthalten.
- **Thema mit Fragen in mehreren Klassenstufen** (derzeit 3 von 187): Es erscheint in jeder betroffenen Klassengruppe, jeweils mit eigenem Fortschritt für diese Klassenstufe.
- **Ungültiger oder fremder Fach-Link** (`/subjects/xyz` oder ein Fach eines anderen Fachbereichs): Weiterleitung auf `/subjects`.
- **Gespeicherte Klassenstufe existiert im Fachbereich nicht mehr** (z. B. nach dem Bereichswechsel eines Super-Admins, PROJ-29): Es gilt „Alle“.
- **Gerätespeicher nicht verfügbar** (privater Modus): Die Seite funktioniert, die Wahl gilt nur bis zum Neuladen.
- **Viele Fächer (z. B. 8 im Tourismus):** Die Fachliste scrollt vertikal, die übrigen Kriterien bleiben bestehen.
- **Thema wurde inzwischen deaktiviert oder hat keine aktiven Fragen mehr:** Es verschwindet aus dem Pfad. Für „Weiter hier“ gilt dann die nächste Regel.
- **Leistungsnachweis abgegeben, Lehrkraft schließt ihn erst später:** Er steht sofort in „Meine Leistungsnachweise“ mit „Note ausstehend“ und zeigt die Note nach der Freigabe.
- **Azubi hat nur Simulationen bzw. nur Leistungsnachweise:** Die jeweils andere Liste zeigt ihren leeren Zustand. Beide Kacheln bleiben sichtbar.
- **Fortschritt 100 % in allen Themen:** Der Kopf zeigt „Alle Themen gemeistert 🎉“, „Fach gemischt lernen“ bleibt nutzbar.

## Technical Requirements
- Keine Datenbank-Änderung. Der Fortschritt wird aus vorhandenen Antworten und der Themen-Zuordnung der Fragen berechnet, die Klassenstufen-Wahl liegt im Gerätespeicher.
- Die Fortschrittsberechnung (Fach, Thema, Zustand, „Weiter hier“, natürliche Sortierung) soll mit Unit-Tests abgesichert werden.
- Tab „Lernen“ und Fachseite sollen nicht spürbar langsamer laden als die heutige Fächerseite.
- Barrierefreiheit: Ringe und Balken haben einen Text-Gegenwert (z. B. „STG, 42 % gemeistert“), der Klassenstufen-Umschalter ist per Tastatur bedienbar.

## Non-Goals
- Kein Umbenennen oder Zusammenlegen der Themen. Uneinheitliche Namen wie „Luftfracht“ neben „Luftfracht Teil 1“ sind eine Inhaltsaufgabe im Admin-Bereich.
- Keine gesperrten Themen und keine Pflicht-Reihenfolge. Jedes Thema ist jederzeit startbar, der Pfad ist nur eine Empfehlung.
- Keine Änderung am Quiz-Ablauf, an XP, Streak oder Lücken-Logik.
- Keine Klassenstufe im Profil (kein neues Datenbankfeld).
- Kein neues Design der Prüfungssimulation selbst (Ablauf, Fragen, Ergebnisseite bleiben).
- Keine Benachrichtigung bei neu freigegebener Note. Das kann eine spätere Erweiterung werden.
- Keine Änderungen am Lehrkräfte-Bereich der Leistungsnachweise.

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)

### Seiten & Komponentenstruktur
```
Tab „Lernen“ (/subjects)                          [umgebaut]
+-- Titelzeile „Lernen“ + XP-Pill
+-- Klassenstufen-Umschalter (NEU, Segmented Control; auch auf der Fachseite)
+-- Prüfungs-Kacheln (NEU): „Prüfung üben“ → /exam · „Leistungsnachweise“ → /leistungsnachweise
+-- Zeile „Alle Fächer mischen“ → gemischte Runde
+-- Fachzeilen (NEU, eine pro Fach): Ring (Fachfarbe + Icon) · Kürzel/Name · % · Pfeil → /subjects/{code}

Fachseite (/subjects/[code])                      [NEU]
+-- Kopf in Fachfarbe: Zurück-Pfeil · Icon · Kürzel/Name · Fortschrittsbalken · „x von y Themen gemeistert“
+-- Klassenstufen-Umschalter (derselbe Baustein)
+-- „Fach gemischt lernen“ (Hauptbutton) · „🎯 n Lücken“ (nur wenn > 0)
+-- Themenpfad: Gruppen „Klasse 10 / 11 / …“
    +-- Themenzeile: Zustand ○/●/✓ · Name · dünner Balken · % · ggf. „Weiter hier“ → startet Runde

Prüfung üben (/exam)                              [erweitert]
+-- Simulation starten (wie bisher)
+-- „Meine Simulationen“ (NEU hier; Liste aus dem alten Prüfungsverlauf, nur Simulationen)
−   Link „Code für Leistungsnachweis eingeben“ entfällt

Leistungsnachweise (/leistungsnachweise)          [NEU]
+-- Code-Eingabe (bestehender Baustein der Seite /pruefung, unverändert)
+-- „Meine Leistungsnachweise“: Titel · Datum · Note bzw. „Note ausstehend“
+-- leerer Zustand

Weiterleitungen
+-- /exam-history  → /exam (Abschnitt „Meine Simulationen“)
+-- /pruefung      → /leistungsnachweise   (von Lehrkräften geteilte Links funktionieren weiter)
+-- /pruefung/[code] bleibt unverändert (Deep-Link, ohne Navigation)

Heute-Screen (/)                                  [kleine Änderung]
+-- Fachring → Link auf /subjects/{code} statt Themen-Sheet

Bottom-Navigation                                 [Regel ergänzt]
+-- „Lernen“ aktiv auch auf /subjects/{code} und /leistungsnachweise
```

Wegfallende Bausteine: die großen Fachkarten (`SubjectCard`), das Raster (`SubjectsGrid`), das Themen-Sheet (`SubjectSessionSheet`), die alte Klassen-Chip-Leiste der Fächerseite und die eigene Seite des Prüfungsverlaufs. Sie werden entfernt, sobald nichts mehr auf sie verweist.

### Woher die Werte kommen (alles vorhandene Daten)
- **Fachfortschritt (%):** Anteil der aktiven Lernfragen des Fachs, die der Azubi schon mindestens einmal richtig beantwortet hat. Bei gewählter Klassenstufe zählen die Fragen dieser Klassenstufe **plus Fragen ohne Klassenstufe**, so wie das Quiz bereits filtert. Bei „Alle“ entspricht der Wert genau dem Fachring auf dem Heute-Screen.
- **Themenfortschritt (%) und Zustand:** dieselbe Rechnung pro Thema und Klassenstufe. „Neu“ heißt, keine Frage des Themas wurde je beantwortet. „Angefangen“ heißt, mindestens eine wurde beantwortet. „Gemeistert“ gilt ab 80 % richtig.
- **Klassengruppen:** Jedes Thema erscheint in den Klassenstufen, aus denen es Fragen hat. Stand 22.10.2026 haben alle Fragen mit Thema eine Klassenstufe. Die 41 Fragen ohne Klassenstufe haben kein Thema und laufen nur über „Fach gemischt lernen“.
- **„Weiter hier“:** Grundlage ist die zuletzt abgeschlossene Lernrunde in diesem Fach. Stammten alle ihre Fragen aus einem Thema, ist das das Thema der Markierung, sofern es nicht gemeistert ist. Dieselbe Erkennung nutzt „Weiterlernen“ auf dem Heute-Screen. Sonst gilt die Ersatzregel aus der Spec.
- **Lücken pro Fach:** die bestehende Lücken-Berechnung, eingeschränkt auf die Fragen dieses Fachs.
- **Meine Simulationen / Meine Leistungsnachweise:** dieselben Prüfungs-Sitzungen wie im bisherigen Verlauf, getrennt danach, ob die Sitzung zu einem Leistungsnachweis gehört. Note und Freigabe-Status liegen schon heute an der Sitzung.

### Entscheidungen
- **Klassenstufe als Cookie statt im Browser-Speicher:** Beides wird nur auf dem Gerät gespeichert. Ein Cookie kann der Server aber schon beim ersten Laden lesen. So erscheinen Prozentwerte und Themenliste sofort richtig und springen nicht erst nach dem Laden von „Alle“ auf „Klasse 10“. Der Umschalter setzt das Cookie und lädt die Seite neu. Ein ungültiger Wert (Klassenstufe gibt es im Bereich nicht) zählt als „Alle“.
- **Fachseite als eigene, servergerenderte Seite statt Sheet:** Daten und Fortschritt werden in einem Durchgang auf dem Server berechnet. Das bisherige Nachladen der Themen beim Öffnen des Sheets entfällt, Zurück-Button und Teilen funktionieren. Die Adresse nutzt das Fach-Kürzel (z. B. `/subjects/stg`). Ein fremdes oder unbekanntes Kürzel führt zurück zu `/subjects`.
- **Reine Rechenfunktionen in einer eigenen Datei** (Fortschritt, Zustand, Gruppierung, „Weiter hier“, natürliche Sortierung). Sie sind ohne Seite per Unit-Test prüfbar, wie bei PROJ-42 (`home-today`). Die natürliche Sortierung nutzt den eingebauten deutschen Zeichenvergleich mit Zahlenerkennung, dafür ist kein Paket nötig.
- **Wiederverwendung:** Fortschrittsring (aus den Heute-Fachringen), Code-Eingabe für Leistungsnachweise, Listeneinträge des alten Prüfungsverlaufs (aufgeteilt in zwei Listen), Lücken-Berechnung und Themen-Erkennung der letzten Runde.
- **Zurück-Pfeil der Ergebnisseite:** Er richtet sich danach, ob die Sitzung ein Leistungsnachweis ist (→ `/leistungsnachweise`) oder eine Simulation (→ `/exam`).
- **Ladezeit:** Der Tab „Lernen“ lädt dieselben Daten wie heute (Fächer, Antworten, Fragen-Fach-Zuordnung), zusätzlich nur die Klassenstufe pro Frage. Die Fachseite lädt die aktiven Fragen eines Fachs (max. ca. 1.300) mit Thema und Klassenstufe, dazu die Themennamen und die eigenen Antworten.

### Daten
Keine neuen Tabellen oder Felder, keine Migration. Neu ist nur ein Cookie auf dem Gerät mit der gewählten Klassenstufe (z. B. „10“ oder leer für „Alle“).

### Pakete
Keine neuen.

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
