# PROJ-108: Baukasten – Blöcke und Themen aus eigenen Materialien & Regal übernehmen

## Status: In Progress
**Created:** 2026-11-16
**Last Updated:** 2026-11-17

## Idee in einem Satz
Im Baukasten öffnet „Aus Material übernehmen“ eine Auswahl der eigenen Materialien und des Regals des Kollegiums. Dort sieht man Themen und Blöcke als Vorschau und holt einzelne davon mit einem Klick an die gewünschte Stelle.

Teil der Reihe „Baukasten direkt“, Übersicht und Leitbild in PROJ-101. Schon in PROJ-89 als „später: Themen aus anderen Materialien oder dem Regal übernehmen“ vorgemerkt.

## Entscheidungen (Nutzer, 2026-11-16)
- **E1:** Übernehmen aus eigenen Materialien und aus dem Regal gehört in den Umfang.

## Dependencies
- Requires: PROJ-102 (Einfüge-Logik für Blöcke mit Bildern, Kopie der Bilder, 8-MB-Prüfung), PROJ-52 (Meine Materialien), PROJ-53 (Regal)
- Berührt: PROJ-101 (Leerzustände bieten „Aus Material übernehmen“ an), PROJ-47/70 (Protokoll: Übernahme aus dem Regal ist eine Kopie, das Original bleibt unberührt)

## User Stories
- Als **Lehrkraft** möchte ich ein gutes Thema aus meinem alten Material in das neue holen, ohne es neu zu bauen.
- Als **Lehrkraft** möchte ich im Regal eine passende Aufgabe einer Kollegin finden und in mein Material übernehmen.
- Als **Lehrkraft** möchte ich vorher sehen, wie der Block aussieht, bevor ich ihn übernehme.
- Als **Lehrkraft** möchte ich mehrere Blöcke aus einem Material in einem Rutsch übernehmen.

## Acceptance Criteria
- [ ] „Aus Material übernehmen“ steht im Katalog (eigener Reiter), im „+“-Menü der Einfügestellen, in den Leerzuständen und im Editor-„⋯“-Menü.
- [ ] Der Dialog hat zwei Reiter „Meine Materialien“ und „Regal“ (`AdminTabs`), eine Suche nach Titel und einen Filter nach Werkzeug.
- [ ] Angezeigt werden nur Materialien im Format Interaktive Seite (die der Baukasten bearbeiten kann).
- [ ] Nach Wahl eines Materials zeigt der Dialog seine Gliederung (Themen mit Blöcken) und rechts eine Vorschau des angeklickten Themas oder Blocks.
- [ ] Ganze Themen und einzelne Blöcke sind per Kontrollkästchen wählbar, auch gemischt aus mehreren Themen.
- [ ] „N übernehmen“ fügt die Auswahl an der Stelle ein, von der der Dialog geöffnet wurde (Blöcke hinter dem gewählten Block, Themen hinter dem aktuellen Thema). Ein Hinweis bestätigt das, und die Übernahme ist ein Schritt für Rückgängig.
- [ ] Bilder werden in die Ablage des eigenen Kontos kopiert. Die 8-MB-Grenze und die 2-GB-Grenze des Kontos werden vorher geprüft, mit klarer Meldung.
- [ ] Übernommene Inhalte sind eine unabhängige Kopie. Spätere Änderungen am Quell-Material wirken nicht nach, und umgekehrt.
- [ ] Bei Übernahme aus dem Regal wird die Quelle („aus: Titel, Lehrkraft“) im Änderungsverlauf vermerkt.
- [ ] Leere Zustände: keine eigenen Materialien bzw. nichts im Regal, mit einem Satz und dem Hinweis auf die Werkzeuge.

## Edge Cases
- **Quell-Material in einem anderen Werkzeug** (Arbeitsblatt statt Kreative Einheit): Übernommen werden alle Blöcke, die der Ziel-Typ kennt. Der Rest wird mit Hinweis ausgelassen (wie PROJ-102).
- **Lernzielkontrolle der Quelle:** Ihre Fragen lassen sich als einzelne Aufgaben übernehmen, nicht als zweite Lernzielkontrolle.
- **Bilder der Quelle nicht mehr erreichbar** (Skript entfernt, Bild-Auszug fehlt): Der Block kommt mit Platzhalter „Bild nicht gefunden“, mit Hinweis.
- **Regal-Material wurde zurückgezogen**, während der Dialog offen ist: Übernehmen schlägt mit verständlicher Meldung fehl, und nichts wird halb eingefügt.
- **Sehr großes Quell-Material:** Die Gliederung lädt schnell, die Vorschau wird erst beim Anklicken gebaut.
- **Schreibgeschütztes Ziel:** Der Menüpunkt fehlt.

## Nicht Teil dieses Features
- Verknüpfte Inhalte, die sich mit der Quelle mitändern.
- Übernehmen aus H5P- oder Word-Materialien.

## Technical Requirements
- Sicherheit: Nur Materialien, die die Lehrkraft lesen darf (eigene und freigegebene Regal-Materialien). Die Server-Prüfung erfolgt beim Übernehmen, nicht nur im Dialog.
- Performance: Dialog und Gliederung laden in unter 1 s bei 50 Materialien.

