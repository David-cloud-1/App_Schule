# Plan: Mehrere Fachbereiche (Spedition + Tourismus) in einer App

> Stand: 2026-09-29 · Status: **Entwurf zur Entscheidung** (E1–E9 entschieden) — noch keine Spec, kein Code.
> Gewählter Weg: **B — eine App, eine Datenbank, Fachbereich als neue Dimension.**

---

## 1. Ziel

Die Abteilung Tourismuskaufleute soll die App mit eigenen Fächern, eigenen Fragen und eigener Lehrkraft als Admin nutzen — ohne dass sich die beiden Fachbereiche gegenseitig sehen oder stören, und ohne zusätzliche Kosten.

**Leitplanken**

1. **Spedition merkt nichts.** Für die 47 bestehenden Azubis sieht die App nach jeder Phase exakt gleich aus.
2. **Harte Trennung, wo es um Personen geht** (Nutzer, Noten, Ranglisten, Audit-Log) — durchgesetzt in der Datenbank, nicht nur in der Oberfläche.
3. **Weiche Trennung, wo es nur um Inhalte geht** (welche Fächer/Fragen jemand angezeigt bekommt) — Filter im Code reicht.
4. **Kostenlos** — kein zweites Supabase-Projekt, kein API-Verbrauch; der Prompt bleibt „kopieren → externe KI → JSON einfügen".
5. **Ein Code, eine Wahrheit** — keine Speditions-Werte mehr fest im Code; alles, was sich je Fachbereich unterscheidet, steht in der Datenbank.

---

## 2. Bestandsaufnahme (was heute fest auf Spedition steht)

### 2.1 Datenbank

| Befund | Folge |
|---|---|
| `profiles.role` kennt nur `student` / `admin`; `is_admin()` prüft nur `role = 'admin'` | Jede Admin-Person sieht und ändert **alles** — auch Noten (PROJ-21) und Nutzer des anderen Bereichs |
| 19 RLS-Policies prüfen „ist Admin" ohne Bereich (questions, answer_options, question_subjects, topics, exam_question_sets, graded_assessments, shop_items, user_shop_items, questions_draft, generation_jobs, admin_audit_log, quality_fix_progress, profiles) | Alle müssen bereichsbewusst werden |
| `subjects.code` ist global eindeutig (`UNIQUE(code)`), und ~15 Stellen suchen Fächer nur über das Kürzel | Da Kürzel je Bereich doppelt vorkommen dürfen (E4), muss jede dieser Stellen den Bereich mitprüfen (siehe 4.5) |
| Jede Frage hängt an genau **einem** Fach (`question_subjects`, 0 Waisen, 0 Mehrfach-Zuordnungen) | Der Fachbereich einer Frage lässt sich sauber über ihr Fach ableiten — **keine** neue Spalte an `questions` nötig |
| `exam_parts` existiert als Tabelle, wird aber **nirgends benutzt**; Prüfungsteile sind `part = 1/2/3` als Zahl | Prüfungsstruktur muss aus dem Code in diese Tabelle wandern |
| `badges` enthält `bgp_expert`, `ksk_expert`, `stg_expert`, `lop_expert` | Fach-Badges müssen datengetrieben werden |
| `generate_unique_pseudonym()` (DB) hat eine Speditions-Wortliste und läuft **beim Anlegen** des Profils | Zu dem Zeitpunkt ist der Fachbereich noch unbekannt |
| Spalten-Grant auf `profiles`: Nutzer dürfen nur `display_name, show_real_name, leaderboard_opt_out, starter_coins_seen` ändern | Gut: eine neue Spalte `department_id` ist automatisch **nicht** selbst änderbar |

### 2.2 Code (Stellen mit fest verdrahteten Speditions-Werten)

