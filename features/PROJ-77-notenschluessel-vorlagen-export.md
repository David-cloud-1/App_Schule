# PROJ-77: Notenschlüssel-Vorlagen & Notenlisten-Export

## Status: In Review
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

### Bestand (wird wiederverwendet)
- Der Notenschlüssel liegt heute als Kopie direkt am Nachweis. Das passt zur Vorgabe „Kopie, kein Verweis“.
- Es gibt schon einen Schlüssel-Editor (nur im Dialog „Nachweis anlegen“ eingebaut) mit IHK-Vorbelegung und Prüfregeln. Dieselben Regeln gelten für Vorlagen.
- Es gibt schon einen einfachen CSV-Export („Ergebnisse als CSV“) im Menü der Nachweis-Seite. Er bleibt unverändert.
- Die Berechnung der Teilnehmerzeilen (Punkte, Prozent, Note, ausgeschlossen, abgegeben) existiert und wird vom neuen Export mitbenutzt, damit Bildschirm, Druck und Export nie voneinander abweichen.

### A) Komponenten
```
Dialog „Nachweis anlegen“ (besteht)
+-- Notenschlüssel-Editor (erweitert)
    +-- Auswahl „Vorlage verwenden“
    |   +-- Gruppe „Standard“: IHK (fest)
    |   +-- Gruppe „Meine Vorlagen“
    |   +-- Gruppe „Vom Kollegium“ (mit Name der Besitzerin/des Besitzers)
    +-- Knopf „Als Vorlage speichern“ (Name, Schalter „Mit dem Kollegium teilen“)
    +-- Knopf „Als eigene Kopie speichern“ (bei fremden Vorlagen)

Seite „Meine Notenschlüssel“ (neu, unter Leistungsnachweise)
+-- Liste eigener Vorlagen (umbenennen, überschreiben, teilen/privat, löschen mit Rückfrage)
+-- Liste geteilter Vorlagen anderer (nur ansehen, kopieren)
+-- Leerzustand mit Hinweis

Nachweis-Seite (besteht)
+-- Menü „Auswerten“
    +-- Ergebnisse als CSV (unverändert)
    +-- Notenliste exportieren (neu) -> Dialog
        +-- Spalten ankreuzen
        +-- Sortierung (Nachname A–Z, Note, Punkte)
        +-- Schalter „Nachname, Vorname“ (Standard aus)
        +-- Knopf „Herunterladen“
```
Die Seite „Meine Notenschlüssel“ ist nötig, weil Umbenennen, Löschen und Teilen sonst nirgends sinnvoll Platz haben. Im Anlege-Dialog bleibt es bei Auswählen und Speichern.

### B) Datenmodell (Klartext)
Neu: **Notenschlüssel-Vorlage**. Jede Vorlage hat:
- Eindeutige ID
- Name (höchstens 60 Zeichen)
- Die sechs Notengrenzen (gleiche Form wie am Nachweis)
- Besitzer/in (Lehrkraft; fällt bei Kontolöschung weg)
- „Geteilt“ ja/nein
- Erstellt- und Geändert-Zeitpunkt

Die IHK-Vorlage ist **nicht** in der Datenbank, sondern fest im Programm hinterlegt. So kann niemand sie löschen oder verändern.

Gespeichert wird in der Datenbank (muss geräteübergreifend und fürs Kollegium sichtbar sein). Der Export speichert nichts, er erzeugt die Datei beim Herunterladen.

**Zugriff:** Privat sieht nur die Besitzerin/der Besitzer. Geteilt sehen alle Lehrkräfte und Admins, bearbeiten und löschen darf nur die Besitzerin/der Besitzer. Das setzt die Datenbank selbst durch, nicht nur die Oberfläche.

**Konto gelöscht (PROJ-60):** Geteilte Vorlagen bleiben ohne Besitzer erhalten und werden ohne Namen angezeigt. Private Vorlagen verschwinden mit dem Konto. Bearbeiten dürfen dann nur Super-Admins.

