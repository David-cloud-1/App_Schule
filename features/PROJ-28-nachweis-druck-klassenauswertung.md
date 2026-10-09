# PROJ-28: Leistungsnachweis – Druck & Klassenauswertung

## Status: Approved
**Created:** 2026-10-07
**Last Updated:** 2026-10-07

## Dependencies
- Requires: PROJ-21 (Benotete Leistungsnachweise) — Ergebnisse, Noten, Teilnehmerliste, Fehlerquote pro Frage
- Requires: PROJ-24 (Rechtetrennung) — nur Admins des eigenen Fachbereichs
- Unabhängig von PROJ-27 (kann vor oder nach der neuen Fragen-Zusammenstellung gebaut werden)

## Summary
Der Ausbilder kann zu einem Leistungsnachweis **ausdrucken oder als PDF speichern**: die **Einzelauswertung je Schüler** und die **Klassenauswertung** (Notenliste plus Statistik). Umgesetzt als eigene, für Papier gesetzte Druckansicht; Drucken und „Als PDF sichern" laufen über den Druckdialog des Browsers. Kein PDF-Server, keine neue Bibliothek.

## User Stories
- Als **Ausbilder** möchte ich die Auswertung eines einzelnen Schülers ausdrucken oder als PDF sichern, damit ich sie ihm aushändigen oder in die Akte legen kann.
- Als **Ausbilder** möchte ich alle Einzelauswertungen auf einmal drucken (je Schüler eine Seite), damit ich sie nach der Besprechung verteilen kann.
- Als **Ausbilder** möchte ich eine Klassenübersicht mit Notenliste und Statistik drucken oder speichern, damit ich sie für Notenheft, Konferenz oder Elterngespräch habe.
- Als **Ausbilder** möchte ich in der Statistik sehen, wie die Noten verteilt sind und welche Fragen schwach gelöst wurden, damit ich den Unterricht danach ausrichten kann.
- Als **Fachbereichs-Admin** möchte ich nur Auswertungen meines Fachbereichs drucken können.

## Acceptance Criteria

### Einzelauswertung (pro Schüler)
- [ ] In der Teilnehmerliste eines Nachweises gibt es je abgegebenem Teilnehmer die Aktion „Drucken / Als PDF".
- [ ] Die Druckseite zeigt: Titel des Nachweises, Fachbereich/Teil, Datum, Klarname des Schülers, Punkte (erreicht/gesamt), Prozent, **Note** und den verwendeten Notenschlüssel.
- [ ] Sie listet jede Frage mit Fragetext, der gegebenen Antwort, der richtigen Antwort und Markierung richtig/falsch/nicht beantwortet. Erklärungen werden nur gedruckt, wenn der Ausbilder das in der Druckansicht einschaltet.
- [ ] Die Seite ist für A4 gesetzt (saubere Seitenumbrüche, keine abgeschnittenen Fragen) und druckt hell auf Papier, auch wenn die App im Dark Mode läuft.
- [ ] Nicht abgegebene (laufende) Teilnehmer lassen sich nicht drucken; ein ausgeschlossener Teilnehmer (`excluded_from_grading`) wird als „von der Wertung ausgeschlossen" gekennzeichnet statt mit Note.
- [ ] Ein Button öffnet den Druckdialog des Browsers; „Als PDF sichern" ist dort wählbar. Ein Hinweis in der Oberfläche erklärt das in einem Satz.
- [ ] „Alle Einzelauswertungen drucken" erzeugt eine Druckansicht mit einer Seite (oder Seitenfolge) je abgegebenem Teilnehmer, alphabetisch sortiert.