| Bereich | Dateien |
|---|---|
| Prompt & Qualitätsregeln | `src/app/admin/ai-generator/page.tsx` (Rolle, Fächerliste), `src/lib/question-rules.ts:41` (Zielgruppe), `src/app/api/admin/ai-generate/_lib/process-job.ts` (bezahlter Upload-Pfad) |
| Prüfungsteile | `src/app/api/exam/sessions/route.ts:25` (Fächer, Fragenzahl, Dauer), `src/app/admin/exam-sets/exam-sets-client.tsx:70`, `src/app/exam/exam-landing-client.tsx`, `src/components/exam-part-tag.tsx`, `src/components/admin/create-assessment-modal.tsx` |
| Fächer-Darstellung | `src/components/subject-tag.tsx` (Typ `'BGP' \| 'KSK' …`), `src/components/subjects-grid.tsx`, `src/app/page.tsx:36` (Icons) |
| Badges | `src/lib/badges.ts` (`SUBJECT_CODES`, 4 Experten-Badges, Allrounder) |
| Branding & Thema | „SpediLern" + Truck-Icon in ~12 Seiten (Login, Register, Layout, Loading …), „Frachtmünzen" (5 Stellen), „Speditionshof" (5 Stellen), `src/lib/pseudonyms.ts` |
| Lernwege ohne Fachfilter | `src/app/api/quiz/blitz/start/route.ts` (Blitzrunde mischt **alle** Fragen) |
| Service-Role-Routen (umgehen RLS → Trennung muss im Code passieren) | `leaderboard`, `admin/users`, `admin/users/[id]`, `admin/audit-log`, `admin/assessments/[id]` (+ `export`, `results`, `participants`), `assessments/lookup`, `assessments/[id]/join`, `exam/sessions/[id]`, `quiz/sessions`, `quiz/blitz/finish`, `shop/items`, `badges/migrate`, `profile/pseudonym` |
| Werkzeuge | `scripts/quality/*`, `scripts/engagement/*`, Agenten `question-auditor`, `question-fixer`, `fun-auditor` |

Insgesamt greifen **~50 Dateien** auf die betroffenen Tabellen zu. Davon muss nicht jede geändert werden, aber jede geprüft.

---

## 3. Zielbild

### 3.1 Begriffe

- **Fachbereich** (`department`): Spedition, Tourismus, später evtl. weitere. Jede Person, jedes Fach, jeder Prüfungsteil, jedes Prüfungsset, jeder Leistungsnachweis und jeder Shop-Artikel gehört zu genau einem Fachbereich.
- **Rollen**

| Rolle | Wer | Darf |
|---|---|---|
| `student` | Azubis | Lernen im **eigenen** Fachbereich |
| `department_admin` (neu) | Lehrkraft Tourismus (und ggf. Spedition) | Admin-Panel, aber **nur eigener Fachbereich**: Fragen, Fächer, Themen, Prüfungssets, Leistungsnachweise + Noten, Shop, Nutzerliste, Audit-Log |
| `admin` (bestehend) | du | Super-Admin: alle Fachbereiche, Fachbereiche anlegen, Admins ernennen, Umschalter „Fachbereich" im Admin-Panel |

**Hoheit (E9):** Die volle Hoheit über die App liegt beim Super-Admin. Nur der Super-Admin vergibt und entzieht Rollen, legt Bereiche an, ändert App-Einstellungen, Qualitätsregeln und das Prompt-Grundgerüst und kann jede Änderung einer Bereichs-Lehrkraft überschreiben oder rückgängig machen. Jede Aktion der Lehrkraft landet im Audit-Log, das der Super-Admin bereichsübergreifend sieht. Innerhalb von Tourismus darf die Lehrkraft: Fragen pflegen, Fächer und Themen, Prüfungssets und Leistungsnachweise inkl. Noten, Azubis sehen und in einen anderen Bereich abgeben, Shop-Artikel sowie Münz- und Hof-Namen.

### 3.2 Was geteilt, was getrennt ist

| Geteilt (ein Code für alle) | Getrennt je Fachbereich |
|---|---|
| Quiz-Logik, Lücken schließen, XP/Level, Streak, Blitzrunden-Mechanik, Prüfungssimulation, Leistungsnachweise, Torwächter/Qualitätsregeln, Import-Format, Design | Fächer + Themen, Fragen, Prüfungsteile + -sets, Leistungsnachweise + Noten, Rangliste, Shop-Artikel, Fach-Badges, Name der Münzen/des Hofs, Pseudonym-Wortliste, App-Name/Icon, Prompt-Rolle + Zielgruppe |

---

## 4. Datenmodell

### 4.1 Neue Tabelle `departments`