### C) Entscheidungen und Begründung
- **Teilen mit dem ganzen Kollegium statt Fachbereich** (mit dir abgestimmt): Seit PROJ-70 sind Inhalte für alle Lehrkräfte offen. So können auch Lehrkräfte ohne Fachbereich (PROJ-46) teilen. Abweichung vom Spec-Wortlaut „Fachbereich“.
- **IHK fest im Programm:** unlöschbar und bleibt Standard, ohne Sonderfall in der Datenbank.
- **Kopie statt Verweis:** Eine Vorlage anzuwenden füllt nur die Felder. Spätere Änderungen oder Löschen der Vorlage berühren keinen Nachweis und keinen Entwurf. Das erfüllt zwei Randfälle automatisch.
- **Gleiche Prüfregeln wie PROJ-21:** Eine gemeinsame Prüfung für Nachweis und Vorlage, im Browser und auf dem Server.
- **Anwenden nur vor dem Start:** Der Schlüssel eines Nachweises ist nur im Entwurf änderbar. Das gilt schon heute und bleibt so.
- **Export als eigener Weg:** Der neue Export bekommt eine eigene Adresse, der alte bleibt unverändert. Die Prüfung „Zugriff auf den Nachweis“ ist dieselbe wie beim alten Export.
- **Excel-tauglich:** Semikolon, UTF-8 mit Kennung (BOM), Windows-Zeilenumbrüche. Zellen, die mit = + - @ beginnen, werden maskiert (CSV-Injection). Die Maskierung gilt für alle Textspalten, nicht nur den Namen.
- **Sortierung und Namensteilung auf dem Server:** Die Datei ist so für alle gleich. Bei „Vorname Nachname“ gilt das letzte Wort als Nachname. Das ist eine Näherung, deshalb Standard aus.
- **Reihenfolge am Ende:** Ausgeschlossene stehen unten mit „von der Wertung ausgeschlossen“. Nicht Abgegebene mit „nicht abgegeben“.
- **Dateiname:** `Notenliste_<Titel>_<Datum>.csv`, Sonderzeichen entfernt, Titel gekürzt.
- **Spalte „Gruppe“:** Gruppen gibt es erst mit PROJ-76 (geplant). Die Spalte erscheint erst, wenn es Gruppen gibt, und wird bis dahin nicht angeboten.
- **Export-Knopf ohne Abgaben:** deaktiviert mit Hinweis, wie schon bei den Druck-Einträgen.

### D) Schnittstellen (Überblick)
- Vorlagen: auflisten, anlegen, ändern (Name, Grenzen, Teilen), löschen. Nur für angemeldete Lehrkräfte/Admins.
- Notenliste-Export: ein Abruf mit den gewählten Optionen.

### E) Abhängigkeiten
Keine neuen Pakete. Neu: eine Datenbank-Migration (Tabelle mit Zugriffsregeln, plus Rückbau-Datei).

### F) Tests
- Prüfregeln für Vorlagen (Name, Grenzen).
- Export: Spaltenwahl, Sortierung, Namensteilung, Ausgeschlossene/Nicht-Abgegebene, Maskierung, Dateiname.
- Zugriff: fremde private Vorlage unsichtbar, geteilte nicht änderbar.

### Reihenfolge
1. `/backend`: Migration, Vorlagen-Schnittstellen, Export-Schnittstelle, Tests
2. `/frontend`: Auswahl im Editor, Seite „Meine Notenschlüssel“, Export-Dialog
3. `/qa`


## Implementation Notes (2026-11-07)
- Migration `20261112_proj77_notenschluessel_vorlagen.sql` (+ `_down`): Tabelle `grading_scale_templates` mit RLS (lesen: eigene + geteilte; anlegen/ändern/löschen: Besitzer/in; verwaiste nur Super-Admin), Trigger gegen Umhängen des Besitzers, Trigger „Konto gelöscht → private Vorlagen weg, geteilte bleiben ohne Besitzer“.
- Schnittstellen: `/api/admin/assessments/schluessel-vorlagen` (GET/POST), `…/[tid]` (PATCH/DELETE), `/api/admin/assessments/[id]/notenliste` (GET). Alle unter dem bestehenden Lehrkraft-Präfix, keine Änderung an Proxy/Rollen.
- Oberfläche: Vorlagen-Auswahl im Anlege-Dialog (`grading-scale-template-picker`), Seite „Notenschlüssel“ (`/admin/leistungsnachweise/schluessel`), Export-Dialog im Menü „Drucken & Export“.
- Abweichungen vom Spec: Teilen mit **allen Lehrkräften** statt nur Fachbereich (abgestimmt, PROJ-70/46). Spalte „Gruppe“ fehlt bis PROJ-76. Reihenfolge im Export: gewertet, nicht abgegeben, ausgeschlossen (am Ende).
- Der Schlüssel eines bestehenden Nachweises hat keine Bearbeitungsmaske; „Vorlage anwenden“ gibt es daher nur im Anlege-Dialog (Entwurf), womit „nicht gestartet“ automatisch gilt.

## QA Test Results
**Stand 2026-11-07 (statisch + automatisiert, kein Browser):**
- Unit-/Schnittstellen-Tests: 2613 grün (neu: Vorlagen-Prüfung, Export inkl. BOM, Maskierung =+-@, Sortierung, Namensteilung, Dateiname, 401/403/400/404/409/200, Besitzer wird serverseitig gesetzt). `tsc` ohne neue Fehler, `npm run build` grün.
- Sicherheit: Besitzer nie aus dem Client übernommen; Export prüft Zugriff über die bestehende Regel am Nachweis; E-Mail-Adressen werden nie angezeigt (nur Anzeigename).
- **Offen:** Probe `supabase/tests/proj77_vorlagen_probe.sql` gegen die Produktions-DB (nach Migration) und Klick-Prüfung im Browser durch den Nutzer.
- Bekannte Grenzen: Namensteilung ist eine Näherung (letztes Wort = Nachname), deshalb Standard aus.

## Deployment
_To be added by /deploy_
