# PROJ-82: Gemeldete Fragen direkt in der Inbox prüfen, bearbeiten und abschließen

## Status: Deployed
**Created:** 2026-11-09
**Last Updated:** 2026-11-09

## Dependencies
- Requires: PROJ-73 (Meldungs-Inbox) — Inbox, Claim und Abschluss-Funktion `close_question_reports` werden weiterverwendet
- Requires: PROJ-72 (Frage melden) — liefert Grund, Freitext und gewählte Antwort
- Requires: PROJ-47 (Änderungsverlauf) — Korrektur wird dort protokolliert und mit dem Abschluss verknüpft
- Requires: PROJ-45 (Lehrkräfte-Arbeitsbereich) — Design, Zustände, Touch-Größen

## Summary
Heute führt eine Meldung über fünf Stationen: Inbox → „Frage öffnen“ (Fragenliste) → Frage aufklappen → Bearbeiten-Dialog → zurück zur Inbox → „Abschließen“. Künftig öffnet ein Klick auf „Prüfen“ einen großen Dialog **in der Inbox**, in dem Meldung, Frage, Bearbeitung und Abschluss zusammenstehen. Danach geht es automatisch mit der nächsten offenen Meldung weiter.

## User Stories
- Als **Lehrkraft** möchte ich Meldung und Frage nebeneinander sehen (inkl. der vom Azubi gewählten Antwort), damit ich ohne Suchen beurteilen kann, ob die Meldung berechtigt ist.
- Als **Lehrkraft** möchte ich die Frage im selben Dialog korrigieren, damit ich die Inbox nicht verlassen muss.
- Als **Lehrkraft** möchte ich mit einem Klick speichern und die Meldung als „Korrigiert“ abschließen, damit kein zweiter Weg nötig ist.
- Als **Lehrkraft** möchte ich unberechtigte Meldungen mit einem Klick als „Frage ist korrekt“ schließen (mit Textbaustein), damit das Aussortieren schnell geht.
- Als **Lehrkraft** möchte ich nach dem Abschluss direkt die nächste offene Meldung sehen, damit ich einen Stapel zügig abarbeiten kann.
- Als **Kollegin/Kollege** möchte ich sehen, dass eine Meldung gerade geprüft wird, damit wir nicht doppelt arbeiten.

## Acceptance Criteria

### Öffnen
- [ ] In jeder offenen Zeile der Inbox gibt es „Prüfen“ als Hauptaktion (ersetzt „Frage öffnen“ + „Abschließen“ in der Zeile). Es öffnet den Prüf-Dialog über der Inbox, die Seite wird nicht gewechselt.
- [ ] Beim Öffnen wird die Meldung automatisch beansprucht („Du prüfst“, wie in PROJ-73). Ist sie bei jemand anderem in Prüfung, steht oben ein Hinweis „Wird gerade von … geprüft“, Öffnen bleibt möglich.
- [ ] Der Dialog nutzt auf dem Handy die volle Höhe, auf dem Laptop zwei Spalten.

### Inhalt des Dialogs
- [ ] **Meldung:** alle Einzelmeldungen mit Grund, Freitext, Datum und der vom Melder gewählten Antwort.
- [ ] **Frage:** Fragetext, alle Antworten mit Richtig-Markierung, Erklärung, Fach, Thema, Klasse.
- [ ] **Bearbeiten:** das bestehende Fragenformular (gleiche Felder und Prüfungen wie in der Fragenliste), vorbefüllt. Keine zweite, abweichende Bearbeitungslogik.
- [ ] **Abschluss-Leiste** unten, immer sichtbar: „Speichern & als korrigiert abschließen“ (Hauptaktion, grün), „Frage ist korrekt“ (outline), „Frage entfällt“ (outline), „Später“ (schließt den Dialog, Claim bleibt).
- [ ] Eine Rückmeldung an die Melder (höchstens 200 Zeichen, Textbausteine wie in PROJ-73, „still schließen“ möglich) lässt sich in der Abschluss-Leiste eingeben.

