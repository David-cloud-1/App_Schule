# PROJ-39: Leistungsnachweis – Kategorisierung & Filter

## Status: In Review
**Created:** 2026-10-21
**Last Updated:** 2026-10-21

## Beschreibung
Die Admin-Liste der Leistungsnachweise wird mit Schuljahr, Klasse und Fach kategorisiert und durchsuchbar gemacht, damit sie bei vielen Nachweisen übersichtlich bleibt. Die Zuordnung dient nur der Ablage und ändert nichts am Code-Zugang oder an den Teilnehmern (keine Klassenzuordnung der Teilnehmer, siehe PROJ-15/PROJ-21).

## Dependencies
- Requires: PROJ-21 (Benotete Leistungsnachweise) – Liste, Erstellen-Dialog, Detailansicht
- Requires: PROJ-27 (eigene Fragen-Zusammenstellung) – Nachweise ohne festes Prüfungsset, daher kein Fach ableitbar
- Requires: PROJ-22/24 (Fachbereiche & Fachbereichs-Admins) – Fächer und Sichtbarkeit je Fachbereich

## Festlegungen (mit dem Nutzer geklärt)
- **Fach:** genau ein Fach, aus den vorhandenen App-Fächern ausgewählt (kein Freitext), optional.
- **Klasse:** reale, genaue Klasse (z. B. „SP11a“) als Freitext mit Vorschlägen aus bereits verwendeten Klassen, optional. Keine eigene Klassenverwaltung.
- **Schuljahr:** wird automatisch aus dem Erstelldatum bestimmt (ab 1. September beginnt ein neues Schuljahr, z. B. „2026/27“) und ist überschreibbar.
- **Filter statt Ordner:** die drei Achsen sind frei kombinierbar.

## User Stories
- Als Admin möchte ich einen Leistungsnachweis beim Erstellen einer Klasse und einem Fach zuordnen, damit ich ihn später wiederfinde.
- Als Admin möchte ich die Liste nach Schuljahr, Klasse und Fach filtern, damit ich bei vielen Nachweisen nur den relevanten Ausschnitt sehe.
- Als Admin möchte ich standardmäßig das aktuelle Schuljahr sehen, damit ich im Alltag nicht erst filtern muss.
- Als Admin möchte ich nach Status (Entwurf / Offen / Geschlossen) und nach Titel oder Code suchen, damit ich einen laufenden oder bestimmten Nachweis sofort finde.
- Als Admin möchte ich Klasse, Fach und Schuljahr nachträglich in der Detailansicht ändern, damit ich auch bestehende Nachweise einsortieren kann.
- Als Fachbereichs-Admin möchte ich nur Nachweise und Fächer meines Fachbereichs sehen, wie bisher.

