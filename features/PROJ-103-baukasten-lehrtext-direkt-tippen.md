# PROJ-103: Baukasten – Lehrtext direkt in der Seite tippen

## Status: Planned
**Created:** 2026-11-16
**Last Updated:** 2026-11-16

## Idee in einem Satz
Lehrtexte, Themen-Überschriften, Boxen (Merke, Tipp …), das Deckblatt und Bildunterschriften bearbeitet man direkt in der Seite wie in Word, mit einer kleinen Formatleiste am Text. Aufgaben bleiben im Formular.

Teil der Reihe „Baukasten direkt“, Übersicht und Leitbild in PROJ-101.

## Kontext
- PROJ-96 hat „Text direkt in der Seite“ noch verworfen: Die Seite wird aus der YAML gebaut, ein Rückweg HTML → YAML wäre verlustbehaftet. Der Nutzer will es jetzt ausdrücklich für Lehrtext (2026-11-16).
- Heute bearbeitet `text-editor.tsx` (in der Schublade) Lehrtext in einer gestalteten Ansicht mit Boxen und hat einen HTML-Schalter (PROJ-89 E8, PROJ-98).

## Entscheidungen (Nutzer, 2026-11-16)
- **E1 – Umfang:** Direkt tippen gilt für **Lehrtext-Blöcke, Themen-Überschriften, Deckblatt (Titel, Untertitel), Boxen im Lehrtext und Bildunterschriften**.
- **E2 – Aufgaben bleiben im Formular:** Aufgabentext, Antworten, Lösungen, Feedback und Distraktoren werden weiter in der Schublade bearbeitet, weil dort Pflichtfelder und Prüfregeln hängen.

## Dependencies
- Requires: PROJ-101 (Auswahl, Modus Bearbeiten, Block-Leiste)
- Ersetzt für Lehrtext: das Formular in der Schublade als Standardweg. Der HTML-Schalter bleibt in der Schublade als Profi-Weg.
- Berührt: PROJ-98 (Box-Menü), PROJ-89 E8 (Bereinigung `_saeubern()`)

## User Stories
- Als **Lehrkraft** möchte ich einen Tippfehler sehen, hineinklicken und ihn sofort korrigieren.
- Als **Lehrkraft** möchte ich Text fett machen, eine Liste anlegen oder einen Absatz in eine Merke-Box setzen, ohne ein Formular zu öffnen.
- Als **Lehrkraft** möchte ich eine Themen-Überschrift direkt umbenennen.
- Als **Lehrkraft** möchte ich Text aus Word einfügen, ohne dass seltsame Formatierungen mitkommen.
- Als **Lehrkraft am Handy** möchte ich einen Satz im Lehrtext ändern können.

## Acceptance Criteria

### Schreibmodus
- [ ] Im Modus Bearbeiten öffnet ein Klick auf einen bereits ausgewählten Lehrtext (oder ein Doppelklick auf einen nicht ausgewählten) den Schreibmodus mit dem Cursor an der Klickstelle.
- [ ] Themen-Überschrift, Deckblatt-Titel/-Untertitel und Bildunterschrift gehen genauso in den Schreibmodus (nur reiner Text, ohne Formatleiste).
- [ ] Im Schreibmodus sieht der Text aus wie in der fertigen Seite (gleiche Schrift, Boxen, Abstände). Ein dezenter Rahmen zeigt, dass man schreibt.
- [ ] Esc oder ein Klick außerhalb beendet den Schreibmodus und übernimmt die Änderung. Autosave und Neubau laufen wie bei Formular-Änderungen.
- [ ] Rückgängig/Wiederholen: Während des Schreibens wirkt ⌘/Strg + Z innerhalb des Textes. Nach dem Verlassen ist die gesamte Textänderung ein Schritt im Editor-Verlauf.

