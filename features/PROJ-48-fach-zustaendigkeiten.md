# PROJ-48: Fach-Zuständigkeiten für Lehrkräfte (selbst eingetragen)

## Status: In Progress
**Created:** 2026-10-26
**Last Updated:** 2026-10-27

## Kontext
Teil der „Super-App für Lehrkräfte“ (Gesamtplan siehe PROJ-44). Lehrkräfte unterrichten Fächer, oft über mehrere Fachbereiche hinweg (Beispiel: Spedition · STG und Tourismus · KSK). Außerdem gibt es an der Schule weitere Bildungsgänge, die noch keine Fragen in der App haben, aber künftig dazukommen sollen. Der Fachbereich als Einheit für Rechte (Bereichs-Admin) ist dafür zu grob.

Deshalb kommt die **Fach-Zuständigkeit** dazu: Eine Lehrkraft trägt sich selbst für die Fächer ein, die sie unterrichtet, und kann deren Inhalte pflegen.

### Entscheidungen (Nutzer, 2026-10-26)
- **E1 – Selbst eintragen, Vertrauen:** Lehrkräfte kreuzen selbst an, in welchen Fachbereichen und Fächern sie unterrichten. Es gibt keine Freigabe durch Admins. Die Absicherung ist PROJ-47: Jede Inhaltsänderung wird mit Name und Datum gespeichert und lässt sich rückgängig machen.
- **E2 – Umfang einer Zuständigkeit:** Fragen über die kostenlosen Wege anlegen und importieren, **alle** Fragen des Fachs pflegen (auch die von anderen), Themen des Fachs verwalten, Prüfungssets der Prüfungssimulation für das Fach pflegen.
- **E3 – Neue Fächer anlegen:** Wer in einem Bereich unterrichtet, darf dort neue Fächer anlegen und ist dafür automatisch zuständig.
- **E4 – Kosten (vom Assistenten gesetzt, Regel „alles bleibt kostenlos“):** Der kostenpflichtige KI-Generator, der API-Guthaben verbraucht, bleibt dem Super-Admin vorbehalten. Lehrkräfte nutzen die kostenlosen Wege, also Kopier-Prompt für Fragen und Bulk-Import.

## Dependencies
- Requires: PROJ-44 (Lehrkraft-Rolle) – nur Lehrer-Rollen können Zuständigkeiten haben
- Requires: PROJ-47 (Änderungsverlauf & Wiederherstellen) – **muss vorher live sein** (E1)
- Requires: PROJ-24 (Rechtetrennung) – bisheriges Bereichs-Rechtemodell bleibt daneben bestehen
- Berührt: PROJ-12/43 (Themen, Lernbibliothek), PROJ-15 (Prüfungssets), PROJ-16 (Torwächter), PROJ-38 (Kopier-Prompt)

## User Stories
- Als **Lehrkraft** möchte ich selbst ankreuzen, welche Fächer ich in welchen Bereichen unterrichte, damit ich ohne Wartezeit Fragen für meinen Unterricht einbringen kann.
- Als **Lehrkraft** möchte ich für meine Fächer Fragen per Kopier-Prompt oder Bulk-Import hochladen, damit meine Schüler in der Lern-App passende Fragen üben.
- Als **Lehrkraft** möchte ich fehlerhafte Fragen in meinen Fächern direkt korrigieren, auch wenn ein Kollege sie angelegt hat, damit Fehler nicht liegen bleiben.
- Als **Lehrkraft** möchte ich die Themen meiner Fächer anlegen und sortieren, damit der Themenpfad in der Lernbibliothek zu meinem Unterricht passt.
- Als **Lehrkraft eines neuen Bildungsgangs** möchte ich Fächer für meinen Bereich anlegen, damit wir die App auch dort nutzen können.
- Als **Lehrkraft** möchte ich auf meiner Startseite meine Fächer sehen, damit ich direkt dort weiterarbeite.
- Als **Super-Admin** möchte ich sehen, wer sich für welches Fach eingetragen hat, und Einträge entfernen können, damit ich den Überblick behalte.