## Offene Punkte für `/architecture`
- Neue Lehrkraft-API braucht Einträge in beiden Proxy-Freigabelisten (`roles.ts`, siehe Memory „Lehrkraft-Freigabelisten“).
- Vorschau eines fremden Themas: Bau über den Kern oder Ausschnitt aus der gespeicherten Seite?

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)
**Erstellt:** 2026-11-17 (Sonnet). Baut auf G1 und G2 aus PROJ-102 auf: *Die Seite meldet nur Marken, die App liest Inhalte selbst. Alles Einsetzen läuft durch eine zentrale Funktion mit einem Rückgängig-Schritt.*

### Ausgangslage (Bestand, geprüft)
- **Einsetzen** gibt es schon als zentrale Funktion (PROJ-102): Blöcke an eine Stelle setzen, neue Kennungen, ein Rückgängig-Schritt, Typen filtern, die der Ziel-Typ nicht kennt („N ausgelassen“).
- **Bilder zwischen Materialien** kopiert seit PROJ-102 ein Server-Weg: erst lesen, dann Anzahl und 8-MB-Grenze prüfen, dann schreiben, bei Fehler aufräumen. Er gilt bisher nur zwischen **eigenen** Materialien und bekommt die Bildnamen vom Browser.
- **Regal:** Eine Datenbankfunktion (`regal_anpassen_quelle`) gibt einer Lehrkraft, die das Regal-Material sehen darf, die veröffentlichte Fassung heraus, nie Skript oder Prompt. Der Bilder-Auszug des Materials liegt im Speicher. Die Sichtbarkeit entscheidet allein die Datenbank.
- **Eigene Materialien:** Der Editor liest den Entwurf, sonst die veröffentlichte Fassung (der Kern übersetzt sie in die Struktur).
- **Vorschau:** Der Kern baut eine Seite aus einer Struktur (so heute der Editor).
- **Katalog:** Der Aufgabentyp-Katalog (PROJ-90) und die Einfügestelle-Regel (PROJ-97) sind fertig. „Aus Material übernehmen“ nutzt dieselbe Regel für das Ziel.

### Antworten auf die offenen Punkte
**1. Vorschau eines fremden Themas: Bau über den Kern, mit einer Mini-Seite.**
Die App stellt aus der Quelle eine kleine Struktur zusammen (Deckblatt plus nur das angeklickte Thema oder der angeklickte Block) und lässt den Kern daraus eine Seite bauen, wie beim Editor. Ein Ausschnitt aus einer gespeicherten Seite geht nicht: Regal-Material hat keine gespeicherte Seite mit Marken, und eigene Entwürfe sind nur Struktur. Die Mini-Seite wird erst beim Anklicken gebaut (Spec: „Vorschau erst beim Anklicken“). Sie landet als kurzlebige Datei im Ordner des **Ziel-Materials** (wird bei jeder Vorschau überschrieben) und kommt als Leseadresse zurück, nie im Antwortkörper.

**2. Proxy-Freigabelisten:** Die neuen Wege liegen unter dem bestehenden Editor-Pfad des Ziel-Materials. Beim Bau wird in beiden Listen (`roles.ts`) geprüft, ob das Präfix sie schon abdeckt, sonst werden sie eingetragen. Die Wächter-Tests zeigen es sofort.

### G1 gilt auch hier: Der Browser nennt nur Verweise, nie Inhalte
Der Dialog sendet: **Quelle** (eigenes Material oder Regal-Eintrag) und **Auswahl** (Nummern von Themen und Blöcken). Welche Inhalte das sind, liest der **Server** selbst aus der Quelle. So kann niemand Fremdinhalt einschleusen oder Bildnamen fremder Materialien vorgeben. Das ist strenger als die Zwischenablage in PROJ-102, wo der Browser die Bildnamen nennt.

### A) Aufbau (was die Lehrkraft sieht)
```
Baukasten-Editor
+-- Katalog (bestehend)
|   +-- NEU: Reiter „Aus Material übernehmen“ (öffnet den Übernehmen-Dialog)
+-- „+“-Menü der Einfügestellen, Leerzustände, ⋯-Menü: NEU Eintrag „Aus Material übernehmen“
|   (bei Schreibschutz fehlt er)
+-- NEU: Übernehmen-Dialog (Laptop: zwei Spalten; Handy: Liste → Gliederung → Vorschau, ein Schritt nach dem anderen)
    +-- Reiter „Meine Materialien“ | „Regal“   (AdminTabs)
    |   +-- Suche nach Titel, Filter nach Werkzeug
    |   +-- Liste der Materialien (nur Interaktive Seite wählbar, Rest ausgegraut mit Grund)
    |   +-- Leerzustand mit einem Satz + Hinweis auf die Werkzeuge
    +-- Gliederung des gewählten Materials
    |   +-- Thema (Kontrollkästchen) → Blöcke (Kontrollkästchen), gemischt wählbar
    |   +-- Lernzielkontrolle: ihre Fragen einzeln wählbar (als normale Aufgaben)
    +-- Vorschau des angeklickten Themas oder Blocks (erst beim Klick gebaut)
    +-- Fußzeile: „N übernehmen“ · „Abbrechen“ · Hinweise (ausgelassen, Bild fehlt, zu groß)
```
**Wohin kommt es?** Wie bei jedem neuen Block (PROJ-97): Block gewählt → dahinter, Thema gewählt → am Ende des Themas, sonst am Ende des letzten Themas. Wurde der Dialog aus einem „+“ in der Vorschau geöffnet, gilt diese Stelle. **Ganze Themen** kommen als neue Themen hinter das aktuelle Thema. **Blöcke** kommen als Block-Folge an die Stelle.
Danach: kurzer Hinweis „3 Blöcke übernommen“, die eingefügten Blöcke sind gewählt, ein Schritt für Rückgängig.

