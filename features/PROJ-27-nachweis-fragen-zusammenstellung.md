# PROJ-27: Leistungsnachweis – eigene Fragen-Zusammenstellung

## Status: Deployed
**Created:** 2026-10-07
**Last Updated:** 2026-10-07

## Dependencies
- Requires: PROJ-21 (Benotete Leistungsnachweise) — erweitert den Anlegen-Ablauf
- Requires: PROJ-15 (Mehrere aktive Prüfungssets) — Vorlage für Auswahl, Filter und Sortierung der Fragen
- Requires: PROJ-22/24 (Fachbereich, Rechtetrennung) — Fragen und Nachweise bleiben pro Fachbereich getrennt
- Berührt: PROJ-16 (Fragen-Qualität) — keine neue Abhängigkeit, nur gleiche Fragenbasis

## Summary
Ein Leistungsnachweis wird heute aus einem **fertigen Prüfungsset** angelegt. Der Ausbilder soll stattdessen die Fragen **direkt beim Anlegen des Nachweises** zusammenstellen, mit denselben Einstellmöglichkeiten wie bei einem Prüfungsset (Teil, Filter, Suche, Sortierung, Import, Dauer). Der Unterschied zum Prüfungsset bleibt: Am Ende steht eine echte Note nach Notenschlüssel.

Weiterhin gilt: nur Multiple-Choice, automatische Bewertung, ein Versuch, Fragen werden beim Öffnen eingefroren.

## User Stories
- Als **Ausbilder** möchte ich die Fragen für einen Nachweis direkt im Anlegen-Dialog auswählen, damit ich nicht erst ein Prüfungsset anlegen muss, das ich sonst nie brauche.
- Als **Ausbilder** möchte ich die Fragen nach Klasse, Fach und Thema filtern, durchsuchen und sortieren, damit ich bei hunderten Fragen schnell die passenden finde (wie im Prüfungsset).
- Als **Ausbilder** möchte ich einen Entwurf später noch ändern können, damit ich den Nachweis in Ruhe vorbereiten kann.
- Als **Ausbilder** möchte ich mit einem bestehenden Prüfungsset als Startpunkt beginnen können, damit meine bisherige Arbeit nicht verloren geht.
- Als **Ausbilder** möchte ich Zeitfenster, Dauer und Notenschlüssel wie bisher festlegen, damit die Benotung unverändert funktioniert.
- Als **Fachbereichs-Admin** möchte ich nur Fragen meines Fachbereichs sehen und verwenden können.

## Acceptance Criteria

### Anlegen
- [ ] Der Dialog „Leistungsnachweis anlegen" verlangt kein Prüfungsset mehr. Stattdessen wählt der Ausbilder den **Teil** und stellt die Fragen selbst zusammen.
- [ ] Die Fragenauswahl bietet dieselben Möglichkeiten wie im Prüfungsset: Suche, Filter nach Klasse, Fach und Thema, Sortierung (neueste, Klasse, Fach, Thema, Schwierigkeit, Text) sowie Alle-/Keine-auswählen für die gefilterte Liste.
- [ ] Die Anzahl der ausgewählten Fragen ist im Dialog jederzeit sichtbar.
- [ ] Es werden nur aktive **Multiple-Choice**-Fragen des eigenen Fachbereichs zur Auswahl angeboten; offene Fragen erscheinen nicht.
- [ ] Mindestens 5 Fragen sind nötig, sonst lehnt das Anlegen mit einer klaren Meldung ab.
- [ ] Die Dauer ist frei wählbar (5–600 Minuten); Zeitfenster und Notenschlüssel (Vorbelegung IHK) bleiben wie in PROJ-21.
- [ ] Optional: Ein Prüfungsset kann als **Startauswahl** übernommen werden (Fragen werden kopiert, danach unabhängig vom Set). Offene Fragen aus dem Set werden dabei übersprungen und der Ausbilder wird darauf hingewiesen.
- [ ] Der Import-Weg aus dem Prüfungsset (Datei-Import) steht im Nachweis-Dialog ebenfalls zur Verfügung. Das genaue Verhalten legt `/architecture` anhand des bestehenden Imports fest.

