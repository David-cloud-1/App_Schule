# PROJ-117: Baukasten – Einheitliche Bearbeiten-Optik

## Status: In Review
**Created:** 2026-11-17
**Last Updated:** 2026-11-17

## Hintergrund
Im Baukasten gibt es heute drei Stellen, an denen Text und Inhalte bearbeitet werden, und sie sehen verschieden aus:

| Stelle | Technik | Aussehen heute |
|---|---|---|
| Lehrtext, Kapitel, Deckblatt, Bildunterschrift in der Vorschau | Schreibwerk (PROJ-103), nachgeladen in die abgeschottete Seite | Schwebende Leiste: **F**, *K*, H2, H3, • Liste, 1. Liste, Link, „Box …“, „Diese Box …“, Fertig |
| Aufgaben in der Vorschau | Aufgabenwerk (PROJ-114), eigenes nachgeladenes Paket | Eigene Bedienung, **keine** Textleiste |
| Formular-Schublade rechts | App-Komponente `text-editor.tsx` | Icons und Dropdown-Menüs im App-Stil |

Dem Nutzer gefällt die Leiste des Schreibwerks. Gleiche Dinge sollen überall gleich aussehen und gleich heißen, damit Anfänger nicht bei jeder Stelle neu raten müssen (Fortsetzung von PROJ-111 „Eine Bedienstelle statt drei“).

**Technische Grenze:** Die Vorschau ist eine abgeschottete Seite, die App kann dort keine eigenen Komponenten zeichnen. Es bleiben also zwei Umsetzungen (Seite und App). Gleichheit entsteht über **eine gemeinsame Quelle** für Wortlaut, Reihenfolge, Farben und Maße.

## Dependencies
- Requires: PROJ-103 (Schreibwerk – Vorbild der Leiste)
- Requires: PROJ-114 (Aufgabenwerk) – dessen Texte bekommen die Leiste; PROJ-114 sollte vorher abgeschlossen sein oder diese Spec berücksichtigen
- Berührt: PROJ-101 (Block-Leiste), PROJ-97 (Hinzufügen), PROJ-90 (Katalog-Dialog), PROJ-111 (Bedienstelle)
- Nicht Teil von PROJ-114: eigener Auftrag, damit dessen Umfang nicht wächst

## User Stories
- Als Lehrkraft, die den Baukasten zum ersten Mal benutzt, will ich überall dieselben Knöpfe mit denselben Wörtern sehen, damit ich nicht an jeder Stelle neu lernen muss, wie man Text fett macht.
- Als Lehrkraft will ich, dass eine geöffnete Aufgabe dieselben Knöpfe, Farben und denselben „Fertig“-Knopf zeigt wie der Lehrtext, damit sie sich wie derselbe Baukasten anfühlt.
- Als Lehrkraft will ich in der Formular-Schublade dieselbe sichtbare Leiste sehen wie in der Vorschau, damit ich beim Wechsel zwischen Seite und Schublade nichts umlernen muss.
- Als Lehrkraft will ich, dass Block-Leiste, „+“-Einfügen und Katalog-Dialog dieselbe Formensprache haben wie die Textleiste (Rundungen, Farben, Beschriftungsstil).
- Als Entwickler will ich, dass ein Test fehlschlägt, wenn Vorschau und Schublade bei Wortlaut oder Farben auseinanderlaufen, damit die Einheitlichkeit nicht beim nächsten Feature wieder verloren geht.

## Acceptance Criteria

### Gemeinsame Quelle
- [ ] Eine einzige Quelle legt fest: Knopfreihenfolge, Beschriftungen, Hinweistexte (`aria-label`/`title`), Farben und Maße der Bearbeiten-Leiste. Vorschau (Schreibwerk, Aufgabenwerk) und Schublade lesen daraus.
- [ ] Die Farben der Leiste erfüllen weiter den Kontrast von mindestens 4,5 : 1 (bestehender Test `schreib-design.test.ts` bleibt grün).
- [ ] Die Knopfreihenfolge der Textleiste lautet überall: F, K, H2, H3, • Liste, 1. Liste, Link, „Box …“, „Diese Box …“, Fertig. Stellen ohne Boxen lassen die Box-Auswahl weg, ändern aber sonst nichts an Reihenfolge und Wörtern.