### B) Daten
- **Keine Datenbank-Änderung, keine neue Tabelle, kein neues Dateiformat, keine neuen Pakete.**
- **Liste der Quellen:** Die bestehenden Listen „Meine Materialien“ und „Regal“ werden wiederverwendet (Suche, Werkzeugfilter, Seiten sind schon da). Die Regal-Liste bleibt schmal (nie Inhalt).
- **Gliederung einer Quelle (neu, nur lesend):** Themen-Titel und je Block Typ und Kurzzeile, keine Bilder, keine Lösungen im Klartext. Wird einmal geladen und im Dialog gehalten.
- **Übernehmen (neu):** Der Server nimmt Quelle und Auswahl, liest die Inhalte, filtert nicht passende Typen, kopiert die Bilder in die Ablage des Ziels (neue Namen) und gibt die fertigen Blöcke zurück. Die App setzt sie mit der zentralen Einsetzen-Funktion ein.
- **Herkunftsvermerk:** Bei Regal-Quellen „aus: Titel, Lehrkraft“. Wo er im Änderungsverlauf (PROJ-47/70) landet, wird beim Bau geprüft: Der Verlauf speichert den ganzen Entwurf, es gibt noch keinen Platz für eine Notiz je Schritt. Falls nötig reicht ein einfacher Text am nächsten Speichern. Das ist die einzige offene Stelle (siehe unten).

### C) Server-Wege (drei neue, alle nur lesend außer dem letzten)
| Weg | Zweck | Prüfung |
|---|---|---|
| Gliederung der Quelle | Themen und Blöcke für den Dialog | Eigene Quelle: gehört sie mir? Regal: darf ich sie sehen (Datenbank-Funktion)? |
| Vorschau der Auswahl | Mini-Seite bauen, Leseadresse zurück | wie oben, plus Ziel gehört mir |
| Übernehmen | Blöcke lesen, Bilder kopieren, Blöcke zurückgeben | wie oben, plus Platz- und Anzahlgrenze **vor** dem Schreiben |

Der Bilder-Teil von PROJ-102 wird zu einer gemeinsamen Hilfsfunktion, die nicht mehr die Bildnamen aus dem Browser annimmt, sondern die der gelesenen Blöcke. Quelle der Bilder: bei eigenen Materialien die Einlesung oder der eigene Ordner, bei Regal-Material der **Bilder-Auszug** (nie das Skript). Eigene Bilder des Urhebers liegen in dessen Ordner. Sie werden nur gelesen, wenn ein **sichtbarer, veröffentlichter Block** sie nennt.

### D) Technische Entscheidungen (begründet)
| Entscheidung | Warum |
|---|---|
| Server liest die Inhalte der Quelle selbst | Der Browser kann keine fremden Dateien oder Inhalte vorgeben. Die Prüfung „darf ich das sehen“ steht an **einer** Stelle, nicht im Dialog. |
| Regal-Material: veröffentlichte Fassung, nie der Entwurf | Ein halbfertiger Entwurf einer Kollegin soll nicht herauskommen. Das Regal zeigt auch sonst nur die fertige Fassung (PROJ-53). |
| Eigenes Material: Entwurf vor Veröffentlichung | Wie im Editor. Wer an seinem Material arbeitet, will den letzten Stand holen. |
| Vorschau über den Kern mit Mini-Struktur | Sieht exakt so aus wie später im eigenen Material. Kein zweiter Darstellungscode. |
| Bilder werden **vor** dem Einfügen kopiert, alles oder nichts | Keine halben Zustände, 8-MB-Grenze bleibt sicher (Spec: nichts wird halb eingefügt). |
| Zentrale Einsetzen-Funktion (G2) | Gleiches Verhalten wie Ziehen, Einfügen, Verschieben. Ein Rückgängig-Schritt. |
| Unabhängige Kopie | Keine Verknüpfung, die sich ändert (Spec). Das Original bleibt unberührt. |
| Mehrfachauswahl im Dialog auch am Handy | Dort ist es ein Formular, kein Zieh-Vorgang. Die Einschränkung aus PROJ-102 gilt nur für die Vorschau. |
| Lernzielkontrolle nur als einzelne Aufgaben | Ein Material hat höchstens eine Lernzielkontrolle (Spec). |

### E) Was neu gebaut wird, was bleibt
- **Neu:** Übernehmen-Dialog, Katalog-Reiter und Menüpunkte, drei Server-Wege, kleine Funktion „ganzes Thema einsetzen“ (neben der bestehenden Block-Funktion), Anpassung der Bilder-Hilfsfunktion.
- **Kern:** keine Änderung. Er baut Mini-Seiten über den bestehenden Weg.
- **Unverändert:** Datenbank (auch Regal-Funktionen), Katalog-Typen, Formulare, Veröffentlichen, Zwischenablage.

