# PROJ-16: Fragen-Qualitätssicherung (Torwächter + Audit-Agenten)

**Status:** Deployed
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
- [x] Deployed

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

## Deployment

- **Produktion:** https://spedilern.vercel.app
- **Deployment:** https://spedilern-3zitcxvpy-david-cloud-1s-projects.vercel.app
- **Datum:** 2026-09-04
- **Commits:** fe37b9c (Engine, Agenten, Scripts), 3804855 (Bulk-Import-Prüfung, Kalibrierung)
- **Migration:** bereits vor dem Deploy in Supabase angewendet

Verifiziert nach dem Deploy: Startseite leitet korrekt auf /login (HTTP 307), Login-Seite lädt (HTTP 200), `POST /api/admin/questions/bulk-import` antwortet ohne Anmeldung mit 401 — der Endpunkt ist erreichbar und geschützt.

Noch vom Nutzer im angemeldeten Admin-Panel zu prüfen: Einfügen eines JSON mit absichtlich fehlerhaften Fragen zeigt die Beanstandungen an, der Korrekturauftrag landet in der Zwischenablage, und der Import überspringt die beanstandeten Zeilen.

## Erweiterung: Fehlender Kontext (2026-09-28)

**Anlass:** Schüler meldeten Fragen, die sich auf Angaben beziehen, die in der App nicht zu sehen sind („Was ist laut Text das oberste Ziel der EZB?“, „Wie hoch lag das BIP laut Grafik 2019?“, „Auftrag 3 (Dingolfing – Bozen) …“). Die Fragen stammen aus Skripten, Übungsaufgaben und Lernsituationen, deren Text oder Daten auf einer anderen Seite stehen.

**Torwächter:** Neue Prüfung in `src/lib/question-quality.ts`, greift automatisch im Bulk-Import, im Draft-Flow und im Audit:
- `missing_context` (Blocker): „laut/im/in der“ + Text, Skript, Grafik, Tabelle, Dokument, Statistik, Schaubild, Übungsaufgabe, Heft, Fußnote u. a.; „im Beispiel“ / „…-Beispiel“; „siehe“, „obige“, „oben genannt“, „vorherige Aufgabe“; „genannte Statistik/Tabelle/Werte“. „Artikel“ bewusst nicht, wegen „Lagerartikel“ und „Artikel 3 GG“.
- `case_reference` (Warnung): nummerierte Fälle wie „Auftrag 3“ oder „Frachtbrief B-2“. Das ist nur eine Warnung, weil solche Fragen lösbar sind, wenn alle Zahlen in der Frage stehen. Mengenangaben („Auftrag 345 km“) schlagen nicht an.
- Neue Audit-Kennzahl „Fehlender Kontext“, Ziel 0.

**Generator-Prompt:** `src/lib/question-rules.ts` enthält jetzt die Regel „Jede Frage muss für sich allein lösbar sein“, mit Beispielen: kein „laut Text“, keine Details, die nur in der Vorlage stehen, alle Falldaten in die Frage.

**`scripts/quality/apply.ts`:** Unterstützt jetzt `"deactivate": true` (setzt `is_active = false`, wird nicht gelöscht). Außerdem behoben: Der Rollback stellt jetzt auch geänderte Fragetexte und Erklärungen wieder her und reaktiviert deaktivierte Fragen. Vorher setzte er nur Optionen zurück.

**Bestandsbereinigung (Durchlauf `kontext-1`, 216 Fragen):**

| Maßnahme | Anzahl |
|----------|--------|
| Verweis gestrichen und neutral umformuliert (Fachwissen reicht) | ~135 |
| Fehlende Angaben in die Frage geschrieben (Kalkulationsdaten, Sendungsdaten, Falldaten) | ~15 |
| Deaktiviert (nur mit Vorlage lösbar: Zahlen aus Grafiken und Texten, Atlantis-Geschichte, Beispiel-Tarifvertrag, Stichtags-Zinssätze, Organigramm) | 29 |
| Nur die Erklärung bereinigt („Laut Skript …“, „In der Übungsaufgabe ist c) richtig“) | ~20 |
| Präfix „Übungsaufgabe:“ entfernt | 13 |

Fehlender Kontext: 150 → 0 Fragen. Alle übrigen Kennzahlen blieben stabil, jeder Batch wurde über `apply.ts` verifiziert. Aktive Fragen: 3841 → 3812.

**Sachfehler, die nebenbei gefunden und korrigiert wurden:**
- Lkw-Maut: Zwei Fragen verlangten noch „ab 7,5 t“, seit 1. 7. 2024 gilt aber „mehr als 3,5 t“ (eine dritte Frage hatte das schon richtig, der Bestand widersprach sich).
- Steuerklassenwechsel: Zwei Fragen verlangten „einmal im Jahr“, seit 2020 ist ein Wechsel mehrmals jährlich möglich.
- Inflation: „Der Nominalwert des Geldes sinkt“ war als richtig markiert. Gemeint ist der Realwert (die Kaufkraft), die Frage wurde neu gefasst.
- „Wodurch kann eine Inflation entstehen?“: Keine der fünf Optionen war inflationär. Die Frage wurde deaktiviert.
- Geldpolitik: Der Distraktor „unverzinsliche Mindestreserven“ ist seit 2023 zutreffend und wurde ersetzt. Der Distraktor „Senkung der Kreditzinsen“ war ebenfalls inflationär und wurde ersetzt.
- EZB-Inflationsziel: Die Erklärung „nahe, aber unter 2 %“ wurde auf das symmetrische 2-%-Ziel (seit 2021) aktualisiert.

**Offen (nicht Teil dieses Durchlaufs):** „Gruber liefert verspätet; Lieferfristschaden 500 € (Fracht 450 €)“ markiert „Gruber trägt 450 €, PIL 50 €“ als richtig. Nach HGB (§ 431 Abs. 3) haftet der Frachtführer bei Lieferfristüberschreitung bis zur dreifachen Fracht, also voll. Das sollte fachlich geprüft werden.
