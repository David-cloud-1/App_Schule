# PROJ-72: Frage melden (Azubi-Seite)

## Status: Deployed
**Created:** 2026-11-07
**Last Updated:** 2026-11-07

## Dependencies
- Requires: PROJ-3 (Daily Learning Session / Quiz) — Meldeknopf im Antwortbildschirm
- Requires: PROJ-19 (Blitzrunde), PROJ-14 (Lücken schließen) — gleicher Knopf in diesen Spielarten
- Wird gelesen von: PROJ-73 (Meldungs-Inbox für Lehrkräfte) — ohne PROJ-73 sammeln sich Meldungen nur an

## Summary
Azubis können eine Frage, die ihnen falsch, missverständlich oder doppelt richtig vorkommt, mit zwei Taps melden. Die Meldung geht an die Lehrkräfte des Fachbereichs (Bearbeitung in PROJ-73). Der Azubi sieht den Stand seiner Meldungen und bekommt eine Rückmeldung, wenn etwas korrigiert wurde.

## User Stories
- Als **Azubi** möchte ich direkt nach einer Antwort melden können, dass die Frage fehlerhaft ist, damit sie verbessert wird und nicht andere verwirrt.
- Als **Azubi** möchte ich in einem Satz sagen können, was mich stört (z. B. „Antwort B stimmt auch“), damit die Lehrkraft es schnell versteht.
- Als **Azubi** möchte ich sehen, was aus meinen Meldungen geworden ist, damit ich weiß, dass sich das Melden lohnt.
- Als **Azubi** möchte ich nicht durch das Melden aus dem Spielfluss gerissen werden, damit Üben leicht bleibt.

## Acceptance Criteria

### Melden
- [ ] Im Feedback-Bildschirm nach einer Antwort (Quiz, Blitzrunde, Lücken schließen) gibt es einen unauffälligen Knopf „Frage melden“ (mind. 44 × 44 px, Icon mit `aria-label`).
- [ ] Der Knopf öffnet ein Bottom-Sheet mit Gründen als Auswahl: „Eine andere Antwort stimmt auch“, „Die richtige Antwort ist falsch“, „Tippfehler / unklar formuliert“, „Veraltet“, „Etwas anderes“.
- [ ] Optional kann ein Freitext (höchstens 500 Zeichen, Zähler sichtbar) ergänzt werden. Bei „Etwas anderes“ ist der Freitext Pflicht.
- [ ] Nach dem Absenden erscheint ein kurzer Toast („Danke! Wir schauen es uns an.“); das Quiz läuft ohne Unterbrechung weiter.
- [ ] Die Meldung speichert: Frage, Grund, Freitext, Fachbereich der Frage, Zeitpunkt, die vom Azubi gewählte Antwort und den Fragetext zum Meldezeitpunkt (Snapshot, damit spätere Änderungen die Meldung nicht unlesbar machen).
- [ ] Pro Azubi und Frage gibt es höchstens **eine offene** Meldung. Ein zweiter Versuch zeigt „Du hast diese Frage schon gemeldet“ und den Status.
- [ ] Pro Azubi sind höchstens 10 Meldungen pro Tag möglich; danach zeigt der Knopf eine freundliche Begrenzung statt Absenden.

### Wo es den Knopf **nicht** gibt
- [ ] Nicht in benoteten Leistungsnachweisen (PROJ-21) und nicht in der Prüfungssimulation (PROJ-11), solange die Sitzung läuft.
- [ ] Nach Abgabe einer Prüfungssimulation, in der Ergebnisansicht, ist Melden möglich (die Antworten sind dann bekannt).

### Stand der eigenen Meldungen
- [ ] Unter Profil gibt es „Meine Meldungen“ mit Frage (gekürzt), Datum und Status: offen, in Prüfung, korrigiert, nicht übernommen.
- [ ] Bei „nicht übernommen“ steht der Kurztext der Lehrkraft dabei, falls vorhanden.
- [ ] Rückmeldungen aus PROJ-73 erscheinen einmalig als Hinweiskarte im „Heute“-Screen (PROJ-42) und verschwinden nach dem Lesen.

