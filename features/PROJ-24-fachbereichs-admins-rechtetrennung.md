# PROJ-24: Fachbereichs-Admins & Rechtetrennung

## Status: Planned
**Created:** 2026-09-30
**Last Updated:** 2026-09-30

## Kontext
Entspricht Phase 3 aus `docs/plans/mehrere-fachbereiche.md`. Führt eine neue Rolle `department_admin` ein und trennt Admin-Rechte hart nach Fachbereich, damit eine künftige Tourismus-Lehrkraft (PROJ-25) nur ihren eigenen Bereich verwalten kann, ohne Speditions-Daten (insbesondere Noten und Nutzerprofile) einzusehen oder zu ändern.

**Entscheidung E10 (geklärt am 2026-09-30):** Von den 12 bestehenden Konten mit `role = 'admin'` bleibt ausschließlich `david.zach@spedtour.muenchen.musin.de` (Super-Admin) `admin`. Alle übrigen 11 Konten (u. a. bettina.pettinger, petra.schweiger, ulrike.kern, th.wagner, michelle.marquard, gabriele.sagmeister, doris.langen sowie 4 private/Test-Adressen) werden zu `department_admin` mit `department_id = SPED` — sie bleiben Admins, aber beschränkt auf den Speditionsbereich. Grund: keiner der Bestandsentscheidung widerspricht, und der Nutzer hat entschieden, dass diese Konten im Speditionsbereich Admin bleiben dürfen.

## Dependencies
- Requires: PROJ-22 (Fachbereich als Datenbasis) — `departments`-Tabelle und `department_id`-Spalten müssen existieren
- Requires: PROJ-23 (Fachbereichs-Zuordnung für Azubis) — Azubis müssen bereits einem Fachbereich zugeordnet sein
- Blockiert: PROJ-25 (Onboarding Tourismus) — ohne Rechtetrennung darf keine zweite Lehrkraft eingeladen werden

## User Stories
- Als Super-Admin möchte ich als Einziger Rollen vergeben, Fachbereiche anlegen und App-weite Einstellungen (Qualitätsregeln, Prompt-Grundgerüst) ändern können, damit die Hoheit über die App bei mir bleibt.
- Als Bereichs-Admin (Lehrkraft) möchte ich Fragen, Fächer, Themen, Prüfungssets und Leistungsnachweise inkl. Noten meines eigenen Fachbereichs pflegen können, damit ich meinen Unterricht selbstständig verwalte.
- Als Bereichs-Admin möchte ich Azubis meines Bereichs sehen und bei Fehlzuordnung in einen anderen Bereich abgeben können, damit ich falsch registrierte Azubis korrigieren kann.
- Als Bereichs-Admin möchte ich NICHT auf Fragen, Noten, Nutzerprofile oder Shop-Artikel eines anderen Fachbereichs zugreifen können, damit die Trennung zwischen den Bereichen technisch garantiert ist.
- Als Azubi möchte ich, dass mein Profil und meine Noten ausschließlich für Admins meines eigenen Fachbereichs sichtbar sind, damit meine Daten vor fachfremden Lehrkräften geschützt bleiben.
- Als Super-Admin möchte ich im Admin-Panel zwischen Fachbereichen umschalten können, damit ich weiterhin alle Bereiche einsehen und pflegen kann.
- Als Super-Admin möchte ich im Audit-Log Aktionen aller Bereichs-Admins bereichsübergreifend einsehen können, damit ich Missbrauch oder Fehler nachvollziehen kann.

