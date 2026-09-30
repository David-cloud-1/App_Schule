# PROJ-24: Fachbereichs-Admins & Rechtetrennung

## Status: In Review
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
- [ ] **AC-4 Alle RLS-Policies bereichsbewusst — TEILWEISE.** `questions`, `answer_options`, `question_subjects`, `graded_assessments`, `user_shop_items`, `questions_draft`, `generation_jobs`, `admin_audit_log`, `quality_fix_progress`, `profiles` per SQL-Matrix bestätigt korrekt. **`shop_items` und `exam_question_sets` sind es nicht vollständig** — siehe BUG-1.
- [ ] **AC-5 department_admin sieht/ändert ausschließlich eigenen Bereich — TEILWEISE.** Schreiben ist korrekt blockiert (siehe unten). Lesen über die Admin-Oberfläche ist korrekt gefiltert (Code-Ebene, per Vitest bestätigt). Lesen direkt über die Datenbank/REST-API ist es für `shop_items`/`exam_question_sets` nicht — siehe BUG-1.
- [x] AC-6 Super-Admin sieht/ändert alle Bereiche — verifiziert (`can_admin_department()` = true für fremden Testbereich, Fach sichtbar)
- [ ] **AC-7 Nur Super-Admin verschiebt Nutzer zwischen Bereichen — widerspricht AC-8, siehe BUG-2.** Rollenvergabe ist korrekt Super-Admin-only (verifiziert: 403 für department_admin). App-weite Qualitätsregeln/Prompt-Grundgerüst bleiben wie im Plan vorgesehen Code (kein DB-Feld) — das war nie als DB-Einstellung vorgesehen.
- [x] AC-8 department_admin verschiebt eigene Azubis, nicht eigene role/department_id — verifiziert (Selbst-Bearbeitung 400, Rollen-Feld 403 für department_admin)
- [x] AC-9 role/department_id nicht selbst schreibbar — verifiziert per SQL: `UPDATE profiles SET role='admin'` als Student → `permission denied` (Spalten-Grant)
- [ ] **AC-10 Bereichs-Umschalter im Admin-Panel — NICHT UMGESETZT.** Bewusster Scope-Cut für diesen Durchlauf (Backend-API vorhanden, UI fehlt), mit dem Nutzer abgestimmt.
- [ ] **AC-11 Seite „Fachbereich-Einstellungen" — NICHT UMGESETZT.** Gleicher Grund wie AC-10; `GET/PATCH /api/admin/department-settings` existiert und ist getestet.
- [x] AC-12 Admin-API-Routen wenden Berechtigungsprüfung an — verifiziert für alle geänderten Routen (Vitest + Codereview); die verbleibende Lücke ist die RLS-Ebene aus BUG-1, nicht die Routen selbst
- [x] AC-13 Audit-Log bereichsgefiltert — verifiziert per SQL: department_admin sieht 347 (SPED), Super-Admin sieht 348 (inkl. Test-Bereich)
- [x] AC-14 Bestandsfunktionalität unverändert — 558/558 Vitest-Tests grün, `npm run build` grün, SPED-Fächer weiterhin lesbar/zählbar wie vorher

**12 / 14 vollständig bestanden** (2 davon nur teilweise wegen BUG-1, 2 bewusst nicht umgesetzt).

### Edge Cases Status

- [x] EC-1 Fremder Bereich → 404 bei Schreibzugriff — bestätigt (UPDATE betrifft 0 Zeilen an allen getesteten Tabellen; Routen-Codereview bestätigt 404 statt Fehlerleck)
- [x] EC-2 department_admin ändert eigene role/department_id → abgelehnt — bestätigt
- [x] EC-3 Bulk-Import unbekanntes Kürzel → klare Fehlermeldung — unverändert aus PROJ-22/23, durch bestehende Tests abgedeckt, nicht erneut manuell geprüft
- [x] EC-4 Letzter Super-Admin geschützt — bestätigt
- [x] EC-5 Gleiches Kürzel in zwei Bereichen, Super-Admin importiert in gewählten Bereich — per Codereview bestätigt (`resolveSubjectCode` nutzt konsequent `departmentId` aus dem Umschalter-Cookie)
- [ ] **EC-6 department_admin verschiebt Azubi nur in Bereiche, für die er Rechte hat — WIDERSPRÜCHLICH FORMULIERT, siehe BUG-2.**
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
- **Severity:** Low (Spec-Inkonsistenz, keine technische Lücke)
- **Details:** AC-7 sagt „Nur Super-Admin kann … Nutzer zwischen Fachbereichen verschieben", AC-8 sagt „department_admin kann eigene Azubis in einen anderen Fachbereich verschieben" — wörtlich widersprüchlich. Die Umsetzung folgt AC-8 und dem Plan-Dokument (`docs/plans/mehrere-fachbereiche.md`, „Falsch zugeordnet? Die Lehrkraft … hängt Azubis … um"): `department_admin` darf eigene Azubis in **jeden** existierenden Bereich verschieben (kein Ziel-Bereichs-Check), nur Rollenvergabe bleibt Super-Admin-only.
- **Zugehöriger Edge Case EC-6** ist ebenso widersprüchlich formuliert („kann Azubis abgeben" vs. „nur Super-Admin darf beliebige Zielbereiche wählen").
- **Priority:** Nutzer-Entscheidung nötig, ob die Umsetzung (department_admin darf in jeden Bereich abgeben) so bleibt oder auf bestimmte Zielbereiche beschränkt werden soll. Kein Sicherheitsrisiko (der Azubi verliert dabei keine Daten, der department_admin erhält keine Rechte im Zielbereich), daher niedrige Priorität.

### Summary
- **Acceptance Criteria:** 10/14 vollständig bestanden, 2 teilweise (BUG-1), 2 bewusst nicht umgesetzt (UI, nächster `/frontend`-Durchlauf)
- **Bugs Found:** 2 total (1 High, 1 Low)
- **Security:** Schreibschutz solide; ein High-Fund beim Lesen (BUG-1)
- **Production Ready:** NO (UI fehlt ohnehin noch; zusätzlich sollte BUG-1 vor dem Abschluss von PROJ-24 behoben werden)
- **Recommendation:** Status bleibt **In Review**. Die bereits live angewendete Migration muss **nicht** zurückgerollt werden — die Kernzusage (Bereichs-Admins können fremde Bereiche nicht *ändern*, Rollen-Eskalation ist unmöglich) hält stand. Empfehlung: (1) kleines Folge-Migrationsskript für BUG-1, (2) Nutzer-Entscheidung zu BUG-2, (3) danach `/frontend` für Umschalter/Einstellungen-Seite, (4) abschließend erneut `/qa`.

## Deployment
_To be added by /deploy_