## Acceptance Criteria

### Selbst eintragen
- [ ] Im Lehrkräfte-Bereich gibt es die Seite „Meine Fächer“. Sie zeigt alle aktiven Fachbereiche mit ihren Fächern zum Ankreuzen.
- [ ] Die Lehrkraft kann einen Bereich auch ohne Fach ankreuzen („Ich unterrichte in diesem Bereich“). Das ist für Bereiche gedacht, die noch keine Fächer haben.
- [ ] Änderungen gelten sofort (E1). Jede Eintragung und Austragung wird im Änderungsprotokoll erfasst.
- [ ] Beim ersten Öffnen des Lehrkräfte-Bereichs nach PROJ-44 wird die Lehrkraft einmal freundlich auf „Meine Fächer“ hingewiesen.
- [ ] Nur Konten mit Lehrer-Rolle können sich eintragen. Azubis sehen die Seite nicht, und der Server lehnt sie ab.
- [ ] Bereichs-Admins und der Super-Admin brauchen keine Zuständigkeiten. Ihre bisherigen Rechte bleiben unverändert.

### Rechte je Zuständigkeit (E2)
- [ ] Für jedes eingetragene Fach darf die Lehrkraft:
  - Fragen über Kopier-Prompt (`question-prompt`) und Bulk-Import anlegen. Der Torwächter (PROJ-16) gilt wie für Admins.
  - alle Fragen des Fachs bearbeiten, aktivieren, deaktivieren und löschen (Papierkorb, PROJ-47)
  - Themen des Fachs anlegen, umbenennen, sortieren und löschen
  - Prüfungssets der Prüfungssimulation anlegen und pflegen, deren Prüfungsteil das Fach umfasst
- [ ] Gehört eine Frage zu mehreren Fächern, darf sie bearbeiten, wer für mindestens eines davon zuständig ist.
- [ ] Außerhalb ihrer Fächer sieht die Lehrkraft in der Verwaltung keine Inhalte und kann nichts ändern. Direkte Aufrufe liefern 404.
- [ ] Der kostenpflichtige KI-Generator (Fragen aus Material per API) ist für Lehrkräfte ausgeblendet und serverseitig gesperrt (E4).
- [ ] Bereichsweite Einstellungen (Fachbereich-Einstellungen, Hof-Items, Azubis verschieben, Nutzerverwaltung) bleiben Bereichs-Admins und dem Super-Admin vorbehalten.

### Neue Fächer (E3)
- [ ] Wer in einem Bereich eingetragen ist (mit oder ohne Fach), sieht dort „Neues Fach anlegen“.
- [ ] Wer ein neues Fach anlegt, ist sofort dafür zuständig.
- [ ] Doppelte Kürzel im selben Bereich werden abgelehnt (bestehende Regel).
- [ ] Neue Fachbereiche anlegen bleibt dem Super-Admin vorbehalten.

### Navigation & Übersicht
- [ ] Die Navigation (PROJ-45) zeigt einer Lehrkraft mit Zuständigkeiten zusätzlich: Fragen, Themen, Fächer, Prüfungssimulation, jeweils gefiltert auf ihre Fächer.
- [ ] Die Startseite des Lehrkräfte-Bereichs zeigt „Meine Fächer“ als Kacheln (Bereich · Fach, Anzahl aktiver Fragen) mit direktem Sprung in die Fragenliste.
- [ ] Hat eine Lehrkraft mehrere Bereiche, kann sie in Listen nach Bereich und Fach filtern.
- [ ] Der Super-Admin sieht eine Übersicht „Zuständigkeiten“ (Fach → eingetragene Lehrkräfte und umgekehrt) und kann Einträge entfernen. Das Entfernen wird protokolliert.

### Rolle entzogen
- [ ] Verliert eine Person ihre Lehrer-Rolle (PROJ-44), verliert sie sofort alle Zuständigkeiten. Ihre angelegten Inhalte bleiben unverändert, inklusive Verlauf.