### Bearbeiten und Einfrieren
- [ ] Im Status **Entwurf** kann der Ausbilder Titel, Fragenauswahl, Dauer, Zeitfenster und Notenschlüssel ändern.
- [ ] Beim **Öffnen** werden die Fragen als Snapshot festgeschrieben (wie PROJ-21). Danach ist die Fragenauswahl nicht mehr änderbar.
- [ ] Beim Öffnen werden deaktivierte Fragen aus dem Snapshot entfernt; fällt die Zahl dadurch unter 5, wird das Öffnen mit Meldung abgelehnt.

### Bestand und Abgrenzung
- [ ] Bereits angelegte Nachweise (mit Prüfungsset) funktionieren unverändert weiter, auch deren Auswertung.
- [ ] Der bisherige Einstieg „Leistungsnachweis zu diesem Set anlegen" bleibt erhalten und startet den neuen Dialog mit den Fragen des Sets vorausgewählt.
- [ ] Die Sperre aus PROJ-21 bleibt: Fragen eines offenen oder laufenden Nachweises tauchen nicht in Übungs-API, Quiz, Lücken schließen, Blitzrunde und Prüfungssimulation auf; der Lösungsschlüssel bleibt vor Teilnehmern verborgen.
- [ ] Ein Nachweis legt **kein** Prüfungsset an und erscheint nicht in der Prüfungsauswahl der Azubis.

## Edge Cases
- Ausbilder wählt Fragen aus mehreren Fächern und Klassenstufen: erlaubt, solange sie zum gewählten Teil gehören.
- Eine ausgewählte Frage wird zwischen Anlegen und Öffnen deaktiviert oder gelöscht: wird beim Öffnen entfernt, der Ausbilder sieht die Zahl der entfernten Fragen.
- Eine Frage wird nach dem Öffnen verändert (Text, Optionen): der Snapshot hält die Frage-IDs, Antworten werden gegen den aktuellen Schlüssel bewertet — wie bisher in PROJ-21; bekanntes Verhalten, kein neues Risiko.
- Filter ist aktiv und der Ausbilder wählt „Alle auswählen": nur die sichtbaren Fragen werden gewählt, bereits gewählte unsichtbare bleiben erhalten.
- Super-Admin wechselt den Fachbereich im Dialog: Auswahl wird zurückgesetzt, weil Fragen bereichsgebunden sind.
- Direkter API-Aufruf mit Frage-IDs eines fremden Fachbereichs oder offener Fragen: wird serverseitig abgelehnt.
- Entwurf ohne Fragen wird gespeichert: erlaubt als Entwurf, aber nicht öffenbar.

## Technical Requirements
- Security: Fachbereichsprüfung und Rechte wie PROJ-24; Fragenauswahl wird serverseitig validiert (Fachbereich, MC, aktiv).
- Keine neue Abhängigkeit, kein Breaking Change an den Teilnehmer-Pfaden (Beitritt, Schreiben, Abgabe, Benotung).
- Mobile-first auch im Admin: Auswahl-Dialog bleibt auf dem Smartphone bedienbar.

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)

### Ausgangslage (aus dem Code)
- Ein Nachweis hängt heute zwingend an einem Prüfungsset. Beim **Öffnen** wird die Fragenliste des Sets als Snapshot eingefroren.
- Alle Teilnehmer-Wege (Code-Eingabe, Beitritt, Abgabe, Benotung) und die Sperre des Lösungsschlüssels lesen **nur den Snapshot**, nie das Set. Sie müssen deshalb nicht angefasst werden.
- Die Fragenauswahl mit Suche, Filter und Sortierung existiert nur fest eingebaut in der Prüfungsset-Seite und muss zur wiederverwendbaren Komponente werden.

### A) Komponentenstruktur
```
Leistungsnachweise-Seite
+-- Dialog „Neuer Leistungsnachweis" (umgebaut, wird groß/fast vollflächig auf dem Handy)
|   +-- Grunddaten: Titel, Teil, Beitrittsfenster, Dauer
|   +-- Startpunkt (optional): „Fragen aus Prüfungsset übernehmen"
|   +-- Fragenauswahl (NEU, geteilte Komponente)
|   |   +-- Suche + Filter (Klasse, Fach, Thema) + Sortierung
|   |   +-- „Alle / Keine" für die gefilterte Liste
|   |   +-- Fragenliste mit Häkchen, Zähler „X gewählt (min. 5)"
|   +-- „Fragen aus Datei importieren" (Unterdialog, bestehender Ablauf)
|   +-- Notenschlüssel-Editor (unverändert)
+-- Detailseite eines Entwurfs
    +-- Bearbeiten-Dialog: dieselbe Fragenauswahl, vorbelegt
```
Prüfungsset-Seite und Nachweis-Dialog nutzen **dieselbe** Auswahl-Komponente. So bleiben beide gleich und es gibt nur einen Ort für Verbesserungen.

