# PROJ-74: „Was fällt allen schwer?“ – schwierigste Fragen und Themen

## Status: Deployed
**Created:** 2026-11-07
**Last Updated:** 2026-11-08

## Dependencies
- Requires: PROJ-3 (Quiz-Antworten in `quiz_answers`), PROJ-22 (Fachbereich als Datenbasis), PROJ-12 (Klassenstufe & Thema)
- Requires: PROJ-44 (Lehrkraft-Rolle), PROJ-24 (Rechte), PROJ-40 (Admin-Startseite)
- Optional: PROJ-72/73 — Anzahl Meldungen je Frage als zusätzliche Spalte

## Summary
Eine Auswertung über alle Azubis eines Fachbereichs: Welche Fragen und Themen werden am häufigsten falsch beantwortet? Sie ersetzt die Klassenauswertung, die ohne Klassenzuordnung nicht möglich ist, und gibt Lehrkräften Anhaltspunkte, was im Unterricht noch einmal dran muss. Es werden keine einzelnen Personen gezeigt.

## User Stories
- Als **Lehrkraft** möchte ich wissen, welche Themen den Azubis insgesamt am schwersten fallen, damit ich meinen Unterricht daran ausrichte.
- Als **Lehrkraft** möchte ich die schwächsten Fragen eines Themas sehen, damit ich daraus Beispiele und Übungen mache.
- Als **Lehrkraft** möchte ich schwache Fragen von fehlerhaften Fragen unterscheiden können, damit ich Qualitätsprobleme erkenne.
- Als **Bereichs-Admin** möchte ich die Auswertung auf meinen Fachbereich beschränken.

## Acceptance Criteria

### Ansicht
- [ ] Unter `/admin` gibt es „Schwierigste Fragen“ (Navigation: Auswertung). Sie gilt für den Fachbereich der Lehrkraft; der Super-Admin nutzt den Bereichs-Umschalter.
- [ ] Zwei Reiter: **Themen** (Liste der Themen mit Lösungsquote, Anzahl Antworten, Anzahl Fragen) und **Fragen** (Einzelfragen).
- [ ] Filter: Fach, Klassenstufe (10/11/12/alle), Zeitraum (letzte 30 Tage, 90 Tage, gesamt) und **Mindestanzahl Antworten** (Standard 20). Fragen und Themen unter der Mindestanzahl werden nicht gerankt, sondern mit „zu wenige Antworten“ getrennt aufgeführt.
- [ ] Sortierung standardmäßig nach niedrigster Lösungsquote. Spalten der Fragenliste: Frage (gekürzt, voller Text im `title`), Thema, Lösungsquote, Antworten, meistgewählte falsche Antwort in Prozent, Meldungen (wenn PROJ-72 vorhanden).
- [ ] Ein Klick auf eine Frage öffnet sie im Frage-Editor; ein Klick auf ein Thema filtert die Fragenliste.
- [ ] Eine Ampel trennt „schwer, aber fair“ von „verdächtig“: Fragen, bei denen eine falsche Antwort häufiger gewählt wird als die richtige, werden markiert („Antwort prüfen“).
- [ ] Ein Hinweis erklärt in einem Satz, wie die Quote entsteht (nur Üben, Quiz, Blitzrunde, Lücken schließen; keine benoteten Nachweise).

### Datengrundlage
- [ ] Gezählt werden nur Antworten aus freiem Üben (nicht aus Leistungsnachweisen oder Prüfungssimulation), je Antwort einmal.
- [ ] Mehrfach-Beantwortungen derselben Frage durch denselben Azubi zählen alle mit, aber höchstens die ersten 3 Versuche je Azubi und Frage, damit Dauerübende das Bild nicht verzerren.
- [ ] Die Auswertung enthält **keine** Namen, Konten oder Einzelverläufe.

## Edge Cases
- Neuer Fachbereich oder neue Frage ohne Antworten: leerer Zustand mit Erklärung („Sobald Azubis üben, erscheinen hier Auswertungen“).
- Sehr wenige Azubis im Fachbereich (z. B. 5): Die Mindestanzahl Antworten kann auf 5 gesenkt werden; ein Hinweis nennt, dass kleine Zahlen schwanken.
- Frage wurde kürzlich geändert (PROJ-47): Antworten vor der Änderung werden mit „Frage seit … geändert“ gekennzeichnet, weil die Quote nicht mehr vergleichbar sein kann.
- Frage ohne Thema: erscheint unter „Ohne Thema“.
- Sehr große Antwortmengen: Auswertung läuft serverseitig aggregiert (View oder Funktion), nie durch Laden aller Antworten im Browser.
- Lehrkraft ohne Fachbereich (PROJ-46): sieht alle Fachbereiche lesend, weil Inhalte offen sind (PROJ-70).

