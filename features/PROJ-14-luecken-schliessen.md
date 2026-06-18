# PROJ-14: Lücken schließen

## Status: Approved
**Created:** 2026-06-18
**Last Updated:** 2026-06-18 (Frontend + Backend implementiert)

## Dependencies
- PROJ-3 (Daily Learning Session / Quiz) — wiederverwendet den bestehenden Quiz-Flow
- PROJ-1 (User Authentication) — persönliche Fehlerquote ist nutzergebunden
- PROJ-4 (XP & Level System) — XP-Vergabe wie im normalen Quiz

## User Stories
- Als Azubi möchte ich Fragen üben, die ich oft falsch beantworte, damit ich gezielt meine Wissenslücken schließen kann.
- Als Azubi möchte ich den "Lücken schließen"-Modus auch dann nutzen können, wenn ich diese Fragen heute schon im normalen Quiz gesehen habe, damit ich nicht bis morgen warten muss.
- Als Azubi möchte ich im "Lücken schließen"-Modus genauso XP verdienen wie im normalen Quiz, damit ich nicht auf Belohnungen verzichten muss.
- Als Azubi möchte ich den Modus fachbezogen starten können (z.B. nur BGP-Lücken), um gezielt für ein bestimmtes Prüfungsfach zu üben.
- Als Azubi möchte ich sehen, wie viele "Lücken"-Fragen mir noch zur Verfügung stehen, damit ich weiß, wie viel Übungsmaterial vorhanden ist.

## Acceptance Criteria
- [ ] Auf der Fächer-Seite gibt es je Fach einen "Lücken schließen"-Einstiegspunkt (Button oder Link), zusätzlich zum normalen "Lernen"-Einstieg.
- [ ] Es gibt auch einen fachübergreifenden "Lücken schließen"-Einstieg (alle Fächer gemischt).
- [ ] Der Modus lädt ausschließlich Fragen, bei denen der eingeloggte Nutzer historisch eine Fehlerquote von >50% hat (mehr falsche als richtige Antworten insgesamt) UND die mindestens 3x beantwortet wurden (um Zufallstreffer zu vermeiden).
- [ ] Der tägliche "heute schon beantwortet"-Filter wird im Lücken-schließen-Modus NICHT angewendet — alle passenden Fragen sind verfügbar, unabhängig davon ob sie heute bereits im normalen Quiz vorkamen.
- [ ] Pro Session werden bis zu 10 Fragen angezeigt (wie im normalen Quiz), zufällig aus dem Lücken-Pool ausgewählt.
- [ ] XP-Vergabe ist identisch mit dem normalen Quiz (10 XP pro richtiger Antwort, +5 XP Streak-Bonus ab Streak ≥ 7).
- [ ] Der Streak und die Statistiken werden genauso aktualisiert wie im normalen Quiz.
- [ ] Hat der Nutzer noch keine Lücken (< 3 Fragen mit >50% Fehlerquote), wird eine leere State-Seite angezeigt mit einem Hinweis ("Noch keine Lücken — weiter so!").
- [ ] Die Anzahl verfügbarer Lücken-Fragen wird auf dem Einstiegs-Screen angezeigt (z.B. "23 Lücken verfügbar").

## Edge Cases
- **Keine Lücken vorhanden:** Nutzer hat noch nicht genug Fragen beantwortet oder alle Fehlerquoten ≤ 50% → leere State-Seite mit motivierender Nachricht statt Fehler.
- **Weniger als 10 Lücken:** Pool hat z.B. nur 4 Fragen → Session läuft mit 4 Fragen, kein Fehler.
- **Fach hat keine Lücken, gesamt aber schon:** Fachbezogener Modus zeigt Leer-State für das Fach; globaler Modus hat Fragen.
- **Nutzer nicht eingeloggt:** Redirect zu `/login`.
- **Fach-ID ungültig:** Redirect zu `/subjects`.
- **Gleichzeitige normaler Quiz + Lücken-Session:** Kein Konflikt, da XP additiv gezählt wird und kein eindeutiger Tages-Block existiert.

## Technical Requirements
- Neue API-Route: `GET /api/quiz/weak?subject_id=...` — gibt Fragen zurück, gefiltert nach persönlicher Fehlerquote des eingeloggten Nutzers (Aggregation auf `quiz_answers`)
- Performance: Aggregationsquery auf `quiz_answers` muss mit Index auf `(user_id, question_id)` effizient bleiben — < 500ms
- Sicherheit: Nur eigene `quiz_answers` des eingeloggten Nutzers dürfen in die Berechnung einfließen (RLS oder expliziter `user_id`-Filter)
- Der bestehende Quiz-Client (`quiz-client.tsx`) und die Session-API (`POST /api/quiz/sessions`) können unverändert wiederverwendet werden
- URL-Param zur Unterscheidung: `?mode=weak` auf der Quiz-Seite (analog zu `?subject=...` und `?topic=...`)

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)

### Komponentenstruktur