### Abschlussarten
- [ ] **Speichern & als korrigiert abschließen:** speichert die Frage, danach wird `close_question_reports` mit „Korrigiert“ aufgerufen. Belohnung, Rückmeldung und Verknüpfung zum Änderungsverlauf laufen wie in PROJ-73.
- [ ] Wurde im Formular nichts geändert, ist der Button deaktiviert mit Hinweis „Noch nichts geändert“ (Abschluss ohne Änderung ist „Frage ist korrekt“).
- [ ] **Frage ist korrekt:** schließt als „Nicht übernommen“, ohne Speichern; Pflicht-Kurzbegründung per Textbaustein oder frei.
- [ ] **Frage entfällt:** Die Frage wird deaktiviert (nicht gelöscht, nach AlertDialog), die Meldung wird als „Frage entfällt“ geschlossen, ohne Belohnung.
- [ ] Alle Abschlüsse werden wie bisher protokolliert (wer, wann, Ergebnis).

### Fehlerfall (kritisch)
- [ ] Schlägt das **Speichern** fehl (Validierung, Netz, Rechte), wird die Meldung **nicht** geschlossen. Der Dialog bleibt offen, Eingaben bleiben erhalten, eine verständliche Fehlermeldung erscheint.
- [ ] Schlägt nach erfolgreichem Speichern das **Abschließen** fehl, bleibt die gespeicherte Änderung bestehen, der Dialog zeigt „Frage gespeichert, Meldung noch offen – erneut abschließen“ mit Wiederholen-Button. Es entsteht keine doppelte Änderung im Verlauf.
- [ ] Doppelklick auf Abschluss-Buttons löst nur einen Vorgang aus (Buttons während des Vorgangs gesperrt).

### Weiterarbeiten
- [ ] Nach erfolgreichem Abschluss zeigt ein Toast das Ergebnis, und der Dialog wechselt zur nächsten offenen Meldung der aktuellen Filter- und Sortieransicht. Ein Zähler „3 von 12“ zeigt den Fortschritt, „Zurück zur Liste“ beendet den Durchlauf.
- [ ] Ist keine offene Meldung mehr übrig, schließt der Dialog und die Inbox zeigt den Leerzustand.
- [ ] Dialog lässt sich per Escape schließen. Bei ungespeicherten Änderungen kommt zuerst eine Rückfrage (AlertDialog).

### Bestehendes bleibt
- [ ] „Frage öffnen“ (Link in die Fragenliste) bleibt als Nebenaktion im Aufklapp-Bereich erhalten.
- [ ] Sammel-Schließen (PROJ-73) und Reiter „Korrigiert“, „Nicht übernommen“, „Frage entfällt“ funktionieren unverändert; in diesen Reitern öffnet „Ansehen“ den Dialog schreibgeschützt.

## Edge Cases
- Eine Kollegin speichert die Frage, während ich sie bearbeite: Beim Speichern erscheint „Frage wurde inzwischen geändert“ mit Neu-Laden, nichts wird überschrieben.
- Meldung wurde inzwischen von jemand anderem geschlossen: Hinweis „Bereits abgeschlossen von …“, keine doppelte Belohnung, Dialog springt zur nächsten.
- Frage wurde zwischenzeitlich gelöscht: Dialog zeigt „Die Frage gibt es nicht mehr“, Meldung wird als „Frage entfällt“ geschlossen.
- Neue Meldung zur selben Frage kommt während der Prüfung hinein: Beim Abschluss werden nur die beim Öffnen sichtbaren Meldungen geschlossen, die neue bleibt offen.
- Frage ist Teil eines laufenden Leistungsnachweises: Beim Deaktivieren („Frage entfällt“) und beim Speichern erscheint der bestehende Schutzhinweis aus der Fragenliste.
- Lehrkraft hat keine Schreibrechte auf den Fachbereich der Frage: Bearbeiten ist gesperrt, nur „Frage ist korrekt“ und „Später“ bleiben.
- Melder hat sein Konto gelöscht: Abschluss funktioniert ohne Rückmeldung und Belohnung (wie PROJ-73).

## Technical Requirements
- Security: gleiche Rechteprüfung wie PROJ-73 und Fragenliste, serverseitig vor Speichern und Abschließen.
- Konsistenz: „Speichern + Schließen“ darf nie zu „korrigiert ohne gespeicherte Änderung“ führen (Reihenfolge und Fehlerbehandlung im Architekturschritt festlegen, ob zwei Aufrufe oder eine gemeinsame Server-Funktion).
- Touch-Ziele mindestens 44 px, Handy-Layout bis 360 px Breite ohne seitliches Scrollen.
- Keine KI, keine laufenden Kosten.