## Technical Requirements
- Performance: Ranking-Abfrage unter 1 s bei 100 000 Antworten (aggregiert und indiziert).
- Security: Nur Lehrkräfte/Admins; keine personenbezogenen Daten in der Antwort.
- Keine KI, keine laufenden Kosten.

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)

**Stand:** 2026-11-08 (Design freigegeben, siehe Umsetzung unten)

### Ausgangslage (geprüft)
- Jede Antwort im freien Üben (Quiz, Blitzrunde, Lücken schließen) wird bereits einzeln gespeichert: welche Frage, richtig/falsch, welche Antwort gewählt, wann. Die Daten sind also vorhanden — **es muss nichts Neues erfasst werden**.
- Leistungsnachweise und Prüfungssimulation speichern ihre Antworten an anderer Stelle. Die Regel „nur freies Üben“ ist damit von selbst erfüllt, es braucht keine Markierung an den Antworten.
- Heute gibt es nur eine Einzel-Statistik je Frage (im Frage-Editor). Eine Auswertung über alle Fragen fehlt.

### A) Seitenaufbau
```
/admin/schwierigste-fragen  (neue Seite, Navigation: Mein Unterricht → „Schwierigste Fragen“)
+-- Seitenkopf (Titel, ein Satz Beschreibung)
+-- Hinweis-Zeile: „So entsteht die Quote …“ (nur Üben, keine Nachweise)
+-- Filterleiste
|   +-- Fach
|   +-- Klassenstufe (10 / 11 / 12 / alle)
|   +-- Zeitraum (30 Tage / 90 Tage / gesamt)
|   +-- Mindestanzahl Antworten (Standard 20)
+-- Reiter „Themen“
|   +-- Tabelle: Thema | Lösungsquote (Balken) | Antworten | Fragen
|   +-- Klick auf Thema → wechselt zu „Fragen“, gefiltert auf dieses Thema
|   +-- Abschnitt „Zu wenige Antworten“ (getrennt, nicht gerankt)
+-- Reiter „Fragen“
|   +-- Tabelle: Frage (gekürzt) | Thema | Lösungsquote | Antworten
|   |            | häufigste falsche Antwort in % | Meldungen | Ampel
|   +-- Ampel: „Antwort prüfen“, wenn eine falsche Antwort häufiger
|   |   gewählt wird als die richtige
|   +-- Klick auf Frage → Frage-Editor
|   +-- Abschnitt „Zu wenige Antworten“
+-- Leerzustand („Sobald Azubis üben, erscheinen hier Auswertungen“)
+-- Ladezustand / Fehlerzustand (die bestehenden Admin-Bausteine)
```
Gebaut aus vorhandenen Bausteinen: Seitenkopf, Tabs, Tabelle mit Scroll-Rahmen, Auswahlfelder, Lade-/Leer-/Fehlerzustand, Fortschrittsbalken. Keine neuen Basis-Komponenten.

### B) Daten (Klartext)
Es wird **nichts Neues gespeichert**. Die Auswertung ist eine Berechnung über die vorhandenen Antworten:
- Je Frage: Anzahl Antworten, Anzahl richtig, Lösungsquote, häufigste falsche Antwort mit Anteil.
- Je Thema: dasselbe, zusammengefasst über alle Fragen des Themas.
- Gezählt werden je Azubi und Frage nur die **ersten 3 Versuche**, damit Dauerübende nichts verzerren.
- Das Ergebnis enthält nur Zahlen je Frage/Thema, **keine Namen, keine Konten, keine Einzelverläufe**. Die Zuordnung zu Personen verlässt die Datenbank nie.
- Fachbereich: Nur Fragen des eigenen Fachbereichs (Super-Admin: über den Bereichs-Umschalter). Lehrkräfte ohne Fachbereich sehen alle Bereiche lesend (PROJ-70).
- „Meldungen“: Anzahl offener Meldungen je Frage aus PROJ-72 (vorhanden, deployt). Bleibt leer, wo keine Meldung vorliegt.