## Edge Cases
- **Lehrkraft trägt sich aus einem Fach aus:** Sie verliert sofort die Rechte dafür. Ihre Fragen bleiben im Fach und werden von den übrigen Zuständigen weiter gepflegt.
- **Fach hat niemanden mehr:** Die Inhalte bleiben unverändert. Super-Admin und Bereichs-Admin sehen in der Übersicht „ohne Zuständige“.
- **Zwei Lehrkräfte bearbeiten dieselbe Frage:** Das regelt PROJ-47 (Konfliktmeldung, kein stiller Datenverlust).
- **Lehrkraft löscht ein Thema mit Fragen:** Eine Sicherheitsabfrage nennt die Zahl der betroffenen Fragen. Das Thema landet im Papierkorb, die Fragen bleiben ohne Thema erhalten und lassen sich mit dem Thema wiederherstellen.
- **Lehrkraft löscht ein Fach:** Das ist nur möglich, wenn das Fach keine aktiven Fragen hat. Sonst erscheint ein Hinweis, zuerst Fragen zu verschieben oder zu deaktivieren.
- **Missbrauch** (jemand trägt sich überall ein und verändert viele Fragen): Der Super-Admin sieht es im Protokoll, nimmt alle Änderungen der Person gesammelt zurück (PROJ-47) und entzieht Zuständigkeiten oder Rolle.
- **Fach wird in einem neuen Bereich angelegt, der noch keine Pseudonym-Wörter, Hof-Namen o. Ä. hat:** Das betrifft nur die Lern-App des Bereichs. Diese Einstellungen pflegt weiterhin der Super-Admin bzw. Bereichs-Admin.
- **Prüfungsteil umfasst mehrere Fächer, die Lehrkraft ist nur für eines zuständig:** Sie darf Sets dieses Teils pflegen. In der Fragenauswahl sieht sie aber nur Fragen ihrer Fächer, und Fragen anderer Fächer in einem bestehenden Set bleiben unangetastet.

## Abgrenzung (nicht Teil dieses Features)
- Freigabe von Zuständigkeiten durch Admins (bewusst nicht gewollt, E1)
- Kostenpflichtiger KI-Generator für Lehrkräfte (E4)
- Neue Fachbereiche durch Lehrkräfte anlegen
- Zuordnung von Lehrkräften zu Klassen

## Technical Requirements
- **Security:** Rechte je Fach hart in RLS und Server-Code. Fremde Fächer liefern 404. Zuständigkeiten kann jede Lehrkraft nur für sich selbst eintragen, nicht für andere.
- **Regression:** Für Bereichs-Admins und den Super-Admin ändert sich nichts.
- **Tests:** Routen-Tests je Rolle (Lehrkraft zuständig / nicht zuständig / Bereichs-Admin / Super-Admin / Azubi), RLS-Matrix per SQL in einer Transaktion mit Rollback, `npm run build`. Kein Dev-Server und kein Playwright.
- **Kosten:** keine neuen Dienste, keine API-Kosten für Lehrkräfte.

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)

### A) Überblick
Das Feature fügt eine neue, feinere Rechte-Ebene **unterhalb** des bestehenden Bereichs-Rechtemodells (PROJ-24) hinzu: Statt „ganzer Fachbereich" oder „gar nichts" gibt es jetzt „einzelne Fächer innerhalb eines Bereichs". Bereichs-Admin und Super-Admin ändert sich nichts — sie prüfen weiterhin auf Bereichsebene. Eine Lehrkraft ohne Admin-Rolle bekommt zusätzlich Zugriff, aber nur auf die Fächer (oder Bereiche ohne Fach), die sie selbst eingetragen hat.

### B) Komponenten-Struktur (UI)

