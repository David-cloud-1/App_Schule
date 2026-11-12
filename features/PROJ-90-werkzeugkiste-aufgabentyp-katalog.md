# PROJ-90: Werkzeugkiste – Baukasten: Aufgabentyp-Katalog

## Status: Planned (Rahmen – Details werden vor dem Bau mit /requirements festgelegt)
**Created:** 2026-11-12
**Last Updated:** 2026-11-12

## Idee in einem Satz
Im Baukasten-Editor (PROJ-89) fügt die Lehrkraft neue Blöcke ein, indem sie aus einem Katalog aller Aufgabentypen der Interaktiven Seite wählt und den Block im passenden Formular ausfüllt.

## Kontext
- Wunsch des Nutzers (2026-11-12): „die Auswahl an verschiedensten Aufgabentypen, die man dann wählen kann".
- Der Kern (`seite.py`) baut heute **32 Typen**, darunter acht, die es nur auf der Seite gibt (`reihenfolge`, `freitext`, `trainer`, `bildzuordnung`, `rechenweg`, `fallakte`, `schaetzrunde`, `selbsteinschaetzung`) und vier, die H5P nur vortäuscht (`find_words`, `memory_game`, `flashcards`, `image_sequencing`).
- PROJ-89 bringt Formulare nur für die häufigsten Typen. Alle anderen sind dort nur als Rohfassung (YAML) bearbeitbar.

## Grober Umfang (noch nicht festgelegt)
- „Block hinzufügen" an jeder Stelle der Gliederung (zwischen zwei Blöcken, am Ende eines Themas)
- Katalog mit allen Typen, gruppiert (z. B. Lesen & Nachschlagen · Abfragen · Lücken & Wörter · Zuordnen & Ordnen · Rechnen · Spiele & Rätsel · Selbstcheck), je Typ ein Satz Beschreibung und ein kleines Beispiel bzw. Vorschaubild
- Suche im Katalog
- Formulare für **alle** 32 Typen (die Rohfassung aus PROJ-89 bleibt als Expertenweg)
- Neuer Block startet mit sinnvollen Beispielinhalten oder leer (offen)
- Offen: Typ eines vorhandenen Blocks wechseln (z. B. Auswahlfrage → Richtig/Falsch), wo die Inhalte sich übertragen lassen
- Offen: Hinweise zur Didaktik aus dem Master-Prompt im Katalog (z. B. „gut als Aufwärmer am Kapitelanfang")

## Dependencies
- Requires: PROJ-89 (Editor-Grundgerüst)

## Abgrenzung
- Tabelle und Diagramm als neue Blocktypen → PROJ-91
- Bild-Blöcke mit Upload → PROJ-92
- Blöcke per KI ausfüllen lassen → PROJ-93
- Neue Aufgabentypen im Kern erfinden (der Katalog zeigt, was der Kern kann)

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)
_To be added by /architecture_

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