### F) Tests
- Quelle: fremdes, nicht geteiltes Material wird abgelehnt (eigen und Regal), Regal-Material nach „aus dem Regal genommen“ wird abgelehnt, **kein** Entwurf einer Regal-Quelle gelangt heraus.
- Auswahl: unbekannte Nummern, Themen und Blöcke gemischt, übergroße Zahlen werden verworfen.
- Übernehmen: Reihenfolge bleibt, neue Kennungen, Typ des Ziels unbekannt → ausgelassen mit Hinweis, Rückgängig = ein Schritt, Ganze Themen hinter dem aktuellen Thema.
- Bilder: Platzgrenze und Anzahl vor dem Kopieren, bei Fehler **nichts** angelegt, kein Pfad nach oben, Bilder nur aus sichtbaren Blöcken, fehlendes Bild → Platzhalter und Hinweis.
- Dialog: Leerzustände, nicht bearbeitbares Format ausgegraut, Handy-Ablauf, Schreibschutz ohne Menüpunkt.
- Browser-Test (manuell, kein Dev-Server durch Claude): Vorschau, Handy, Regal-Material einer zweiten Person.

### G) Risiken
- **Regal-Material ohne Bilder-Auszug oder mit gelöschten Bildern:** Block kommt mit Platzhalter. Das ist gewollt und in der Spec beschrieben.
- **Urheberrecht:** Wie beim „Anpassen“ nimmt die Lehrkraft nur die veröffentlichte Fassung, nie das Skript. Gleiche Regel (PROJ-53 E2).
- **Sehr große Quellen:** Gliederung ist leicht (nur Titel und Kurzzeilen). Die Vorschau wird nur für die Auswahl gebaut.
- **Herkunftsvermerk im Verlauf:** Prüfen, ob PROJ-47 pro Schritt eine Notiz kennt. Falls nicht, kleine Erweiterung ohne Datenbank-Änderung (Text beim nächsten Speichern) oder bewusst weglassen und in der Spec als Abweichung festhalten.

### Modell-Empfehlung
`/frontend` (Dialog, Reiter, Menüpunkte): **Sonnet**. `/backend` (drei Wege, gemeinsame Bilder-Hilfsfunktion): **Sonnet**, die Sichtbarkeitsprüfung gezielt testen. `/qa` mit den Fremdzugriff-Fällen: gern **Opus**.

### Empfohlene Bau-Reihenfolge
1. Server: Gliederung der Quelle (eigen, dann Regal) mit Sichtbarkeits-Tests.
2. Dialog mit Reitern, Liste und Gliederung (ohne Vorschau und ohne Übernehmen).
3. Übernehmen für Blöcke und Themen **ohne Bilder**, Menüpunkte und Einfügestelle.
4. Bilder-Weg (gemeinsame Hilfsfunktion, Platzprüfung, Aufräumen).
5. Vorschau der Auswahl, Lernzielkontrolle als Aufgaben, Herkunftsvermerk.
So ist nach jedem Schritt etwas Brauchbares fertig.

## Umsetzung (Frontend + Backend, 2026-11-17, Sonnet)
**Gebaut nach dem Tech Design (G1/G2), ohne Datenbank-, Kern- oder Paket-Änderung.** Der Browser nennt nur Quelle und Nummern; der Server liest die Inhalte selbst.

| Datei | Inhalt |
|---|---|
| `src/lib/werkzeugkiste-uebernahme.ts` (neu) | Typen und reine Funktionen: Gliederung, Auswahl lesen (`waehleInhalte`: ganze Themen gewinnen, Typen filtern, Fragen der Lernzielkontrolle als Aufgaben), Mini-Struktur für die Vorschau |
| `src/lib/werkzeugkiste-uebernahme-server.ts` (neu) | Schemas (strikt), `ladeQuelle` (eigen: gehört mir, Entwurf sonst Fassung; Regal: Datenbankfunktion `regal_anpassen_quelle`, nur die veröffentlichte Fassung, Kern übersetzt in Struktur), `zielOderFehler` |
| `src/lib/werkzeugkiste-bilder-kopie-server.ts` (neu) | Bilder-Kopie aus PROJ-102 als gemeinsame Hilfsfunktion (erst lesen, dann prüfen, dann schreiben, bei Fehler aufräumen); Regal-Quellen lesen nur den **Bilder-Auszug**, nie das Skript (`bildQuelle(…, nurAuszug)`) |
| API `…/editor/uebernahme/gliederung` (GET), `…/vorschau` (POST), `…/uebernahme` (POST) (neu) | Gliederung, Mini-Seite über den Kern (Datei `uebernahme-vorschau.html` im Ordner des Ziels, nur Leseadresse zurück), Übernehmen mit Bild-Kopie |
| `bilder/uebernehmen/route.ts` | nutzt jetzt die gemeinsame Hilfsfunktion (Verhalten unverändert, 10 Tests grün) |
| `werkzeugkiste-bloecke.ts` | `setzeUebernahmeEin` (Blöcke an die Stelle, Themen dahinter, ein Schritt), Bild-Funktionen für beliebiges JSON |
| `uebernehmen-dialog.tsx` (neu) | Dialog mit Reitern „Meine Materialien“/„Regal“, Suche, Werkzeug-Filter, Gliederung mit Kontrollkästchen, Vorschau per Klick auf das Auge, Fehler im Dialog |
| `katalog-dialog.tsx`, `editor-gliederung.tsx`, `baukasten-editor.tsx` | Knopf „Aus Material übernehmen“ im Katalog, Eintrag im ⋯-Menü, Einsetzen mit Hinweis und Rückgängig |

