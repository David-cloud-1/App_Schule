# PROJ-101: Baukasten – Direkt auf der Seite: Auswählen & Block-Leiste

## Status: Planned
**Created:** 2026-11-16
**Last Updated:** 2026-11-16

## Idee in einem Satz
Im Baukasten wählt ein Klick auf einen Block in der Vorschau ihn aus. Direkt am Block erscheint eine schwebende Leiste mit allen Aktionen. Ein Schalter „Bearbeiten | Ausprobieren“ trennt Bearbeiten und Spielen eindeutig, und leere Stellen sagen, was man tun kann.

## Teil einer Reihe („Baukasten direkt“, geplant 2026-11-16)
| Welle | Feature | Inhalt |
|---|---|---|
| 1 Grundlage | **PROJ-101** | Auswählen, Block-Leiste, Modus-Schalter, Leerzustände (dieses Feature) |
| 1 | PROJ-102 | Ziehen in der Vorschau, Mehrfachauswahl, Kopieren & Einfügen |
| 1 | PROJ-103 | Lehrtext direkt in der Seite tippen |
| 2 Bilder | PROJ-104 | Bild direkt: Größe ziehen, Zuschneiden, Drehen, Datei auf die Seite ziehen |
| 2 | PROJ-105 | Bild neben Text & Bild-Galerie |
| 2 | PROJ-106 | Bild beschriften & markieren |
| 2 | PROJ-107 | Bild als Aufgabe (Hotspots, Beschriftungen zuordnen) |
| 3 Von außen | PROJ-108 | Blöcke und Themen aus eigenen Materialien & Regal übernehmen |
| 3 | PROJ-109 | Externe Einbettung (Kahoot-PIN, LearningApps, YouTube …) |
| 3 | PROJ-110 | Quiz-Show-Block im Kahoot-Stil (spielbar, offline) |
| 3 | PROJ-93 (erweitert) | Werkzeug oder KI im Editor starten (kopierter Prompt) → Block |

## Leitbild (gilt für die ganze Reihe)
- **Ziel des Nutzers (2026-11-16):** „Ein sehr intuitiver und effizienter Baukasten, den alle Lehrkräfte nutzen können, auch die ohne viel Erfahrung. Alles schnell bearbeitbar und relativ frei.“
- **Direkt auf der Seite** (Vorbild Canva/Notion): Man arbeitet in der Vorschau, nicht in Listen und Formularen. Die Schublade bleibt nur für Aufgaben-Details (Lösungen, Feedback, Distraktoren).
- **Keine Tour, keine Vorlagen.** Die Bedienung muss selbsterklärend sein. Einzige Hilfe sind Leerzustände mit Vorschlägen.
- **Geräte:** Am Laptop und am Tablet quer geht alles. Am Handy gibt es die Grundfunktionen (Text ändern, Bild tauschen, verschieben, löschen). Bild beschriften und Mehrfachauswahl fehlen dort.
- **Grenzen, die bleiben:** Gespeichert wird die Struktur (YAML), nie das HTML der Seite. Entwurf/Veröffentlichen, Rückgängig/Wiederholen, Autosave und Prüfstelle gelten für jede neue Funktion unverändert. Die veröffentlichte Seite enthält keine Editor-Bedienelemente.

## Entscheidungen (Nutzer, 2026-11-16)
- **E1 – Modus-Schalter:** In der Vorschau-Kopfzeile steht `AdminSegmented` „Bearbeiten | Ausprobieren“. Standard ist **Bearbeiten**. Dort wählt jeder Klick aus, und Aufgaben reagieren nicht. In **Ausprobieren** verhält sich die Seite wie für Schüler, ohne Editor-Bedienelemente.
- **E2 – Ein Klick wählt:** Im Modus Bearbeiten wählt ein Klick irgendwo auf den Block ihn aus (nicht mehr nur über den Stift-Knopf wie in PROJ-96 E2).
- **E3 – Leerzustände statt Tour:** keine Einführungstour, keine Vorlagen.

## Dependencies
- Requires: PROJ-89 (Editor), PROJ-90 (Katalog), PROJ-96 (Vorschau als Hauptfläche, Schublade, `postMessage`-Rückkanal), PROJ-97 (Knopfzeile), PROJ-98 (Löschen/Einfügen an der Bearbeitungsstelle)
- Ersetzt: die Knopfzeile „Bearbeiten · Darunter · Löschen“ über jedem Block (PROJ-97/98) durch die Block-Leiste des ausgewählten Blocks
- Berührt: PROJ-83 (Bedienmuster), PROJ-45 (Layout, Barrierefreiheit)

