# PROJ-10: AI Question Generation from Documents

## Status: Planned
**Created:** 2026-04-16
**Last Updated:** 2026-04-16

## Dependencies
- Requires: PROJ-1 (User Authentication) – Admin-Rolle erforderlich
- Requires: PROJ-2 (Subject & Question Structure) – Fragen-Datenmodell
- Requires: PROJ-9 (Admin Content Management) – Generierte Fragen fließen ins Admin-Panel

## User Stories
- Als Admin möchte ich ein PDF oder Word-Dokument hochladen, damit die KI daraus automatisch Lernfragen generiert.
- Als Admin möchte ich die generierten Fragen vor der Veröffentlichung prüfen und bearbeiten.
- Als Admin möchte ich festlegen, welchem Fach (BGP/KSK/STG/LOP) und welchem Schwierigkeitsgrad die generierten Fragen zugeordnet werden.
- Als Admin möchte ich einzelne generierte Fragen ablehnen oder alle auf einmal akzeptieren.

## Acceptance Criteria
- [ ] Upload-Bereich im Admin-Panel akzeptiert PDF und DOCX (max. 20 MB)
- [ ] Nach Upload: KI analysiert Dokument und generiert 10–20 Multiple-Choice-Fragen
- [ ] Generierte Fragen werden als "Entwurf" angezeigt (noch nicht aktiv im Quiz)
- [ ] Admin kann jede Frage einzeln prüfen: Fragetext, Antworten, korrekte Antwort, Erklärung
- [ ] Admin kann Fragen bearbeiten, bevor er sie akzeptiert
- [ ] Admin kann Fragen einzeln oder alle auf einmal akzeptieren (→ werden aktiv)
- [ ] Admin kann Fragen ablehnen/löschen
- [ ] Fach-Zuordnung und Schwierigkeitsgrad können vor der Massenakzeptanz gesetzt werden
- [ ] Fortschrittsanzeige während der KI-Verarbeitung (Spinner / Progress)
- [ ] Fehlermeldung, wenn Dokument nicht lesbar oder zu groß ist

## Edge Cases
- Was passiert, wenn das Dokument kein verwertbares Fachinhalt hat? → KI gibt Hinweis "Keine Fragen gefunden", kein Crash
- Was passiert bei einem Timeout der KI-API? → Fehlermeldung mit Retry-Button
- Was passiert, wenn eine generierte Frage keine eindeutig korrekte Antwort hat? → Als "Überprüfung erforderlich" markiert, Admin muss manuell korrekte Antwort bestimmen
- Was passiert bei Duplikaten (bereits ähnliche Frage vorhanden)? → Hinweis "Ähnliche Frage existiert bereits", Admin entscheidet

## Technical Requirements
- KI-Integration: Claude API (claude-sonnet-4-6) mit strukturiertem JSON-Output
- Dokument-Parsing: PDF via `pdf-parse`, DOCX via `mammoth`
- Fragen werden zunächst in `questions_draft`-Tabelle gespeichert
- Prompt-Engineering: Kontext enthält Prüfungsstruktur (BGP/KSK/STG/LOP) für fachgerechte Fragen
- Datei-Upload: Supabase Storage (temporär, nach Verarbeitung löschbar)

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)
_To be added by /architecture_

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