### C) Technische Entscheidungen (mit Begründung)
1. **Berechnung in der Datenbank, nicht im Browser.** Bei vielen tausend Antworten wäre Laden und Zählen im Browser langsam und würde Einzeldaten übertragen. Die Datenbank liefert nur die fertigen Zeilen („Frage X: 41 % bei 63 Antworten“). Das erfüllt zugleich die Vorgabe „unter 1 Sekunde“ und „keine personenbezogenen Daten in der Antwort“.
2. **Eine Datenbank-Funktion statt offener Tabellenabfrage.** Normale Lehrkräfte dürfen die Rohantworten der Azubis nicht lesen (Datenschutz). Eine geschützte Funktion darf zählen, gibt aber nur Summen heraus und prüft selbst, dass nur Lehrkräfte/Admins sie aufrufen und nur den erlaubten Fachbereich sehen. Gleiche Technik wie bei den bisherigen Auswertungen.
3. **Mindestanzahl wird in der Anzeige angewendet, nicht beim Zählen.** Die Funktion liefert alle Zeilen; die Seite trennt „gerankt“ und „zu wenige Antworten“. So lässt sich die Schwelle ohne neue Abfrage ändern. Die Schwelle darf bis 5 gesenkt werden, mit Hinweis „kleine Zahlen schwanken“.
4. **Eine Seite mit zwei Reitern, Daten einmal geladen.** Themen-Reiter und Fragen-Reiter nutzen dieselbe Antwort; ein Klick auf ein Thema filtert nur lokal.
5. **„Frage seit … geändert“ (PROJ-47):** Liegt für eine Frage eine Änderung im Verlauf vor, die jünger ist als ein Teil der Antworten, erscheint der Hinweis an der Zeile. Die Quote wird trotzdem gezeigt (nicht verfälscht), nur gekennzeichnet.
6. **Keine KI, keine Kosten, kein Zwischenspeicher.** Die Zahl der Antworten bleibt überschaubar; falls die Abfrage später zu langsam wird, kann eine vorberechnete Zusammenfassung nachgerüstet werden — jetzt unnötig.
7. **Navigation:** Eintrag in „Mein Unterricht“, sichtbar für Lehrkräfte, Bereichs-Admins und Super-Admin. Die Rechteprüfung bleibt serverseitig.

### D) Wirkung auf andere Features
- **PROJ-73 (Meldungs-Inbox):** Die leere Spalte „Lösungsquote“ wird mit denselben Zahlen gefüllt.
- **PROJ-78 (Nachweis-Vorschlag):** Kann die Schwierigkeit künftig aus diesen Quoten ableiten.
- Keine Änderung am Üben, an Punkten, Serien oder an Azubi-Seiten.

### E) Neue Pakete
Keine.

### F) Umfang für den Bau
- `/backend`: eine Datenbank-Funktion (Migration + Rückgängig-Datei + Probe-Skript) und eine Abfrage-Route für Lehrkräfte.
- `/frontend`: Seite mit Filtern, zwei Reitern, Ampel, Navigationseintrag.
- Reihenfolge: erst Backend (Zahlen prüfen), dann Frontend.

### Offene Punkte
- Keine fachlichen. Annahme: Die „3 Versuche“-Regel zählt über den gewählten Zeitraum hinweg (die ersten 3 Versuche im Zeitraum).

## Umsetzung (2026-11-08)
- Migration `20261113_proj74_schwierigste_fragen.sql`: Funktion `question_difficulty_stats(Bereiche, Klassenstufe, Tage, Fach)` (SECURITY DEFINER, nur Lehrer-Rollen, anon/PUBLIC entzogen) und Index auf `quiz_answers (question_id, answered_at)`. Rückweg: `_down.sql`. Probe: `supabase/tests/proj74_schwierigste_fragen_probe.sql`.
- Route `GET /api/admin/schwierigste-fragen` (Bereich folgt der Bereichsleiste, Filter Klassenstufe 10/11/12 und Zeitraum 30/90 Tage, Zod-geprüft; nur Fragen mit Antworten, Text auf 200 Zeichen gekürzt).
- Rechenlogik `src/lib/difficulty.ts` (Ranking, Themen-Zusammenfassung, Ampel, „geändert seit“). Seite `/admin/schwierigste-fragen`, Komponente `difficult-questions.tsx`, Navigationseintrag unter „Inhalte“ (nicht „Mein Unterricht“, weil die Bereichsleiste dort automatisch erscheint).
- Abweichungen vom Design: Fach, Thema und Mindestanzahl (5/10/20/50) wirken im Browser, Klassenstufe und Zeitraum auf dem Server. Der Klick auf eine Frage öffnet die Fragenliste mit Suchtext (wie in der Meldungs-Inbox), nicht direkt den Editor.
- Tests: 6 Rechenlogik, 4 Route, 4 Komponente; Gesamtlauf 2627 grün, Build grün. Datenbank-Rechenkern gegen Produktion lesend geprüft (7673 Übungsfragen, 2532 mit Antworten).

## QA Test Results
Selbstprüfung 2026-11-08: Rechenlogik, Route und Komponente getestet (2627 Tests grün), Build grün, Rechte der Funktion in Produktion geprüft (anon nein, angemeldet ja, SECURITY DEFINER). Die Datenbank-Probe wurde nach der Migration nicht erneut ausgeführt; Browserprüfung eingeloggt steht aus.

## Deployment
2026-11-08: Migration vom Nutzer im SQL-Editor eingespielt (erster Versuch landete nicht im richtigen Projekt, zweiter wirkte), Push 064d888, Vercel Ready, API ohne Login 401, Seite leitet auf Login um, keine Fehler in den Logs.