**Abweichungen von der Spec (bewusst)**
- **Einstieg im Katalog** ist ein Knopf im Kopf des Katalogs (kein echter Reiter). Das „+“-Menü der Einfügestellen führt in den Katalog und damit zum selben Knopf. Eigene Einträge in den Leerzuständen der **Vorschau-Seite** gibt es nicht (das wäre eine Änderung am Hilfsskript der abgeschotteten Seite).
- **Vorschau** per Klick auf ein Auge-Symbol (nicht schon beim Anklicken der Zeile), damit die Zeile frei für das Kontrollkästchen bleibt.
- **Herkunftsvermerk** („aus: Titel, Lehrkraft“) steht im Hinweis nach dem Übernehmen. Der Baukasten hat keinen Verlauf mit Notiz je Schritt (Rückgängig ist nur im Editor), deshalb wird nichts zusätzlich gespeichert.
- **Liste:** Es wird die erste Seite geladen (50 Materialien, Regal 30); weitere nur über Suche und Filter.
- Material **aus dem Regal ohne Entwurf-Bezug**: Bei eigenen Materialien gilt der Entwurf, sonst die veröffentlichte Fassung (wie im Editor).

**Tests:** 13 reine Funktionen (`werkzeugkiste-uebernahme.test.ts`), 3 für `setzeUebernahmeEin`, 18 Server-Tests (`uebernahme.test.ts`: fremde Quelle/Ziel, Regal ohne Entwurf, nur Auszug, nichts vom Browser, Platzgrenze), 8 Dialog-Tests. `tsc` sauber, Produktions-Build läuft durch. Alle Tests der Werkzeugkiste grün bis auf den bekannten Fehlschlag außerhalb des Features (`werkzeugkiste-auszug.test.ts`, PROJ-100).

## QA Test Results
**Geprüft:** 2026-11-17 (Opus). Nur Code-Review und automatische Tests. Kein Dev-Server, kein Playwright, kein Build (Vorgabe des Nutzers). Auf Wunsch der Koordination vorzeitig abgeschlossen. Was nicht geprüft wurde, steht ausdrücklich unten.

### Automatische Prüfungen
| Prüfung | Ergebnis |
|---|---|
| `npx tsc --noEmit -p .` | sauber (Exit 0) |
| `npx vitest run --maxWorkers=2` mit `werkzeugkiste-uebernahme.test.ts`, `uebernahme.test.ts`, `bilder-uebernehmen.test.ts`, `uebernehmen-dialog.test.tsx`, `werkzeugkiste-bloecke.test.ts`, `roles.test.ts`, `teacher-api-gate.test.ts` | 7 Dateien, 88 Tests, alle grün |
| Neue QA-Tests | keine geschrieben (vorzeitiger Abschluss) |

Testlücken: Es gibt keinen Test für „Quelle = Ziel“ (Bildkopie wird übersprungen), keinen für ein Regal-Material, das nach dem Laden der Gliederung aus dem Regal genommen wurde (nur der Dialog-Test mit einer nachgestellten 404), und keinen für das Abbrechen während einer laufenden Übernahme.

### Acceptance Criteria
| # | Kriterium | Ergebnis |
|---|---|---|
| 1 | Einstieg im Katalog, „+“-Menü, Leerzustände und ⋯-Menü | ⚠️ Abweichend, wie dokumentiert: Im Katalog ist es ein Knopf statt eines Reiters. Das „+“ führt über den Katalog dorthin. Im ⋯-Menü ist der Eintrag vorhanden. In den Leerzuständen der Vorschau fehlt er (dokumentiert). Im leeren Zustand der Editor-Gliederung gibt es keinen eigenen Eintrag, nur den Weg über den Katalog. |
| 2 | Zwei Reiter (`AdminTabs`), Suche, Werkzeug-Filter | ✅ Suche mit 300 ms Verzögerung, Filter als natives `<select>` (min-h-11, aria-label) |
| 3 | Nur Interaktive Seiten | ✅ Eigene: `baukasten === 'bearbeiten'`. Regal: `istEditierbar` und nicht `vonMir`. Der Server prüft zusätzlich (`KEINE_SEITE`). Nicht passende Materialien werden ausgeblendet statt ausgegraut (Tech Design: „ausgegraut mit Grund“). Vertretbar. |
| 4 | Gliederung und Vorschau des Angeklickten | ⚠️ Abweichend, wie dokumentiert: Die Vorschau öffnet sich über das Auge-Symbol. Sie wird erst beim Klick gebaut. ✅ |
| 5 | Themen und Blöcke gemischt wählbar | ✅ Ein ganz gewähltes Thema sperrt seine Einzelblöcke, Doppeltes zählt nicht. Fragen der Lernzielkontrolle sind einzeln wählbar. |
| 6 | Einfügen an der Stelle, Hinweis, ein Rückgängig-Schritt | ✅ `setzeUebernahmeEin`: Blöcke kommen an die Stelle, Themen hinter das Thema der Blöcke. Ohne Thema entsteht „Thema 1“. Ein `z.aendere` ergibt einen Rückgängig-Schritt, die Indizes stimmen. Deckblatt und Lernzielkontrolle bleiben unberührt (Themen gehen nur in `chapters`). Toast mit „Rückgängig“. **Aber:** Nach „Abbrechen“ während des Ladens wird trotzdem eingefügt (BUG-1). |
| 7 | Bilder in die eigene Ablage, 8-MB- und 2-GB-Grenze vorab | ✅ Erst lesen, dann prüfen (30 eigene Bilder, 8-MB-Schätzung), dann schreiben. Bei einem Fehler wird aufgeräumt. `speicherPruefen` prüft die 2 GB, aber nur „schon voll“, nicht „voll nach dem Kopieren“ (wie der Bestand). Die Seitengröße liefert der Browser (wie PROJ-102, Low). |
| 8 | Unabhängige Kopie | ✅ Tiefe Kopien (`kopie`) und neue Bildnamen (`randomBytes`). Bei Quelle = Ziel teilen sich beide Blöcke dieselbe Bilddatei. Das ist gewollt, die Datei ist unveränderlich. |
| 9 | Herkunft „aus: Titel, Lehrkraft“ im Änderungsverlauf | ⚠️ Abweichend, wie dokumentiert: Die Herkunft steht nur im Toast. Im Verlauf wird nichts gespeichert. |
| 10 | Leerzustände mit Satz und Hinweis auf die Werkzeuge | ⚠️ Bei „Meine Materialien“ ja. Beim Regal steht nur „Im Regal liegt noch keine Interaktive Seite …“, ohne Hinweis auf die Werkzeuge. Weil nur Seite 1 geladen und erst im Browser gefiltert wird, kann der Leerzustand auch dann erscheinen, wenn es passende Materialien auf späteren Seiten gibt (BUG-5). |

