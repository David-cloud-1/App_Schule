# PROJ-79: Nachweis duplizieren & schwache Fragen ersetzen

## Status: Deployed
**Created:** 2026-11-07
**Last Updated:** 2026-11-09

## Dependencies
- Requires: PROJ-21 (Nachweise), PROJ-27 (Zusammenstell-Editor)
- Optional: PROJ-75 (Ampel zeigt, welche Fragen ersetzt werden sollten), PROJ-78 (Ersatz-Vorschläge), PROJ-76 (Gruppeneinstellung wird übernommen)

## Summary
Aus einem bestehenden Nachweis wird mit einem Klick ein neuer Entwurf mit denselben Einstellungen und Fragen. Schwache oder auffällige Fragen aus dem alten Durchlauf werden markiert und gezielt durch passende Ersatzfragen ausgetauscht. Ideal für den Nachweis des nächsten Schuljahres oder einer Parallelklasse.

## User Stories
- Als **Lehrkraft** möchte ich einen früheren Nachweis kopieren, damit ich nicht von vorn anfange.
- Als **Lehrkraft** möchte ich im Entwurf sehen, welche Fragen beim letzten Mal schlecht liefen, damit ich sie austauschen kann.
- Als **Lehrkraft** möchte ich für eine Frage einen passenden Ersatz gleichen Themas und gleicher Schwierigkeit bekommen, damit der Nachweis vergleichbar bleibt.
- Als **Lehrkraft** möchte ich, dass beim Kopieren keine Ergebnisse oder Teilnehmer mitkommen.

## Acceptance Criteria

### Duplizieren
- [ ] In der Nachweis-Liste und auf der Detailseite gibt es „Duplizieren“ (nicht als grüne Hauptaktion, sondern als `outline`-Aktion im Menü).
- [ ] Der Entwurf übernimmt: Fragenliste in der Reihenfolge, Fachbereich, Kategorie (PROJ-39), Dauer, Notenschlüssel, Mischeinstellung, Gruppenoption (PROJ-76), Anzeigeoptionen.
- [ ] Der Entwurf übernimmt **nicht**: Beitrittscode (neuer wird erzeugt), Zeitfenster (leer), Teilnehmer, Ergebnisse, Fokus-Protokoll, Freigabestatus, Nachteilsausgleich (PROJ-80).
- [ ] Titel wird „<Titel> (Kopie)“ und ist im Editor sofort änderbar; der Nachweis steht als Entwurf in der Liste mit Hinweis „Kopie von …“ (Link zum Original).
- [ ] Wer den Nachweis nicht sehen darf, kann ihn nicht duplizieren (gleiche Rechteprüfung wie beim Ansehen).

### Schwache Fragen markieren und ersetzen
- [ ] Im Editor des kopierten Entwurfs zeigt jede Frage, soweit PROJ-75 vorhanden ist, die Ampel aus dem Original-Durchlauf (Lösungsquote, Trennschärfe) als Chip; rote und gelbe lassen sich per Filter „Nur auffällige“ anzeigen.
- [ ] Je Frage die Aktion „Ersetzen“: bietet bis zu 5 Ersatzfragen mit gleichem Thema und ähnlicher Schwierigkeit (Regeln wie PROJ-78), die nicht schon im Entwurf stehen und nicht gesperrt sind.
- [ ] Sammelaktion „Alle auffälligen ersetzen“ erzeugt für jede auffällige Frage den besten Ersatz und zeigt eine Vorschau, bevor etwas übernommen wird.
- [ ] Ersetzen behält die Position der Frage im Nachweis.
- [ ] Fehlt PROJ-75-Datenbasis (weil das Original nie ausgewertet wurde), zeigt der Editor die Ampel nicht, „Ersetzen“ bleibt manuell möglich.

## Edge Cases
- Frage im Original ist inzwischen gelöscht oder deaktiviert: Platzhalterzeile „Frage nicht mehr verfügbar“ mit sofortigem „Ersetzen“; ein Entwurf mit Platzhalter lässt sich nicht starten.
- Frage wurde seit dem Original geändert (PROJ-47): Chip „Frage geändert seit dem letzten Nachweis“, damit die Ampel nicht blind übernommen wird.
- Kein Ersatz vorhanden (Thema leer gespielt): Hinweis mit Link zum Fragenimport (PROJ-38).
- Original wird nach dem Kopieren gelöscht: Kopie bleibt unabhängig (kein Verweis nötig außer dem Titelhinweis).
- Mehrfaches Duplizieren: Titel zählen hoch („(Kopie 2)“), kein Fehler.
- Duplizieren eines Nachweises aus fremdem Fachbereich (nur Super-Admin oder Inhalte offen nach PROJ-70): Der Entwurf gehört dem Fachbereich der duplizierenden Person, nicht dem Original.