### Aufgabenwerk
> Entscheidung 2026-11-17: Aufgabentexte bleiben **reiner Text** (der Kern maskiert Zeichen wie `<b>`). In Aufgaben gibt es deshalb **keine** Formatknöpfe. Angeglichen werden nur Form, Farben, Knöpfe und Wörter. Formatieren in Aufgaben wäre ein Kern-Umbau und ist nicht Teil dieser Spec.
- [ ] Die Bedienelemente einer geöffneten Aufgabe (Schild, „Fertig“, Aktionsknöpfe wie „Antwort hinzufügen“, Löschen) haben dieselbe Form, Höhe, Rundung, Farben und denselben Fokus-Rahmen wie die Textleiste.
- [ ] Es erscheinen keine Formatknöpfe, die in Aufgaben nichts bewirken würden.
- [ ] „Fertig“ heißt und sitzt wie im Schreibwerk; Esc verhält sich wie im Schreibwerk (PROJ-103).
- [ ] Gespeicherter Inhalt ändert sich nicht: Das Prüfen, Reinigen und Speichern bleibt bei der App („Seite meldet, App entscheidet“).

### Formular-Schublade
- [ ] Der Text-Editor in der Schublade zeigt eine sichtbare Leiste mit denselben Knöpfen, derselben Reihenfolge und denselben Wörtern wie die Vorschau, statt Icons und Dropdown-Menüs.
- [ ] Die Schublade behält ihre Technik (App-Komponente) und darf im Aussehen leicht abweichen (App-Stil); Wortlaut und Reihenfolge sind identisch.
- [ ] Alle Knöpfe sind mindestens 44 × 44 px hoch (Touch), mit sichtbarem Fokus und Beschriftung für Screenreader.

### Übrige Bedienknöpfe in der Seite
- [ ] Block-Leiste (PROJ-101), „+“-Einfügen (PROJ-97) und Katalog-Dialog (PROJ-90) übernehmen Rundung, Farbpaare und Beschriftungsstil der gemeinsamen Quelle.
- [ ] Begriffe für gleiche Dinge sind überall gleich („Box“, „Element“, „Fertig“ usw.), keine Doppelbezeichnungen.
- [ ] Die Funktion der Knöpfe ändert sich nicht, nur Optik und Wortlaut.

### Wächtertest
- [ ] Ein Test schlägt fehl, wenn Beschriftungen, Knopfreihenfolge oder Farbwerte zwischen Schreibwerk, Aufgabenwerk und Schublade voneinander abweichen.
- [ ] Der Test schlägt auch fehl, wenn in einer der drei Stellen eine Farbe fest im Code steht, die nicht aus der gemeinsamen Quelle kommt.
- [ ] Der Test läuft in `npm test` und ist unabhängig vom Frische-Test der Bündel (`schreibwerk:bauen`, `aufgabenwerk:bauen`).

### Dokumentation
- [ ] `docs/DESIGN.md` enthält einen kurzen Abschnitt „Bearbeiten-Leiste im Baukasten“ mit Knopfreihenfolge, Wortlaut, Verweis auf die gemeinsame Quelle und der Regel: Neue Bearbeitungsstellen übernehmen sie, statt eine eigene Optik zu erfinden.
- [ ] Beide nachgeladenen Bündel sind neu gebaut und im Repo aktuell (Frische-Tests grün).

