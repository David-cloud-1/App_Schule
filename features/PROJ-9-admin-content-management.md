# PROJ-9: Admin Content Management Panel

## Status: Planned
**Created:** 2026-04-16
**Last Updated:** 2026-04-19

## Dependencies
- Requires: PROJ-1 (User Authentication) – Admin-Rolle und Session erforderlich
- Requires: PROJ-2 (Subject & Question Structure) – Fragen- und Fächer-Datenmodell

---

## Overview

Das Admin-Panel ermöglicht einem Ausbilder/Lehrer die vollständige Verwaltung von Lerninhalten und Nutzern. Es umfasst vier Bereiche: Fragen-Verwaltung, Fächer-Verwaltung, Nutzer-Übersicht und Audit-Log. Der Zugang ist ausschließlich Nutzern mit `is_admin = true` im Profil vorbehalten.

**Admin-Bereiche:**
1. **Fragen** – Erstellen, bearbeiten, deaktivieren, löschen
2. **Fächer** – Anlegen, umbenennen, deaktivieren
3. **Nutzer** – Übersicht aller Nutzer, einzelne Nutzer deaktivieren
4. **Audit-Log** – Protokoll aller Admin-Aktionen

---

## User Stories

### Als Admin (Ausbilder/Lehrer)

**Zugang & Navigation**
- **US-1:** Als Admin möchte ich ein geschütztes Admin-Panel unter `/admin` aufrufen, damit ich alle Verwaltungsfunktionen an einem Ort finde.
- **US-2:** Als Admin möchte ich zwischen den vier Bereichen (Fragen, Fächer, Nutzer, Audit-Log) per Tab/Navigation wechseln, damit ich schnell zur richtigen Funktion komme.

**Fragen-Verwaltung**
- **US-3:** Als Admin möchte ich alle Fragen in einer Tabelle sehen mit Suche nach Fragetext und Filter nach Fach, Status und Schwierigkeitsgrad, damit ich den Überblick behalte.
- **US-4:** Als Admin möchte ich eine neue Frage manuell erstellen (Fragetext, 4 Antworten, korrekte Antwort markieren, Erklärung, Fach/Fächer, Schwierigkeitsgrad), damit ich Lerninhalt hinzufügen kann.
- **US-5:** Als Admin möchte ich eine bestehende Frage bearbeiten, damit ich Fehler korrigieren kann.
- **US-6:** Als Admin möchte ich eine Frage per Toggle deaktivieren (ohne sie zu löschen), damit fehlerhafte Fragen nicht im Quiz erscheinen, aber die Daten erhalten bleiben.
- **US-7:** Als Admin möchte ich eine Frage nach Bestätigung dauerhaft löschen, wenn sie vollständig irrelevant ist.

**Fächer-Verwaltung**
- **US-8:** Als Admin möchte ich alle Fächer in einer Übersicht sehen (Name, Code, Anzahl aktiver Fragen, Status), damit ich den Inhalt pro Fach einschätzen kann.
- **US-9:** Als Admin möchte ich ein neues Fach anlegen (Name, Code, optionale Beschreibung), damit neue Themenbereiche abgedeckt werden können.
- **US-10:** Als Admin möchte ich ein bestehendes Fach umbenennen, damit Namen korrigiert oder angepasst werden können.
- **US-11:** Als Admin möchte ich ein Fach deaktivieren (nicht löschen), damit Fächer ohne aktive Fragen nicht im Quiz erscheinen.

**Nutzer-Verwaltung**
- **US-12:** Als Admin möchte ich eine Tabelle aller registrierten Nutzer sehen (Display Name, E-Mail, XP, Streak, letzte Session, Status), damit ich einen Überblick über die Lernenden habe.
- **US-13:** Als Admin möchte ich einen einzelnen Nutzer deaktivieren (Account sperren), damit inaktive oder problematische Konten verwaltet werden können.
- **US-14:** Als Admin möchte ich einen deaktivierten Nutzer wieder aktivieren, damit Fehler rückgängig gemacht werden können.

**Bulk-Import**
- **US-15:** Als Admin möchte ich eine CSV-Datei mit mehreren Fragen auf einmal hochladen, damit ich große Mengen an Lerninhalt schnell importieren kann.
- **US-16:** Als Admin möchte ich vor dem Import eine Vorschau der erkannten Fragen sehen (mit Fehlern/Warnungen pro Zeile), damit ich fehlerhafte Einträge vor dem Import korrigieren kann.

