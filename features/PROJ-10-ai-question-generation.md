# PROJ-10: AI Question Generation from Documents

## Status: Architected
**Created:** 2026-04-16
**Last Updated:** 2026-04-19

## Dependencies
- Requires: PROJ-1 (User Authentication) – Admin-Rolle erforderlich
- Requires: PROJ-2 (Subject & Question Structure) – Fragen-Datenmodell
- Requires: PROJ-9 (Admin Content Management) – Generierte Fragen fließen ins Admin-Panel

## User Stories
- Als Admin möchte ich mehrere PDFs oder Word-Dokumente gleichzeitig hochladen, damit die KI daraus automatisch Lernfragen generiert.
- Als Admin möchte ich den Fortschritt der KI-Verarbeitung in Echtzeit sehen, damit ich nicht blind warten muss.
- Als Admin möchte ich die generierten Fragen vor der Veröffentlichung prüfen und bearbeiten.
- Als Admin möchte ich festlegen, welchem Fach (BGP/KSK/STG/LOP) und welchem Schwierigkeitsgrad die generierten Fragen zugeordnet werden.
- Als Admin möchte ich einzelne generierte Fragen ablehnen oder alle auf einmal akzeptieren.

## Acceptance Criteria
- [ ] Upload-Bereich im Admin-Panel akzeptiert mehrere PDF- und DOCX-Dateien gleichzeitig (max. 50 MB pro Datei)
- [ ] Jede Datei wird als eigener asynchroner Job verarbeitet (parallele Verarbeitung möglich)
- [ ] Admin sieht pro Datei eine eigene Fortschrittsanzeige (Spinner + Statustext)
- [ ] Nach Abschluss: bis zu 75 Multiple-Choice-Fragen pro Dokument (je 4 Optionen, eine korrekt) als Entwürfe angezeigt
- [ ] Entwurfs-Fragen sind zunächst inaktiv (erscheinen nicht im Quiz für Azubis)
- [ ] Admin kann jede Frage einzeln prüfen: Fragetext, 4 Antwortoptionen, korrekte Antwort, Erklärung
- [ ] Admin kann Fragen bearbeiten, bevor er sie akzeptiert
- [ ] Admin kann Fragen einzeln oder alle auf einmal akzeptieren (→ werden aktiv im Quiz)
- [ ] Admin kann Fragen einzeln oder alle auf einmal ablehnen/löschen
- [ ] Fach-Zuordnung (BGP/KSK/STG/LOP) und Schwierigkeitsgrad können vor der Massenakzeptanz gesetzt werden
- [ ] Nicht akzeptierte Entwürfe werden automatisch nach 7 Tagen gelöscht
- [ ] Fehlermeldung pro Datei, wenn Dokument nicht lesbar, leer oder über 50 MB ist
- [ ] Retry-Button bei API-Timeout oder Verarbeitungsfehler

## Edge Cases
- Was passiert, wenn das Dokument keinen verwertbaren Fachinhalt hat? → Hinweis "Keine Fragen gefunden", kein Crash
- Was passiert bei einem Timeout der KI-API? → Job-Status wechselt zu "Fehler", Retry-Button erscheint
- Was passiert, wenn eine generierte Frage keine eindeutig korrekte Antwort hat? → Als "Überprüfung erforderlich" markiert, Admin muss korrekte Antwort manuell bestimmen bevor Akzeptanz möglich
- Was passiert bei Duplikaten (bereits ähnliche Frage vorhanden)? → Hinweis "Ähnliche Frage existiert bereits", Admin entscheidet
- Was passiert, wenn der Admin die Seite während der Verarbeitung verlässt? → Job läuft im Hintergrund weiter, Status bleibt beim nächsten Besuch sichtbar
- Was passiert nach 7 Tagen mit nicht entschiedenen Entwürfen? → Automatische Löschung per geplanter Datenbankfunktion (Cron/pg_cron)

## Technical Requirements
- KI-Integration: Claude API (claude-sonnet-4-6) mit strukturiertem JSON-Output
- Fragetyp: Ausschließlich Multiple-Choice (4 Optionen, eine korrekt) – konsistent mit PROJ-3 Quiz-System
- Mehrfach-Upload: Mehrere Dateien gleichzeitig, jede Datei = eigener Job, max. 50 MB pro Datei
- Fragenmenge: Bis zu 75 Fragen pro Dokument (KI-Prompt gibt Zielanzahl vor, tatsächliche Anzahl je nach Dokumentinhalt)
- Verarbeitung: Asynchroner Background-Job pro Datei (Next.js Route Handler + Supabase Realtime für Status-Updates)
- Dokument-Parsing: PDF via `pdf-parse`, DOCX via `mammoth`
- Entwurfs-Speicherung: `questions_draft`-Tabelle mit `job_id`, `expires_at` (7 Tage), `status` (pending/review_required/accepted/rejected)
- Automatisches Löschen: Supabase pg_cron-Job löscht abgelaufene Entwürfe täglich
- Prompt-Engineering: Kontext enthält Prüfungsstruktur (BGP/KSK/STG/LOP) für fachgerechte Fragen
- Datei-Upload: Supabase Storage (temporär, nach Verarbeitung löschbar)

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)

