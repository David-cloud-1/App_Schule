# PROJ-11: Exam Simulation Mode

## Status: Architected
**Created:** 2026-04-16
**Last Updated:** 2026-04-19

## Dependencies
- Requires: PROJ-1 (User Authentication) – nur für eingeloggte Nutzer
- Requires: PROJ-2 (Subject & Question Structure) – Fragen-Pool, Fach-Zuordnung und neuer Fragetyp "open"
- Requires: PROJ-3 (Daily Learning Session) – teilt Quiz-Grundstruktur (MC-Rendering)
- Requires: PROJ-9 (Admin Content Management) – für Admin-Prüfungssets
- Requires: PROJ-10 (AI Question Generation) – KI-Infrastruktur wird für KI-Bewertung offener Antworten wiederverwendet

> **Hinweis für PROJ-2:** Der Fragetyp `open` (Freitextantwort) muss in der Fragen-Datenstruktur ergänzt werden, bevor PROJ-11 implementiert werden kann. Bestehende MC-Fragen sind nicht betroffen.

## User Stories
- Als Azubi möchte ich einen der 3 IHK-Prüfungsteile einzeln simulieren können, damit ich gezielt den schwächsten Bereich trainieren kann.
- Als Azubi möchte ich alle 3 Prüfungsteile am Stück absolvieren, damit ich die volle Prüfungssituation (5h 30min) übe.
- Als Azubi möchte ich einen sichtbaren Countdown-Timer sehen, damit ich mein Tempo an der echten Prüfungssituation orientieren kann.
- Als Azubi möchte ich bei offenen Fragen (Teil 1) nach dem Einreichen KI-Feedback und eine Punktzahl erhalten, damit ich verstehe, was an meiner Antwort gut oder verbesserungswürdig war.
- Als Azubi möchte ich nach der Simulation eine vollständige Auswertung sehen (richtig/falsch je MC-Frage, KI-Score je offener Frage), damit ich meine Fehler verstehe.
- Als Azubi möchte ich meine vergangenen Probeprüfungen auf einer eigenen Seite einsehen können, damit ich meinen Fortschritt über Zeit verfolge.
- Als Admin möchte ich einen speziellen Fragenpool als Prüfungsset hochladen können, damit ich prüfungsnahe Simulationen steuern kann.

## Acceptance Criteria

### Exam-Modus starten
- [ ] Exam-Modus ist über das Navigationsmenü erreichbar (eigener Tab/Link)
- [ ] Nutzer wählt einen oder alle 3 Prüfungsteile vor dem Start:
  - Teil 1: Leistungserstellung (STG/LOP) – ~20 Fragen (~70% offen, ~30% MC), **180 Min.**
  - Teil 2: KSK – 15 Fragen (MC), **90 Min.**
  - Teil 3: WiSo (BGP) – 15 Fragen (MC), **60 Min.**
- [ ] Fragen werden zufällig aus dem Pool des jeweiligen Fachs ausgewählt — oder aus einem vom Admin definierten Prüfungsset, falls vorhanden
- [ ] Startbildschirm zeigt: Regelhinweis (kein sofortiges Feedback, zeitgebunden), Hinweis auf KI-Bewertung offener Fragen nach Abgabe
- [ ] Nutzer sieht beim Start, ob ein Admin-Prüfungsset oder der allgemeine Fach-Pool verwendet wird

### Während der Simulation
- [ ] Countdown-Timer ist sichtbar und läuft in Echtzeit (Stunden:Minuten:Sekunden)
- [ ] Kein sofortiges Feedback nach jeder Antwort (wie echte Prüfung)
- [ ] MC-Fragen: Antwort per Auswahl; offene Fragen: Freitextfeld (Textarea)
- [ ] Nutzer kann zur nächsten Frage navigieren und auch zurückgehen; bisherige Eingaben bleiben erhalten
- [ ] Fortschrittsanzeige: "Frage X von Y" + Anzahl noch unbeantworteter Fragen
- [ ] "Prüfung beenden"-Button jederzeit verfügbar (mit Bestätigungs-Dialog)
- [ ] Bei Ablauf des Timers: automatisches Einreichen aller bisherigen Antworten

### KI-Bewertung offener Fragen (Teil 1)
- [ ] Nach dem Einreichen werden alle offenen Antworten asynchron an die KI (Claude) gesendet
- [ ] KI bewertet je Frage: Punktzahl (0–100%) + schriftliches Feedback (was war gut, was fehlte)
- [ ] Während KI-Bewertung läuft: Ladeindikator auf der Auswertungsseite ("KI bewertet deine Antworten…")
- [ ] KI-Bewertung schlägt fehl gracefully: bei Fehler erscheint Hinweis "Automatische Bewertung nicht verfügbar" — Frage wird als "manuell prüfen" markiert
- [ ] KI-Score fließt in die Gesamtpunktzahl von Teil 1 ein (anteilig nach Fragengewichtung)