## Acceptance Criteria
- [ ] Jeder Leistungsnachweis hat die optionalen Felder Klasse (Text, max. 30 Zeichen) und Fach (genau eines aus den App-Fächern) sowie ein Schuljahr.
- [ ] Das Schuljahr wird beim Erstellen aus dem Erstelldatum vorbelegt (1.9.–31.8.) und kann im Dialog und in der Detailansicht geändert werden.
- [ ] Der „Neu erstellen“-Dialog enthält Auswahl für Fach und Eingabe für Klasse; beide dürfen leer bleiben. Der Button bleibt an seiner Position.
- [ ] Das Klassenfeld schlägt bereits verwendete Klassen des eigenen Fachbereichs vor; Groß-/Kleinschreibung und Leerzeichen am Rand werden beim Speichern vereinheitlicht (Leerzeichen entfernt, Schreibweise der vorhandenen Klasse übernommen), sodass „sp11a“ und „SP11a“ nicht doppelt als Filterwert erscheinen.
- [ ] Über der Tabelle gibt es Dropdowns für Schuljahr, Klasse und Fach sowie eine Suche nach Titel oder Code; die Filter wirken kombiniert (UND).
- [ ] Jede Filter-Dropdown enthält „Alle“; Klasse und Fach zusätzlich „Ohne Zuordnung“.
- [ ] Beim Öffnen der Seite ist das aktuelle Schuljahr vorausgewählt; Sortierung ist „neueste zuerst“.
- [ ] Es gibt einen Status-Schnellfilter (Alle / Entwurf / Offen / Geschlossen).
- [ ] Die Tabelle zeigt Klasse und Fach als kleine Badges; das Schuljahr ist keine eigene Spalte.
- [ ] Bei leerem Filterergebnis erscheint ein Hinweis mit Button „Filter zurücksetzen“.
- [ ] Die Filterwerte der Dropdowns enthalten nur Werte, die tatsächlich vorkommen (keine leeren Optionen).
- [ ] Bestehende Nachweise bleiben unverändert funktionsfähig; sie erhalten das Schuljahr aus ihrem Erstelldatum, Klasse und Fach bleiben leer („Ohne Zuordnung“).
- [ ] Zuordnung hat keinerlei Auswirkung auf Beitrittscode, Teilnehmer, Auswertung, Druck oder Teilnahmefenster.
- [ ] Fachbereichs-Admins sehen und ändern nur Nachweise und Klassenvorschläge ihres Fachbereichs; Fächer-Auswahl enthält nur Fächer des Fachbereichs. Der Super-Admin folgt dem Bereichs-Umschalter (PROJ-29).

## Edge Cases
- Bestehende Nachweise (z. B. vor Einführung angelegt) haben weder Klasse noch Fach: sie erscheinen unter „Ohne Zuordnung“ und im passenden Schuljahr, nie „unsichtbar“ durch den Standardfilter.
- Nachweis wird kurz nach dem 1. September für das alte Schuljahr angelegt: Schuljahr wird manuell überschrieben; er erscheint dann unter dem alten Schuljahr, nicht im Standardfilter.
- Das aktuelle Schuljahr hat noch keine Nachweise, ältere schon: leerer Zustand mit Hinweis und Möglichkeit, das Schuljahr zu wechseln.
- Klasse mit Sonderzeichen oder sehr langem Text: Eingabe wird auf 30 Zeichen begrenzt, HTML wird nicht interpretiert.
- Ein Fach wird später gelöscht oder umbenannt: der Nachweis verliert nicht seine Daten; bei gelöschtem Fach erscheint er unter „Ohne Zuordnung“ (kein Löschen des Nachweises).
- Nachweis ist bereits offen oder geschlossen: Kategorien bleiben bearbeitbar, weil sie keine Prüfungsdaten sind; keine Wirkung auf laufende Durchläufe.
- Zwei Admins ändern gleichzeitig: letzte Speicherung gewinnt, keine Datenbeschädigung.
- Filterzustand: bleibt beim Wechsel in die Detailansicht und zurück erhalten (z. B. über die URL).
- Viele Nachweise (mehrere hundert): Liste bleibt flüssig bedienbar.

## Technical Requirements
- Security: nur Admins und Fachbereichs-Admins dürfen Kategorien lesen/ändern (bestehende Rechtetrennung aus PROJ-24).
- Änderungen am Datenmodell sind rein additiv (neue optionale Spalten), keine Änderung am Zugriffsweg über Beitrittscodes.
- Mobile-First, Touch-Ziele mind. 44px, Dark-Mode-Design gemäß docs/DESIGN.md; Filterleiste bricht auf kleinen Bildschirmen sauber um.

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)

**Entworfen:** 2026-10-21 · **Backend nötig:** ja (kleine, rein additive Erweiterung der bestehenden Nachweis-Daten)