## Offene Punkte für `/architecture`
- Das Fragenformular ist heute selbst ein Dialog: Wiederverwenden als eingebetteter Bereich oder als Dialog im Dialog?
- Eine neue Abschlussart „Frage entfällt“ ist in `close_question_reports` heute nicht manuell wählbar (nur `korrigiert` / `nicht_uebernommen`) und muss ergänzt werden.

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)

### Ausgangslage (aus dem Code)
- Das Fragenformular (`QuestionFormModal`) ist heute ein eigener Dialog mit Speichern-Logik und Versionsschutz („Frage wurde inzwischen geändert“) – die Logik ist fertig und getestet.
- Die Abschluss-Funktion der Datenbank verknüpft bei „Korrigiert“ automatisch den **neuesten** Eintrag im Änderungsverlauf. Wird erst gespeichert und dann abgeschlossen, hängt also die richtige Änderung an der Meldung.
- Der Status „Frage entfällt“ existiert bereits (wird automatisch gesetzt, wenn eine Frage gelöscht wird), ist aber manuell nicht wählbar.
- Einzelmeldungen mit Grund, Freitext und gewählter Antwort liefert schon eine bestehende Schnittstelle.
- Deaktivieren einer Frage kann die Frage-Schnittstelle bereits.

### A) Komponenten-Aufbau
```
Inbox „Gemeldete Fragen“ (besteht)
+-- Tabellenzeile
|   +-- „Prüfen“ (grün, ersetzt „Frage öffnen“ + „Abschließen“)
|   +-- Aufklapp-Bereich mit Link „In Fragenliste öffnen“ (bleibt)
+-- NEU: Prüf-Dialog (groß, Handy: Vollbild)
|   +-- Kopfzeile: „Meldung 3 von 12“, „Du prüfst“-Hinweis, Schließen
|   +-- Linke Spalte: Meldungen + Frage
|   |   +-- Einzelmeldungen (Grund, Freitext, gewählte Antwort)
|   |   +-- Frage-Ansicht (Antworten, Richtig-Markierung, Erklärung)
|   +-- Rechte Spalte: Fragenformular (eingebettet, vorbefüllt)
|   +-- Feste Abschluss-Leiste
|       +-- Rückmeldungsfeld + Textbausteine + „still schließen“
|       +-- „Speichern & als korrigiert abschließen“ (grün)
|       +-- „Frage ist korrekt“ / „Frage entfällt“ / „Später“
+-- Bestehend: Abschluss-Dialog und Sammel-Schließen (bleiben für Sammelaktionen)
```
Auf dem Handy stapeln sich die Spalten: erst Meldung und Frage (einklappbar), darunter das Formular, die Abschluss-Leiste bleibt unten fixiert.

### B) Entscheidungen
1. **Formular wiederverwenden, nicht kopieren.** Das Formular wird in einen „Formular-Körper“ und die bisherige Dialog-Hülle aufgeteilt. Die Fragenliste nutzt weiter die Hülle, der Prüf-Dialog den Körper direkt. *Warum:* Ein Dialog im Dialog ist auf dem Handy unbedienbar (zwei Ebenen, Scroll-Konflikte), und zwei Formulare würden auseinanderlaufen. Eine Änderung am Formular wirkt so überall.
2. **Speichern und Abschließen als zwei Schritte im Browser, in fester Reihenfolge.** Erst speichern (bestehende Schnittstelle mit Versionsschutz), nur bei Erfolg danach abschließen (bestehende Schnittstelle). *Warum:* Beide Teile existieren, sind getestet und protokollieren selbst. Eine neue gemeinsame Server-Funktion wäre mehr Aufwand ohne Gewinn, weil die Fehlerfälle (Speichern scheitert / Abschließen scheitert) im Dialog ohnehin einzeln sichtbar gemacht werden müssen.
3. **Abschluss nach erfolgreichem Speichern ist wiederholbar.** Der Dialog merkt sich „gespeichert, Abschluss offen“ und bietet nur noch „Abschließen“ an. Ein zweites Speichern findet nicht statt, damit der Verlauf keinen doppelten Eintrag bekommt.
4. **„Frage entfällt“ wird in die Abschluss-Funktion der Datenbank aufgenommen** (dritte erlaubte Ergebnisart, ohne Belohnung). Die Frage wird vorher per bestehender Schnittstelle deaktiviert. Das ist die einzige Datenbank-Änderung (Funktion erweitern, keine neue Tabelle, keine Rechte-Änderung an Tabellen).
5. **Nur die beim Öffnen sichtbaren Meldungen werden geschlossen.** Der Dialog schickt die Nummern der geladenen Einzelmeldungen mit; eine neue Meldung, die währenddessen eintrifft, bleibt offen.
6. **Weiter zur nächsten Meldung** nutzt die aktuell gefilterte und sortierte Liste der Inbox. Der Dialog bekommt die Reihenfolge beim Öffnen und springt nach dem Abschluss zum nächsten Eintrag, dessen Status noch „offen“ oder „in Prüfung“ ist.
7. **Schreibgeschützt in den Reitern „Korrigiert/Nicht übernommen/Entfällt“:** gleicher Dialog ohne Formular und Abschluss-Leiste (nur Lesen).
8. **Ungespeicherte Änderungen:** Schließen mit Escape oder „Später“ fragt nach, wenn das Formular verändert wurde.

