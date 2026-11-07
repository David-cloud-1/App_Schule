# PROJ-77: Notenschlüssel-Vorlagen & Notenlisten-Export

## Status: Planned
**Created:** 2026-11-07
**Last Updated:** 2026-11-07

## Dependencies
- Requires: PROJ-21 (Notenschlüssel pro Nachweis, bestehender CSV-Export), PROJ-28 (Notenliste)
- Requires: PROJ-44 (Lehrkraft-Rolle)

## Summary
Lehrkräfte speichern eigene Notenschlüssel als benannte Vorlagen und wählen sie beim Anlegen eines Nachweises mit einem Klick. Zusätzlich lässt sich die Notenliste in einer Form exportieren, die sich ohne Nacharbeit in Excel, Notenheft oder Schulverwaltung übernehmen lässt.

Beide Teile gehören bewusst zusammen: Sie betreffen dieselbe Stelle im Nachweis (Notengebung) und teilen sich die Berechnungslogik.

## User Stories
- Als **Lehrkraft** möchte ich meinen Notenschlüssel einmal speichern und wiederverwenden, damit ich ihn nicht bei jedem Nachweis neu eintippe.
- Als **Lehrkraft** möchte ich Schlüssel mit Kolleginnen und Kollegen teilen, damit unser Fachbereich einheitlich benotet.
- Als **Lehrkraft** möchte ich die Notenliste so exportieren, dass Excel sie ohne Umlaut-Fehler öffnet und die Spalten zu meinem Notenheft passen.
- Als **Lehrkraft** möchte ich vor dem Export Spalten und Sortierung wählen, damit die Datei sofort brauchbar ist.

## Acceptance Criteria

### Vorlagen
- [ ] Im Notenschlüssel-Editor (PROJ-21) gibt es „Als Vorlage speichern“ (Name Pflicht, höchstens 60 Zeichen) und eine Auswahl „Vorlage verwenden“.
- [ ] Die IHK-Vorlage (100–92 = 1, 91–81 = 2, 80–67 = 3, 66–50 = 4, 49–30 = 5, 29–0 = 6) ist fest vorhanden, nicht löschbar und bleibt Standard.
- [ ] Eigene Vorlagen sind zunächst **privat**. Mit Schalter „Für den Fachbereich teilen“ sehen alle Lehrkräfte des Fachbereichs sie als lesbare Vorlage (mit Name der Besitzerin/des Besitzers).
- [ ] Geteilte Vorlagen anderer lassen sich verwenden und „als eigene Kopie speichern“, aber nicht bearbeiten oder löschen.
- [ ] Vorlagen lassen sich umbenennen, überschreiben und löschen (Löschen nach `AlertDialog`). Bereits angelegte Nachweise behalten ihren Schlüssel (Kopie, kein Verweis).
- [ ] Beim Speichern gelten dieselben Prüfungen wie in PROJ-21 (lückenlos, absteigend, 0–100).
- [ ] Eine Vorlage anwenden überschreibt nur den Schlüssel dieses Nachweises und nur, solange der Nachweis nicht gestartet ist.

### Export
- [ ] In der Ergebnisansicht gibt es „Notenliste exportieren“ mit Dialog: Format (CSV für Excel, mit Semikolon und UTF-8-BOM), Spalten (Name, Gruppe, Punkte, Maximum, Prozent, Note, Abgabezeit, Bearbeitungsdauer), Sortierung (Nachname A–Z, Note, Punkte).
- [ ] Namen werden, wenn der Teilnehmername aus „Vorname Nachname“ besteht, optional in „Nachname, Vorname“ aufgeteilt (Schalter, Standard aus, weil Namen frei eingegeben werden).
- [ ] Ausgeschlossene Teilnehmer stehen am Ende mit Vermerk „von der Wertung ausgeschlossen“ statt Note; nicht abgegebene Teilnehmer mit „nicht abgegeben“.
- [ ] Der Dateiname lautet `Notenliste_<Titel>_<Datum>.csv` ohne Sonderzeichen, die Dateisystemen Probleme machen.
- [ ] Der bisherige CSV-Export bleibt unverändert daneben bestehen.

## Edge Cases
- Zwei Vorlagen mit demselben Namen: erlaubt, aber im Auswahlmenü mit Besitzername unterscheidbar.
- Vorlage wird gelöscht, während ein anderer Entwurf sie gerade auswählt: Entwurf behält die bereits geladenen Werte.
- Besitzer verlässt die Schule / Konto gelöscht (PROJ-60): Geteilte Vorlagen bleiben, werden aber an den Fachbereich übertragen und ohne Namen angezeigt.
- Name beginnt mit `=`, `+`, `-`, `@` (CSV-Injection): Wert wird im Export so maskiert, dass Excel ihn nicht als Formel auswertet.
- Sehr langer Teilnehmername: wird im Export nicht gekürzt, nur im Bildschirm.
- Nachweis ohne abgegebene Teilnehmer: Export-Knopf deaktiviert mit Hinweis.

## Technical Requirements
- Security: Vorlagen per RLS privat/geteilt; Export nur für Lehrkräfte mit Zugriff auf den Nachweis.
- Keine neue Abhängigkeit, kein Excel-Format (nur CSV) zum Start.

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)
_To be added by /architecture_

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