| Spalte | Beispiel Spedition | Zweck |
|---|---|---|
| `id` uuid | | |
| `code` text unique | `SPED` | |
| `name` | Speditionskaufleute | Anzeige |
| `app_name` | SpediLern | Titel, Login-Header |
| `tagline` | Täglich lernen. Besser werden. IHK-Prüfung bestehen. | |
| `icon_name` | `Truck` | Lucide-Icon |
| `currency_name` | Frachtmünzen | Shop/Blitzrunde |
| `hof_name` | Speditionshof | Sammlung |
| `prompt_role` | Experte für Prüfungsfragen im Bereich Spedition und Logistik (IHK Bayern) | Prompt |
| `target_group` | angehende Speditionskaufleute | Prompt + Qualitätsregeln |
| `prompt_notes` text null | | Freitext der Lehrkraft, wird an den Prompt angehängt |
| `class_levels` int[] | `{10,11,12}` | Klassenstufen-Filter |
| `pseudonym_nouns` text[] | Frachter, Sattelzug … | Pseudonyme |
| `domain` text unique null | `spedilern.vercel.app` | Adresse des Bereichs, bestimmt Auftritt und Zuordnung (siehe 5.) |
| `slug` text unique | `spedition` | Kurzname für die Auswahlseite (Rückfallebene) |
| `sort_order` int | 1 | Reihenfolge auf der Auswahlseite |
| `is_active` bool | | |

### 4.2 Neue Spalten

| Tabelle | Neu | Hinweis |
|---|---|---|
| `profiles` | `department_id` uuid null → FK | Nicht selbst änderbar (Spalten-Grant bleibt wie er ist) |
| `profiles.role` | CHECK erweitert um `department_admin` | |
| `subjects` | `department_id` NOT NULL; Eindeutigkeit `(department_id, code)` statt `code` | Fragen/Themen erben den Bereich darüber (siehe 4.5) |
| `exam_parts` | `department_id`, `part_number`, `subtitle`, `question_count`, `duration_minutes`; neue Verknüpfung `exam_part_subjects` | Ersetzt die festen Konstanten im Code |
| `exam_question_sets` | `department_id` NOT NULL | `part` bleibt Zahl, bedeutet „Teil-Nr. innerhalb des Bereichs" |
| `graded_assessments` | `department_id` NOT NULL | Bewusst doppelt gespeichert (statt über Prüfungsset), damit die Noten-Policy einfach und schnell bleibt |
| `shop_items` | `department_id` NOT NULL | |
| `badges` | `subject_id` null, `threshold` int null | Fach-Badges werden Datensätze; bestehende IDs (`bgp_expert` …) bleiben erhalten → keine verlorenen Abzeichen |
| `admin_audit_log` | `department_id` null | Filter für Bereichs-Admins |
| `generation_jobs`, `questions_draft` | `department_id` | Nur für den bezahlten Upload-Pfad |

### 4.3 Hilfsfunktionen (SECURITY DEFINER, wie `is_admin()` heute)

- `my_department_id()` → Bereich der eingeloggten Person
- `is_super_admin()` → `role = 'admin'`
- `can_admin_department(dept uuid)` → Super-Admin **oder** (`department_admin` **und** `dept = my_department_id()`)
- `subject_department(subject uuid)`, `question_department(question uuid)` → für Policies an `questions`, `answer_options`, `question_subjects`, `topics`

`is_admin()` behält seine heutige Bedeutung nur während der Umstellung und wird am Ende durch die neuen Funktionen ersetzt (siehe Phase 3).

### 4.4 Migration der Bestandsdaten

1. Fachbereich `SPED` anlegen, mit den heutigen Texten befüllen.
2. Alle 5 Fächer, 2 Prüfungssets, 4 Shop-Artikel, 3 Prüfungsteile, alle Profile → `SPED`.
3. Prüfungsteile aus `exam/sessions/route.ts` (Teil 1: STG+LOP, 20 Fragen, 90 Min. usw.) in `exam_parts` übertragen.
4. Erst **nach** dem Backfill `NOT NULL` setzen.

Reihenfolge wie beim Profil-Lock (20260924): **erst Spalten + Backfill, dann Code deployen, dann Policies verschärfen.**

### 4.5 Fachkürzel je Bereich (Entscheidung E4)

Beide Bereiche dürfen dasselbe Kürzel haben (z. B. `KSK` in Spedition **und** Tourismus). Ein Kürzel ist damit nur noch **zusammen mit dem Bereich** eindeutig.

- **DB:** `UNIQUE(code)` → `UNIQUE(department_id, code)`.
- **Grundregel im Code:** Ein Fach wird **nie** nur über sein Kürzel gesucht, sondern immer über `(Bereich, Kürzel)` — oder gleich über die ID. Zentraler Helfer `resolveSubjectCodes(departmentId, codes)` statt verstreuter `.eq('code', …)`.
- **Azubi-Seite:** bereits unkritisch — Links verwenden die Fach-**ID** (`/quiz?subject=<uuid>`).
- **Betroffene Stellen** (lösen Kürzel heute global auf):