## Edge Cases
- **Handy:** Das Schreibwerk setzt die Leiste fest über die Bildschirmtastatur. Die Aufgaben-Leiste muss sich genauso verhalten und darf keine Aufgabenbedienung verdecken.
- **Zwei Leisten gleichzeitig:** Wird in einer Aufgabe geschrieben, während im Lehrtext noch eine Leiste offen ist, bleibt immer nur eine Leiste sichtbar (die zuletzt geöffnete), die andere schließt sauber mit Endstand.
- **Aufgabe in Aufgabe:** In Aufgabenfeldern mit Lösungen oder Lücken darf die Leiste geschützte Stellen (Lücken-Marken, Lösungswerte) nicht beschädigen. Knöpfe, die dort nichts dürfen, sind ausgeblendet oder deaktiviert, nicht still wirkungslos.
- **Lange Leiste auf schmalem Schirm:** Die Leiste bricht in eine zweite Zeile um (wie heute), nichts rutscht aus dem Bild; das Aufgabenwerk darf nicht breiter werden als seine Zone.
- **Bündel veraltet:** Wurde eine der gemeinsamen Quellen geändert, ohne die Bündel neu zu bauen, schlägt der Frische-Test fehl, es erscheint nie eine Mischung aus alter und neuer Optik im Livebetrieb.
- **Dunkelmodus der App:** Die Schublade folgt dem Darstellungsmodus des Lehrkräfte-Bereichs (Tokens `ws-*`), die Vorschau bleibt bewusst Papier-hell. Gleich sind Wortlaut und Reihenfolge, nicht die Hintergrundfarbe.
- **Rückgängig/Wiederholen:** Tastenkürzel (Strg/⌘ + K für Link, Esc für Fertig) funktionieren an allen drei Stellen gleich.
- **Bestehende Texte:** Kein Inhalt wird durch das neue Aussehen verändert oder neu formatiert.

## Technical Requirements
- Performance: Das Nachladen der Leiste im Aufgabenwerk darf das Öffnen einer Aufgabe nicht merklich verlängern (Bündelgröße des Aufgabenwerks bleibt etwa gleich, die Leiste wird aus dem Schreibwerk-Code mitgenutzt, nicht doppelt gebaut).
- Barrierefreiheit: Mindestgröße 44 px, Kontrast ≥ 4,5 : 1, `role="toolbar"` mit Beschriftung, Fokus sichtbar, Bedienung per Tastatur.
- Sicherheit: Keine neuen Datenwege. Die Seite meldet, die App prüft und speichert (Grundregel aus PROJ-101).
- Browser: Chrome, Safari, Firefox (Desktop und Handy).

## Nicht Teil dieser Spec
- Neue Formatierungsfunktionen (Farben, Tabellen im Text, Bilder im Text).
- Umbau der Bearbeitungslogik von Schreibwerk oder Aufgabenwerk.
- Änderungen am Schüler-Spiel (nur der Lehrkräfte-Baukasten).

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)

**Erstellt:** 2026-11-17 (Opus 5.5). Reine Oberflächen-Arbeit: keine Datenbank, keine API, kein Kern-Umbau, keine neuen Pakete.

### Was heute da ist (Befund)
Die Seite hat schon **drei fast gleiche Farbtabellen**, jede für sich gepflegt:

| Teil | Farbtabelle | Knopf-Grundform |
|---|---|---|
| Block-Leiste, „+“ (Vorschau-Skript, PROJ-101/97) | `LEISTE_FARBEN` | `.wk-b`: 34 px hoch, Rundung 8 px |
| Schreibwerk (Textleiste, PROJ-103) | `SCHREIB_FARBEN` | `.wk-fb` / `.wk-fs`: eigene Maße |
| Aufgabenwerk (PROJ-114) | `AW_FARBEN` | `.wk-aw-knopf`: 36 px hoch, eigener Rand |