### Auswertung
- [ ] Nach dem Einreichen erscheint sofort eine Auswertungsseite
- [ ] MC-Fragen: sofort ausgewertet (richtig/falsch + korrekte Antwort + Erklärung)
- [ ] Offene Fragen: KI-Score + Feedback erscheint sobald KI fertig ist (nachladen ohne Reload)
- [ ] Auswertung zeigt: Gesamtergebnis in % je Teil, Bestanden/Nicht-bestanden-Badge (≥ 50% je Teil = bestanden, IHK-Standard)
- [ ] Bei abgebrochenem Exam: Status "Abgebrochen" gespeichert, Auswertung zeigt nur beantwortete Fragen; offene Fragen trotzdem KI-bewertet

### Exam-Verlauf (/exam-history)
- [ ] Eigene Seite `/exam-history` mit Liste aller absolvierten Probeprüfungen
- [ ] Je Eintrag: Datum, gewählte Teile, Gesamtergebnis, Status (Bestanden/Nicht bestanden/Abgebrochen)
- [ ] Klick auf Eintrag öffnet die vollständige Auswertung der vergangenen Prüfung (inkl. KI-Feedback)

### Admin: Prüfungssets
- [ ] Admin kann über das Admin-Panel (PROJ-9) Fragen als "Prüfungsset" für einen bestimmten Teil markieren
- [ ] Ein Prüfungsset ist einem Prüfungsteil zugeordnet (Teil 1 / Teil 2 / Teil 3)
- [ ] Wenn ein aktives Prüfungsset für einen Teil existiert, wird es standardmäßig für die Simulation verwendet
- [ ] Admin kann beliebig viele Prüfungssets anlegen; nur das zuletzt aktivierte wird verwendet
- [ ] Admin kann beim Erstellen einer Frage den Typ wählen: Multiple Choice oder Offen (Freitext) — inkl. Musterlösung für KI-Kontext

### XP & Streak
- [ ] Exam-Sessions haben keinen Einfluss auf XP oder Streak
- [ ] Exam-Ergebnisse werden in separater Tabelle `exam_sessions` gespeichert (nicht in `learning_sessions`)

## Edge Cases
- **Zu wenig Fragen im Pool:** Wenn weniger Fragen vorhanden als für den Teil benötigt → Hinweismeldung, Start trotzdem möglich mit reduzierter Fragenanzahl
- **Timer läuft ab:** Alle bisherigen Antworten werden automatisch eingereicht; unbeantwortete MC-Fragen zählen als falsch; leere offene Antworten werden als 0% gewertet
- **Nutzer bricht ab:** Bestätigungs-Dialog verhindert versehentliches Verlassen; Session wird mit Status "Abgebrochen" gespeichert
- **Seite wird während Exam neu geladen/geschlossen:** Startzeit ist server-seitig gespeichert; bei Rückkehr wird restliche Zeit korrekt berechnet; bereits gegebene Antworten gehen verloren (Hinweis im Startdialog)
- **Alle 3 Teile am Stück:** Nach jedem Teil kurze Pause mit Zwischenergebnis, dann weiter mit nächstem Teil; Timer je Teil unabhängig
- **Keine Fragen für ein Fach:** Prüfungsteil ist deaktiviert mit Hinweis "Noch keine Fragen verfügbar"
- **KI-Bewertung schlägt fehl:** Offene Frage wird als "nicht automatisch bewertbar" markiert; Gesamtergebnis von Teil 1 wird nur auf Basis der MC-Fragen berechnet; Hinweis in Auswertung

## Technical Requirements
- Timer-Startzeit server-seitig gespeichert (verhindert clientseitige Manipulation)
- DB-Tabelle `exam_sessions`: id, user_id, parts_selected, started_at, ended_at, status (completed/aborted), results_json
- DB-Tabelle `exam_question_sets`: id, part (1/2/3), question_ids (array), created_by, is_active
- PROJ-2 Erweiterung: Fragen-Tabelle benötigt neues Feld `type` (enum: 'multiple_choice' | 'open') + `sample_answer` (Text, für KI-Kontext)
- Fragen-Selektion: zufällige Auswahl (`ORDER BY RANDOM() LIMIT n`) aus gefilterten Fragen je Fach; bei Teil 1 im Verhältnis ~70% open / ~30% MC
- KI-Bewertung offener Antworten: Server Action ruft Claude API auf mit Frage + Musterlösung + Nutzerantwort; gibt JSON zurück `{ score: 0-100, feedback: string }`
- KI-Feedback wird in `results_json` der Exam-Session gespeichert; kein erneuter API-Aufruf für Verlaufsansicht

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)

### Overview
Separate exam flow alongside the daily quiz. Reuses existing question infrastructure, adds a server-anchored countdown timer, open-ended question type with self-assessment scoring, and a persistent exam history. No new packages and no Claude API calls needed — all required shadcn/ui components are already installed.