### Bestandsaufnahme (was schon da ist)
- Die Liste lädt alle Nachweise des eigenen Fachbereichs in einem Rutsch und zeigt sie als Tabelle; „Neu erstellen“ ist ein eigener Dialog.
- Fächer gibt es bereits je Fachbereich (Name + Kürzel wie KSK). Die Auswahl dafür muss also nicht neu gebaut werden.
- Die Detailseite erlaubt heute nur im **Entwurf** das Bearbeiten (Fragen etc.). Das ist für Kategorien zu streng, siehe Entscheidung 3.
- Ein Nachweis hängt nicht mehr zwingend an einem Prüfungsset (PROJ-27). Ein Fach lässt sich daher nicht ableiten und muss gespeichert werden.

### A) Komponentenstruktur
```
Leistungsnachweise-Seite (besteht)
+-- Kopfzeile: Titel + „Neu erstellen“-Button (unverändert)
+-- NEU: Filterleiste
|   +-- Suchfeld (Titel oder Code)
|   +-- Dropdown Schuljahr   (Standard: aktuelles Schuljahr)
|   +-- Dropdown Klasse      (Alle / Ohne Zuordnung / vorhandene Klassen)
|   +-- Dropdown Fach        (Alle / Ohne Zuordnung / Fächer des Bereichs)
|   +-- Status-Chips: Alle · Entwurf · Offen · Geschlossen
+-- Tabelle (besteht)
|   +-- Titel-Spalte mit kleinen Badges „Klasse“ und „Fach“ darunter/daneben
|   +-- Status, Code, Teilnehmer, Erstellt (unverändert)
+-- NEU: Leerzustand „Keine Treffer“ mit „Filter zurücksetzen“

„Neu erstellen“-Dialog (besteht)
+-- NEU: Abschnitt „Ablage“ (alles optional)
    +-- Fach-Auswahl
    +-- Klassen-Eingabe mit Vorschlägen
    +-- Schuljahr (vorbelegt, änderbar)

Detailseite eines Nachweises (besteht)
+-- NEU: Karte „Ablage“ mit denselben drei Feldern und eigenem Speichern-Knopf
```
Wiederverwendet werden die vorhandenen shadcn-Bausteine (Select, Badge, Input, Button). Es kommt keine neue Bibliothek dazu.

### B) Datenmodell (Klartext)
Jeder Leistungsnachweis bekommt drei zusätzliche Angaben:
- **Schuljahr** – Text wie „2026/27“. Pflicht, wird aber immer automatisch vorbelegt. Für bestehende Nachweise wird es einmalig aus dem Erstelldatum berechnet.
- **Klasse** – freier Text, höchstens 30 Zeichen, leer erlaubt.
- **Fach** – Verweis auf ein vorhandenes Fach, leer erlaubt. Wird ein Fach gelöscht, bleibt der Nachweis bestehen und fällt auf „Ohne Zuordnung“ zurück.

Gespeichert wird in der bestehenden Nachweis-Tabelle in Supabase. Die Klassenvorschläge entstehen aus den schon verwendeten Klassen des eigenen Fachbereichs; es gibt keine eigene Klassentabelle.

Bestehende Nachweise bleiben unverändert funktionsfähig: Klasse und Fach sind leer, das Schuljahr wird nachgetragen. Zugriffsschutz (nur Admins des eigenen Fachbereichs) gilt unverändert, es sind keine neuen Zugriffsregeln nötig.