**Audit-Log**
- **US-17:** Als Admin möchte ich alle Admin-Aktionen chronologisch sehen (wer, was, wann, welches Objekt), damit Änderungen nachvollziehbar sind.

---

## Acceptance Criteria

### Zugang & Sicherheit
- [ ] `/admin` und alle Unterpfade (`/admin/*`) sind nur für Nutzer mit `is_admin = true` zugänglich
- [ ] Nicht-Admin-Nutzer werden von `/admin` auf die Startseite weitergeleitet (keine 403-Fehlerseite sichtbar)
- [ ] Nicht eingeloggte Nutzer werden auf `/login` weitergeleitet
- [ ] Admin-API-Routen (`/api/admin/*`) geben 401 zurück wenn nicht eingeloggt, 403 wenn kein Admin

### Fragen-Verwaltung
- [ ] Tabelle zeigt alle Fragen (aktive + inaktive) mit: Fragetext (gekürzt), Fach, Schwierigkeit, Status (aktiv/inaktiv), Erstellt-Datum
- [ ] Suche filtert live nach Fragetext (Debounce ≥ 300ms)
- [ ] Filter: Fach (Dropdown), Status (aktiv/inaktiv/alle), Schwierigkeitsgrad (leicht/mittel/schwer/alle)
- [ ] Erstellen-Formular: Fragetext (Textarea), 4 Antwortfelder (A–D), Radio zur Markierung der korrekten Antwort, optionale Erklärung, Fach-Multiselect (mind. 1 Fach), Schwierigkeitsgrad-Select
- [ ] Validierung: Fragetext nicht leer, genau 1 korrekte Antwort, mind. 2 Antwortoptionen nicht leer, mind. 1 Fach ausgewählt
- [ ] Bearbeiten öffnet dasselbe Formular vorausgefüllt
- [ ] Deaktivieren-Toggle ist sofort wirksam (kein Reload)
- [ ] Löschen zeigt Bestätigungsdialog: "Diese Frage wird dauerhaft gelöscht. Fortfahren?"
- [ ] Pagination: 20 Fragen pro Seite

### Bulk-Import (CSV)
- [ ] Upload-Button in der Fragen-Übersicht öffnet einen Import-Dialog
- [ ] Akzeptiertes Format: CSV mit Spalten `fragetext, antwort_a, antwort_b, antwort_c, antwort_d, korrekte_antwort (A/B/C/D), erklaerung (optional), fach_code, schwierigkeit (leicht/mittel/schwer)`
- [ ] Vorschau-Tabelle zeigt alle erkannten Zeilen mit Status: ✅ gültig / ⚠️ Warnung / ❌ Fehler
- [ ] Fehler-Typen: fehlendes Pflichtfeld, ungültiger Fach-Code, ungültige Schwierigkeit, kein gültiger Wert für korrekte Antwort
- [ ] Import-Button ist nur aktiv wenn mind. 1 gültige Zeile vorhanden ist; fehlerhafte Zeilen werden übersprungen (mit Hinweis)
- [ ] Nach dem Import: Erfolgs-Toast "X Fragen importiert, Y Zeilen übersprungen" + Audit-Log-Eintrag
- [ ] Max. Dateigröße: 500 KB; Max. Zeilen pro Import: 500
- [ ] Beispiel-CSV kann heruntergeladen werden ("Vorlage herunterladen")

### Fächer-Verwaltung
- [ ] Tabelle zeigt alle Fächer: Name, Code, Beschreibung, Anzahl aktiver Fragen, Status
- [ ] Neues Fach: Name (Pflicht), Code (Pflicht, max. 5 Zeichen, Großbuchstaben), Beschreibung (optional)
- [ ] Code ist unique — Duplikat-Code zeigt Validierungsfehler
- [ ] Umbenennen öffnet Inline-Edit oder Modal mit vorausgefüllten Feldern
- [ ] Deaktivieren ist nur möglich wenn 0 aktive Fragen dem Fach zugeordnet sind — andernfalls Hinweis: "X aktive Fragen müssen zuerst einem anderen Fach zugeordnet werden"
- [ ] Fächer können nicht gelöscht werden (nur deaktiviert) — schützt historische Daten