### Component Structure

```
/exam (Exam Landing Page)
+-- ExamPartSelector          ← Choose Teil 1, 2, 3, or all
+-- ExamStartCard             ← Rules summary, active exam set indicator, start button

/exam/[sessionId] (Exam Session Page)
+-- ExamHeader
|   +-- ExamCountdownTimer    ← HH:MM:SS, synced to server start time
|   +-- ExamProgressIndicator ← "Frage X von Y | Z unbeantwortet"
+-- ExamQuestionCard          ← Switches between two sub-types:
|   +-- MCQuestionView        ← RadioGroup (reuses quiz pattern)
|   +-- OpenQuestionView      ← Textarea (shadcn/ui already installed)
+-- ExamNavigationBar         ← Prev / Next buttons + question dots
+-- ExamEndButton             ← "Prüfung beenden" → ConfirmDialog (shadcn AlertDialog)

/exam/[sessionId]/results (Results Page)
+-- ExamResultsSummary        ← % per part + Pass/Fail badge per IHK threshold (≥50%)
+-- ExamPartResultSection     ← Collapsible per part
|   +-- MCResultCard          ← Richtig/Falsch + correct answer + explanation
|   +-- OpenResultCard        ← Shows student answer + Musterlösung side by side
|       +-- SelfScoreSlider   ← Slider 0–100% (student rates themselves); saves on change

/exam-history (Exam History Page)
+-- ExamHistoryList
    +-- ExamHistoryEntry      ← Date, selected parts, score %, status badge
    +-- [click → /exam/[id]/results]

Admin Panel (extension of existing PROJ-9 AdminTabs)
+-- ExamSetsTab               ← New tab inside existing AdminTabs component
    +-- ExamSetCard           ← Name, part, active/inactive toggle
    +-- ExamSetCreateModal    ← Pick part, select questions from pool, activate
```

### Data Model

**Extension to existing `questions` table:**
- New field `type`: either `multiple_choice` (default, existing behavior) or `open` (free text)
- New field `sample_answer`: reference answer shown to student after submission for self-assessment

**New table: `exam_sessions`**
Each row represents one exam attempt:
- `parts_selected` — array of selected parts (e.g. [1, 2, 3])
- `started_at` — server-recorded start time (prevents clock manipulation)
- `ended_at` + `status`: `in_progress`, `completed`, or `aborted`
- `results_json` — stores all questions shown, student answers, MC verdicts, and self-assessed scores for open questions

**New table: `exam_question_sets`**
Admin-curated question sets per exam part:
- `part` (1, 2, or 3), `question_ids` array, `is_active`, `created_by`
- Only one active set per part at a time; if none active, random pool selection is used

### Tech Decisions

| Decision | What & Why |
|---|---|
| **Server-anchored timer** | `started_at` written to DB on session creation. Client computes remaining time from server value; re-syncs on tab focus/reload. Prevents browser clock manipulation. |
| **No AI API calls** | Open questions use self-assessment: after submission the student sees their answer alongside the `sample_answer` and sets their own score (0–100%) via a slider. No async polling, no external costs. |
| **Answers buffered client-side** | All answers held in React state during the session; submitted in one `PATCH` call on finish or timer expiry. Page closure loses answers — disclosed in start screen. |
| **No XP/Streak impact** | Exam sessions write only to `exam_sessions`. XP, streak, and `learning_sessions` tables are untouched. |
| **Reuse existing MC rendering** | Existing quiz RadioGroup pattern extracted into a shared `MCQuestionView` used by both quiz and exam mode. |
| **Part-aware question selection** | Teil 1 → STG + LOP, ~70% open / ~30% MC. Teil 2 → KSK, MC only. Teil 3 → BGP, MC only. Active admin exam set overrides random selection per part. |

### New API Routes

| Route | Purpose |
|---|---|
| `POST /api/exam/sessions` | Start session — records start time, selects questions, returns session ID |
| `GET /api/exam/sessions/[id]` | Fetch session state + remaining seconds (server-calculated) |
| `PATCH /api/exam/sessions/[id]` | Submit answers or abort |
| `PATCH /api/exam/sessions/[id]/self-score` | Save self-assessed score for one open question |
| `GET /api/exam/history` | List current user's past sessions |
| `GET /api/admin/exam-sets` | List all exam sets (admin only) |
| `POST /api/admin/exam-sets` | Create a new exam set (admin only) |
| `PATCH /api/admin/exam-sets/[id]` | Activate / deactivate an exam set (admin only) |

### Dependencies
No new packages needed. Existing shadcn/ui components cover all UI needs:
- `Textarea` — open question input
- `RadioGroup` — MC question input
- `AlertDialog` — exam abort confirmation
- `Progress` — question progress bar
- `Badge` — pass/fail status, exam set indicator
- `Slider` — self-assessment score for open questions

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
