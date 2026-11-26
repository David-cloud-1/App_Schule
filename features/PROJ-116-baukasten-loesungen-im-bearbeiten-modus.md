# PROJ-116: Baukasten – Lösungen im Modus „Bearbeiten“ sichtbar

## Status: Architected
**Created:** 2026-11-17
**Last Updated:** 2026-11-26

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

**Stand:** 2026-11-26 · Modell: Opus

### Kernbefund: Die Lösung steht schon in jeder gebauten Seite
Der Kern schreibt beim Bauen jeder Seite die Lösungen aller prüfbaren Aufgaben in einen Datenblock (`LOESUNGEN`, je Aufgabe über ihre Nummer). Die Schüler-Seite braucht ihn, um Antworten zu prüfen. Die Elemente der Aufgabe tragen feste Nummern (Antwort 0, 1, 2 …, Lücke 0, 1 …, Wort 0, 1 …, Kärtchen 0, 1 …), auch nachdem die Seite den Vorrat gemischt hat.

Das Hilfsskript der Editor-Vorschau (`vorschau-skript.ts`) läuft in derselben Seite, gleich nach dem Kern. Es kann diesen Block **lesen**, ohne dass sich am Kern etwas ändert.

**Entscheidung:** Die Kennzeichnung entsteht nur im Hilfsskript der Editor-Vorschau, nach dem Lösungsblock **der gebauten Seite** und nicht nach dem gespeicherten Block.
- **Kern:** bleibt unverändert, kein Kern-Deploy.
- **Gespeicherte Struktur:** bleibt unverändert, keine Datenbank, kein Backend.
- **Download, öffentlicher Link, Regal, Druck aus „Meine Materialien“:** Dort läuft das Hilfsskript nie, denn die App fügt es nur im Browser in die Vorschau ein. Ohne Skript gibt es keine Kennzeichnung (Akzeptanzkriterium 2 gilt damit von selbst).
- **Vorschau veraltet:** Die Kennzeichnung zeigt genau, was die gebaute Seite prüfen würde. Das ist ehrlicher als der gespeicherte Stand, denn die Lehrkraft sieht die Wahrheit der Seite.

**Verworfen:** Die App berechnet die Lösungen aus dem gespeicherten Block und schickt sie an die Seite. Dann müsste die App die Regeln des Kerns nachbauen, etwa welche Einträge er weglässt, wie er Wörter trennt und welche Varianten eine Lücke hat. Weichen die beiden ab, zeigt die Seite eine falsche Lösung. Das ist genau der Fall, den die Spec ausschließt („lieber nichts als falsch“).

**Sicherheit:** Es entsteht kein neues Leck. Die Lösungen stehen schon heute in jeder Schüler-Seite (die Seite prüft ohne Server). PROJ-116 macht sie nur in der Editor-Vorschau sichtbar.

### Welche Typen gekennzeichnet werden
| Typ | So sieht es im Modus Bearbeiten aus | Grundlage im Lösungsblock |
|---|---|---|
| Einfach-/Mehrfachauswahl | Richtige Antwort mit grünem Rand und ✓ davor | Nummer der richtigen Antwort |
| Richtig/Falsch | „Wahr“ bzw. „Falsch“ mit grünem Rand und ✓ | richtig = Wahr/Falsch |
| Lückentext, Lückentext mit Tipp | Die Lücke zeigt ihr Wort (bei Varianten die erste plus „…“), grün und unterstrichen | Wörter je Lücke |
| Wörter ziehen | Jede Lücke zeigt ihr Wort; Zusatzwörter im Vorrat tragen „✗ passt nirgends“ | Wörter; Nummern hinter den Lücken = Zusatzwörter |
| Wörter markieren | Lösungswörter grün hinterlegt und dick unterstrichen | Nummern der richtigen Wörter |
| Reihenfolge, Bilder-Reihenfolge | Jedes Kärtchen im Vorrat trägt seine richtige Position („1“, „2“ …) als Plakette | Kärtchen-Nummer = richtige Position |
| Zuordnen | Jeder Begriff trägt den Namen seiner Kategorie als kleines Schild („→ Lager“) | Kategorie je Begriff |
| **Zusätzlich, weil fast geschenkt:** Kapitelquiz (question_set) | Die Teilfragen (Auswahl, Richtig/Falsch, Lücken) wie oben | gleiche Form wie die Einzeltypen |
| **Zusätzlich:** Frageserie, Zusammenfassung mit Fragen | Richtige Antwort mit grünem Rand und ✓ | richtiger Antworttext |

**Bewusst noch nicht (Folge-Spec bei Bedarf):** Kreuzworträtsel, Wörter suchen, Memory, Lernkarten, Bild-Hotspots/Bildzuordnung, Rechenaufgaben, Rechenweg, Fallakte, Schätzrunde, interaktives Video, Trainer, Freitext. Ihre Lösung liegt im Gitter oder in Dialogen, oder es gibt keine eindeutige Stelle für die Kennzeichnung. Diese Typen bleiben ohne Kennzeichnung (Edge Case „lieber nichts als falsch“).

**Sonderfall Auswahl mit mehreren richtigen Antworten:** Der Kern prüft nur eine (die erste) und warnt beim Bauen. Gekennzeichnet wird, was die Seite wirklich als richtig prüft. Die Warnung des Kerns bleibt der Weg, auf den Fehler hinzuweisen.