| Stelle | Neu |
|---|---|
| `api/admin/questions/bulk-import` | `fach_code` im Zielbereich auflösen; fremde Kürzel → Zeile abgelehnt |
| `components/admin/csv-import-dialog.tsx`, `lib/question-import.ts` | Erlaubte Kürzel = Fächer des Zielbereichs |
| `api/admin/exam-sets/import`, `exam-sets/extract` | dito |
| `api/admin/questions` (Filter), `questions/export` | Kürzel im gewählten Bereich |
| `api/admin/subjects` (+ `[id]`) | Doppel-Prüfung nur innerhalb des Bereichs |
| `api/questions?subject=CODE` | Kürzel im Bereich des Azubis |
| `api/exam/sessions` | entfällt — Prüfungsteile verweisen künftig per ID auf Fächer (`exam_part_subjects`) |
| `lib/badges.ts` | entfällt — Fach-Badges hängen an `subject_id` |
| Upload-Pfad: `generation_jobs.subject_code`, `questions_draft.subject_code`, `drafts/[id]`, `drafts/[id]/accept`, `drafts/bulk-accept`, `upload` | auf `subject_id` umstellen; die fest verdrahteten `z.enum(['BGP', …])` fallen weg |
| `components/subject-tag.tsx` (Typ `'BGP' \| 'KSK' …`) | Farbe kommt aus `subjects.color`, Typ wird `string` |

- **Super-Admin beim Import:** Weil `KSK` jetzt mehrdeutig sein kann, importiert auch der Super-Admin immer **in den gerade gewählten Bereich** (Umschalter im Admin-Panel, gut sichtbar über dem Import-Feld).
- **Anzeige:** Wo Fächer beider Bereiche nebeneinander erscheinen (nur Super-Admin-Ansichten), wird das Kürzel mit Bereich gezeigt, z. B. „KSK · Tourismus".

---

## 5. Zugang: Wie kommt jemand in seinen Fachbereich?

Heute: E-Mail-Registrierung **und** Google-Login, danach sofort in der App. Bei Google lassen sich keine Zusatzfelder mitschicken → die Zuordnung muss **nach** dem ersten Login passieren.

**Entschieden: Jeder Bereich hat seine eigene Adresse**

| Adresse | Bereich | Auftritt schon vor dem Login |
|---|---|---|
| `spedilern.vercel.app` (wie heute) | Spedition | SpediLern, LKW-Icon |
| `touristiklern.vercel.app` (neu) | Tourismus | TouristikLern, eigenes Icon |

Beide Adressen zeigen auf **dasselbe** Vercel-Projekt und dieselbe Datenbank. Eine zusätzliche `*.vercel.app`-Adresse ist im Hobby-Tarif kostenlos. Stand 2026-09-29 ist `touristiklern.vercel.app` noch nicht vergeben (`DEPLOYMENT_NOT_FOUND`), reserviert ist sie aber erst, wenn sie im Projekt eingetragen ist.

- **Bestandsnutzer:** Alle bisherigen Spieler sind Speditionskaufleute → sie werden per Migration `SPED` zugeordnet und merken nichts.
- **Erkennung:** Die App liest beim Aufruf die Adresse (`Host`-Header) und schlägt in `departments.domain` nach, welcher Bereich dazugehört. Davon hängen App-Name, Icon, Browser-Tab-Titel und Farben auf Login-, Registrier- und Passwort-Seiten ab.
- **Neue Azubis:** Wer sich auf `touristiklern.vercel.app` registriert (E-Mail oder Google), wird nach dem ersten Login **automatisch** Tourismus zugeordnet. Es gibt keine Auswahlseite und keinen Code, verteilt wird nur die Adresse.
- **Rückfallebene:** Kommt jemand über eine Adresse ohne Bereich (z. B. eine Vercel-Vorschau-URL), erscheint einmalig die Auswahlseite „Welche Ausbildung machst du?" mit Bestätigungsdialog. Bis zur Zuordnung ist die App gesperrt (Proxy-Weiche in `src/proxy.ts`, wenn `department_id` leer).
- **Nach dem Login zählt das Profil, nicht die Adresse:** Loggt sich eine Tourismus-Azubi versehentlich auf `spedilern.vercel.app` ein, sieht sie trotzdem Tourismus (Fragen, Rangliste, Name) und einen Hinweis „Deine App heißt TouristikLern" mit Link. Die Adresse ändert den Bereich nie nachträglich.
- **Speichern** über eine RPC `assign_department_from_host()` bzw. `choose_department(slug)` für die Rückfallebene: setzt den Bereich **nur, wenn er noch leer ist**. Die Zuordnung zur Adresse prüft der Server, nicht der Browser. `department_id` bleibt per Spalten-Grant für Nutzer nicht direkt schreibbar.
- Bei der Zuordnung wird das Pseudonym mit der Wortliste des Bereichs **neu erzeugt** (heute passiert das beim Anlegen, als der Bereich noch unbekannt ist).
- **Falsch zugeordnet?** Die Lehrkraft (Bereichs-Admin) oder du hängt Azubis in der Nutzerverwaltung um.

