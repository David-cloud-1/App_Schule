# PROJ-102: Baukasten – Ziehen in der Vorschau, Mehrfachauswahl, Kopieren & Einfügen

## Status: Planned
**Created:** 2026-11-16
**Last Updated:** 2026-11-16

## Idee in einem Satz
Blöcke lassen sich direkt in der Seite an eine andere Stelle ziehen, auch in ein anderes Thema. Mehrere Blöcke (zum Beispiel alle Bilder) lassen sich auswählen und gemeinsam verschieben, kopieren oder löschen, und mit ⌘/Strg + C/V auch in ein anderes Material übertragen.

Teil der Reihe „Baukasten direkt“, Übersicht und Leitbild in PROJ-101.

## Entscheidungen (Nutzer, 2026-11-16)
- **E1:** Ziehen direkt in der Vorschau, auch über Themengrenzen.
- **E2:** Mehrfachauswahl mit gemeinsamem Verschieben, Kopieren und Löschen.
- **E3:** Kopieren & Einfügen per Tastenkürzel, auch zwischen zwei Materialien.
- **E4:** Am Handy: Verschieben ja (über „Nach oben/unten“ und „Verschieben nach …“), Mehrfachauswahl nein.

## Dependencies
- Requires: PROJ-101 (Auswahl, Block-Leiste mit Ziehgriff, Modus Bearbeiten)
- Berührt: PROJ-89 (Ziehen in der Gliederung, Rückgängig), PROJ-108 (Übernehmen aus anderen Materialien nutzt dieselbe Einfüge-Logik)

## User Stories
- Als **Lehrkraft** möchte ich einen Block in der Seite anfassen und dorthin ziehen, wo er hingehört, damit ich nicht in der Gliederung suchen muss.
- Als **Lehrkraft** möchte ich alle Bilder eines Themas auf einmal auswählen und weiter nach oben schieben.
- Als **Lehrkraft** möchte ich mehrere Blöcke kopieren und in ein anderes meiner Materialien einfügen, damit ich Gutes wiederverwende.
- Als **Lehrkraft** möchte ich mehrere veraltete Blöcke auf einmal löschen und das bei Bedarf in einem Schritt rückgängig machen.
- Als **Lehrkraft am Handy** möchte ich einen Block in ein anderes Thema verschieben, ohne fummelig ziehen zu müssen.

## Acceptance Criteria

### Ziehen in der Vorschau
- [ ] Am Ziehgriff der Block-Leiste lässt sich der ausgewählte Block mit der Maus ziehen. Während des Ziehens zeigt eine farbige Linie die Einfügestelle, der Block selbst ist halbtransparent.
- [ ] Ziehen bis an den oberen oder unteren Rand der Vorschau scrollt die Seite automatisch.
- [ ] Ablegen ist zwischen zwei Blöcken, am Anfang und am Ende jedes Themas und in leeren Themen möglich, nicht im Deckblatt und nicht innerhalb eines anderen Blocks. Ausnahme: Bild-Galerie (PROJ-105).
- [ ] Themen lassen sich an ihrer Überschrift ziehen. Sie können nur zwischen anderen Themen abgelegt werden (vor der Lernzielkontrolle).
- [ ] Esc während des Ziehens bricht ab, nichts ändert sich.
- [ ] Nach dem Ablegen ist der Block weiter ausgewählt und sichtbar. Ein Schritt Rückgängig stellt die alte Stelle wieder her.
- [ ] Tastatur: Mit ausgewähltem Block verschiebt ⌥/Alt + Pfeil hoch/runter ihn um eine Stelle, auch über Themengrenzen hinweg.

### Verschieben nach … (alle Geräte)
- [ ] Im „⋯“-Menü steht „Verschieben nach …“. Es öffnet eine Liste aller Themen. Die Wahl setzt den Block (oder die Auswahl) ans Ende des gewählten Themas.
- [ ] Am Handy ist das der Weg zum Verschieben. Dazu kommen „Nach oben“ und „Nach unten“ in der festen Leiste.