### C) Daten
- **Keine neuen Tabellen oder Felder.** Genutzt werden Meldungen, Fragen und Änderungsverlauf wie bisher.
- **Eine Änderung:** Die Abschluss-Funktion akzeptiert zusätzlich das Ergebnis „Frage entfällt“. Dafür gibt es eine Migration mit Rückweg-Datei (Down), wie bei PROJ-72/73, und eine Probe für den SQL-Editor.
- Rechte: unverändert (Lehrkräfte und Bereichs-Admins). Keine Änderung an Zeilenschutz-Regeln, deshalb keine zusätzliche Freigabe nötig.

### D) Fehlerbehandlung (kritischer Punkt)
| Situation | Verhalten |
|---|---|
| Speichern scheitert | Dialog bleibt offen, Eingaben bleiben, Fehlertext; **keine** Schließung |
| Speichern ok, Abschluss scheitert | Hinweis „Frage gespeichert, Meldung noch offen“ + Wiederholen; kein zweites Speichern |
| Versionskonflikt (Kollege hat geändert) | bestehender Hinweis mit Neu-Laden; Meldung bleibt offen |
| Meldung inzwischen von anderem geschlossen | Hinweis, springt zur nächsten, keine Doppel-Belohnung (Funktion schließt nur noch offene) |
| Doppelklick | Buttons während des Vorgangs gesperrt |

### E) Aufwand und Reihenfolge
1. Frontend: Formular aufteilen (Körper + Hülle), danach Prüf-Dialog mit Navigation. Hauptteil der Arbeit.
2. Backend: Migration „Frage entfällt“ + kleine Anpassung der Abschluss-Schnittstelle (dritte Ergebnisart) + Tests der Reihenfolge Speichern → Abschließen.
3. QA: Fehlerfälle (Abbruch zwischen den Schritten), Handy-Layout, Rechte.

Backend ist klein, deshalb empfiehlt sich `/backend` **zuerst** (Migration), dann `/frontend`.

### F) Abhängigkeiten (Pakete)
Keine neuen Pakete. Vorhanden sind Dialog, AlertDialog, Tabs, Textarea, ScrollArea, Sonner (shadcn/ui).

## Umsetzung (Backend + Frontend)

**Backend**
- Migration [20261115_proj82_meldung_entfaellt.sql](../supabase/migrations/20261115_proj82_meldung_entfaellt.sql): `close_question_reports` akzeptiert zusätzlich `entfaellt` (ohne Belohnung, ohne Verlaufsverknüpfung). Gleiche Signatur, Rechte bleiben. Rückweg: `..._down.sql`. Probe: [proj82_meldung_entfaellt_probe.sql](../supabase/tests/proj82_meldung_entfaellt_probe.sql).
- Zod-Schema `reportCloseSchema` um `entfaellt` erweitert (Close-Route unverändert).
- Neue Route `GET /api/admin/question-reports/[questionId]/review`: volle Frage (Antworten mit Lösung, Fächer, Thema, Zählnummer) für das Formular, gleiche Rechte wie das Bearbeiten (`requireContentAdmin`). Test: `review/route.test.ts`.