**Warum das unkritisch ist:** Die Registrierung ist heute schon offen. Wer im falschen Bereich landet, sieht nur Lernfragen und eine andere Rangliste, aber keine Noten und keine fremden Profile. Admin-Rechte hängen nie an der Adresse, die vergibst nur du.

**Einmalige Einrichtung (kostenlos):**
1. ✅ Erledigt am 2026-09-29: `touristiklern.vercel.app` ist im Vercel-Projekt `spedilern` eingetragen und leitet bis zum Umbau auf die normale SpediLern-Anmeldung.
2. ✅ Erledigt am 2026-09-29: Supabase-Redirect-URL `https://touristiklern.vercel.app/**` eingetragen. Die Site URL bleibt `https://spedilern.vercel.app` (nur Rückfall). Bestätigungs-Mails sind seit Mai 2026 abgeschaltet (E-Mail-Konten werden sofort aktiv). Einzige Mail ist „Passwort vergessen“: In Phase 4 prüfen, dass deren Vorlage `{{ .ConfirmationURL }}` statt `{{ .SiteURL }}` verwendet. Ohne diesen Eintrag landen Bestätigungs-Mails, Passwort-Reset und Google-Login wieder auf der Speditions-Adresse. Der Code nutzt bereits `window.location.origin` für alle Weiterleitungen und braucht dafür keine Änderung.
3. Die Google-Cloud-Konsole bleibt unverändert, weil Google nur an Supabase zurückleitet.

**Grenzen:** Login-Sitzungen gelten je Adresse. Wer beide Adressen benutzt, muss sich auf jeder einmal einloggen, was für Azubis praktisch nie vorkommt. Eine „schöne" eigene Domain (z. B. `tourilern.de`) ginge später genauso, kostet aber die Domain-Gebühr.

---

## 6. Rechte & Sicherheit

### 6.1 Zwei Ebenen

| Ebene | Was | Wie durchgesetzt |
|---|---|---|
| **Hart** (personenbezogen) | Profile anderer, Noten/Teilnahmen, Audit-Log, Admin-Schreibzugriffe auf Inhalte | RLS **und** Code-Prüfung in jeder Service-Role-Route |
| **Weich** (Inhalte) | Welche Fächer/Fragen/Prüfungssets/Shop-Artikel ein Azubi sieht | Filter im Code über `my_department_id()` |

Begründung weich: Fragen sind nicht geheim, und eine zusätzliche RLS-Verknüpfung an `questions` (3.800 Zeilen, paginiert) kostet Leistung und Risiko am Kern der App. Kann später nachgeschärft werden.

### 6.2 Admin-Seite im Code

`requireAdmin()` in `src/app/api/admin/_lib/auth.ts` wird zu `requireAdmin()` mit Rückgabe `{ role, departmentId }` plus Helfer `assertCanAdmin(departmentId)`. Jede der **33 Admin-Routen** bekommt eine der drei Behandlungen:

1. **Liste:** nach Bereich filtern (Super-Admin: nach gewähltem Bereich im Umschalter).
2. **Einzelobjekt lesen/ändern/löschen:** Bereich des Objekts laden → `assertCanAdmin`. Sonst 404 (nicht 403 — verrät nicht, dass es existiert).
3. **Anlegen/Import:** Bereich des Ziels prüfen (z. B. Bulk-Import: jeder `fach_code` muss zum eigenen Bereich gehören; fremde Codes → Zeile abgelehnt mit klarer Meldung).

Nur Super-Admin: Fachbereiche anlegen/bearbeiten, Rollen vergeben, Nutzer zwischen Bereichen verschieben.