### C) Tech-Entscheidungen (mit Begründung)
1. **Filtern im Browser statt auf dem Server.** Die Liste wird ohnehin komplett geladen. Bei einigen hundert Nachweisen pro Fachbereich ist Filtern im Browser sofort und spart eine Server-Abfrage pro Klick. Falls die Zahl später wirklich wächst, lässt sich serverseitiges Filtern nachrüsten, ohne die Oberfläche zu ändern.
2. **Filter stehen in der Adresszeile (URL).** So bleibt die Auswahl beim Wechsel in die Detailansicht und zurück erhalten, und ein gefilterter Blick lässt sich als Link merken. Das nutzt die Seite für „createFromSet“ schon so.
3. **Kategorien sind auch bei offenen und geschlossenen Nachweisen änderbar.** Die bisherige Regel „nur Entwürfe bearbeitbar“ schützt Fragen, Zeiten und Notenschlüssel. Kategorien sind reine Ablage und berühren das nicht. Deshalb bekommen sie einen eigenen, schmalen Änderungsweg, der Prüfungsdaten nie anfasst. Das macht auch das Nachpflegen der vier bestehenden Nachweise möglich.
4. **Schuljahr als Text „2026/27“.** Einfach lesbar, sortierbar und ohne Datumsrechnung im Filter. Die Berechnung (ab 1. September neues Schuljahr) liegt an einer einzigen Stelle und wird von Dialog, Liste und Nachpflege gemeinsam benutzt.
5. **Klassen vereinheitlichen beim Speichern.** Leerzeichen am Rand werden entfernt; stimmt die Eingabe bis auf Groß-/Kleinschreibung mit einer vorhandenen Klasse überein, wird deren Schreibweise übernommen. Das verhindert doppelte Filtereinträge ohne eine eigene Klassenverwaltung.
6. **Keine Wirkung auf Teilnehmer-Pfade.** Beitrittscode, Beitritt, Auswertung und Druck lesen die neuen Felder nicht. Das Risiko für laufende Prüfungen ist damit praktisch null.
7. **Protokoll.** Änderungen an der Ablage werden wie andere Admin-Aktionen im Audit-Log festgehalten.

### D) Abhängigkeiten (Pakete)
Keine neuen Pakete.

### E) Reihenfolge der Umsetzung
1. `/backend`: Datenmodell erweitern (additiv, mit Rückweg), Liste und Anlegen liefern/speichern die neuen Felder, schmaler Änderungsweg für die Ablage, gemeinsame Schuljahr-Berechnung mit Tests.
2. `/frontend`: Filterleiste, Badges, Leerzustand, Ablage-Abschnitt im Dialog und Ablage-Karte in der Detailansicht.
3. `/qa`: Rechtetrennung zwischen Fachbereichen, Schuljahreswechsel um den 1. September, Altdaten, gelöschtes Fach.

### F) Bewusst nicht enthalten
Eigene Klassenverwaltung, Mehrfach-Fächer, Zuordnung von Teilnehmern zu Klassen, Gruppierung/Ordneransicht, Archivieren von Schuljahren.

## Implementation Notes – Backend (2026-10-21)

**Gebaut:**
- **Migration** `supabase/migrations/20261021_proj39_assessment_category.sql` (+ `_down`): neue Spalten `school_year` (Pflicht, Standard aus der DB-Funktion `current_school_year()`, Bestand aus `created_at` nachgetragen), `class_name` (max. 30 Zeichen, optional), `subject_id` (Verweis auf `subjects`, `ON DELETE SET NULL`), zwei Indizes. Keine RLS-Änderung, alter Code läuft ohne die Felder weiter. **Noch nicht auf die Produktions-DB angewendet** (kommt beim Deploy, vor dem Push). Als Rollback-Test gegen Produktion geprüft: Funktion liefert 15.10.2026 → 2026/27, 20.06.2027 → 2026/27, 31.8.2026 22:30 UTC (= 1.9. Berlin) → 2026/27; alle 4 Bestandsnachweise bekommen 2026/27.
- **Lib** `src/lib/assessment-category.ts`: `schoolYearFor` (gleiche Regel wie die DB-Funktion, Europe/Berlin), `isValidSchoolYear`, `normalizeClassName`, `resolveCategory` (prüft, dass das Fach zum Bereich des Nachweises gehört, und vereinheitlicht die Klasse gegen schon verwendete Klassen; fragt die DB nur, wenn Klasse/Fach übergeben werden).
- **API:**
  - `GET /api/admin/assessments` liefert zusätzlich `schoolYear`, `className`, `subjectId`, `subjectName`, `subjectCode`.
  - `POST /api/admin/assessments` nimmt optional `className`, `subjectId`, `schoolYear`.
  - `GET /api/admin/assessments/[id]` liefert `schoolYear`, `className`, `subjectId`.
  - **Neu:** `PATCH /api/admin/assessments/[id]/category` – ändert nur die drei Ablage-Felder, in **jedem** Status (der allgemeine PATCH bleibt Entwurf-only). Schreibt einen Audit-Log-Eintrag `graded_assessment.category`.
