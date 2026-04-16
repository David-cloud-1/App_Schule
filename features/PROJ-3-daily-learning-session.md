# PROJ-3: Daily Learning Session / Quiz

## Status: Planned
**Created:** 2026-04-16
**Last Updated:** 2026-04-16

## Dependencies
- Requires: PROJ-1 (User Authentication) – Session gehört zu einem Nutzer
- Requires: PROJ-2 (Subject & Question Structure) – Fragen müssen vorhanden sein
- Requires: PROJ-4 (XP & Level System) – XP wird am Ende vergeben
- Requires: PROJ-5 (Streak System) – Streak wird nach Session aktualisiert

## User Stories
- Als Azubi möchte ich täglich eine Lerneinheit starten, die mir 10–20 Fragen stellt, damit ich regelmäßig lernen kann.
- Als Azubi möchte ich ein Fach auswählen (oder "Gemischt"), bevor ich starte, damit ich gezielt üben kann.
- Als Azubi möchte ich nach jeder Antwort sofortiges Feedback erhalten (richtig/falsch + Erklärung), damit ich direkt lerne.
- Als Azubi möchte ich am Ende einer Session mein Ergebnis sehen (z.B. 8/10 richtig, +50 XP), damit ich meinen Fortschritt einschätzen kann.
- Als Azubi möchte ich eine laufende Frage abbrechen und später fortsetzen können.

## Acceptance Criteria
- [ ] Nutzer kann eine Session starten mit Fach-Auswahl (BGP / KSK / STG / LOP / Gemischt)
- [ ] Eine Session besteht aus 10 Fragen (konfigurierbar)
- [ ] Fragen werden zufällig aus dem gewählten Fach gezogen (keine Wiederholung innerhalb einer Session)
- [ ] Jede Frage zeigt: Fragetext + 4 Antwortoptionen (Multiple Choice)
- [ ] Nach Auswahl einer Antwort: sofortiges Feedback (grün = richtig, rot = falsch) + optionale Erklärung
- [ ] Fortschrittsbalken zeigt an, wie viele Fragen noch verbleiben (z.B. "Frage 3/10")
- [ ] Am Ende der Session: Zusammenfassung (X/10 richtig, verdiente XP, Streak-Status)
- [ ] Bereits beantwortete Fragen des Tages werden nicht erneut gestellt (pro Tag)
- [ ] Wenn alle Fragen eines Fachs für heute beantwortet wurden → Hinweis + Weiterleitung zu anderem Fach

## Edge Cases
- Was passiert, wenn weniger als 10 Fragen für ein Fach verfügbar sind? → Session mit verfügbaren Fragen starten, Hinweis anzeigen
- Was passiert, wenn der Nutzer mitten in der Session den Browser schließt? → Session-Stand geht verloren, aber keine Fehler; kein XP vergeben
- Was passiert, wenn Nutzer doppelt auf eine Antwort klickt? → Erste Auswahl zählt, weitere Klicks ignoriert
- Was passiert bei sehr langem Fragetext (z.B. Fallbeschreibung)? → Text scrollbar, Fragen-Container passt sich an

## Technical Requirements
- Session-Daten werden lokal (React State) gehalten und erst am Ende gespeichert
- Performance: Fragen-Laden < 200ms
- Mobile: Touch-friendly Antwort-Buttons (min. 44px Höhe)

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)
_To be added by /architecture_

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