### 6.3 Die kritischen Stellen

- **Rollen-Eskalation:** `department_admin` darf keine Rollen vergeben und keine `department_id` ändern. (`role` und `department_id` sind per Grant nicht selbst schreibbar — das bleibt so und wird getestet.)
- **Leistungsnachweise:** `assessments/lookup` + `join` per Zugangscode — ein Azubi darf nur Nachweise des **eigenen** Bereichs betreten.
- **Rangliste** (Service-Role): nur Profile des eigenen Bereichs.
- **Blitzrunde:** Fragenpool auf eigene Fächer begrenzen.
- **Audit-Log:** Bereichs-Admins sehen nur Einträge ihres Bereichs.

---

## 7. Prompt & Fragenerstellung

Der Prompt wird **aus Daten zusammengesetzt** statt pro Bereich von Hand gepflegt:

```
[Rolle]           ← departments.prompt_role
[FÄCHER]          ← aktive subjects des Bereichs (Code = Name), automatisch
[REGELN]          ← gemeinsam; Klassenstufen aus departments.class_levels
[QUALITÄTSREGELN] ← QUESTION_QUALITY_RULES, Zielgruppe aus departments.target_group
[ZUSATZHINWEISE]  ← departments.prompt_notes (von der Lehrkraft editierbar)
[JSON-FORMAT]     ← gemeinsam, unverändert
```