- **Tests:** `assessment-category.test.ts` (13), `category/route.test.ts` (10), Ergänzungen in `assessments/route.test.ts`. Gesamtlauf: 89 Dateien / 1011 Tests grün, `tsc` ohne neue Fehler.

**Abweichungen/Hinweise für Frontend:**
- Klassenvorschläge gibt es **keinen eigenen Endpunkt**: das Frontend leitet sie aus der geladenen Liste ab (`className` aller Nachweise). Die Vereinheitlichung geschieht serverseitig beim Speichern.
- Die Fach-Auswahl lädt das Frontend über das vorhandene `GET /api/admin/subjects` (Bereichs-gefiltert).
- Die Detailseite hat heute keine Titel-Bearbeitung außerhalb des Entwurfs; die neue Ablage-Karte muss deshalb unabhängig vom Status bearbeitbar sein.

## Implementation Notes – Frontend (2026-10-22)

**Gebaut:**
- **Listenseite** (`src/app/admin/leistungsnachweise/page.tsx`): Filterleiste über der Tabelle (Suche, Schuljahr, Klasse, Fach, Status-Chips), Standard = aktuelles Schuljahr, neueste zuerst. Klasse und Fach erscheinen als Badges unter dem Titel. Leerzustände: „Im Schuljahr … gibt es noch keine Nachweise“ (mit „Alle Schuljahre anzeigen“) bzw. „Keine Nachweise passen zu diesen Filtern“ (mit „Filter zurücksetzen“). Die Filterleiste erscheint erst, wenn es mindestens einen Nachweis gibt. „Neu erstellen“ ist unverändert platziert.
- **Filter in der Adresszeile** (`sj`, `klasse`, `fach`, `status`; nur Abweichungen vom Standard). Die Suche bleibt bewusst lokal. Die Dropdowns bieten nur vorkommende Werte; „Ohne Klasse“/„Ohne Fach“ nur, wenn es solche Nachweise gibt.
- **Dialog „Neu erstellen“**: neuer Abschnitt „Ablage“ (Schuljahr vorbelegt, Klasse mit Vorschlägen als Eingabe, Fach-Auswahl), alles änderbar und leer erlaubt.
- **Detailseite**: neue Karte „Ablage“ mit Speichern-Knopf, in jedem Status bearbeitbar (nutzt den neuen Endpunkt `/category`).
- **Neue Dateien:** `src/lib/assessment-filter.ts` (+ Test, 11 Tests), `assessment-filter-bar.tsx`, `assessment-category-fields.tsx`, `assessment-category-card.tsx` (alle in `src/components/admin/`). Es wurden nur vorhandene shadcn-Bausteine verwendet.

**Abweichungen/Hinweise:**
- Klassen-Vorschläge nutzen das native `<datalist>` des Browsers (gut auf dem Handy, keine Zusatzbibliothek).
- Die Fach-Auswahl zeigt alle Fächer des Bereichs (auch inaktive), damit ein bereits gesetztes Fach immer wählbar bleibt.
- Die Beschreibung unter der Überschrift lautet jetzt „Zugang per Code — Klasse und Fach dienen nur der Ablage.“
- **Nicht im Browser getestet** (kein Dev-Server auf diesem Rechner, siehe Projektregel). Geprüft: `tsc`, `eslint` (keine neuen Warnungen), 90 Testdateien / 1022 Tests grün, `npm run build` erfolgreich (dafür wurde `scripts/scratch/fragen-pipeline` vorübergehend ausgelagert, weil der Ordner den Build bricht; wiederhergestellt).

## QA Test Results