Die Blautöne unterscheiden sich nur leicht (#1e3a8a, #1d4ed8, #2563eb), das sieht man aber, und die Knöpfe sind unterschiedlich hoch und rund. Die Schublade (`text-editor.tsx`) nutzt Icons und Dropdown-Menüs mit eigenen Wörtern („Box einfügen“, „Box samt Inhalt löschen“). Das erklärt, warum es „verschieden“ wirkt.

### A) Aufbau

```
Gemeinsame Quelle (neu, zwei kleine Dateien)
+-- Bedien-Design: eine Farbtabelle + Grundformen
|   (Leistenrahmen, Knopf, Auswahlfeld, „Fertig“, Fokus, Handy-Leiste unten)
+-- Bedien-Wörter: Knöpfe der Textleiste in fester Reihenfolge
    (Kurztext „F“, Langtext „Fett“, Tastenkürzel), Box-Arten, Box-Aktionen,
    feste Begriffe (Fertig, Element, Box, Löschen …)

In der Vorschau-Seite (abgeschottet, nachgeladen)
+-- Block-Leiste und „+“            → nutzen Bedien-Design
+-- Schreibwerk (Textleiste)        → nutzt Bedien-Design + Bedien-Wörter
+-- Aufgabenwerk (Aufgabe offen)    → nutzt Bedien-Design (Knöpfe, „Fertig“, Schild)

In der App
+-- Formular-Schublade: Text-Editor → sichtbare Leiste aus Bedien-Wörtern,
|                                     Farben aus den ws-Tokens (hell/dunkel)
+-- Katalog-Dialog, Block-Menü      → Begriffe aus Bedien-Wörtern

Wächtertest
+-- vergleicht alle Stellen mit der gemeinsamen Quelle
```

### B) Gemeinsame Quelle (in Alltagssprache)
- **Bedien-Design** ersetzt die drei Farbtabellen durch **eine**. Es legt Knopfhöhe, Rundung, Abstände, Schatten der Leiste, Fokus-Rahmen und die Handy-Variante (Leiste unten über der Tastatur) einmal fest. Die drei Seiten-Teile setzen daraus ihr Aussehen zusammen und ergänzen nur, was nur sie brauchen (z. B. Bild-Anfasser).
- **Bedien-Wörter** ist eine Liste: Welche Knöpfe, in welcher Reihenfolge, mit welchem Kurz- und Langtext. Schreibwerk und Schublade bauen ihre Leiste **aus dieser Liste**. Ändert man ein Wort, ändert es sich an beiden Stellen.
- Weil die Vorschau abgeschottet ist, wird die gemeinsame Quelle beim Bauen in die nachgeladenen Pakete hineinkopiert (`schreibwerk:bauen`, `aufgabenwerk:bauen`). Die bestehenden Frische-Tests merken, wenn ein Paket nicht neu gebaut wurde.

### C) Entscheidungen und Gründe
1. **Eine Quelle statt Abgleich per Hand.** Drei Farbtabellen sind schon auseinandergelaufen. Nur wenn alle aus derselben Datei lesen, bleibt es gleich.
2. **Schublade: sichtbare Textknöpfe statt Icons.** Wer in der Seite „F“ und „Box …“ gelernt hat, findet sie in der Schublade an derselben Stelle. Die Schublade behält ihre App-Farben (hell/dunkel über `ws-*`), denn sie ist Teil des Lehrkräfte-Bereichs; gleich sind Wörter, Reihenfolge, Form. Die zwei Box-Auswahlen werden App-Auswahlfelder mit genau den Beschriftungen „Box …“ und „Diese Box …“.
3. **Aufgaben ohne Formatknöpfe** (Entscheidung oben). Angleichung nur bei Form, Farben, „Fertig“, Schild.
4. **Knopfhöhe:** In der Seite heute 34–36 px. Neu einheitlich 36 px am Rechner und 44 px auf Touch-Geräten (wie der Lehrkräfte-Bereich). So bleibt die schwebende Leiste am Rechner kompakt.
5. **Katalog-Dialog und Block-Menü** sind App-Teile (shadcn). Sie bekommen nur die gemeinsamen Begriffe, kein neues Aussehen – sie folgen schon dem Lehrkräfte-Design.
6. **Wächtertest hart:** Er schlägt fehl, wenn (a) in Schreibwerk, Aufgabenwerk oder Vorschau-Skript eine Farbe steht, die nicht aus dem Bedien-Design kommt, (b) die Leiste im Schreibwerk oder in der Schublade andere Knöpfe/Reihenfolge/Wörter zeigt als die Bedien-Wörter, (c) die Kontraste unter 4,5 : 1 fallen. Ausnahmen (Papier-Farben der Boxen) stehen in einer kurzen, benannten Liste im Test.

### D) Bauschritte
1. Gemeinsame Quelle anlegen + Wächtertest (zunächst rot an den Abweichungen).
2. Block-Leiste und Schreibwerk umstellen; sichtbar fast gleich, Blau und Höhen werden einheitlich. Schreibwerk-Paket neu bauen.
3. Aufgabenwerk umstellen (Knöpfe, „Fertig“, Schild); Paket neu bauen.
4. Schublade: Text-Editor-Leiste neu aus Bedien-Wörtern.
5. Begriffe in Katalog-Dialog und Block-Menü angleichen; Abschnitt in `docs/DESIGN.md`.

Jeder Schritt ist einzeln auslieferbar. Vor dem Livegang Vorschau-Bild (vorher/nachher) der drei Stellen in `docs/vorschau`.

### E) Risiken
- **Laufende Arbeit an PROJ-114** in denselben Dateien (Aufgabenwerk). → Schritt 3 erst nach Abschluss von PROJ-114; Schritte 1, 2, 4 gehen vorher.
- **Bestehende Tests prüfen Klassennamen/Wörter** (Schreibwerk-, Text-Editor-, Vorschau-Tests). → Werden in jedem Schritt mit angepasst; Funktion bleibt gleich.
- **Paketgröße:** Die gemeinsame Quelle ist klein (nur Zahlen und Wörter), die Pakete wachsen kaum.

### Abhängigkeiten (Pakete)
Keine neuen.

## Implementation Notes (Frontend, 2026-11-17)
**Gebaut (Bauschritte 1–5 bis auf Katalog/Block-Menü):**
- Neu: `bedien-design.ts` (eine Farbtabelle, Maße, Knopf-/Fertig-/Auswahl-CSS), `bedien-woerter.ts` (Knopfliste, Box-Wahl, Box-Aktionen, Fertig), `bedien-design.test.tsx` (Wächter).
- Block-Leiste/„+“ (`vorschau-skript.ts`), Schreibwerk (`schreib-design.ts`, `eintritt.ts`) und Aufgabenwerk (`design.ts`) lesen die gemeinsame Quelle; `LEISTE_FARBEN` und `SCHREIB_FARBEN` sind jetzt dieselbe Tabelle. Knöpfe überall 36 px (Touch 44 px), Blau einheitlich `#2563eb`/`#1e3a8a`.
- Aufgabenwerk: Knöpfe, „Fertig“, Fokus und Farben angeglichen (keine Formatknöpfe, wie entschieden). Es wurde mit umgestellt, weil PROJ-114 keine ungesicherten Änderungen hatte.
- Schublade: sichtbare Textleiste (F, K, H2, H3, • Liste, 1. Liste, Link, Box …, Diese Box …) aus `bedien-woerter.ts`; Schritt-Liste, Link entfernen, Block löschen stehen als Zusatz am Ende. „Diese Box …“ erscheint nur in einer Box.
- Beide Bündel neu gebaut; Frische-Tests kennen die gemeinsamen Dateien.
**Schritt 5:** Katalog-Dialog und Block-Menü nutzten schon „Element“; in der Seite hießen Knöpfe noch „Block“ und sind jetzt „Element“ (Block-Leiste, „+“, Mehrfachauswahl); Schublade: „Teil löschen“ statt „Block löschen“.
**Offen:** Vorher/Nachher-Bild in `docs/vorschau`, Browser-Test. Hinweis: `werkzeugkiste-auszug.test.ts` ist rot, unabhängig von dieser Arbeit.

## QA Test Results

**Geprüft am:** 2026-11-17 (Code-Prüfung und automatische Tests; kein Dev-Server und kein Browser, siehe Memory „Kein Dev-Server“). **Ergebnis: bedingt bereit** – keine Critical/High-Fehler, aber der Browser-Test steht noch aus.

**Automatische Tests:** `npm test`: 3880 von 3881 grün. Der eine rote Test (`werkzeugkiste-auszug.test.ts`, Urheber-Zeile im Regal) liegt in `src/lib` und ist ohne Zusammenhang mit PROJ-117 (schon vor dieser Arbeit rot, getrennt zu klären). `tsc` sauber, ESLint ohne Fehler. Die Frische-Tests beider Bündel sind grün.

### Akzeptanzkriterien
| Bereich | Kriterium | Ergebnis |
|---|---|---|
| Quelle | Eine Quelle für Reihenfolge, Wörter, Farben, Maße | ✅ `bedien-design.ts` / `bedien-woerter.ts`, Test prüft Identität der Tabellen |
| Quelle | Kontrast ≥ 4,5 : 1 | ✅ Wächtertest prüft 10 Farbpaare |
| Quelle | Reihenfolge F, K, H2, H3, • Liste, 1. Liste, Link, Box …, Diese Box … | ✅ Schreibwerk und Schublade, per Test |
| Aufgabenwerk | Form, Höhe, Farben, Fokus wie Textleiste | ✅ per Quelltext (Browser offen) |
| Aufgabenwerk | Keine Formatknöpfe | ✅ |
| Aufgabenwerk | „Fertig“ heißt/sitzt wie im Schreibwerk, Esc gleich | ⚠️ Sitz/Optik gleich, Wort ist aber ein eigener Text (BUG-1); Esc unverändert, nicht im Browser geprüft |
| Aufgabenwerk | Gespeicherter Inhalt unverändert | ✅ nur CSS geändert |
| Schublade | Sichtbare Leiste mit denselben Knöpfen/Wörtern | ✅ per Test |
| Schublade | ≥ 44 px, Fokus, Screenreader-Name | ✅ `min-h-11 min-w-11`, `aria-label`, `role=toolbar` (Browser offen) |
| Übrige Knöpfe | Block-Leiste, „+“ nutzen Farben/Rundung der Quelle | ✅ |
| Übrige Knöpfe | Katalog-Dialog übernimmt Formensprache | ➖ bewusst nur Begriffe (Tech Design C5); Begriffe ✅ |
| Übrige Knöpfe | Gleiche Begriffe überall | ✅ „Element“ statt „Block“ in der Seite; Rest-Fund siehe BUG-2 |
| Wächter | Test bei Abweichung von Wörtern/Reihenfolge/Farben | ✅ |
| Wächter | Test bei fest eingebauter Bedien-Farbe | ⚠️ prüft nur eine Verbotsliste von 9 Farbwerten, nicht jede Farbe (BUG-3) |
| Wächter | Läuft in `npm test`, unabhängig vom Frische-Test | ✅ |
| Doku | DESIGN.md-Abschnitt; Bündel neu gebaut | ✅ |

### Edge Cases (nur Code-Prüfung)
- Handy-Leiste über der Tastatur, zwei Leisten, Lücken-Marken, Tastenkürzel: Logik unverändert, nur CSS/Beschriftungen berührt → kein neues Risiko erkannt, **im Browser zu bestätigen**.
- Dunkelmodus: Schublade nutzt `ws-*`-Tokens, Vorschau bleibt Papier-hell ✅.
- Lange Leiste schmal: `flex-wrap` unverändert ✅.

### Gefundene Fehler
- **BUG-1 (Low):** Aufgabenwerk nutzt für „Fertig“ eigenen Text statt `FERTIG` aus `bedien-woerter.ts`; Name für Screenreader fehlt dort („Fertig – Schreiben beenden (Esc)“). Wortgleich heute, kann auseinanderlaufen.
- **BUG-2 (Low):** Die Schublade hat zwei Beschriftungen für dasselbe in den Box-Menüs („Art der Box ändern in …“ / „Box einfügen“) gegenüber „Box …“ in der Vorschau; ferner heißt der Löschen-Knopf für geschützte Teile „unveränderten Teil“, in der Vorschau „Geschützt“. Kosmetisch.
- **BUG-3 (Low):** Der Farb-Wächter ist eine Verbotsliste. Eine neu erfundene Farbe, die nicht auf der Liste steht, fällt nicht auf.

### Sicherheit
Keine neuen Datenwege, keine API, keine Datenbank. Link-Eingabe in der Schublade (`prompt`) und Schreibwerk unverändert; Zulässigkeit nur `https?:`/`mailto:`. Kein Befund.

### Regression
Alle 497 Editor-Tests und die Bündel-Frische-Tests grün; Schüler-Spiel unberührt.

### Offen vor Livegang
1. Browser-Test: Schublade (Rechner/Handy, hell/dunkel), Textleiste in der Vorschau, offene Aufgabe (alle Muster A–G) – Höhen, Blau, „Fertig“, Fokus.
2. Vorher/Nachher-Bild in `docs/vorschau`.
3. Playwright-E2E ist nicht geschrieben (kein Dev-Server).

## Deployment
_To be added by /deploy_