- Eine Funktion `buildQuestionPrompt(department, subjects)` in `src/lib/` — genutzt vom kopierten Prompt **und** vom bezahlten Upload-Pfad (`process-job.ts`), damit beide nie auseinanderlaufen.
- `QUESTION_QUALITY_RULES` wird zu `buildQualityRules(targetGroup)`; die Regeln selbst (Längen-Bias, fehlender Kontext …) bleiben für alle gleich — das ist fachneutral und wertvoll.
- Legt die Tourismus-Lehrkraft ein neues Fach an, steht es sofort im Prompt; der Import akzeptiert genau diese Codes.
- Der Korrekturauftrag (`buildFixPrompt`) bekommt dieselbe Rolle/Zielgruppe.
- Der Torwächter (`question-quality.ts`) ist deterministisch und fachneutral → bleibt unverändert. Einzige Prüfstelle: Heuristiken mit Speditions-Vokabular (z. B. „LKW"-Beispiel in `question-rules.ts:38`) neutral formulieren.
- Admin-Seite „Fachbereich-Einstellungen": Lehrkraft pflegt `prompt_notes`, Vorschau des fertigen Prompts.

---

## 8. Gamification je Fachbereich

| Element | Umsetzung |
|---|---|
| Rangliste | Nur eigener Bereich |
| Blitzrunde | Pool = Fragen der eigenen Fächer |
| Münzen / Hof | Name aus `currency_name` / `hof_name` (z. B. „Reisetaler" / „Reisebüro") |
| Shop | Artikel je Bereich; Tourismus-Lehrkraft pflegt eigene |
| Fach-Badges | Datensätze mit `subject_id` + `threshold`; „Allrounder" = alle aktiven Fächer des Bereichs |
| Pseudonyme | Wortliste je Bereich (Adjektive bleiben gemeinsam) |
| Prüfungssimulation | Teile, Fächer, Fragenzahl, Dauer aus `exam_parts` |
| Push-Erinnerung (PROJ-18, noch nicht gebaut) | Texte später bereichsneutral oder aus `departments` |

---

## 9. Werkzeuge (Skripte & Agenten)

- `scripts/quality/audit.ts`, `apply.ts`: Parameter `--bereich SPED|TOUR`, Standard alle.
- `scripts/engagement/audit.ts` + `src/lib/engagement-metrics.ts`: Kennzahlen **je Bereich** ausweisen, sonst verwässert Tourismus die Retention-Zahlen.
- Agenten `question-auditor`, `question-fixer`, `fun-auditor`: Bereich als Eingabe; Fixer nutzt die Zielgruppe des Bereichs.

---

## 10. Phasen

Jede Phase ist einzeln deploybar, und nach jeder Phase ist Spedition unverändert nutzbar.

### Phase 1 — „Entkoppeln" (Spedition sieht nichts)
- `departments` anlegen, `SPED` befüllen, `department_id` an allen Tabellen + Backfill.
- `exam_parts` befüllen; Prüfungssimulation, Prüfungssets, Leistungsnachweise lesen daraus.
- Badges datengetrieben; Fach-Anzeige (Farben/Icons) nur noch aus `subjects`.
- Branding, Münz-/Hof-Name, Pseudonym-Liste aus `departments`; Login-/Passwort-Seiten und Browser-Titel nach Adresse (`generateMetadata` + Host-Header, E2).
- Fach-Auflösung über `(Bereich, Kürzel)` bzw. ID an allen Stellen aus 4.5; Upload-Pfad auf `subject_id`.
- Prompt-Baukasten (`buildQuestionPrompt`), Upload-Pfad angeschlossen.
- **Abnahme:** Build + alle Tests grün; Stichprobe per DB: Prompt-Text für SPED ist inhaltlich identisch zu heute; Prüfungsteile identisch.

### Phase 2 — „Zuordnen" (Azubis)
- Zuordnung über die Adresse (`departments.domain`), Auswahlseite als Rückfallebene, Onboarding-Sperre, Hinweis bei falscher Adresse.
- Alle Lernwege filtern nach Bereich (Fächer, Quiz, Blitzrunde, Prüfung, Shop, Rangliste, Leistungsnachweis-Beitritt).
- **Abnahme:** DB-Test mit zwei Test-Azubis in zwei Bereichen — keiner sieht Fächer, Fragen, Rangliste oder Nachweise des anderen.

### Phase 3 — „Trennen" (Admins) — sicherheitskritisch
- Rolle `department_admin`, neue Hilfsfunktionen, alle 19 Policies umgestellt.
- `requireAdmin()` + `assertCanAdmin()` in allen 33 Admin-Routen.
- Admin-Panel: Bereichs-Umschalter (Super-Admin), Seite „Fachbereich-Einstellungen" (Prompt-Notizen, Adresse zum Kopieren, Münz-/Hof-Name), Nutzerverwaltung: Bereichs-Admin kann eigene Azubis in einen anderen Bereich abgeben, Rollen vergibt nur der Super-Admin.
- **Abnahme:** `/qa` mit Sicherheits-Matrix (siehe 11.) — **keine** offene Critical/High-Lücke, bevor echte Tourismus-Daten hineinkommen.

### Phase 4 — „Tourismus anlegen"
- Bereich `TOUR` mit Texten, Fächern, Prüfungsteilen, Shop-Artikeln, Fach-Badges, Pseudonym-Nomen.
- Lehrkraft einladen → Rolle `department_admin`.
- Kurze Anleitung für die Lehrkraft (Prompt kopieren → KI → JSON einfügen; Prüfungssets; Leistungsnachweise).
- Werkzeuge (Abschnitt 9) umstellen.

### Aufteilung in Specs (eine Verantwortung je Spec)

| Spec | Inhalt | Phase |
|---|---|---|
| PROJ-22 | Fachbereich als Datenbasis (Entkoppeln, Prompt-Baukasten) | 1 |
| PROJ-23 | Fachbereichs-Zuordnung für Azubis (Adresse je Bereich, Filter) | 2 |
| PROJ-24 | Fachbereichs-Admins & Rechtetrennung | 3 |
| PROJ-25 | Onboarding Tourismus (Daten, Anleitung, Werkzeuge) | 4 |

---

## 11. Tests

Kein Dev-Server / kein Playwright (bringt das MacBook zum Absturz) → Build, Vitest und **DB-Tests per SQL**.

- **Unit (Vitest):** `buildQuestionPrompt`, `buildQualityRules`, Badge-Berechnung mit dynamischen Fächern, Import-Ablehnung fremder `fach_code`s, `resolveSubjectCodes` mit gleichem Kürzel in zwei Bereichen (muss das Fach des **richtigen** Bereichs liefern), `assertCanAdmin`.
- **Routen-Tests:** jede Admin-Route mit (a) Super-Admin, (b) Admin eigener Bereich, (c) Admin fremder Bereich → erwartet 404/leer, (d) Azubi → 403.
- **RLS-Matrix per SQL** (als `authenticated` mit gesetzten JWT-Claims, in einer Transaktion mit Rollback):

| Aktion | Azubi SPED | Azubi TOUR | Admin TOUR | Super-Admin |
|---|---|---|---|---|
| Frage aus SPED ändern | ✗ | ✗ | ✗ | ✓ |
| Noten eines SPED-Nachweises lesen | ✗ | ✗ | ✗ | ✓ |
| Profil eines SPED-Azubis lesen | nur eigenes | ✗ | ✗ | ✓ |
| eigene `role` / `department_id` ändern | ✗ | ✗ | ✗ | – |
| SPED-Shopartikel anlegen | ✗ | ✗ | ✗ | ✓ |
| TOUR-Frage anlegen | ✗ | ✗ | ✓ | ✓ |

- **Regression Spedition:** Snapshot des generierten SPED-Prompts gegen den heutigen Text; Prüfungsteile identisch.

---

## 12. Risiken

| Risiko | Gegenmaßnahme |
|---|---|
| Eine Stelle sucht ein Fach weiter nur per Kürzel → Frage landet im falschen Bereich (E4) | Zentraler Helfer `resolveSubjectCodes`; Suche nach `.eq('code'` muss am Ende nur noch im Helfer vorkommen; Test mit gleichem Kürzel in zwei Bereichen |
| Eine Admin-Route wird beim Filtern vergessen → Datenleck | Checkliste aller 33 Routen im Spec; Routen-Test (c) für **jede** Route; zentraler Helfer statt Einzel-Logik |
| Policy-Umstellung sperrt die Live-App aus | Reihenfolge Spalten → Code → Policies; jede Policy-Migration mit Rückweg-SQL im selben Commit |
| Bestehende Badges gehen verloren | Badge-IDs bleiben, nur Berechnung wird datengetrieben; `user_badges` bleibt unangetastet |
| Rangliste/Retention-Zahlen vermischen sich | Engagement-Audit je Bereich (Phase 4) |
| Free Tier (500 MB DB, 50k MAU) | Heute weit darunter; Tourismus verdoppelt grob Fragen/Antworten — unkritisch |
| Zwei Lehrkräfte ändern gemeinsame Qualitätsregeln | Regeln bleiben Code (nur du), Lehrkraft pflegt nur `prompt_notes` |
| Datenschutz: neue Lehrkraft verarbeitet Noten | Organisatorisch klären (Schule), technisch nur eigener Bereich sichtbar |

---

## 13. Entscheidungen

| # | Frage | Vorschlag |
|---|---|---|
| E1 | Wie kommen Azubis in ihren Bereich? | ✅ Über die Adresse: `touristiklern.vercel.app` → Tourismus automatisch; Auswahlseite nur als Rückfallebene |
| E2 | Was steht auf der Login-Seite? | ✅ Name und Icon des Bereichs, erkannt an der Adresse (ersetzt den neutralen Namen) |
| E3 | Wer verwaltet die Spedition? | ✅ Nur du (Super-Admin); nur Tourismus bekommt eine Bereichs-Admin-Lehrkraft |
| E4 | Dürfen Fachkürzel in beiden Bereichen vorkommen? | ✅ Ja, eindeutig nur je Bereich — Folgen siehe 4.5 |
| E5 | Inhalte für Azubis nur per Code filtern (weich) oder zusätzlich per RLS? | ✅ Weich (Filter im Code), später nachschärfbar — Personen- und Notendaten bleiben hart per RLS getrennt |
| E6 | Spiel-Thema Tourismus? | ✅ Eigene Namen (z. B. Reisetaler / Reisebüro), von der Lehrkraft festlegbar; Spedition behält ihres |
| E7 | Können Azubis den Bereich nach der Wahl selbst wechseln? | ✅ Nein — Lehrkraft oder Super-Admin hängt um |
| E8 | Neutraler App-Name? | ✅ Entfällt — jede Adresse hat ihren eigenen Namen; ohne bekannte Adresse gilt SpediLern |
| E9 | Was darf die Tourismus-Lehrkraft? | ✅ Alles innerhalb von Tourismus (Fragen, Fächer/Themen, Prüfungen/Noten, Azubis/Shop); Rollen, Bereiche, App-Einstellungen und Qualitätsregeln nur Super-Admin |

## 14. Was der Tourismus-Bereich liefern muss (vor Phase 4)

- Lernfächer mit Kürzel und Kurzbeschreibung (Kürzel frei wählbar, auch gleich wie in der Spedition)
- Aufbau der Abschlussprüfung: Teile, zugehörige Fächer, Fragenanzahl, Dauer
- Klassenstufen (10/11/12 wie Spedition?)
- Name(n) und E-Mail der Lehrkraft/Lehrkräfte mit Admin-Rechten
- Wunsch für App-Name, Münz- und Hof-Namen, ein paar Shop-Artikel
- Ob überhaupt benotete Leistungsnachweise genutzt werden sollen