```
Fächer-Seite (/subjects)
├── Header (unverändert)
├── "Lücken schließen" Globale Karte (NEU)
│   ├── Gesamtanzahl schwacher Fragen über alle Fächer
│   └── → /quiz?mode=weak
└── SubjectsGrid (unverändert)
    └── SubjectCard → öffnet SubjectSessionSheet

SubjectSessionSheet (erweitert)
├── Jahrgangsstufe-Filter (unverändert)
├── Thema-Filter (unverändert)
├── "Lernen starten" Button (unverändert)
└── "Lücken schließen (N)" Button (NEU)
    ├── Zeigt Anzahl schwacher Fragen für dieses Fach
    └── → /quiz?subject=...&mode=weak

Quiz-Seite (/quiz)
├── Normaler Modus (unverändert)
└── Lücken-Modus (mode=weak)
    ├── Lädt schwache Fragen via GET /api/quiz/weak
    ├── Kein Tages-Filter
    └── Leerer State: "Noch keine Lücken — weiter so!"

Quiz-Client, Session-API, XP/Streak (vollständig unverändert)
```

### Neue Dateien
- `src/app/api/quiz/weak/route.ts` — aggregiert quiz_answers nach Fehlerquote pro Nutzer

### Geänderte Dateien
- `src/app/quiz/page.tsx` — liest `mode=weak` URL-Param, verzweigt zur Schwach-Fragen-Query
- `src/components/subject-session-sheet.tsx` — lädt Lücken-Zähler, zeigt zweiten Button
- `src/app/subjects/page.tsx` — zeigt globale Lücken-Karte mit Gesamtanzahl

### Datenmodell
Keine neuen Tabellen. Aggregation zur Laufzeit auf `quiz_answers (user_id, question_id, is_correct)`.
Schwellenwerte: Fehlerquote > 50% UND ≥ 3 Versuche.

### Unverändertes
`quiz-client.tsx`, `POST /api/quiz/sessions`, XP/Streak/Badge-Logik — alles bleibt identisch.

## QA Test Results

**Tested:** 2026-06-18
**Result:** APPROVED — bereit für Deployment

### Acceptance Criteria
| # | Kriterium | Status |
|---|-----------|--------|
| 1 | Fach-spezifischer "Lücken schließen"-Button im SubjectSessionSheet | ✅ Pass |
| 2 | Fachübergreifende Lücken-Karte auf der Subjects-Seite | ✅ Pass |
| 3 | Nur Fragen mit >50% Fehlerquote UND ≥3 Versuchen werden geladen | ✅ Pass (API unit tests) |
| 4 | Kein Tages-Filter im Lücken-Modus | ✅ Pass (mode=weak branch in page.tsx) |
| 5 | Max. 10 Fragen pro Session, zufällig aus dem Pool | ✅ Pass |
| 6 | XP-Vergabe identisch mit normalem Quiz | ✅ Pass (POST /api/quiz/sessions unverändert) |
| 7 | Streak + Statistiken werden gleich aktualisiert | ✅ Pass (Session-API unverändert) |
| 8 | Leerer State bei 0 Lücken | ✅ Pass (eigene Empty-State-Seite mit Target-Icon) |
| 9 | Lücken-Anzahl sichtbar auf dem Einstiegs-Screen | ✅ Pass (Zähler im Button + globaler Karte) |

### Edge Cases
| Edge Case | Status | Notizen |
|-----------|--------|---------|
| Keine Lücken vorhanden | ✅ Pass | "Noch keine Lücken!" mit motivierender Erklärung |
| Weniger als 10 Lücken | ✅ Pass | Slice auf QUIZ_SIZE, Session läuft mit weniger Fragen |
| Fach ohne Lücken, global aber schon | ✅ Pass | API gibt count=0 für das Fach; Button verschwindet |
| Unauthenticated → /quiz?mode=weak | ✅ Pass | Redirect zu /login (E2E bestätigt) |
| Ungültige subject_id | ✅ Pass | API gibt 400 zurück |
| Normaler Quiz unverändert | ✅ Pass | Regression-Tests bestätigen |

### Automatisierte Tests
- **Unit Tests (Vitest):** 8/8 bestanden — `src/app/api/quiz/weak/route.test.ts`
- **E2E Tests (Playwright):** 28/28 bestanden — `tests/PROJ-14-luecken-schliessen.spec.ts`
  - Chromium + Mobile Safari
  - Route-Protection, API-Auth, Input-Validation, Security Headers, Regression

### Security Audit
- ✅ API prüft Auth vor jeder Operation (401 vor 400)
- ✅ User sieht nur eigene `quiz_answers` (expliziter `user_id`-Filter)
- ✅ Kein Stack-Trace in Error-Responses
- ✅ subject_id UUID-Format validiert (verhindert Injection-Versuche)
- ✅ Bestehende RLS-Policies gelten weiterhin

### Pre-existing Failures (nicht durch PROJ-14 verursacht)
- `admin/questions/route.test.ts`: 2 Tests (pre-existing, vor diesem Feature schon rot)
- `admin/exam-sets/route.test.ts`: 1 Test (pre-existing)

## Deployment
_To be added by /deploy_
