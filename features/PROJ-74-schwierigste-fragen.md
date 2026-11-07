# PROJ-74: „Was fällt allen schwer?“ – schwierigste Fragen und Themen

## Status: Planned
**Created:** 2026-11-07
**Last Updated:** 2026-11-07

## Dependencies
- Requires: PROJ-3 (Quiz-Antworten in `quiz_answers`), PROJ-22 (Fachbereich als Datenbasis), PROJ-12 (Klassenstufe & Thema)
- Requires: PROJ-44 (Lehrkraft-Rolle), PROJ-24 (Rechte), PROJ-40 (Admin-Startseite)
- Optional: PROJ-72/73 — Anzahl Meldungen je Frage als zusätzliche Spalte

## Summary
Eine Auswertung über alle Azubis eines Fachbereichs: Welche Fragen und Themen werden am häufigsten falsch beantwortet? Sie ersetzt die Klassenauswertung, die ohne Klassenzuordnung nicht möglich ist, und gibt Lehrkräften Anhaltspunkte, was im Unterricht noch einmal dran muss. Es werden keine einzelnen Personen gezeigt.

## User Stories
- Als **Lehrkraft** möchte ich wissen, welche Themen den Azubis insgesamt am schwersten fallen, damit ich meinen Unterricht daran ausrichte.
- Als **Lehrkraft** möchte ich die schwächsten Fragen eines Themas sehen, damit ich daraus Beispiele und Übungen mache.
- Als **Lehrkraft** möchte ich schwache Fragen von fehlerhaften Fragen unterscheiden können, damit ich Qualitätsprobleme erkenne.
- Als **Bereichs-Admin** möchte ich die Auswertung auf meinen Fachbereich beschränken.

## Acceptance Criteria

### Ansicht
- [ ] Unter `/admin` gibt es „Schwierigste Fragen“ (Navigation: Auswertung). Sie gilt für den Fachbereich der Lehrkraft; der Super-Admin nutzt den Bereichs-Umschalter.
- [ ] Zwei Reiter: **Themen** (Liste der Themen mit Lösungsquote, Anzahl Antworten, Anzahl Fragen) und **Fragen** (Einzelfragen).
- [ ] Filter: Fach, Klassenstufe (10/11/12/alle), Zeitraum (letzte 30 Tage, 90 Tage, gesamt) und **Mindestanzahl Antworten** (Standard 20). Fragen und Themen unter der Mindestanzahl werden nicht gerankt, sondern mit „zu wenige Antworten“ getrennt aufgeführt.
- [ ] Sortierung standardmäßig nach niedrigster Lösungsquote. Spalten der Fragenliste: Frage (gekürzt, voller Text im `title`), Thema, Lösungsquote, Antworten, meistgewählte falsche Antwort in Prozent, Meldungen (wenn PROJ-72 vorhanden).
- [ ] Ein Klick auf eine Frage öffnet sie im Frage-Editor; ein Klick auf ein Thema filtert die Fragenliste.
- [ ] Eine Ampel trennt „schwer, aber fair“ von „verdächtig“: Fragen, bei denen eine falsche Antwort häufiger gewählt wird als die richtige, werden markiert („Antwort prüfen“).
- [ ] Ein Hinweis erklärt in einem Satz, wie die Quote entsteht (nur Üben, Quiz, Blitzrunde, Lücken schließen; keine benoteten Nachweise).

### Datengrundlage
- [ ] Gezählt werden nur Antworten aus freiem Üben (nicht aus Leistungsnachweisen oder Prüfungssimulation), je Antwort einmal.
- [ ] Mehrfach-Beantwortungen derselben Frage durch denselben Azubi zählen alle mit, aber höchstens die ersten 3 Versuche je Azubi und Frage, damit Dauerübende das Bild nicht verzerren.
- [ ] Die Auswertung enthält **keine** Namen, Konten oder Einzelverläufe.

## Edge Cases
- Neuer Fachbereich oder neue Frage ohne Antworten: leerer Zustand mit Erklärung („Sobald Azubis üben, erscheinen hier Auswertungen“).
- Sehr wenige Azubis im Fachbereich (z. B. 5): Die Mindestanzahl Antworten kann auf 5 gesenkt werden; ein Hinweis nennt, dass kleine Zahlen schwanken.
- Frage wurde kürzlich geändert (PROJ-47): Antworten vor der Änderung werden mit „Frage seit … geändert“ gekennzeichnet, weil die Quote nicht mehr vergleichbar sein kann.
- Frage ohne Thema: erscheint unter „Ohne Thema“.
- Sehr große Antwortmengen: Auswertung läuft serverseitig aggregiert (View oder Funktion), nie durch Laden aller Antworten im Browser.
- Lehrkraft ohne Fachbereich (PROJ-46): sieht alle Fachbereiche lesend, weil Inhalte offen sind (PROJ-70).

## Technical Requirements
- Performance: Ranking-Abfrage unter 1 s bei 100 000 Antworten (aggregiert und indiziert).
- Security: Nur Lehrkräfte/Admins; keine personenbezogenen Daten in der Antwort.
- Keine KI, keine laufenden Kosten.

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)
_To be added by /architecture_

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