### Klassenauswertung
- [ ] Im Nachweis gibt es die Aktion „Klassenauswertung drucken / als PDF".
- [ ] Die Druckseite enthält: Titel, Datum, Teil/Fachbereich, Anzahl Teilnehmer (abgegeben / ausgeschlossen), Notenschlüssel.
- [ ] **Notenliste:** alle gewerteten Schüler mit Name, Punkte, Prozent, Note; alphabetisch sortiert; ausgeschlossene Teilnehmer getrennt am Ende.
- [ ] **Statistik:** Notenspiegel (Anzahl je Note 1–6, als Tabelle und einfache Balkengrafik), Notendurchschnitt, Bestanden-Quote (Anteil Note 1–4), beste und schlechteste Note, durchschnittliche Prozentzahl.
- [ ] **Fragenanalyse:** je Frage die Lösungsquote in Prozent, sortiert von schwächster zu stärkster (aufbauend auf der Fehlerquote aus PROJ-21).
- [ ] Die Ansicht druckt hell, ist für A4 gesetzt, die Notenliste bricht bei vielen Teilnehmern sauber auf Folgeseiten um (Tabellenkopf wird wiederholt).
- [ ] Der bestehende CSV-Export bleibt unverändert daneben bestehen.

### Zugriff und Zeitpunkt
- [ ] Beide Ansichten sind nur für angemeldete Admins des Fachbereichs des Nachweises erreichbar; fremde Nachweise liefern „Nicht gefunden"/„Verboten".
- [ ] Druck ist erst möglich, wenn mindestens ein Teilnehmer abgegeben hat. Vor der Freigabe der Ergebnisse an die Klasse ist der Druck für den Ausbilder trotzdem möglich (Ausbilder-Sicht).
- [ ] Die Druckansichten erscheinen in keiner Azubi-Ansicht.

## Edge Cases
- Nachweis ohne abgegebene Teilnehmer: Aktion deaktiviert mit Hinweis „Noch keine Abgaben".
- Nachweis noch offen, es schreiben noch Schüler: Druck zeigt nur bereits Abgegebene; ein Hinweis nennt, wie viele noch fehlen. Statistik ist in diesem Zustand als „Zwischenstand" gekennzeichnet.
- Sehr lange Namen oder Fragetexte: werden umgebrochen, nicht abgeschnitten.
- Sehr viele Teilnehmer (z. B. 40): Sammeldruck bleibt bedienbar, jede Einzelauswertung beginnt auf einer neuen Seite.
- Frage wurde nach dem Nachweis deaktiviert oder bearbeitet: Auswertung nutzt den eingefrorenen Snapshot; fehlt eine Frage in der Datenbank, wird eine Platzhalterzeile gedruckt statt eines Absturzes.
- Teilnehmer hat nichts beantwortet: Note nach Schlüssel (alle Fragen falsch), Antworten als „nicht beantwortet" gedruckt.
- Notenschlüssel wurde nach der Abgabe geändert: es zählt der Schlüssel, der in der Benotung des Nachweises gilt; der gedruckte Schlüssel entspricht dem verwendeten.
- Klarnamen sind personenbezogen: Druckseite trägt keinen Link, der Teilnehmer-Daten an Dritte öffnen würde; Auswertung wird nur im Admin-Login geladen.
- Browser kann nicht drucken (z. B. In-App-Browser am Smartphone): Hinweis, die Seite im normalen Browser zu öffnen.

## Technical Requirements
- Keine neue Abhängigkeit; Druck-Layout über eigene Druck-Styles (A4, Seitenumbruch-Regeln, helle Farben).
- Die Druckansichten laden die Daten serverseitig mit denselben Rechteprüfungen wie die bestehende Ergebnisansicht (Fachbereichsprüfung vor jedem Service-Client-Zugriff).
- Hinweis zum Design: Druckseiten sind eine bewusste Ausnahme von „Dark Mode only" aus dem Design-System, weil sie für Papier gedacht sind.
- Performance: Klassenauswertung für 40 Teilnehmer und 40 Fragen lädt in unter 2 Sekunden.

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)

