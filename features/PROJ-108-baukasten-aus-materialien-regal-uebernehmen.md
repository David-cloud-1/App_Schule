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
_To be added by /qa_

## Deployment
_To be added by /deploy_