## Acceptance Criteria
- [ ] `profiles.role` erlaubt zusätzlich den Wert `department_admin` (CHECK-Constraint erweitert)
- [ ] Migration: `david.zach@spedtour.muenchen.musin.de` bleibt `admin`; die übrigen 11 bestehenden Admin-Konten werden zu `department_admin` mit `department_id = SPED`
- [ ] Mindestens ein Konto mit `role = 'admin'` muss immer bestehen bleiben (technisch verhindert, nicht nur dokumentiert)
- [ ] Alle RLS-Policies auf `questions`, `answer_options`, `question_subjects`, `topics`, `exam_question_sets`, `graded_assessments`, `shop_items`, `user_shop_items`, `questions_draft`, `generation_jobs`, `admin_audit_log`, `quality_fix_progress`, `profiles` berücksichtigen den Fachbereich
- [ ] `department_admin` sieht und ändert ausschließlich Daten des eigenen Fachbereichs; Zugriff auf ein Objekt eines fremden Bereichs liefert 404 (nicht 403, um dessen Existenz nicht zu verraten)
- [ ] `admin` (Super-Admin) sieht und ändert weiterhin alle Fachbereiche ohne Einschränkung
- [ ] Nur Super-Admin kann: Rollen vergeben/entziehen, Fachbereiche anlegen/bearbeiten, App-weite Qualitätsregeln und Prompt-Grundgerüst ändern, Nutzer zwischen Fachbereichen verschieben
- [ ] `department_admin` kann eigene Azubis in einen anderen Fachbereich verschieben, aber weder die eigene `role` noch die eigene `department_id` ändern
- [ ] `role` und `department_id` bleiben für alle Nutzer per Spalten-Grant nicht selbst schreibbar (bestehendes Verhalten wird nicht geschwächt)
- [ ] Admin-Panel zeigt einen Bereichs-Umschalter, der nur für Super-Admin sichtbar ist
- [ ] Neue Seite „Fachbereich-Einstellungen" erlaubt `department_admin`, `prompt_notes`, Münz-/Hof-Namen zu pflegen und die eigene Bereichs-Adresse einzusehen
- [ ] Alle Admin-API-Routen unter `src/app/api/admin/**` wenden die neue Berechtigungsprüfung an: Listen filtern nach Bereich, Einzelobjekt-Zugriffe prüfen den Bereich des Objekts, Anlegen/Import prüft den Zielbereich
- [ ] Jede schreibende Aktion eines Bereichs-Admins wird im Audit-Log erfasst; Super-Admin sieht bereichsübergreifend, `department_admin` sieht nur Einträge des eigenen Bereichs
- [ ] Bestehende Funktionalität für den Speditionsbereich ist nach der Migration unverändert (Regressionscheck: Fragen, Prüfungssets, Leistungsnachweise, Shop, Rangliste identisch nutzbar)

## Edge Cases
- Ein `department_admin` ruft per direkter ID/URL eine Frage, ein Prüfungsset oder einen Leistungsnachweis eines fremden Bereichs auf → 404, keine Fehlermeldung, die auf Existenz hinweist
- Ein `department_admin` versucht per API die eigene `role` oder `department_id` zu ändern → wird abgelehnt (Spalten-Grant + Routen-Prüfung)
- Ein Bulk-Import enthält ein Fachkürzel, das im Zielbereich nicht existiert (z. B. Kürzel nur in einem anderen Bereich vorhanden) → betroffene Zeile wird mit klarer Fehlermeldung abgelehnt, restlicher Import läuft weiter
- Der letzte verbleibende Super-Admin würde versehentlich auf `department_admin` oder `student` zurückgestuft → verhindert, mindestens ein `admin`-Konto muss bestehen bleiben
- Zwei Fachbereiche verwenden dasselbe Fachkürzel (z. B. `KSK`) und ein Super-Admin importiert Fragen → Import erfolgt immer in den im Umschalter aktuell gewählten Bereich, nie fachkürzel-basiert bereichsübergreifend
- Ein `department_admin` versucht, einen Azubi seines Bereichs in einen Bereich zu verschieben, für den er selbst keine Admin-Rechte hat → nur Super-Admin darf beliebige Zielbereiche wählen; `department_admin` kann Azubis abgeben, aber keine bereichsfremden Admin-Funktionen ausüben
- Export-Routen für Leistungsnachweise/Noten (`admin/assessments/[id]/export`) werden mit der ID eines fremden Bereichs aufgerufen → 404, kein Datenexport
- Ein neu auf `department_admin` zurückgestuftes Konto ist gerade eingeloggt, während die Migration läuft → nächste Anfrage nutzt die neue Rolle; keine Altrechte durch gecachte Sessions (Server prüft Rolle bei jeder Anfrage aus der DB, nicht aus dem Client-Token)
- Ein Konto ohne aktiven Fachbereich (`department_id IS NULL`) hat `role = 'department_admin'` → darf nirgends etwas sehen/ändern (fail closed), nicht versehentlich alles

## Technical Requirements
- **Security:** Zwei-Ebenen-Modell — hart (RLS + Code-Prüfung) für Personen-/Notendaten, weich (Code-Filter) für Inhalte, wie in `docs/plans/mehrere-fachbereiche.md` Abschnitt 6 festgelegt
- **Tech-Design-Referenz für /architecture:** `docs/plans/mehrere-fachbereiche.md`, Abschnitte 4.3 (Hilfsfunktionen), 6 (Rechte & Sicherheit), 10 Phase 3, 13 (E9)
- **Migrationsreihenfolge:** erst Spalten/Rollen-Constraint + Backfill, dann Code deployen, dann Policies verschärfen (wie bei bisherigen Migrationen); jede Policy-Migration mit Rückweg-SQL im selben Commit
- **Tests:** Routen-Tests je Admin-Route mit Super-Admin / eigener Bereich / fremder Bereich (404) / Azubi (403); RLS-Matrix per SQL laut Plan Abschnitt 11; kein Dev-Server/Playwright (siehe Projekt-Memory „Kein Dev-Server") — Build, Vitest, DB-Tests per SQL
- **Kein Datenverlust:** bestehende Admin-Audit-Log-Einträge, Badges, Nutzerdaten bleiben unangetastet

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)
_To be added by /architecture_

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
