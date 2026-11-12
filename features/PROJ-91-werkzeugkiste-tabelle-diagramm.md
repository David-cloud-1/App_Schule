# PROJ-91: Werkzeugkiste – Baukasten: Blöcke Tabelle und Diagramm

## Status: Planned (Rahmen – Details werden vor dem Bau mit /requirements festgelegt)
**Created:** 2026-11-12
**Last Updated:** 2026-11-12

## Idee in einem Satz
Im Baukasten-Editor gibt es zwei neue Blöcke: eine Tabelle, die man wie eine Tabelle bearbeitet (Zeilen/Spalten statt HTML), und ein einfaches Diagramm, das aus einer kleinen Tabelle entsteht.

## Kontext
- Heute stehen Tabellen als HTML mit Inline-CSS in Textblöcken (Vorlagen im Master-Prompt: grauer Kopf, Zebrastreifen). Bearbeiten geht in PROJ-89 nur über die gestaltete Ansicht oder das HTML des Textblocks.
- Entscheidung E4 aus PROJ-89: Grafiken sollen auch als „einfache Diagramme aus einer kleinen Tabelle" möglich sein.
- Beide brauchen neue Bausteine im Kern (`seite.py`: `BAUSTEINE`, CSS, ggf. `LAUFZEIT`). Die Seite muss offline bleiben, also keine Diagramm-Bibliothek aus dem Netz.

## Grober Umfang (noch nicht festgelegt)
- **Tabelle:** Zeilen und Spalten hinzufügen/löschen/verschieben, Kopfzeile ja/nein, Stil (grauer Kopf / Zebrastreifen), Bildunterschrift. Einfügen aus Excel/Word übernimmt die Zellen.
- Offen: vorhandene HTML-Tabellen aus Textblöcken in Tabellen-Blöcke umwandeln
- **Diagramm:** Arten Balken, Säulen, Linie, Kreis. Daten in einer kleinen Tabelle (Beschriftung | Wert, ggf. mehrere Reihen), Titel, Achsenbeschriftung, Einheit. Ausgabe als eingebettete Grafik, die offline läuft und sich mit ausdruckt.
- Offen: Tabelle oder Diagramm als Grundlage für Aufgaben (z. B. „Lies aus dem Diagramm ab")

## Dependencies
- Requires: PROJ-89 (Editor-Grundgerüst)
- Empfohlen: PROJ-90 (Katalog), damit die neuen Blöcke dort auftauchen

## Abgrenzung
- Bilder/Fotos → PROJ-92
- Tabellen mit Lücken zum Ausfüllen (das bleibt `fill_blanks` mit Tabelle im Text)

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)
_To be added by /architecture_

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