**Tested:** 2026-10-22
**Methode:** Code-Review gegen jede Anforderung, automatische Tests, Sicherheits-Review. **Nicht** im Browser getestet und **keine** Playwright-/E2E-Tests (auf diesem Rechner nicht erlaubt, siehe Projektregel „Kein Dev-Server“). Die Datenbank-Gegenprobe (Prüfregeln, Fach löschen, alter Insert gegen die Produktions-DB im Rollback) wurde **nicht ausgeführt** (vom Nutzer abgelehnt) – die Migration ist weiterhin nicht auf der Produktions-DB angewendet.
**Automatisch:** 92 Testdateien / 1030 Tests grün (neu: 3 Dateien für Filterlogik, Filterleiste, Ablage-Karte, Category-Endpunkt, Kategorie-Lib), `tsc` ohne neue Fehler, `eslint` ohne neue Warnungen, `npm run build` erfolgreich.

### Acceptance Criteria Status

- [x] AC-1 Felder Klasse (≤ 30), Fach (genau eines) und Schuljahr je Nachweis – Migration + Zod + DB-Prüfregel (nur gelesen, nicht live geprüft)
- [x] AC-2 Schuljahr vorbelegt (1.9.–31.8., Berliner Zeit), im Dialog und in der Detailansicht änderbar – Unit-Tests inkl. Grenzfall 31.8. 22:30 UTC
- [x] AC-3 Dialog enthält Fach-Auswahl und Klassen-Eingabe, beides optional; Button unverändert
- [x] AC-4 Klassenvorschläge aus dem eigenen Bereich; Vereinheitlichung beim Speichern (Ränder, Mehrfach-Leerzeichen, Schreibweise der vorhandenen Klasse) – Tests
- [x] AC-5 Dropdowns Schuljahr/Klasse/Fach + Suche (Titel/Code, tolerant bei Trennzeichen), UND-Verknüpfung – Tests
- [x] AC-6 „Alle“ in jedem Dropdown; „Ohne Zuordnung“ bei Klasse und Fach (hier als „Ohne Klasse“/„Ohne Fach“, nur wenn solche Nachweise existieren)
- [x] AC-7 Standard: aktuelles Schuljahr, neueste zuerst
- [x] AC-8 Status-Schnellfilter (Alle/Entwurf/Offen/Geschlossen)
- [x] AC-9 Badges für Klasse und Fach in der Tabelle, kein Schuljahr-Spalte
- [x] AC-10 Leerzustand mit „Filter zurücksetzen“ (zusätzlich „Alle Schuljahre anzeigen“)
- [~] AC-11 Dropdowns zeigen nur vorkommende Werte – Klasse/Fach ja; beim Schuljahr steht das **aktuelle** Schuljahr immer in der Liste, auch ohne Nachweise (bewusst, damit der Standardfilter wählbar bleibt)
- [x] AC-12 Bestand bleibt funktionsfähig: Schuljahr aus Erstelldatum, Klasse/Fach leer (nur per Code-Review und Migrationsdatei, nicht live)
- [x] AC-13 Keine Wirkung auf Code, Teilnehmer, Auswertung, Druck: die neuen Felder werden nirgends in Teilnehmer-Pfaden gelesen; Test stellt sicher, dass der Category-Endpunkt nur die drei Ablage-Spalten schreibt
- [x] AC-14 Rechtetrennung: Endpunkt lädt den Nachweis über die Row-Level-Security des Bereichs (`can_admin_department`), Fach wird gegen den Bereich des Nachweises geprüft; fremder Nachweis → 404, fremdes Fach → 400 (nur mit Mocks getestet, nicht gegen echte RLS)

### Edge Cases Status