## User Stories
- Als **Lehrkraft ohne Erfahrung** möchte ich einfach auf das klicken, was ich ändern will, damit ich nicht erst Knöpfe oder Listen suchen muss.
- Als **Lehrkraft** möchte ich alle Aktionen für einen Block direkt an diesem Block sehen (bearbeiten, darunter einfügen, duplizieren, verschieben, löschen), damit ich nicht zwischen Seite, Liste und Schublade springe.
- Als **Lehrkraft** möchte ich mit einem Schalter in den Schülerblick wechseln und Aufgaben ausprobieren, ohne versehentlich etwas auszuwählen.
- Als **Lehrkraft** möchte ich an einem leeren Thema oder am Seitenende sehen, was ich einfügen kann, damit ich ohne Anleitung weiterkomme.
- Als **Lehrkraft mit Tastatur** möchte ich Blöcke mit Pfeiltasten wechseln, mit Enter bearbeiten und mit Entf löschen.
- Als **Lehrkraft am Handy** möchte ich einen Block antippen und die wichtigsten Aktionen groß genug erreichen.

## Acceptance Criteria

### Modus-Schalter
- [ ] In der Vorschau-Kopfzeile steht ein `AdminSegmented` „Bearbeiten | Ausprobieren“ mit `ariaLabel`. Standard beim Öffnen ist „Bearbeiten“.
- [ ] Im Modus **Bearbeiten** lösen Klicks in Aufgaben nichts aus (kein Prüfen, kein Umdrehen, kein Ziehen von Antworten). Der Mauszeiger zeigt, dass der Block wählbar ist.
- [ ] Im Modus **Ausprobieren** gibt es keine Auswahl, keine Leiste und keine Einfügestellen. Die Seite verhält sich wie für Schüler. Eine offene Schublade schließt sich, die Auswahl bleibt gemerkt.
- [ ] Beim Wechsel zurück zu „Bearbeiten“ ist die vorige Auswahl wieder aktiv, und die Scrollposition bleibt.
- [ ] Ein Tastenkürzel wechselt den Modus (Vorschlag: ⌘/Strg + E, angezeigt über `useIsApplePlatform()`).

### Auswählen
- [ ] Im Modus Bearbeiten wählt ein Klick auf einen Block (Lehrtext, Bild, Aufgabe, Tabelle …), eine Themen-Überschrift, das Deckblatt oder die Lernzielkontrolle dieses Element aus.
- [ ] Das ausgewählte Element hat einen deutlichen Rahmen in der Hauptfarbe. Beim Darüberfahren zeigt ein dünner Rahmen, was ein Klick auswählen würde.
- [ ] Ein Klick auf leere Fläche außerhalb aller Blöcke oder Esc hebt die Auswahl auf.
- [ ] Die Gliederung (falls aufgeklappt) markiert dasselbe Element und scrollt es ins Sichtfeld. Umgekehrt wählt ein Klick in der Gliederung den Block in der Vorschau und scrollt dorthin.
- [ ] Doppelklick oder Enter auf einen ausgewählten Block öffnet sein Formular in der Schublade. Bei Lehrtext und Bild gilt die Regel aus PROJ-103 bzw. PROJ-104 (Bearbeiten direkt an Ort und Stelle).

### Block-Leiste
- [ ] Am ausgewählten Block erscheint eine schwebende Leiste (über dem Block, bei Platzmangel darunter). Sie verdeckt keinen Inhalt des Blocks selbst.
- [ ] Die Leiste enthält: Ziehgriff (Verschieben, Bedienung in PROJ-102), Typ-Name, „Bearbeiten“, „+ Darunter“ (öffnet den Katalog an dieser Stelle), „Duplizieren“, „⋯“ (Typ wechseln, Nach oben, Nach unten, Kopieren, Löschen). „Löschen“ steht zusätzlich als eigenes Icon rechts, rot, mit `aria-label`.
- [ ] Je nach Typ zeigt die Leiste passende Zusatz-Aktionen (Bild: Bild-Werkzeuge aus PROJ-104; Lehrtext: Formatierung aus PROJ-103). Dieses Feature stellt nur den Platz dafür bereit.
- [ ] Bei hohen Blöcken bleibt die Leiste beim Scrollen am oberen Rand des sichtbaren Bereichs (sticky innerhalb des Blocks).
- [ ] Löschen fragt nicht nach, sondern zeigt einen Hinweis mit „Rückgängig“ (wie PROJ-98). Themen löschen fragt weiter per `AlertDialog`.
- [ ] Die bisherige Knopfzeile über jedem Block (PROJ-97/98) entfällt im Modus Bearbeiten. Ihre Aktionen stecken vollständig in der Leiste.