**Ergebnis der Bestandsaufnahme:** Fast alle Zahlen für die Klassenauswertung gibt es schon. Die bestehende Ergebnis-Abfrage des Nachweises liefert Teilnehmer mit Punkten und Note, die Notenverteilung samt Durchschnitt und Bestanden-Quote sowie je Frage, wie viele richtig lagen. Es wird also **keine neue Berechnung** gebaut, nur eine neue Darstellung. Neu gelesen werden muss nur eines: die einzelnen Antworten eines Schülers. Die liegen als Antwort-Protokoll in der Teilnehmer-Sitzung und werden heute nur zur Berechnung genutzt, aber nicht angezeigt.

### A) Komponenten-Struktur

```
Nachweis-Detailseite (besteht)
+-- Tab "Teilnehmer" (besteht)
|   +-- NEU: Drucken-Knopf pro abgegebenem Teilnehmer
|   +-- NEU: Knopf "Alle Einzelauswertungen drucken"
|   +-- CSV-Export (besteht, unverändert)
+-- Tab "Noten" (besteht)
|   +-- NEU: Knopf "Klassenauswertung drucken / als PDF"
+-- Tab "Fragen" (besteht)

Druckseite "Einzelauswertung" (neu, eigene Seite)
+-- Kopf: Titel, Teil/Fachbereich, Datum, Klarname
+-- Ergebnis-Kasten: Punkte, Prozent, Note, Notenschlüssel
+-- Fragenliste: Fragetext, gegebene Antwort, richtige Antwort, Markierung
+-- Schalter (nur am Bildschirm): "Erklärungen mitdrucken"
+-- Knopf "Drucken / Als PDF sichern" (nur am Bildschirm)

Druckseite "Alle Einzelauswertungen" (neu)
+-- dieselbe Auswertung, je Schüler eine neue Seite, alphabetisch

Druckseite "Klassenauswertung" (neu)
+-- Kopf: Titel, Datum, Teilnehmerzahl, Notenschlüssel
+-- Notenliste (Tabellenkopf wiederholt sich auf Folgeseiten)
+-- Statistik-Kasten: Notenspiegel (Tabelle + einfache Balken), Durchschnitt,
|   Bestanden-Quote, beste/schlechteste Note
+-- Fragenanalyse: Lösungsquote je Frage, schwächste zuerst
+-- Hinweis "Zwischenstand" falls noch jemand schreibt
```

Die Druckseiten blenden die Admin-Kopfleiste und alle Knöpfe beim Drucken aus. Am Bildschirm sieht der Ausbilder eine Vorschau und den Drucken-Knopf. Die Gestaltung ist hell auf weißem Grund, weil sie für Papier gedacht ist.

### B) Datenmodell (in normaler Sprache)

**Es werden keine neuen Daten gespeichert.** Keine neue Tabelle, keine Datenbank-Änderung, keine Migration.

Gelesen werden:
- vom Nachweis: Titel, Teil, Datum, Notenschlüssel
- von jedem Teilnehmer: Klarname, abgegeben ja/nein, von der Wertung ausgeschlossen ja/nein, Antwort-Protokoll
- vom Antwort-Protokoll je Frage: Fragetext, alle Antwortmöglichkeiten, was der Schüler angekreuzt hat, ob richtig

Erklärungen zu den Fragen liegen nach der Bewertung ebenfalls vor und werden nur auf Wunsch gedruckt.

### C) Tech-Entscheidungen (begründet)