### Aufbau (was wo entsteht)
```
Baukasten-Editor
+-- Vorschau-Kopfzeile (editor-vorschau.tsx)
|   +-- [Bearbeiten | Ausprobieren]
|   +-- NEU: kleiner Hinweis „✓ Lösungen sichtbar – nur in Bearbeiten“
|       (nur im Modus Bearbeiten und nur, wenn die Seite gekennzeichnete Aufgaben hat)
+-- Vorschau (abgeschotteter Rahmen)
    +-- gebaute Seite vom Kern (unverändert)
    +-- Hilfsskript der Vorschau
        +-- NEU: Lösungs-Kennzeichnung
            - liest den Lösungsblock der Seite
            - setzt Kennzeichen an die Elemente (über ihre Nummern)
            - zeichnet neu, sobald der Modus wieder „Bearbeiten“ ist
            - räumt alles weg, sobald „Ausprobieren“ gewählt wird
            - lässt die Aufgabe aus, die gerade an Ort und Stelle bearbeitet wird
```

### Verhalten im Detail
- **Moduswechsel:** Mit „Ausprobieren“ verschwinden alle Kennzeichen sofort, und die Seite ist wie für Schüler. Nach dem Zurückwechseln zeichnet das Skript sie neu, auch wenn die Lehrkraft beim Ausprobieren Kärtchen verschoben oder Lücken gefüllt hat.
- **Aufgabe an Ort und Stelle öffnen (PROJ-114):** Solange eine Aufgabe offen ist, zeigt sie keine Kennzeichen, denn dort sieht man die Lösung ohnehin im Bearbeitungsfeld. Nach „Fertig“ wird die Seite neu gebaut und neu gekennzeichnet.
- **Kennzeichen sind Zusatzelemente des Editors**, keine Änderung an Text oder Nummern der Aufgabe. Die Prüf-Logik der Seite bleibt unberührt.
- **Zeilenumbrüche:** Beim Markieren bleibt die Wortbreite gleich (Hintergrund und Unterstrich, kein Zusatzzeichen). Lücken zeigen ihr Wort im vorhandenen Feld. Nur Plaketten an Kärtchen und Schilder an Begriffen machen diese etwas breiter, und das trifft den Vorrat, nicht den Fließtext.
- **Druck aus der Vorschau:** Kennzeichen sind beim Drucken ausgeblendet.
- **Fehlender oder unbekannter Lösungsblock** (alte Seite, fremde Form): keine Kennzeichnung, kein Fehler.

### Design und Wörter (eine Quelle, PROJ-117/118)
- **Farbe:** neue Bedien-Farbe „Lösung“ (dunkles Grün) in `bedien-design.ts`, neben den bestehenden Farben. Die gebaute Seite ist immer hell, also zählt der Kontrast auf Weiß und auf dem hellen Grün der Hinterlegung (≥ 4,5 : 1). Der bestehende Kontrast-Test deckt das ab.
- **Nicht nur Farbe:** immer zusätzlich ✓, Unterstreichung, Nummer oder Schild.
- **Hinweis in der Kopfzeile:** App-Seite mit `ws-*`-Tokens, damit beide Modi (hell/dunkel) stimmen. Das Wort kommt aus `bedien-woerter.ts`.
- **Screenreader:** Kennzeichen tragen einen unsichtbaren Text („Lösung“, „richtige Position 2“, „gehört zu: Lager“).

### Datenmodell
Es wird nichts gespeichert. Keine Tabelle, keine neue Nachricht an den Server, keine neue Nachricht zwischen Seite und App. Das Skript kennt den Modus schon heute.

### Tests (Vorschlag für den Bau)
- **Vertrag mit dem Kern:** Ein Test in der App nimmt je Typ eine echte, vom Kern gebaute Beispielseite (als Testdatei abgelegt) und prüft, dass das Skript genau die richtigen Elemente kennzeichnet. Ändert der Kern später die Form seines Lösungsblocks, schlägt der Test fehl, statt dass die Vorschau still Falsches zeigt.
- **Nicht nach außen:** Download, öffentlicher Link und gespeicherte Seite enthalten weder das Skript noch Kennzeichen. Das folgt aus der Einfüge-Stelle, und ein bestehender Wächter-Test wird um die neuen Klassen erweitert.
- **Ausprobieren:** Nach dem Wechsel gibt es kein einziges Kennzeichen mehr in der Seite.
- **Einheitliche Optik:** `bedien-design.test.tsx` bleibt grün (keine eigene Farbe, keine eigenen Wörter).

### Abhängigkeiten
Keine neuen Pakete.

### Umfang und Modellwahl
- Nur Frontend, also `/frontend`. `/backend` entfällt, weil es nichts zu speichern gibt.
- Bau: **Sonnet**. QA: **Opus**, Schwerpunkt: nichts sichtbar außerhalb von Bearbeiten, keine falsche Kennzeichnung.

### Entscheidungen des Nutzers (2026-11-26)
1. **Kein Schalter** „Lösungen ausblenden“. In Bearbeiten sind die Lösungen immer sichtbar, die Schüleransicht ist „Ausprobieren“.
2. **Lückentext:** Das Lösungswort steht **im Feld** (grün, unterstrichen), kein Schild über der Lücke.
3. Tech Design freigegeben.

---

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
