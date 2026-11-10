# PROJ-84: Nachweis-Detailseite aufräumen

## Status: Planned
**Created:** 2026-11-10
**Last Updated:** 2026-11-10

## Hintergrund
Teil der Reihe „professionelle Arbeitsfläche“ nach dem LimeSurvey-Vorbild (siehe PROJ-83). Die Detailseite eines Leistungsnachweises (`/admin/leistungsnachweise/[id]`) ist die vollste Seite im Lehrkräfte-Bereich:

- Im Entwurf stehen im Seitenkopf bis zu **fünf** Aktionen nebeneinander (Öffnen, Fragen bearbeiten, Zielbereich ändern, Duplizieren, Löschen), dazu „Drucken & Export“ in den anderen Status. „Löschen“ liegt als roter Knopf direkt neben harmlosen Aktionen.
- Die Karte **„Ablage“** (Schuljahr, Klasse, Fach, Knopf „Ablage speichern“) ist ein offenes Formular, obwohl sie nur selten geändert wird und „nichts an der Prüfung ändert“. Sie nimmt viel Platz vor der eigentlichen Auswertung.
- Beitrittscode und Live-Zahlen (Beigetreten / Schreiben / Abgegeben) stecken in einer Karte mit uneinheitlicher Zahlendarstellung.
- Gruppen A/B und Fokus-Protokoll sind weitere Karten zwischen Kopf und Auswertung.

Ziel: Die Seite zeigt zuerst, was gerade zu tun ist, und dann die Auswertung. Selten Geänderte Einstellungen werden ruhig dargestellt.

**Bewusst nicht Teil von PROJ-84:**
- Änderungen an Rechten, Status-Ablauf oder Prüfungslogik
- die Tabs und ihre Inhalte (Teilnehmer / Notenspiegel / Fragenanalyse)
- Gruppen-A/B-Karte und Fokus-Einstellungen (bleiben inhaltlich unverändert)
- der Inhalts-Baum (PROJ-85)
- die Schülerseite

## Dependencies
- Requires: PROJ-83 (`AdminRowActions`-Muster, `AdminTabs*`, Regeln „eine grüne Hauptaktion“)
- Requires: PROJ-39 (Ablage: Felder, Speicher-Schnittstelle)
- Requires: PROJ-76, PROJ-79, PROJ-30 (Karten, die ihre Funktion behalten)
- Rechte aus PROJ-24, PROJ-44, PROJ-46 und PROJ-70 bleiben unverändert

## User Stories
- Als Lehrkraft möchte ich im Seitenkopf nur die eine Aktion sehen, die als Nächstes dran ist, damit ich nicht zwischen fünf Knöpfen suchen muss.
- Als Lehrkraft möchte ich „Löschen“ nicht neben harmlosen Aktionen als roten Knopf sehen, damit ich nicht versehentlich einen Nachweis lösche.
- Als Lehrkraft möchte ich Schuljahr, Klasse und Fach als ruhige Zeile sehen und nur bei Bedarf ändern, damit die Seite nicht mit einem Formular beginnt.
- Als Lehrkraft möchte ich während der Prüfung auf einen Blick sehen, wie viele beigetreten sind, schreiben und abgegeben haben.
- Als Lehrkraft am Handy möchte ich alle Aktionen erreichen, ohne dass der Kopf mehrere Zeilen füllt.

## Acceptance Criteria