- **Browser-Druckdialog statt PDF-Datei:** Entschieden mit dem Nutzer. Kostenlos, keine neue Software auf dem Server, und "Als PDF sichern" steckt in jedem Browser. Wir kontrollieren dafür das Papierformat und die Seitenumbrüche selbst.
- **Eigene Druckseiten statt den Bildschirm auszudrucken:** Die normale Admin-Ansicht ist dunkel, mit Tabs und Knöpfen. Eine eigene Seite mit nur dem Inhalt liefert saubere Ausdrucke und ist einfacher zu testen.
- **Bestehende Berechnung wiederverwenden:** Notenspiegel, Durchschnitt und Lösungsquote kommen aus derselben Quelle wie die Bildschirmansicht. Dadurch stehen auf dem Papier garantiert dieselben Zahlen wie in der App. Das vermeidet zwei abweichende Rechenwege.
- **Neue Abfrage nur für die Einzelantworten, mit denselben Rechten wie die bestehenden Nachweis-Abfragen:** Vor jedem Zugriff wird geprüft, dass der Nachweis zum Fachbereich des Admins gehört. Damit kann ein Admin eines anderen Fachbereichs weder sehen noch drucken, was nicht seine Klasse ist. Klarnamen sind personenbezogen und bleiben hinter dem Admin-Login.
- **Sammeldruck in einer Seite statt vieler Einzelaufrufe:** Alle Einzelauswertungen werden in einem Zug geladen. Ein Druckdialog genügt, je Schüler beginnt eine neue Seite.
- **Ausgeschlossene und laufende Teilnehmer:** Ausgeschlossene werden gekennzeichnet statt benotet. Laufende lassen sich nicht drucken. Läuft noch jemand, wird die Statistik als "Zwischenstand" markiert.
- **Hinweis zum Design-System:** Der Dark-Mode-Grundsatz gilt am Bildschirm weiter. Nur die Druckseiten sind bewusst eine hell gestaltete Ausnahme.

### D) Abhängigkeiten (neue Pakete)

Keine.

### E) Aufteilung der Arbeit

- **Frontend:** drei Druckseiten, die neuen Knöpfe in den Tabs, Druck-Styles (A4, Seitenumbrüche, helle Farben, Kopfleiste ausblenden).
- **Backend:** eine neue Abfrage für die Einzelantworten eines oder aller Teilnehmer, inkl. Fachbereichsprüfung und Tests. Die Klassenauswertung nutzt die bestehende Ergebnis-Abfrage unverändert.
- **Reihenfolge:** zuerst Backend (kleine Abfrage), dann Frontend. Das Gerüst der Druckseiten lässt sich auch parallel dazu mit den vorhandenen Daten bauen.

### F) Offene Punkte für die Umsetzung

- Wie sieht die Fragenanalyse bei Fragen aus, auf die niemand geantwortet hat? (Vorschlag: Lösungsquote 0 %, mit Hinweis "nicht beantwortet".)
- Soll beim Sammeldruck auch ein Deckblatt mit der Klassenauswertung dabei sein? (Vorschlag: nein, getrennte Knöpfe, damit die Schüler-Seiten nur ihre Daten enthalten.)
- Funktioniert der Druck in In-App-Browsern am Smartphone nicht zuverlässig, ersetzt ein Hinweis den Knopf. Das ist ein bekannter Kompromiss der Browser-Lösung.

## Implementation Notes (Backend)

**Stand 2026-10-07 — Backend gebaut, Frontend (Druckseiten) steht noch aus.** Keine Datenbank-Änderung, keine Migration, keine neue Abhängigkeit.

**Neu:**
- `GET /api/admin/assessments/[id]/reports` — liefert die Einzelauswertungen für die Druckansicht: Kopfdaten des Nachweises (Titel, Teil, Code, Zeitfenster, Status, Notenschlüssel), je abgegebenem Teilnehmer Name, Punkte, Prozent, Note und alle Fragen mit allen Antwortoptionen (`selected` / `isCorrect`), Ergebnis je Frage (`correct` / `wrong` / `unanswered`) und Erklärung. Ohne Parameter alle Abgaben (Sammeldruck, alphabetisch nach Namen, deutsche Sortierung), mit `?sessionId=<uuid>` genau eine. Zusätzlich `stillWriting` = Zahl der noch schreibenden Teilnehmer, für den "Zwischenstand"-Hinweis.
- `buildStudentReports` in `src/lib/graded-assessments.ts` — reine Aufbereitung auf Basis der bereits bewerteten Zeilen (`applyGrading`). Punkte und Note stammen aus derselben Funktion wie Teilnehmerliste und CSV (`buildParticipantRows`), dadurch gibt es keinen zweiten Rechenweg.

