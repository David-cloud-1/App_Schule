# PROJ-75: Leistungsnachweis – Aufgabenanalyse & Ausreißer

## Status: Deployed
**Created:** 2026-11-07
**Last Updated:** 2026-11-07

## Dependencies
- Requires: PROJ-21 (Leistungsnachweise, Ergebnisse, Noten), PROJ-28 (Klassenauswertung, Lösungsquote je Frage)
- Requires: PROJ-24/44/46 (Rechte)
- Optional: PROJ-73 — „Zur Prüfung markieren“ legt eine Meldung in der Inbox an
- Wird gelesen von: PROJ-78 (Vorschlag lässt gesperrte Fragen aus)

## Summary
PROJ-28 zeigt je Frage die Lösungsquote. Diese Spec ergänzt eine echte **Aufgabenanalyse** nach einem Nachweis: Trennschärfe, Verteilung der gewählten Antworten und Ampel-Hinweise, welche Fragen zu leicht, zu schwer oder verdächtig fehlerhaft waren. Auffällige Fragen können aus der Wertung dieses Nachweises genommen und für künftige Nachweise gesperrt werden.

## User Stories
- Als **Lehrkraft** möchte ich nach einem Nachweis sehen, welche Fragen gut zwischen starken und schwachen Azubis unterscheiden, damit meine Nachweise aussagekräftig sind.
- Als **Lehrkraft** möchte ich erkennen, welche Fragen wahrscheinlich fehlerhaft waren, damit ich Azubis nicht wegen einer schlechten Frage schlechter benote.
- Als **Lehrkraft** möchte ich solche Fragen aus der Wertung nehmen und die Noten automatisch neu berechnen lassen.
- Als **Lehrkraft** möchte ich fragwürdige Fragen für künftige Nachweise sperren, damit sie nicht wieder auftauchen.

## Acceptance Criteria

### Analyse
- [ ] In den Ergebnissen eines geschlossenen Nachweises gibt es den Reiter „Aufgabenanalyse“. Er ist auch bei laufendem Nachweis erreichbar, dort als „Zwischenstand“ gekennzeichnet.
- [ ] Je Frage: Lösungsquote, **Trennschärfe** (Lösungsquote der besten 27 % minus der schlechtesten 27 % nach Gesamtpunkten), Antwortverteilung je Option in Prozent (richtige Option hervorgehoben) und Anteil „nicht beantwortet“.
- [ ] Eine Ampel je Frage: **grün** (unauffällig), **gelb** (zu leicht > 95 %, zu schwer < 20 % oder Trennschärfe < 0,15), **rot** (Trennschärfe negativ, d. h. Starke lösen sie seltener als Schwache, oder eine falsche Option wird häufiger gewählt als die richtige).
- [ ] Hinweistext je Ampelfarbe in einem Satz („Mehr als die Hälfte wählte B – prüfe, ob B auch richtig sein kann“).
- [ ] Unter 8 abgegebenen Teilnehmern wird die Trennschärfe nicht berechnet, sondern „zu wenige Teilnehmer“ angezeigt; Lösungsquote und Verteilung bleiben.
- [ ] Sortierbar nach Ampel, Lösungsquote, Trennschärfe und Position im Nachweis. Tabelle mit `ws-table-scroll`.

### Aus der Wertung nehmen
- [ ] Je Frage die Aktion „Aus der Wertung nehmen“ (mit `AlertDialog`, der die Folgen nennt). Danach zählt die Frage für **alle** Teilnehmer dieses Nachweises weder bei Punkten noch beim Maximum; Prozent und Note werden neu berechnet.
- [ ] Die Neuberechnung ändert nur Prozent und Note. Rohantworten und Zeitverläufe bleiben unverändert.
- [ ] Die Aktion ist umkehrbar („Wieder in die Wertung“) und im Protokoll (wer, wann, welche Frage) sichtbar.
- [ ] Sind Ergebnisse bereits für die Azubis freigegeben, nennt der Dialog, dass sich angezeigte Noten ändern können. Betroffene Azubis sehen bei der Note den Hinweis „Auswertung wurde angepasst“ mit Datum.
- [ ] Druckansichten (PROJ-28) berücksichtigen die Wertung; ausgenommene Fragen stehen mit „nicht gewertet“.