### Leerzustände
- [ ] Ein Thema ohne Blöcke zeigt in der Vorschau eine gestrichelte Fläche: „Dieses Thema ist noch leer.“ und darunter die **6 häufigsten Blöcke** als Knöpfe (Vorschlag: Lehrtext, Bild, Einfachauswahl, Lückentext, Zuordnen, Begriffe zum Aufklappen) plus „Alle Blöcke …“ (Katalog).
- [ ] Am Ende jedes Themas und der Seite steht eine dezente Einfügestelle „+ Block“ bzw. „+ Thema“. Zwischen zwei Blöcken erscheint beim Darüberfahren eine Linie mit „+“.
- [ ] Ein neu eingefügter Block ist sofort ausgewählt. Lehrtext springt in den Schreibmodus (PROJ-103), Bild öffnet die Bildauswahl, Aufgaben öffnen ihr Formular.
- [ ] Ein leerer Lehrtext, ein Bild ohne Datei und eine Aufgabe ohne Inhalt zeigen in der Vorschau einen Platzhalter mit einem Satz, was zu tun ist („Klicke hier und schreibe los.“, „Bild hierher ziehen oder klicken.“).
- [ ] Platzhalter erscheinen nur im Editor. Beim Veröffentlichen meldet die Prüfstelle leere Blöcke als Hinweis.

### Tastatur
- [ ] Pfeil hoch/runter wechselt die Auswahl zum vorigen/nächsten Block, Enter bearbeitet, Entf/Rücktaste löscht (mit „Rückgängig“), ⌘/Strg + D dupliziert, Esc hebt die Auswahl auf.
- [ ] Kürzel wirken nur, wenn kein Eingabefeld den Fokus hat.

### Handy und Tablet (< 1024 px)
- [ ] Antippen wählt aus. Die Leiste erscheint unten am Bildschirm fest (nicht schwebend), alle Knöpfe mindestens 44 × 44 px.
- [ ] Der Modus-Schalter ist auch am Handy da.

### Allgemein
- [ ] Editor-Bedienelemente (Rahmen, Leiste, Leerzustände, Platzhalter) gibt es nur in der Editor-Vorschau, nie in Download, Link, Regal oder Druck.
- [ ] Schreibgeschützte Materialien: Auswählen geht (für die Gliederung), die Leiste zeigt nur „Kopieren“, alle ändernden Aktionen fehlen.
- [ ] Animationen höchstens 200 ms, entfallen bei „Bewegung reduzieren“. Bedienelemente im Editor-Rahmen nutzen `ws-*`-Tokens. Die Leiste in der Vorschau hält mindestens 4,5 : 1 Kontrast.

## Edge Cases
- **Klick in einen Block während die Vorschau neu baut:** Die Auswahl wird vorgemerkt und nach dem Neubau angewendet. Gibt es den Block nicht mehr, wird nichts ausgewählt.
- **Verschachtelte Elemente** (Thema → Block, Box im Lehrtext): Der erste Klick wählt den innersten Block. Die Themen-Überschrift wählt das Thema. Boxen im Lehrtext sind Teil des Lehrtexts (PROJ-103).
- **Aufgabe mit eigener Klick-Logik** (Memory, Kreuzworträtsel, Drag & Drop): Im Modus Bearbeiten sind sie vollständig eingefroren, auch Tastatur-Eingaben in ihre Felder.
- **Kaputter Block** (vom Kern übersprungen): Er erscheint in der Vorschau als Platzhalter „Dieser Block konnte nicht angezeigt werden.“ und ist auswählbar und löschbar.
- **Lange Seite, Leiste außerhalb des Sichtfelds:** Die Auswahl scrollt den Block so, dass Leiste und Blockanfang sichtbar sind.
- **Zwei Fenster mit demselben Material:** Wie heute (Konflikt beim Autosave). Dieses Feature ändert daran nichts.
- **Modus „Ausprobieren“ und Rückgängig:** Rückgängig/Wiederholen bleiben im Kopf bedienbar und wechseln nicht den Modus.

## Nicht Teil dieses Features
- Ziehen, Mehrfachauswahl, Kopieren & Einfügen (PROJ-102), Text tippen in der Seite (PROJ-103), Bild-Werkzeuge (PROJ-104 ff.).
- Keine Änderung am Datenmodell, an der YAML oder an Entwurf/Veröffentlichen.

## Technical Requirements
- Sicherheit: Sandbox des Vorschau-iframes bleibt (`allow-scripts`, kein `allow-same-origin`). Jede Nachricht aus dem Rahmen wird wie heute geprüft (eigener Rahmen, gültige Marke, Block existiert, nicht schreibgeschützt).
- Performance: Auswahl und Leiste erscheinen in unter 100 ms, ohne Neubau der Seite.
- Browser: aktuelle Chrome, Firefox, Safari inkl. iOS Safari.

## Offene Punkte für `/architecture`
- Wie wird das „Einfrieren“ der Aufgaben im Modus Bearbeiten umgesetzt (Auffangschicht über der Seite oder Abfangen der Klicks im eingespielten Skript)?
- Ist die Block-Leiste Teil der Vorschau-Seite (eingespieltes Skript) oder eine App-Schicht über dem iframe, die die Position des Blocks kennt?

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)
_To be added by /architecture_

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