### Mehrfachauswahl (Laptop/Tablet)
- [ ] ⌘/Strg + Klick fügt einen Block zur Auswahl hinzu oder entfernt ihn. Umschalt + Klick wählt alle Blöcke zwischen dem zuletzt gewählten und dem angeklickten aus, auch über Themengrenzen.
- [ ] In der Gliederung funktioniert dieselbe Auswahl (Kontrollkästchen erscheinen beim Darüberfahren).
- [ ] Ist mehr als ein Block ausgewählt, zeigt die Leiste „N Blöcke ausgewählt“ mit: Verschieben nach …, Duplizieren, Kopieren, Löschen, Auswahl aufheben.
- [ ] „Alle gleichen auswählen“ im „⋯“-Menü eines Blocks wählt alle Blöcke dieses Typs aus (zum Beispiel alle Bilder), wahlweise im Thema oder auf der ganzen Seite.
- [ ] Ziehen eines Blocks aus der Mehrfachauswahl verschiebt alle gewählten Blöcke zusammen. Sie werden in ihrer bisherigen Reihenfolge an der Einfügestelle abgelegt.
- [ ] Löschen mehrerer Blöcke ist **ein** Schritt für Rückgängig. Ab 5 Blöcken fragt ein `AlertDialog` „N Blöcke löschen?“.
- [ ] Themen können nicht mit Blöcken gemischt ausgewählt werden.

### Kopieren & Einfügen
- [ ] ⌘/Strg + C kopiert die ausgewählten Blöcke, ⌘/Strg + X schneidet aus, ⌘/Strg + V fügt hinter dem ausgewählten Block ein (ohne Auswahl am Ende des sichtbaren Themas). Dieselben Aktionen stehen im „⋯“-Menü.
- [ ] Ein kurzer Hinweis bestätigt: „3 Blöcke kopiert“ bzw. „3 Blöcke eingefügt“.
- [ ] Kopieren und Einfügen funktioniert zwischen zwei Materialien desselben Kontos, auch in einem anderen Browser-Tab und nach einem Neuladen.
- [ ] Bilder kommen beim Einfügen in ein anderes Material mit. Das Ziel-Material bekommt eine eigene Kopie, und die 8-MB-Grenze wird vor dem Einfügen geprüft.
- [ ] Ein Block, den das Ziel nicht kennt (anderes Werkzeug, anderer Typ-Umfang), wird nicht eingefügt. Hinweis: „1 Block passt nicht in dieses Material und wurde ausgelassen.“
- [ ] Eingefügte Blöcke sind danach ausgewählt.
- [ ] Ein Einfügen ist ein Schritt für Rückgängig.

### Allgemein
- [ ] Schreibgeschützt: Kopieren geht, Ziehen, Ausschneiden, Einfügen und Löschen nicht.
- [ ] Jede Änderung löst Autosave und Neubau der Vorschau aus wie heute. Mehrere Verschiebungen kurz nacheinander bauen die Vorschau nur einmal neu.

## Edge Cases
- **Ziehen während die Vorschau neu baut:** Ziehen startet erst, wenn die Vorschau aktuell ist. Bis dahin zeigt der Griff „Wird aktualisiert …“.
- **Letzter Block eines Themas wird verschoben:** Das Thema bleibt leer stehen und zeigt den Leerzustand (PROJ-101). Es wird nicht automatisch gelöscht.
- **Einfügen ins selbe Material:** Es entstehen Kopien mit neuen Kennungen. Der Text bleibt gleich, ohne „(Kopie)“.
- **Zwischenablage enthält etwas anderes** (normaler Text): ⌘/Strg + V im Modus Bearbeiten ohne Textfeld fügt einen Lehrtext-Block mit diesem Text ein (Formatierung bereinigt).
- **Kopiert aus einem Material, das inzwischen gelöscht ist:** Einfügen geht trotzdem, sofern die Bilder noch erreichbar sind. Sonst kommt der Block ohne Bild und mit Hinweis.
- **Sehr viele Blöcke** (zum Beispiel 50 ausgewählt): Verschieben und Löschen bleiben flüssig. Die Vorschau baut einmal neu.
- **Lernzielkontrolle:** Sie ist nicht verschiebbar und nicht kopierbar.

## Nicht Teil dieses Features
- Übernehmen aus dem Regal oder aus fremden Materialien mit Auswahl-Dialog (PROJ-108).
- Ziehen von Dateien von außen (PROJ-104).

## Technical Requirements
- Sicherheit: Eingefügte Inhalte laufen durch dieselbe Prüfung wie Formular-Eingaben (Bereinigung, Prüfstelle). Bilder werden nur aus Materialien des eigenen Kontos kopiert.
- Performance: Ablegen fühlt sich sofort an (unter 100 ms bis zur Rückmeldung). Der Neubau der Vorschau läuft danach.

## Offene Punkte für `/architecture`
- Ziehen im iframe vs. App-Schicht. Wie arbeiten `@dnd-kit` (schon im Projekt) und die Vorschau zusammen?
- Wo liegt die „Zwischenablage“ für materialübergreifendes Kopieren (System-Zwischenablage, Browser-Speicher oder Server)?

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)
_To be added by /architecture_

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