### B) Datenmodell (Klartext)
Ein Nachweis bekommt zusätzlich:
- **Entwurfs-Fragenliste**: die vom Ausbilder gewählten Fragen, solange der Nachweis ein Entwurf ist.
- Die Verknüpfung zum **Prüfungsset wird optional**. Bestehende Nachweise behalten ihr Set; neue haben keins.
- Der **Snapshot** bleibt wie er ist und wird beim Öffnen aus der Entwurfs-Fragenliste gefüllt (bei Altnachweisen weiter aus dem Set).

Ablauf: Anlegen speichert die Wahl als Entwurf → Bearbeiten ändert sie → Öffnen prüft (nur aktive Multiple-Choice, mind. 5), friert ein und meldet, wie viele Fragen entfernt wurden.
Gespeichert in: bestehender Datenbank (Supabase), eine Migration mit Rückweg-Skript. Keine neuen Tabellen, die bestehenden Zugriffsregeln gelten weiter.

### C) Tech-Entscheidungen (Begründung)
- **Fragenliste direkt am Nachweis statt „verstecktes Set":** Ein Hilfsset würde in der Prüfungsauswahl der Azubis auftauchen können und widerspricht der Vorgabe „legt kein Prüfungsset an". Die Liste am Nachweis ist einfacher und sauber getrennt.
- **Teilnehmer-Pfade bleiben unberührt:** Sie kennen nur den Snapshot, daher kein Risiko für laufende und alte Nachweise.
- **Vorbelegung aus Set = Kopie:** Fragen werden einmal übernommen und sind danach unabhängig. Der Einstieg „Nachweis zu diesem Set" startet den Dialog einfach mit dieser Vorauswahl.
- **Serverseitige Prüfung bei Anlegen, Ändern und Öffnen:** gleicher Fachbereich, nur aktive Multiple-Choice-Fragen, Teil passt. Damit sind direkte API-Aufrufe mit fremden oder offenen Fragen abgewiesen.
- **Datei-Import:** Wiederverwendung des bestehenden Auslesens (PDF/Word → Fragen). Im Nachweis-Dialog werden die ausgelesenen Fragen **nur als Fragen angelegt** (ohne Set) und der Auswahl hinzugefügt. Importierte Fragen sind bis zum Öffnen des Nachweises normal im Übungsbetrieb sichtbar; das ist wie bisher beim Set-Import und für den Ausbilder transparent.
- **Mobil:** Auswahl als scrollbare Liste mit festem Zähler und Bestätigungsleiste unten; Filter einklappbar.

### D) Betroffene Bereiche
- Nachweis-Anlegen-Schnittstelle: nimmt Teil und Fragenliste statt Set entgegen (Set optional als Startpunkt).
- Nachweis-Ändern: darf im Entwurf auch die Fragenliste ändern.
- Nachweis-Öffnen: nimmt die Fragen aus der Entwurfsliste.
- Nachweis-Liste/Detail: Anzeige „Prüfungsset" entfällt, stattdessen Fragenanzahl.
- Prüfungsset-Seite: nutzt die ausgelagerte Auswahl-Komponente (kein Verhaltenswechsel).
- Unberührt: Beitritt, Abgabe, Benotung, Auswertung, Druck, Sperre.

### E) Abhängigkeiten
Keine neuen Pakete.

### Offene Punkte für Frontend/Backend
- Import im Nachweis-Dialog: fehlerhaft ausgelesene Fragen ohne erkannte Lösung (`needs_review`) müssen vor dem Hinzufügen korrigiert werden, sonst falscher Schlüssel in einer Note.
- Bestehende Tests für die Nachweis-Schnittstellen müssen für die neue Eingabe angepasst werden.

