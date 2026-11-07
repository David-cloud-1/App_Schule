# PROJ-75: Leistungsnachweis – Aufgabenanalyse & Ausreißer

## Status: Planned
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
_To be added by /architecture_

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