**Edge Cases**
- Anderes Werkzeug: ✅ Unbekannte Typen werden ausgelassen und gezählt. Wie bei PROJ-102 wird nur gegen den Gesamtkatalog geprüft (`istBekannterTyp`), nicht je Ziel-Werkzeug.
- Lernzielkontrolle: ✅ Ihre Fragen werden zu Blöcken im Ziel-Thema, es entsteht keine zweite Lernzielkontrolle.
- Bild nicht erreichbar: ⚠️ Es wird als „fehlend“ gezählt und gemeldet. Der alte Bildname bleibt aber im Block stehen und kann im Ziel auf ein **anderes** Bild zeigen (BUG-2).
- Regal-Material zurückgezogen: ✅ `ladeQuelle` wird bei jedem Aufruf neu ausgeführt und liefert 404. Nichts wird geschrieben, der Dialog zeigt einen verständlichen Satz.
- Sehr große Quelle: ✅ Die Gliederung enthält nur Titel, Typ und Kurzzeile. Die Vorschau wird nur für das Angeklickte gebaut. Grenze für die Übernahme: 1,5 MB, 40 Themen, 200 Blöcke. Die Ladezeit (< 1 s bei 50 Materialien) ist **nicht geprüft**. Bei Regal-Quellen ruft jede Gliederung den Kern auf, um die Struktur zu übersetzen.
- Schreibschutz: ⚠️ Der Eintrag im ⋯-Menü ist **deaktiviert** statt ausgeblendet (die Spec sagt „fehlt“). `oeffneUebernehmen` und `uebernommen` prüfen `z.gesperrt`. Ausreichend.

### Bugs
**Critical:** keine. **High:** keine.

**Medium**
- **BUG-1: Nach „Abbrechen“ wird trotzdem eingefügt.** `uebernehmen-dialog.tsx:217-231`: Während `laeuft` bleiben „Abbrechen“ (Z. 461), Esc und das Schließen-X aktiv. Die Anfrage läuft weiter. Wenn sie ankommt, ruft der Dialog `onUebernommen(r)` auf, und zwar mit der Funktion aus der Darstellung beim Klick, in der `uebernehmen.ziel` noch gesetzt ist (`baukasten-editor.tsx` `uebernommen`). Die Blöcke landen also im Material, obwohl die Lehrkraft abgebrochen hat. Die Bilder sind ohnehin schon kopiert. Schritte: Viel mit Bildern wählen → „Übernehmen“ → sofort „Abbrechen“ → nach wenigen Sekunden erscheinen die Blöcke und der Toast. Lösung: Während `laeuft` das Schließen sperren oder das Ergebnis verwerfen, wenn der Dialog inzwischen zu ist.
- **BUG-2: Ein fehlendes Bild kann im Ziel ein falsches Bild zeigen.** `uebernahme/route.ts:62-70` und `werkzeugkiste-bilder-kopie-server.ts:85-99`: Bildnamen unter `fehlend` werden nicht umgeschrieben. Der Block behält zum Beispiel `images/seite3_x42.png`. Solche Namen aus dem Skript-Paket hängen von der Position im Skript ab (Seite und Bildnummer) und kommen deshalb in vielen Skripten vor. Das Ziel löst den Namen über **seine eigene** Einlesung auf und zeigt dann ein fremdes Bild aus dem eigenen Skript statt des Platzhalters „Bild nicht gefunden“ aus der Spec. Am wahrscheinlichsten ist das bei Regal-Quellen ohne oder mit unvollständigem Bilder-Auszug und bei eigenen Quellen, deren Skript nach 12 Monaten entfernt wurde. Kein Datenabfluss, es sind nur eigene Daten, aber ein inhaltlich falsches Material. Dasselbe gilt für Namen, die `BILD_NAME` verwirft (länger als 121 Zeichen): Sie bleiben ungezählt stehen. Lösung: Fehlende Namen auf einen eindeutigen, nicht auflösbaren Platzhalter umschreiben. Der Weg aus PROJ-102 hat dasselbe Verhalten.