### Component Structure

The feature integrates as a new **"KI-Generator" tab** in the existing Admin Panel (`admin-tabs.tsx`):

```
Admin Panel (admin-tabs.tsx — existing)
+-- [NEW] "KI-Generator" Tab
    +-- File Upload Zone
    |   +-- Drag-&-Drop Area (PDF/DOCX, multi-file, max 50 MB each)
    |   +-- Upload Button
    +-- Active Jobs List
    |   +-- Job Card (one per uploaded file)
    |       +-- Filename + File Size
    |       +-- Status Badge (Verarbeitung / Abgeschlossen / Fehler)
    |       +-- Progress Spinner (while processing)
    |       +-- Retry Button (only on error)
    +-- Draft Questions Review Panel
        +-- Filter Bar (by job / subject / status)
        +-- Bulk Controls
        |   +-- Subject Selector (BGP/KSK/STG/LOP)
        |   +-- Difficulty Selector
        |   +-- "Alle akzeptieren" Button
        |   +-- "Alle ablehnen" Button
        +-- Draft Question Cards (list)
            +-- Question text + 4 answer options (correct marked)
            +-- Explanation text
            +-- "Überprüfung erforderlich" badge (AI-flagged)
            +-- Edit / Accept / Reject Buttons
            +-- [REUSE] question-form-modal.tsx for editing
```

### Data Model

**New table: `generation_jobs`** — one record per uploaded file
- Unique ID, Admin user ID, Original filename
- File path in Supabase Storage (temporary — deleted after processing)
- Status: `uploading → processing → completed → error`
- Number of questions generated (filled on completion)
- Error message (filled on failure)
- Created timestamp

**New table: `questions_draft`** — one record per AI-generated question candidate
- Unique ID, Job ID (links to generation_jobs), Question text
- 4 answer options (array), Index of the correct answer (0–3)
- AI-generated explanation
- Subject (BGP/KSK/STG/LOP) — set by admin before bulk-accept
- Difficulty (easy/medium/hard) — set by admin
- Status: `pending` / `review_required` / `accepted` / `rejected`
- Expiry timestamp (created_at + 7 days)

**On accept:** draft is copied into the existing `questions` table (active = true), making it live in the quiz.

### Processing Flow

```
1. Admin uploads file(s)
2. File stored in Supabase Storage → job record created (status: processing)
3. Server parses document text (pdf-parse for PDF, mammoth for DOCX)
4. Claude API (claude-sonnet-4-6) called with exam context + extracted text
   → Returns structured JSON: up to 75 MC questions
5. Questions saved to questions_draft (pending / review_required)
   Job status updated to "completed"
6. Supabase Realtime broadcasts job update → Admin UI refreshes live
7. Admin sets subject + difficulty → accepts / rejects drafts
8. Accepted drafts inserted into questions table (active = true)
9. pg_cron: daily cleanup deletes drafts where expires_at < now()
```

### New API Routes

| Route | Purpose |
|-------|---------|
| `POST /api/admin/ai-generate/upload` | Receive file, create job, start processing |
| `GET /api/admin/ai-generate/jobs` | List all jobs for current admin |
| `POST /api/admin/ai-generate/jobs/[id]/retry` | Retry a failed job |
| `GET /api/admin/ai-generate/drafts` | List drafts (filterable by job/status) |
| `PUT /api/admin/ai-generate/drafts/[id]` | Edit a draft before accepting |
| `POST /api/admin/ai-generate/drafts/[id]/accept` | Accept single draft → goes live |
| `POST /api/admin/ai-generate/drafts/[id]/reject` | Reject single draft |
| `POST /api/admin/ai-generate/drafts/bulk-accept` | Accept multiple drafts at once |
| `POST /api/admin/ai-generate/drafts/bulk-reject` | Reject multiple drafts at once |

All routes reuse the existing admin auth pattern from `src/app/api/admin/_lib/auth.ts`.

### Tech Decisions

| Decision | Reason |
|----------|--------|
| Server-side processing (Route Handler) | Files up to 50 MB need text extraction + API calls — server-side prevents browser memory issues and timeouts |
| Supabase Realtime for job status | Already in the stack; live updates with zero polling — job cards refresh automatically when processing finishes |
| Separate `questions_draft` table | Keeps unvetted AI content fully isolated from live quiz data; azubis never see unreviewed questions; auto-expiry is clean |
| claude-sonnet-4-6 with structured JSON output | Specified in requirements; fast and reliable for structured output; JSON schema enforces predictable parsing |
| Supabase Storage for uploads | Temporary staging with built-in admin auth; files deleted after job completes to minimize storage costs |
| pg_cron for draft expiry | Serverless-friendly; no background process needed; Supabase supports pg_cron natively |

### New Dependencies

| Package | Purpose |
|---------|---------|
| `pdf-parse` | Extract text content from PDF files |
| `mammoth` | Extract text content from DOCX files |
| `@anthropic-ai/sdk` | Claude API client for question generation |

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