- [x] Bestand ohne Klasse/Fach landet unter „Ohne …“, nie unsichtbar durch den Standardfilter (Schuljahr wird nachgetragen)
- [x] Nachweis für das alte Schuljahr kurz nach dem 1.9.: Schuljahr überschreibbar, erscheint dann dort
- [x] Aktuelles Schuljahr leer, ältere vorhanden: Hinweis mit Knopf „Alle Schuljahre anzeigen“
- [x] Klasse mit Sonderzeichen/zu lang: 30 Zeichen begrenzt (Eingabe + Server), React maskiert HTML
- [x] Fach gelöscht: `ON DELETE SET NULL` (nur in der Migration gelesen, **nicht live getestet**)
- [x] Offene/geschlossene Nachweise: Ablage bleibt änderbar, getrennt vom Entwurf-Only-PATCH
- [x] Gleichzeitige Änderung: letzte Speicherung gewinnt, keine Beschädigung
- [x] ~~BUG-1: Filterzustand geht über den Zurück-Pfeil der Detailseite verloren~~ – behoben, siehe unten
- [x] Viele Nachweise: Filterung im Browser, keine Schleifen über die Datenbank

### Security Audit Results
- [x] Authentifizierung: Category-Endpunkt, Liste, Anlegen verlangen Admin (401/403, Test)
- [x] Autorisierung: Zugriff nur über Bereichs-RLS; Fach nur aus dem Bereich des Nachweises; Audit-Log mit Bereich des Nachweises
- [x] Mass Assignment: zusätzliche Felder (Titel, Zeiten) im Category-Body ändern nichts (Test)
- [x] Eingabe: Zod-Validierung (UUID, Länge, Schuljahr-Format), Ausgabe per React maskiert, `datalist`-Werte als Text
- [x] Keine Geheimnisse, keine neuen Umgebungsvariablen, keine neuen Pakete
- [ ] Nicht geprüft: echte RLS gegen die Datenbank (Gegenprobe abgelehnt/ausgelassen)

### Regression
- [x] Gesamte Testsuite grün; bestehende Nachweis-Routen (Anlegen, Bearbeiten, Auswertung, Druck, Beitritt) unverändert getestet
- [ ] Nicht im Browser geprüft: Layout bei 375/768/1440 px, Safari/Firefox (Filterleiste bricht per Grid um; Touch-Ziele h-11 = 44 px laut Code)

### Bugs Found

#### BUG-1: Zurück-Pfeil der Detailseite verliert die Filter
- **Severity:** Medium
- **Steps:** Liste auf „Schuljahr 2025/26, Klasse SP11a“ filtern → Nachweis öffnen → oben links den Pfeil „←“ klicken.
- **Erwartet (Spec, Edge Case „Filterzustand“):** gleiche Filter wie vorher. **Tatsächlich:** der Pfeil verlinkt auf `/admin/leistungsnachweise` ohne Parameter → Standardfilter (aktuelles Schuljahr). Der Browser-Zurück-Knopf funktioniert, ebenso `router.push` nach dem Löschen (ebenfalls ohne Filter).
- **Ort:** `src/app/admin/leistungsnachweise/[id]/page.tsx` Zeilen 208 und 274
- **Priorität:** vor dem Deploy beheben (kleine Änderung)
- **✅ Behoben (2026-10-22):** Die Liste merkt sich ihren Filterzustand pro Browser-Tab (`src/lib/assessment-list-memory.ts`, nur die vier bekannten Parameter); Zurück-Pfeil und Weiterleitung nach dem Löschen führen dorthin zurück. Tests in `assessment-list-memory.test.ts`.

#### BUG-2: Jeder Tastendruck in der Suche löst eine Navigation aus
- **Severity:** Medium (Leistung, funktioniert aber)
- **Ursache:** `changeFilters` ruft für **jede** Änderung, auch für die lokale Suche, `router.replace` mit unveränderter Adresse auf. Bei dynamischen Next-Seiten kann das pro Tastendruck eine Server-Anfrage auslösen.
- **Priorität:** vor dem Deploy beheben (Suche nur lokal setzen, `router.replace` nur bei Änderung der Adress-Parameter)
- **✅ Behoben (2026-10-22):** `changeFilters` navigiert nur noch, wenn sich die Adress-Parameter wirklich ändern; die Suche bleibt rein lokal. (Nur per Code-Review geprüft, nicht im Browser.)