**Low**
- **BUG-3: Vorschau-Datei wird bei schnellen Klicks vertauscht.** `vorschau/route.ts:40`: Alle Vorschauen eines Ziels schreiben dieselbe Datei `uebernahme-vorschau.html`. `vorschauNr` verwirft im Browser nur alte Antworten. Schreibt eine ältere Anfrage nach einer neueren, lädt die neuere Antwort den Inhalt der älteren. Dann steht unter „Vorschau: Block B“ der Inhalt von Block A. Gleiches gilt für zwei Fenster. Nur Anzeige, keine Daten betroffen.
- **BUG-4: Vorschau-Datei bleibt liegen und zählt zum Speicher.** `uebernahme-vorschau.html` (bis etwa 8 MB) wird nie gelöscht. Beim nächsten `aktualisiereSpeicher` zählt sie zur 2-GB-Summe. Beim Löschen des Materials wird sie mit entfernt ✅ (`loescheDateien` listet den ganzen Ordner). Das Aufräumen alter Skripte erfasst sie nicht, das muss es aber auch nicht.
- **BUG-5: Listen nur Seite 1, im Browser gefiltert.** `uebernehmen-dialog.tsx:116-128`: Die Auswahl filtert erst nach dem Laden (50 bzw. 30 Einträge). Wer viele Word- oder H5P-Materialien hat, sieht eine kurze oder leere Liste und den falschen Leersatz. Teilweise dokumentiert.
- **BUG-6: Fokus geht beim Wechsel zwischen Liste und Gliederung verloren.** Der gewählte Knopf bzw. „Zurück“ verschwindet aus dem DOM, und der Fokus landet am Dialog bzw. am `body`. Für Tastatur- und Screenreader-Nutzer ist das ein Bruch. Am Handy steht die Vorschau unter einer langen Gliederung, und nach dem Tippen auf das Auge scrollt nichts dorthin. Der „Schritt-für-Schritt“-Ablauf aus dem Tech Design ist nur teilweise umgesetzt.
- **BUG-7: Keine Begrenzung der Anfragen.** Gliederung (bei Regal ein Kern-Aufruf), Vorschau (ein Kern-Bau) und Übernahme (bis zu 40 Bild-Aufrufe) lassen sich beliebig oft aufrufen. Nur angemeldete Lehrkräfte kommen dran. Das ist wie im übrigen Editor, dort gibt es auch keine Begrenzung.

### Behebungen nach der QA (2026-11-17, Sonnet)
| Bug | Stand |
|---|---|
| BUG-1 Einfügen trotz Abbrechen | **Behoben:** Der Dialog zählt Sitzungen. Kommt die Antwort nach dem Schließen, wird nichts eingefügt (Test „wird der Dialog geschlossen …“). Die schon kopierten Bilder bleiben als ungenutzte Dateien liegen und werden vom Aufräumen nach Veröffentlichen entfernt. |
| BUG-2 Falsches Bild statt Platzhalter | **Behoben:** Fehlende Bilder bekommen einen eindeutigen Namen, den es im Ziel nie gibt, dort erscheint der Platzhalter (Test angepasst). Der Weg der Zwischenablage (PROJ-102) bleibt unverändert. |
| BUG-3 Vorschau vertauscht | **Behoben:** Jede Vorschau schreibt eine eigene Datei `uebernahme-vorschau-<Zufall>.html`. |
| BUG-4 Datei bleibt liegen | **Entschärft:** Beim nächsten Bau werden ältere Vorschau-Dateien entfernt, es bleibt höchstens eine übrig (und geht mit dem Material). |
| BUG-5 Listen nur Seite 1 | **Teilweise:** Regal-Leersatz nennt jetzt die Werkzeuge. Die Liste lädt weiter nur die erste Seite; Suche und Werkzeug-Filter helfen. |
| BUG-6 Fokus / Handy-Scrollen | **Offen (Low)**, mit dem Browser-Test der Lehrkraft zu prüfen. |
| BUG-7 Keine Anfragenbegrenzung | **Offen (Low)**, wie im übrigen Editor. |