### A) Seitenkopf: eine Hauptaktion plus Menü
- [ ] Der Seitenkopf zeigt rechts höchstens **eine gefüllte grüne Hauptaktion** je Status: Entwurf = „Öffnen“, Offen = „Beitritt schließen“, Geschlossen ohne Freigabe = „Ergebnisse freigeben“. Geschlossen mit Freigabe: keine Hauptaktion.
- [ ] Daneben steht (außer im Entwurf) „Drucken & Export“ als Outline-Knopf mit dem bisherigen Inhalt. Der Inhalt des Export-Menüs ändert sich nicht.
- [ ] Alle übrigen Aktionen stehen in einem `⋯`-Menü (Knopf mit `aria-label`, mindestens 44 × 44 px, Escape schließt): **Fragen bearbeiten** (nur Entwurf), **Zielbereich ändern** (nur Entwurf), **Duplizieren**, und ganz unten getrennt in Rot **Löschen**.
- [ ] „Löschen“ fragt wie bisher erst im Bestätigungsdialog nach; es löscht nie direkt aus dem Menü.
- [ ] Die Einträge sind nur sichtbar, wenn die Lehrkraft die Aktion heute auch sehen darf. Ein leeres Menü gibt es nicht.
- [ ] Die Bedingungen der Hauptaktionen bleiben: „Öffnen“ ist gesperrt, solange Fragen nicht mehr verfügbar sind (mit Hinweis im `title`); „Ergebnisse freigeben“ ist gesperrt ohne aktive Teilnehmer.
- [ ] Auf dem Handy (430 px) passt der Kopf in höchstens eine Aktionszeile unter dem Titel; nichts ist abgeschnitten.

### B) Ablage als Info-Zeile
- [ ] Die Karte „Ablage“ zeigt Schuljahr, Klasse und Fach als **lesbare Zeile** (z. B. „2026/27 · Klasse 11a · Spedition“). Fehlende Werte erscheinen als „Keine Klasse“ / „Kein Fach“, nicht als leere Stellen.
- [ ] Rechts steht ein Bearbeiten-Symbol („Ablage ändern“, `aria-label`, 44 px). Es öffnet einen Dialog mit denselben Feldern wie bisher (`AssessmentCategoryFields`) und den Knöpfen „Speichern“ (grün) und „Abbrechen“.
- [ ] Der Dialog speichert über dieselbe Schnittstelle wie heute; nach Erfolg erscheint ein Toast („Ablage gespeichert“), der Dialog schließt, die Zeile zeigt die neuen Werte.
- [ ] „Speichern“ ist gesperrt, solange nichts geändert wurde. Bei einem Fehler bleibt der Dialog offen und zeigt die Fehlermeldung.
- [ ] Die Ablage bleibt in **jedem Status** änderbar. Der Hinweis „ändert nichts am Zugang oder an der Prüfung“ steht im Dialog, nicht mehr dauerhaft auf der Seite.
- [ ] Der Dialog ist per Tastatur bedienbar, der Fokus kehrt zum Bearbeiten-Symbol zurück.

### C) Beitritt und Live-Stand
- [ ] **Entwurf und Offen:** Die Beitrittskarte mit QR-Code, Beitrittscode und „Link kopieren“ bleibt. Im Entwurf steht weiter der Hinweis, dass Beitreten erst nach dem Öffnen geht.
- [ ] **Geschlossen:** Keine QR-/Code-Karte mehr, stattdessen nur die schlanke Zahlenzeile.
- [ ] Die Live-Zahlen (Beigetreten / Schreiben / Abgegeben) erscheinen im Status Offen und Geschlossen als **drei gleich gestaltete Kennzahl-Kacheln** (Zahl groß, Beschriftung klein); im Entwurf gibt es sie nicht.
- [ ] Der QR-Code behält seinen weißen Papier-Hintergrund (Ausnahme laut Design-Regel).
- [ ] Zahlen erscheinen erst nach dem Laden; bis dahin „Wird geladen …“, nie „0“.

### D) Reihenfolge und Ruhe
- [ ] Reihenfolge von oben nach unten: Seitenkopf → Ablage-Zeile → Beitritt/Live-Stand → Prüfkarte der Kopie (PROJ-79, falls vorhanden) → Gruppen-A/B → Fokus-Protokoll → Auswertungs-Tabs.
- [ ] Gruppen-A/B-Karte, Fokus-Einstellungen und Prüfkarte der Kopie funktionieren unverändert.
- [ ] Es gibt auf der Seite höchstens eine gefüllte grüne Hauptaktion (Dialog-Knöpfe ausgenommen).