### Für künftige Nachweise sperren
- [ ] Je Frage die Aktion „Für Nachweise sperren“. Die Frage bleibt zum Üben erhalten, wird aber von Vorschlägen (PROJ-78) ausgeschlossen und im Zusammenstell-Editor (PROJ-27) mit Warnung markiert.
- [ ] Optional „Zur Prüfung markieren“: legt, wenn PROJ-73 vorhanden ist, eine interne Meldung in der Inbox an (Grund „Nachweis-Auffälligkeit“).
- [ ] Die Sperre lässt sich von jeder Lehrkraft des Fachbereichs aufheben und steht im Änderungsverlauf (PROJ-47).

## Edge Cases
- Alle Teilnehmer lösen eine Frage richtig: Trennschärfe nicht berechenbar („alle richtig“), Ampel gelb (zu leicht).
- Frage wurde nach dem Nachweis gelöscht: Analyse arbeitet mit dem eingefrorenen Snapshot (wie PROJ-28); Aktion „Für Nachweise sperren“ entfällt.
- Alle Fragen eines Nachweises werden aus der Wertung genommen: Aktion wird abgelehnt (mindestens eine Frage muss zählen).
- Ausgeschlossene Teilnehmer (`excluded_from_grading`) sind in der Analyse nicht enthalten.
- Gruppen A/B (PROJ-76): Auswertung ist je Frage, nicht je Position, damit Gruppen zusammenzählen.
- Zwei Lehrkräfte nehmen gleichzeitig dieselbe Frage heraus: zweite Aktion ist ein No-Op ohne Fehlermeldung.

## Technical Requirements
- Performance: Analyse unter 1 s bei 40 Teilnehmern × 40 Fragen.
- Security: Nur Lehrkräfte mit Zugriff auf den Nachweis (`assertCanViewAssessment`); Wertungsänderung nur durch Ersteller oder Admins des Fachbereichs.
- Berechnung rein serverseitig, ohne KI und ohne Kosten.

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)

### A) Aufbau der Oberfläche
```
/admin/leistungsnachweise/[id] → Reiter „Fragenanalyse“ (ersetzt die bisherige Liste)
+-- Kopf: Anzahl gewerteter Abgaben, Zwischenstand-Hinweis, Hinweis „Trennschärfe ab 8 Abgaben“
+-- Filter „Nur auffällige“, Sortierung (Ampel, Lösungsquote, Trennschärfe, Position)
+-- Karte je Frage
    +-- Ampel-Chip (Prüfen / Auffällig / Unauffällig), Chips „Nicht gewertet“ / „Für Nachweise gesperrt“
    +-- Lösungsquote, Trennschärfe, nicht beantwortet
    +-- Hinweistexte zur Ampel
    +-- Antwortverteilung (Balken je Option)
    +-- Aktionen: Aus der Wertung nehmen / Wieder in die Wertung, Für Nachweise sperren / Sperre aufheben
```

### B) Daten
- Neue Spalte `graded_assessments.excluded_question_ids` (Liste von Fragen-Kennungen, Standard leer): die aus der Wertung genommenen Fragen dieses Nachweises.
- Neue Spalte `questions.blocked_for_assessments` (Ja/Nein, Standard nein): für künftige Nachweise gesperrt.
- Beides ohne neue Zugriffsregeln: es gelten die bestehenden Regeln der beiden Tabellen. Die Sperre steht damit automatisch im Änderungsverlauf (PROJ-47).

### C) Rechnen
- Die Bewertung läuft schon heute bei jedem Aufruf neu aus dem Snapshot (`applyGrading`). Die Ausnahme wird dort an einer zentralen Stelle berücksichtigt: Eine ausgenommene Frage trägt die Markierung „excluded“ und zählt weder bei Punkten noch beim Maximum. Alle Stellen (Teilnehmerliste, Notenspiegel, Export, Druck, Nutzer-Detailseite, Freigabe, späte Abgabe) reichen die Liste durch.
- Die Analyse (Lösungsquote, Trennschärfe nach dem Vergleich der besten und schwächsten 27 %, Antwortverteilung, Ampel) ist eine reine Rechenfunktion ohne Datenbankzugriff.