## Technical Requirements
- Performance: Duplizieren unter 1 s, rein serverseitig.
- Security: Rechteprüfung auf dem Original und auf dem Zielbereich; Aktion im Protokoll (wer, wann, Quelle).
- Keine KI, keine laufenden Kosten.

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)

**Ergebnis der Bestandsprüfung:** Vieles ist schon da:
- Anlegen eines Nachweises (`POST /api/admin/assessments`) mit Rechte-, Fragen- und Ablage-Prüfung, neuem Beitrittscode und Protokolleintrag. Das Duplizieren geht denselben Weg, nur mit Werten aus dem Original.
- Ein Entwurf speichert seine Fragen als Liste (`draft_question_ids`), ein gestarteter Nachweis friert sie ein (`question_ids_snapshot`). Beides taugt als Quelle der Kopie.
- Die Fragenanalyse (PROJ-75) mit Ampel, Lösungsquote und Trennschärfe wird bei jedem Aufruf frisch berechnet. Sie liefert die Ampel fürs Original.
- Der Ersatz-Vorschlag (PROJ-78) mit „Tauschen" (gleiches Thema, gleiche Schwierigkeitsstufe) samt Zulässigkeitsregel, Sperren und offenen Meldungen.
- Zusammenstell-Editor (PROJ-27) mit Warn-Chip für gesperrte Fragen.
- Die Sichtbarkeitsregel (Datenbank-Regel aus PROJ-46/70) bestimmt schon, wer einen Nachweis sehen darf.
- **Noch nicht da, daher bewusst ausgeklammert:** Gruppen A/B (PROJ-76) und Nachteilsausgleich (PROJ-80). Beide sind „Planned". Sobald sie gebaut werden, müssen sie in die Liste der übernommenen bzw. nicht übernommenen Felder aufgenommen werden (steht dann in deren Spec).

### A) Bausteine (Oberfläche)
```
Nachweis-Liste (besteht)
+-- Zeilenmenü „…" je Nachweis (neu, falls noch keins)
|   +-- „Duplizieren"  (outline, nie grün)
+-- Entwurf mit Kopie-Hinweis „Kopie von <Titel>" (Link zum Original)

Detailseite des Nachweises (besteht)
+-- Aktionen: „Duplizieren" als outline-Knopf im Menü (neu)
+-- Kopf bei Kopie: Hinweis „Kopie von …" mit Link (neu)

Duplizieren-Dialog (neu, klein)
+-- Titel (vorbelegt „<Titel> (Kopie)", änderbar)
+-- Zielbereich (nur sichtbar, wenn die Person mehrere Bereiche bedienen darf)
+-- Hinweis, was nicht mitkommt (Teilnehmer, Ergebnisse, Zeitfenster, Code neu)
+-- Knopf „Kopie anlegen" → springt direkt in den Entwurf

Zusammenstell-Editor des Entwurfs (besteht, wird ergänzt)
+-- Banner bei Kopie: Quelle + Schalter „Nur auffällige" (neu)
+-- Frage-Zeile (erweitert)
|   +-- Ampel-Chip aus dem Original-Durchlauf (Lösungsquote, Trennschärfe)
|   +-- Chip „Frage geändert seit dem letzten Nachweis"
|   +-- Platzhalter „Frage nicht mehr verfügbar" (rot, mit „Ersetzen")
|   +-- Aktion „Ersetzen" → bis zu 5 Ersatzfragen (gleiches Thema, ähnliche Stufe)
+-- Knopf „Alle auffälligen ersetzen" → Vorschau-Dialog (neu)
|   +-- Tabelle alt → neu je Position, einzeln abwählbar
|   +-- „Übernehmen" / „Abbrechen"
+-- Leerzustand „Kein Ersatz vorhanden" mit Link zum Fragen-Import (besteht)
```
Nur bestehende Bausteine (Dialog, DropdownMenu, Badge, Switch). Der „Starten"-Knopf ist gesperrt, solange ein Platzhalter im Entwurf steht, mit Erklärung.