## Implementation Notes – Frontend (2026-10-08)
**Gebaut:**
- `src/components/admin/question-picker.tsx` – geteilte Auswahl (Suche, Klasse/Fach/Thema, Sortierung, Alle/Keine nur für gefilterte Liste, Zähler „X (min. 5)" oben fixiert).
- `src/components/admin/assessment-question-selector.tsx` – lädt die wählbaren Fragen eines Teils, Lade-/Fehlerzustand, Datei-Import-Dialog (Auslesen → Vorschau → Hinzufügen; Fragen ohne erkannte Lösung blockieren den Import, bis die richtige Antwort gewählt ist).
- `src/components/admin/edit-assessment-questions-dialog.tsx` – Fragen eines Entwurfs ändern.
- `create-assessment-modal.tsx` umgebaut: Teil statt Set, optionale Startauswahl aus Set (Kopie, übersprungene Fragen werden gemeldet), Fragenauswahl, Rest unverändert. „Nachweis zu diesem Set" startet weiter mit Vorauswahl.
- Nachweis-Liste: Spalte „Teil", „Neu erstellen" nicht mehr von Sets abhängig. Detailseite: Button „Fragen bearbeiten" im Entwurf.

**Abweichung:** Die Prüfungsset-Seite nutzt die neue Auswahl-Komponente noch nicht (Umstellung bewusst verschoben, die Datei hat offene Änderungen anderer Features); dort bleibt das Verhalten unverändert.

**Vertrag für /backend (vom Frontend erwartet):**
- `GET /api/admin/assessments/questions?part=N` → `{ questions: [{ id, question_text, difficulty, class_level, topic: string|null, subject_codes: string[] }] }` – aktive MC-Fragen des eigenen Bereichs im Teil, neueste zuerst, **alle** (nicht paginiert).
- `POST /api/admin/assessments` → `{ part, questionIds, title, opensAt, closesAt, durationMinutes, gradingScale }` (kein `examSetId` mehr).
- `PATCH /api/admin/assessments/[id]` → zusätzlich `{ questionIds }` (nur Entwurf).
- `GET /api/admin/assessments/[id]` → `draftQuestionIds` (Entwurf), `examSetName` nullable; Liste: `examSetName` nullable.
- `POST /api/admin/assessments/questions/import` → `{ part, questions: [{ question_text, options, correct_index, needs_review, fach_code }] }` → `{ questions: PickerQuestion[] }` (legt nur Fragen an, kein Set).
- Öffnen-Antwort sollte die Zahl entfernter Fragen liefern (Anzeige im Frontend noch offen).

## Implementation Notes – Backend (2026-10-08)
- **Migration** `20261008_proj27_assessment_own_questions.sql` (+ `_down`): `exam_set_id` nullable, neue Spalte `draft_question_ids`, bestehende Entwürfe übernehmen die Set-Fragen, Check „Fragenquelle vorhanden". Keine RLS-Änderung. **Noch nicht auf die Datenbank angewendet.**
- `src/lib/assessment-questions.ts`: wählbare Fragen eines Teils (aktiv, MC, Fächer des Teils im eigenen Bereich, seitenweise geladen) und serverseitige Auswahlprüfung (Duplikate raus, fremde/offene/deaktivierte Fragen → 400, min. 5).
- `GET /api/admin/assessments/questions?part=N`, `POST /api/admin/assessments/questions/import` (nur Fragen, kein Set; `correct_index` Pflicht, Rollback bei Teilfehlern).
- `POST /api/admin/assessments` nimmt `part` + `questionIds`; Bereich = Arbeitsbereich des Admins. `PATCH` akzeptiert `questionIds` (nur Entwurf). `GET` liefert `draftQuestionIds`, `examSetName` nullable. Öffnen nutzt `draft_question_ids` (Fallback Set bei Altnachweisen), liefert `removedCount`; Frontend zeigt ihn an.
- Teilnehmer-Pfade, Sperre, Auswertung unverändert.
- Tests: `assessment-questions.test.ts`, `questions/route.test.ts`, `route.test.ts` angepasst – alle grün.
- Bewusst: Anlegen verlangt sofort ≥ 5 Fragen (Akzeptanzkriterium); der Edge Case „leerer Entwurf" ist damit nicht möglich.

## Änderung nach Deploy: Auswahl ohne Prüfungsteil (2026-10-08)
Auf Wunsch entfällt die Teil-Auswahl im Anlegen-Dialog. Stattdessen Filter in der Reihenfolge **Klasse → Fach → Thema**, je mit „gemischt" als Standard; die Fragenliste umfasst alle aktiven MC-Fragen des Bereichs (alle Fächer). Der technische Prüfungsteil (Schlüssel für die Teilnehmer-Pfade) wird serverseitig aus den gewählten Fragen abgeleitet (Teil mit den meisten Fragen, bei Gleichstand der niedrigere) und beim Ändern der Fragen neu bestimmt. Schnittstellen: `GET .../questions` und `POST .../questions/import` ohne `part`, `POST /assessments` ohne `part`. Nachweis-Liste ohne Spalte „Teil". Bug 1 (Teilwechsel-Race) entfällt damit.

## QA Test Results (2026-10-08)

**Umfang:** Code-Review gegen die Akzeptanzkriterien, Sicherheitsprüfung der Schnittstellen, Datenbank-Check, automatische Tests. **Nicht durchgeführt:** Browser-Test, Playwright/E2E, Cross-Browser und Responsive-Prüfung (laut Projektregel kein Dev-Server/Playwright wegen Systemabstürzen). Die Oberfläche ist daher nur gelesen, nicht bedient worden.

**Automatisch:** `npm test` – 56 Dateien, 603 Tests grün. `tsc` ohne Fehler in `src/`. `npm run lint` ist bereits vor PROJ-27 defekt (`next lint` findet kein Projekt), `npm run build` nicht gelaufen.
**Datenbank:** Migration angewendet, `exam_set_id` nullable, `draft_question_ids` vorhanden, Check-Constraint aktiv.

### Akzeptanzkriterien
| Kriterium | Ergebnis |
|---|---|
| Anlegen ohne Prüfungsset, Teil wählen | Pass (Code) |
| Suche, Filter Klasse/Fach/Thema, Sortierung, Alle/Keine für gefilterte Liste | Pass (Code) |
| Anzahl gewählter Fragen jederzeit sichtbar | Pass (Code) |
| Nur aktive MC-Fragen des eigenen Fachbereichs | Pass (Code + Test) |
| Mindestens 5 Fragen, klare Meldung | Pass (Client + Server, Test) |
| Dauer 5–600, Zeitfenster, Notenschlüssel wie PROJ-21 | Pass |
| Prüfungsset als Startauswahl (Kopie, offene übersprungen + Hinweis) | **Teilweise** – siehe BUG-1 |
| Datei-Import im Nachweis-Dialog | Pass (Code, ohne echten Lauf) |
| Entwurf bearbeiten (Titel, Fragen, Dauer, Zeitfenster, Schlüssel) | Pass (Code) |
| Beim Öffnen Snapshot, danach Auswahl gesperrt | Pass |
| Beim Öffnen deaktivierte entfernt, unter 5 → Ablehnung mit Meldung | Pass (Meldung mit Zahl) – siehe BUG-2 |
| Altnachweise unverändert | Pass (Fallback aufs Set, 2 Bestandsnachweise, kein Entwurf) |
| „Nachweis zu diesem Set anlegen" mit Vorauswahl | **Teilweise** – siehe BUG-1 |
| Sperre aus PROJ-21 (Snapshot-basiert) unverändert | Pass |
| Nachweis legt kein Set an | Pass |

### Edge Cases
- Mehrere Fächer/Klassen in einer Auswahl: Pass.
- Frage zwischen Anlegen und Öffnen deaktiviert: Pass (`removedCount` wird angezeigt).
- „Alle auswählen" bei aktivem Filter, Unsichtbare bleiben: Pass.
- Fremde/offene Frage-IDs per direktem API-Aufruf: Pass (400, Test `assessment-questions.test.ts`).
- Fachbereichswechsel im Dialog: nicht anwendbar (Umschalter ist global, nicht im Dialog).
- Leerer Entwurf speichern: **bewusst abweichend** – Anlegen verlangt sofort ≥ 5 Fragen.

### Bugs
- **BUG-1 (Medium) – BEHOBEN 2026-10-08 (nicht im Browser verifiziert) – Veraltete Ladeantwort setzt Vorauswahl falsch.** Beim erneuten Öffnen des Dialogs über „Nachweis zu diesem Set" mit einem anderen Teil als beim letzten Mal startet kurz der alte Teil. Dessen Antwort kommt nach der neuen Vorauswahl an und gleicht die Set-Fragen gegen die falsche Fragenliste ab: Auswahl leer oder fast leer, falscher „übersprungen"-Hinweis. Ähnlich bei schnellem Teilwechsel. Fix: Ladeantworten verwerfen, wenn der Teil nicht mehr passt; Teil beim Öffnen vor dem ersten Rendern zurücksetzen.
- **BUG-2 (Low) – BEHOBEN 2026-10-08 (Test `[id]/route.test.ts`) – Öffnen mit sehr großer Auswahl.** Die Abfrage beim Öffnen übergibt bis zu 500 IDs in der URL (ca. 20 KB). Das Projekt hatte schon URL-Längenprobleme (PROJ-24). Schlägt sie fehl, meldet das Öffnen irreführend „nur 0 aktive Fragen". Fix: in Blöcken abfragen und Abfragefehler melden.
- **BUG-3 (Low) – BEHOBEN 2026-10-08 (Hinweistext im Import-Dialog) – Importierte Fragen sofort im Übungsbetrieb.** Sie sind aktiv, bevor der Nachweis geöffnet wird, und bleiben als Einzelfragen bestehen, wenn der Dialog abgebrochen wird. Schwierigkeit „mittel", ohne Klasse/Thema. Bewusst so entschieden (Tech Design), aber für den Ausbilder nicht ersichtlich – Hinweistext im Import-Dialog empfohlen.
- **BUG-4 (Low) – BEHOBEN 2026-10-08 (`eslint.config.mjs`, Skript `eslint .`; neue strenge React-Regeln als Warnung, 0 Fehler / 34 Warnungen im Bestand) – `npm run lint` defekt** (nicht durch PROJ-27 verursacht).

### Sicherheit
- Mandantentrennung: Auswahl wird serverseitig gegen Fächer des Prüfungsteils im Bereich des Admins geprüft; fremde IDs → 400. Ändern prüft gegen den Bereich des Nachweises, Zugriff über bestehende RLS. Kein Befund.
- Import: Fächer auf den gewählten Teil begrenzt, Bereichs-Admin kann nur im eigenen Bereich anlegen, `correct_index` Pflicht, Größen begrenzt. Kein Befund.
- Auswahl-Schnittstelle gibt keine Antwortoptionen oder Lösungen zurück. Kein Befund.
- Nicht geprüft: echte Aufrufe mit zwei Bereichs-Admins gegen die laufende App.

### Nachbesserung (2026-10-08)
- BUG-1: Der Dialog setzt den Teil beim Schließen zurück, führt den aktuellen Teil synchron nach und ignoriert Ladeantworten fremder Teile; die Auswahl-Komponente verwirft veraltete Anfragen. Kein automatischer Test (Komponente), Browser-Prüfung steht aus.
- BUG-2: Öffnen fragt die Fragen in Blöcken à 100 ab; ein Abfragefehler ergibt 500 mit eigener Meldung statt „0 aktive Fragen". 4 neue Tests, `npm test` insgesamt grün.

### Empfehlung
Keine Critical/High-Bugs. **Bedingt bereit:** erst BUG-1 beheben und einmal von Hand durchklicken (Anlegen, Set-Start, Import, Entwurf bearbeiten, Öffnen) – das konnte ich ohne Browser nicht ersetzen.


## Deployment
- **Datum:** 2026-10-08, Produktion (spedilern.vercel.app), Commit `966b065` + `5804116`, Vercel-Deployment READY.
- **Datenbank:** Migration `20261008_proj27_assessment_own_questions.sql` vorab auf „Spedilern App" angewendet (abwärtskompatibel, alter Code lief damit weiter).
- **Kurzer Check nach Deploy:** Startseite erreichbar (Weiterleitung), neue Fragen-Schnittstelle antwortet ohne Login mit 401.
- **Offen:** Manueller Klick-Test im Browser (Anlegen, Set-Start, Import, Entwurf bearbeiten, Öffnen) steht aus; Bug 1 ist nur per Code-Review behoben.
- Bewusst nicht mit deployt/committet: unfertige Arbeit anderer Features (PROJ-26/28/29) im selben Arbeitsverzeichnis.
