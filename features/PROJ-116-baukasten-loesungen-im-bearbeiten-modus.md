# PROJ-116: Baukasten – Lösungen im Modus „Bearbeiten“ sichtbar

## Status: Planned
**Created:** 2026-11-17
**Last Updated:** 2026-11-17

## Idee in einem Satz
Im Modus „Bearbeiten“ zeigt die Seite bei Aufgaben, was als richtig eingestellt ist (Lücken, zu markierende Wörter, richtige Antworten, Zuordnungen), damit die Lehrkraft ohne Ausprobieren sieht, ob die Aufgabe stimmt.

Teil der Reihe „Baukasten direkt“. Baut auf PROJ-101 (Modus Bearbeiten | Ausprobieren) auf.

## Anlass
Nutzer (2026-11-17), Screenshot „Wörter markieren“: In der Seite sieht man nicht, dass „rote“ und „blauen“ die Lösung sind. Im Modus Bearbeiten reagieren Aufgaben ohnehin nicht; die Fläche kann also zeigen, was eingestellt ist.

## Dependencies
- Requires: PROJ-101 (Modus Bearbeiten | Ausprobieren, Seiten-Skript)
- Passt zu: PROJ-114 (PROJ-115 ist darin aufgegangen)

## User Stories
- Als **Lehrkraft** möchte ich auf einen Blick sehen, welche Wörter in einem Lückentext Lücken sind und welche Wörter markiert werden sollen.
- Als **Lehrkraft** möchte ich bei einer Auswahlfrage sehen, welche Antwort richtig ist, ohne die Schublade zu öffnen.
- Als **Lehrkraft** möchte ich die Seite trotzdem jederzeit so sehen können wie die Schüler (Ausprobieren).

## Acceptance Criteria
- [ ] Im Modus Bearbeiten sind Lösungen in einheitlicher Form gekennzeichnet (z. B. grüne Unterstreichung bzw. grünes Häkchen) – mindestens bei: Lückentexte (Lücke zeigt ihr Wort), Wörter markieren, Einfach-/Mehrfachauswahl, Richtig/Falsch, Reihenfolge (Nummer der richtigen Position), Zuordnen (Kategorie am Begriff). Weitere Typen nach Machbarkeit; die Liste steht nach `/architecture` in dieser Spec.
- [ ] In Ausprobieren, im Download, im öffentlichen Link, im Regal und im Druck ist nichts davon sichtbar.
- [ ] Die Kennzeichnung ist nicht nur farbig (zusätzlich Symbol oder Unterstreichung) und hat ausreichenden Kontrast in hell und dunkel.
- [ ] Ein kleiner Hinweis in der Vorschau-Kopfzeile oder am Block macht klar, dass Lösungen nur in Bearbeiten sichtbar sind.
- [ ] Am Kern und an der gespeicherten Struktur ändert sich nichts, falls die Lösung im HTML lesbar ist; sonst wird die Kern-Änderung in `/architecture` begründet und nur für die Editor-Vorschau ausgeliefert.

## Edge Cases
- **Typ, dessen Lösung im HTML nicht lesbar ist:** keine Kennzeichnung (lieber nichts als falsch); in der Spec vermerkt.
- **Lösung verschlüsselt/verschleiert im Kern-HTML:** bleibt für Schüler verborgen; die Kennzeichnung entsteht nur in der Editor-Vorschau.
- **Vorschau veraltet:** zeigt den Stand der gebauten Seite, wie alles andere in der Vorschau.
- **Sehr lange Lückentexte:** Kennzeichnung verändert die Zeilenumbrüche nicht wesentlich.

## Nicht Teil dieser Spec
- Klick öffnet Eintrag → PROJ-115.
- Lösungen für Schüler anzeigen (z. B. „Lösung zeigen“-Knopf) – unverändert.

## Modellwahl
- Architektur (Machbarkeit je Typ im Kern-HTML): **Opus**
- Bau: **Sonnet**, QA: **Opus**

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)
_To be added by /architecture_

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