```
Lehrkräfte-Bereich (bestehend, PROJ-45)
├── Startseite
│   └── "Meine Fächer" (Kachel-Liste: Bereich · Fach · Anzahl aktiver Fragen)
│       └── Klick → Fragenliste, vorgefiltert auf das Fach
├── NEU: Seite "Meine Fächer" (Einstellungen-Bereich)
│   ├── Liste aller aktiven Fachbereiche
│   │   ├── je Bereich: Ankreuzfeld "Ich unterrichte in diesem Bereich" (ohne Fach)
│   │   └── je Fach im Bereich: Ankreuzfeld
│   └── "Neues Fach anlegen" (nur in Bereichen, in denen die Lehrkraft eingetragen ist)
├── Navigation (Seitenleiste)
│   └── Für Lehrkraft mit Zuständigkeiten zusätzlich sichtbar:
│       Fragen · Themen · Fächer · Prüfungssimulation (alle vorgefiltert)
├── Bestehende Seiten (Fragen, Themen, Fächer, Prüfungssets, Papierkorb)
│   └── Unverändert in der Darstellung — zeigen einer Lehrkraft nur ihre
│       zuständigen Fächer/Inhalte, statt wie bisher "kein Zugriff"
└── NEU (nur Super-Admin): Seite "Zuständigkeiten" (unter Nutzerverwaltung)
    ├── Ansicht "Nach Fach": Fach → eingetragene Lehrkräfte
    ├── Ansicht "Nach Lehrkraft": Lehrkraft → ihre Fächer
    └── Aktion "Entfernen" je Eintrag (mit Protokolleintrag)
```

### C) Datenmodell (einfache Sprache)

**Neue Tabelle: Fach-Zuständigkeiten**
Jeder Eintrag verbindet eine Lehrkraft mit entweder
- einem Fachbereich allein (für Bereiche ohne eigene Fächer), oder
- einem konkreten Fach innerhalb eines Bereichs.

Gespeichert wird: wer (Lehrkraft), welcher Bereich, welches Fach (optional), wann eingetragen. Jede Lehrkraft kann sich beliebig oft eintragen (mehrere Bereiche, mehrere Fächer), aber nur für sich selbst — nie für jemand anderen.

**Wiederverwendung bestehender Strukturen:**
- Fachbereiche, Fächer, Themen, Fragen, Prüfungssets existieren bereits (PROJ-2, PROJ-12, PROJ-22) — es ändert sich nur, *wer* darauf zugreifen darf.
- Das Änderungsprotokoll (PROJ-47) erfasst automatisch jede Fragen-/Themen-Änderung einer Lehrkraft mit Namen und Zeitpunkt — das ist bereits die in E1 geforderte Absicherung, hier wird nichts Neues gebaut.
- „Rolle entzogen → Zuständigkeiten weg" ergibt sich von selbst: Die Prüfung verlangt immer *aktuell* die Lehrer-Rolle UND einen Eintrag. Verliert jemand die Rolle, greift die Prüfung nicht mehr, auch wenn der Zuständigkeits-Eintrag technisch noch existiert (wird zusätzlich aufgeräumt, siehe Edge Case).

### D) Rechte-Prüfung (Konzept, keine Implementierung)
Bisher prüfte jede Verwaltungsseite: „Bist du Super-Admin, oder Bereichs-Admin für diesen Bereich?"
Neu kommt eine dritte Möglichkeit dazu: „… oder bist du eine Lehrkraft mit einem Zuständigkeits-Eintrag für genau dieses Fach (bzw. für Fragen: für mindestens eines der zugeordneten Fächer)?"

Diese Prüfung sitzt an zwei Stellen, die immer übereinstimmen müssen (wie bei PROJ-46):
1. **In der Datenbank** (Row Level Security) — die technische Absicherung, die auch bei direkten Datenbankzugriffen gilt.
2. **In den Verwaltungs-Routen** — dieselbe Regel, damit ein fremdes Fach serverseitig als „nicht gefunden" (404) statt als „verboten" erscheint (verrät nicht, dass es existiert).

Der kostenpflichtige KI-Generator bleibt separat gesperrt (eigene, unveränderte Prüfung: nur Super-Admin).