### B) Daten (in Alltagssprache)
**Eine kleine Ergänzung:** Jeder Nachweis bekommt ein optionales Feld „Kopie von" (Verweis auf das Original). Zusätzlich wird der Titel des Originals zum Zeitpunkt der Kopie mitgespeichert, damit der Hinweis auch nach dem Löschen des Originals lesbar bleibt. Wird das Original gelöscht, wird der Verweis leer, die Kopie bleibt unverändert und zeigt nur noch den Titel ohne Link.

Nicht dauerhaft gespeichert werden Ampel, Ersatzvorschläge und die Vorschau; sie werden bei Bedarf berechnet.

**Was die Kopie übernimmt:** Fragenliste in Reihenfolge, Fachbereich bzw. Zielbereich, Fach/Klasse/Kategorie (Schuljahr: das aktuelle), Dauer, Notenschlüssel, Mischeinstellung, Fokus-Protokoll-Einstellungen, Anzeigeoptionen.
**Was nicht mitkommt:** Beitrittscode (neuer), Zeitfenster (leer), Teilnehmer, Ergebnisse, Fokus-Protokolle, Freigabestatus, ausgenommene Fragen, Status (immer Entwurf).

**Zeitfenster-Besonderheit:** Ein Entwurf hat heute Pflichtwerte für Start und Ende. Da die Spec ein leeres Fenster verlangt, muss die Datenbank „noch kein Fenster" für Entwürfe zulassen, und das Öffnen verlangt dann ein gesetztes Fenster. Das ist die einzige Schema-Änderung mit Auswirkung auf Bestandsstellen. `/backend` prüft, welche Anzeigen davon abhängen (Liste, Druck, Beitritt). Fallback, falls es zu viele sind: Vorbelegung „heute + 7 Tage" mit deutlichem Hinweis „bitte prüfen". Das wäre eine Abweichung von der Spec.

### C) Wie es abläuft
**Duplizieren (rein serverseitig, ohne KI):**
1. Original laden, Sichtbarkeit nach derselben Regel wie beim Ansehen prüfen.
2. Quelle der Fragen: Entwurf = Entwurfsliste, gestartet/geschlossen = eingefrorene Liste.
3. Zielbereich bestimmen (Bereich der duplizierenden Person, nicht automatisch der des Originals) und Rechte dort prüfen.
4. Fragen gegen den Zielbereich prüfen. **Anders als beim normalen Speichern fliegen unzulässige Fragen nicht raus**, sondern bleiben als Platzhalter in der Liste: gelöscht, deaktiviert oder aus fremdem Bereich. So bleibt die Position erhalten und die Lehrkraft sieht, was fehlt.
5. Neuen Code erzeugen, Titel „(Kopie)", bei Wiederholung „(Kopie 2)", „(Kopie 3)". Entwurf anlegen, Protokolleintrag (wer, wann, Quelle, Ziel).

**Markieren (Ampel):** Beim Öffnen des Kopie-Entwurfs wird die Analyse des Originals gelesen, sofern es ausgewertet ist (genug Abgaben, sonst keine Ampel, wie in PROJ-75). Nur Ampelfarbe, Lösungsquote und Trennschärfe pro Frage gehen an den Browser, keine Namen oder Einzelantworten. „Geändert seit dem letzten Nachweis" ergibt sich aus dem Änderungsverlauf der Frage (PROJ-47) im Vergleich zum Durchführungszeitpunkt des Originals.

**Ersetzen:** Wiederverwendung der Auswahl aus PROJ-78: gleiches Thema, nächstliegende Schwierigkeitsstufe, nicht schon im Entwurf, nicht gesperrt, keine offene Meldung, zulässig für den Zielbereich. Bis zu 5 Vorschläge, sortiert nach Nähe zur ursprünglichen Stufe. Der Ersatz steht an derselben Position.
**Alle auffälligen ersetzen:** Für jede rote/gelbe Frage und jeden Platzhalter der beste Ersatz, kein Ersatz doppelt. Erst die Vorschau, dann Übernehmen. Fragen ohne Ersatz bleiben unverändert und werden genannt.
Übernommen wird wie bei jeder Änderung im Editor: Es landet in der normalen Entwurfsliste und läuft durch die bestehende Prüfung beim Speichern.