### E) Qualität
- [ ] Nur `ws-*`-Tokens, in hellem und dunklem Modus korrekt; Kontrast ≥ 4,5 : 1 (`workspace-theme.test.ts` besteht).
- [ ] Icons werden als fertiges Element an Client-Komponenten übergeben, nie als Funktion (Server/Client-Grenze).
- [ ] Tests: Menü zeigt je Status nur erlaubte Einträge; Löschen verlangt Bestätigung; Ablage-Dialog speichert nur bei Änderung und zeigt neue Werte; Zahlen erscheinen nicht vor dem Laden.
- [ ] Die Schülerseite ändert sich nicht.

## Edge Cases
- Nachweis ohne Klasse oder ohne Fach (Lehrkraft ohne Fachbereich, PROJ-46) → Zeile zeigt „Keine Klasse“ / „Kein Fach“, Dialog erlaubt weiter das Setzen.
- Speichern der Ablage schlägt fehl (Netzwerk, Rechte) → Dialog bleibt offen, Eingaben bleiben erhalten, verständliche Meldung.
- Der Server vereinheitlicht die Schreibweise der Klasse (z. B. „11A“ → „11a“) → die Zeile zeigt den vom Server gespeicherten Wert.
- Entwurf mit nicht mehr verfügbaren Fragen → „Öffnen“ gesperrt mit Hinweis; „Fragen bearbeiten“ im Menü bleibt erreichbar.
- Geschlossener, freigegebener Nachweis → keine Hauptaktion im Kopf, „Drucken & Export“ und `⋯` bleiben.
- Löschen eines Nachweises mit Abgaben → Bestätigungsdialog wie heute, keine neue Logik.
- Sehr langer Titel oder langer Fachname → gekürzt mit „…“, voller Text im `title`.
- Lehrkraft fremder Bereich / nur Leserechte → Menü zeigt nur die erlaubten Aktionen.

## Tech-Design (kurz)
Reine Oberflächen-Änderung, kein Backend, keine Migration, keine neuen Schnittstellen.
- Seitenkopf: vorhandener `AdminRowActions` (PROJ-83) ohne Stift-Symbol als ⋯-Menü; Icons als fertige Elemente.
- Ablage: `AssessmentCategoryCard` behält Props und Speicher-Schnittstelle, zeigt Zeile + `Dialog` mit `AssessmentCategoryFields`.
- Kennzahlen: drei Kacheln inline in der Seite; QR/Code-Karte nur bei Entwurf/Offen.

## Umsetzung (2026-11-10)
- `page.tsx`: Hauptaktion je Status grün (auch „Beitritt schließen“, vorher orange), „Fragen bearbeiten“, „Zielbereich ändern“, „Duplizieren“, „Löschen“ im ⋯-Menü; Ablage-Zeile steht jetzt direkt unter dem Kopf; Live-Zahlen als Kacheln; im Status Geschlossen ohne Kartenrahmen.
- `assessment-category-card.tsx`: Info-Zeile („2026/27 · Keine Klasse · Kein Fach“), Dialog „Ablage ändern“ (Speichern nur bei Änderung, bleibt bei Fehler offen, Eingaben bleiben).
- Tests: `page.test.tsx` neu (5), `assessment-category-card.test.tsx` angepasst (8). Gesamt: 2779 Tests grün, `tsc` ohne neue Fehler, `npm run build` erfolgreich.
- Abweichung: Der Hinweis „Beitreten geht erst nach dem Öffnen“ bleibt in der Beitrittskarte des Entwurfs. Die Fach-Anzeige in der Ablage-Zeile fällt auf „Fach“ zurück, falls das Fach nicht in der Auswahlliste steht.

## QA (statisch, kein Dev-Server wegen Absturzgefahr)
- A) Kopf: je Status genau eine grüne Hauptaktion; Menüeinträge nach Status getestet; Löschen verlangt Dialog (getestet). ✔
- B) Ablage: Zeile, Dialog, Fehlerfall, Server-Schreibweise getestet. ✔
- C) Kacheln/Code-Karte nach Status getestet. ✔ „Zahlen erst nach dem Laden“: Seite zeigt bis dahin Skeleton, nie Nullen. ✔
- E) Nur `ws-*`-Tokens, keine festen Farben außer QR-Papierhintergrund. ✔
- Offen: Sichtprüfung auf dem Handy (430 px) in der Live-App.
- Keine kritischen oder hohen Fehler gefunden.
