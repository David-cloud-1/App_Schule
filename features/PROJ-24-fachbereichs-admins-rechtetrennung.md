# PROJ-24: Fachbereichs-Admins & Rechtetrennung

## Status: Deployed
**Created:** 2026-09-30
**Last Updated:** 2026-10-01

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
- [ ] Nur Super-Admin kann: Rollen vergeben/entziehen, Fachbereiche anlegen/bearbeiten, App-weite Qualitätsregeln und Prompt-Grundgerüst ändern. (Präzisiert nach BUG-2, 2026-09-30: „Nutzer zwischen Fachbereichen verschieben" gilt nur für Admin-Konten — ein `department_admin` darf eigene **Azubis** eigenständig in jeden Bereich abgeben, siehe AC unten.)
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
- Ein `department_admin` verschiebt einen Azubi seines Bereichs in einen anderen Bereich → erlaubt für jeden existierenden Zielbereich (präzisiert nach BUG-2, 2026-09-30); er bekommt dadurch **keine** Admin-Rechte im Zielbereich, nur der Azubi wechselt. Rollen vergeben und Fachbereiche verwalten bleibt weiterhin ausschließlich Super-Admin.
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

### A) Aufbau des Admin-Panels (Komponenten-Baum)

```
Admin-Panel (Grundgerüst, bestehend)
├── Kopfzeile
│   ├── Bereichs-Umschalter (NEU — nur sichtbar für Super-Admin)
│   │   → Dropdown mit allen Fachbereichen; wählt, in welchem Bereich
│   │     der Super-Admin gerade arbeitet (Fragen sieht, importiert, …)
│   └── Angemeldeter Name (bestehend)
│
├── Reiterleiste (bestehend, 9 Reiter — jetzt automatisch bereichsgefiltert)
│   ├── Fragen, Fächer, Themen, Shop-Items, KI-Generator,
│   │   Prüfungssets, Leistungsnachweise, Audit-Log
│   │   → zeigen für Bereichs-Admins nur noch Inhalte des eigenen Bereichs,
│   │     für den Super-Admin nur Inhalte des im Umschalter gewählten Bereichs
│   └── Nutzer (bestehend, erweitert)
│       → Liste zeigt nur Azubis/Admins des eigenen bzw. gewählten Bereichs
│       → NEU: Aktion „In anderen Fachbereich verschieben“ pro Nutzer
│
├── Fachbereich-Einstellungen (NEU — eigener Reiter)
│   → Für Bereichs-Admin UND Super-Admin (jeweils für den eigenen/gewählten Bereich)
│   ├── Formular: Zusatzhinweise für den Fragen-Prompt (Freitext)
│   ├── Formular: Name der Münzen, Name des Hofs
│   └── Anzeigefeld (nur lesbar): eigene Bereichs-Adresse zum Kopieren
│
└── Fachbereiche verwalten (NEU — eigener Reiter, NUR Super-Admin)
    ├── Liste aller Fachbereiche mit Kurzdaten (Name, Adresse, Anzahl Azubis)
    ├── „Neuen Fachbereich anlegen“ (Formular: Name, Adresse, Branding-Basiswerte)
    └── Rollenverwaltung: Person suchen → Rolle setzen
        (Azubi / Bereichs-Admin für Bereich X / Super-Admin)
```

Alle neuen Bildschirme verwenden ausschließlich Bausteine, die im Projekt bereits im Einsatz sind (Tabs, Formulare, Tabellen, Dropdowns, Dialoge) — es entsteht kein neuer visueller Stil.

### B) Datenmodell (in einfachen Worten)

- **Rollen:** Jedes Profil hat weiterhin genau eine Rolle. Bisher gab es „Azubi“ und „Admin“. Neu kommt eine dritte Möglichkeit dazu: **„Bereichs-Admin“** — hat dieselben Admin-Werkzeuge wie „Admin“, aber ausschließlich für den eigenen Fachbereich. Nur der Super-Admin darf Rollen vergeben.
- **Fachbereiche:** Die Tabelle mit allen Fachbereichen (Name, Adresse, Branding, Prompt-Texte, Münz-/Hof-Namen) existiert bereits seit PROJ-22 — hier wird nichts Neues gespeichert, nur die Bedienoberfläche dafür ergänzt.
- **Zugehörigkeit:** Jede Frage, jedes Fach, jedes Prüfungsset, jeder Leistungsnachweis, jeder Shop-Artikel und jeder Protokoll-Eintrag „weiß“ bereits heute, zu welchem Fachbereich er gehört (ebenfalls seit PROJ-22). Neu ist nur die **Prüfung**: Bevor ein Bereichs-Admin etwas sieht, ändert oder anlegt, vergleicht die App den Fachbereich des Objekts mit dem eigenen. Passt es nicht zusammen, verhält sich die App so, als gäbe es das Objekt gar nicht — es erscheint keine Fehlermeldung, die verraten würde, dass fremde Daten existieren.
- **Migration der Bestandsdaten:** Beim Ausrollen wird automatisch genau ein Konto (dein Konto) auf „Admin“ (Super-Admin) belassen; die übrigen 11 heutigen Admin-Konten werden zu „Bereichs-Admin“ für Spedition umgestellt (siehe Kontext-Abschnitt oben). Alle bestehenden Fragen, Noten, Abzeichen und Protokoll-Einträge bleiben unverändert erhalten.
- Gespeichert wird weiterhin ausschließlich in der bestehenden Supabase-Datenbank — kein neuer Dienst, keine neue Datenbank.

### C) Technische Entscheidungen (Begründung)

- **Dritte Rolle statt eigenes Berechtigungssystem:** Die App kennt bereits das Muster „eine Rolle pro Profil“ (Azubi/Admin). Eine dritte Rolle fügt sich in dieses bestehende Muster ein, statt ein komplett neues Rechte-System einzuführen — kleinste sinnvolle Änderung, am wenigsten neue Fehlerquellen.
- **Doppelte Absicherung nur bei sensiblen Daten:** Nutzerprofile, Noten und Prüfungsteilnahmen werden sowohl auf Datenbankebene als auch im Programmcode geprüft — das ist der Bereich, in dem ein Fehler am meisten schaden würde (Datenschutz). Lerninhalte (Fragen, Fächer) werden nur im Programmcode gefiltert, weil sie nicht geheim sind und die zusätzliche Datenbank-Absicherung bei der großen Fragenmenge spürbar Ladezeit kosten würde.
- **„Nicht gefunden“ statt „Kein Zugriff“ bei fremden Daten:** Verhindert, dass ein Bereichs-Admin durch gezieltes Ausprobieren von Adressen/IDs herausfindet, was im anderen Bereich überhaupt existiert (z. B. wie viele Leistungsnachweise Tourismus hat).
- **Rollenprüfung bei jeder Anfrage, nicht nur beim Login:** Wenn du jemandem die Admin-Rechte entziehst, wirkt das sofort — auch wenn die Person gerade eingeloggt ist. Es gibt keine Verzögerung durch zwischengespeicherte Berechtigungen.
- **Kein neuer Anbieter, keine neuen Kosten:** Alles baut auf der bestehenden Supabase-Datenbank und den bestehenden Admin-Seiten auf. Die Grundlage (Fachbereichs-Tabelle) wurde bereits mit PROJ-22 bezahlt und gebaut.
- **Sichtbarkeit des Bereichs-Umschalters:** Nur der Super-Admin sieht ihn, weil nur er mehrere Bereiche verwaltet. Ein Bereichs-Admin braucht ihn nicht — für sie/ihn ist immer nur der eigene Bereich sichtbar, ohne Auswahl.

### D) Abhängigkeiten (Pakete)

Keine neuen Pakete nötig. Es werden ausschließlich bereits installierte shadcn/ui-Bausteine verwendet (Dropdown/Select für den Umschalter, Dialog für die Rollenvergabe, Tabelle für die Fachbereichs-Liste, Formularfelder für die Einstellungen-Seite).

## Implementation Notes (Backend Developer)

**Umfang dieses Durchlaufs (mit Nutzer abgestimmt):** Nur Server-Seite — Migration, Rollen-Logik, alle Admin-Routen abgesichert, neue API-Endpunkte. Keine neuen Bildschirme (Bereichs-Umschalter-UI, Fachbereich-Einstellungen-Seite, Fachbereiche-Verwaltungs-Seite) — die bestehenden 9 Admin-Reiter funktionieren aber bereits bereichsgefiltert für `department_admin`. Testtiefe: `requireAdmin()`/`canAdminDepartment()` gründlich getestet (14 Tests) plus je ein Routen-Test pro Berechtigungsmuster (direkte `department_id`-Spalte, über Fach abgeleitet, Service-Role-Route) statt aller 34 Routen × 4 Szenarien.

**Migration `20260930_proj24_department_admins.sql` (angewendet auf Produktion):**
- Rolle `department_admin` zum `profiles.role`-Constraint hinzugefügt
- Datenmigration E10 ausgeführt: nur `david.zach@spedtour...` blieb `admin`; die übrigen 11 Konten wurden `department_admin` (Ergebnis geprüft: 1 admin, 11 department_admin, 51 student)
- Schutz-Trigger `prevent_last_admin_change`: verhindert, dass der letzte Super-Admin zurückgestuft/gelöscht wird
- Hilfsfunktionen: `my_department_id()`, `is_department_admin()`, `can_admin_department(uuid)`, `subject_department(uuid)`, `question_department(uuid)`
- `department_id`-Spalten an `generation_jobs` und `questions_draft` ergänzt (fehlten in PROJ-22 trotz Ankündigung im Plan)
- RLS-Policies bereichsbewusst gemacht auf: `questions`, `answer_options`, `question_subjects`, `topics`, `exam_question_sets`, `graded_assessments`, `shop_items`, `user_shop_items`, `questions_draft`, `generation_jobs`, `admin_audit_log`, `profiles`, `quality_fix_progress` — **plus** `subjects` (hatte seit PROJ-22 gar keine Schreib-Policy — echte Sicherheitslücke, hier geschlossen) und `exam_parts`/`exam_part_subjects` (in der ursprünglichen Bestandsaufnahme nicht gelistet, gehören aber zur Prüfungsverwaltung nach E9)
- Rückweg: `20260930_proj24_department_admins_down.sql`

**`requireAdmin()` (`src/app/api/admin/_lib/auth.ts`) überarbeitet:**
- Gibt jetzt zusätzlich `role`, `isSuperAdmin` zurück
- Super-Admin: `departmentId` kommt aus dem Cookie `admin_department_id` (Bereichs-Umschalter), sonst Rückfall auf eigenes Profil/Standardbereich
- `department_admin`: immer der eigene Bereich, **kein** Rückfall auf den Standardbereich, wenn `department_id` fehlt (fail closed, Edge Case aus der Spec) — liefert dann 403 statt heimlich Zugriff zu gewähren
- Neue Helfer `canAdminDepartment()` / `assertCanAdminDepartment()` (404 statt 403 bei fremdem Bereich)

**Kritische Lücke gefunden und behoben:** `src/proxy.ts` (Middleware) sperrte `/admin` und `/api/admin` bisher hart auf `role === 'admin'` — ohne diese Korrektur wären alle 11 `department_admin`-Konten komplett ausgesperrt gewesen, unabhängig von allen anderen Änderungen. Ebenso angepasst: `src/app/admin/layout.tsx` (Seiten-Gate), `src/app/page.tsx` (`isAdmin`-Flag für den Panel-Link auf der Startseite).

**Bestehende Admin-Routen gehärtet** (Liste filtert nach Bereich, Einzelobjekt prüft Bereich → 404, Anlegen setzt `department_id` explizit): `subjects`, `subjects/[id]`, `topics`, `topics/[id]`, `shop-items`, `shop-items/[id]`, `exam-sets/[id]`, `questions` (Liste + Export hatten **gar keinen** Bereichsfilter — echte Datenlecks, geschlossen über neues `fetchQuestionIdsForDepartment()` in `src/lib/subject-questions.ts`), `questions/[id]`, `audit-log` (nutzte Service-Client ohne Bereichsfilter — echtes Leck, geschlossen), `users`, `users/[id]` (Rollenvergabe jetzt Super-Admin-only, Bereichs-Verschiebung für beide Rollen, dabei auch den Vorab-Bug `role: 'user'` statt `'student'` in `src/app/admin/users/page.tsx` und der API-Validierung behoben), `ai-generate/upload`, `ai-generate/_lib/process-job.ts`, `ai-generate/jobs`, `ai-generate/drafts`, `assessments/[id]/participants/[sessionId]` (Service-Role-Route ohne Bereichsprüfung — echtes Leck, geschlossen).

**Nicht geändert (bewusst, per Review sicher):** `questions/bulk`, `questions/bulk-import`, `ai-generate/drafts/[id]`, `ai-generate/drafts/[id]/accept`, `ai-generate/drafts/bulk-accept`, `ai-generate/drafts/bulk-reject`, `ai-generate/jobs/[id]/retry`, `exam-sets/import`, `exam-sets/extract`, `question-prompt`, `assessments` (GET), `assessments/[id]` (GET/PATCH/DELETE), `assessments/[id]/export`, `assessments/[id]/results` — arbeiten bereits über den nutzer-gebundenen Client, dessen RLS-Policies jetzt bereichsbewusst sind, oder setzen `department_id` bereits korrekt. `questions/[id]/stats` liefert nur Aggregat-Zahlen ohne Fragetext — geringes Risiko, nicht zusätzlich abgesichert.

**Neue Endpunkte:**
- `POST /api/admin/context/department` — Bereichs-Umschalter-Cookie, nur Super-Admin
- `GET/PATCH /api/admin/department-settings` — eigene Bereichs-Branding-Felder (`prompt_notes`, `currency_name`, `hof_name`, `hof_short_name`) für beide Rollen, läuft über den Service-Client mit Code-Prüfung (wie `admin/users`), weil `departments` per RLS nur Super-Admin-Schreibrechte hat
- `GET/POST /api/admin/departments` + `PATCH /api/admin/departments/[id]` — volle Bereichsverwaltung, nur Super-Admin

**Verifiziert:** `npm test` (558/558 grün, inkl. 14 neue Tests für `requireAdmin`/`canAdminDepartment` und je 1 Routen-Test-Datei für die drei Berechtigungsmuster), `npm run build` (grün). `npm run lint` schlägt projektweit mit einem vorbestehenden ESLint-v9-Konfigurationsfehler fehl (keine `eslint.config.js`) — nicht durch PROJ-24 verursacht, sollte separat behoben werden.

**Noch offen für /frontend:** Bereichs-Umschalter-Dropdown in der Kopfzeile, Seite „Fachbereich-Einstellungen" (nutzt `GET/PATCH /api/admin/department-settings`), Seite „Fachbereiche verwalten" (nutzt `GET/POST /api/admin/departments`, `PATCH /api/admin/departments/[id]`), Rollenvergabe-UI für `department_admin` in der Nutzerverwaltung.

## QA Test Results

**Tested:** 2026-09-30
**App URL:** kein Dev-Server verwendet (Projekt-Memory „Kein Dev-Server" — `npm run dev`/Playwright bringen die Maschine zum Absturz). Getestet über `npm test`, `npm run build` und eine transaktionale RLS-Matrix per SQL direkt gegen die Produktions-DB (Rollback, keine Daten verändert) — genau der in den Technical Requirements der Spec vorgeschriebene Ansatz.
**Tester:** QA Engineer (AI)

### Acceptance Criteria Status

- [x] AC-1 `profiles.role` erlaubt `department_admin` — verifiziert (Constraint + reale Daten)
- [x] AC-2 Migration E10 (1 admin, 11 department_admin, SPED) — verifiziert per SQL (`select role, count(*) from profiles group by role` → 1/11/51)
- [x] AC-3 Letzter Super-Admin geschützt — verifiziert: `UPDATE profiles SET role='student' WHERE id=<letzter admin>` löst die erwartete Exception aus
- [x] AC-4 Alle RLS-Policies bereichsbewusst — nach BUG-1-Fix vollständig: alle 14 in der Spec genannten Tabellen sowie `subjects`/`exam_parts`/`exam_part_subjects` (siehe Implementation Notes) per SQL-Matrix bestätigt
- [x] AC-5 department_admin sieht/ändert ausschließlich eigenen Bereich — Schreiben war von Anfang an blockiert; Lesen (Admin-Oberfläche und jetzt auch direkter DB-/REST-Zugriff nach BUG-1-Fix) per SQL-Matrix bestätigt
- [x] AC-6 Super-Admin sieht/ändert alle Bereiche — verifiziert (`can_admin_department()` = true für fremden Testbereich, Fach sichtbar)
- [x] AC-7 Nur Super-Admin vergibt Rollen/verwaltet Fachbereiche — verifiziert (403 für department_admin bei Rollenänderung); Wortlaut nach BUG-2 präzisiert (Nutzer-Entscheidung 2026-09-30: „Nutzer verschieben" bezieht sich nur auf Admin-Konten, nicht auf Azubis). App-weite Qualitätsregeln/Prompt-Grundgerüst bleiben wie im Plan vorgesehen Code, kein DB-Feld.
- [x] AC-8 department_admin verschiebt eigene Azubis, nicht eigene role/department_id — verifiziert (Selbst-Bearbeitung 400, Rollen-Feld 403 für department_admin)
- [x] AC-9 role/department_id nicht selbst schreibbar — verifiziert per SQL: `UPDATE profiles SET role='admin'` als Student → `permission denied` (Spalten-Grant)
- [x] AC-10 Bereichs-Umschalter im Admin-Panel — umgesetzt (Runde 2, 2026-09-30): `DepartmentSwitcher` wird serverseitig nur für `isSuperAdmin` gerendert; `POST /api/admin/context/department` lehnt department_admin zusätzlich mit 403 ab (Vitest bestätigt) — doppelt abgesichert, nicht nur versteckt.
- [x] AC-11 Seite „Fachbereich-Einstellungen" — umgesetzt (Runde 2, 2026-09-30): `/admin/department-settings` nutzt `GET/PATCH /api/admin/department-settings`, beide Rollen sehen ihren eigenen Bereich, Adresse per Kopier-Button.
- [x] AC-12 Admin-API-Routen wenden Berechtigungsprüfung an — verifiziert für alle geänderten Routen (Vitest + Codereview); die verbleibende Lücke ist die RLS-Ebene aus BUG-1, nicht die Routen selbst
- [x] AC-13 Audit-Log bereichsgefiltert — verifiziert per SQL: department_admin sieht 347 (SPED), Super-Admin sieht 348 (inkl. Test-Bereich)
- [x] AC-14 Bestandsfunktionalität unverändert — 558/558 Vitest-Tests grün, `npm run build` grün, SPED-Fächer weiterhin lesbar/zählbar wie vorher

**14 / 14 vollständig bestanden** (Stand nach Runde 2 — siehe unten).

### Edge Cases Status

- [x] EC-1 Fremder Bereich → 404 bei Schreibzugriff — bestätigt (UPDATE betrifft 0 Zeilen an allen getesteten Tabellen; Routen-Codereview bestätigt 404 statt Fehlerleck)
- [x] EC-2 department_admin ändert eigene role/department_id → abgelehnt — bestätigt
- [x] EC-3 Bulk-Import unbekanntes Kürzel → klare Fehlermeldung — unverändert aus PROJ-22/23, durch bestehende Tests abgedeckt, nicht erneut manuell geprüft
- [x] EC-4 Letzter Super-Admin geschützt — bestätigt
- [x] EC-5 Gleiches Kürzel in zwei Bereichen, Super-Admin importiert in gewählten Bereich — per Codereview bestätigt (`resolveSubjectCode` nutzt konsequent `departmentId` aus dem Umschalter-Cookie)
- [x] EC-6 department_admin verschiebt eigene Azubis in jeden Bereich, ohne dadurch Rechte im Zielbereich zu erhalten — bestätigt (Nutzer-Entscheidung 2026-09-30, Wortlaut korrigiert, Implementierung unverändert)
- [x] EC-7 Export mit fremder Leistungsnachweis-ID → 404 — bestätigt (keine konkurrierende RLS-Policy auf `graded_assessments`, Codereview der Export-Route)
- [x] EC-8 Sofortige Rollenwirkung, keine Session-Altrechte — bestätigt per Codereview (`requireAdmin()` liest die Rolle bei jeder Anfrage aus der DB)
- [x] EC-9 department_admin ohne Bereich → fail closed — bestätigt per Vitest-Test (403 statt Rückfall auf Standardbereich)

### Security Audit Results (Red Team)

- [x] Authentifizierung: `/admin` und `/api/admin/*` ohne Login → 401/Redirect (Middleware, unverändert getestet)
- [x] Autorisierung (Schreiben): department_admin kann in 6 Tabellen (Fach, Frage, Shop-Item, geprüft) keine fremden Bereichsdaten ändern — UPDATE betrifft 0 Zeilen
- [ ] **Autorisierung (Lesen): department_admin kann fremde `shop_items`/`exam_question_sets` direkt per Datenbank-/REST-Zugriff lesen — siehe BUG-1**
- [x] Rollen-Eskalation: Student kann `role`/`department_id` nicht selbst setzen (Spaltengrant, per SQL bestätigt: `permission denied`)
- [x] Letzter-Admin-Schutz technisch erzwungen (Trigger), nicht nur dokumentiert
- [x] Keine Geheimnisse in den geänderten Dateien (Migration, Routen) hartkodiert
- [x] `department-settings`-Endpunkt: Zod-Schema lässt nur unkritische Branding-Felder zu, kein Weg zu `domain`/`code`/`is_active` für department_admin
- [x] Cookie-basierter Bereichs-Umschalter: `httpOnly`, `sameSite=lax`, nur Super-Admin kann ihn setzen (403 für department_admin geprüft), Server validiert den Bereich serverseitig neu (kein Vertrauen in den Cookie-Wert allein)

### Bugs Found

#### BUG-1: RLS erlaubt bereichsübergreifendes Lesen von `shop_items` und `exam_question_sets`
- **Status: BEHOBEN (2026-09-30)** — Migration `20260930_proj24_bug1_shop_examsets_rls.sql` angewendet (`shop_items_select_active` und `"Users read active exam sets"` prüfen jetzt zusätzlich `department_id = my_department_id()`). Fix per derselben SQL-Matrix verifiziert: fremder Testbereich für department_admin und Student nicht mehr sichtbar (0/0), eigener Bereich weiterhin sichtbar (Regression bestanden), Super-Admin weiterhin uneingeschränkt (über `can_admin_department()`). `npm test` (558/558) danach erneut grün. Rückweg: `20260930_proj24_bug1_shop_examsets_rls_down.sql`.
- **Severity:** High
- **Mechanismus:** Beide Tabellen haben zusätzlich zur neuen bereichsbewussten Admin-Policy eine unveränderte, vor-PROJ-24 bestehende Richtlinie für „aktive Einträge": `shop_items_select_active` (`is_active = true`, kein Bereichsfilter) und `"Users read active exam sets"` (`is_active = true`, kein Bereichsfilter). Da PostgreSQL-RLS-Policies permissiv ODER-verknüpft werden, genügt die alte Policy, um einem `department_admin` per direktem Datenbank-/REST-Zugriff (z. B. eigener `fetch` mit dem eigenen Supabase-Session-Token, am Admin-Panel vorbei) aktive Shop-Artikel und Prüfungssets **jedes** anderen Bereichs zu zeigen.
- **Steps to Reproduce (SQL, transaktional, per Rollback rückgängig gemacht):**
  1. Fachbereich „QATEST" mit einem aktiven Shop-Item und einem aktiven Prüfungsset anlegen
  2. Als echter SPED-`department_admin` (`c7f45450-…`) einloggen (`request.jwt.claim.sub` setzen)
  3. `SELECT * FROM shop_items WHERE id = '<QATEST-Item>'` → erwartet 0 Zeilen, tatsächlich 1
  4. `SELECT * FROM exam_question_sets WHERE id = '<QATEST-Set>'` → erwartet 0 Zeilen, tatsächlich 1
- **Wichtig zur Einordnung:** Die Admin-Oberfläche selbst ist **nicht** betroffen — `GET /api/admin/shop-items` und `GET /api/admin/exam-sets` filtern bereits korrekt per Code (`eq('department_id', departmentId)`, per Vitest bestätigt). Die Lücke wirkt nur, wenn jemand die Datenbank/REST-API direkt anspricht statt die App-Routen zu nutzen. Schreiben ist über beide Wege weiterhin korrekt blockiert.
- **Empfohlener Fix:** Beide Policies bereichsbewusst machen, z. B. `shop_items_select_active` → `USING (is_active = true AND (department_id = my_department_id() OR my_department_id() IS NULL))` (damit Azubis weiterhin nur den eigenen Bereich sehen) bzw. analog für `"Users read active exam sets"`. Kurzes Folge-Migrationsskript, kein Rollback des bestehenden PROJ-24-Stands nötig.
- **Priority:** Vor `/deploy` der UI beheben (nächster `/backend`-Durchlauf), da es sonst dauerhaft als offene Lücke bestehen bleibt, sobald PROJ-25 einen zweiten echten Bereich anlegt.

#### BUG-2: AC-7 und AC-8 widersprechen sich zur Frage, wer Azubis zwischen Bereichen verschieben darf
- **Status: GEKLÄRT (2026-09-30)** — Nutzer-Entscheidung: Die bestehende Implementierung bleibt so (department_admin darf eigene Azubis in jeden existierenden Bereich abgeben, ohne dadurch Rechte im Zielbereich zu erhalten; Rollenvergabe und Fachbereichsverwaltung bleiben Super-Admin-only). AC-7, EC-6 und der Plan-Dokument-Verweis oben im Text präzisiert. Keine Code-Änderung nötig.
- **Severity:** Low (Spec-Inkonsistenz, keine technische Lücke)
- **Details:** AC-7 sagt „Nur Super-Admin kann … Nutzer zwischen Fachbereichen verschieben", AC-8 sagt „department_admin kann eigene Azubis in einen anderen Fachbereich verschieben" — wörtlich widersprüchlich. Die Umsetzung folgt AC-8 und dem Plan-Dokument (`docs/plans/mehrere-fachbereiche.md`, „Falsch zugeordnet? Die Lehrkraft … hängt Azubis … um"): `department_admin` darf eigene Azubis in **jeden** existierenden Bereich verschieben (kein Ziel-Bereichs-Check), nur Rollenvergabe bleibt Super-Admin-only.
- **Zugehöriger Edge Case EC-6** ist ebenso widersprüchlich formuliert („kann Azubis abgeben" vs. „nur Super-Admin darf beliebige Zielbereiche wählen").
- **Priority:** Nutzer-Entscheidung nötig, ob die Umsetzung (department_admin darf in jeden Bereich abgeben) so bleibt oder auf bestimmte Zielbereiche beschränkt werden soll. Kein Sicherheitsrisiko (der Azubi verliert dabei keine Daten, der department_admin erhält keine Rechte im Zielbereich), daher niedrige Priorität.

### Summary (Runde 1, Backend)
- **Acceptance Criteria:** 12/14 vollständig bestanden, 2 bewusst nicht umgesetzt (UI, nächster `/frontend`-Durchlauf)
- **Bugs Found:** 2 total — beide **geklärt** (1 High behoben und verifiziert, 1 Low per Nutzer-Entscheidung geklärt, keine Code-Änderung nötig)
- **Security:** Schreibschutz solide; der einzige Lesezugriffs-Fund (BUG-1) ist behoben und verifiziert
- **Production Ready:** NO — einzig weil die UI (AC-10, AC-11) noch fehlt, nicht wegen offener Bugs
- **Recommendation:** Status bleibt **In Review**, bis `/frontend` den Bereichs-Umschalter und die Fachbereich-Einstellungen-Seite gebaut hat. Backend-seitig ist PROJ-24 damit abgeschlossen.

---

### Runde 2 (Frontend, 2026-09-30)

**Getestet:** `npm test` (558/558 grün), `npm run build` (grün). Kein Dev-Server/Playwright (Projekt-Memory) — stattdessen Codereview der neuen Client-Komponenten und API-Antworten (welche Felder gehen tatsächlich über das Netzwerk an welche Rolle).

**AC-10 und AC-11 jetzt bestanden** (siehe oben) — damit sind alle 14 Acceptance Criteria der Spec erfüllt.

**Zusätzliche Edge Cases geprüft:**
- [x] department_admin ruft `/admin/departments` direkt per URL auf (Tab ist versteckt) → sieht die Liste (siehe BUG-3), jeder Schreibversuch (Anlegen/Bearbeiten) scheitert serverseitig mit 403 — kein Sicherheitsproblem, nur ein generischer Fehler-Toast statt sauberer Weiterleitung. Konsistent mit allen anderen Admin-Unterseiten der App (keine hat ein clientseitiges Rollen-Gate, alle verlassen sich auf die API) — keine Regression, nur erwähnenswert.
- [x] Super-Admin versucht, die eigene Rolle zu ändern → Button ist im UI deaktiviert (`disabled={isSelf}`), zusätzlich serverseitig durch „Du kannst dich nicht selbst bearbeiten" (400) und den Letzter-Admin-Trigger abgesichert — dreifach abgesichert.

#### BUG-3: `GET /api/admin/departments` liefert department_admin interne Felder fremder Bereiche
- **Status: BEHOBEN (2026-10-01)** — `GET /api/admin/departments` fragt für `department_admin` jetzt nur noch `id, name, code, domain` ab (eigener Code-Pfad vor dem vollen `DEPARTMENT_COLUMNS`-Select für Super-Admin). Mit Vitest verifiziert: `requestedColumns` enthält weder `prompt_notes` noch `prompt_role`; Super-Admin erhält weiterhin alle Felder (`promptNotes` im Response vorhanden). `npm test` (559/559) und `npm run build` danach grün.
- **Severity:** Medium
- **Mechanismus:** Für den „In anderen Fachbereich verschieben"-Dialog wurde `GET /api/admin/departments` in diesem Durchlauf für beide Rollen geöffnet (siehe Implementation Notes unten). Die Route liefert aber weiterhin das volle `Department`-Objekt für **alle** Bereiche — inklusive `promptNotes` (interner Freitext der Lehrkraft für den Fragen-Prompt), `promptRole`, `targetGroup`, `pseudonymNouns` und `classLevels` — nicht nur die für den Dialog tatsächlich nötigen Felder `id`/`name`/`code`/`domain`. Ein `department_admin` sieht damit interne Konfigurationstexte fremder Bereiche, sobald ein zweiter Bereich existiert.
- **Steps to Reproduce:** Als `department_admin` in der Nutzerverwaltung bei einem Azubi auf „In anderen Fachbereich verschieben" klicken → Netzwerk-Tab zeigt die Antwort von `GET /api/admin/departments` mit den vollen Feldern aller Bereiche, nicht nur des eigenen.
- **Einordnung:** Aktuell **nicht beobachtbar** in Produktion, da nur der Bereich SPED existiert — der Fund wird erst mit PROJ-25 (zweiter Bereich) real. Betrifft keine Personen-/Notendaten (die bleiben laut BUG-1-Fix und Runde 1 hart getrennt), sondern interne Bereichs-Konfiguration — deshalb Medium statt High.
- **Empfohlener Fix:** `GET /api/admin/departments` liefert für `department_admin` nur ein schlankes `{id, name, code, domain}` je Bereich; Super-Admin weiterhin alle Felder (z. B. Feld-Auswahl abhängig von `auth.isSuperAdmin`).
- **Priority:** Vor PROJ-25 (Tourismus anlegen) beheben, da der Fund erst dann wirksam wird.

#### BUG-4 (Low): Bestätigungsdialog für Rollenwechsel zu „Bereichs-Admin" irreführend, wenn die Person keinen Bereich hat
- **Severity:** Low
- **Details:** Der Bestätigungstext sagt immer „… wird „Bereichs-Admin" für den eigenen Fachbereich", auch wenn `department_id` der Person `null` ist. In diesem Fall bricht die Aktion nach Bestätigung mit einer Fehlermeldung der API ab („Bereichs-Admin braucht einen Fachbereich"), statt das vorher im Dialog klarzustellen.
- **Priority:** Nice to have — seltener Fall (Profile ohne Bereich sind laut PROJ-23 nur ein kurzes Übergangs-Fenster direkt nach Registrierung).

### Summary (Runde 2, gesamt)
- **Acceptance Criteria:** 14/14 vollständig bestanden
- **Bugs Found (Runde 2):** 2 neu — 1 Medium (**BUG-3, behoben**), 1 Low (BUG-4, offen, nice-to-have), zusätzlich zu den aus Runde 1 bereits geklärten BUG-1/BUG-2
- **Security:** Kein Critical/High-Fund in dieser Runde; BUG-3 behoben und verifiziert
- **Production Ready:** **YES** — kein Critical/High/Medium-Bug mehr offen
- **Recommendation:** Status **Approved**, bereit für `/deploy`.

### Post-Deployment: BUG-5 — Bereichs-Umschalter wirkte nicht in der Nutzerverwaltung (gemeldet 2026-10-01, sofort behoben)
- **Status: BEHOBEN (2026-10-01)**
- **Severity:** Medium (sichtbare Falschanzeige, kein Datenleck — alle Felder waren ohnehin nur für Admin-Rollen zugänglich)
- **Meldung:** Nutzer berichtet, dass im Admin-Panel unter „Nutzer" trotz Auswahl „Tourismuskaufleute" im Bereichs-Umschalter weiterhin alle 93 Nutzer (inkl. Spedition) angezeigt wurden.
- **Ursache:** `GET /api/admin/users` ([src/app/api/admin/users/route.ts](../src/app/api/admin/users/route.ts)) filterte den Fachbereich nur für `department_admin`, nicht für Super-Admin (`if (!isSuperAdmin) query = query.eq('department_id', departmentId)`). `requireAdmin()` liefert den `departmentId` für Super-Admin aber bereits korrekt aus dem Bereichs-Umschalter-Cookie — die Route hat diesen Wert schlicht ignoriert.
- **Fix:** Der Filter `.eq('department_id', departmentId)` wird jetzt immer angewendet, unabhängig von der Rolle — auf Nutzerentscheidung hin soll der Umschalter für Super-Admins ausnahmslos den gewählten Bereich filtern. Test ergänzt (`route.test.ts`: „filters by the chosen department even for a super-admin"). `npm test` für die Route grün (5/5).

## Implementation Notes (Frontend Developer)

**Neue Seiten:**
- `/admin/department-settings` — Formular für `prompt_notes`, Münz-/Hof-Name, Kurzform, plus schreibgeschütztes Adressfeld mit Kopier-Button. Für beide Rollen sichtbar, nutzt `GET/PATCH /api/admin/department-settings`.
- `/admin/departments` — Liste aller Fachbereiche + „Neuer Fachbereich"-Formular (`DepartmentFormModal`), nur Super-Admin. Nutzt `GET/POST /api/admin/departments`, `PATCH /api/admin/departments/[id]`.

**Neue Komponenten:**
- `AdminRoleProvider`/`useAdminRole()` (`src/components/admin/admin-role-provider.tsx`) — stellt `role`/`isSuperAdmin` aus dem Server-Layout allen Client-Komponenten im Admin-Panel bereit, analog zu `DepartmentProvider`.
- `DepartmentSwitcher` (`src/components/admin/department-switcher.tsx`) — in der Kopfzeile, nur für Super-Admin gerendert, und nur sichtbar, wenn mehr als ein Fachbereich existiert (aktuell also unsichtbar, bis ein zweiter Bereich angelegt wird). Setzt das Cookie über `POST /api/admin/context/department` und lädt die Seite danach neu (`window.location.reload()`), damit alle Client-Seiten ihre Daten für den neuen Bereich frisch abrufen.
- `MoveDepartmentDialog` — „In anderen Fachbereich verschieben" für Azubis, in der Nutzerverwaltung verbaut.

**Nutzerverwaltung (`/admin/users`) erweitert:**
- Rollen-Badge zeigt jetzt „Bereichs-Admin" statt nur „Admin"
- Die frühere Admin/Student-Umschaltfläche wurde durch ein Dropdown mit allen drei Rollen ersetzt (nur für Super-Admin sichtbar, AC-7); bei Wahl von „Bereichs-Admin" wird automatisch der bisherige Fachbereich der Person als Ziel mitgeschickt
- Neue Aktion „In anderen Fachbereich verschieben" pro Azubi-Zeile (für beide Admin-Rollen sichtbar, passend zu AC-8/BUG-2-Klärung)

**Kleine Backend-Anpassung während dieses Durchlaufs:** `GET /api/admin/departments` war bisher Super-Admin-only; für die Zielbereich-Auswahl im „Verschieben"-Dialog braucht auch ein `department_admin` die Liste. Da `departments` laut RLS ohnehin öffentlich lesbar ist (Name/Adresse stehen schon auf der Login-Seite), wurde das GET für beide Admin-Rollen geöffnet — Anlegen/Bearbeiten (POST/PATCH) bleibt Super-Admin-only. Zugehöriger Vitest-Test angepasst.

**Bewusst nicht umgesetzt:** Pseudonym-Wortliste eines Fachbereichs ist über die UI nicht editierbar (nur beim Anlegen per Datenbank-Default „neutral" möglich) — laut Tech Design kein Pflichtfeld für diesen Durchlauf, kann bei Bedarf in PROJ-25 ergänzt werden.

**Verifiziert:** `npm test` (558/558 grün), `npm run build` grün (kein Dev-Server/Playwright laut Projekt-Memory).

## Deployment

**Deployed:** 2026-10-01
**Production URL:** https://spedilern.vercel.app
**Vercel-Projekt:** `spedilern` (`prj_cd5B6uCEbsCyrwuMmprc1PkBViO5`)

**Pre-Deployment-Checks:**
- [x] `npm run build` lokal erfolgreich
- [ ] `npm run lint` — schlägt projektweit mit vorbestehendem ESLint-v9-Konfigurationsfehler fehl (keine `eslint.config.js`, siehe QA Runde 1); nicht durch PROJ-24 verursacht, nicht blockierend
- [x] QA-Status: **Approved** (14/14 Acceptance Criteria, keine offenen Critical/High/Medium-Bugs — BUG-4 ist Low/nice-to-have)
- [x] Datenbank-Migrationen bereits während `/backend` und `/qa` direkt gegen Produktion angewendet und verifiziert (`20260930_proj24_department_admins.sql`, `20260930_proj24_bug1_shop_examsets_rls.sql`) — kein weiterer Migrationsschritt beim Deploy nötig
- [x] Keine neuen Umgebungsvariablen — nichts an `.env.local.example` zu ergänzen
- [x] Keine Geheimnisse im Diff
- [x] Alles committet; Deploy per `git push origin main` (Vercel Auto-Deploy, wie bei PROJ-22/23)

**Bekannt und akzeptiert vor dem Deploy:**
- BUG-4 (Low): Bestätigungsdialog für Rollenwechsel zu „Bereichs-Admin" ist irreführend, wenn die Zielperson keinen Bereich hat — nice-to-have, kein Blocker.
- Bereichs-Umschalter und „Fachbereiche verwalten" sind heute praktisch unsichtbar/leer, weil nur der Bereich SPED existiert — das ist erwartet und wird erst mit PROJ-25 sichtbar relevant.

**Post-Deployment-Verifikation:** siehe Antwort im Chat nach dem Push (Vercel-Deployment-Status geprüft über die Vercel-Integration).

### Incident: „Fragen"-Liste nach dem Deploy leer (BUG-5, Critical, behoben)

**Gemeldet:** 2026-10-01, direkt nach dem Go-Live, vom Nutzer per Screenshot (Admin-Panel → Fragen → „0 Fragen insgesamt").

**Ursache:** `GET /api/admin/questions` und `GET /api/admin/questions/export` luden für den Bereichsfilter vorab **alle** Fragen-IDs des Bereichs (bei SPED: 3846) und übergaben sie als `.in('id', [...])` — das erzeugt eine URL mit ca. 140.000 Zeichen und überschreitet jedes URL-Längenlimit. Die Anfrage scheiterte dadurch für **jeden** Admin (Super-Admin wie Bereichs-Admin), nicht nur in einem Spezialfall — da beide Routen denselben fehlerhaften Code-Pfad nutzten, sobald kein engerer Fach-Filter gesetzt war (der Normalfall beim Öffnen der Fragen-Liste).

**Diagnose:** Weder `npm test` (Mocks prüfen nur, dass der Code die Postgrest-Query korrekt *aufbaut*, nicht die tatsächliche URL-Länge) noch `npm run build` hätten das je gefunden — nötig war ein Live-Test gegen die echte Produktions-DB mit einer echten, authentifizierten Session (ein eigens angelegtes, danach wieder gelöschtes Testkonto), um die tatsächliche PostgREST-Anfrage nachzustellen.

**Fix:** Der Bereichsfilter läuft jetzt direkt über einen zweiten, aliasierten Inner-Join-Embed derselben Beziehung (`qs_filter:question_subjects!inner(subjects!inner(department_id))`) auf der `questions`-Hauptabfrage selbst — keine vorab geladene ID-Liste mehr, keine lange URL. Live gegen Produktion mit echter Session verifiziert (korrekte Zeilen- und Gesamtzahl für SPED), zusätzlich ein neuer Vitest-Test, der `.in('id', …)` explizit als NICHT mehr aufgerufen prüft, um diese Regression dauerhaft abzufangen. 560/560 Tests grün, Build grün.

**Severity:** Critical (Kernfunktion „Fragen verwalten" für jeden Admin unbenutzbar), aber sehr kurze Lebensdauer (innerhalb derselben Session gefunden und behoben, kein weiterer Nutzer betroffen außer dem meldenden Admin).

**Lehre für künftige Durchläufe:** Bei Mengen-Filtern (IDs aus einer Zwischenabfrage) immer die realistische Datenmenge bedenken — `.in()` mit potenziell tausenden Werten ist bei PostgREST/Supabase-REST ein Anti-Pattern; ein aliasierter Inner-Join-Filter auf derselben Beziehung ist der richtige Weg. Gehört in die nächste Überarbeitung der Backend-Checkliste.
