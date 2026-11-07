# PROJ-72: Frage melden (Azubi-Seite)

## Status: Planned
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
_To be added by /architecture_

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