**Verhalten:**
- Fachbereichsprüfung (`assertCanAdminDepartment`) läuft **vor** dem ersten Service-Client-Zugriff; fremder Bereich → 404.
- Laufende Teilnehmer fehlen im Sammeldruck; mit `sessionId` angefragt → 409.
- Ausgeschlossene Teilnehmer erscheinen mit `excluded: true`, ohne Punkte, Note und Fragen.
- Ungültige `sessionId` → 400, unbekannte → 404, nicht angemeldet → 401, kein Admin → 403.
- Die Klassenauswertung braucht keine neue Route: Notenliste, Notenspiegel, Durchschnitt, Bestanden-Quote und Lösungsquote je Frage kommen aus der bestehenden `/results`-Abfrage.

**Abweichung von der Spec:** Eine Frage, die nach dem Nachweis aus der Datenbank gelöscht wurde, erscheint nicht als Platzhalterzeile, sondern entfällt — wie schon in der Benotung (PROJ-21: "fällt für alle gleich aus der Wertung"). Sonst würde der Ausdruck Fragen zeigen, die nicht in der Note stehen.

**Tests:** 5 neue Fälle für `buildStudentReports` (richtig/falsch/unbeantwortet, Optionsreihenfolge, Gleichheit mit Teilnehmerliste, laufende ausgelassen, Ausgeschlossene, Sortierung) und 9 für die Route (401, 403, 400, 404, fremder Bereich ohne Service-Client-Zugriff, 404/409 bei Einzelabruf, Sammelabruf, kein Schlüssel im Kopf). Gesamte Suite 589/589 grün, `tsc` ohne Fehler außerhalb von `scripts/scratch/`.

**Offen:** `npm run build` bricht aktuell an der nicht eingecheckten Datei `scripts/scratch/fragen-pipeline/kopf.ts` ab (Syntaxfehler, nicht Teil dieses Features). Der Build lässt sich nach dem Aufräumen oder Ausschließen dieses Ordners erneut prüfen.

## Implementation Notes (Frontend)

**Stand 2026-10-07 — Frontend gebaut.** Geprüft per `tsc` (ohne Fehler), vollständigem Testlauf (589/589 grün) und `npm run build` (fehlerfrei, beide neuen Seiten als Routen erzeugt). Der Build lief nur, nachdem der nicht eingecheckte Ordner `scripts/scratch/` kurz aus dem Projekt genommen wurde (Syntaxfehler in `fragen-pipeline/kopf.ts`, nicht Teil dieses Features); der Ordner liegt unverändert wieder am Platz. `npm run lint` lässt sich weiterhin nicht ausführen (ESLint-9-Konfiguration, bekannt aus PROJ-26).

