# PROJ-2: Subject & Question Structure

## Status: Planned
**Created:** 2026-04-16
**Last Updated:** 2026-04-16

## Dependencies
- Requires: PROJ-1 (User Authentication) – Fragen sind nur für eingeloggte Nutzer sichtbar

## User Stories
- Als Azubi möchte ich Fragen nach Fach (BGP, KSK, STG, LOP) gefiltert sehen, damit ich gezielt lernen kann.
- Als Azubi möchte ich Fragen auch nach Prüfungsteil (Leistungserstellung, KSK, WiSo) sortiert sehen.
- Als Admin möchte ich Fragen einer Kategorie (Fach + Schwierigkeitsgrad) zuordnen.
- Als System möchte ich Fragen mit Metadaten (Fach, Prüfungsteil, Schwierigkeitsgrad, Typ) speichern, damit der Quiz-Algorithmus gezielt auswählen kann.

## Acceptance Criteria
- [ ] Es existieren 4 Fach-Kategorien: BGP, KSK, STG, LOP
- [ ] Es existieren 3 Prüfungsteil-Kategorien: Leistungserstellung, KSK-Prüfung, WiSo
- [ ] Jede Frage hat: Fragetext, Antwortoptionen (Multiple Choice, 4 Optionen), korrekte Antwort, Erklärung (optional), Fach, Schwierigkeitsgrad (leicht/mittel/schwer)
- [ ] Fragen können als "aktiv" oder "inaktiv" markiert werden (inaktive werden im Quiz nicht angezeigt)
- [ ] Mindestens 10 Test-Fragen pro Fach sind beim ersten Launch vorhanden (Seed-Daten)
- [ ] Fragen können mehreren Fächern gleichzeitig zugeordnet werden (z.B. STG + LOP)

## Edge Cases
- Was passiert, wenn ein Fach keine aktiven Fragen hat? → Nutzer sieht Hinweis "Noch keine Fragen verfügbar" statt leerer Screen
- Was passiert bei einer Frage ohne Erklärung? → Erklärungsfeld einfach nicht anzeigen
- Was passiert, wenn alle 4 Antwortoptionen als korrekt markiert sind? → Admin-Validierung verhindert das

## Technical Requirements
- Datenstruktur: Supabase-Tabellen `subjects`, `questions`, `answer_options`
- Performance: Fragen-Abfrage < 300ms auch bei 1000+ Fragen
- Supabase RLS: Azubis können Fragen nur lesen (nicht schreiben), Admin hat vollen Zugriff

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)
_To be added by /architecture_

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