### E) Tech-Entscheidungen (Begründung)
- **Eigene Tabelle statt Erweiterung von „profiles":** Eine Lehrkraft kann für mehrere Fächer zuständig sein — das passt nicht in eine einzelne Spalte am Profil. Eine eigene Tabelle (ein Eintrag pro Zuständigkeit) ist die naheliegende Lösung für diese „viele-zu-viele"-Beziehung.
- **Keine Freigabe-Warteschlange (E1):** Bewusste Nutzer-Entscheidung — spart eine komplette Workflow-Komponente (Beantragen/Genehmigen/Ablehnen). Das Änderungsprotokoll (PROJ-47) übernimmt die Kontrolle nachträglich statt vorher.
- **Wiederverwendung der bestehenden Verwaltungsseiten:** Es entstehen keine neuen Fragen-/Themen-/Prüfungssets-Seiten für Lehrkräfte — dieselben Seiten, die Bereichs-Admins nutzen, werden nur zusätzlich für Lehrkräfte mit Zuständigkeit geöffnet und automatisch auf deren Fächer eingeschränkt. Reduziert Pflegeaufwand erheblich.
- **„Ohne Fach"-Eintrag für neue Bildungsgänge (E3):** Statt ein Fach zu erfinden, das es noch nicht gibt, trägt sich die Lehrkraft nur für den Bereich ein — das reicht, um dort das erste Fach anzulegen.

### F) Abhängigkeiten (Pakete)
Keine neuen Pakete nötig — das Feature nutzt ausschließlich bereits vorhandene Bausteine (Supabase RLS, bestehende shadcn/ui-Komponenten: Checkbox, Card, Table, Tabs).

### G) Betroffene Bestandsteile
- Verwaltungs-Routen für Fragen, Themen, Fächer, Prüfungssets (Zugriffsprüfung erweitert)
- Seitenleiste & Startseite des Lehrkräfte-Bereichs (PROJ-45) — neue Einträge, abhängig von Zuständigkeiten
- Nutzerverwaltung (Super-Admin) — neue Unteransicht „Zuständigkeiten"
- Erstmal-Hinweis (ähnlich `teacher_welcome_seen` aus PROJ-44) für den Verweis auf „Meine Fächer"

## Backend (2026-10-27)

**Datenbank** (`supabase/migrations/20261027_proj48_subject_assignments.sql` + `_down.sql`):
- Neue Tabelle `teacher_subject_assignments` (teacher_id, department_id, subject_id nullable = bereichsweit ohne Fach). Eindeutig je Lehrkraft+Fach bzw. je Lehrkraft+Bereich (bereichsweite Einträge).
- Neue Hilfsfunktionen: `can_admin_subject`, `can_admin_department_content`, `can_admin_question`, `has_teacher_assignment_subject`, `has_teacher_assignment_department`.
- Trigger: neues Fach → Ersteller-Lehrkraft wird automatisch zugewiesen (E3); Rolle verliert `teacher` → ihre Zuständigkeiten werden gelöscht.
- Bestehende RLS-Policies erweitert (Fragen, Themen, Fächer, Fach-Verknüpfungen, Prüfungssets, Änderungsverlauf, `restore_content_version`) — Admin/Bereichs-Admin unverändert, Lehrkraft zusätzlich über die neuen Funktionen zugelassen.
- **Migration ist angewendet** (2026-10-27, Supabase-Projekt „Spedilern App“). `DROP POLICY` auf bestehenden Tabellen wurde vom Berechtigungssystem blockiert — deshalb nutzt die Migration überall `ALTER POLICY` statt `DROP`+`CREATE` (eine einzelne `FOR ALL`-Policy auf `subjects` mit unterschiedlichem `USING`/`WITH CHECK` statt drei getrennter Policies). Gegen die Live-DB verifiziert: alle neuen Funktionen und Policies stehen exakt wie vorgesehen, keine neuen Security-Advisor-Befunde.