### D) Technische Entscheidungen (und warum)
- **Eigene kleine Route statt Umbau des Anlegens:** Duplizieren ist ein klarer Vorgang („Quelle → neuer Entwurf"), erlaubt Platzhalter und bleibt vom normalen Anlegen-Weg getrennt, der strenger prüft.
- **Platzhalter statt stillem Entfernen:** Positionen bleiben stabil, nichts verschwindet unbemerkt; der Start-Schutz verhindert einen Nachweis mit Lücken.
- **Ampel live aus dem Original, nicht kopiert:** Keine veralteten Zahlen, kein neues Speicherfeld, derselbe Rechenweg wie in PROJ-75.
- **Ersatz-Logik aus PROJ-78 wiederverwenden:** eine einzige Definition von „passend"; weniger Fehler, weniger Tests.
- **Zielbereich = Bereich der duplizierenden Person:** verhindert, dass Inhalte unbemerkt im fremden Bereich liegen; Fragen, die dort nicht zulässig sind, werden zu Platzhaltern.
- **Kein Verweis nötig nach Löschen des Originals:** Titel-Hinweis reicht, Kopie ist unabhängig.
- **Keine KI, keine Kosten, keine neuen Pakete.**

### E) Abhängigkeiten und Hinweise
- PROJ-75 (Ampel) und PROJ-78 (Ersatz) sind live und werden genutzt. PROJ-76/80 sind noch nicht gebaut: Wenn sie vor oder nach PROJ-79 kommen, übernehmen sie das Feld-Verhalten selbst.
- Voraussetzung: eine kleine Migration (Feld „Kopie von", Titel des Originals, Zeitfenster für Entwürfe optional). Sie muss vor dem Push in Produktion sein.

### F) Pakete
Keine.

## Implementation Notes (Frontend + Backend, 2026-11-09)

**Gebaut:**
- Migration `20261114_proj79_nachweis_kopie.sql` (+ `_down`, Probe `supabase/tests/proj79_nachweis_kopie_probe.sql`): zwei optionale Spalten `copied_from_id` (ON DELETE SET NULL) und `copied_from_title`. **Muss vor dem Push in Produktion sein**, weil die Nachweis-Liste und die Detail-Route die Spalten lesen.
- `POST /api/admin/assessments/[id]/duplicate` – legt den Entwurf an (Fragenliste in Reihenfolge inkl. Platzhalter-IDs, Dauer, Notenschlüssel, Mischen, Fokus-Einstellungen, Klasse/Fach, neuer Code, Titel „(Kopie)“ / „(Kopie 2)“ …). Zielbereich = Bereich der duplizierenden Person (oder ausdrücklich gewählt); bei Bereichswechsel wird der Prüfungsteil neu abgeleitet und das Fach verworfen. Protokoll `graded_assessment.duplicate` mit Quelle.
- `GET …/[id]/copy-review` – Prüfbericht für Kopie-Entwürfe: je Frage Ampel/Quote/Trennschärfe aus dem Original-Durchlauf (nur wenn das Original sichtbar und ausgewertet ist), Chip „geändert seit dem letzten Nachweis“ (Änderungsverlauf PROJ-47 nach dem Start des Originals), Platzhalter. Keine Namen, keine Einzelantworten.
- `POST …/[id]/replace` – `alternatives` (bis zu 5), `bulk` (Vorschau, kein doppelter Ersatz), `apply` (Tausch auf gleicher Position, Platzhalter entfernen, Protokoll `graded_assessment.replace_questions`). Regeln aus PROJ-78 (gleiches Thema, nächstliegende Stufe, nicht gesperrt, ohne offene Meldung, nicht schon im Entwurf). Die gemeinsame Kandidaten-Ladefunktion wurde dafür aus der Vorschlags-Route nach `lib/assessment-candidates.ts` verschoben (Verhalten unverändert).
- Öffnen einer **Kopie** mit nicht mehr verfügbaren Fragen wird serverseitig abgelehnt; der Knopf „Öffnen“ ist dann gesperrt. Normale Nachweise verhalten sich wie bisher.
- Oberfläche: Zeilenmenü „…“ → „Duplizieren“ in der Liste, Hinweis „Kopie von …“ unter dem Titel; Detailseite mit outline-Knopf „Duplizieren“; Prüfkarte `AssessmentCopyReview` (Filter „Nur auffällige“, „Ersetzen“, „Alle auffälligen ersetzen“ mit Vorschau); Dialog `DuplicateAssessmentDialog`.
- Tests: 9 (Titel/Zeitfenster/Platzhalter) + 6 (Ersatzlogik) + 8 (Duplizieren) + 12 (Ersetzen) + 8 (Prüfkarte); Suite 233 Dateien, `tsc` und `npm run build` grün.

**Abweichungen von der Spec:**
1. **Zeitfenster nicht leer:** Die Datenbank verlangt Start und Ende. Die Kopie bekommt „jetzt + 7 Tage“; die Prüfkarte weist ausdrücklich darauf hin. (Vermeidet eine Umstellung von 12 Stellen auf „optional“.)
2. **Ampel in einer eigenen Prüfkarte** über dem Entwurf statt als Chip in der Fragenauswahl (die ist eine ungeordnete Menge ohne Positionen).
3. **Duplizieren** ist auf der Detailseite ein eigener outline-Knopf neben „Löschen“, kein Untermenü; in der Liste im Zeilenmenü.
4. **Kein Bereichs-Auswahlfeld** im Dialog: Ziel ist der Bereich der Person (der Server nimmt optional `departmentId`).
5. „Geändert seit dem letzten Nachweis“ zählt jede Änderung nach dem Start des Originals mit, auch das Sperren aus PROJ-75 (hebt die Version an). Gesperrte Fragen haben zusätzlich ihren eigenen Chip.
6. Ist von einer verschwundenen Frage auch das Thema nicht mehr bekannt, gibt es keinen automatischen Ersatz (Hinweis auf „Fragen bearbeiten“).
7. Gruppen A/B (PROJ-76) und Nachteilsausgleich (PROJ-80) existieren noch nicht und werden nicht berücksichtigt.

## QA Test Results

**Geprüft (2026-11-09, ohne Browser):**
- Alle Akzeptanzkriterien gegen Code und Tests abgeglichen. Offen bleibt nur Abweichung 1 (Zeitfenster) bewusst.
- Sicherheit: Duplizieren, Ersetzen und Prüfbericht laufen mit dem Nutzer-Client, der Zeilenschutz von `graded_assessments` entscheidet (unsichtbar = 404). Der Dienst-Client liest nur die Sitzungen eines Originals, das die Person zuvor selbst sehen durfte, und gibt nur Kennzahlen weiter. Ersatzfragen werden gegen den zulässigen Pool des Zielbereichs geprüft; Tausch mit schon vorhandener Frage wird abgelehnt (400), veraltete Liste führt zu 409.
- Grenzfälle: mehrfaches Duplizieren (Kopie 2/3), Kopie einer Kopie, Titel über 100 Zeichen, Original später gelöscht (Verweis leer, Titel bleibt), Bereichswechsel, Platzhalter, kein Ersatz vorhanden.
- Gesamte Suite grün (ein bekannter, lastabhängiger Zeitüberschreitungs-Test in `users/page.test.tsx` lief beim Einzelaufruf durch).

**Nicht im Browser geprüft:** Zeilenmenü, Dialog, Prüfkarte und Vorschau. Bitte einmal an einem ausgewerteten Nachweis durchklicken.

## Deployment
- 2026-11-09: Migration `20261114_proj79_nachweis_kopie.sql` im SQL-Editor eingespielt, Probe bestanden (T1 = 2, T2 = 0, T3a = true, T3b = NULL/true). Lesend geprüft: beide Spalten vorhanden (uuid/text, nullable), keine Probe-Reste.
- Push von `af70227` auf `main`, Vercel-Production Ready nach 1m. Neue Routen (`duplicate`, `copy-review`, `replace`) ohne Login: 401, keine Fehler in den Production-Logs.
- **Nicht im Browser geprüft:** Zeilenmenü „Duplizieren“, Dialog, Prüfkarte mit Ampel, „Ersetzen“ und „Alle auffälligen ersetzen“ mit Vorschau. Bitte an einem ausgewerteten Nachweis einmal durchklicken.
