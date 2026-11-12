# PROJ-93: Werkzeugkiste – Baukasten: Neues Thema oder neuen Block per KI

## Status: Planned (Rahmen – Details werden vor dem Bau mit /requirements festgelegt)
**Created:** 2026-11-12
**Last Updated:** 2026-11-12

## Idee in einem Satz
Im Baukasten-Editor lässt die Lehrkraft ein neues Thema oder einzelne Blöcke von ihrer eigenen KI erzeugen: Die App baut einen kleinen Prompt, die Lehrkraft kopiert ihn in ihre KI und fügt die Antwort wieder ein.

## Kontext
- Entscheidung E5 aus PROJ-89: manuell **und** per KI, auf dem kostenlosen Kopier-Weg wie heute. Keine bezahlte KI („Direkt erstellen", PROJ-64) im Editor.
- Vorbild: „Kapitel neu anfragen" (PROJ-52, Paket 2). Der Kern baut dort einen Kapitel-Prompt nur aus der Antwort, braucht also kein Skript. Die Antwort wird mit `kapitel/einsetzen` an die richtige Stelle gesetzt.
- Für ein neues Thema ohne Skriptgrundlage braucht der Prompt andere Angaben (Thema, Inhalte, Niveau, Lernfeld), damit die KI nicht frei erfindet.

## Grober Umfang (noch nicht festgelegt)
- **Neues Thema per KI:** Lehrkraft gibt Thema und Stichpunkte ein (optional Lernfeld aus `lehrplaene.py`, Niveau wie beim Material), wählt optional Textstellen aus dem Skript (falls noch vorhanden). Prompt kopieren → Antwort einfügen → Prüfstelle → Thema erscheint in der Gliederung.
- **Neuer Block per KI:** an einer Stelle der Gliederung einen Typ wählen (Katalog PROJ-90) und die KI bitten, ihn zum umgebenden Thema passend zu füllen
- **Block neu formulieren lassen** (z. B. „einfacher", „mehr Distraktoren"): offen
- Der Prompt hält sich an die Regeln des Master-Prompts (PIL GmbH, Du-Form, Feedback-Qualität, Design-Boxen).

## Dependencies
- Requires: PROJ-89 (Editor-Grundgerüst)
- Empfohlen: PROJ-90 (Katalog) für „Block per KI"
- Berührt: Kern (`prompts.py`) – neue Prompt-Bausteine; `prompt-sync` muss danach grün sein

## Abgrenzung
- Bezahlte KI direkt aus dem Editor
- Ganze Materialien neu erzeugen (dafür gibt es die Werkzeuge)

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)
_To be added by /architecture_

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