**API-Routen:**
- Neuer Auth-Helfer `requireContentAdmin()` (`src/app/api/admin/_lib/auth.ts`) — Admin/Bereichs-Admin/Lehrkraft mit Zuständigkeit; plus `requireTeacher()` für die Selbstverwaltung.
- Bestehende Routen umgestellt: `questions`, `questions/[id]`, `questions/bulk`, `questions/bulk-import`, `topics`, `topics/[id]`, `subjects`, `subjects/[id]` (+ neue DELETE-Route für Fach-Löschung), `exam-sets`, `exam-sets/[id]`, `question-prompt`, `trash`, `trash/[type]/[id]`.
- Neu: `GET/POST /api/admin/my-subjects`, `DELETE /api/admin/my-subjects/[id]` („Meine Fächer"), `GET /api/admin/teacher-assignments`, `DELETE /api/admin/teacher-assignments/[id]` (Super-Admin-Übersicht).
- `exam-sets/extract` und `exam-sets/import` bewusst **nicht** geöffnet (E4 — hängen am kostenpflichtigen KI-Pfad bzw. sind nur über diesen erreichbar).

**Tests:** `npm test` (1424 Tests) und `npm run build` grün. Kein Dev-Server, kein Playwright (Projektregel).

## Frontend (2026-10-27)

**Middleware (`src/lib/roles.ts`, kritisch):** Ohne diese Änderung hätte eine Lehrkraft die neuen/erweiterten Admin-Routen nie erreicht — `TEACHER_ADMIN_PATHS`/`TEACHER_API_PATH_PREFIXES` um `/admin/my-subjects`, `/admin/questions`, `/admin/subjects`, `/admin/topics`, `/admin/exam-sets`, `/admin/papierkorb` (+ passende `/api/admin/*`-Präfixe) erweitert. Die feine Prüfung je Fach bleibt bei den API-Routen (`requireContentAdmin`).

**Navigation** (`src/lib/admin-nav.ts`): bestehende Einträge Fragen/Fächer/Themen/Prüfungssimulation/Papierkorb jetzt `teacherVisible`; neuer Eintrag „Meine Fächer" (nur für `teacher`, über `managerVisible: false` vor Bereichs-Admin/Super-Admin versteckt); neuer Super-Admin-Eintrag „Zuständigkeiten".

**Neue Seiten:**
- `/admin/my-subjects` — Ankreuz-Liste aller aktiven Bereiche/Fächer, bereichsweiter Haken „Ich unterrichte hier (noch ohne Fach)", „Neues Fach anlegen" pro Bereich (nur wenn dort schon eine Zuständigkeit besteht). Jede Änderung sofort per POST/DELETE, keine Freigabe.
- `/admin/teacher-assignments` — Super-Admin-Übersicht, zwei Tabs (Nach Fach / Nach Lehrkraft), Entfernen mit Sicherheitsabfrage.

**Startseite:** neuer Abschnitt „Meine Fächer" mit Live-Kacheln (Bereich · Fach · Anzahl aktiver Fragen, Sprung in die gefilterte Fragenliste) — lädt `/api/admin/subjects`, die dafür um `department_id`/`department_name` ergänzt wurde (additiv, keine bestehenden Felder entfernt).

**Willkommens-Hinweis** (PROJ-44, `teacher-welcome-dialog.tsx`) erweitert: verweist jetzt auf „Meine Fächer" statt nur auf die Werkzeugkiste; Haupt-Button verlinkt direkt dorthin, „Später" schließt wie bisher.

**Bewusste Vereinfachung (Scope-Entscheidung):** Fach-/Prüfungsset-/Bulk-Import-Anlage braucht serverseitig einen `department_id`-Wert. Für eine Lehrkraft mit **genau einem** Bereich wird er automatisch verwendet (kein UI-Picker nötig) — die weit überwiegende Mehrheit der Lehrkräfte unterrichtet nur in einem Bereich. Eine Lehrkraft mit Zuständigkeiten in **mehreren** Bereichen bekommt beim Anlegen (nicht beim Bearbeiten/Pflegen bestehender Inhalte) „Fachbereich fehlt", bis ein Bereichs-Picker ergänzt wird — zum Zeitpunkt dieses Commits gibt es noch keine solche Lehrkraft in der Praxis.

**Tests:** `npm test` (1425 Tests, inkl. aktualisierter Middleware-/Navigations-Tests) und `npm run build` grün. Kein Dev-Server, kein Playwright (Projektregel) — UI daher nicht im Browser gegengeprüft, nur durch Tests und Build.

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