### D) Tech-Entscheidungen
- **Ausnehmen nur bis zur Freigabe.** Nach der Freigabe stehen Noten bereits fest in den Sitzungen der Azubis; ein nachträgliches Umschreiben wäre ein eigener, riskanter Eingriff. Der Knopf ist dann gesperrt und erklärt warum. (Abweichung von der ersten Spec, die „Auswertung angepasst“ nach Freigabe vorsah.)
- **Eine gemeinsame Ampel für beide Fehlerarten:** Alle zutreffenden Gründe werden gesammelt, die Farbe richtet sich nach dem schwersten (rot vor gelb).
- **Keine KI, keine neue Bibliothek, keine laufenden Kosten.**

## Implementation Notes (2026-11-10)
- Migration `20261111_proj75_aufgabenanalyse.sql` (+ `_down`, Probe `supabase/tests/proj75_aufgabenanalyse_probe.sql`). **Muss vor dem Push in Produktion sein:** mehrere bestehende Abfragen lesen `excluded_question_ids` und die Fragenauswahl liest `blocked_for_assessments`.
- Bewertung: `graded-assessments.ts` (`scoreAssessmentQuestions`, `gradeSnapshot`, `applyGrading` kennen `excluded`), durchgereicht in Ergebnisse, Export, Einzel-/Klassendruck, Freigabe, späte Abgabe und Nutzer-Detailseite.
- Neu: `lib/assessment-analysis.ts`, `GET /api/admin/assessments/[id]/analysis`, `PUT …/[id]/exclude-question`, `PUT /api/admin/questions/[id]/assessment-block`, `AssessmentItemAnalysis` im Reiter „Fragenanalyse“, Warn-Chip in der Fragenauswahl (PROJ-27), „nicht gewertet“ in der Einzelauswertung (PROJ-28).
- **Abweichungen von der Spec:** (1) Ausnehmen ist nur bis zur Freigabe möglich (siehe Tech Design D). (2) „Zur Prüfung markieren“ (Anlage einer Meldung in der Inbox) ist nicht gebaut; es hätte eine Nachweis-Meldung ohne Azubi als Melder gebraucht. (3) Die Sperre wirkt in der Auswahl als Warnung; der automatische Ausschluss in Vorschlägen kommt mit PROJ-78.
- Tests: `assessment-analysis.test.ts` (10), `exclude-question/route.test.ts` (9), Ergänzungen in `graded-assessments.test.ts`; Gesamtstand 2553 Tests grün, Build grün.

## QA Test Results
_To be added by /qa_

## Deployment
- 2026-11-10: Migration `20261111_proj75_aufgabenanalyse.sql` im SQL-Editor eingespielt, Probe bestanden (7 von 7 Zeilen wie erwartet; Version der Frage wird bei der Sperre angehoben). Lesend geprüft: beide Spalten vorhanden, keine Probe-Reste.
- Push von `a5f398a` auf `main`, Vercel-Production Ready nach 2m. Neue und geänderte Routen ohne Login: 401, keine Fehler in den Production-Logs.
- **Nicht im Browser geprüft:** Reiter „Fragenanalyse“ mit Ampel, Aus-der-Wertung-nehmen mit Neuberechnung der Noten, Sperre mit Warn-Chip in der Fragenauswahl. Bitte an einem echten Nachweis mit Abgaben einmal durchklicken.

## QA-Nachlauf (2026-11-10, Opus, Code-Review + Browser)
- **Behoben (Code):** gleichzeitiges Ausnehmen verschiedener Fragen überschreibt sich nicht mehr, sondern meldet 409 (B6); gelöschte Fragen ohne Sperr-Knopf und „alle richtig“ statt 0,00 (B9); Fehler beim Antwortschlüssel als verständliche Meldung (B10).
- **Offen (niedrig):** „Nach Position“ nimmt die Reihenfolge der ersten Abgabe (B7); Prüfung „mindestens eine Frage zählt“ bei hart gelöschten Fragen (B8).