## Edge Cases
- Frage wurde inzwischen gelöscht oder deaktiviert: Die Meldung bleibt in „Meine Meldungen“ sichtbar, mit Hinweis „Frage nicht mehr verfügbar“.
- Offline / Netzfehler beim Absenden: Das Sheet bleibt offen, der Text geht nicht verloren, Fehlermeldung mit „Erneut versuchen“.
- Missbrauch (immer dieselbe Frage, Beleidigungen im Freitext): Die Lehrkraft kann Meldungen als „nicht übernommen“ schließen (PROJ-73); Tageslimit begrenzt Spam. Freitext wird nur als Text angezeigt, nie als HTML.
- Azubi ohne Fachbereich oder Frage ohne Fachbereich: Meldung läuft in den Bereich der Frage; fehlt auch der, an den Super-Admin.
- Mehrere Azubis melden dieselbe Frage: Alle Meldungen bleiben einzeln erhalten (Bündelung geschieht in PROJ-73).
- Konto wird gelöscht (PROJ-60): Meldungen bleiben für die Qualitätssicherung erhalten, aber ohne Personenbezug.

## Technical Requirements
- Security: Nur angemeldete Azubis dürfen melden; Tabellenzugriff per RLS nur auf eigene Meldungen lesen.
- Mobile-First nach DESIGN.md (Bottom-Sheet, Dark Mode, 44-px-Ziele).
- Keine KI, keine laufenden Kosten.

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)
_Gemeinsam mit PROJ-73 entworfen, weil beide dieselbe Tabelle nutzen. Gebaut wird zuerst PROJ-72._

### A) Aufbau der Oberfläche
```
Quiz / Blitzrunde / Lücken schließen (Feedback-Bildschirm)
+-- Knopf „Frage melden“ (kleines Flaggen-Icon, 44 px)
|   +-- Bottom-Sheet „Was stimmt nicht?“ (vorhandenes shadcn-Sheet)
|       +-- Grund-Auswahl (5 Gründe)
|       +-- Freitext (optional, 500 Zeichen, Zähler)
|       +-- Knopf „Melden“
+-- Toast „Danke! Wir schauen es uns an.“

Profil
+-- Bereich „Meine Meldungen“ (Liste: Frage, Datum, Status, ggf. Kurztext)

„Heute“-Screen
+-- Hinweiskarte „Deine Meldung wurde bearbeitet“ (einmalig, mit Gelesen-Marker)
```
Das Sheet ist eine eigene, wiederverwendbare Komponente. Quiz, Blitzrunde und Lücken schließen binden sie nur ein.

### B) Daten
Eine neue Tabelle **Fragen-Meldungen** (für PROJ-72 und 73 gemeinsam). Pro Meldung wird gespeichert:
- wer gemeldet hat (ohne Verweis, der beim Löschen des Kontos hängen bleibt), welche Frage, Fachbereich der Frage
- Grund, Freitext, gewählte Antwort, Fragetext zum Meldezeitpunkt (Kopie)
- Status (offen, in Prüfung, korrigiert, nicht übernommen, Frage entfällt), Bearbeiter und Zeitpunkt, Kurztext der Lehrkraft
- ob die Rückmeldung schon gelesen wurde, ob die Belohnung schon vergeben wurde

Regeln direkt in der Datenbank (nicht nur in der Oberfläche):
- höchstens eine **offene** Meldung je Azubi und Frage
- höchstens 10 Meldungen je Azubi und Tag
- Azubis sehen und erstellen nur ihre eigenen Meldungen; Lehrkräfte sehen die ihres Fachbereichs

### C) Wie gemeldet wird
Der Azubi schreibt nicht direkt in die Tabelle, sondern ruft eine **Datenbankfunktion** auf, die Konto, Tageslimit und Doppelmeldung prüft und die Kopie des Fragetextes selbst einträgt. So kann niemand fremde Texte oder falsche Fachbereiche einschleusen. Das ist dasselbe Muster wie im Lehrerzimmer (PROJ-63).