### Nutzer-Verwaltung
- [ ] Tabelle zeigt alle Nutzer: Display Name, E-Mail, XP gesamt, aktueller Streak, letzte Session (Datum), Status (aktiv/gesperrt)
- [ ] Suche nach Display Name oder E-Mail
- [ ] Nutzer deaktivieren: Bestätigungsdialog mit Hinweis "Nutzer kann sich nicht mehr einloggen"
- [ ] Deaktivierter Nutzer: Supabase Auth `banned = true` gesetzt; aktive Session wird beendet
- [ ] Eigener Account kann nicht deaktiviert werden ("Du kannst dich nicht selbst sperren")
- [ ] Nutzer reaktivieren: `banned = false` setzen, Nutzer kann sich wieder einloggen
- [ ] Admins sind in der Nutzerliste sichtbar, aber mit Admin-Badge markiert

### Audit-Log
- [ ] Tabelle zeigt Einträge: Zeitstempel, Admin-Name, Aktion (z. B. "Frage erstellt"), Objekt-Typ, Objekt-ID / -Name
- [ ] Einträge sind chronologisch absteigend sortiert (neuestes zuerst)
- [ ] Filter nach Zeitraum (letzte 7 Tage / 30 Tage / alle) und Aktion-Typ
- [ ] Audit-Log ist read-only (keine Einträge löschbar)
- [ ] Pagination: 50 Einträge pro Seite
- [ ] Folgende Aktionen werden protokolliert: Frage erstellt/bearbeitet/deaktiviert/aktiviert/gelöscht, Bulk-Import (X Fragen), Fach erstellt/bearbeitet/deaktiviert, Nutzer deaktiviert/aktiviert

### Performance
- [ ] Fragen-Tabelle lädt in < 500ms (mit Pagination, max 20 pro Request)
- [ ] Nutzer-Tabelle lädt in < 1s

---

## Edge Cases

| Szenario | Erwartetes Verhalten |
|----------|---------------------|
| Nicht-Admin ruft `/admin` auf | Sofortige Weiterleitung zur Startseite, kein Flash des Admin-Inhalts |
| Admin löscht Frage, die in `quiz_session_answers` vorkommt | Soft-Delete: `is_active = false`, Zeile bleibt in DB erhalten |
| Admin versucht, Fach zu deaktivieren das noch aktive Fragen hat | Fehler-Toast: "X aktive Fragen müssen zuerst umgezogen werden" |
| Admin versucht, eigenen Account zu deaktivieren | Button ausgegraut + Tooltip: "Eigener Account kann nicht gesperrt werden" |
| Fragetext mit nur Leerzeichen | Trim + Validierung: Fehler "Fragetext darf nicht leer sein" |
| Zwei Admins bearbeiten dieselbe Frage gleichzeitig | Last-write-wins (kein Optimistic-Locking im MVP) — akzeptabel bei 1 Admin |
| Fach-Code "BGP" wird nochmals angelegt | Eindeutigkeitsfehler: "Ein Fach mit Code BGP existiert bereits" |
| Nutzer-Tabelle mit 0 Nutzern | Leere Tabelle mit Hinweis "Noch keine registrierten Nutzer" |
| Sehr langer Fragetext (> 1000 Zeichen) | DB-Limit greift; Formular zeigt Zeichenzähler und Max-Grenze |
| CSV-Datei mit > 500 Zeilen | Fehler-Toast: "Maximale Importgröße (500 Zeilen) überschritten" |
| CSV-Datei mit unbekanntem Fach-Code | Zeile als ❌ markiert, übersprungen; Hinweis "Fach-Code 'XYZ' nicht gefunden" |
| CSV enthält Duplikat-Fragetext (identisch zu bestehender Frage) | Warnung ⚠️ pro Zeile, Import trotzdem möglich (keine Eindeutigkeitsprüfung im MVP) |
| CSV-Datei > 500 KB | Upload abgelehnt, Fehler-Toast |

---

## Out of Scope (MVP)
- Mehrere Admin-Accounts mit unterschiedlichen Rollen (nur 1 Admin-Rolle im MVP)
- Push-Benachrichtigungen an Admins bei Nutzer-Meldungen
- Lernmaterial-Upload (PDFs, Bilder) als Grundlage für Fragen — gehört zu PROJ-10
- Wiederherstellung gelöschter Fragen

---

## Notes
- `is_admin` Flag in `profiles`-Tabelle (bereits aus PROJ-1-Datenmodell)
- Deaktivierung von Nutzern via Supabase Auth Admin API (server-seitig, Service-Key)
- Audit-Log: neue Tabelle `admin_audit_log` (id, admin_id, action, entity_type, entity_id, entity_label, created_at)
- Admin-Panel verwendet Service-Role-Client nur server-seitig (nie im Browser)

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)
_To be added by /architecture_

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