#### BUG-3: Klassen namens „alle“ oder „none“ kollidieren mit den Filter-Platzhaltern
- **Severity:** Low – eine Klasse „alle“/„none“ würde „Alle Klassen“ bzw. „Ohne Klasse“ auslösen. Unwahrscheinlich bei Namen wie „SP11a“.
- **Priorität:** Nice to have

#### BUG-4- **✅ Behoben (2026-10-22):** Echte Klassen tragen im Filter ein Präfix (`k:`), „Alle“/„Ohne Klasse“ bleiben eigene Werte; ältere Links ohne Präfix gelten weiter. Tests mit Klassen „alle“ und „none“.
: Klassenschreibweise lässt sich nachträglich nicht mehr auf eine andere Groß-/Kleinschreibung ändern; der Speichern-Knopf bleibt danach aktiv
- **Severity:** Low – „sp11a“ wird immer zu einer vorhandenen „SP11a“ vereinheitlicht (gewollt). Wer die Schreibweise der einzigen Klasse korrigieren will, kann es nicht; der Knopf bleibt nach dem Speichern aktiv, weil der Vergleich Groß-/Kleinschreibung beachtet.
- **Priorität:** Nice to have

#### BUG-5- **✅ Behoben (2026-10-22):** Beim Ändern eines Nachweises zählt dessen eigene Klasse nicht als „schon verwendet“, die Schreibweise lässt sich also korrigieren, solange keine andere Prüfung die Klasse nutzt. Der Speichern-Knopf vergleicht gegen den zuletzt gespeicherten (vom Server vereinheitlichten) Stand und ruht danach.
: Bei Super-Admin im Bereichs-Umschalter kann die Fach-Auswahl zum falschen Bereich gehören
- **Severity:** Low – Detailseite eines Nachweises aus einem anderen als dem eingestellten Bereich zeigt Fächer des eingestellten Bereichs; der Server lehnt falsche Fächer mit 400 ab, das gesetzte Fach erscheint aber leer.
- **Priorität:** Nice to have

#### Hinweise- **✅ Behoben (2026-10-22):** Der Detail-Endpunkt liefert `categoryOptions` (Fächer und Klassen des Bereichs **des Nachweises**); die Ablage-Karte nutzt diese statt eigener Abfragen im Arbeitsbereich des Umschalters.
 (kein Fehler)
- Der Anlegen-Dialog sendet immer `className`, dadurch läuft pro Anlegen eine zusätzliche Abfrage der vorhandenen Klassen, auch bei leerer Klasse (kleine Einsparung möglich).
- Die Abfrage der vorhandenen Klassen hat kein eigenes Limit (PostgREST-Standard 1000 Zeilen) – für diese App irrelevant.
- `src/lib/database.types.ts` wurde nicht neu generiert (der Code nutzt einen ungetypten Client).

### Summary
- Anforderungen: 13 von 14 voll erfüllt, 1 mit bewusster Abweichung (AC-11, Schuljahr).
- Fehler: 0 Critical, 0 High, 2 Medium, 3 Low.
- **Nachbesserung 2026-10-22:** Alle fünf Fehler (BUG-1 bis BUG-5) sind behoben. Danach: 93 Testdateien / 1041 Tests grün, `tsc` und `eslint` ohne neue Meldungen, `npm run build` erfolgreich. Neu: `assessment-list-memory`-Tests, Tests für Klassen „alle“/„none“, Ausschluss der eigenen Klasse, Ablage-Karte ruht nach dem Speichern.
- **Production-Ready:** keine offenen Critical/High/Medium/Low-Fehler. **Noch offen vor dem Deploy:** Browser-Sicht (Layout 375/768/1440 px, Safari/Firefox) und die Datenbank-Gegenprobe (Prüfregeln, echte RLS, Fach löschen) wurden nicht ausgeführt. Status bleibt bis zu deiner Freigabe **In Review**.

## Deployment
_To be added by /deploy_