### Security-Audit (Red Team)
- **Fremdzugriff „eigen“:** ✅ `ladeQuelle` lädt mit dem Nutzer-Client (RLS) und prüft zusätzlich `owner_id === nutzerId`. Fremde, gelöschte und ungültige IDs ergeben dieselbe 404. Eine Regal-Freigabe-ID unter `art=eigen` findet nichts.
- **Fremdzugriff „regal“:** ✅ `regal_anpassen_quelle` (SECURITY DEFINER, nur `authenticated`) gibt nur dann eine Zeile zurück, wenn `regal_darf_sehen` zustimmt. Dafür muss der Aufrufer eine Lehrer-Rolle haben, die Freigabe darf nicht entnommen sein, der Urheber muss noch eine Lehrer-Rolle haben (Rollenentzug wirkt), und die Stufe muss passen (alle, Fachbereich, ausgewählte Personen, eigene). Außerdem gilt `a.status = 'fertig'`. Die Prüfung läuft bei **jedem** der drei Aufrufe neu, auch beim Übernehmen.
- **Kein Entwurf oder Skript aus dem Regal:** ✅ Die Funktion liefert nur `antwort` (die veröffentlichte Fassung), nie `entwurf`. Bilder aus dem Skript-Paket werden bei fremden Quellen nur aus `auszug.zip` gelesen (`bildQuelle(…, nurAuszug)`), auch in der Vorschau. Die Antworten enthalten nur Gliederung, Blöcke der veröffentlichten Fassung, Titel und Herkunft. All das kann die Lehrkraft über „Anpassen“ (PROJ-53) ohnehin bekommen.
- **`eigen_*`-Bilder des Urhebers (Service-Key):** ✅ Die Namen stammen nur aus `bildPfadeIn` über die serverseitig gelesenen, gewählten Blöcke der veröffentlichten Fassung (Übernahme) bzw. über die Mini-Struktur aus Deckblatt und Auswahl (Vorschau, `eigeneFuerBau`). Ein Name kann also nur vorkommen, wenn er im veröffentlichten Inhalt steht. `istEigenerPfad` verlangt genau `^images/eigen_[A-Za-z0-9]{6,32}\.(jpg|png)$`. Damit gibt es keinen `/`, kein `..`, keine Großschreibung der Endung und keine Sonderzeichen. Der Speicherpfad entsteht daraus mit `eigenerPfad(quelle.owner_id, quelle.id, …)`, eine Pfadtraversal ist nicht möglich. `BILD_PFAD` (ohne `/i`, ohne `/` im Namen, erstes Zeichen nicht `.`) findet keine Namen mit Unterordnern. `BILD_NAME` und der `..`-Filter in der Route sind eine zusätzliche Sicherung. Namen aus dem Skript-Paket gehen nur als Eintragsname im ZIP an den Kern, nie als Speicherpfad. Hochgeladene Bilder behalten ihren Namen (`randomBytes`, kein Überschreiben). Ein Entwurf des Urhebers kann deshalb kein veröffentlichtes Bild verändern.
- **Vorschau-Datei:** ✅ Sie wird nur in den Ordner des Ziels geschrieben, nachdem `zielOderFehler` bestätigt hat, dass das Ziel ein eigenes und bearbeitbares Material ist. Der Name ist fest und passt zu keiner anderen Datei (`vorschau.html`, `entwurf.html`, `ausgabe` bleiben unberührt). Zurück kommt nur eine kurzlebige Leseadresse (120 s). Für Race und Speicher siehe BUG-3 und BUG-4.
- **Eingaben:** ✅ Alle Schemas sind `.strict()`, Quelle ist `uuid`. Nummern sind ganze Zahlen von 0 bis 1000, höchstens 40 Themen, 200 Blöcke und 200 Fragen. `seitenGroesse` liegt zwischen 0 und 50 Mio. Inhalte oder Bildnamen vom Browser werden mit 400 abgewiesen (Test vorhanden). Die Antwort ist auf 1,5 MB und 40 Bilder begrenzt.
- **Teilfehler:** ✅ `kopiereBilder` liest erst alles, prüft dann und schreibt erst danach. Im `catch` wird alles Angelegte entfernt. Wird die Funktion bei `maxDuration` abgebrochen, bleiben verwaiste Dateien. Die entfernt das Aufräumen beim Veröffentlichen (Schonfrist 15 min). Bis dahin zählen sie zur Grenze von 30 Bildern.
- **Proxy:** ✅ `/api/admin/werkzeugkiste` steht in `TEACHER_API_PATH_PREFIXES`, die neuen Routen sind also für reine Lehrkräfte erreichbar. Azubis sperren der Proxy (nur Lehrer- und Verwaltungsrollen unter `/api/admin`) und zusätzlich `requireTeacherOrAdmin` in jeder Route (403). Wächter-Tests sind grün.
- **XSS:** ✅ `<iframe srcDoc sandbox="allow-scripts">` ohne `allow-same-origin`, `allow-top-navigation` und `allow-popups`. Die Seite läuft damit mit fremdem Ursprung, ohne Zugriff auf Cookies, Speicher oder die App (wie die Editor-Vorschau). Titel, `besitzer_name`, Kurzzeilen und Herkunft werden als React-Text bzw. im Sonner-Toast als Text dargestellt. Der Commit fügt kein `dangerouslySetInnerHTML` und kein `innerHTML` hinzu (geprüft per `git show | grep`). Die Kurzzeile ist auf 70 Zeichen begrenzt, die Herkunft auf 200.

### Nicht geprüft
- Browser-Test (Desktop, Handy 375 px, Tablet 768 px; Chrome, Firefox, Safari), echte Vorschau-Darstellung, Tastatur-Ablauf im echten Dialog.
- Ladezeit unter 1 s bei 50 Materialien.
- Datenbank-Lesezugriffe (Supabase-MCP): nicht ausgeführt. Die Regal-Funktionen wurden nur anhand der Migrationen `20261101_proj53_regal.sql` und `20261102_proj53_paket2.sql` geprüft. Dass der Stand in Produktion dazu passt, ist nicht geprüft.
- Verhalten des Kerns bei `/api/editor/bild` und `/api/editor/bauen` (z. B. ob `bauen` aus der Einlesung nur benannte Bilder einbettet). Das Namensschema der Paket-Bilder (BUG-2) stammt aus dem Kommentar in `erzeugeAuszug`.
- Regression der übrigen Werkzeugkiste-Tests (nur die 7 genannten Dateien wurden ausgeführt).

### Empfehlung
**Deploy: ja, mit Vorbehalt.** Es gibt keine Critical- und keine High-Bugs. Die Sicherheitsprüfung ergab keinen Weg zu fremden Inhalten, Entwürfen, Skripten oder Bildern. BUG-1 (Einfügen trotz Abbrechen) und BUG-2 (falsches Bild statt Platzhalter) sollten vor oder kurz nach dem Deploy behoben werden. Danach ist ein manueller Browser-Test mit dem Regal-Material einer zweiten Person nötig.

## Deployment
_To be added by /deploy_