### Formatleiste (Lehrtext)
- [ ] Im Schreibmodus zeigt die Block-Leiste die Formatierung: Fett, Kursiv, Überschrift (2 Stufen), Liste, nummerierte Liste, Link, Box (Lernziele, Merke, Tipp, Achtung, Beispiel, Ausgangssituation, Arbeitsauftrag), Tabelle einfügen.
- [ ] Bei markiertem Text erscheint zusätzlich eine kleine Leiste direkt über der Markierung (Fett, Kursiv, Link, In Box setzen).
- [ ] Mit dem Cursor in einer Box: „Box-Art ändern“, „Neue Box darunter“, „Box auflösen (Text bleibt)“, „Box löschen“ (Funktionen aus PROJ-98, jetzt direkt am Text).
- [ ] Gängige Kürzel: ⌘/Strg + B, I, K. „- “ oder „1. “ am Zeilenanfang startet eine Liste. „/“ am Zeilenanfang öffnet den Katalog und setzt den gewählten Block hinter den aktuellen Absatz (der Lehrtext wird dort geteilt).
- [ ] Enter in einer leeren letzten Zeile beendet den Lehrtext und bietet „+ Block“ darunter an.

### Einfügen
- [ ] Eingefügter Text aus Word, Google Docs oder Webseiten behält nur Fett, Kursiv, Listen, Links, Überschriften und einfache Tabellen. Schriftarten, Farben, Größen und Skripte werden entfernt.
- [ ] Eingefügte Bilder im Text werden als eigener Bild-Block hinter dem Lehrtext angelegt (Weg aus PROJ-104), nicht in den Text eingebettet.

### Grenzen und Sicherheit
- [ ] Gespeichert wird weiter in der YAML im bisherigen Format des Lehrtexts. Ein Lehrtext, der direkt bearbeitet und gespeichert wurde, sieht im Formular und im HTML-Schalter identisch aus.
- [ ] Inhalte durchlaufen dieselbe Bereinigung wie heute (keine Skripte, Event-Attribute oder `javascript:`-Links).
- [ ] Teile eines Lehrtexts, die der Schreibmodus nicht sicher bearbeiten kann (komplexe Tabellen, eigenes Inline-CSS aus der KI), sind im Schreibmodus geschützt: Sie sind sichtbar, aber gesperrt, mit dem Hinweis „In der Schublade bearbeiten“. Sie gehen nie verloren.

### Handy
- [ ] Antippen eines ausgewählten Lehrtexts öffnet den Schreibmodus. Die Formatleiste sitzt über der Bildschirmtastatur (Fett, Liste, Box, Fertig).

## Edge Cases
- **Lehrtext enthält HTML, das der Schreibmodus nicht kennt:** Unbekannte Teile werden 1:1 erhalten (geschützte Insel), kein stilles Entfernen.
- **Text wird komplett geleert:** Beim Verlassen bleibt ein leerer Lehrtext mit Platzhalter (PROJ-101). Er wird nicht automatisch gelöscht.
- **Vorschau baut während des Schreibens neu** (zum Beispiel durch Autosave): Der Schreibmodus wird nicht unterbrochen, der Cursor springt nicht. Neu gebaut wird erst nach dem Verlassen.
- **Sehr langer Lehrtext:** Tippen bleibt flüssig (keine spürbare Verzögerung).
- **Zwei Leerzeichen, geschützte Leerzeichen, Silbentrennung:** Bleiben erhalten.
- **Schreibgeschützt:** Kein Schreibmodus. Text lässt sich markieren und kopieren.
- **Rechtschreibprüfung des Browsers:** Ist im Schreibmodus aktiv (Sprache Deutsch).

## Nicht Teil dieses Features
- Aufgaben direkt in der Seite bearbeiten (E2).
- Zusammenarbeit mehrerer Personen gleichzeitig.

## Technical Requirements
- Performance: Tasteneingabe ohne merkbare Verzögerung (< 16 ms pro Taste). Kein Neubau der Seite während des Tippens.
- Sicherheit: Sandbox des Vorschau-Rahmens bleibt. Text aus dem Rahmen wird in der App bereinigt, bevor er in die YAML kommt.

## Offene Punkte für `/architecture`
- Schreibt man im iframe (`contenteditable` im eingespielten Skript) oder legt die App einen Editor (vorhandene `text-editor.tsx`-Erweiterungen) passgenau über den Block?
- Wie wird „geschützte Insel“ für unbekanntes HTML umgesetzt?

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)
_To be added by /architecture_

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
