# PROJ-16: Fragen-Qualitätssicherung (Torwächter + Audit-Agenten)

**Status:** In Progress
**Erstellt:** 2026-09-04
**Priorität:** P1

## Problem

Vier Bestandsdurchläufe (2026-07) haben je einen Rate-Trick in den Antwortoptionen behoben und dabei den nächsten erzeugt:

| Durchlauf | behoben | eingeschleppt |
|-----------|---------|---------------|
| 1 | Stub-Distraktoren, Ton | „längste = richtig" blieb bei 68 % |
| 2 | Längen-Bias (51 % → 20,3 %) | Satzanfang-Tell (3 % → 24,9 %), Telegrammstil |
| 3 | Satzanfang-Tell (→ 0 %) | — |
| 4 | Signalwort-Häufung (19,9 % → 13,8 %) | — |

Ursache jedes Mal dieselbe: gegen **eine** Kennzahl optimiert, ohne die anderen mitzumessen. Zusätzlich generierte der Upload-Pfad weiterhin ohne die gehärteten Regeln — der Regelblock lag nur als Copy-&-Paste-Text im Admin-UI.

## Lösung

Dreistufig, mit der Messung als Fundament.

### 1. Prüfregeln als Code — `src/lib/question-quality.ts`
`analyzeQuestion()` prüft je Frage: Struktur (5 Optionen, genau 1 richtige, Erklärung, keine Dubletten, keine Füller), Länge, Satzanfang, Telegrammstil, Signalwörter, Satzfragmente.
`analyzeBatch()` prüft die **Quoten** über viele Fragen — der Bias, den man an einer einzelnen Frage nicht sieht.

Zentrale Designentscheidung: Blocker erst bei **deutlichem** Längenvorsprung (`LENGTH_LEAD_BLOCKER = 8` Zeichen). Nulltoleranz würde das ebenso verwertbare inverse Muster erzeugen („die längste ist nie richtig"). Zielkorridor 12–28 %, Zufallsniveau 20 %.

### 2. Gemeinsame Generator-Regeln — `src/lib/question-rules.ts`
Eine Quelle für beide Pfade: den API-Upload (`process-job.ts`) und den Copy-&-Paste-Prompt im Admin-UI.

### 3. Torwächter am tatsächlich genutzten Weg: dem Bulk-Import

Fragen entstehen üblicherweise so: Prompt im Admin-UI kopieren → externe KI (kostenlos) → JSON zurück einfügen → `bulk-import`. Dort prüfte bisher nur das Zod-Schema die Feldtypen, keine einzige Qualitätsregel.

- **Im Browser**, beim Einfügen: `checkImportRows()` meldet sofort „71 von 75 sauber", listet die Beanstandungen im Klartext und bietet `buildFixPrompt()` als kopierbaren Korrekturauftrag an — die betroffenen Fragen samt Verstößen und Regeln, fertig für dieselbe KI. Nach einem Teilimport bleiben die beanstandeten Zeilen im Eingabefeld stehen, damit nichts doppelt importiert wird.
- **Auf dem Server**, in `bulk-import`: beanstandete Zeilen werden übersprungen und zurückgemeldet. `allow_flagged: true` erlaubt dem Admin, bewusst zu überstimmen.
- Die Prüfung läuft rein deterministisch, ohne KI — sie kostet nichts.

### 3b. Torwächter im API-Upload-Pfad
`process-job.ts` prüft jeden Entwurf beim Anlegen, legt den Bericht in `questions_draft.quality_report` ab und setzt bei Blockern `status = 'review_required'`. Beide Freigabewege (`accept`, `bulk-accept`) lehnen diesen Status bereits ab. Dieser Pfad verbraucht API-Guthaben und ist im UI entsprechend als kostenpflichtig gekennzeichnet.

### 3c. Kalibrierung an echten Daten
Die Signalwort-Regel blockiert erst ab **drei** von fünf Optionen (`ABSOLUTE_BLOCKER_COUNT`). Gemessen am Bestand: Schwelle 2 hätte 13,5 % aller Fragen beanstandet und den Import zäh gemacht, Schwelle 3 nur 6,4 % — und drei Signalwörter sind das eigentliche Fabrik-Muster. Zwei bleiben eine Warnung. Der Generator-Prompt fordert weiterhin höchstens eines: strenger Anspruch, tolerante Durchsetzung.

### 4. Bestands-Werkzeuge
- `npm run quality:audit [-- --save]` — Kennzahlen, Trend gegen den letzten Snapshot
- `npm run quality:list -- <code> --limit N --run <durchlauf>` — Loader für Korrekturbatches
- `npm run quality:sample -- N` — Zufallsstichprobe zum Lesen
- `npm run quality:apply -- <batch.json> [--dry-run]` — schreibt **nur** nach bestandener Verifikation, rollt sonst zurück

### 5. Agenten
- `.claude/agents/question-auditor.md` — misst, liest Stichproben, empfiehlt; ändert nie etwas
- `.claude/agents/question-fixer.md` — Batches à 20, ausschließlich über `apply.ts`
- `.claude/skills/quality/SKILL.md` — Slash-Command `/quality`

## Akzeptanzkriterien

- [x] `analyzeQuestion` erkennt alle vier historischen Tells, mit Unit-Tests aus echten Beispielen
- [x] Zahlen-Optionen sind von der Längenregel ausgenommen
- [x] Batch-Quoten melden auch Unterschreitung des Korridors (inverses Muster)
- [x] Beide Generator-Pfade nutzen dieselben Regeln
- [x] Eingefügte Fragen werden im Browser geprüft, bevor etwas gesendet wird
- [x] Korrekturauftrag für beanstandete Fragen ist mit einem Klick kopierbar
- [x] bulk-import überspringt beanstandete Zeilen und meldet sie zurück
- [x] Schwellen an echten Daten kalibriert (Blocker-Quote ~6 %)
- [x] Entwürfe mit Blockern lassen sich nicht per accept/bulk-accept freigeben
- [x] `apply.ts` verweigert Batches, die einen Blocker oder eine Kennzahl-Regression erzeugen
- [x] Rollback bei fehlgeschlagener Nachprüfung, kein Fortschrittseintrag
- [ ] Deployed

## Datenbank

Migration `supabase/migrations/20260904_question_quality_guard.sql` (angewendet 2026-09-04):
- `questions_draft.quality_report jsonb`
- `quality_fix_progress (question_id, run_key, done_at, note)` mit RLS für Admins — ersetzt die Einzeltabellen `rewrite_progress`, `length_fix_progress`, `pattern_fix_progress`, `absolut_fix_progress` durch einen `run_key`

## Ausgangsmessung (2026-09-04, 3219 aktive Fragen)

| Kennzahl | Wert | Ziel | Urteil |
|----------|------|------|--------|
| Richtige ist die längste | 15,4 % | 12–28 % | ok |
| Satzanfang-Tell | 1,0 % | ≤ 3 % | ok |
| Telegrammstil | 0,5 % | ≤ 5 % | ok |
| Strukturfehler | 0,7 % (22) | 0 | zu hoch |
| Optionen mit Signalwort | 8,6 % | ≤ 12 % | ok |

Offen: 22 Fragen mit ≠ 5 Optionen, 2 Füller-Optionen, 31 Satzanfang-Tells, 5 Fragen mit Signalwort in jedem Distraktor.