**Frontend**
- `question-form-modal.tsx`: Formular in `QuestionFormBody` (ohne Dialog-Hülle, mit `save()`-Handle, `hideFooter`, `quietSuccess`, `onDirtyChange`) und `QuestionFormModal` (Hülle, Verhalten unverändert) geteilt.
- Neu `question-report-review-dialog.tsx`: Prüf-Dialog (Meldungen mit gewählter Antwort, Frage mit Markierung „Vom Melder gewählt“, Formular, feste Abschluss-Leiste, Fortschritt „n von N“, Verwerfen-Rückfrage, Entfällt-Bestätigung, Nur-Lesen-Modus).
- `question-reports-inbox.tsx`: „Prüfen“ (offen) bzw. „Ansehen“ (andere Reiter) ersetzt „Frage öffnen“ + „Abschließen“; „In der Fragenliste öffnen“ im Aufklapp-Bereich; Durchlauf springt nach dem Abschluss zur nächsten Zeile der Seite. Der alte Einzel-Abschlussdialog ist entfernt, Sammel-Schließen bleibt.

**Abweichungen von der Spec / Entscheidungen**
- „Frage ist korrekt“ verlangt eine Begründung (Textbaustein oder Freitext) oder „still schließen“.
- Ist die Frage nicht mehr da (404) oder nicht bearbeitbar (403), zeigt der Dialog einen Hinweis ohne Formular; „Frage entfällt“ schließt dann ohne Deaktivieren.
- Beim Öffnen wird die Meldung wie bisher automatisch übernommen („Du prüfst“); der Hinweis „Wird gerade von … geprüft“ erscheint, wenn eine andere Person sie hält.
- „Frage entfällt“ löscht die Frage nicht, sie wird nur deaktiviert.

## QA Test Results

**Stand:** 2026-11-09, statische Prüfung + automatische Tests. Kein Browser-Test (kein Dev-Server auf diesem Rechner), siehe offene Punkte.

| Bereich | Ergebnis |
|---|---|
| Neue Tests (12 Dialog, 5 Review-Route, Schema) | bestanden |
| Gesamte Testsuite | 2731 bestanden; 1 Zeitüberschreitung unter Last (`Große Auswahl wird in Teilen`, Datei fremd), einzeln grün |
| `tsc`, ESLint für geänderte Dateien | keine neuen Fehler/Warnungen |
| Fehlerfall Speichern scheitert → keine Schließung | getestet (kein `close`-Aufruf, Eingaben bleiben) |
| Fehlerfall Abschluss scheitert nach Speichern | getestet (Wiederholen ruft nur `close`, nicht erneut `PATCH`) |
| „Frage entfällt“: Deaktivieren scheitert → keine Schließung | getestet |
| Reihenfolge Speichern → Abschließen, nur offene Meldungen (`report_ids`) | getestet |
| Doppelklick-Schutz | Knöpfe während des Vorgangs gesperrt (Code-Review) |
| Rechte | Review-Route und Close-/Claim-Routen prüfen serverseitig; keine neuen Tabellen oder Zeilenschutz-Regeln |

**Bugs:** keine kritischen oder hohen gefunden.

**Offene Punkte**
- Datenbank-Probe `proj82_meldung_entfaellt_probe.sql` muss vor dem Deploy im SQL-Editor laufen (Schreibzugriff auf Produktion macht der Nutzer selbst).
- Handy-Layout (360 px), Tastatur und Scrollen im Dialog nur per Code-Review geprüft, bitte einmal auf dem Handy ansehen.



## Deployment
- **2026-11-09:** Migration `20261115_proj82_meldung_entfaellt` im SQL-Editor eingespielt, Probe bestanden (T1–T5 wie erwartet), danach lesend geprüft (Funktion erweitert, `anon` ohne Zugriff). Push von `0e8f741` auf `main`, Vercel-Production Ready, neue und geänderte Routen ohne Login 401, keine Fehler in den Produktions-Logs.
- **Noch offen:** einmal eingeloggt auf Handy und Laptop durchklicken (Prüf-Dialog, Speichern & abschließen, Weiter zur nächsten Meldung). Im Browser wurde das nicht geprüft.
