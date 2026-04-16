# PROJ-9: Admin Content Management Panel

## Status: Planned
**Created:** 2026-04-16
**Last Updated:** 2026-04-16

## Dependencies
- Requires: PROJ-1 (User Authentication) – Admin-Rolle erforderlich
- Requires: PROJ-2 (Subject & Question Structure) – Fragen-Datenmodell

## User Stories
- Als Admin möchte ich alle Fragen in einer Übersicht sehen, filtern und suchen können.
- Als Admin möchte ich neue Fragen manuell erstellen (Fragetext, 4 Antworten, korrekte Antwort, Erklärung, Fach, Schwierigkeitsgrad).
- Als Admin möchte ich bestehende Fragen bearbeiten und korrigieren.
- Als Admin möchte ich Fragen deaktivieren (ohne sie zu löschen), damit fehlerhafte Fragen nicht mehr im Quiz erscheinen.
- Als Admin möchte ich Fragen löschen, wenn sie irrelevant sind.
- Als Admin möchte ich Nutzer-Statistiken einsehen (Anzahl aktiver Nutzer, Top-Lernende).

## Acceptance Criteria
- [ ] Admin-Panel ist nur für Nutzer mit Admin-Rolle zugänglich (RBAC)
- [ ] Fragen-Übersicht: Tabelle mit Suche (Fragetext), Filter (Fach, Status aktiv/inaktiv, Schwierigkeit)
- [ ] Frage erstellen: Formular mit Pflichtfeldern (Fragetext, 4 Antworten, 1 korrekte Antwort, Fach)
- [ ] Frage bearbeiten: Vorausgefülltes Formular, alle Felder editierbar
- [ ] Frage deaktivieren: Toggle-Button in der Übersicht (aktiv ↔ inaktiv)
- [ ] Frage löschen: Mit Bestätigungsdialog ("Wirklich löschen?")
- [ ] Validierung: Mindestens 2 Antworten, genau 1 korrekte Antwort, Fragetext nicht leer
- [ ] Nutzer-Übersicht: Anzahl registrierte Nutzer, Anzahl aktive Nutzer (letzte 7 Tage)
- [ ] Alle Admin-Aktionen werden in einem Audit-Log gespeichert (wer, was, wann)

## Edge Cases
- Was passiert, wenn ein Nicht-Admin die Admin-URL aufruft? → 403-Fehler, Weiterleitung zur Startseite
- Was passiert, wenn eine Frage gelöscht wird, die in einem aktiven Session-Verlauf vorkommt? → Soft-Delete (als gelöscht markiert, nicht aus DB entfernt)
- Was passiert bei leerem Fragetext beim Speichern? → Validierungs-Fehler direkt im Formular

## Technical Requirements
- Route: `/admin` (geschützt durch Middleware + Supabase RLS)
- Admin-Rolle: `is_admin: true` im Nutzer-Profil
- Supabase RLS: Admin hat INSERT/UPDATE/DELETE auf `questions`-Tabelle
- Audit-Log: Supabase-Tabelle `admin_audit_log` (user_id, action, entity, entity_id, timestamp)

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)
_To be added by /architecture_

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