### D) Tech-Entscheidungen
- **Kein Melden im laufenden Nachweis oder in der Prüfungssimulation:** Der Knopf wird dort nicht eingebaut; die Funktion lehnt Meldungen aus laufenden Sitzungen zusätzlich ab.
- **Keine neue Bibliothek.** Sheet, Toast und Auswahl kommen aus shadcn/ui.
- **Freitext wird nur als Text angezeigt**, nie als HTML.

### E) Sicherheit (Freigabe nötig)
Neue Tabelle mit Zeilenschutz (RLS) und Datenbankfunktionen. Nach Projektregel brauchen RLS-Änderungen deine ausdrückliche Freigabe. Die Migration spielst du wie bisher selbst im SQL-Editor ein; ich liefere Migration, Rückweg und Probe-Skript als getrennte Dateien.

## Implementation Notes (2026-11-10)
- Migration `20261110_proj72_73_fragen_meldungen.sql` (+ `_down`, Probe `supabase/tests/proj72_73_meldungen_probe.sql`): Tabelle `question_reports`, Funktionen `report_question`, `claim_question_reports`, `close_question_reports`, `mark_question_reports_read`, Ansicht `question_report_groups`, Trigger für gelöschte Fragen. **Muss vor dem Push in Produktion eingespielt sein.**
- Azubi: `ReportQuestionButton` (Bottom-Sheet) im Feedback-Bildschirm des Quiz (gilt auch für „Lücken schließen“, das nutzt denselben Client); `/api/question-reports` (POST/GET) und `/api/question-reports/read`; „Meine Meldungen“ im Profil; Rückmeldungskarte im „Heute“-Screen.
- **Abweichungen von der Spec:** (1) Die **Blitzrunde** hat keinen Feedback-Bildschirm (Zeitdruck, automatisches Weiterschalten), dort gibt es bewusst keinen Melde-Knopf. (2) Statt Toast erscheint im Sheet eine kurze Bestätigung „Danke!“ (im Schüler-Layout ist kein Toaster eingebunden). (3) Meldungen aus laufenden Prüfungen lehnt die Funktion ab, wenn der Azubi eine „in_progress“-Sitzung hat, die höchstens 12 Stunden alt ist.
- Tests: `question-reports.test.ts`, `api/question-reports/route.test.ts`, `api/admin/question-reports/[questionId]/close/route.test.ts`; Gesamtstand 2531 Tests grün, Build grün.

## QA Test Results
_To be added by /qa_

## Deployment
- 2026-11-10: Migration `20261110_proj72_73_fragen_meldungen.sql` von Hand im SQL-Editor eingespielt, Probe `proj72_73_meldungen_probe.sql` bestanden (26 von 26 Zeilen wie erwartet). Danach lesend geprüft: Tabelle, Ansicht, 4 Funktionen, RLS an, `anon` ohne Zugriff, keine Probe-Reste.
- Push von `5ee19eb` auf `main`, Vercel-Production Ready nach 1m. Routen ohne Login: API 401, `/admin/gemeldete-fragen` 307 auf den Login, keine Fehler in den Production-Logs.
- **Nicht im Browser geprüft** (kein Dev-Server erlaubt): Melde-Sheet im Quiz, Inbox-Oberfläche, Rückmeldungskarte. Bitte einmal als Azubi melden und als Lehrkraft abschließen.

## QA-Nachlauf (2026-11-10, Opus, Code-Review + Browser)
- **Behoben (Code):** Melde-Knopf zeigt „Gemeldet“ nur bei „schon gemeldet“, nicht bei laufender Prüfung (B9).
- **Behoben per Migration [20261118_qa_proj72_78_fixes.sql](../supabase/migrations/20261118_qa_proj72_78_fixes.sql) (Probe: [qa_proj72_78_probe.sql](../supabase/tests/qa_proj72_78_probe.sql)):** Lehrer-Rollen können nicht mehr melden (B5); Tageslimit hält auch bei parallelen Anfragen (B6).
- **Offen (Spec-Abweichungen, Entscheidung nötig):** Melden in der Ergebnisansicht der Prüfung fehlt; deaktivierte Frage zeigt nicht „nicht mehr verfügbar“; Hinweis „schon gemeldet“ erst nach dem Absenden.