**Gebaut:**
- `src/components/admin/assessment-print.tsx` — gemeinsame Bausteine: `PrintToolbar` (nur am Bildschirm: Zurück, „Drucken / Als PDF sichern", Hinweistext zu Druckdialog und In-App-Browsern, setzt `@page` auf A4 nur solange eine Druckseite offen ist), `StudentReportSheet`, `ClassReportSheet`, Datums- und Notenschlüssel-Formatierung (Zeitzone Europe/Berlin).
- `/admin/leistungsnachweise/[id]/druck/einzeln` — ohne Parameter alle Abgaben (je Schüler eine neue Seite, alphabetisch), mit `?sessionId=` genau eine. Schalter „Erklärungen mitdrucken" (Standard aus). Zeigt, wie viele noch schreiben und hier fehlen.
- `/admin/leistungsnachweise/[id]/druck/klasse` — Notenliste (Tabellenkopf wiederholt sich auf Folgeseiten), Statistik (Ø-Note, Bestanden-Quote, beste/schlechteste Note, Ø-Prozent, Notenspiegel als Tabelle mit Balken), Fragenanalyse (schwächste zuerst), Kennzeichnung „Zwischenstand", falls noch jemand schreibt. Ausgeschlossene Teilnehmer stehen getrennt am Ende.
- `src/app/admin/layout.tsx` — Kopfleiste, Tabs und dunkler Hintergrund entfallen beim Drucken (`print:`-Varianten); am Bildschirm unverändert.
- Detailseite des Nachweises — Drucken-Symbol je abgegebenem Teilnehmer, Knöpfe „Klassenauswertung drucken" und „Alle Einzelauswertungen" im Tab Teilnehmer, „Klassenauswertung drucken" zusätzlich im Tab Notenspiegel. Alle drei sind ohne Abgaben deaktiviert; laufende Teilnehmer haben kein Drucken-Symbol. CSV-Export unverändert.

**Entscheidungen zu den offenen Punkten aus dem Tech Design:**
- Fragen ohne richtige Antwort erscheinen mit 0 %; einen eigenen Hinweis „nicht beantwortet" gibt es nicht, weil die Auswertung „alle falsch" und „niemand hat geantwortet" nicht unterscheidet (unbeantwortet zählt als falsch).
- Kein Deckblatt im Sammeldruck: Klassen- und Einzelauswertung bleiben getrennte Knöpfe.

**Barrierefreiheit:** Richtig/falsch wird nicht nur über Farbe getragen — Symbol (✓ ✗ –) plus Text, Antwortoptionen mit „(gewählt)" und „(richtige Antwort)"; Drucken-Symbole haben einen sprechenden `aria-label`.

**Noch nicht möglich:** Prüfung der echten Druckvorschau im Browser (Seitenumbrüche, Zeilenumbrüche langer Fragetexte, PDF-Speichern). In dieser Umgebung steht kein Browser zur Verfügung und `npm run dev` ist auf der Maschine nicht nutzbar (bekannt). Ein kurzer manueller Test durch den Nutzer wird vor `/qa` empfohlen: Nachweis mit mehreren Abgaben öffnen, Einzel-, Sammel- und Klassendruck in die Vorschau/als PDF schicken.

## QA Test Results

**Tested:** 2026-10-09
**Tester:** QA (AI) — Code gegen jedes Akzeptanzkriterium geprüft, `npm test` (703/703 grün, davon 14 neue Komponenten-Tests für die Druckblätter), `tsc` ohne Fehler, `npm run build` fehlerfrei (im getrennten Checkout des committeten Stands).
**Nicht getestet:** die **echte Druckvorschau im Browser** (Seitenumbrüche, Zeilenumbrüche langer Fragetexte, „Als PDF speichern"), Responsive (375/768/1440 px) und Cross-Browser. Dev-Server und Browser-Tests sind auf dieser Maschine ausgeschlossen. Layout-Regeln (A4, `break-after-page`, `break-inside-avoid`, wiederholter Tabellenkopf) sind im Code vorhanden und per Test auf ihr Vorhandensein geprüft, aber nicht visuell.

### Acceptance Criteria Status

#### Einzelauswertung
- [x] „Drucken / Als PDF" je abgegebenem Teilnehmer (Symbol in der Teilnehmerliste, nur bei `completed`)
- [x] Kopf: Titel, Teil, Datum, Klarname, Punkte, Prozent, Note, Notenschlüssel (Test)
- [x] Jede Frage mit gegebener und richtiger Antwort, Markierung richtig/falsch/nicht beantwortet in **Text und Symbol**, nicht nur Farbe (Test)
- [x] Erklärungen nur auf Wunsch (Schalter, Standard aus; Test)
- [x] A4 (`@page`), helle Darstellung auch bei Dark Mode (weißes Blatt, Admin-Kopfleiste/Hintergrund per `print:`-Varianten entfernt)
- [x] Laufende Teilnehmer nicht druckbar (kein Symbol; Route antwortet 409), Ausgeschlossene als „Von der Wertung ausgeschlossen" statt Note (Test)
- [x] Druckdialog-Knopf mit Hinweis zu „Als PDF speichern" und zu In-App-Browsern
- [x] „Alle Einzelauswertungen": eine Seite je Teilnehmer (`break-after-page`, letzte ohne), alphabetisch mit deutscher Sortierung (Lib- und Komponenten-Test)

#### Klassenauswertung
- [x] Aktion im Tab „Teilnehmer" und „Notenspiegel"
- [x] Kopf: Titel, Datum, Teil, gewertet/ausgeschlossen, Notenschlüssel (Test)
- [x] Notenliste alphabetisch, Ausgeschlossene getrennt am Ende (Test)
- [x] Statistik: Notenspiegel als Tabelle + Balken, Ø-Note (Dezimalkomma), Bestanden-Quote, beste/schlechteste Note, Ø-Prozent (Test)
- [x] Fragenanalyse: Lösungsquote, schwächste zuerst (Test)
- [x] Tabellenkopf wiederholt sich auf Folgeseiten (`table-header-group`, Test)
- [x] CSV-Export unverändert

#### Zugriff und Zeitpunkt
- [x] Nur Admins des Fachbereichs: Reports-Route prüft den Bereich **vor** dem Service-Client-Zugriff (fremder Bereich → 404; Route-Tests); die Klassenauswertung nutzt die bestehenden, per RLS bereichsgebundenen Routen
- [x] Druck erst ab einer Abgabe möglich (Knöpfe deaktiviert, Druckseite zeigt „Noch keine Abgaben"); vor der Freigabe an die Klasse trotzdem druckbar
- [x] Nur unter `/admin`, in keiner Azubi-Ansicht (Admin-Proxy + `requireAdmin`)

### Edge Cases Status
- [x] Keine Abgaben → Aktion deaktiviert
- [x] Es schreiben noch Schüler → Hinweis „x schreiben noch und fehlen hier" im Sammeldruck, „Zwischenstand" in der Klassenauswertung (Test)
- [x] Lange Namen/Fragetexte werden umgebrochen (kein `truncate`)
- [x] Frage nach dem Nachweis gelöscht → entfällt wie in der Benotung (bewusste Abweichung, siehe Backend-Notizen)
- [x] Nichts beantwortet → Note nach Schlüssel, Antworten als „nicht beantwortet" (Test)
- [x] Klarnamen nur hinter dem Admin-Login, kein Link, der Daten an Dritte öffnet
- [ ] Druck-Vorschau der Seitenumbrüche bei 40 Teilnehmern — nicht visuell geprüft (siehe oben)

### Security Audit Results
- [x] Alle Routen verlangen Login + Admin-Rolle; Zod/UUID-Prüfung der `sessionId` (400 bei ungültig)
- [x] Fachbereichsprüfung vor jedem Service-Client-Zugriff; fremder Bereich → 404 ohne Zugriff (Route-Test)
- [x] Der Antwortschlüssel kommt nur in der Admin-Antwort vor, nie an Azubis
- [x] Keine neue Abhängigkeit, keine Datenbank-Änderung, keine neuen Umgebungsvariablen

### Bugs Found

#### BUG-1: Abgegebener Teilnehmer ohne Wertung verschwindet aus der Klassen-Notenliste (Low, nicht behoben)
- Hat eine Abgabe keine bewertbaren Fragen (nur möglich, wenn alle Fragen des Nachweises nachträglich gelöscht wurden), hat sie keine Note und erscheint weder in der Notenliste noch unter „ausgeschlossen". Im Normalfall (mindestens 5 Fragen beim Beitritt) tritt das nicht auf; nicht blockierend.

### Summary
- **Acceptance Criteria:** alle erfüllt, soweit ohne Browser prüfbar
- **Bugs Found:** 1 (Low, akzeptiert)
- **Security:** keine offenen Lücken
- **Production Ready:** YES — mit der Empfehlung, nach dem Deploy einmal mit einem echten Nachweis die Druckvorschau zu öffnen (Einzel, Sammel, Klasse) und als PDF zu speichern. Es sind reine Admin-Seiten ohne Daten- oder Rechte-Änderung; das Risiko beschränkt sich auf die optische Darstellung beim Drucken.


## Deployment
_To be added by /deploy_
