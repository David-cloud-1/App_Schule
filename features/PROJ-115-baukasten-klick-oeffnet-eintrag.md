# PROJ-115: Baukasten – Klick in der Seite öffnet den Eintrag

## Status: Planned
**Created:** 2026-11-17
**Last Updated:** 2026-11-17

> **Aufgegangen in PROJ-114 (2026-11-17):** Nach Prototyp v2 werden Aufgaben an Ort und Stelle bearbeitet; der Klick auf einen Eintrag gehört untrennbar dazu und steht jetzt in den Acceptance Criteria von PROJ-114. Diese Spec wird nicht eigenständig gebaut.

## Idee in einem Satz
Ein Klick im Modus „Bearbeiten“ auf einen einzelnen Eintrag einer Aufgabe (einen Begriff, eine Antwort, ein markiertes Wort) öffnet die Schublade genau an diesem Eintrag, aufgeklappt und mit Fokus im Feld.

Teil der Reihe „Baukasten direkt“ (Leitbild PROJ-101: Die Seite meldet, die App entscheidet). Baut auf PROJ-114 auf.

## Anlass
Nutzer (2026-11-17): Ein Klick auf „Stückgut“ in „Begriffe zum Aufklappen“ oder auf ein Wort in „Wörter markieren“ „öffnet nichts“. Heute kennt die Seite nur ganze Blöcke (`data-wk="k1-e3"`).

## Dependencies
- Requires: PROJ-114 (Muster mit aufklappbaren Einträgen), PROJ-101 (Auswählen, Nachrichten Seite → App)

## User Stories
- Als **Lehrkraft** möchte ich auf den Begriff klicken, den ich ändern will, und direkt dessen Felder vor mir haben, damit ich ihn nicht in einer Liste suchen muss.
- Als **Lehrkraft** möchte ich bei einer Auswahlfrage auf eine Antwort klicken und direkt diese Antwort bearbeiten.
- Als **Lehrkraft** möchte ich bei einem Lückentext auf eine Lücke klicken und deren Wort und Tipp bearbeiten.
- Als **Lehrkraft** möchte ich in der Schublade sehen, welchen Eintrag ich gerade bearbeite („Begriff 2 von 4“).

## Acceptance Criteria
- [ ] Im Modus Bearbeiten öffnet ein Klick auf einen Eintrag die Schublade (bzw. lässt sie offen), klappt diesen Eintrag auf, scrollt ihn in Sicht und setzt den Fokus in sein erstes Feld.
- [ ] Die Schublade nennt den Eintrag („Begriff 2 von 4“), solange er offen ist.
- [ ] Unterstützt mindestens: Begriffe zum Aufklappen, Einfach-/Mehrfachauswahl (Antworten), Richtig/Falsch, Karten, Zuordnen (Kategorie, Begriff), Reihenfolge, die vier Lückentexte (Lücke/Wort), Memory, Schritte (Rechenweg, Fallakte). Weitere Typen nach Machbarkeit; die Liste steht nach `/architecture` in dieser Spec.
- [ ] Ein Klick auf eine Stelle ohne Eintrag (Überschrift, Rand, Prüfen-Knopf) wählt wie heute den Block.
- [ ] Kennt die Seite einen Typ nicht oder lässt sich der Eintrag nicht eindeutig zuordnen, wählt der Klick wie heute den Block – nie einen falschen Eintrag.
- [ ] Am Kern und an der gespeicherten Struktur ändert sich nichts; die veröffentlichte Seite enthält nichts davon.
- [ ] Im Modus Ausprobieren reagieren die Aufgaben wie für Schüler; kein Eintrag wird geöffnet.
- [ ] Handy: Tipp auf einen Eintrag öffnet das Blatt am Eintrag; die Bildschirmtastatur verdeckt das Feld nicht.

## Edge Cases
- **Vorschau veraltet** (Änderung noch nicht neu gebaut, Einträge verschoben): Die Zuordnung wird verworfen, der Block wird gewählt.
- **Eintrag im Formular gelöscht, Seite noch alt:** wie oben.
- **Doppelklick auf Text** (PROJ-103 Schreibmodus) gilt nur für Lehrtext; bei Aufgaben öffnet er den Eintrag.
- **Mehrfachauswahl (PROJ-102) mit Umschalt/Strg:** wählt wie heute Blöcke, öffnet keinen Eintrag.
- **Gleiche Wörter mehrfach im Lückentext:** Die Reihenfolge im Text entscheidet, nicht der Wortlaut.

## Nicht Teil dieser Spec
- Lösungen in der Seite anzeigen → PROJ-116.
- Bearbeiten direkt in der Seite.

## Modellwahl
- Architektur und Bau: **Opus** (Seiten-Skript, Nachrichten, Zuordnung je Typ)
- QA: **Opus**

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)
_To be added by /architecture_

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
